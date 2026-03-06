# ════════════════════════════════════════════════
# PARINAMA — 5-Dimension Prompt Scorer
# Evaluates prompts on Clarity, Specificity,
# Actionability, Conciseness, and Creativity
# ════════════════════════════════════════════════

import json
import re
from dataclasses import dataclass, field
from typing import Optional


# ══════════════════════════════════════════════
# SCORE WEIGHTS — sum to 1.0
# ══════════════════════════════════════════════

DIMENSION_WEIGHTS = {
    "clarity": 0.25,
    "specificity": 0.20,
    "actionability": 0.20,
    "conciseness": 0.20,
    "creativity": 0.15,
}

DIMENSION_DESCRIPTIONS = {
    "clarity": "How unambiguous and easy to understand is the prompt? Are instructions clear with no room for misinterpretation?",
    "specificity": "Does the prompt provide enough context, constraints, and details? Are the desired output format, length, and style defined?",
    "actionability": "Will this prompt produce useful, actionable output? Does it guide the AI toward a concrete deliverable?",
    "conciseness": "Is the prompt free of redundancy and unnecessary words? Is every sentence purposeful?",
    "creativity": "Is the prompt well-crafted and engaging? Does it use creative framing or interesting angles to get better results?",
}


# ══════════════════════════════════════════════
# DATA CLASSES
# ══════════════════════════════════════════════

@dataclass
class DimensionScore:
    """Score for a single dimension."""
    name: str
    score: float  # 0-100
    weight: float
    feedback: str = ""
    weighted_score: float = 0.0

    def __post_init__(self):
        self.score = max(0.0, min(100.0, self.score))
        self.weighted_score = round(self.score * self.weight, 2)


@dataclass
class PromptScoreResult:
    """Complete scoring result for a prompt."""
    clarity: DimensionScore = field(default_factory=lambda: DimensionScore("clarity", 0, 0.25))
    specificity: DimensionScore = field(default_factory=lambda: DimensionScore("specificity", 0, 0.20))
    actionability: DimensionScore = field(default_factory=lambda: DimensionScore("actionability", 0, 0.20))
    conciseness: DimensionScore = field(default_factory=lambda: DimensionScore("conciseness", 0, 0.20))
    creativity: DimensionScore = field(default_factory=lambda: DimensionScore("creativity", 0, 0.15))
    total_score: float = 0.0
    weaknesses: list[str] = field(default_factory=list)
    strengths: list[str] = field(default_factory=list)
    raw_llm_response: str = ""

    def calculate_total(self) -> float:
        """Calculate weighted total score."""
        self.total_score = round(
            self.clarity.weighted_score
            + self.specificity.weighted_score
            + self.actionability.weighted_score
            + self.conciseness.weighted_score
            + self.creativity.weighted_score,
            2,
        )
        return self.total_score

    def identify_weaknesses(self, threshold: float = 60.0) -> list[str]:
        """Identify dimensions scoring below threshold."""
        self.weaknesses = []
        self.strengths = []
        for dim in self.all_dimensions:
            if dim.score < threshold:
                self.weaknesses.append(dim.name)
            else:
                self.strengths.append(dim.name)
        return self.weaknesses

    @property
    def all_dimensions(self) -> list[DimensionScore]:
        return [
            self.clarity,
            self.specificity,
            self.actionability,
            self.conciseness,
            self.creativity,
        ]

    @property
    def lowest_dimension(self) -> DimensionScore:
        """Return the dimension with the lowest score."""
        return min(self.all_dimensions, key=lambda d: d.score)

    @property
    def highest_dimension(self) -> DimensionScore:
        """Return the dimension with the highest score."""
        return max(self.all_dimensions, key=lambda d: d.score)

    def to_dict(self) -> dict:
        """Serialize for API responses."""
        return {
            "scores": {
                "clarity": self.clarity.score,
                "specificity": self.specificity.score,
                "actionability": self.actionability.score,
                "conciseness": self.conciseness.score,
                "creativity": self.creativity.score,
                "total": self.total_score,
            },
            "feedback": {
                "clarity": self.clarity.feedback,
                "specificity": self.specificity.feedback,
                "actionability": self.actionability.feedback,
                "conciseness": self.conciseness.feedback,
                "creativity": self.creativity.feedback,
            },
            "weaknesses": self.weaknesses,
            "strengths": self.strengths,
            "lowest_dimension": self.lowest_dimension.name,
            "highest_dimension": self.highest_dimension.name,
        }


# ══════════════════════════════════════════════
# SCORING PROMPT TEMPLATE
# ══════════════════════════════════════════════

SCORING_SYSTEM_PROMPT = """You are an expert prompt engineer and evaluator. Your task is to score a given prompt on exactly 5 quality dimensions. Be rigorous, honest, and constructive.

SCORING DIMENSIONS (each scored 0-100):

1. CLARITY (weight: 25%)
   - Is the prompt unambiguous?
   - Are instructions clear and easy to follow?
   - Would different people interpret it the same way?
   - Score 90+: Crystal clear, zero ambiguity
   - Score 70-89: Mostly clear, minor ambiguities
   - Score 50-69: Some confusion possible
   - Score below 50: Significantly unclear

2. SPECIFICITY (weight: 20%)
   - Does it provide enough context?
   - Are constraints, format, and expectations defined?
   - Does it specify the desired output type?
   - Score 90+: Highly detailed with clear constraints
   - Score 70-89: Good detail, few gaps
   - Score 50-69: Missing some important context
   - Score below 50: Very vague

3. ACTIONABILITY (weight: 20%)
   - Will this prompt produce useful output?
   - Does it guide toward a concrete deliverable?
   - Can an AI act on it immediately?
   - Score 90+: Immediately actionable, clear deliverable
   - Score 70-89: Mostly actionable
   - Score 50-69: Requires interpretation to act on
   - Score below 50: Too abstract to produce results

4. CONCISENESS (weight: 20%)
   - Is it free of redundancy?
   - Is every word purposeful?
   - Could it say the same with fewer words?
   - Score 90+: Perfectly lean, no waste
   - Score 70-89: Mostly concise, minor verbosity
   - Score 50-69: Some unnecessary content
   - Score below 50: Significantly bloated

5. CREATIVITY (weight: 15%)
   - Is it well-crafted and engaging?
   - Does it use smart framing?
   - Does it leverage techniques like role-setting, examples, or constraints creatively?
   - Score 90+: Masterfully crafted
   - Score 70-89: Good technique usage
   - Score 50-69: Standard/basic approach
   - Score below 50: No craft applied

RESPOND IN EXACTLY THIS JSON FORMAT (no other text):
{
    "clarity": {"score": <0-100>, "feedback": "<1-2 sentence explanation>"},
    "specificity": {"score": <0-100>, "feedback": "<1-2 sentence explanation>"},
    "actionability": {"score": <0-100>, "feedback": "<1-2 sentence explanation>"},
    "conciseness": {"score": <0-100>, "feedback": "<1-2 sentence explanation>"},
    "creativity": {"score": <0-100>, "feedback": "<1-2 sentence explanation>"},
    "weaknesses": ["<weakness 1>", "<weakness 2>"],
    "strengths": ["<strength 1>", "<strength 2>"]
}"""


def build_scoring_prompt(prompt_text: str) -> str:
    """Build the user-facing scoring prompt."""
    return f"""Score the following prompt on all 5 dimensions.

PROMPT TO EVALUATE:
\"\"\"
{prompt_text}
\"\"\"

Respond with ONLY the JSON object. No markdown, no code blocks, no explanation."""


# ══════════════════════════════════════════════
# SCORE PARSER
# ══════════════════════════════════════════════

def parse_score_response(raw_response: str) -> PromptScoreResult:
    """Parse the LLM's JSON response into a PromptScoreResult."""
    result = PromptScoreResult()
    result.raw_llm_response = raw_response

    try:
        # Clean up the response — strip markdown code fences if present
        cleaned = raw_response.strip()
        cleaned = re.sub(r'^```(?:json)?\s*', '', cleaned)
        cleaned = re.sub(r'\s*```\s*$', '', cleaned)
        cleaned = cleaned.strip()

        data = json.loads(cleaned)

        # Parse each dimension
        for dim_name in ["clarity", "specificity", "actionability", "conciseness", "creativity"]:
            if dim_name in data:
                dim_data = data[dim_name]
                score = float(dim_data.get("score", 0))
                feedback = str(dim_data.get("feedback", ""))
                weight = DIMENSION_WEIGHTS[dim_name]

                dim_score = DimensionScore(
                    name=dim_name,
                    score=score,
                    weight=weight,
                    feedback=feedback,
                )
                setattr(result, dim_name, dim_score)

        # Parse weaknesses and strengths
        result.weaknesses = data.get("weaknesses", [])
        result.strengths = data.get("strengths", [])

        # Calculate total
        result.calculate_total()

        # If weaknesses weren't provided by LLM, identify them automatically
        if not result.weaknesses:
            result.identify_weaknesses(threshold=60.0)

    except (json.JSONDecodeError, KeyError, TypeError, ValueError) as e:
        # Fallback: try to extract scores with regex
        result = _fallback_parse(raw_response, str(e))

    return result


def _fallback_parse(raw_response: str, error_msg: str) -> PromptScoreResult:
    """Fallback parser using regex when JSON parsing fails."""
    result = PromptScoreResult()
    result.raw_llm_response = raw_response

    # Try to find score patterns like "clarity": 75 or clarity: 75
    dimension_patterns = {
        "clarity": r'clarity["\s:]+(?:{\s*"score"\s*:\s*)?(\d+)',
        "specificity": r'specificity["\s:]+(?:{\s*"score"\s*:\s*)?(\d+)',
        "actionability": r'actionability["\s:]+(?:{\s*"score"\s*:\s*)?(\d+)',
        "conciseness": r'conciseness["\s:]+(?:{\s*"score"\s*:\s*)?(\d+)',
        "creativity": r'creativity["\s:]+(?:{\s*"score"\s*:\s*)?(\d+)',
    }

    for dim_name, pattern in dimension_patterns.items():
        match = re.search(pattern, raw_response, re.IGNORECASE)
        score = float(match.group(1)) if match else 50.0  # Default to 50 if not found
        weight = DIMENSION_WEIGHTS[dim_name]
        dim_score = DimensionScore(
            name=dim_name,
            score=score,
            weight=weight,
            feedback=f"Score extracted via fallback parser (JSON parse error: {error_msg})",
        )
        setattr(result, dim_name, dim_score)

    result.calculate_total()
    result.identify_weaknesses(threshold=60.0)
    return result


# ══════════════════════════════════════════════
# MAIN SCORING FUNCTION
# ══════════════════════════════════════════════

async def score_prompt(
    prompt_text: str,
    llm_router_fn,
) -> PromptScoreResult:
    """
    Score a prompt using the LLM router.

    Args:
        prompt_text: The prompt to evaluate
        llm_router_fn: Async function that calls the LLM (from router.py)

    Returns:
        PromptScoreResult with all dimension scores
    """
    scoring_prompt = build_scoring_prompt(prompt_text)

    # Call LLM via router
    llm_response = await llm_router_fn(
        prompt=scoring_prompt,
        system=SCORING_SYSTEM_PROMPT,
    )

    raw_text = llm_response["text"]
    llm_used = llm_response.get("llm_used", "unknown")

    # Parse the response
    result = parse_score_response(raw_text)

    return result, llm_used, llm_response.get("badge_color", "#888888")


# ══════════════════════════════════════════════
# SCORE COMPARISON UTILITIES
# ══════════════════════════════════════════════

def calculate_improvement(
    previous: PromptScoreResult,
    current: PromptScoreResult,
) -> dict:
    """Calculate improvement between two generations."""
    return {
        "total_delta": round(current.total_score - previous.total_score, 2),
        "dimension_deltas": {
            "clarity": round(current.clarity.score - previous.clarity.score, 2),
            "specificity": round(current.specificity.score - previous.specificity.score, 2),
            "actionability": round(current.actionability.score - previous.actionability.score, 2),
            "conciseness": round(current.conciseness.score - previous.conciseness.score, 2),
            "creativity": round(current.creativity.score - previous.creativity.score, 2),
        },
        "improved_dimensions": [
            dim for dim in ["clarity", "specificity", "actionability", "conciseness", "creativity"]
            if getattr(current, dim).score > getattr(previous, dim).score
        ],
        "declined_dimensions": [
            dim for dim in ["clarity", "specificity", "actionability", "conciseness", "creativity"]
            if getattr(current, dim).score < getattr(previous, dim).score
        ],
    }


def suggest_focus_dimension(score_result: PromptScoreResult) -> str:
    """Suggest which dimension to focus on for the next mutation."""
    # Priority: lowest score that also has high weight
    dimensions = score_result.all_dimensions
    # Sort by: (score ascending, weight descending) — fix worst high-impact ones first
    prioritized = sorted(dimensions, key=lambda d: (d.score, -d.weight))
    return prioritized[0].name
