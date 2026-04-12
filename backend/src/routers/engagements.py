"""
engagements.py — CRUD router for Keystone engagements.
"""
import uuid
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.models.engagement import Engagement
from src.models.user import User
from src.routers.auth import get_current_user
from src.routers.stream import broadcast_to_team
from src.schemas.engagement import (
    EngagementCreate, EngagementUpdate,
    EngagementResponse, EngagementListResponse,
)
from src.services.synthetic_guard import check_engagement_name, SyntheticGuardError

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/engagements", tags=["engagements"])


@router.get("", response_model=EngagementListResponse)
async def list_engagements(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> EngagementListResponse:
    result = await db.execute(
        select(Engagement)
        .where(Engagement.team_id == current_user.team_id)
        .order_by(Engagement.created_at.desc())
    )
    engagements = result.scalars().all()
    return EngagementListResponse(
        engagements=[EngagementResponse.model_validate(e) for e in engagements],
        total=len(engagements),
    )


@router.post("", response_model=EngagementResponse, status_code=status.HTTP_201_CREATED)
async def create_engagement(
    payload: EngagementCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> EngagementResponse:
    try:
        check_engagement_name(payload.client_name)
    except SyntheticGuardError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc))

    engagement = Engagement(
        id=uuid.uuid4(),
        team_id=current_user.team_id,
        created_by=current_user.id,
        client_name=payload.client_name,
        client_industry=payload.client_industry,
        engagement_date=payload.engagement_date,
        attendees=payload.attendees,
        status="draft",
    )
    db.add(engagement)
    await db.commit()
    await db.refresh(engagement)

    await broadcast_to_team(str(current_user.team_id), {
        "type": "keystone.engagement_created",
        "data": {"engagement_id": str(engagement.id), "client_name": engagement.client_name},
    })

    return EngagementResponse.model_validate(engagement)


@router.get("/{engagement_id}", response_model=EngagementResponse)
async def get_engagement(
    engagement_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> EngagementResponse:
    engagement = await _get_engagement_or_404(db, engagement_id, current_user.team_id)
    return EngagementResponse.model_validate(engagement)


@router.patch("/{engagement_id}", response_model=EngagementResponse)
async def update_engagement(
    engagement_id: uuid.UUID,
    payload: EngagementUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> EngagementResponse:
    engagement = await _get_engagement_or_404(db, engagement_id, current_user.team_id)

    update_data = payload.model_dump(exclude_none=True)
    if "client_name" in update_data:
        try:
            check_engagement_name(update_data["client_name"])
        except SyntheticGuardError as exc:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc))

    for field, value in update_data.items():
        setattr(engagement, field, value)
    engagement.updated_at = datetime.now(tz=timezone.utc)

    await db.commit()
    await db.refresh(engagement)

    await broadcast_to_team(str(current_user.team_id), {
        "type": "keystone.engagement_updated",
        "data": {"engagement_id": str(engagement.id), "fields_changed": list(update_data.keys())},
    })

    return EngagementResponse.model_validate(engagement)


@router.delete("/{engagement_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_engagement(
    engagement_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    if current_user.role not in ("lead", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only leads and admins can delete engagements.",
        )

    engagement = await _get_engagement_or_404(db, engagement_id, current_user.team_id)
    await db.delete(engagement)
    await db.commit()

    await broadcast_to_team(str(current_user.team_id), {
        "type": "keystone.engagement_deleted",
        "data": {"engagement_id": str(engagement_id)},
    })


# ── Helper ────────────────────────────────────────────────────────────────────

async def _get_engagement_or_404(
    db: AsyncSession, engagement_id: uuid.UUID, team_id: uuid.UUID
) -> Engagement:
    result = await db.execute(
        select(Engagement).where(
            Engagement.id == engagement_id,
            Engagement.team_id == team_id,
        )
    )
    engagement = result.scalar_one_or_none()
    if engagement is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Engagement not found.")
    return engagement
