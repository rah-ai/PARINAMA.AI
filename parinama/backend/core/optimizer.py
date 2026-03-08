# ════════════════════════════════════════════════
# PARINAMA — Prompt Optimization Loop
# The core evolutionary algorithm that drives
# prompt transformation across generations
# ════════════════════════════════════════════════

import time
import asyncio
from dataclasses import dataclass, field
from typing import Optional, Callable, Awaitable

from core.scorer import (
    score_prompt,
    PromptScoreResult,
    calculate_improvement,
    suggest_focus_dimension,
)
from core.mutator import (
    MutationType,
    MutationResult,
    select_mutation_strategy,
    mutate_prompt,
    MUTATION_DESCRIPTIONS,
)
from core.router import (
    smart_llm_router,
    reset_providers,
    get_switch_log,
    clear_switch_log,
    set_switch_callback,
    SwitchEvent,
)


# ══════════════════════════════════════════════
# EVOLUTION STATE
# ══════════════════════════════════════════════

@dataclass
class GenerationState:
    """State of a single generation in the evolution."""
    generation_num: int
    prompt_text: str
    score_result: Optional[PromptScoreResult] = None
    mutation_type: Optional[MutationType] = None
    mutation_result: Optional[MutationResult] = None
    llm_used: str = ""
    llm_badge_color: str = ""
    improvement_delta: float = 0.0
    processing_time_ms: int = 0

    def to_dict(self) -> dict:
        scores = self.score_result.to_dict() if self.score_result else {}
        return {
            "generation_num": self.generation_num,
            "prompt_text": self.prompt_text,
            "scores": scores.get("scores", {}),
            "feedback": scores.get("feedback", {}),
            "weaknesses": scores.get("weaknesses", []),
            "strengths": scores.get("strengths", []),
            "mutation_type": self.mutation_type.value if self.mutation_type else None,
            "mutation_info": MUTATION_DESCRIPTIONS.get(self.mutation_type, {}) if self.mutation_type else None,
            "improvement_delta": self.improvement_delta,
            "llm_used": self.llm_used,
            "llm_badge_color": self.llm_badge_color,
            "processing_time_ms": self.processing_time_ms,
        }


@dataclass
class EvolutionState:
    """Complete state of an evolution run."""
    original_prompt: str
    max_generations: int
    score_threshold: float = 90.0
    generations: list[GenerationState] = field(default_factory=list)
    best_generation: Optional[GenerationState] = None
    best_score: float = 0.0
    is_complete: bool = False
    error: Optional[str] = None
    total_time_ms: int = 0
    llm_switches: int = 0

    @property
    def current_generation_num(self) -> int:
        return len(self.generations)

    @property
    def improvement(self) -> float:
        if len(self.generations) < 2:
            return 0.0
        initial = self.generations[0].score_result.total_score if self.generations[0].score_result else 0
        return round(self.best_score - initial, 2)

    def to_dict(self) -> dict:
        return {
            "original_prompt": self.original_prompt,
            "best_prompt": self.best_generation.prompt_text if self.best_generation else self.original_prompt,
            "best_score": self.best_score,
            "initial_score": self.generations[0].score_result.total_score if self.generations and self.generations[0].score_result else 0,
            "improvement": self.improvement,
            "total_generations": len(self.generations),
            "max_generations": self.max_generations,
            "is_complete": self.is_complete,
            "error": self.error,
            "total_time_ms": self.total_time_ms,
            "llm_switches": self.llm_switches,
            "generations": [g.to_dict() for g in self.generations],
        }


# ══════════════════════════════════════════════
# EVENT CALLBACKS TYPE
# ══════════════════════════════════════════════

@dataclass
class EvolutionCallbacks:
    """
    Callbacks fired during evolution for real-time streaming.
    All callbacks are optional async functions.
    """
    on_evolution_started: Optional[Callable] = None
    on_generation_begin: Optional[Callable] = None
    on_scoring_complete: Optional[Callable] = None
    on_mutation_selected: Optional[Callable] = None
    on_new_prompt_chunk: Optional[Callable] = None
    on_new_prompt_complete: Optional[Callable] = None
    on_evolution_complete: Optional[Callable] = None
    on_llm_switched: Optional[Callable] = None
    on_evolution_error: Optional[Callable] = None


async def _fire(callback: Optional[Callable], data: dict) -> None:
    """Safely fire a callback if it exists."""
    if callback:
        try:
            if asyncio.iscoroutinefunction(callback):
                await callback(data)
            else:
                callback(data)
        except Exception as e:
            print(f"[OPTIMIZER] Callback error: {e}")


# ══════════════════════════════════════════════
# MAIN EVOLUTION ENGINE
# ══════════════════════════════════════════════

class EvolutionEngine:
    """
    The core evolutionary prompt optimization engine.

    Algorithm:
    1. Generation 0: Score the original prompt
    2. Generation 1-N: Score → Identify weaknesses → Select mutation → Mutate → Repeat
    3. Stop when: score > threshold OR max_generations reached
    4. Return the best-scoring prompt across all generations
    """

    def __init__(
        self,
        max_generations: int = 7,
        score_threshold: float = 90.0,
        callbacks: Optional[EvolutionCallbacks] = None,
    ):
        self.max_generations = max_generations
        self.score_threshold = score_threshold
        self.callbacks = callbacks or EvolutionCallbacks()
        self.state: Optional[EvolutionState] = None
        self._cancelled = False

    def cancel(self) -> None:
        """Cancel the running evolution."""
        self._cancelled = True

    async def evolve(self, original_prompt: str) -> EvolutionState:
        """
        Run the full evolution loop on a prompt.

        Args:
            original_prompt: The user's raw prompt to evolve

        Returns:
            EvolutionState with complete history and best result
        """
        start_time = time.time()
        self._cancelled = False

        # Initialize state
        self.state = EvolutionState(
            original_prompt=original_prompt,
            max_generations=self.max_generations,
            score_threshold=self.score_threshold,
        )

        # Reset provider states for fresh run
        reset_providers()
        clear_switch_log()

        # Set up LLM switch tracking
        async def on_switch(event: SwitchEvent):
            self.state.llm_switches += 1
            await _fire(self.callbacks.on_llm_switched, {
                "from_llm": event.from_llm,
                "to_llm": event.to_llm,
                "reason": event.reason,
            })

        set_switch_callback(on_switch)

        # ── Fire: evolution_started ───────────
        await _fire(self.callbacks.on_evolution_started, {
            "prompt": original_prompt,
            "max_generations": self.max_generations,
            "score_threshold": self.score_threshold,
        })

        try:
            # ══════════════════════════════════
            # GENERATION 0 — Score original prompt
            # ══════════════════════════════════
            await self._process_generation_zero(original_prompt)

            if self._cancelled:
                return self._finalize(start_time)

            # ══════════════════════════════════
            # GENERATIONS 1 to N — Evolve
            # ══════════════════════════════════
            previous_mutations: list[str] = []

            for gen_num in range(1, self.max_generations + 1):
                if self._cancelled:
                    break

                current_prompt = self.state.generations[-1].prompt_text
                previous_score = self.state.generations[-1].score_result

                await self._process_generation(
                    gen_num=gen_num,
                    current_prompt=current_prompt,
                    previous_score=previous_score,
                    previous_mutations=previous_mutations,
                )

                # Track which mutations have been used
                latest = self.state.generations[-1]
                if latest.mutation_type:
                    previous_mutations.append(latest.mutation_type.value)

            self.state.is_complete = True

        except Exception as e:
            self.state.error = str(e)
            print(f"[OPTIMIZER] Evolution error: {e}")
            await _fire(self.callbacks.on_evolution_error, {
                "message": str(e),
                "generation_num": self.state.current_generation_num,
            })

        return self._finalize(start_time)

    # ──────────────────────────────────────────
    # GENERATION 0 — Score the original
    # ──────────────────────────────────────────

    async def _process_generation_zero(self, original_prompt: str) -> None:
        """Process Generation 0: just score the original prompt."""
        gen_start = time.time()

        gen_state = GenerationState(
            generation_num=0,
            prompt_text=original_prompt,
        )

        # Fire: generation_begin
        await _fire(self.callbacks.on_generation_begin, {
            "generation_num": 0,
            "current_prompt": original_prompt,
        })

        # Score the original prompt
        score_result, llm_used, badge_color = await score_prompt(
            prompt_text=original_prompt,
            llm_router_fn=smart_llm_router,
        )

        gen_state.score_result = score_result
        gen_state.llm_used = llm_used
        gen_state.llm_badge_color = badge_color
        gen_state.processing_time_ms = int((time.time() - gen_start) * 1000)

        # Fire: scoring_complete
        await _fire(self.callbacks.on_scoring_complete, {
            "generation_num": 0,
            "scores": score_result.to_dict()["scores"],
            "total": score_result.total_score,
            "weaknesses": score_result.weaknesses,
            "strengths": score_result.strengths,
            "feedback": score_result.to_dict()["feedback"],
            "llm_used": llm_used,
            "badge_color": badge_color,
        })

        # Update state
        self.state.generations.append(gen_state)
        self.state.best_score = score_result.total_score
        self.state.best_generation = gen_state

        # Fire: new_prompt_complete (generation 0 = original, no mutation)
        await _fire(self.callbacks.on_new_prompt_complete, {
            "generation_num": 0,
            "new_prompt": original_prompt,
            "improvement": 0.0,
            "llm_used": llm_used,
            "badge_color": badge_color,
        })

    # ──────────────────────────────────────────
    # GENERATION N — Score → Mutate → Score
    # ──────────────────────────────────────────

    async def _process_generation(
        self,
        gen_num: int,
        current_prompt: str,
        previous_score: PromptScoreResult,
        previous_mutations: list[str],
    ) -> None:
        """Process a single generation: select mutation, mutate, score."""
        gen_start = time.time()

        # Fire: generation_begin
        await _fire(self.callbacks.on_generation_begin, {
            "generation_num": gen_num,
            "current_prompt": current_prompt,
        })

        # ── Step 1: Select mutation strategy ──
        weaknesses = previous_score.weaknesses if previous_score else []
        mutation_type = select_mutation_strategy(
            generation_num=gen_num,
            weaknesses=weaknesses,
            previous_mutations=previous_mutations,
        )

        mutation_info = MUTATION_DESCRIPTIONS[mutation_type]
        focus_dim = suggest_focus_dimension(previous_score) if previous_score else "clarity"

        # Fire: mutation_selected
        await _fire(self.callbacks.on_mutation_selected, {
            "generation_num": gen_num,
            "mutation_type": mutation_type.value,
            "mutation_label": mutation_info["label"],
            "mutation_description": mutation_info["description"],
            "mutation_icon": mutation_info["icon"],
            "mutation_color": mutation_info["color"],
            "reason": f"Targeting {focus_dim} — {mutation_info['description']}",
            "targets": mutation_info["targets"],
        })

        # ── Step 2: Mutate the prompt ─────────
        scores_dict = previous_score.to_dict()["scores"] if previous_score else {}

        mutation_result = await mutate_prompt(
            current_prompt=current_prompt,
            mutation_type=mutation_type,
            weaknesses=weaknesses,
            scores=scores_dict,
            generation_num=gen_num,
            llm_router_fn=smart_llm_router,
        )

        new_prompt = mutation_result.mutated_prompt

        # Fire: streaming chunks for typewriter effect
        if self.callbacks.on_new_prompt_chunk:
            chunk_size = 3
            for i in range(0, len(new_prompt), chunk_size):
                chunk = new_prompt[i:i + chunk_size]
                await _fire(self.callbacks.on_new_prompt_chunk, {
                    "generation_num": gen_num,
                    "chunk": chunk,
                })
                await asyncio.sleep(0.015)

        # ── Step 3: Score the mutated prompt ──
        score_result, score_llm_used, score_badge_color = await score_prompt(
            prompt_text=new_prompt,
            llm_router_fn=smart_llm_router,
        )

        # Calculate improvement
        improvement_delta = 0.0
        if previous_score:
            improvement = calculate_improvement(previous_score, score_result)
            improvement_delta = improvement["total_delta"]

        # ── Build generation state ────────────
        gen_state = GenerationState(
            generation_num=gen_num,
            prompt_text=new_prompt,
            score_result=score_result,
            mutation_type=mutation_type,
            mutation_result=mutation_result,
            llm_used=mutation_result.llm_used,
            llm_badge_color=mutation_result.badge_color,
            improvement_delta=improvement_delta,
            processing_time_ms=int((time.time() - gen_start) * 1000),
        )

        # Fire: scoring_complete
        await _fire(self.callbacks.on_scoring_complete, {
            "generation_num": gen_num,
            "scores": score_result.to_dict()["scores"],
            "total": score_result.total_score,
            "weaknesses": score_result.weaknesses,
            "strengths": score_result.strengths,
            "feedback": score_result.to_dict()["feedback"],
            "llm_used": score_llm_used,
            "badge_color": score_badge_color,
        })

        # Update evolution state
        self.state.generations.append(gen_state)

        # Track best generation
        if score_result.total_score > self.state.best_score:
            self.state.best_score = score_result.total_score
            self.state.best_generation = gen_state

        # Fire: new_prompt_complete
        await _fire(self.callbacks.on_new_prompt_complete, {
            "generation_num": gen_num,
            "new_prompt": new_prompt,
            "improvement": improvement_delta,
            "total_score": score_result.total_score,
            "best_score": self.state.best_score,
            "llm_used": mutation_result.llm_used,
            "badge_color": mutation_result.badge_color,
            "mutation_type": mutation_type.value,
        })

    # ──────────────────────────────────────────
    # FINALIZE
    # ──────────────────────────────────────────

    def _finalize(self, start_time: float) -> EvolutionState:
        """Finalize the evolution and return state."""
        self.state.total_time_ms = int((time.time() - start_time) * 1000)
        self.state.is_complete = True

        # Get switch count from router
        switch_log = get_switch_log()
        self.state.llm_switches = len(switch_log)

        # Clean up
        set_switch_callback(None)

        return self.state


# ══════════════════════════════════════════════
# CONVENIENCE FUNCTION
# ══════════════════════════════════════════════

async def run_evolution(
    prompt: str,
    max_generations: int = 7,
    score_threshold: float = 90.0,
    callbacks: Optional[EvolutionCallbacks] = None,
) -> EvolutionState:
    """
    Convenience function to run a complete evolution.

    Args:
        prompt: The original prompt to evolve
        max_generations: Maximum number of evolution generations
        score_threshold: Stop when total score exceeds this
        callbacks: Optional callbacks for real-time events

    Returns:
        Complete EvolutionState with all generation history
    """
    engine = EvolutionEngine(
        max_generations=max_generations,
        score_threshold=score_threshold,
        callbacks=callbacks,
    )
    return await engine.evolve(prompt)
