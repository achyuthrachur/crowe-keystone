"""
Agents router — HTTP endpoints for running and monitoring LangGraph agent workflows.

Endpoints:
  POST   /agents/run              — create and start a new agent run
  GET    /agents/run/{run_id}     — get current status and output of a run
  POST   /agents/run/{run_id}/respond — respond to a human checkpoint

Background task:
  _run_graph_task() — invokes the LangGraph graph, updates agent_run record,
  broadcasts SSE events for agent.started, agent.completed, agent.failed.

Human checkpoint resume (Phase 5 stub):
  Full LangGraph resume requires calling graph.aupdate_state() + graph.astream()
  against the PostgresSaver checkpointer. In Phase 5 we update the agent_run
  record's graph_state and status so the frontend sees the response. Full
  LangGraph-native resume is wired in Phase 6 when the checkpointer is integrated
  end-to-end with the agents router.
"""

import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.models.agent_run import AgentRun
from src.models.user import User
from src.routers.auth import get_current_user
from src.state import KeystoneState

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/agents", tags=["agents"])


# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------


class RunAgentRequest(BaseModel):
    agent_type: str
    engagement_id: str | None = None
    input_data: dict = {}


class RunAgentResponse(BaseModel):
    run_id: str
    status: str


class AgentRunResponse(BaseModel):
    run_id: str
    status: str
    agent_type: str
    output_summary: str | None
    tokens_used: int | None
    error: str | None
    created_at: datetime
    completed_at: datetime | None


class RespondToCheckpointRequest(BaseModel):
    answer: str


class RespondToCheckpointResponse(BaseModel):
    run_id: str
    status: str


# ---------------------------------------------------------------------------
# Graph routing helper
# ---------------------------------------------------------------------------

_VALID_AGENT_TYPES: set[str] = {"keystone_pipeline"}


def _select_graph(agent_type: str):
    """
    Returns the appropriate compiled LangGraph graph for the given agent_type.
    _VALID_AGENT_TYPES is empty — Phase C will define Debrief graphs and refill it.
    """
    raise NotImplementedError(
        f"No graph defined for agent_type '{agent_type}'. "
        "Phase C will implement Debrief graphs and refill _VALID_AGENT_TYPES."
    )


# ---------------------------------------------------------------------------
# Background graph execution task
# ---------------------------------------------------------------------------


async def _run_graph_task(
    run_id: str,
    graph: Any,
    initial_state: KeystoneState,
    team_id: str,
    db_url: str,
) -> None:
    """
    Runs a LangGraph graph and updates the agent_run record on completion.

    Called as a FastAPI BackgroundTask — must not raise exceptions.
    """
    from src.database import AsyncSessionLocal
    from src.routers.stream import broadcast_to_team

    start_ts = datetime.now(tz=timezone.utc)

    try:
        # ── Invoke the graph ─────────────────────────────────────────────────
        result: dict = await graph.ainvoke(initial_state)

        run_status = result.get("status", "complete")
        if run_status not in ("complete", "failed", "awaiting_human"):
            run_status = "complete"

        output_summary = (
            str(result.get("brief") or result.get("prd_draft") or
                result.get("detected_conflicts") or result.get("brief_sections") or
                result.get("approval_context_summary") or "")
        )[:500]

        duration_ms = int(
            (datetime.now(tz=timezone.utc) - start_ts).total_seconds() * 1000
        )

        # ── Persist result ───────────────────────────────────────────────────
        async with AsyncSessionLocal() as db:
            await db.execute(
                update(AgentRun)
                .where(AgentRun.id == uuid.UUID(run_id))
                .values(
                    status=run_status,
                    output_summary=output_summary[:500] if output_summary else None,
                    graph_state=result,
                    duration_ms=duration_ms,
                    completed_at=datetime.now(tz=timezone.utc),
                    error=(
                        "; ".join(result.get("errors", []))[:1000]
                        if result.get("errors")
                        else None
                    ),
                )
            )
            await db.commit()

        # ── Broadcast completion ─────────────────────────────────────────────
        await broadcast_to_team(
            team_id,
            {
                "type": "agent.completed",
                "data": {
                    "run_id": run_id,
                    "status": run_status,
                    "output_summary": output_summary[:200],
                    "tokens_used": 0,  # Phase 7: wire token counting
                    "duration_ms": duration_ms,
                },
            },
        )

    except BaseException as exc:
        logger.exception("_run_graph_task failed for run_id=%s: %s", run_id, str(exc))

        async with AsyncSessionLocal() as db:
            await db.execute(
                update(AgentRun)
                .where(AgentRun.id == uuid.UUID(run_id))
                .values(
                    status="failed",
                    error=str(exc)[:1000],
                    completed_at=datetime.now(tz=timezone.utc),
                )
            )
            await db.commit()

        try:
            from src.routers.stream import broadcast_to_team
            await broadcast_to_team(
                team_id,
                {
                    "type": "agent.failed",
                    "data": {"run_id": run_id, "error": str(exc)[:200]},
                },
            )
        except Exception:
            pass


# ---------------------------------------------------------------------------
# POST /agents/run — create and start a new agent run
# ---------------------------------------------------------------------------


@router.post(
    "/run",
    response_model=RunAgentResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Start a new agent run",
)
async def create_agent_run(
    payload: RunAgentRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> RunAgentResponse:
    """
    Creates an agent_run record with status='running' and immediately
    returns {run_id, status: 'running'}. The graph is executed as a
    FastAPI background task.

    Broadcasts agent.started SSE before returning.
    """
    if payload.agent_type not in _VALID_AGENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Unknown agent_type '{payload.agent_type}'. "
                   f"Valid types: {sorted(_VALID_AGENT_TYPES)}",
        )

    team_id = str(current_user.team_id)
    user_id = str(current_user.id)
    run_id = str(uuid.uuid4())

    # ── Persist the run record ─────────────────────────────────────────────
    input_summary = payload.input_data.get("raw_input", "")[:200] or payload.agent_type

    agent_run = AgentRun(
        id=uuid.UUID(run_id),
        team_id=uuid.UUID(team_id),
        agent_type=payload.agent_type,
        project_id=None,
        triggered_by=uuid.UUID(user_id),
        trigger_event="api_request",
        input_summary=input_summary,
        status="running",
    )
    db.add(agent_run)
    await db.commit()

    # ── Build initial LangGraph state ──────────────────────────────────────
    initial_state: KeystoneState = {
        "run_id": run_id,
        "engagement_id": payload.input_data.get("engagement_id", ""),
        "team_id": team_id,
        "triggered_by": user_id,
        "client_name": payload.input_data.get("client_name", ""),
        "client_industry": payload.input_data.get("client_industry", ""),
        "transcript_storage_key": payload.input_data.get("transcript_storage_key", ""),
        "preread_storage_key": payload.input_data.get("preread_storage_key"),
        "agenda_storage_key": payload.input_data.get("agenda_storage_key"),
        "clean_transcript": "",
        "filtered_transcript": "",
        "removed_segments": [],
        "gate1_approved": False,
        "gate1_restored_segments": [],
        "client_context_profile": {},
        "acronym_glossary": [],
        "disambiguated_transcript": "",
        "unresolved_terms": [],
        "gate2_approved": False,
        "final_glossary": [],
        "content_outline": None,
        "gate3_approved": False,
        "final_outline": None,
        "deck_brief_storage_key": None,
        "deck_handoff_storage_key": None,
        "current_node": "transcript_ingester",
        "errors": [],
        "status": "running",
    }

    # ── Select graph ───────────────────────────────────────────────────────
    graph = _select_graph(payload.agent_type)

    # ── Broadcast agent.started ────────────────────────────────────────────
    try:
        from src.routers.stream import broadcast_to_team
        await broadcast_to_team(
            team_id,
            {
                "type": "agent.started",
                "data": {
                    "run_id": run_id,
                    "agent_type": payload.agent_type,
                    "engagement_id": payload.engagement_id,
                },
            },
        )
    except Exception as e:
        logger.warning("agents/run: failed to broadcast agent.started: %s", str(e))

    # ── Launch background task ─────────────────────────────────────────────
    from src.config import settings
    background_tasks.add_task(
        _run_graph_task,
        run_id=run_id,
        graph=graph,
        initial_state=initial_state,
        team_id=team_id,
        db_url=settings.DATABASE_URL,
    )

    return RunAgentResponse(run_id=run_id, status="running")


# ---------------------------------------------------------------------------
# GET /agents/run/{run_id} — poll for status and output
# ---------------------------------------------------------------------------


@router.get(
    "/run/{run_id}",
    response_model=AgentRunResponse,
    summary="Get agent run status and output",
)
async def get_agent_run(
    run_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AgentRunResponse:
    """
    Returns the current status, output summary, token usage, and error
    for the requested run_id.

    Enforces team-level access: the run must belong to the caller's team.
    """
    try:
        run_uuid = uuid.UUID(run_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="run_id must be a valid UUID",
        )

    result = await db.execute(
        select(AgentRun).where(AgentRun.id == run_uuid)
    )
    agent_run: AgentRun | None = result.scalar_one_or_none()

    if agent_run is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Agent run {run_id} not found",
        )

    if str(agent_run.team_id) != str(current_user.team_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this agent run",
        )

    return AgentRunResponse(
        run_id=str(agent_run.id),
        status=agent_run.status,
        agent_type=agent_run.agent_type,
        output_summary=agent_run.output_summary,
        tokens_used=agent_run.tokens_used,
        error=agent_run.error,
        created_at=agent_run.created_at,
        completed_at=agent_run.completed_at,
    )


# ---------------------------------------------------------------------------
# POST /agents/run/{run_id}/respond — respond to a human checkpoint
# ---------------------------------------------------------------------------


@router.post(
    "/run/{run_id}/respond",
    response_model=RespondToCheckpointResponse,
    summary="Respond to a human checkpoint",
)
async def respond_to_checkpoint(
    run_id: str,
    payload: RespondToCheckpointRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> RespondToCheckpointResponse:
    """
    Submits a human response to a paused agent run.

    Phase 5 implementation:
      - Validates the run is in 'awaiting_human' status.
      - Updates graph_state.checkpoint_response with the answer.
      - Sets status back to 'running'.
      - Re-launches the graph with the updated state as a background task.

    Full LangGraph native resume (graph.aupdate_state + graph.astream with
    PostgresSaver) is wired in Phase 6 when the checkpointer is fully integrated.
    """
    try:
        run_uuid = uuid.UUID(run_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="run_id must be a valid UUID",
        )

    result = await db.execute(
        select(AgentRun).where(AgentRun.id == run_uuid)
    )
    agent_run: AgentRun | None = result.scalar_one_or_none()

    if agent_run is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Agent run {run_id} not found",
        )

    if str(agent_run.team_id) != str(current_user.team_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this agent run",
        )

    if agent_run.status != "awaiting_human":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Run {run_id} is not awaiting a human response (status: {agent_run.status})",
        )

    # ── Update graph_state with the checkpoint response ────────────────────
    existing_graph_state: dict = agent_run.graph_state or {}
    updated_graph_state = {
        **existing_graph_state,
        "checkpoint_response": payload.answer,
        "status": "running",
    }

    await db.execute(
        update(AgentRun)
        .where(AgentRun.id == run_uuid)
        .values(
            status="running",
            graph_state=updated_graph_state,
        )
    )
    await db.commit()

    # ── Re-launch the graph from the updated state ─────────────────────────
    # NOTE (Phase 6): Replace this block with graph.aupdate_state() +
    # graph.astream(None, config=config) using the PostgresSaver thread_id
    # stored in graph_state["run_id"] so LangGraph resumes from the exact
    # checkpoint rather than re-running from the start.
    graph = _select_graph(agent_run.agent_type)

    from src.config import settings
    background_tasks.add_task(
        _run_graph_task,
        run_id=run_id,
        graph=graph,
        initial_state=updated_graph_state,  # type: ignore[arg-type]
        team_id=str(agent_run.team_id),
        db_url=settings.DATABASE_URL,
    )

    # ── Broadcast resumed ──────────────────────────────────────────────────
    try:
        from src.routers.stream import broadcast_to_team
        await broadcast_to_team(
            str(agent_run.team_id),
            {
                "type": "agent.started",
                "data": {
                    "run_id": run_id,
                    "agent_type": agent_run.agent_type,
                    "resumed": True,
                },
            },
        )
    except Exception as e:
        logger.warning("respond_to_checkpoint: failed to broadcast agent.started: %s", str(e))

    return RespondToCheckpointResponse(run_id=run_id, status="running")
