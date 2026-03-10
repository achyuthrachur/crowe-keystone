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
    project_id: str | None = None
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

_VALID_AGENT_TYPES = {
    "brief_generator",
    "prd_drafter",
    "stress_tester",
    "conflict_detector",
    "daily_brief_generator",
    "update_writer",
    "approval_router",
    "retro_generator",
    "memory_indexer",
}


def _select_graph(agent_type: str):
    """
    Returns the appropriate compiled LangGraph graph for the given agent_type.
    Import is deferred to avoid circular imports and to keep startup fast.
    """
    from src.graph.keystone_graph import (
        build_conflict_detector_graph,
        build_daily_brief_graph,
        build_prd_architect_graph,
        build_approval_routing_graph,
    )
    from src.config import settings

    if agent_type in ("brief_generator", "prd_drafter", "stress_tester"):
        return build_prd_architect_graph(database_url=settings.DATABASE_URL_SYNC)

    if agent_type == "conflict_detector":
        return build_conflict_detector_graph()

    if agent_type == "daily_brief_generator":
        return build_daily_brief_graph()

    if agent_type == "approval_router":
        return build_approval_routing_graph()

    # retro_generator: generate retrospective, then persist to retrospectives table
    if agent_type == "retro_generator":
        from src.graph.nodes.retro_generator import retro_generator_node
        from src.graph.nodes.retro_persister import retro_persister_node
        from langgraph.graph import StateGraph, END
        g = StateGraph(KeystoneState)
        g.add_node("retro_generator", retro_generator_node)
        g.add_node("retro_persister", retro_persister_node)
        g.set_entry_point("retro_generator")
        g.add_edge("retro_generator", "retro_persister")
        g.add_edge("retro_persister", END)
        return g.compile()

    # memory_indexer: index published retrospective into team memory
    if agent_type == "memory_indexer":
        from src.graph.nodes.memory_indexer import memory_indexer_node
        from langgraph.graph import StateGraph, END
        g = StateGraph(KeystoneState)
        g.add_node("memory_indexer", memory_indexer_node)
        g.set_entry_point("memory_indexer")
        g.add_edge("memory_indexer", END)
        return g.compile()

    # update_writer: generate structured update, then persist to project.build_log
    from src.graph.nodes.update_writer import update_writer_node
    from src.graph.nodes.build_log_persister import build_log_persister_node
    from langgraph.graph import StateGraph, END
    g = StateGraph(KeystoneState)
    g.add_node("update_writer", update_writer_node)
    g.add_node("build_log_persister", build_log_persister_node)
    g.set_entry_point("update_writer")
    g.add_edge("update_writer", "build_log_persister")
    g.add_edge("build_log_persister", END)
    return g.compile()


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
        project_id=uuid.UUID(payload.project_id) if payload.project_id else None,
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
        "agent_type": payload.agent_type,
        "project_id": payload.project_id,
        "team_id": team_id,
        "triggered_by": user_id,
        "raw_input": payload.input_data.get("raw_input", ""),
        "input_type": payload.input_data.get("input_type", "spark"),
        "context": payload.input_data.get("context", {}),
        "brief": None,
        "prd_draft": None,
        "prd_version": 1,
        "hypotheses": [],
        "adversarial_findings": [],
        "assumption_audit": [],
        "stress_test_confidence": 0.0,
        "all_project_states": payload.input_data.get("all_project_states", []),
        "detected_conflicts": [],
        "approval_type": payload.input_data.get("approval_type"),
        "approval_chain": [],
        "approval_context_summary": "",
        "raw_build_notes": payload.input_data.get("raw_build_notes"),
        "structured_update": None,
        "user_id": payload.input_data.get("user_id", user_id),
        "brief_sections": None,
        "memory_entries": [],
        "similar_prior_projects": [],
        "human_checkpoint_needed": False,
        "checkpoint_question": None,
        "checkpoint_response": None,
        "quality_score": 0.0,
        "loop_count": 0,
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
                    "project_id": payload.project_id,
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
