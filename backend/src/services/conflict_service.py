"""
Conflict service layer.

All database access for conflicts is centralised here.
Routers and the background conflict scanner call these functions.
"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.conflict import Conflict

logger = logging.getLogger(__name__)


async def get_open_conflicts(
    db: AsyncSession,
    team_id: uuid.UUID,
) -> list[Conflict]:
    """Return all open conflicts for a team, ordered by severity then detection time."""
    try:
        result = await db.execute(
            select(Conflict)
            .where(
                Conflict.team_id == team_id,
                Conflict.status == "open",
            )
            .order_by(
                # blocking conflicts before advisory
                Conflict.severity.desc(),
                Conflict.detected_at.desc(),
            )
        )
        return list(result.scalars().all())
    except Exception as exc:
        logger.error("Error fetching open conflicts for team %s: %s", team_id, exc)
        return []


async def get_conflict(
    db: AsyncSession,
    conflict_id: uuid.UUID,
    team_id: uuid.UUID,
) -> Optional[Conflict]:
    """Return a single conflict scoped to the team.

    Returns None if not found or if it belongs to a different team.
    """
    try:
        result = await db.execute(
            select(Conflict).where(
                Conflict.id == conflict_id,
                Conflict.team_id == team_id,
            )
        )
        return result.scalar_one_or_none()
    except Exception as exc:
        logger.error("Error fetching conflict %s: %s", conflict_id, exc)
        return None


async def resolve_conflict(
    db: AsyncSession,
    conflict_id: uuid.UUID,
    resolution: str,
    option_chosen: Optional[str] = None,
) -> Optional[Conflict]:
    """Mark a conflict as resolved with the provided resolution text.

    Returns the updated Conflict, or None if not found.
    """
    try:
        result = await db.execute(
            select(Conflict).where(Conflict.id == conflict_id)
        )
        conflict = result.scalar_one_or_none()
        if conflict is None:
            return None

        resolution_text = resolution
        if option_chosen:
            resolution_text = f"{resolution} (Option chosen: {option_chosen})"

        conflict.status = "resolved"
        conflict.resolution = resolution_text
        conflict.resolved_at = datetime.now(timezone.utc)

        await db.flush()
        await db.refresh(conflict)
        logger.info(
            "Conflict %s resolved: option=%s", conflict_id, option_chosen or "custom"
        )
        return conflict
    except Exception as exc:
        logger.error("Error resolving conflict %s: %s", conflict_id, exc)
        raise


async def dismiss_conflict(
    db: AsyncSession,
    conflict_id: uuid.UUID,
    reason: str,
) -> Optional[Conflict]:
    """Dismiss a conflict (acknowledged but not formally resolved).

    Returns the updated Conflict, or None if not found.
    """
    try:
        result = await db.execute(
            select(Conflict).where(Conflict.id == conflict_id)
        )
        conflict = result.scalar_one_or_none()
        if conflict is None:
            return None

        conflict.status = "dismissed"
        conflict.resolution = f"Dismissed: {reason}"
        conflict.resolved_at = datetime.now(timezone.utc)

        await db.flush()
        await db.refresh(conflict)
        logger.info("Conflict %s dismissed: reason=%r", conflict_id, reason)
        return conflict
    except Exception as exc:
        logger.error("Error dismissing conflict %s: %s", conflict_id, exc)
        raise
