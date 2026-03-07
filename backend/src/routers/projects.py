import asyncio
import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.models.user import User
from src.routers.auth import get_current_user
from src.routers.stream import broadcast_to_team
from src.schemas.approval import ApprovalResponse
from src.schemas.project import ProjectCreate, ProjectListItem, ProjectResponse, ProjectUpdate
from src.services import approval_service, push_service
from src.services.project_service import (
    archive_project,
    create_project,
    get_project,
    get_projects,
    update_project,
)
from src.services.stage_service import (
    get_approval_chain,
    requires_approval,
    validate_transition,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/projects", tags=["projects"])


# ---------------------------------------------------------------------------
# Request body schemas (defined here to keep the router self-contained)
# ---------------------------------------------------------------------------

class StageAdvanceRequest(BaseModel):
    target_stage: str
    note: str | None = None


class StageAdvanceResponse(BaseModel):
    project: ProjectResponse
    approval_id: str | None = None
    requires_approval: bool = False


class BuildLogRequest(BaseModel):
    raw_notes: str
    source: str  # "manual" | "github" | "agent"


class BuildLogResponse(BaseModel):
    run_id: str


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


@router.post(
    "/{project_id}/advance",
    response_model=StageAdvanceResponse,
    status_code=status.HTTP_200_OK,
    summary="Advance a project to the next stage — creates an approval if required",
)
async def advance_project_stage(
    project_id: uuid.UUID,
    body: StageAdvanceRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> StageAdvanceResponse:
    if current_user.team_id is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    project = await get_project(db, project_id=project_id, team_id=current_user.team_id)
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    # Validate the requested transition
    if not validate_transition(project.stage, body.target_stage):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                f"Invalid stage transition: '{project.stage}' → '{body.target_stage}'. "
                f"This transition is not permitted."
            ),
        )

    team_id_str = str(current_user.team_id)

    try:
        if requires_approval(body.target_stage):
            # --- Approval path: create an approval record, do NOT advance yet ---
            assigned_to = await get_approval_chain(project, db)

            request_summary = (
                body.note
                or f"Stage advance requested: {project.stage} → {body.target_stage} "
                   f"for project '{project.title}'"
            )
            # Truncate to 120 words per PRD spec
            words = request_summary.split()
            if len(words) > 120:
                request_summary = " ".join(words[:120]) + "..."

            approval = await approval_service.create_approval(
                db,
                project_id=project.id,
                prd_id=project.prd_id,
                type="stage_advance",
                requested_by=current_user.id,
                assigned_to=assigned_to,
                request_summary=request_summary,
            )

            # Broadcast SSE: approval.requested
            await broadcast_to_team(
                team_id_str,
                {
                    "type": "approval.requested",
                    "data": {
                        "approval_id": str(approval.id),
                        "project_id": str(project.id),
                        "project_title": project.title,
                        "type": "stage_advance",
                        "summary": request_summary,
                        "deadline": approval.deadline.isoformat() if approval.deadline else None,
                    },
                },
            )

            # Fire push notifications 500ms after SSE (one per assigned reviewer)
            async def _send_push() -> None:
                await asyncio.sleep(0.5)
                for user_id_str in assigned_to:
                    try:
                        import uuid as _uuid
                        assignee_uuid = _uuid.UUID(user_id_str)
                        await push_service.notify_approval_requested(
                            db,
                            user_id=assignee_uuid,
                            project_title=project.title,
                            approval_id=str(approval.id),
                        )
                    except Exception as push_exc:
                        logger.error(
                            "Push notify failed for user %s approval %s: %s",
                            user_id_str,
                            approval.id,
                            push_exc,
                        )

            asyncio.create_task(_send_push())

            return StageAdvanceResponse(
                project=ProjectResponse.model_validate(project),
                approval_id=str(approval.id),
                requires_approval=True,
            )

        else:
            # --- Immediate advance: no approval needed ---
            old_stage = project.stage
            now = datetime.now(timezone.utc)
            history_entry = {
                "stage": body.target_stage,
                "timestamp": now.isoformat(),
                "actor_id": str(current_user.id),
                "note": body.note or f"Advanced to {body.target_stage}",
            }
            project.stage = body.target_stage
            project.stage_history = list(project.stage_history or []) + [history_entry]
            project.updated_at = now
            await db.flush()
            await db.refresh(project)

            # Broadcast SSE: project.stage_changed
            await broadcast_to_team(
                team_id_str,
                {
                    "type": "project.stage_changed",
                    "data": {
                        "project_id": str(project.id),
                        "title": project.title,
                        "new_stage": body.target_stage,
                        "old_stage": old_stage,
                        "actor_name": current_user.name,
                    },
                },
            )

            logger.info(
                "Project %s advanced %s → %s by user %s",
                project.id,
                old_stage,
                body.target_stage,
                current_user.id,
            )

            return StageAdvanceResponse(
                project=ProjectResponse.model_validate(project),
                approval_id=None,
                requires_approval=False,
            )

    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Error advancing project %s stage: %s", project_id, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to advance project stage",
        )


@router.post(
    "/{project_id}/build-log",
    response_model=BuildLogResponse,
    status_code=status.HTTP_200_OK,
    summary="Submit raw build notes — triggers update_writer agent (Phase 6 stub)",
)
async def add_build_log(
    project_id: uuid.UUID,
    body: BuildLogRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> BuildLogResponse:
    if current_user.team_id is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    project = await get_project(db, project_id=project_id, team_id=current_user.team_id)
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    # Phase 6 stub: agent wiring not yet implemented.
    # In Phase 6 this will: create an agent_run record, spawn the update_writer
    # LangGraph graph asynchronously, and return the real run_id.
    logger.info(
        "Build log received for project %s source=%s length=%d chars (agent stub)",
        project_id,
        body.source,
        len(body.raw_notes),
    )
    return BuildLogResponse(run_id="stub")
