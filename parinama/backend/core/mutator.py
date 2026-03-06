# ════════════════════════════════════════════════
# PARINAMA — Prompt Mutation Engine
# 6 mutation strategies that evolve prompts
# toward higher quality scores
# ════════════════════════════════════════════════

import json
import re
from dataclasses import dataclass
from enum import Enum
from typing import Optional


# ══════════════════════════════════════════════
# MUTATION TYPES
# ══════════════════════════════════════════════

class MutationType(str, Enum):
    """The 6 mutation strategies for prompt evolution."""
    CLARIFY = "CLARIFY"
    EXPAND = "EXPAND"
    COMPRESS = "COMPRESS"
    REFRAME = "REFRAME"
    SPECIALIZE = "SPECIALIZE"
    HUMANIZE = "HUMANIZE"


MUTATION_DESCRIPTIONS = {
    MutationType.CLARIFY: {
        "label": "Clarify",
        "description": "Remove ambiguity, add precision, make instructions crystal clear",
        "icon": "🔍",
        "targets": ["clarity", "actionability"],
        "color": "#D4922A",
    },
    MutationType.EXPAND: {
        "label": "Expand",
        "description": "Add missing context, constraints, examples, and details",
        "icon": "📐",
        "targets": ["specificity", "actionability"],
        "color": "#5C8B4A",
    },
    MutationType.COMPRESS: {
        "label": "Compress",
        "description": "Remove redundancy, tighten language, eliminate waste",
        "icon": "✂️",
        "targets": ["conciseness"],
        "color": "#B85450",
    },
    MutationType.REFRAME: {
        "label": "Reframe",
        "description": "Change perspective, try a different approach angle",
        "icon": "🔄",
        "targets": ["creativity", "clarity"],
        "color": "#7C6BC4",
    },
    MutationType.SPECIALIZE: {
        "label": "Specialize",
        "description": "Add domain-specific terminology, expert framing",
        "icon": "🎯",
        "targets": ["specificity", "creativity"],
        "color": "#C4856B",
    },
    MutationType.HUMANIZE: {
        "label": "Humanize",
        "description": "Make it more natural, conversational, and engaging",
        "icon": "💬",
        "targets": ["creativity", "clarity"],
        "color": "#6BA5C4",
    },
}

# Rotation order for cycling through mutations
MUTATION_ROTATION = [
    MutationType.CLARIFY,
    MutationType.EXPAND,
    MutationType.COMPRESS,
    MutationType.REFRAME,
    MutationType.SPECIALIZE,
    MutationType.HUMANIZE,
]


# ══════════════════════════════════════════════
# DATA CLASSES
# ══════════════════════════════════════════════

@dataclass
class MutationResult:
    """Result of a mutation operation."""
    mutation_type: MutationType
    original_prompt: str
    mutated_prompt: str
    reason: str
    llm_used: str = ""
    badge_color: str = ""
    raw_llm_response: str = ""

    def to_dict(self) -> dict:
        return {
            "mutation_type": self.mutation_type.value,
            "mutation_info": MUTATION_DESCRIPTIONS[self.mutation_type],
            "original_prompt": self.original_prompt,
            "mutated_prompt": self.mutated_prompt,
            "reason": self.reason,
            "llm_used": self.llm_used,
        }


# ══════════════════════════════════════════════
# MUTATION STRATEGY SELECTOR
# ══════════════════════════════════════════════

def select_mutation_strategy(
    generation_num: int,
    weaknesses: list[str],
    previous_mutations: list[str],
) -> MutationType:
    """
    Intelligently select the best mutation strategy based on:
    1. Current weaknesses (prioritize fixing the worst dimension)
    2. Previous mutations used (avoid repeating the same one)
    3. Generation number (cycle through rotation)

    Args:
        generation_num: Current generation number (1-indexed)
        weaknesses: List of weak dimension names from scorer
        previous_mutations: List of mutation types already used

    Returns:
        The selected MutationType
    """
    # Strategy 1: Target weaknesses directly
    if weaknesses:
        # Map weakness dimensions to best mutation types
        weakness_to_mutation = {
            "clarity": MutationType.CLARIFY,
            "specificity": MutationType.EXPAND,
            "actionability": MutationType.CLARIFY,
            "conciseness": MutationType.COMPRESS,
            "creativity": MutationType.REFRAME,
        }

        for weakness in weaknesses:
            candidate = weakness_to_mutation.get(weakness)
            if candidate and candidate.value not in previous_mutations:
                return candidate

        # If primary fix was already used, try secondary mappings
        secondary_mapping = {
            "clarity": MutationType.HUMANIZE,
            "specificity": MutationType.SPECIALIZE,
            "actionability": MutationType.EXPAND,
            "conciseness": MutationType.REFRAME,
            "creativity": MutationType.HUMANIZE,
        }

        for weakness in weaknesses:
            candidate = secondary_mapping.get(weakness)
            if candidate and candidate.value not in previous_mutations:
                return candidate

    # Strategy 2: Rotate through mutations that haven't been used
    for mutation in MUTATION_ROTATION:
        if mutation.value not in previous_mutations:
            return mutation

    # Strategy 3: Cycle based on generation number
    idx = (generation_num - 1) % len(MUTATION_ROTATION)
    return MUTATION_ROTATION[idx]


# ══════════════════════════════════════════════
# MUTATION PROMPT TEMPLATES
# ══════════════════════════════════════════════

MUTATION_SYSTEM_PROMPT = """You are an expert prompt engineer performing a precise mutation on a prompt to improve its quality. You must rewrite the prompt according to the specific mutation strategy provided.

CRITICAL RULES:
1. Preserve the core INTENT of the original prompt — do NOT change what it's asking for
2. Apply ONLY the specified mutation strategy
3. The output must be a complete, standalone prompt — not a diff or explanation
4. Do NOT add meta-commentary like "Here's the improved prompt:"
5. Do NOT wrap the output in quotes or code blocks
6. Return ONLY the mutated prompt text, nothing else
7. The mutated prompt should be noticeably different from the original while keeping the same goal"""


def build_mutation_prompt(
    current_prompt: str,
    mutation_type: MutationType,
    weaknesses: list[str],
    scores: dict,
    generation_num: int,
) -> str:
    """Build the mutation instruction prompt for the LLM."""
    mutation_info = MUTATION_DESCRIPTIONS[mutation_type]
    weakness_text = ", ".join(weaknesses) if weaknesses else "none identified"

    score_breakdown = "\n".join(
        f"  - {dim}: {score}/100"
        for dim, score in scores.items()
        if dim != "total"
    )

    return f"""MUTATION STRATEGY: {mutation_type.value} — {mutation_info['description']}

CURRENT PROMPT (Generation {generation_num - 1}):
\"\"\"
{current_prompt}
\"\"\"

CURRENT SCORES:
{score_breakdown}
  - Total: {scores.get('total', 0)}/100

IDENTIFIED WEAKNESSES: {weakness_text}

TARGET DIMENSIONS TO IMPROVE: {', '.join(mutation_info['targets'])}

YOUR TASK:
Apply the {mutation_type.value} mutation to rewrite this prompt. Focus on improving the weak dimensions while maintaining or improving the strong ones.

{"Specific guidance for " + mutation_type.value + ":" }
{_get_mutation_guidance(mutation_type)}

Write ONLY the new mutated prompt. No explanations, no labels, no quotes."""


def _get_mutation_guidance(mutation_type: MutationType) -> str:
    """Get specific tactical guidance for each mutation type."""
    guidance = {
        MutationType.CLARIFY: """
- Replace vague words with precise ones (e.g., "good" → "well-structured and technically accurate")
- Break compound instructions into numbered steps
- Add explicit "Do" and "Don't" constraints where helpful
- Eliminate words that could be interpreted multiple ways
- Specify the exact format, tone, and structure expected""",

        MutationType.EXPAND: """
- Add context about the target audience or use case
- Include specific constraints (length, format, style, tone)
- Add 1-2 concrete examples of desired output
- Specify edge cases or boundaries
- Define what "success" looks like for this prompt
- Add role-setting if not present (e.g., "You are a senior...")""",

        MutationType.COMPRESS: """
- Remove all redundant phrases and repetitions
- Combine overlapping instructions into single clear statements
- Replace wordy phrases with concise alternatives
- Remove filler words (just, really, very, basically, actually)
- Keep ONLY what's essential — every word must earn its place
- Aim for 20-40% reduction in word count while keeping all meaning""",

        MutationType.REFRAME: """
- Try a completely different angle to achieve the same goal
- If it's a question, reframe as a task or scenario
- If it's generic, make it situation-specific
- Consider using: role-play, analogy, constraint-based, or step-by-step framing
- Challenge assumptions in the original approach
- Think: "What would an expert in this field ask instead?" """,

        MutationType.SPECIALIZE: """
- Add domain-specific vocabulary and terminology
- Reference relevant frameworks, methodologies, or standards
- Include expert-level constraints and quality criteria
- Set the expertise level expected in the response
- Add industry-specific context or benchmarks
- Use precise technical terms instead of general ones""",

        MutationType.HUMANIZE: """
- Make the tone more natural and conversational
- Add a brief motivating context ("I'm working on X and need...")
- Use active voice throughout
- Add personality without losing professionalism
- Replace robotic instructions with natural language
- Make it sound like something a thoughtful person would actually say""",
    }
    return guidance.get(mutation_type, "")


# ══════════════════════════════════════════════
# MUTATION RESPONSE PARSER
# ══════════════════════════════════════════════

def parse_mutation_response(raw_response: str) -> str:
    """
    Clean up the LLM's mutation response to extract just the prompt.
    Removes any meta-commentary, quotes, or formatting.
    """
    cleaned = raw_response.strip()

    # Remove common LLM preambles
    preamble_patterns = [
        r'^(?:Here\'?s?\s+(?:the\s+)?(?:improved|mutated|rewritten|new|revised)\s+prompt\s*[:\.]\s*)',
        r'^(?:Mutated\s+prompt\s*[:\.]\s*)',
        r'^(?:New\s+prompt\s*[:\.]\s*)',
        r'^(?:Revised\s+version\s*[:\.]\s*)',
        r'^(?:Output\s*[:\.]\s*)',
    ]
    for pattern in preamble_patterns:
        cleaned = re.sub(pattern, '', cleaned, flags=re.IGNORECASE)

    # Remove wrapping quotes (single, double, or triple)
    if cleaned.startswith('"""') and cleaned.endswith('"""'):
        cleaned = cleaned[3:-3]
    elif cleaned.startswith('"') and cleaned.endswith('"'):
        cleaned = cleaned[1:-1]
    elif cleaned.startswith("'") and cleaned.endswith("'"):
        cleaned = cleaned[1:-1]

    # Remove markdown code blocks
    cleaned = re.sub(r'^```(?:\w+)?\s*', '', cleaned)
    cleaned = re.sub(r'\s*```\s*$', '', cleaned)

    # Remove trailing meta-commentary (lines starting with "Note:", "This version:", etc.)
    lines = cleaned.split('\n')
    filtered_lines = []
    for line in lines:
        if re.match(r'^(?:Note|This version|This mutation|I\'ve|The above|Changes made)\s*:', line, re.IGNORECASE):
            break
        filtered_lines.append(line)

    cleaned = '\n'.join(filtered_lines).strip()

    return cleaned


# ══════════════════════════════════════════════
# MAIN MUTATION FUNCTION
# ══════════════════════════════════════════════

async def mutate_prompt(
    current_prompt: str,
    mutation_type: MutationType,
    weaknesses: list[str],
    scores: dict,
    generation_num: int,
    llm_router_fn,
) -> MutationResult:
    """
    Apply a mutation to the current prompt using the LLM.

    Args:
        current_prompt: The prompt to mutate
        mutation_type: Which mutation strategy to apply
        weaknesses: List of weak dimension names
        scores: Current score dictionary
        generation_num: Current generation number
        llm_router_fn: Async function that calls the LLM

    Returns:
        MutationResult with the mutated prompt
    """
    mutation_prompt = build_mutation_prompt(
        current_prompt=current_prompt,
        mutation_type=mutation_type,
        weaknesses=weaknesses,
        scores=scores,
        generation_num=generation_num,
    )

    # Call LLM via router
    llm_response = await llm_router_fn(
        prompt=mutation_prompt,
        system=MUTATION_SYSTEM_PROMPT,
    )

    raw_text = llm_response["text"]
    mutated_prompt = parse_mutation_response(raw_text)

    # Build reason string
    mutation_info = MUTATION_DESCRIPTIONS[mutation_type]
    reason = (
        f"Applied {mutation_type.value} mutation targeting "
        f"{', '.join(mutation_info['targets'])}. "
        f"Weaknesses addressed: {', '.join(weaknesses) if weaknesses else 'general improvement'}."
    )

    return MutationResult(
        mutation_type=mutation_type,
        original_prompt=current_prompt,
        mutated_prompt=mutated_prompt,
        reason=reason,
        llm_used=llm_response.get("llm_used", "unknown"),
        badge_color=llm_response.get("badge_color", "#888888"),
        raw_llm_response=raw_text,
    )


# ══════════════════════════════════════════════
# UTILITY FUNCTIONS
# ══════════════════════════════════════════════

def get_mutation_info(mutation_type: MutationType) -> dict:
    """Get display info for a mutation type."""
    return MUTATION_DESCRIPTIONS[mutation_type]


def get_all_mutation_types() -> list[dict]:
    """Get info for all mutation types (for UI display)."""
    return [
        {
            "type": mt.value,
            **MUTATION_DESCRIPTIONS[mt],
        }
        for mt in MutationType
    ]


def get_mutation_by_name(name: str) -> Optional[MutationType]:
    """Get a MutationType by its string name."""
    try:
        return MutationType(name.upper())
    except ValueError:
        return None
