"""
PRD service — all database operations for the Living PRD System.

Public surface:
  get_current_prd(db, project_id)           -> Prd | None
  get_prd(db, prd_id, project_id)           -> Prd | None
  list_prd_versions(db, project_id)         -> list[Prd]
  create_or_update_prd(db, project_id,
                        user_id, content,
                        open_questions)     -> Prd
  has_blocking_open_questions(prd)          -> bool
  compute_diff(old_content, new_content)    -> list[dict]
  count_words(content)                      -> int
"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.prd import Prd
from src.models.project import Project

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Query helpers
# ---------------------------------------------------------------------------

async def get_current_prd(db: AsyncSession, project_id: uuid.UUID) -> Optional[Prd]:
    """Return the latest non-superseded PRD for a project (highest version number)."""
    result = await db.execute(
        select(Prd)
        .where(
            Prd.project_id == project_id,
            Prd.status != "superseded",
        )
        .order_by(Prd.version.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()


async def get_prd(
    db: AsyncSession, prd_id: uuid.UUID, project_id: uuid.UUID
) -> Optional[Prd]:
    """Return a specific PRD row, scoped to the given project for safety."""
    result = await db.execute(
        select(Prd).where(Prd.id == prd_id, Prd.project_id == project_id)
    )
    return result.scalar_one_or_none()


async def get_prd_by_version(
    db: AsyncSession, project_id: uuid.UUID, version: int
) -> Optional[Prd]:
    """Return a specific version of a PRD."""
    result = await db.execute(
        select(Prd).where(Prd.project_id == project_id, Prd.version == version)
    )
    return result.scalar_one_or_none()


async def list_prd_versions(db: AsyncSession, project_id: uuid.UUID) -> list[Prd]:
    """Return all PRD versions for a project, newest first."""
    result = await db.execute(
        select(Prd)
        .where(Prd.project_id == project_id)
        .order_by(Prd.version.desc())
    )
    return list(result.scalars().all())


# ---------------------------------------------------------------------------
# Create / update (always creates a new version)
# ---------------------------------------------------------------------------

async def create_or_update_prd(
    db: AsyncSession,
    project_id: uuid.UUID,
    user_id: Optional[uuid.UUID],
    content: dict[str, Any],
    open_questions: list[dict[str, Any]],
) -> Prd:
    """
    Create a new PRD version for the project.

    Algorithm:
    1. Fetch the current (non-superseded) PRD, if any.
    2. Mark it as 'superseded'.
    3. Compute the field-level diff between old and new content.
    4. Create a new Prd with version = old.version + 1 (or 1 if none exists).
    5. Compute word_count from all string values in content.
    6. Point project.prd_id at the new PRD.
    7. Return the new PRD.
    """
    now = datetime.now(timezone.utc)

    # Step 1 — get current version
    current = await get_current_prd(db, project_id)

    # Step 2 — supersede it
    old_content: dict[str, Any] = {}
    next_version = 1
    if current is not None:
        old_content = dict(current.content or {})
        next_version = current.version + 1
        current.status = "superseded"
        current.updated_at = now
        await db.flush()

    # Step 3 — diff
    diff = compute_diff(old_content, content)

    # Step 4 + 5 — create new PRD
    new_prd = Prd(
        project_id=project_id,
        version=next_version,
        status="draft",
        content=content,
        open_questions=open_questions,
        diff_from_previous=diff if diff else None,
        word_count=count_words(content),
        created_by=user_id,
        created_at=now,
        updated_at=now,
    )
    db.add(new_prd)
    await db.flush()
    await db.refresh(new_prd)

    # Step 6 — update project.prd_id
    project_result = await db.execute(
        select(Project).where(Project.id == project_id)
    )
    project = project_result.scalar_one_or_none()
    if project is not None:
        project.prd_id = new_prd.id
        project.updated_at = now
        await db.flush()

    logger.info(
        "PRD created for project %s — version %d word_count=%s",
        project_id,
        next_version,
        new_prd.word_count,
    )
    return new_prd


# ---------------------------------------------------------------------------
# Business logic helpers
# ---------------------------------------------------------------------------

def has_blocking_open_questions(prd: Prd) -> bool:
    """
    Return True if any open question has blocking=True and answered=False.
    Checks the top-level open_questions column on the Prd row.
    """
    questions = prd.open_questions or []
    for q in questions:
        if q.get("blocking") is True and not q.get("answered", False):
            return True
    return False


def compute_diff(
    old_content: dict[str, Any], new_content: dict[str, Any]
) -> list[dict[str, Any]]:
    """
    Compare two PRD content dicts section by section (top-level keys only).
    Returns a list of {section, old, new} dicts for every changed section.
    Empty list means no changes.
    """
    all_keys = set(old_content.keys()) | set(new_content.keys())
    diff: list[dict[str, Any]] = []
    for key in sorted(all_keys):
        old_val = old_content.get(key)
        new_val = new_content.get(key)
        if old_val != new_val:
            diff.append({"section": key, "old": old_val, "new": new_val})
    return diff


def count_words(content: dict[str, Any]) -> int:
    """
    Recursively count words across all string values in the content dict.
    Lists are iterated; nested dicts are recursed into.
    Non-string, non-dict, non-list values are ignored.
    """
    total = 0

    def _count(obj: Any) -> None:
        nonlocal total
        if isinstance(obj, str):
            total += len(obj.split())
        elif isinstance(obj, dict):
            for v in obj.values():
                _count(v)
        elif isinstance(obj, list):
            for item in obj:
                _count(item)

    _count(content)
    return total
