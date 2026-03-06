# ════════════════════════════════════════════════
# PARINAMA — Generation Orchestrator
# Bridges the evolution engine with the database
# and WebSocket streaming layer
# ════════════════════════════════════════════════

import json
import time
import asyncio
from typing import Optional, Callable, Awaitable
from dataclasses import dataclass

from sqlalchemy.ext.asyncio import AsyncSession

from core.optimizer import (
    EvolutionEngine,
    EvolutionCallbacks,
    EvolutionState,
    run_evolution,
)
from core.router import get_switch_log, check_provider_health
from database.models import async_session_factory
from database.crud import (
    create_session,
    create_generation,
    complete_session,
    fail_session,
    update_session_status,
    log_llm_switch,
    log_llm_event,
    get_session_with_generations,
)


# ══════════════════════════════════════════════
# EVOLUTION SESSION MANAGER
# ══════════════════════════════════════════════

class EvolutionSessionManager:
    """
    High-level manager that:
    1. Creates a database session for the evolution
    2. Wires up WebSocket callbacks
    3. Runs the evolution engine
    4. Persists all generations to the database
    5. Handles errors and cleanup
    """

    def __init__(
        self,
        original_prompt: str,
        max_generations: int = 7,
        score_threshold: float = 90.0,
        ws_send: Optional[Callable] = None,
    ):
        """
        Args:
            original_prompt: The user's raw prompt
            max_generations: Max evolution generations (3, 5, or 7)
            score_threshold: Stop early if score exceeds this
            ws_send: Async function to send WebSocket messages
        """
        self.original_prompt = original_prompt
        self.max_generations = max_generations
        self.score_threshold = score_threshold
        self.ws_send = ws_send
        self.session_id: Optional[str] = None
        self.engine: Optional[EvolutionEngine] = None
        self._db_session: Optional[AsyncSession] = None

    async def _send_ws(self, event: str, data: dict) -> None:
        """Send a WebSocket event if handler is available."""
        if self.ws_send:
            try:
                message = json.dumps({
                    "event": event,
                    "data": data,
                    "session_id": self.session_id,
                    "timestamp": time.time(),
                })
                await self.ws_send(message)
            except Exception as e:
                print(f"[GENERATOR] WebSocket send error: {e}")

    def _build_callbacks(self) -> EvolutionCallbacks:
        """Build evolution callbacks wired to WebSocket events."""
        return EvolutionCallbacks(
            on_evolution_started=self._on_evolution_started,
            on_generation_begin=self._on_generation_begin,
            on_scoring_complete=self._on_scoring_complete,
            on_mutation_selected=self._on_mutation_selected,
            on_new_prompt_chunk=self._on_new_prompt_chunk,
            on_new_prompt_complete=self._on_new_prompt_complete,
            on_evolution_complete=self._on_evolution_complete,
            on_llm_switched=self._on_llm_switched,
            on_evolution_error=self._on_evolution_error,
        )

    # ──────────────────────────────────────────
    # WEBSOCKET EVENT HANDLERS
    # ──────────────────────────────────────────

    async def _on_evolution_started(self, data: dict) -> None:
        await self._send_ws("evolution_started", {
            "prompt": data["prompt"],
            "max_generations": data["max_generations"],
            "score_threshold": data["score_threshold"],
            "session_id": self.session_id,
        })

    async def _on_generation_begin(self, data: dict) -> None:
        await self._send_ws("generation_begin", {
            "generation_num": data["generation_num"],
            "current_prompt": data["current_prompt"],
            "total_generations": self.max_generations,
        })

    async def _on_scoring_complete(self, data: dict) -> None:
        await self._send_ws("scoring_complete", {
            "generation_num": data["generation_num"],
            "scores": data["scores"],
            "total": data["total"],
            "weaknesses": data["weaknesses"],
            "strengths": data.get("strengths", []),
            "feedback": data.get("feedback", {}),
            "llm_used": data.get("llm_used", ""),
            "badge_color": data.get("badge_color", ""),
        })

    async def _on_mutation_selected(self, data: dict) -> None:
        await self._send_ws("mutation_selected", {
            "generation_num": data["generation_num"],
            "mutation_type": data["mutation_type"],
            "mutation_label": data.get("mutation_label", ""),
            "mutation_description": data.get("mutation_description", ""),
            "mutation_icon": data.get("mutation_icon", ""),
            "mutation_color": data.get("mutation_color", ""),
            "reason": data.get("reason", ""),
            "targets": data.get("targets", []),
        })

    async def _on_new_prompt_chunk(self, data: dict) -> None:
        await self._send_ws("new_prompt_chunk", {
            "generation_num": data["generation_num"],
            "chunk": data["chunk"],
        })

    async def _on_new_prompt_complete(self, data: dict) -> None:
        await self._send_ws("new_prompt_complete", {
            "generation_num": data["generation_num"],
            "new_prompt": data["new_prompt"],
            "improvement": data.get("improvement", 0.0),
            "total_score": data.get("total_score", 0.0),
            "best_score": data.get("best_score", 0.0),
            "llm_used": data.get("llm_used", ""),
            "badge_color": data.get("badge_color", ""),
            "mutation_type": data.get("mutation_type"),
        })

    async def _on_llm_switched(self, data: dict) -> None:
        await self._send_ws("llm_switched", {
            "from_llm": data["from_llm"],
            "to_llm": data["to_llm"],
            "reason": data["reason"],
        })

        # Log switch to database
        if self._db_session and self.session_id:
            try:
                await log_llm_switch(
                    db=self._db_session,
                    session_id=self.session_id,
                    generation_num=0,
                    from_llm=data["from_llm"],
                    to_llm=data["to_llm"],
                    reason=data["reason"],
                )
                await self._db_session.commit()
            except Exception as e:
                print(f"[GENERATOR] DB log switch error: {e}")

    async def _on_evolution_error(self, data: dict) -> None:
        await self._send_ws("evolution_error", {
            "message": data["message"],
            "generation_num": data.get("generation_num", 0),
        })

    async def _on_evolution_complete(self, data: dict) -> None:
        await self._send_ws("evolution_complete", data)

    # ──────────────────────────────────────────
    # MAIN RUN METHOD
    # ──────────────────────────────────────────

    async def run(self) -> dict:
        """
        Execute the full evolution pipeline:
        1. Create DB session record
        2. Run evolution engine with WebSocket callbacks
        3. Persist all generations to DB
        4. Return final results

        Returns:
            dict with complete evolution results
        """
        async with async_session_factory() as db:
            self._db_session = db

            try:
                # ── Step 1: Create session in DB ──
                session_record = await create_session(
                    db=db,
                    original_prompt=self.original_prompt,
                    max_generations=self.max_generations,
                )
                self.session_id = session_record.session_id
                await db.commit()

                # Update status to evolving
                await update_session_status(db, self.session_id, "evolving")
                await db.commit()

                # ── Step 2: Run evolution engine ──
                callbacks = self._build_callbacks()
                self.engine = EvolutionEngine(
                    max_generations=self.max_generations,
                    score_threshold=self.score_threshold,
                    callbacks=callbacks,
                )

                evolution_state = await self.engine.evolve(self.original_prompt)

                # ── Step 3: Persist generations to DB ──
                await self._persist_generations(db, evolution_state)

                # ── Step 4: Complete session ──
                if evolution_state.error:
                    await fail_session(
                        db=db,
                        session_id=self.session_id,
                        reason=evolution_state.error,
                    )
                else:
                    best_gen = evolution_state.best_generation
                    initial_score = 0.0
                    if evolution_state.generations and evolution_state.generations[0].score_result:
                        initial_score = evolution_state.generations[0].score_result.total_score

                    primary_llm = best_gen.llm_used if best_gen else "unknown"

                    await complete_session(
                        db=db,
                        session_id=self.session_id,
                        best_prompt=best_gen.prompt_text if best_gen else self.original_prompt,
                        best_score=evolution_state.best_score,
                        initial_score=initial_score,
                        total_generations=len(evolution_state.generations),
                        primary_llm_used=primary_llm,
                        llm_switches=evolution_state.llm_switches,
                    )

                await db.commit()

                # ── Step 5: Send evolution_complete ──
                result = self._build_final_result(evolution_state)
                await self._send_ws("evolution_complete", result)

                return result

            except Exception as e:
                print(f"[GENERATOR] Fatal error: {e}")
                await db.rollback()

                # Try to mark session as failed
                if self.session_id:
                    try:
                        await fail_session(db, self.session_id, str(e))
                        await db.commit()
                    except Exception:
                        pass

                # Send error to WebSocket
                await self._send_ws("evolution_error", {
                    "message": str(e),
                    "generation_num": 0,
                })

                return {
                    "session_id": self.session_id,
                    "error": str(e),
                    "status": "failed",
                }

            finally:
                self._db_session = None

    # ──────────────────────────────────────────
    # DATABASE PERSISTENCE
    # ──────────────────────────────────────────

    async def _persist_generations(
        self,
        db: AsyncSession,
        evolution_state: EvolutionState,
    ) -> None:
        """Save all generations from the evolution to the database."""
        for gen_state in evolution_state.generations:
            scores = gen_state.score_result
            weaknesses = scores.weaknesses if scores else []

            await create_generation(
                db=db,
                session_id=self.session_id,
                generation_num=gen_state.generation_num,
                prompt_text=gen_state.prompt_text,
                clarity_score=scores.clarity.score if scores else 0.0,
                specificity_score=scores.specificity.score if scores else 0.0,
                actionability_score=scores.actionability.score if scores else 0.0,
                conciseness_score=scores.conciseness.score if scores else 0.0,
                creativity_score=scores.creativity.score if scores else 0.0,
                total_score=scores.total_score if scores else 0.0,
                mutation_type=gen_state.mutation_type.value if gen_state.mutation_type else None,
                weaknesses_found=weaknesses,
                improvement_delta=gen_state.improvement_delta,
                llm_used=gen_state.llm_used,
                llm_badge_color=gen_state.llm_badge_color,
                processing_time_ms=gen_state.processing_time_ms,
            )

    # ──────────────────────────────────────────
    # RESULT BUILDER
    # ──────────────────────────────────────────

    def _build_final_result(self, evolution_state: EvolutionState) -> dict:
        """Build the final result dictionary for the API response."""
        best_gen = evolution_state.best_generation
        initial_score = 0.0
        if evolution_state.generations and evolution_state.generations[0].score_result:
            initial_score = evolution_state.generations[0].score_result.total_score

        return {
            "session_id": self.session_id,
            "status": "completed" if not evolution_state.error else "failed",
            "original_prompt": evolution_state.original_prompt,
            "best_prompt": best_gen.prompt_text if best_gen else evolution_state.original_prompt,
            "best_score": evolution_state.best_score,
            "initial_score": initial_score,
            "improvement": evolution_state.improvement,
            "total_generations": len(evolution_state.generations),
            "max_generations": evolution_state.max_generations,
            "total_time_ms": evolution_state.total_time_ms,
            "llm_switches": evolution_state.llm_switches,
            "generations": [g.to_dict() for g in evolution_state.generations],
            "best_generation": best_gen.to_dict() if best_gen else None,
            "error": evolution_state.error,
        }

    # ──────────────────────────────────────────
    # CANCEL
    # ──────────────────────────────────────────

    def cancel(self) -> None:
        """Cancel the running evolution."""
        if self.engine:
            self.engine.cancel()


# ══════════════════════════════════════════════
# CONVENIENCE FUNCTIONS
# ══════════════════════════════════════════════

async def start_evolution(
    prompt: str,
    max_generations: int = 7,
    score_threshold: float = 90.0,
    ws_send: Optional[Callable] = None,
) -> dict:
    """
    Convenience function to start an evolution session.

    Args:
        prompt: The original prompt to evolve
        max_generations: Number of generations (3, 5, or 7)
        score_threshold: Early stop threshold (default 90)
        ws_send: WebSocket send function for streaming

    Returns:
        Final evolution result dictionary
    """
    manager = EvolutionSessionManager(
        original_prompt=prompt,
        max_generations=max_generations,
        score_threshold=score_threshold,
        ws_send=ws_send,
    )
    return await manager.run()


async def get_evolution_result(session_id: str) -> Optional[dict]:
    """
    Retrieve a completed evolution session from the database.

    Args:
        session_id: The unique session identifier

    Returns:
        Session data dictionary or None
    """
    async with async_session_factory() as db:
        session = await get_session_with_generations(db, session_id)
        if session:
            return session.to_dict()
        return None


async def get_system_health() -> dict:
    """
    Get system health including LLM provider availability.

    Returns:
        Health status dictionary
    """
    provider_health = await check_provider_health()

    available_count = sum(
        1 for p in provider_health.values()
        if p["status"] == "healthy"
    )

    return {
        "status": "healthy" if available_count > 0 else "degraded",
        "available_providers": available_count,
        "total_providers": len(provider_health),
        "providers": provider_health,
    }
