"""
PRD Persister node — saves the AI-generated PRD draft to the prds table.

Runs after quality_gate passes. Takes state['prd_draft'] and state['open_questions'],
calls prd_service.create_or_update_prd, then broadcasts prd.updated SSE so the
frontend PRDEditor reloads automatically.

Also saves state['brief'] to project.brief when present.
"""
from __future__ import annotations

import logging
import uuid as _uuid
from typing import Any

from src.state import KeystoneState

logger = logging.getLogger(__name__)


async def prd_persister_node(state: KeystoneState) -> dict:
    """
    Persists the generated PRD draft to the database.

    1. Resolves project_id from state.
    2. Calls prd_service.create_or_update_prd with the merged prd_draft content.
    3. Saves state['brief'] to project.brief when present.
    4. Broadcasts prd.updated SSE so the frontend PRDEditor reloads.
    5. Returns only the fields this node modifies.
    Never raises exceptions — errors are appended to state['errors'].
    """
    project_id_str = state.get("project_id")
    prd_draft: dict[str, Any] = dict(state.get("prd_draft") or {})
    open_questions: list[dict] = list(state.get("open_questions") or [])
    brief = state.get("brief")
    team_id = state.get("team_id", "")
    run_id = state.get("run_id", "")

    if not project_id_str or not prd_draft:
        logger.info("prd_persister_node: nothing to persist (project_id=%s, prd_draft empty=%s)",
                    project_id_str, not bool(prd_draft))
        return {"status": "complete"}

    try:
        project_id = _uuid.UUID(project_id_str)
    except (ValueError, TypeError):
        logger.warning("prd_persister_node: invalid project_id=%s", project_id_str)
        return {
            "errors": [*state.get("errors", []), f"prd_persister: invalid project_id {project_id_str}"],
            "status": "complete",
        }

    try:
        from src.database import AsyncSessionLocal
        from src.services.prd_service import create_or_update_prd
        from src.routers.stream import broadcast_to_team
        from sqlalchemy import select
        from src.models.project import Project

        async with AsyncSessionLocal() as db:
            # Persist PRD
            triggered_by_str = state.get("triggered_by") or state.get("user_id")
            try:
                user_uuid = _uuid.UUID(triggered_by_str) if triggered_by_str else None
            except (ValueError, TypeError):
                user_uuid = None

            prd = await create_or_update_prd(
                db,
                project_id=project_id,
                user_id=user_uuid,
                content=prd_draft,
                open_questions=open_questions,
            )

            # Save brief to project.brief if available
            if brief:
                result = await db.execute(select(Project).where(Project.id == project_id))
                project = result.scalar_one_or_none()
                if project is not None:
                    project.brief = dict(brief) if not isinstance(brief, dict) else brief
                    await db.flush()

            await db.commit()

        # Broadcast prd.updated so the PRDEditor SWR key is revalidated
        try:
            await broadcast_to_team(
                team_id,
                {
                    "type": "prd.updated",
                    "data": {
                        "project_id": project_id_str,
                        "version": prd.version,
                        "run_id": run_id,
                        "source": "agent",
                    },
                },
            )
        except Exception as sse_exc:
            logger.warning("prd_persister_node: SSE broadcast failed: %s", sse_exc)

        logger.info(
            "prd_persister_node: saved PRD v%d for project %s (run_id=%s)",
            prd.version, project_id_str, run_id,
        )
        return {"status": "complete"}

    except Exception as exc:
        logger.exception("prd_persister_node failed for project %s: %s", project_id_str, exc)
        return {
            "errors": [*state.get("errors", []), f"prd_persister failed: {str(exc)}"],
            "status": "complete",
        }
