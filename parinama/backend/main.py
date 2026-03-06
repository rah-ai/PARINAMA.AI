# ════════════════════════════════════════════════
# PARINAMA — Main Application Entry Point
# परिणाम — Transformation through iteration
# Self-Evolving Prompt Optimization Engine
# ════════════════════════════════════════════════

import os
import sys
import time

from contextlib import asynccontextmanager

from dotenv import load_dotenv

# Load environment variables before anything else
load_dotenv()

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from database.models import init_db
from api.routes import api_router
from api.websocket import ws_router


# ══════════════════════════════════════════════
# APP CONFIGURATION
# ══════════════════════════════════════════════

APP_HOST = os.getenv("APP_HOST", "0.0.0.0")
APP_PORT = int(os.getenv("APP_PORT", 8000))
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
RATE_LIMIT = os.getenv("RATE_LIMIT", "10/hour")


# ══════════════════════════════════════════════
# RATE LIMITER
# ══════════════════════════════════════════════

limiter = Limiter(key_func=get_remote_address)


# ══════════════════════════════════════════════
# LIFESPAN — Startup & Shutdown
# ══════════════════════════════════════════════

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    # ── STARTUP ───────────────────────────────
    print()
    print("═" * 56)
    print("  PARINAMA — Self-Evolving Prompt Optimization Engine")
    print("  परिणाम — Transformation through iteration")
    print("═" * 56)
    print()

    # Initialize database
    print("[STARTUP] Initializing database...")
    await init_db()
    print("[STARTUP] Database ready ✓")

    # Check LLM providers
    print("[STARTUP] Checking LLM providers...")
    _check_env_keys()

    print()
    print(f"[STARTUP] Server running at http://{APP_HOST}:{APP_PORT}")
    print(f"[STARTUP] Frontend expected at {FRONTEND_URL}")
    print(f"[STARTUP] WebSocket endpoint: ws://localhost:{APP_PORT}/ws/evolve")
    print(f"[STARTUP] API docs: http://localhost:{APP_PORT}/docs")
    print()
    print("═" * 56)
    print()

    yield

    # ── SHUTDOWN ──────────────────────────────
    print()
    print("[SHUTDOWN] Parinama shutting down...")
    print("[SHUTDOWN] Goodbye. परिणाम 🙏")
    print()


def _check_env_keys():
    """Check which API keys are configured."""
    groq_key = os.getenv("GROQ_API_KEY", "")
    gemini_key = os.getenv("GEMINI_API_KEY", "")
    ollama_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")

    if groq_key and groq_key != "your_groq_key_here":
        print("[STARTUP]   ✓ Groq API key configured (PRIMARY)")
    else:
        print("[STARTUP]   ✗ Groq API key NOT configured")

    if gemini_key and gemini_key != "your_gemini_key_here":
        print("[STARTUP]   ✓ Gemini API key configured (FALLBACK 1)")
    else:
        print("[STARTUP]   ✗ Gemini API key NOT configured")

    print(f"[STARTUP]   ✓ Ollama endpoint: {ollama_url} (FALLBACK 2)")


# ══════════════════════════════════════════════
# CREATE APPLICATION
# ══════════════════════════════════════════════

app = FastAPI(
    title="PARINAMA",
    description="परिणाम — A Self-Evolving Prompt Optimization Engine. "
                "Takes any prompt and evolves it across multiple generations "
                "using a genetic algorithm approach until it reaches peak quality.",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)


# ══════════════════════════════════════════════
# MIDDLEWARE
# ══════════════════════════════════════════════

# ── CORS ──────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        FRONTEND_URL,
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Rate Limiter ──────────────────────────────
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


# ── Request Timing Middleware ─────────────────
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    """Add X-Process-Time header to all responses."""
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = f"{process_time:.4f}"
    return response


# ══════════════════════════════════════════════
# REGISTER ROUTERS
# ══════════════════════════════════════════════

# REST API routes
app.include_router(api_router)

# WebSocket routes
app.include_router(ws_router)


# ══════════════════════════════════════════════
# ROOT ENDPOINT
# ══════════════════════════════════════════════

@app.get("/")
async def root():
    """Root endpoint — app info."""
    return {
        "app": "PARINAMA",
        "tagline": "परिणाम — Transformation through iteration",
        "description": "A Self-Evolving Prompt Optimization Engine",
        "version": "1.0.0",
        "docs": "/docs",
        "api": "/api",
        "websocket": "/ws/evolve",
        "health": "/api/health",
    }


# ══════════════════════════════════════════════
# GLOBAL ERROR HANDLER
# ══════════════════════════════════════════════

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch-all error handler for unhandled exceptions."""
    print(f"[ERROR] Unhandled exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "message": str(exc) if os.getenv("DEBUG", "false").lower() == "true" else "An unexpected error occurred",
        },
    )


# ══════════════════════════════════════════════
# RUN WITH UVICORN
# ══════════════════════════════════════════════

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host=APP_HOST,
        port=APP_PORT,
        reload=True,
        log_level="info",
        ws="websockets",
    )
