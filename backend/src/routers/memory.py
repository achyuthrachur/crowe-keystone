"""
Memory router — institutional memory search and retrieval.

GET  /memory?query=&type=&tag=&limit=&offset=   — paginated search
GET  /memory/{id}                               — full entry detail
"""

import logging
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import or_, select, cast
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.models.decision import Decision
from src.models.retrospective import Retrospective
from src.models.user import User
from src.routers.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/memory", tags=["memory"])


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------


class DecisionResponse(BaseModel):
    id: str
    type: str
    entry_type: str = "decision"
    title: str
    rationale: str
    alternatives_considered: Optional[list] = None
    tags: list
    source: str
    project_id: Optional[str] = None
    created_at: str

    model_config = {"from_attributes": True}


class RetroResponse(BaseModel):
    id: str
    entry_type: str = "retrospective"
    project_id: str
    built_vs_scoped: str
    learnings: list
    what_would_change: list
    published: bool
    created_at: str

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# GET /memory
# ---------------------------------------------------------------------------


@router.get("", status_code=status.HTTP_200_OK, summary="Search institutional memory")
async def search_memory(
    query: Optional[str] = Query(None, description="Full-text search across titles and content"),
    type: Optional[str] = Query(None, description="Filter by type: decisions | retrospectives | conflicts | patterns"),
    tag: Optional[str] = Query(None, description="Filter decisions by tag"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    team_id = current_user.team_id
    if team_id is None:
        return {"decisions": [], "retrospectives": [], "total": 0}

    results: list[dict] = []

    # ── Decisions ─────────────────────────────────────────────────────────
    if type in (None, "decisions", "architectural", "scope", "stack", "process"):
        stmt = select(Decision).where(Decision.team_id == team_id)
        if query:
            stmt = stmt.where(
                or_(
                    Decision.title.ilike(f"%{query}%"),
                    Decision.rationale.ilike(f"%{query}%"),
                )
            )
        if tag:
            stmt = stmt.where(Decision.tags.contains(cast([tag], JSONB)))
        if type in ("architectural", "scope", "stack", "process"):
            stmt = stmt.where(Decision.type == type)
        stmt = stmt.order_by(Decision.created_at.desc()).limit(limit).offset(offset)
        res = await db.execute(stmt)
        for d in res.scalars().all():
            results.append({
                "id": str(d.id),
                "entry_type": "decision",
                "type": d.type,
                "title": d.title,
                "rationale": d.rationale[:200],
                "tags": list(d.tags or []),
                "source": d.source,
                "project_id": str(d.project_id) if d.project_id else None,
                "created_at": d.created_at.isoformat(),
            })

    # ── Retrospectives ─────────────────────────────────────────────────────
    if type in (None, "retrospectives"):
        stmt = select(Retrospective).where(Retrospective.team_id == team_id, Retrospective.published == True)  # noqa: E712
        if query:
            stmt = stmt.where(
                or_(
                    Retrospective.built_vs_scoped.ilike(f"%{query}%"),
                )
            )
        stmt = stmt.order_by(Retrospective.created_at.desc()).limit(limit).offset(offset)
        res = await db.execute(stmt)
        for r in res.scalars().all():
            results.append({
                "id": str(r.id),
                "entry_type": "retrospective",
                "project_id": str(r.project_id),
                "built_vs_scoped": r.built_vs_scoped[:300],
                "learnings_count": len(list(r.learnings or [])),
                "published": r.published,
                "created_at": r.created_at.isoformat(),
            })

    return {
        "results": results,
        "total": len(results),
        "query": query,
        "type_filter": type,
        "tag_filter": tag,
    }


# ---------------------------------------------------------------------------
# GET /memory/{id}
# ---------------------------------------------------------------------------


@router.get("/{entry_id}", status_code=status.HTTP_200_OK, summary="Get a full memory entry")
async def get_memory_entry(
    entry_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    team_id = current_user.team_id

    try:
        eid = uuid.UUID(entry_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entry not found")

    # Try decision first
    d = await db.get(Decision, eid)
    if d and d.team_id == team_id:
        return {
            "id": str(d.id),
            "entry_type": "decision",
            "type": d.type,
            "title": d.title,
            "rationale": d.rationale,
            "alternatives_considered": d.alternatives_considered,
            "tags": list(d.tags or []),
            "source": d.source,
            "project_id": str(d.project_id) if d.project_id else None,
            "created_at": d.created_at.isoformat(),
        }

    # Try retrospective
    r = await db.get(Retrospective, eid)
    if r and r.team_id == team_id:
        return {
            "id": str(r.id),
            "entry_type": "retrospective",
            "project_id": str(r.project_id),
            "built_vs_scoped": r.built_vs_scoped,
            "decisions_changed": list(r.decisions_changed or []),
            "learnings": list(r.learnings or []),
            "what_would_change": list(r.what_would_change or []),
            "quality_signals": r.quality_signals,
            "published": r.published,
            "created_at": r.created_at.isoformat(),
        }

    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entry not found")
