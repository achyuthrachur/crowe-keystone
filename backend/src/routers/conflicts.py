"""
Conflicts router.

GET  /conflicts              — open conflicts for the current user's team
GET  /conflicts/{id}         — single conflict detail
POST /conflicts/{id}/resolve — mark as resolved with a chosen option
POST /conflicts/{id}/dismiss — dismiss the conflict with a reason
"""

from __future__ import annotations

import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.models.user import User
from src.routers.auth import get_current_user
from src.routers.stream import broadcast_to_team
from src.schemas.conflict import ConflictDismiss, ConflictResolve, ConflictResponse
from src.services import conflict_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/conflicts", tags=["conflicts"])


@router.get(
    "",
    response_model=list[ConflictResponse],
    status_code=status.HTTP_200_OK,
    summary="List all open conflicts for the current user's team",
)
async def list_conflicts(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[ConflictResponse]:
    if current_user.team_id is None:
        return []

    try:
        conflicts = await conflict_service.get_open_conflicts(
            db, team_id=current_user.team_id
        )
        return [ConflictResponse.model_validate(c) for c in conflicts]
    except Exception as exc:
        logger.error("Error listing conflicts for team %s: %s", current_user.team_id, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve conflicts",
        )


@router.get(
    "/{conflict_id}",
    response_model=ConflictResponse,
    status_code=status.HTTP_200_OK,
    summary="Get a single conflict by ID",
)
async def get_conflict_by_id(
    conflict_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ConflictResponse:
    if current_user.team_id is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conflict not found")

    try:
        conflict = await conflict_service.get_conflict(
            db, conflict_id=conflict_id, team_id=current_user.team_id
        )
    except Exception as exc:
        logger.error("Error fetching conflict %s: %s", conflict_id, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve conflict",
        )

    if conflict is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conflict not found")

    return ConflictResponse.model_validate(conflict)


@router.post(
    "/{conflict_id}/resolve",
    response_model=ConflictResponse,
    status_code=status.HTTP_200_OK,
    summary="Resolve a conflict by selecting a resolution option",
)
async def resolve_conflict(
    conflict_id: uuid.UUID,
    body: ConflictResolve,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ConflictResponse:
    if current_user.team_id is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conflict not found")

    # Verify existence and team scope before mutating
    existing = await conflict_service.get_conflict(
        db, conflict_id=conflict_id, team_id=current_user.team_id
    )
    if existing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conflict not found")

    if existing.status != "open":
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Conflict is already {existing.status}",
        )

    try:
        conflict = await conflict_service.resolve_conflict(
            db,
            conflict_id=conflict_id,
            resolution=body.resolution,
            option_chosen=body.option_chosen,
        )
    except Exception as exc:
        logger.error("Error resolving conflict %s: %s", conflict_id, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to resolve conflict",
        )

    if conflict is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conflict not found")

    # Broadcast resolution SSE
    try:
        await broadcast_to_team(
            str(current_user.team_id),
            {
                "type": "conflict.resolved",
                "data": {
                    "conflict_id": str(conflict.id),
                    "resolution": body.resolution,
                },
            },
        )
    except Exception as exc:
        logger.error("Error broadcasting conflict.resolved for %s: %s", conflict_id, exc)

    return ConflictResponse.model_validate(conflict)


@router.post(
    "/{conflict_id}/dismiss",
    response_model=ConflictResponse,
    status_code=status.HTTP_200_OK,
    summary="Dismiss a conflict with a reason",
)
async def dismiss_conflict(
    conflict_id: uuid.UUID,
    body: ConflictDismiss,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ConflictResponse:
    if current_user.team_id is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conflict not found")

    existing = await conflict_service.get_conflict(
        db, conflict_id=conflict_id, team_id=current_user.team_id
    )
    if existing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conflict not found")

    if existing.status != "open":
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Conflict is already {existing.status}",
        )

    try:
        conflict = await conflict_service.dismiss_conflict(
            db,
            conflict_id=conflict_id,
            reason=body.reason,
        )
    except Exception as exc:
        logger.error("Error dismissing conflict %s: %s", conflict_id, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to dismiss conflict",
        )

    if conflict is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conflict not found")

    # Broadcast dismissal as a resolved event (removes the conflict edge from the graph)
    try:
        await broadcast_to_team(
            str(current_user.team_id),
            {
                "type": "conflict.resolved",
                "data": {
                    "conflict_id": str(conflict.id),
                    "resolution": f"dismissed: {body.reason}",
                },
            },
        )
    except Exception as exc:
        logger.error("Error broadcasting conflict dismissed for %s: %s", conflict_id, exc)

    return ConflictResponse.model_validate(conflict)
