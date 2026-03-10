"""
Retro Persister node — saves structured_update from retro_generator to the retrospectives table.
"""

import logging
import uuid

from src.state import KeystoneState

logger = logging.getLogger(__name__)


async def retro_persister_node(state: KeystoneState) -> dict:
    """
    Upserts state['structured_update'] into the retrospectives table.

    Returns ONLY the fields this node modifies.
    Never raises exceptions.
    """
    project_id_str = state.get("project_id")
    team_id_str = state.get("team_id", "")
    user_id_str = state.get("user_id", "")
    run_id_str = state.get("run_id", "")
    structured_update: dict = dict(state.get("structured_update") or {})

    if not project_id_str or not structured_update:
        logger.warning("retro_persister: missing project_id or structured_update — skipping")
        return {}

    try:
        from src.database import AsyncSessionLocal
        from src.models.retrospective import Retrospective
        from sqlalchemy import select

        async with AsyncSessionLocal() as db:
            project_uuid = uuid.UUID(project_id_str)
            result = await db.execute(
                select(Retrospective).where(Retrospective.project_id == project_uuid)
            )
            retro = result.scalar_one_or_none()

            if retro is None:
                retro = Retrospective(
                    project_id=project_uuid,
                    team_id=uuid.UUID(team_id_str) if team_id_str else uuid.uuid4(),
                    created_by=uuid.UUID(user_id_str) if user_id_str else None,
                    agent_run_id=uuid.UUID(run_id_str) if run_id_str else None,
                )
                db.add(retro)

            retro.built_vs_scoped = structured_update.get("built_vs_scoped", "")
            retro.decisions_changed = structured_update.get("decisions_changed", [])
            retro.learnings = structured_update.get("learnings", [])
            retro.what_would_change = structured_update.get("what_would_change", [])
            retro.quality_signals = structured_update.get("quality_signals")

            await db.commit()
            logger.info("retro_persister: saved retrospective for project %s", project_id_str)

        if team_id_str:
            try:
                from src.routers.stream import broadcast_to_team
                await broadcast_to_team(
                    team_id_str,
                    {
                        "type": "project.retro_updated",
                        "data": {"project_id": project_id_str},
                    },
                )
            except Exception as exc:
                logger.warning("retro_persister: SSE broadcast failed: %s", exc)

    except Exception as exc:
        logger.warning("retro_persister: failed: %s", exc)

    return {}
