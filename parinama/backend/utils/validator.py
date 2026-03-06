# ════════════════════════════════════════════════
# PARINAMA — Input Validator
# Validates and sanitizes all user inputs
# ════════════════════════════════════════════════

import re
import bleach


# ══════════════════════════════════════════════
# CONSTANTS
# ══════════════════════════════════════════════

MIN_PROMPT_LENGTH = 10
MAX_PROMPT_LENGTH = 2000
ALLOWED_GENERATIONS = [3, 5, 7]
MIN_SCORE_THRESHOLD = 50.0
MAX_SCORE_THRESHOLD = 100.0


# ══════════════════════════════════════════════
# PROMPT VALIDATION
# ══════════════════════════════════════════════

def validate_prompt(prompt: str) -> tuple[bool, str]:
    """
    Validate a user-submitted prompt.

    Returns:
        (is_valid, error_message)
    """
    if not prompt or not isinstance(prompt, str):
        return False, "Prompt is required and must be a string."

    prompt = prompt.strip()

    if len(prompt) < MIN_PROMPT_LENGTH:
        return False, f"Prompt must be at least {MIN_PROMPT_LENGTH} characters. Current: {len(prompt)}"

    if len(prompt) > MAX_PROMPT_LENGTH:
        return False, f"Prompt must not exceed {MAX_PROMPT_LENGTH} characters. Current: {len(prompt)}"

    # Check for empty/whitespace-only content
    if not prompt.replace('\n', '').replace('\r', '').replace('\t', '').strip():
        return False, "Prompt cannot be only whitespace."

    return True, ""


def sanitize_prompt(prompt: str) -> str:
    """
    Sanitize a prompt by removing potentially harmful content.
    Strips HTML tags and cleans up whitespace.
    """
    # Remove HTML tags
    cleaned = bleach.clean(prompt, tags=[], attributes={}, strip=True)

    # Normalize whitespace (but preserve intentional newlines)
    lines = cleaned.split('\n')
    cleaned_lines = []
    for line in lines:
        # Collapse multiple spaces within a line
        cleaned_line = re.sub(r' +', ' ', line.strip())
        cleaned_lines.append(cleaned_line)

    # Remove excessive blank lines (max 2 consecutive)
    result_lines = []
    blank_count = 0
    for line in cleaned_lines:
        if not line:
            blank_count += 1
            if blank_count <= 2:
                result_lines.append(line)
        else:
            blank_count = 0
            result_lines.append(line)

    return '\n'.join(result_lines).strip()


# ══════════════════════════════════════════════
# GENERATION COUNT VALIDATION
# ══════════════════════════════════════════════

def validate_generations(max_generations) -> tuple[bool, int, str]:
    """
    Validate and normalize generation count.

    Returns:
        (is_valid, normalized_value, error_message)
    """
    try:
        max_generations = int(max_generations)
    except (TypeError, ValueError):
        return False, 7, "max_generations must be a number."

    if max_generations not in ALLOWED_GENERATIONS:
        # Snap to nearest allowed value
        closest = min(ALLOWED_GENERATIONS, key=lambda x: abs(x - max_generations))
        return True, closest, ""

    return True, max_generations, ""


# ══════════════════════════════════════════════
# SCORE THRESHOLD VALIDATION
# ══════════════════════════════════════════════

def validate_score_threshold(threshold) -> tuple[bool, float, str]:
    """
    Validate score threshold.

    Returns:
        (is_valid, normalized_value, error_message)
    """
    try:
        threshold = float(threshold)
    except (TypeError, ValueError):
        return False, 90.0, "score_threshold must be a number."

    if threshold < MIN_SCORE_THRESHOLD:
        return True, MIN_SCORE_THRESHOLD, ""

    if threshold > MAX_SCORE_THRESHOLD:
        return True, MAX_SCORE_THRESHOLD, ""

    return True, threshold, ""


# ══════════════════════════════════════════════
# SESSION ID VALIDATION
# ══════════════════════════════════════════════

def validate_session_id(session_id: str) -> tuple[bool, str]:
    """
    Validate a session ID format.

    Returns:
        (is_valid, error_message)
    """
    if not session_id or not isinstance(session_id, str):
        return False, "Session ID is required."

    # Session IDs are 16-char hex strings
    if not re.match(r'^[a-f0-9]{16}$', session_id):
        return False, "Invalid session ID format."

    return True, ""
