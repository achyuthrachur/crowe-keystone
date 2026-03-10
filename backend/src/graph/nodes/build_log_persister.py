"""
Build Log Persister node — appends structured_update to project.build_log after update_writer.
"""

import logging
import uuid
from datetime import datetime, timezone

from src.state import KeystoneState

logger = logging.getLogger(__name__)


async def build_log_persister_node(state: KeystoneState) -> dict:
    """
    Appends state['structured_update'] to project.build_log in DB.

    Returns ONLY the fields this node modifies.
    Never raises exceptions.
    """
    project_id_str = state.get("project_id")
    team_id_str = state.get("team_id", "")
    structured_update: dict = dict(state.get("structured_update") or {})

    if not project_id_str or not structured_update:
        logger.warning("build_log_persister: missing project_id or structured_update — skipping")
        return {}

    try:
        from src.database import AsyncSessionLocal
        from src.models.project import Project
        from sqlalchemy import select

        async with AsyncSessionLocal() as db:
            result = await db.execute(select(Project).where(Project.id == uuid.UUID(project_id_str)))
            project = result.scalar_one_or_none()
            if not project:
                logger.warning("build_log_persister: project %s not found", project_id_str)
                return {}

            existing_log: list = list(project.build_log or [])
            entry = {
                **structured_update,
                "logged_at": datetime.now(timezone.utc).isoformat(),
            }
            existing_log.append(entry)
            project.build_log = existing_log
            await db.commit()
            logger.info("build_log_persister: appended entry to project %s", project_id_str)

        # Broadcast SSE so frontend SWR revalidates build log list
        if team_id_str:
            try:
                from src.routers.stream import broadcast_to_team
                await broadcast_to_team(
                    team_id_str,
                    {
                        "type": "project.build_log_updated",
                        "data": {"project_id": project_id_str},
                    },
                )
            except Exception as exc:
                logger.warning("build_log_persister: SSE broadcast failed: %s", exc)

    except Exception as exc:
        logger.warning("build_log_persister: failed: %s", exc)

    return {}
