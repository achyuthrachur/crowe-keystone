"""
Approval service layer.

All database access for approvals is centralised here.
Routers and other services call these functions; they never access the DB directly.
"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import array
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.approval import Approval

logger = logging.getLogger(__name__)


async def create_approval(
    db: AsyncSession,
    project_id: uuid.UUID,
    prd_id: Optional[uuid.UUID],
    type: str,
    requested_by: uuid.UUID,
    assigned_to: list[str],
    request_summary: str,
    deadline: Optional[datetime] = None,
) -> Approval:
    """Create and persist a new approval record.

    Returns the flushed (but not yet committed) Approval ORM object.
    The caller's db session manages the transaction.
    """
    try:
        approval = Approval(
            project_id=project_id,
            prd_id=prd_id,
            type=type,
            requested_by=requested_by,
            assigned_to=assigned_to,
            status="pending",
            request_summary=request_summary,
            decisions=[],
            deadline=deadline,
        )
        db.add(approval)
        await db.flush()
        await db.refresh(approval)
        logger.info(
            "Created approval id=%s project=%s type=%s assigned_to=%s",
            approval.id,
            project_id,
            type,
            assigned_to,
        )
        return approval
    except Exception as exc:
        logger.error("Error creating approval for project %s: %s", project_id, exc)
        raise


async def get_approval(
    db: AsyncSession,
    approval_id: uuid.UUID,
    team_id: uuid.UUID,
) -> Optional[Approval]:
    """Return a single approval, scoped to a team via the project join.

    Returns None if not found or if it belongs to a different team.
    """
    try:
        from src.models.project import Project  # local import to avoid circular deps

        result = await db.execute(
            select(Approval)
            .join(Project, Project.id == Approval.project_id)
            .where(
                Approval.id == approval_id,
                Project.team_id == team_id,
            )
        )
        return result.scalar_one_or_none()
    except Exception as exc:
        logger.error("Error fetching approval %s: %s", approval_id, exc)
        return None


async def get_pending_approvals(
    db: AsyncSession,
    user_id: uuid.UUID,
) -> list[Approval]:
    """Return all pending approvals assigned to a specific user.

    The assigned_to column is a PostgreSQL TEXT[] array. We check for
    the user_id string being present in the array using the @> (contains) operator.
    """
    try:
        user_id_str = str(user_id)
        result = await db.execute(
            select(Approval).where(
                Approval.status == "pending",
                Approval.assigned_to.contains([user_id_str]),
            )
        )
        return list(result.scalars().all())
    except Exception as exc:
        logger.error("Error fetching pending approvals for user %s: %s", user_id, exc)
        return []


async def get_all_team_approvals(
    db: AsyncSession,
    team_id: uuid.UUID,
) -> list[Approval]:
    """Return all approvals for a team (all statuses), ordered newest first.

    Joins through the projects table to validate team scope.
    """
    try:
        from src.models.project import Project  # local import to avoid circular deps

        result = await db.execute(
            select(Approval)
            .join(Project, Project.id == Approval.project_id)
            .where(Project.team_id == team_id)
            .order_by(Approval.created_at.desc())
        )
        return list(result.scalars().all())
    except Exception as exc:
        logger.error("Error fetching all team approvals for team %s: %s", team_id, exc)
        return []


async def decide_approval(
    db: AsyncSession,
    approval_id: uuid.UUID,
    user_id: uuid.UUID,
    decision: str,
    note: Optional[str] = None,
) -> Optional[Approval]:
    """Record a user's decision on an approval and update its status.

    Decision logic:
    - 'approve': append decision; if ALL assigned users have now approved → status='approved'
    - 'reject': immediately set status='rejected', resolved_at=now
    - 'changes_requested': immediately set status='changes_requested', resolved_at=now

    Returns the updated Approval, or None if not found.
    """
    try:
        result = await db.execute(
            select(Approval).where(Approval.id == approval_id)
        )
        approval = result.scalar_one_or_none()
        if approval is None:
            return None

        now = datetime.now(timezone.utc)
        user_id_str = str(user_id)

        # Build the new decision record
        decision_record = {
            "user_id": user_id_str,
            "decision": decision,
            "note": note,
            "timestamp": now.isoformat(),
        }

        # Append to existing decisions list (JSONB — must reassign to trigger dirty tracking)
        updated_decisions = list(approval.decisions or [])
        updated_decisions.append(decision_record)
        approval.decisions = updated_decisions

        if decision == "reject":
            approval.status = "rejected"
            approval.resolved_at = now
            logger.info("Approval %s rejected by user %s", approval_id, user_id)

        elif decision == "changes_requested":
            approval.status = "changes_requested"
            approval.resolved_at = now
            logger.info("Approval %s changes_requested by user %s", approval_id, user_id)

        elif decision == "approve":
            # Check if every assigned user has now approved
            assigned_set = set(approval.assigned_to or [])
            approved_users = {
                d["user_id"]
                for d in updated_decisions
                if d.get("decision") == "approve"
            }
            # Empty assigned_to means anyone can approve (unassigned approval).
            # Non-empty means ALL assigned users must approve.
            if not assigned_set or assigned_set.issubset(approved_users):
                approval.status = "approved"
                approval.resolved_at = now
                logger.info(
                    "Approval %s fully approved (all %d assignees agreed)",
                    approval_id,
                    len(assigned_set),
                )
            else:
                logger.info(
                    "Approval %s: user %s approved; waiting for %d more",
                    approval_id,
                    user_id,
                    len(assigned_set - approved_users),
                )

        await db.flush()
        await db.refresh(approval)
        return approval

    except Exception as exc:
        logger.error("Error deciding approval %s: %s", approval_id, exc)
        raise
