"""
Project service layer.

All database access for projects is centralised here.
Routers call these functions; they never access the DB directly.
"""

import logging
import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.project import Project
from src.schemas.project import ProjectCreate, ProjectUpdate

logger = logging.getLogger(__name__)


async def get_projects(
    db: AsyncSession,
    team_id: uuid.UUID,
    include_archived: bool = False,
) -> list[Project]:
    """Return all projects for a team, optionally including archived ones."""
    stmt = select(Project).where(Project.team_id == team_id)
    if not include_archived:
        stmt = stmt.where(Project.archived.is_(False))
    stmt = stmt.order_by(Project.updated_at.desc())
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_project(
    db: AsyncSession,
    project_id: uuid.UUID,
    team_id: uuid.UUID,
) -> Project | None:
    """Return a single project by ID, validating team ownership.

    Returns None if the project doesn't exist or belongs to a different team.
    """
    result = await db.execute(
        select(Project).where(
            Project.id == project_id,
            Project.team_id == team_id,
            Project.archived.is_(False),
        )
    )
    return result.scalar_one_or_none()


async def create_project(
    db: AsyncSession,
    team_id: uuid.UUID,
    user_id: uuid.UUID,
    data: ProjectCreate,
) -> Project:
    """Create a new project in the 'spark' stage.

    Adds an initial stage_history entry recording the creation.
    """
    now = datetime.now(timezone.utc)
    initial_history_entry = {
        "stage": "spark",
        "timestamp": now.isoformat(),
        "actor_id": str(user_id),
        "note": "Project created",
    }

    project = Project(
        team_id=team_id,
        created_by=user_id,
        title=data.title,
        description=data.description,
        spark_content=data.spark_content,
        stage="spark",
        stage_history=[initial_history_entry],
        build_log=[],
        metadata_={},
        archived=False,
    )
    db.add(project)
    await db.flush()
    await db.refresh(project)
    logger.info("Created project id=%s title=%r for team=%s", project.id, project.title, team_id)
    return project


async def update_project(
    db: AsyncSession,
    project_id: uuid.UUID,
    team_id: uuid.UUID,
    data: ProjectUpdate,
) -> Project | None:
    """Update editable fields on a project.

    Only fields explicitly set in the request body are modified.
    Returns None if the project doesn't exist or belongs to a different team.
    """
    project = await get_project(db, project_id=project_id, team_id=team_id)
    if project is None:
        return None

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(project, field, value)

    project.updated_at = datetime.now(timezone.utc)
    await db.flush()
    await db.refresh(project)
    logger.info("Updated project id=%s fields=%s", project_id, list(update_data.keys()))
    return project


async def archive_project(
    db: AsyncSession,
    project_id: uuid.UUID,
    team_id: uuid.UUID,
) -> bool:
    """Soft-delete a project by setting archived=True.

    Returns True if the project was found and archived, False otherwise.
    """
    result = await db.execute(
        select(Project).where(
            Project.id == project_id,
            Project.team_id == team_id,
        )
    )
    project = result.scalar_one_or_none()
    if project is None:
        return False

    project.archived = True
    project.updated_at = datetime.now(timezone.utc)
    await db.flush()
    logger.info("Archived project id=%s", project_id)
    return True
