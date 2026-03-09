# ════════════════════════════════════════════════
# PARINAMA — Formatter Utilities
# Text formatting and display helpers
# ════════════════════════════════════════════════

import json
from datetime import datetime, timezone
from typing import Optional


def format_score(score: float) -> str:
    """Format a score for display (e.g., 87.5 → '87.5')."""
    return f"{score:.1f}"


def format_improvement(delta: float) -> str:
    """Format improvement delta with + or - sign."""
    if delta > 0:
        return f"+{delta:.1f}"
    elif delta < 0:
        return f"{delta:.1f}"
    return "0.0"


def format_time_ms(ms: int) -> str:
    """Format milliseconds to human-readable string."""
    if ms < 1000:
        return f"{ms}ms"
    elif ms < 60000:
        seconds = ms / 1000
        return f"{seconds:.1f}s"
    else:
        minutes = ms / 60000
        return f"{minutes:.1f}m"


def format_timestamp(dt: Optional[datetime]) -> str:
    """Format a datetime for display."""
    if not dt:
        return "N/A"
    return dt.strftime("%b %d, %Y at %I:%M %p")


def truncate_text(text: str, max_length: int = 100) -> str:
    """Truncate text with ellipsis."""
    if len(text) <= max_length:
        return text
    return text[:max_length - 3] + "..."


def format_prompt_preview(prompt: str, max_lines: int = 3, max_chars: int = 200) -> str:
    """Create a preview of a prompt for display in lists."""
    lines = prompt.strip().split('\n')
    preview_lines = lines[:max_lines]
    preview = '\n'.join(preview_lines)

    if len(lines) > max_lines:
        preview += "\n..."

    return truncate_text(preview, max_chars)


def format_evolution_summary(result: dict) -> dict:
    """Format an evolution result for a summary display."""
    return {
        "session_id": result.get("session_id", ""),
        "original_prompt": result.get("original_prompt", ""),
        "best_prompt": result.get("best_prompt", ""),
        "best_score": result.get("best_score", 0) or 0,
        "initial_score": result.get("initial_score", 0) or 0,
        "improvement": result.get("score_improvement", 0) or result.get("improvement", 0) or 0,
        "total_generations": result.get("total_generations", 0),
        "status": result.get("status", "unknown"),
        "primary_llm_used": result.get("primary_llm_used", ""),
        "created_at": result.get("created_at"),
        "completed_at": result.get("completed_at"),
        "original_preview": format_prompt_preview(result.get("original_prompt", "")),
        "best_preview": format_prompt_preview(result.get("best_prompt", "")),
        "score_display": format_score(result.get("best_score", 0) or 0),
        "improvement_display": format_improvement(result.get("score_improvement", 0) or result.get("improvement", 0) or 0),
        "time_display": format_time_ms(result.get("total_time_ms", 0)),
    }


def scores_to_radar_data(scores: dict) -> list[dict]:
    """Convert score dict to radar chart data format for frontend."""
    dimension_labels = {
        "clarity": "Clarity",
        "specificity": "Specificity",
        "actionability": "Actionability",
        "conciseness": "Conciseness",
        "creativity": "Creativity",
    }

    radar_data = []
    for key, label in dimension_labels.items():
        if key in scores:
            radar_data.append({
                "dimension": label,
                "value": scores[key],
                "fullMark": 100,
            })

    return radar_data


def generations_to_tree_data(generations: list[dict]) -> dict:
    """
    Convert generations list to tree structure for D3.js visualization.

    Returns a nested tree structure:
    {
        "name": "Gen 0",
        "score": 45.2,
        "children": [{
            "name": "Gen 1",
            "score": 58.7,
            "mutation": "CLARIFY",
            "children": [...]
        }]
    }
    """
    if not generations:
        return {}

    def build_node(gen: dict) -> dict:
        scores = gen.get("scores", {})
        return {
            "name": f"Gen {gen.get('generation_num', 0)}",
            "generation_num": gen.get("generation_num", 0),
            "score": scores.get("total", 0) if isinstance(scores, dict) else 0,
            "prompt_preview": truncate_text(gen.get("prompt_text", ""), 80),
            "mutation_type": gen.get("mutation_type"),
            "llm_used": gen.get("llm_used", ""),
            "improvement": gen.get("improvement_delta", 0),
            "children": [],
        }

    # Build linear tree (each generation is child of previous)
    if len(generations) == 0:
        return {}

    root = build_node(generations[0])
    current = root

    for gen in generations[1:]:
        child = build_node(gen)
        current["children"] = [child]
        current = child

    return root


def export_evolution_json(result: dict) -> str:
    """Export evolution result as formatted JSON string."""
    export_data = {
        "app": "PARINAMA — Self-Evolving Prompt Optimization Engine",
        "version": "1.0.0",
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "session_id": result.get("session_id"),
        "original_prompt": result.get("original_prompt"),
        "best_prompt": result.get("best_prompt"),
        "scores": {
            "initial": result.get("initial_score", 0),
            "final": result.get("best_score", 0),
            "improvement": result.get("improvement", 0),
        },
        "evolution": {
            "total_generations": result.get("total_generations", 0),
            "total_time_ms": result.get("total_time_ms", 0),
            "llm_switches": result.get("llm_switches", 0),
        },
        "generations": result.get("generations", []),
    }

    return json.dumps(export_data, indent=2, ensure_ascii=False)
