# ════════════════════════════════════════════════
# PARINAMA — REST API Routes
# HTTP endpoints for sessions, history, health
# ════════════════════════════════════════════════

import os
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from database.models import get_db
from database.crud import (
    get_session_with_generations,
    list_sessions,
    count_sessions,
    delete_session,
    get_evolution_stats,
    get_llm_logs,
)
from core.generator import (
    start_evolution,
    get_evolution_result,
    get_system_health,
)
from core.router import check_provider_health
from utils.validator import (
    validate_prompt,
    validate_generations,
    validate_session_id,
    sanitize_prompt,
)
from utils.formatter import (
    format_evolution_summary,
    export_evolution_json,
    scores_to_radar_data,
    generations_to_tree_data,
)


# ══════════════════════════════════════════════
# ROUTER
# ══════════════════════════════════════════════

api_router = APIRouter(prefix="/api", tags=["api"])


# ══════════════════════════════════════════════
# REQUEST / RESPONSE MODELS
# ══════════════════════════════════════════════

class EvolutionRequest(BaseModel):
    """Request body for starting an evolution via REST."""
    prompt: str = Field(
        ...,
        min_length=10,
        max_length=2000,
        description="The prompt to evolve",
    )
    max_generations: int = Field(
        default=7,
        description="Number of evolution generations (3, 5, or 7)",
    )
    score_threshold: float = Field(
        default=90.0,
        ge=50.0,
        le=100.0,
        description="Stop when score exceeds this threshold",
    )


class EvolutionResponse(BaseModel):
    """Response for evolution results."""
    session_id: str
    status: str
    original_prompt: str
    best_prompt: str
    best_score: float
    initial_score: float
    improvement: float
    total_generations: int
    total_time_ms: int
    llm_switches: int
    generations: list
    error: Optional[str] = None


class HealthResponse(BaseModel):
    """Response for health check."""
    status: str
    version: str
    available_providers: int
    total_providers: int
    providers: dict


class StatsResponse(BaseModel):
    """Response for platform statistics."""
    total_sessions: int
    avg_improvement: float
    avg_best_score: float
    total_generations: int
    most_used_llm: str


# ══════════════════════════════════════════════
# HEALTH & STATUS ENDPOINTS
# ══════════════════════════════════════════════

@api_router.get("/health")
async def health_check():
    """
    System health check.
    Returns status of all LLM providers.
    """
    health = await get_system_health()
    return {
        "status": health["status"],
        "version": "1.0.0",
        "app": "PARINAMA — Self-Evolving Prompt Optimization Engine",
        "available_providers": health["available_providers"],
        "total_providers": health["total_providers"],
        "providers": health["providers"],
    }


@api_router.get("/providers")
async def list_providers():
    """
    List all LLM providers and their current status.
    """
    provider_health = await check_provider_health()
    return {
        "providers": provider_health,
        "fallback_chain": ["Groq (Llama 3.1 70B)", "Gemini 2.0 Flash", "Ollama (Mistral Local)"],
    }


# ══════════════════════════════════════════════
# EVOLUTION ENDPOINTS
# ══════════════════════════════════════════════

@api_router.post("/evolve", response_model=None)
async def start_evolution_rest(request: EvolutionRequest):
    """
    Start a prompt evolution via REST (non-streaming).
    For real-time streaming, use the WebSocket endpoint at /ws/evolve.

    This endpoint blocks until the evolution is complete.
    """
    # Sanitize prompt
    sanitized_prompt = sanitize_prompt(request.prompt)

    # Validate
    is_valid, error_msg = validate_prompt(sanitized_prompt)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_msg)

    is_valid, max_gen, error_msg = validate_generations(request.max_generations)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_msg)

    try:
        result = await start_evolution(
            prompt=sanitized_prompt,
            max_generations=max_gen,
            score_threshold=request.score_threshold,
            ws_send=None,  # No WebSocket for REST endpoint
        )
        return result

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Evolution failed: {str(e)}",
        )


# ══════════════════════════════════════════════
# SESSION ENDPOINTS
# ══════════════════════════════════════════════

@api_router.get("/sessions")
async def get_sessions(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    """
    List recent evolution sessions with pagination.
    """
    sessions = await list_sessions(db, limit=limit, offset=offset)
    total = await count_sessions(db)

    return {
        "sessions": [
            format_evolution_summary(s.to_dict()) for s in sessions
        ],
        "total": total,
        "limit": limit,
        "offset": offset,
        "has_more": (offset + limit) < total,
    }


@api_router.get("/sessions/{session_id}")
async def get_session_detail(
    session_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Get detailed results for a specific evolution session.
    Includes all generations, scores, and mutation history.
    """
    # Validate session ID
    is_valid, error_msg = validate_session_id(session_id)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_msg)

    session = await get_session_with_generations(db, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    session_data = session.to_dict()

    # Add formatted extras for frontend
    session_data["radar_data"] = []
    session_data["tree_data"] = generations_to_tree_data(session_data.get("generations", []))

    # Build radar data from best generation
    if session_data.get("generations"):
        best_gen = max(
            session_data["generations"],
            key=lambda g: g.get("scores", {}).get("total", 0) if isinstance(g.get("scores"), dict) else 0,
        )
        if isinstance(best_gen.get("scores"), dict):
            session_data["radar_data"] = scores_to_radar_data(best_gen["scores"])

    return session_data


@api_router.delete("/sessions/{session_id}")
async def delete_session_endpoint(
    session_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Delete an evolution session and all its generations.
    """
    is_valid, error_msg = validate_session_id(session_id)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_msg)

    deleted = await delete_session(db, session_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Session not found")

    return {"message": "Session deleted successfully", "session_id": session_id}


@api_router.get("/sessions/{session_id}/export")
async def export_session(
    session_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Export an evolution session as formatted JSON.
    """
    is_valid, error_msg = validate_session_id(session_id)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_msg)

    session = await get_session_with_generations(db, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    export_json = export_evolution_json(session.to_dict())

    return JSONResponse(
        content=json.loads(export_json) if isinstance(export_json, str) else export_json,
        headers={
            "Content-Disposition": f'attachment; filename="parinama_evolution_{session_id}.json"',
        },
    )


# ══════════════════════════════════════════════
# STATISTICS ENDPOINTS
# ══════════════════════════════════════════════

@api_router.get("/stats")
async def get_stats(db: AsyncSession = Depends(get_db)):
    """
    Get overall platform statistics.
    """
    stats = await get_evolution_stats(db)
    return stats


# ══════════════════════════════════════════════
# LLM LOG ENDPOINTS
# ══════════════════════════════════════════════

@api_router.get("/logs/llm")
async def get_llm_log_entries(
    session_id: Optional[str] = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    """
    Get LLM switch and error logs.
    Optionally filter by session_id.
    """
    logs = await get_llm_logs(db, session_id=session_id, limit=limit)

    return {
        "logs": [
            {
                "id": log.id,
                "session_id": log.session_id,
                "generation_num": log.generation_num,
                "event_type": log.event_type,
                "from_llm": log.from_llm,
                "to_llm": log.to_llm,
                "reason": log.reason,
                "created_at": log.created_at.isoformat() if log.created_at else None,
            }
            for log in logs
        ],
        "total": len(logs),
    }


# ══════════════════════════════════════════════
# UTILITY ENDPOINTS
# ══════════════════════════════════════════════

@api_router.get("/mutation-types")
async def get_mutation_types():
    """
    Get all available mutation types with descriptions.
    For UI display purposes.
    """
    from core.mutator import get_all_mutation_types
    return {"mutation_types": get_all_mutation_types()}


@api_router.post("/validate-prompt")
async def validate_prompt_endpoint(request: Request):
    """
    Validate a prompt without starting evolution.
    Useful for real-time validation in the UI.
    """
    body = await request.json()
    prompt = body.get("prompt", "")

    is_valid, error_msg = validate_prompt(prompt)

    return {
        "is_valid": is_valid,
        "error": error_msg if not is_valid else None,
        "char_count": len(prompt),
        "min_length": 10,
        "max_length": 2000,
    }


# Need to import json for export endpoint
import json
