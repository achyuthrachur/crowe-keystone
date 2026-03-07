"""
SSE (Server-Sent Events) router.

Phase 1: Accepts connections, sends initial 'connected' handshake, then heartbeats only.
Phase 2+: broadcast_to_team() will be called by all services to push real events.

IMPORTANT: This module maintains in-memory team queues.
The server MUST run with --workers 1 (single uvicorn worker).
Phase 9+: migrate to Redis pub/sub if horizontal scaling is needed.
"""

import asyncio
import json
import logging

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

from src.models.user import User
from src.routers.auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(tags=["stream"])

# ---------------------------------------------------------------------------
# In-memory team queues.
# One asyncio.Queue per team_id — all users on the same team share a queue
# so broadcasts reach every connected client on the team simultaneously.
# ---------------------------------------------------------------------------
_team_queues: dict[str, list[asyncio.Queue]] = {}
_queue_lock = asyncio.Lock()


async def _get_team_queues(team_id: str) -> list[asyncio.Queue]:
    """Return the list of subscriber queues for a team."""
    return _team_queues.get(team_id, [])


async def broadcast_to_team(team_id: str, event: dict) -> None:
    """Broadcast an event dict to every connected client on a team.

    Called by all services and agent nodes when something changes.
    Safe to call even when no clients are connected (no-op in that case).
    """
    queues = _team_queues.get(str(team_id), [])
    if not queues:
        return

    serialized = json.dumps(event)
    dead: list[asyncio.Queue] = []

    for q in queues:
        try:
            q.put_nowait(serialized)
        except asyncio.QueueFull:
            logger.warning("SSE queue full for team %s — dropping event", team_id)
        except Exception as exc:
            logger.error("Error broadcasting to team %s: %s", team_id, exc)
            dead.append(q)

    # Prune dead queues
    if dead:
        async with _queue_lock:
            current = _team_queues.get(str(team_id), [])
            _team_queues[str(team_id)] = [q for q in current if q not in dead]


async def _event_generator(team_id: str, user_id: str):
    """Async generator that yields SSE-formatted strings.

    Emits:
    - Immediate 'connected' handshake on connect
    - Real events pushed via broadcast_to_team()
    - Heartbeat comment (': heartbeat') every 25s to keep proxies alive
    """
    queue: asyncio.Queue = asyncio.Queue(maxsize=100)

    # Register queue for this team
    async with _queue_lock:
        if team_id not in _team_queues:
            _team_queues[team_id] = []
        _team_queues[team_id].append(queue)

    logger.info("SSE client connected: user=%s team=%s", user_id, team_id)

    try:
        # Initial handshake event
        handshake = json.dumps({"type": "connected", "data": {"user_id": user_id}})
        yield f"data: {handshake}\n\n"

        while True:
            try:
                # Wait up to 25 seconds for an event; send heartbeat on timeout
                serialized = await asyncio.wait_for(queue.get(), timeout=25.0)
                yield f"data: {serialized}\n\n"
            except asyncio.TimeoutError:
                # Heartbeat comment — not a data event, just keeps the connection alive
                yield ": heartbeat\n\n"
            except GeneratorExit:
                break
    finally:
        # Deregister queue on disconnect
        async with _queue_lock:
            team_list = _team_queues.get(team_id, [])
            if queue in team_list:
                team_list.remove(queue)
            if not team_list and team_id in _team_queues:
                del _team_queues[team_id]

        logger.info("SSE client disconnected: user=%s team=%s", user_id, team_id)


@router.get(
    "/stream",
    summary="SSE stream — persistent connection for real-time team events",
    response_class=StreamingResponse,
)
async def stream(
    current_user: User = Depends(get_current_user),
) -> StreamingResponse:
    team_id = str(current_user.team_id) if current_user.team_id else f"no-team-{current_user.id}"
    user_id = str(current_user.id)

    return StreamingResponse(
        _event_generator(team_id=team_id, user_id=user_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
        },
    )
