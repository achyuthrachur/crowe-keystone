"""
Daily Brief router.

GET /daily — returns today's brief for the current user, or triggers generation if missing.

The brief is stored in agent_runs table as agent_type='daily_brief_generator'.
In Phase 7 a dedicated daily_briefs table and per-user timezone scheduling are added.
"""

import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.models.agent_run import AgentRun
from src.models.user import User
from src.routers.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/daily", tags=["daily"])


@router.get(
    "",
    status_code=200,
    summary="Get today's daily brief for the current user, or trigger generation",
)
async def get_daily_brief(
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Returns the most recent daily brief for the current user.
    If none exists today, triggers generation and returns an empty brief stub
    so the frontend can poll or listen via SSE for the completed event.
    """
    team_id = current_user.team_id
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)

    # Look for a completed daily brief run from today
    result = await db.execute(
        select(AgentRun)
        .where(
            AgentRun.team_id == team_id,
            AgentRun.agent_type == "daily_brief_generator",
            AgentRun.status == "complete",
            AgentRun.created_at >= today_start,
        )
        .order_by(AgentRun.created_at.desc())
        .limit(1)
    )
    run = result.scalar_one_or_none()

    if run and run.graph_state:
        brief_sections = run.graph_state.get("brief_sections") or {}
        return {
            "status": "ready",
            "generated_at": run.completed_at.isoformat() if run.completed_at else None,
            "brief": brief_sections,
        }

    # No brief today — trigger generation as background task
    run_id = str(uuid.uuid4())
    from src.models.agent_run import AgentRun as AR
    agent_run = AR(
        id=uuid.UUID(run_id),
        team_id=team_id,
        agent_type="daily_brief_generator",
        triggered_by=current_user.id,
        trigger_event="api_request",
        input_summary="Daily brief on-demand",
        status="running",
    )
    db.add(agent_run)
    await db.commit()

    from src.state import KeystoneState
    from src.config import settings
    from src.routers.agents import _run_graph_task, _select_graph

    initial_state: KeystoneState = {
        "run_id": run_id,
        "agent_type": "daily_brief_generator",
        "project_id": None,
        "team_id": str(team_id) if team_id else "",
        "triggered_by": str(current_user.id),
        "user_id": str(current_user.id),
        "raw_input": "",
        "input_type": "data",
        "context": {},
        "brief": None, "prd_draft": None, "prd_version": 1,
        "hypotheses": [], "adversarial_findings": [], "assumption_audit": [],
        "stress_test_confidence": 0.0, "all_project_states": [],
        "detected_conflicts": [], "approval_type": None,
        "approval_chain": [], "approval_context_summary": "",
        "raw_build_notes": None, "structured_update": None,
        "brief_sections": None, "memory_entries": [], "similar_prior_projects": [],
        "human_checkpoint_needed": False, "checkpoint_question": None,
        "checkpoint_response": None, "quality_score": 0.0,
        "loop_count": 0, "errors": [], "status": "running",
    }

    graph = _select_graph("daily_brief_generator")
    background_tasks.add_task(
        _run_graph_task,
        run_id=run_id,
        graph=graph,
        initial_state=initial_state,
        team_id=str(team_id) if team_id else "",
        db_url=settings.DATABASE_URL,
    )

    return {
        "status": "generating",
        "run_id": run_id,
        "brief": {
            "active_work": [],
            "waiting_on_you": [],
            "team_activity": [],
            "upcoming": [],
        },
    }
