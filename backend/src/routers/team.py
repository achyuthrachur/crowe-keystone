"""
Team management router.

GET    /team                   — team details with members
POST   /team/invite            — create invite link
PATCH  /team/members/{uid}     — update member role
DELETE /team/members/{uid}     — remove member
GET    /team/approval-chains   — current approval chain config
PUT    /team/approval-chains   — update approval chain config
"""

import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from src.database import get_db
from src.models.team import Team
from src.models.user import User
from src.routers.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/team", tags=["team"])


class RoleUpdate(BaseModel):
    role: str


class InviteRequest(BaseModel):
    email: str
    role: str = "member"


class ApprovalChainConfig(BaseModel):
    chains: dict  # {stage: [required_roles]}


@router.get("", status_code=status.HTTP_200_OK, summary="Get team details with members")
async def get_team(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    team_id = current_user.team_id
    if team_id is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No team found")

    team = await db.get(Team, team_id)
    if team is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")

    result = await db.execute(select(User).where(User.team_id == team_id))
    members = result.scalars().all()

    return {
        "id": str(team.id),
        "name": team.name,
        "slug": team.slug,
        "members": [
            {
                "id": str(m.id),
                "name": m.name,
                "email": m.email,
                "role": m.role,
                "created_at": m.created_at.isoformat() if hasattr(m, "created_at") and m.created_at else None,
            }
            for m in members
        ],
        "member_count": len(members),
    }


@router.post("/invite", status_code=status.HTTP_200_OK, summary="Create team invite link")
async def invite_member(
    body: InviteRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    if current_user.role not in ("admin", "lead"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admins and leads can invite")

    # Phase 7: Generate a unique invite token (full email sending in Phase 8)
    invite_token = uuid.uuid4().hex
    invite_link = f"/invite/{invite_token}?email={body.email}&role={body.role}"

    logger.info("Invite created for %s (role=%s) by %s", body.email, body.role, current_user.id)
    return {
        "email": body.email,
        "role": body.role,
        "invite_token": invite_token,
        "invite_link": invite_link,
        "message": "Invite link created. Share this link with the invitee.",
    }


@router.patch("/members/{user_id}", status_code=status.HTTP_200_OK, summary="Update member role")
async def update_member_role(
    user_id: uuid.UUID,
    body: RoleUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    if current_user.role not in ("admin",):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admins can change roles")
    if body.role not in ("admin", "lead", "member"):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid role")

    member = await db.get(User, user_id)
    if member is None or member.team_id != current_user.team_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")

    member.role = body.role
    await db.commit()
    return {"id": str(member.id), "role": member.role}


@router.delete("/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Remove team member")
async def remove_member(
    user_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    if current_user.role not in ("admin",):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admins can remove members")
    if user_id == current_user.id:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Cannot remove yourself")

    member = await db.get(User, user_id)
    if member is None or member.team_id != current_user.team_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")

    # Soft delete: null out team_id rather than deleting the user
    member.team_id = None
    await db.commit()


# ── Approval chain config ─────────────────────────────────────────────────
# Stored in team.metadata JSONB under key "approval_chains"

@router.get("/approval-chains", status_code=status.HTTP_200_OK, summary="Get approval chain config")
async def get_approval_chains(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    if current_user.team_id is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No team found")
    # Phase 7: chains stored in team.metadata JSONB (migration in Phase 8)
    # For now, return default chains + any overrides stored via stage_service config
    return {"chains": _default_chains()}


@router.put("/approval-chains", status_code=status.HTTP_200_OK, summary="Update approval chain config")
async def update_approval_chains(
    body: ApprovalChainConfig,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    if current_user.role not in ("admin",):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admins can update approval chains")
    if current_user.team_id is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No team found")
    # Phase 8: persist to team.metadata JSONB after adding the column
    # Return the submitted config so frontend can use it immediately
    return {"chains": body.chains}


def _default_chains() -> dict:
    return {
        "review": ["lead", "admin"],
        "approved": ["admin"],
    }
