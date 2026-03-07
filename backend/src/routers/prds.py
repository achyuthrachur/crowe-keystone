"""
PRDs router — Living PRD System endpoints.

GET  /projects/{project_id}/prd               — current (latest non-superseded) PRD
PUT  /projects/{project_id}/prd               — save new version (always increments)
GET  /projects/{project_id}/prd/versions      — full version history (lightweight)
GET  /projects/{project_id}/prd/{version}     — specific version by number

All endpoints are scoped to the current user's team via project ownership check.
Every successful PUT broadcasts a prd.updated SSE event.
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
from src.schemas.prd import PRDResponse, PRDUpdate, PRDVersionResponse
from src.services import prd_service
from src.services.project_service import get_project

logger = logging.getLogger(__name__)

router = APIRouter(tags=["prds"])


# ---------------------------------------------------------------------------
# Internal helper — verify project belongs to current user's team
# ---------------------------------------------------------------------------

async def _get_scoped_project(
    project_id: uuid.UUID,
    current_user: User,
    db: AsyncSession,
):
    """Return the project or raise 404. Enforces team-id scoping."""
    if current_user.team_id is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    project = await get_project(db, project_id=project_id, team_id=current_user.team_id)
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return project


# ---------------------------------------------------------------------------
# GET /projects/{project_id}/prd
# ---------------------------------------------------------------------------

@router.get(
    "/projects/{project_id}/prd",
    response_model=PRDResponse,
    status_code=status.HTTP_200_OK,
    summary="Get the current (latest non-superseded) PRD for a project",
)
async def get_current_prd(
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PRDResponse:
    await _get_scoped_project(project_id, current_user, db)

    prd = await prd_service.get_current_prd(db, project_id=project_id)
    if prd is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No PRD exists for this project yet",
        )
    return PRDResponse.model_validate(prd)


# ---------------------------------------------------------------------------
# PUT /projects/{project_id}/prd
# ---------------------------------------------------------------------------

@router.put(
    "/projects/{project_id}/prd",
    response_model=PRDResponse,
    status_code=status.HTTP_200_OK,
    summary="Save a new PRD version — supersedes the previous version and broadcasts SSE",
)
async def upsert_prd(
    project_id: uuid.UUID,
    body: PRDUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PRDResponse:
    await _get_scoped_project(project_id, current_user, db)

    try:
        # Resolve content: if caller omits content (partial save), merge with existing
        if body.content is not None:
            new_content = body.content.model_dump()
        else:
            existing = await prd_service.get_current_prd(db, project_id=project_id)
            new_content = dict(existing.content) if existing and existing.content else {}

        prd = await prd_service.create_or_update_prd(
            db,
            project_id=project_id,
            user_id=current_user.id,
            content=new_content,
            open_questions=body.open_questions,
        )
    except Exception as exc:
        logger.error("Error saving PRD for project %s: %s", project_id, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save PRD",
        )

    # Broadcast SSE: prd.updated
    if current_user.team_id is not None:
        await broadcast_to_team(
            str(current_user.team_id),
            {
                "type": "prd.updated",
                "data": {
                    "project_id": str(project_id),
                    "version": prd.version,
                    "updated_by": str(current_user.id),
                },
            },
        )

    return PRDResponse.model_validate(prd)


# ---------------------------------------------------------------------------
# GET /projects/{project_id}/prd/versions
# ---------------------------------------------------------------------------

@router.get(
    "/projects/{project_id}/prd/versions",
    response_model=list[PRDVersionResponse],
    status_code=status.HTTP_200_OK,
    summary="List all PRD versions for a project, newest first",
)
async def list_prd_versions(
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[PRDVersionResponse]:
    await _get_scoped_project(project_id, current_user, db)

    versions = await prd_service.list_prd_versions(db, project_id=project_id)
    return [PRDVersionResponse.model_validate(v) for v in versions]


# ---------------------------------------------------------------------------
# GET /projects/{project_id}/prd/{version}
# ---------------------------------------------------------------------------

@router.get(
    "/projects/{project_id}/prd/{version}",
    response_model=PRDResponse,
    status_code=status.HTTP_200_OK,
    summary="Get a specific PRD version by version number",
)
async def get_prd_by_version(
    project_id: uuid.UUID,
    version: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PRDResponse:
    await _get_scoped_project(project_id, current_user, db)

    prd = await prd_service.get_prd_by_version(db, project_id=project_id, version=version)
    if prd is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"PRD version {version} not found for this project",
        )
    return PRDResponse.model_validate(prd)
