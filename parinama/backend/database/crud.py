# ════════════════════════════════════════════════
# PARINAMA — Database CRUD Operations
# Async operations for evolution sessions & generations
# ════════════════════════════════════════════════

import json
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select, update, desc, func
from sqlalchemy.ext.asyncio import AsyncSession

from database.models import (
    EvolutionSession,
    Generation,
    LLMLog,
    generate_session_id,
)


# ══════════════════════════════════════════════
# EVOLUTION SESSION OPERATIONS
# ══════════════════════════════════════════════

async def create_session(
    db: AsyncSession,
    original_prompt: str,
    max_generations: int = 7,
) -> EvolutionSession:
    """Create a new evolution session."""
    session = EvolutionSession(
        session_id=generate_session_id(),
        original_prompt=original_prompt,
        max_generations_requested=max_generations,
        status="pending",
    )
    db.add(session)
    await db.flush()
    await db.refresh(session)
    return session


async def get_session(
    db: AsyncSession,
    session_id: str,
) -> Optional[EvolutionSession]:
    """Retrieve a session by its unique session_id."""
    stmt = (
        select(EvolutionSession)
        .where(EvolutionSession.session_id == session_id)
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def get_session_with_generations(
    db: AsyncSession,
    session_id: str,
) -> Optional[EvolutionSession]:
    """Retrieve a session with all its generations eagerly loaded."""
    stmt = (
        select(EvolutionSession)
        .where(EvolutionSession.session_id == session_id)
    )
    result = await db.execute(stmt)
    session = result.scalar_one_or_none()
    if session:
        # Generations are loaded via selectin lazy strategy
        _ = session.generations
    return session


async def update_session_status(
    db: AsyncSession,
    session_id: str,
    status: str,
) -> None:
    """Update session status (pending → evolving → completed → failed)."""
    stmt = (
        update(EvolutionSession)
        .where(EvolutionSession.session_id == session_id)
        .values(status=status)
    )
    await db.execute(stmt)
    await db.flush()


async def complete_session(
    db: AsyncSession,
    session_id: str,
    best_prompt: str,
    best_score: float,
    initial_score: float,
    total_generations: int,
    primary_llm_used: str,
    llm_switches: int = 0,
) -> None:
    """Mark session as completed with final results."""
    now = datetime.now(timezone.utc)
    score_improvement = round(best_score - initial_score, 2)

    stmt = (
        update(EvolutionSession)
        .where(EvolutionSession.session_id == session_id)
        .values(
            status="completed",
            best_prompt=best_prompt,
            best_score=best_score,
            initial_score=initial_score,
            score_improvement=score_improvement,
            total_generations=total_generations,
            primary_llm_used=primary_llm_used,
            llm_switches=llm_switches,
            completed_at=now,
        )
    )
    await db.execute(stmt)
    await db.flush()


async def fail_session(
    db: AsyncSession,
    session_id: str,
    reason: str = "Unknown error",
) -> None:
    """Mark session as failed."""
    now = datetime.now(timezone.utc)
    stmt = (
        update(EvolutionSession)
        .where(EvolutionSession.session_id == session_id)
        .values(
            status="failed",
            completed_at=now,
        )
    )
    await db.execute(stmt)
    await db.flush()

    # Log the failure
    await log_llm_event(
        db=db,
        session_id=session_id,
        event_type="error",
        reason=reason,
    )


async def list_sessions(
    db: AsyncSession,
    limit: int = 20,
    offset: int = 0,
) -> list[EvolutionSession]:
    """List recent evolution sessions, newest first."""
    stmt = (
        select(EvolutionSession)
        .order_by(desc(EvolutionSession.created_at))
        .limit(limit)
        .offset(offset)
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def count_sessions(db: AsyncSession) -> int:
    """Count total sessions."""
    stmt = select(func.count(EvolutionSession.id))
    result = await db.execute(stmt)
    return result.scalar_one()


async def count_recent_sessions_by_ip(
    db: AsyncSession,
    hours: int = 1,
) -> int:
    """Count sessions created in the last N hours (for rate limiting)."""
    from datetime import timedelta
    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
    stmt = (
        select(func.count(EvolutionSession.id))
        .where(EvolutionSession.created_at >= cutoff)
    )
    result = await db.execute(stmt)
    return result.scalar_one()


async def delete_session(
    db: AsyncSession,
    session_id: str,
) -> bool:
    """Delete a session and all its generations (cascade)."""
    session = await get_session(db, session_id)
    if session:
        await db.delete(session)
        await db.flush()
        return True
    return False


# ══════════════════════════════════════════════
# GENERATION OPERATIONS
# ══════════════════════════════════════════════

async def create_generation(
    db: AsyncSession,
    session_id: str,
    generation_num: int,
    prompt_text: str,
    clarity_score: float = 0.0,
    specificity_score: float = 0.0,
    actionability_score: float = 0.0,
    conciseness_score: float = 0.0,
    creativity_score: float = 0.0,
    total_score: float = 0.0,
    mutation_type: Optional[str] = None,
    weaknesses_found: Optional[list[str]] = None,
    improvement_delta: float = 0.0,
    llm_used: Optional[str] = None,
    llm_badge_color: Optional[str] = None,
    processing_time_ms: int = 0,
) -> Generation:
    """Create a new generation record."""
    # Serialize weaknesses list to JSON string
    weaknesses_json = None
    if weaknesses_found:
        weaknesses_json = json.dumps(weaknesses_found)

    generation = Generation(
        session_id=session_id,
        generation_num=generation_num,
        prompt_text=prompt_text,
        clarity_score=clarity_score,
        specificity_score=specificity_score,
        actionability_score=actionability_score,
        conciseness_score=conciseness_score,
        creativity_score=creativity_score,
        total_score=total_score,
        mutation_type=mutation_type,
        weaknesses_found=weaknesses_json,
        improvement_delta=improvement_delta,
        llm_used=llm_used,
        llm_badge_color=llm_badge_color,
        processing_time_ms=processing_time_ms,
    )
    db.add(generation)
    await db.flush()
    await db.refresh(generation)
    return generation


async def get_generation(
    db: AsyncSession,
    session_id: str,
    generation_num: int,
) -> Optional[Generation]:
    """Retrieve a specific generation by session and number."""
    stmt = (
        select(Generation)
        .where(
            Generation.session_id == session_id,
            Generation.generation_num == generation_num,
        )
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def get_all_generations(
    db: AsyncSession,
    session_id: str,
) -> list[Generation]:
    """Get all generations for a session, ordered by generation number."""
    stmt = (
        select(Generation)
        .where(Generation.session_id == session_id)
        .order_by(Generation.generation_num)
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_best_generation(
    db: AsyncSession,
    session_id: str,
) -> Optional[Generation]:
    """Get the highest-scoring generation for a session."""
    stmt = (
        select(Generation)
        .where(Generation.session_id == session_id)
        .order_by(desc(Generation.total_score))
        .limit(1)
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def get_latest_generation(
    db: AsyncSession,
    session_id: str,
) -> Optional[Generation]:
    """Get the most recent generation for a session."""
    stmt = (
        select(Generation)
        .where(Generation.session_id == session_id)
        .order_by(desc(Generation.generation_num))
        .limit(1)
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def update_generation_scores(
    db: AsyncSession,
    session_id: str,
    generation_num: int,
    clarity_score: float,
    specificity_score: float,
    actionability_score: float,
    conciseness_score: float,
    creativity_score: float,
    total_score: float,
    weaknesses_found: Optional[list[str]] = None,
) -> None:
    """Update scores for a generation after scoring is complete."""
    weaknesses_json = json.dumps(weaknesses_found) if weaknesses_found else None

    stmt = (
        update(Generation)
        .where(
            Generation.session_id == session_id,
            Generation.generation_num == generation_num,
        )
        .values(
            clarity_score=clarity_score,
            specificity_score=specificity_score,
            actionability_score=actionability_score,
            conciseness_score=conciseness_score,
            creativity_score=creativity_score,
            total_score=total_score,
            weaknesses_found=weaknesses_json,
        )
    )
    await db.execute(stmt)
    await db.flush()


# ══════════════════════════════════════════════
# LLM LOG OPERATIONS
# ══════════════════════════════════════════════

async def log_llm_event(
    db: AsyncSession,
    session_id: Optional[str] = None,
    generation_num: Optional[int] = None,
    event_type: str = "success",
    from_llm: Optional[str] = None,
    to_llm: Optional[str] = None,
    reason: Optional[str] = None,
) -> LLMLog:
    """Log an LLM event (switch, error, or success)."""
    log_entry = LLMLog(
        session_id=session_id,
        generation_num=generation_num,
        event_type=event_type,
        from_llm=from_llm,
        to_llm=to_llm,
        reason=reason,
    )
    db.add(log_entry)
    await db.flush()
    return log_entry


async def log_llm_switch(
    db: AsyncSession,
    session_id: str,
    generation_num: int,
    from_llm: str,
    to_llm: str,
    reason: str,
) -> LLMLog:
    """Log an LLM provider switch during evolution."""
    return await log_llm_event(
        db=db,
        session_id=session_id,
        generation_num=generation_num,
        event_type="switch",
        from_llm=from_llm,
        to_llm=to_llm,
        reason=reason,
    )


async def get_llm_logs(
    db: AsyncSession,
    session_id: Optional[str] = None,
    limit: int = 50,
) -> list[LLMLog]:
    """Get LLM logs, optionally filtered by session."""
    stmt = select(LLMLog).order_by(desc(LLMLog.created_at)).limit(limit)
    if session_id:
        stmt = stmt.where(LLMLog.session_id == session_id)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def count_llm_switches(
    db: AsyncSession,
    session_id: str,
) -> int:
    """Count how many LLM switches occurred in a session."""
    stmt = (
        select(func.count(LLMLog.id))
        .where(
            LLMLog.session_id == session_id,
            LLMLog.event_type == "switch",
        )
    )
    result = await db.execute(stmt)
    return result.scalar_one()


# ══════════════════════════════════════════════
# STATISTICS & ANALYTICS
# ══════════════════════════════════════════════

async def get_evolution_stats(db: AsyncSession) -> dict:
    """Get overall platform statistics."""
    total_sessions = await count_sessions(db)

    # Average improvement
    stmt = select(func.avg(EvolutionSession.score_improvement)).where(
        EvolutionSession.status == "completed"
    )
    result = await db.execute(stmt)
    avg_improvement = result.scalar_one() or 0.0

    # Average best score
    stmt = select(func.avg(EvolutionSession.best_score)).where(
        EvolutionSession.status == "completed"
    )
    result = await db.execute(stmt)
    avg_best_score = result.scalar_one() or 0.0

    # Total generations processed
    stmt = select(func.count(Generation.id))
    result = await db.execute(stmt)
    total_generations = result.scalar_one()

    # Most used LLM
    stmt = (
        select(Generation.llm_used, func.count(Generation.id).label("count"))
        .where(Generation.llm_used.isnot(None))
        .group_by(Generation.llm_used)
        .order_by(desc("count"))
        .limit(1)
    )
    result = await db.execute(stmt)
    row = result.first()
    most_used_llm = row[0] if row else "None"

    return {
        "total_sessions": total_sessions,
        "avg_improvement": round(avg_improvement, 2),
        "avg_best_score": round(avg_best_score, 2),
        "total_generations": total_generations,
        "most_used_llm": most_used_llm,
    }
