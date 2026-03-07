"""
Retrospectives router.

POST /projects/{id}/retrospective         — trigger retro_generator agent
GET  /projects/{id}/retrospective         — get current retrospective
POST /projects/{id}/retrospective/publish — publish + trigger memory_indexer
"""

import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.models.retrospective import Retrospective
from src.models.user import User
from src.routers.auth import get_current_user
from src.services.project_service import get_project

logger = logging.getLogger(__name__)
router = APIRouter(tags=["retrospectives"])


@router.post(
    "/projects/{project_id}/retrospective",
    status_code=status.HTTP_202_ACCEPTED,
    summary="Trigger retro_generator agent for this project",
)
async def create_retrospective(
    project_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    if current_user.team_id is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    project = await get_project(db, project_id=project_id, team_id=current_user.team_id)
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    run_id = str(uuid.uuid4())
    team_id_str = str(current_user.team_id)

    from src.models.agent_run import AgentRun
    from src.state import KeystoneState
    from src.config import settings
    from src.routers.agents import _run_graph_task, _select_graph
    from src.services import prd_service

    # Fetch current PRD for context
    prd = await prd_service.get_current_prd(db, project_id=project_id)
    prd_content = dict(prd.content) if prd and prd.content else {}

    agent_run = AgentRun(
        id=uuid.UUID(run_id),
        team_id=current_user.team_id,
        agent_type="retro_generator",
        project_id=project_id,
        triggered_by=current_user.id,
        trigger_event="api_request",
        input_summary=f"Retro for {project.title}",
        status="running",
    )
    db.add(agent_run)
    await db.commit()

    initial_state: KeystoneState = {
        "run_id": run_id,
        "agent_type": "retro_generator",
        "project_id": str(project_id),
        "team_id": team_id_str,
        "triggered_by": str(current_user.id),
        "context": {"project_title": project.title, "stage": project.stage},
        "prd_draft": prd_content,
        "raw_input": project.title,
        "input_type": "data",
        "brief": None, "prd_version": 1,
        "hypotheses": [], "adversarial_findings": [], "assumption_audit": [],
        "stress_test_confidence": 0.0, "all_project_states": [],
        "detected_conflicts": [], "approval_type": None,
        "approval_chain": [], "approval_context_summary": "",
        "raw_build_notes": None, "structured_update": None,
        "user_id": str(current_user.id), "brief_sections": None,
        "memory_entries": [], "similar_prior_projects": [],
        "human_checkpoint_needed": False, "checkpoint_question": None,
        "checkpoint_response": None, "quality_score": 0.0,
        "loop_count": 0, "errors": [], "status": "running",
    }

    graph = _select_graph("retro_generator")
    background_tasks.add_task(
        _run_graph_task,
        run_id=run_id,
        graph=graph,
        initial_state=initial_state,
        team_id=team_id_str,
        db_url=settings.DATABASE_URL,
    )

    return {"run_id": run_id, "status": "generating"}


@router.get(
    "/projects/{project_id}/retrospective",
    status_code=status.HTTP_200_OK,
    summary="Get the current retrospective for a project",
)
async def get_retrospective(
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    if current_user.team_id is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    project = await get_project(db, project_id=project_id, team_id=current_user.team_id)
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    result = await db.execute(
        select(Retrospective).where(Retrospective.project_id == project_id)
    )
    retro = result.scalar_one_or_none()
    if retro is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No retrospective yet")

    return {
        "id": str(retro.id),
        "project_id": str(retro.project_id),
        "built_vs_scoped": retro.built_vs_scoped,
        "decisions_changed": list(retro.decisions_changed or []),
        "learnings": list(retro.learnings or []),
        "what_would_change": list(retro.what_would_change or []),
        "quality_signals": retro.quality_signals,
        "published": retro.published,
        "published_at": retro.published_at.isoformat() if retro.published_at else None,
        "created_at": retro.created_at.isoformat(),
    }


@router.post(
    "/projects/{project_id}/retrospective/publish",
    status_code=status.HTTP_200_OK,
    summary="Publish retrospective and trigger memory_indexer",
)
async def publish_retrospective(
    project_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    if current_user.team_id is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    project = await get_project(db, project_id=project_id, team_id=current_user.team_id)
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    result = await db.execute(
        select(Retrospective).where(Retrospective.project_id == project_id)
    )
    retro = result.scalar_one_or_none()
    if retro is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No retrospective to publish")

    now = datetime.now(timezone.utc)
    retro.published = True
    retro.published_at = now
    retro.updated_at = now
    await db.flush()
    await db.commit()

    # Trigger memory_indexer agent as background task
    async def _run_memory_indexer() -> None:
        try:
            from src.routers.agents import _run_graph_task, _select_graph
            from src.state import KeystoneState
            from src.config import settings
            import uuid as _uuid
            from src.models.agent_run import AgentRun as AR
            from src.database import AsyncSessionLocal

            run_id = str(_uuid.uuid4())
            async with AsyncSessionLocal() as s:
                agent_run = AR(
                    id=_uuid.UUID(run_id),
                    team_id=current_user.team_id,
                    agent_type="memory_indexer",
                    project_id=project_id,
                    triggered_by=current_user.id,
                    trigger_event="retro_published",
                    input_summary=f"Memory index for {project.title}",
                    status="running",
                )
                s.add(agent_run)
                await s.commit()

            initial_state: KeystoneState = {
                "run_id": run_id, "agent_type": "memory_indexer",
                "project_id": str(project_id), "team_id": str(current_user.team_id),
                "triggered_by": str(current_user.id),
                "structured_update": {
                    "built_vs_scoped": retro.built_vs_scoped,
                    "learnings": list(retro.learnings or []),
                    "decisions_changed": list(retro.decisions_changed or []),
                },
                "context": {}, "raw_input": "", "input_type": "data",
                "brief": None, "prd_draft": None, "prd_version": 1,
                "hypotheses": [], "adversarial_findings": [], "assumption_audit": [],
                "stress_test_confidence": 0.0, "all_project_states": [],
                "detected_conflicts": [], "approval_type": None,
                "approval_chain": [], "approval_context_summary": "",
                "raw_build_notes": None, "user_id": str(current_user.id),
                "brief_sections": None, "memory_entries": [], "similar_prior_projects": [],
                "human_checkpoint_needed": False, "checkpoint_question": None,
                "checkpoint_response": None, "quality_score": 0.0,
                "loop_count": 0, "errors": [], "status": "running",
            }
            graph = _select_graph("memory_indexer")
            await _run_graph_task(
                run_id=run_id, graph=graph, initial_state=initial_state,
                team_id=str(current_user.team_id), db_url=settings.DATABASE_URL,
            )
        except Exception as exc:
            logger.warning("memory_indexer failed after retro publish: %s", exc)

    background_tasks.add_task(_run_memory_indexer)

    return {"published": True, "published_at": now.isoformat()}
