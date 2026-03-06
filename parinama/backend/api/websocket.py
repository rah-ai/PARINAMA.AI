# ════════════════════════════════════════════════
# PARINAMA — WebSocket Handler
# Real-time evolution streaming to frontend
# ════════════════════════════════════════════════

import json
import time
import asyncio
from typing import Optional

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from starlette.websockets import WebSocketState

from core.generator import start_evolution, EvolutionSessionManager
from utils.validator import validate_prompt, validate_generations


# ══════════════════════════════════════════════
# WEBSOCKET ROUTER
# ══════════════════════════════════════════════

ws_router = APIRouter()


# ══════════════════════════════════════════════
# ACTIVE CONNECTIONS TRACKER
# ══════════════════════════════════════════════

class ConnectionManager:
    """Tracks active WebSocket connections and running sessions."""

    def __init__(self):
        self.active_connections: dict[str, WebSocket] = {}
        self.active_sessions: dict[str, EvolutionSessionManager] = {}

    async def connect(self, websocket: WebSocket, client_id: str) -> None:
        """Accept and register a new connection."""
        await websocket.accept()
        self.active_connections[client_id] = websocket
        print(f"[WS] Client connected: {client_id} | Total: {len(self.active_connections)}")

    def disconnect(self, client_id: str) -> None:
        """Remove a connection and cancel any running session."""
        self.active_connections.pop(client_id, None)

        # Cancel running evolution if any
        session_manager = self.active_sessions.pop(client_id, None)
        if session_manager:
            session_manager.cancel()
            print(f"[WS] Cancelled evolution for client: {client_id}")

        print(f"[WS] Client disconnected: {client_id} | Total: {len(self.active_connections)}")

    async def send_to(self, client_id: str, message: str) -> None:
        """Send a message to a specific client."""
        ws = self.active_connections.get(client_id)
        if ws and ws.client_state == WebSocketState.CONNECTED:
            try:
                await ws.send_text(message)
            except Exception as e:
                print(f"[WS] Send error to {client_id}: {e}")
                self.disconnect(client_id)

    async def broadcast(self, message: str) -> None:
        """Send a message to all connected clients."""
        disconnected = []
        for client_id, ws in self.active_connections.items():
            try:
                if ws.client_state == WebSocketState.CONNECTED:
                    await ws.send_text(message)
            except Exception:
                disconnected.append(client_id)

        for client_id in disconnected:
            self.disconnect(client_id)

    @property
    def connection_count(self) -> int:
        return len(self.active_connections)


# Global connection manager
manager = ConnectionManager()


# ══════════════════════════════════════════════
# HELPER: Build WebSocket sender
# ══════════════════════════════════════════════

def create_ws_sender(client_id: str):
    """Create an async sender function bound to a specific client."""
    async def ws_send(message: str) -> None:
        await manager.send_to(client_id, message)
    return ws_send


# ══════════════════════════════════════════════
# HELPER: Send structured event
# ══════════════════════════════════════════════

async def send_event(client_id: str, event: str, data: dict) -> None:
    """Send a structured JSON event to a client."""
    message = json.dumps({
        "event": event,
        "data": data,
        "timestamp": time.time(),
    })
    await manager.send_to(client_id, message)


# ══════════════════════════════════════════════
# MAIN WEBSOCKET ENDPOINT
# ══════════════════════════════════════════════

@ws_router.websocket("/ws/evolve")
async def websocket_evolve(websocket: WebSocket):
    """
    Main WebSocket endpoint for prompt evolution.

    CLIENT → SERVER messages:
    {
        "action": "start_evolution",
        "prompt": "user's prompt text",
        "max_generations": 5,        // optional, default 7
        "score_threshold": 90.0      // optional, default 90
    }

    {
        "action": "cancel_evolution"
    }

    {
        "action": "ping"
    }

    SERVER → CLIENT events:
    - evolution_started
    - generation_begin
    - scoring_complete
    - mutation_selected
    - new_prompt_chunk
    - new_prompt_complete
    - evolution_complete
    - llm_switched
    - evolution_error
    - connection_established
    - pong
    """
    # Generate a unique client ID
    client_id = f"client_{int(time.time() * 1000)}"

    # Accept connection
    await manager.connect(websocket, client_id)

    # Send connection confirmation
    await send_event(client_id, "connection_established", {
        "client_id": client_id,
        "message": "Connected to Parinama evolution engine",
        "active_connections": manager.connection_count,
    })

    try:
        # Listen for messages
        while True:
            try:
                raw_message = await websocket.receive_text()
            except WebSocketDisconnect:
                break

            # Parse incoming message
            try:
                message = json.loads(raw_message)
            except json.JSONDecodeError:
                await send_event(client_id, "error", {
                    "message": "Invalid JSON message",
                })
                continue

            action = message.get("action", "")

            # ── Handle: ping ──────────────────
            if action == "ping":
                await send_event(client_id, "pong", {
                    "timestamp": time.time(),
                })

            # ── Handle: start_evolution ────────
            elif action == "start_evolution":
                await _handle_start_evolution(client_id, message)

            # ── Handle: cancel_evolution ───────
            elif action == "cancel_evolution":
                await _handle_cancel_evolution(client_id)

            # ── Handle: unknown action ────────
            else:
                await send_event(client_id, "error", {
                    "message": f"Unknown action: {action}",
                })

    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"[WS] Unexpected error for {client_id}: {e}")
    finally:
        manager.disconnect(client_id)


# ══════════════════════════════════════════════
# ACTION HANDLERS
# ══════════════════════════════════════════════

async def _handle_start_evolution(client_id: str, message: dict) -> None:
    """Handle the start_evolution action."""
    prompt = message.get("prompt", "").strip()
    max_generations = message.get("max_generations", 7)
    score_threshold = message.get("score_threshold", 90.0)

    # ── Validate prompt ───────────────────────
    is_valid, error_msg = validate_prompt(prompt)
    if not is_valid:
        await send_event(client_id, "evolution_error", {
            "message": error_msg,
            "generation_num": 0,
        })
        return

    # ── Validate generations ──────────────────
    is_valid, max_generations, error_msg = validate_generations(max_generations)
    if not is_valid:
        await send_event(client_id, "evolution_error", {
            "message": error_msg,
            "generation_num": 0,
        })
        return

    # ── Check for existing running session ────
    if client_id in manager.active_sessions:
        await send_event(client_id, "evolution_error", {
            "message": "An evolution is already in progress. Cancel it first.",
            "generation_num": 0,
        })
        return

    # ── Create session manager ────────────────
    ws_sender = create_ws_sender(client_id)
    session_manager = EvolutionSessionManager(
        original_prompt=prompt,
        max_generations=max_generations,
        score_threshold=score_threshold,
        ws_send=ws_sender,
    )

    manager.active_sessions[client_id] = session_manager

    # ── Run evolution in background task ──────
    asyncio.create_task(
        _run_evolution_task(client_id, session_manager)
    )


async def _run_evolution_task(
    client_id: str,
    session_manager: EvolutionSessionManager,
) -> None:
    """Run the evolution as a background task."""
    try:
        result = await session_manager.run()

        # Evolution complete — result already sent via WebSocket callbacks
        print(
            f"[WS] Evolution complete for {client_id} | "
            f"Session: {result.get('session_id', 'N/A')} | "
            f"Score: {result.get('best_score', 0)} | "
            f"Generations: {result.get('total_generations', 0)}"
        )

    except Exception as e:
        print(f"[WS] Evolution task error for {client_id}: {e}")
        await send_event(client_id, "evolution_error", {
            "message": f"Evolution failed: {str(e)}",
            "generation_num": 0,
        })

    finally:
        # Clean up session from active sessions
        manager.active_sessions.pop(client_id, None)


async def _handle_cancel_evolution(client_id: str) -> None:
    """Handle the cancel_evolution action."""
    session_manager = manager.active_sessions.pop(client_id, None)

    if session_manager:
        session_manager.cancel()
        await send_event(client_id, "evolution_cancelled", {
            "message": "Evolution cancelled by user",
            "session_id": session_manager.session_id,
        })
    else:
        await send_event(client_id, "error", {
            "message": "No active evolution to cancel",
        })


# ══════════════════════════════════════════════
# STATUS ENDPOINT (non-WebSocket, for health)
# ══════════════════════════════════════════════

@ws_router.get("/ws/status")
async def websocket_status():
    """Get WebSocket connection status."""
    return {
        "active_connections": manager.connection_count,
        "active_evolutions": len(manager.active_sessions),
        "status": "operational",
    }
