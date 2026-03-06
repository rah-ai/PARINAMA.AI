# ════════════════════════════════════════════════
# PARINAMA — Smart LLM Router
# 100% FREE stack: Groq → Gemini → Ollama
# Automatic fallback with logging
# ════════════════════════════════════════════════

import os
import time
import asyncio
from typing import Optional, Callable, Awaitable
from dataclasses import dataclass, field

from dotenv import load_dotenv

load_dotenv()


# ══════════════════════════════════════════════
# LLM PROVIDER CONFIGURATION
# ══════════════════════════════════════════════

@dataclass
class LLMProvider:
    """Configuration for an LLM provider."""
    name: str
    display_name: str
    badge_color: str
    model: str
    is_available: bool = True
    error_count: int = 0
    max_errors_before_skip: int = 3
    cooldown_until: float = 0.0  # timestamp


# Provider registry
PROVIDERS = {
    "groq": LLMProvider(
        name="groq",
        display_name="Groq (Llama 3.3 70B)",
        badge_color="#F97316",
        model="llama-3.3-70b-versatile",
    ),
    "gemini": LLMProvider(
        name="gemini",
        display_name="Gemini 2.0 Flash",
        badge_color="#4285F4",
        model="gemini-2.0-flash",
    ),
    "ollama": LLMProvider(
        name="ollama",
        display_name="Ollama (Mistral Local)",
        badge_color="#22C55E",
        model="mistral",
    ),
}

# Fallback order
FALLBACK_CHAIN = ["groq", "gemini", "ollama"]


# ══════════════════════════════════════════════
# SWITCH EVENT TRACKING
# ══════════════════════════════════════════════

@dataclass
class SwitchEvent:
    """Records an LLM provider switch."""
    from_llm: str
    to_llm: str
    reason: str
    timestamp: float = field(default_factory=time.time)


# Module-level state for tracking switches within a session
_switch_log: list[SwitchEvent] = []
_switch_callback: Optional[Callable] = None


def set_switch_callback(callback: Optional[Callable]) -> None:
    """Set a callback function that fires on every LLM switch."""
    global _switch_callback
    _switch_callback = callback


def get_switch_log() -> list[SwitchEvent]:
    """Get all switch events since last clear."""
    return _switch_log.copy()


def clear_switch_log() -> None:
    """Clear the switch log."""
    global _switch_log
    _switch_log = []


def reset_providers() -> None:
    """Reset all provider states (error counts, cooldowns)."""
    for provider in PROVIDERS.values():
        provider.error_count = 0
        provider.is_available = True
        provider.cooldown_until = 0.0
    clear_switch_log()


async def _record_switch(from_llm: str, to_llm: str, reason: str) -> None:
    """Record a provider switch and notify via callback."""
    event = SwitchEvent(from_llm=from_llm, to_llm=to_llm, reason=reason)
    _switch_log.append(event)
    print(f"[ROUTER] LLM SWITCH: {from_llm} → {to_llm} | Reason: {reason}")

    if _switch_callback:
        try:
            if asyncio.iscoroutinefunction(_switch_callback):
                await _switch_callback(event)
            else:
                _switch_callback(event)
        except Exception as e:
            print(f"[ROUTER] Switch callback error: {e}")


# ══════════════════════════════════════════════
# INDIVIDUAL PROVIDER CALLS
# ══════════════════════════════════════════════

async def _call_groq(prompt: str, system: str = "", max_tokens: int = 1500) -> dict:
    """Call Groq API with Llama 3.1 70B."""
    from groq import Groq

    api_key = os.getenv("GROQ_API_KEY")
    if not api_key or api_key == "your_groq_key_here":
        raise ValueError("GROQ_API_KEY not configured")

    client = Groq(api_key=api_key)

    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    # Run synchronous Groq client in thread pool to avoid blocking
    loop = asyncio.get_event_loop()
    response = await loop.run_in_executor(
        None,
        lambda: client.chat.completions.create(
            model=PROVIDERS["groq"].model,
            messages=messages,
            max_tokens=max_tokens,
            temperature=0.7,
        ),
    )

    text = response.choices[0].message.content
    if not text or not text.strip():
        raise ValueError("Groq returned empty response")

    return {
        "text": text.strip(),
        "llm_used": PROVIDERS["groq"].display_name,
        "badge_color": PROVIDERS["groq"].badge_color,
        "provider": "groq",
        "model": PROVIDERS["groq"].model,
        "tokens_used": getattr(response.usage, "total_tokens", 0),
    }


async def _call_gemini(prompt: str, system: str = "", max_tokens: int = 1500) -> dict:
    """Call Google Gemini API with Gemini 2.0 Flash."""
    import google.generativeai as genai

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key or api_key == "your_gemini_key_here":
        raise ValueError("GEMINI_API_KEY not configured")

    genai.configure(api_key=api_key)

    model = genai.GenerativeModel(
        PROVIDERS["gemini"].model,
        generation_config=genai.GenerationConfig(
            max_output_tokens=max_tokens,
            temperature=0.7,
        ),
    )

    # Combine system prompt with user prompt for Gemini
    full_prompt = f"{system}\n\n{prompt}" if system else prompt

    # Run in thread pool since the SDK is synchronous
    loop = asyncio.get_event_loop()
    response = await loop.run_in_executor(
        None,
        lambda: model.generate_content(full_prompt),
    )

    text = response.text
    if not text or not text.strip():
        raise ValueError("Gemini returned empty response")

    return {
        "text": text.strip(),
        "llm_used": PROVIDERS["gemini"].display_name,
        "badge_color": PROVIDERS["gemini"].badge_color,
        "provider": "gemini",
        "model": PROVIDERS["gemini"].model,
        "tokens_used": 0,
    }


async def _call_ollama(prompt: str, system: str = "", max_tokens: int = 1500) -> dict:
    """Call Ollama local with Mistral model."""
    import ollama as ollama_sdk

    base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")

    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    # Run in thread pool since ollama SDK is synchronous
    loop = asyncio.get_event_loop()
    response = await loop.run_in_executor(
        None,
        lambda: ollama_sdk.chat(
            model=PROVIDERS["ollama"].model,
            messages=messages,
        ),
    )

    text = response["message"]["content"]
    if not text or not text.strip():
        raise ValueError("Ollama returned empty response")

    return {
        "text": text.strip(),
        "llm_used": PROVIDERS["ollama"].display_name,
        "badge_color": PROVIDERS["ollama"].badge_color,
        "provider": "ollama",
        "model": PROVIDERS["ollama"].model,
        "tokens_used": 0,
    }


# Provider call mapping
_PROVIDER_CALLERS = {
    "groq": _call_groq,
    "gemini": _call_gemini,
    "ollama": _call_ollama,
}


# ══════════════════════════════════════════════
# SMART LLM ROUTER — MAIN ENTRY POINT
# ══════════════════════════════════════════════

async def smart_llm_router(
    prompt: str,
    system: str = "",
    max_tokens: int = 1500,
    timeout_seconds: int = 30,
) -> dict:
    """
    Route LLM requests through the fallback chain:
    Groq (fastest, free) → Gemini (powerful, free) → Ollama (local, always works)

    Automatically handles:
    - Rate limit errors
    - API failures
    - Empty responses
    - Timeouts
    - Provider cooldowns

    Args:
        prompt: The user/system prompt to send
        system: Optional system prompt
        max_tokens: Maximum tokens for response
        timeout_seconds: Timeout per provider attempt

    Returns:
        dict with keys: text, llm_used, badge_color, provider, model

    Raises:
        Exception: If ALL providers fail
    """
    errors = []
    last_provider = None

    for provider_name in FALLBACK_CHAIN:
        provider = PROVIDERS[provider_name]

        # Skip providers that have hit too many errors
        if provider.error_count >= provider.max_errors_before_skip:
            current_time = time.time()
            if current_time < provider.cooldown_until:
                print(f"[ROUTER] Skipping {provider_name} (cooldown until {provider.cooldown_until})")
                continue
            else:
                # Cooldown expired, reset and try again
                provider.error_count = 0
                provider.is_available = True

        # Attempt the call
        caller = _PROVIDER_CALLERS[provider_name]
        try:
            print(f"[ROUTER] Trying {provider.display_name}...")
            start_time = time.time()

            # Apply timeout
            result = await asyncio.wait_for(
                caller(prompt=prompt, system=system, max_tokens=max_tokens),
                timeout=timeout_seconds,
            )

            elapsed_ms = int((time.time() - start_time) * 1000)
            result["response_time_ms"] = elapsed_ms
            print(f"[ROUTER] ✓ {provider.display_name} responded in {elapsed_ms}ms")

            # Reset error count on success
            provider.error_count = 0
            provider.is_available = True

            return result

        except asyncio.TimeoutError:
            error_msg = f"Timeout after {timeout_seconds}s"
            print(f"[ROUTER] ✗ {provider.display_name}: {error_msg}")
            errors.append(f"{provider_name}: {error_msg}")
            provider.error_count += 1

        except Exception as e:
            error_msg = str(e)[:200]
            print(f"[ROUTER] ✗ {provider.display_name}: {error_msg}")
            errors.append(f"{provider_name}: {error_msg}")
            provider.error_count += 1

            # Set cooldown if too many errors
            if provider.error_count >= provider.max_errors_before_skip:
                provider.cooldown_until = time.time() + 60  # 1 minute cooldown
                provider.is_available = False
                print(f"[ROUTER] {provider_name} entering 60s cooldown")

        # Log the switch to next provider
        next_idx = FALLBACK_CHAIN.index(provider_name) + 1
        if next_idx < len(FALLBACK_CHAIN):
            next_provider = FALLBACK_CHAIN[next_idx]
            await _record_switch(
                from_llm=provider.display_name,
                to_llm=PROVIDERS[next_provider].display_name,
                reason=errors[-1] if errors else "Unknown error",
            )
            last_provider = provider_name

    # All providers failed
    all_errors = " | ".join(errors)
    raise Exception(
        f"All LLM providers failed. Errors: {all_errors}"
    )


# ══════════════════════════════════════════════
# STREAMING VARIANT (for WebSocket live feed)
# ══════════════════════════════════════════════

async def smart_llm_router_streaming(
    prompt: str,
    system: str = "",
    max_tokens: int = 1500,
    on_chunk: Optional[Callable] = None,
) -> dict:
    """
    Streaming variant of the router.
    Falls back the same way but streams chunks for the typewriter effect.
    Currently only Groq supports streaming well, others return full response.

    Args:
        prompt: The prompt to send
        system: Optional system prompt
        max_tokens: Max tokens
        on_chunk: Async callback called with each text chunk

    Returns:
        Complete response dict (same format as smart_llm_router)
    """
    # For now, use non-streaming router and simulate streaming
    # by chunking the response for the typewriter effect
    result = await smart_llm_router(
        prompt=prompt,
        system=system,
        max_tokens=max_tokens,
    )

    # If we have a chunk callback, stream the text character by character
    if on_chunk and result.get("text"):
        text = result["text"]
        chunk_size = 3  # Send 3 characters at a time for smoother streaming
        for i in range(0, len(text), chunk_size):
            chunk = text[i:i + chunk_size]
            if asyncio.iscoroutinefunction(on_chunk):
                await on_chunk(chunk)
            else:
                on_chunk(chunk)
            await asyncio.sleep(0.02)  # 20ms between chunks for typewriter effect

    return result


# ══════════════════════════════════════════════
# HEALTH CHECK
# ══════════════════════════════════════════════

async def check_provider_health() -> dict:
    """Check which LLM providers are currently available."""
    health = {}

    for provider_name in FALLBACK_CHAIN:
        provider = PROVIDERS[provider_name]
        try:
            caller = _PROVIDER_CALLERS[provider_name]
            result = await asyncio.wait_for(
                caller(prompt="Say hello in exactly 3 words.", system="", max_tokens=20),
                timeout=10,
            )
            health[provider_name] = {
                "status": "healthy",
                "display_name": provider.display_name,
                "badge_color": provider.badge_color,
                "response": result.get("text", "")[:50],
            }
        except Exception as e:
            health[provider_name] = {
                "status": "unavailable",
                "display_name": provider.display_name,
                "badge_color": provider.badge_color,
                "error": str(e)[:100],
            }

    return health


async def get_active_provider() -> Optional[str]:
    """Get the name of the first available provider."""
    for provider_name in FALLBACK_CHAIN:
        provider = PROVIDERS[provider_name]
        if provider.is_available and provider.error_count < provider.max_errors_before_skip:
            return provider_name
    return None
