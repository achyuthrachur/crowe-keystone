"""
Stage transition validation service.

Encapsulates all logic about which project stage advances are permitted,
which ones require an approval record, and how to build the approval chain
for a given project.
"""

from __future__ import annotations

import logging
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.user import User

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Stage graph — defines which transitions are allowed
# ---------------------------------------------------------------------------

VALID_TRANSITIONS: dict[str, list[str]] = {
    "spark": ["brief"],
    "brief": ["draft_prd"],
    "draft_prd": ["review"],
    "review": ["approved", "draft_prd"],  # can be sent back to draft
    "approved": ["in_build"],
    "in_build": ["shipped"],
    "shipped": ["retrospective"],
    "retrospective": [],
}

# ---------------------------------------------------------------------------
# Approval requirements — which target stages need an approval before
# the project can actually move there.
#
# When requires_approval[target] is True:
#   - An Approval record is created with status='pending'
#   - The project stage does NOT change yet
#   - Stage advances only after the approval is resolved with decision='approve'
#
# When requires_approval[target] is False:
#   - The project stage advances immediately, no approval record created
# ---------------------------------------------------------------------------

REQUIRES_APPROVAL: dict[str, bool] = {
    "spark": False,
    "brief": False,         # spark → brief: immediate (the brief is just being started)
    "draft_prd": False,     # brief → draft_prd or review → draft_prd: immediate
    "review": True,         # draft_prd → review: requires approval
    "approved": True,       # review → approved: requires approval
    "in_build": False,      # approved → in_build: immediate
    "shipped": False,       # in_build → shipped: immediate
    "retrospective": False, # shipped → retrospective: immediate
}


def validate_transition(from_stage: str, to_stage: str) -> bool:
    """Return True if the from_stage → to_stage transition is valid.

    An unknown from_stage always returns False.
    """
    allowed = VALID_TRANSITIONS.get(from_stage, [])
    return to_stage in allowed


def requires_approval(to_stage: str) -> bool:
    """Return True if advancing to to_stage requires an approval record first."""
    return REQUIRES_APPROVAL.get(to_stage, False)


async def get_approval_chain(project, db: AsyncSession) -> list[str]:
    """Return a list of user ID strings that should be assigned to the approval.

    Strategy (Phase 2):
      1. If the project has an assigned_to user, include them.
      2. Always include all team leads on the team.
      3. Deduplicate, exclude the project creator (they're the requester, not an approver).
      4. If no leads found, fall back to an empty list (approval will be unassigned — still
         creates a record but won't block indefinitely).

    Phase 5+ can replace this with a configurable ApprovalChainConfig table lookup.
    """
    try:
        team_id: uuid.UUID = project.team_id
        created_by: uuid.UUID = project.created_by

        # Fetch all leads on the team
        result = await db.execute(
            select(User).where(
                User.team_id == team_id,
                User.role.in_(["lead", "admin"]),
            )
        )
        leads = result.scalars().all()

        chain: list[str] = [str(u.id) for u in leads if u.id != created_by]

        # If project has a specific assigned_to user who is not already in chain
        if project.assigned_to and str(project.assigned_to) not in chain:
            chain.append(str(project.assigned_to))

        logger.debug(
            "Approval chain for project %s → %d assignees",
            project.id,
            len(chain),
        )
        return chain

    except Exception as exc:
        logger.error("Error building approval chain for project %s: %s", project.id, exc)
        return []
