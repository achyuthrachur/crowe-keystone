import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.models.user import User
from src.routers.auth import get_current_user
from src.schemas.project import ProjectCreate, ProjectListItem, ProjectResponse, ProjectUpdate
from src.services.project_service import (
    archive_project,
    create_project,
    get_project,
    get_projects,
    update_project,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/projects", tags=["projects"])


@router.get(
    "",
    response_model=list[ProjectListItem],
    status_code=status.HTTP_200_OK,
    summary="List all non-archived projects for the current user's team",
)
async def list_projects(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[ProjectListItem]:
    if current_user.team_id is None:
        return []
    projects = await get_projects(db, team_id=current_user.team_id)
    return [ProjectListItem.model_validate(p) for p in projects]


@router.post(
    "",
    response_model=ProjectResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new project starting in the 'spark' stage",
)
async def create_new_project(
    body: ProjectCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ProjectResponse:
    if current_user.team_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User must belong to a team to create projects",
        )

    project = await create_project(
        db,
        team_id=current_user.team_id,
        user_id=current_user.id,
        data=body,
    )
    return ProjectResponse.model_validate(project)


@router.get(
    "/{project_id}",
    response_model=ProjectResponse,
    status_code=status.HTTP_200_OK,
    summary="Get a project by ID — must belong to current user's team",
)
async def get_project_by_id(
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ProjectResponse:
    if current_user.team_id is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    project = await get_project(db, project_id=project_id, team_id=current_user.team_id)
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    return ProjectResponse.model_validate(project)


@router.patch(
    "/{project_id}",
    response_model=ProjectResponse,
    status_code=status.HTTP_200_OK,
    summary="Update editable project fields (title, description, assigned_to, stack, effort_estimate)",
)
async def patch_project(
    project_id: uuid.UUID,
    body: ProjectUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ProjectResponse:
    if current_user.team_id is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    project = await update_project(
        db,
        project_id=project_id,
        team_id=current_user.team_id,
        data=body,
    )
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    return ProjectResponse.model_validate(project)


@router.delete(
    "/{project_id}/archive",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Archive a project (soft delete)",
)
async def archive_project_endpoint(
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    if current_user.team_id is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    success = await archive_project(
        db, project_id=project_id, team_id=current_user.team_id
    )
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
