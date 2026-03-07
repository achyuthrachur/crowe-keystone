"""
Decisions router — architectural decision records.

GET  /decisions?tag=&type=   — paginated decision list
POST /decisions              — create a manual decision
GET  /decisions/{id}         — full decision detail
"""

import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from src.database import get_db
from src.models.decision import Decision
from src.models.user import User
from src.routers.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/decisions", tags=["decisions"])


class DecisionCreate(BaseModel):
    title: str
    rationale: str
    type: str = "architectural"
    alternatives_considered: Optional[list] = None
    tags: list = []
    project_id: Optional[str] = None


@router.get("", status_code=status.HTTP_200_OK, summary="List decisions with optional filters")
async def list_decisions(
    tag: Optional[str] = Query(None),
    type: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    team_id = current_user.team_id
    if team_id is None:
        return []

    stmt = select(Decision).where(Decision.team_id == team_id)
    if type:
        stmt = stmt.where(Decision.type == type)
    stmt = stmt.order_by(Decision.created_at.desc()).limit(limit).offset(offset)

    result = await db.execute(stmt)
    decisions = result.scalars().all()

    out = []
    for d in decisions:
        tags = list(d.tags or [])
        if tag and tag not in tags:
            continue
        out.append({
            "id": str(d.id),
            "type": d.type,
            "title": d.title,
            "rationale": d.rationale[:300],
            "tags": tags,
            "source": d.source,
            "project_id": str(d.project_id) if d.project_id else None,
            "created_at": d.created_at.isoformat(),
        })
    return out


@router.post("", status_code=status.HTTP_201_CREATED, summary="Create a manual decision")
async def create_decision(
    body: DecisionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    if current_user.team_id is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Must belong to a team")

    d = Decision(
        team_id=current_user.team_id,
        project_id=uuid.UUID(body.project_id) if body.project_id else None,
        created_by=current_user.id,
        type=body.type,
        title=body.title,
        rationale=body.rationale,
        alternatives_considered=body.alternatives_considered,
        tags=body.tags,
        source="manual",
    )
    db.add(d)
    await db.commit()
    await db.refresh(d)

    return {
        "id": str(d.id),
        "type": d.type,
        "title": d.title,
        "rationale": d.rationale,
        "tags": list(d.tags or []),
        "source": d.source,
        "created_at": d.created_at.isoformat(),
    }


@router.get("/{decision_id}", status_code=status.HTTP_200_OK, summary="Get decision detail")
async def get_decision(
    decision_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    d = await db.get(Decision, decision_id)
    if d is None or d.team_id != current_user.team_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Decision not found")

    return {
        "id": str(d.id),
        "type": d.type,
        "title": d.title,
        "rationale": d.rationale,
        "alternatives_considered": d.alternatives_considered,
        "tags": list(d.tags or []),
        "source": d.source,
        "project_id": str(d.project_id) if d.project_id else None,
        "created_at": d.created_at.isoformat(),
        "updated_at": d.updated_at.isoformat(),
    }
