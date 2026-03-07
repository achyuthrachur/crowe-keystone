"""
Approvals router.

GET  /approvals          — pending approvals for the current user
GET  /approvals/all      — all team approvals (leads/admins only)
GET  /approvals/{id}     — single approval detail
POST /approvals/{id}/decide — record an approve / reject / changes_requested decision
"""

from __future__ import annotations

import asyncio
import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.models.user import User
from src.routers.auth import get_current_user
from src.routers.stream import broadcast_to_team
from src.schemas.approval import ApprovalDecision, ApprovalListItem, ApprovalResponse
from src.services import approval_service, push_service
from src.services.project_service import get_project

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/approvals", tags=["approvals"])


@router.get(
    "",
    response_model=list[ApprovalListItem],
    status_code=status.HTTP_200_OK,
    summary="List pending approvals assigned to the current user",
)
async def list_my_approvals(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[ApprovalListItem]:
    try:
        approvals = await approval_service.get_pending_approvals(db, user_id=current_user.id)
        return [ApprovalListItem.model_validate(a) for a in approvals]
    except Exception as exc:
        logger.error("Error listing approvals for user %s: %s", current_user.id, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve approvals",
        )


@router.get(
    "/all",
    response_model=list[ApprovalListItem],
    status_code=status.HTTP_200_OK,
    summary="List all team approvals — leads and admins only",
)
async def list_all_team_approvals(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[ApprovalListItem]:
    if current_user.role not in ("lead", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only leads and admins can view all team approvals",
        )
    if current_user.team_id is None:
        return []

    try:
        approvals = await approval_service.get_all_team_approvals(
            db, team_id=current_user.team_id
        )
        return [ApprovalListItem.model_validate(a) for a in approvals]
    except Exception as exc:
        logger.error("Error listing all approvals for team %s: %s", current_user.team_id, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve team approvals",
        )


@router.get(
    "/{approval_id}",
    response_model=ApprovalResponse,
    status_code=status.HTTP_200_OK,
    summary="Get a single approval by ID",
)
async def get_approval_by_id(
    approval_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ApprovalResponse:
    if current_user.team_id is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Approval not found")

    try:
        approval = await approval_service.get_approval(
            db, approval_id=approval_id, team_id=current_user.team_id
        )
    except Exception as exc:
        logger.error("Error fetching approval %s: %s", approval_id, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve approval",
        )

    if approval is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Approval not found")

    return ApprovalResponse.model_validate(approval)


@router.post(
    "/{approval_id}/decide",
    response_model=ApprovalResponse,
    status_code=status.HTTP_200_OK,
    summary="Record an approval decision (approve / reject / changes_requested)",
)
async def decide_on_approval(
    approval_id: uuid.UUID,
    body: ApprovalDecision,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ApprovalResponse:
    if current_user.team_id is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Approval not found")

    # Verify the approval exists and belongs to this team
    existing = await approval_service.get_approval(
        db, approval_id=approval_id, team_id=current_user.team_id
    )
    if existing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Approval not found")

    # Only assigned reviewers (or leads/admins) may decide
    user_id_str = str(current_user.id)
    is_assigned = user_id_str in (existing.assigned_to or [])
    is_privileged = current_user.role in ("lead", "admin")
    if not is_assigned and not is_privileged:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not assigned to this approval",
        )

    # Reject deciding on an already-resolved approval
    if existing.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Approval is already {existing.status} and cannot be re-decided",
        )

    try:
        approval = await approval_service.decide_approval(
            db,
            approval_id=approval_id,
            user_id=current_user.id,
            decision=body.decision,
            note=body.note,
        )
    except Exception as exc:
        logger.error("Error deciding approval %s: %s", approval_id, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to record decision",
        )

    if approval is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Approval not found")

    team_id = str(current_user.team_id)

    # --- Broadcast approval.decided SSE ---
    await broadcast_to_team(
        team_id,
        {
            "type": "approval.decided",
            "data": {
                "approval_id": str(approval.id),
                "project_id": str(approval.project_id),
                "decision": body.decision,
                "decided_by": str(current_user.id),
            },
        },
    )

    # --- If approval is now fully approved, advance the project stage ---
    if approval.status == "approved":
        try:
            from src.services.stage_service import VALID_TRANSITIONS

            project = await get_project(
                db, project_id=approval.project_id, team_id=current_user.team_id
            )
            if project is not None:
                current_stage = project.stage
                possible_next = VALID_TRANSITIONS.get(current_stage, [])

                # The target stage is the first valid transition from the current stage
                # that requires approval (only one such transition exists per stage).
                # For review → approved, we advance to 'approved'.
                # For draft_prd → review, we advance to 'review'.
                if possible_next:
                    target_stage = possible_next[0]
                    now = datetime.now(timezone.utc)
                    history_entry = {
                        "stage": target_stage,
                        "timestamp": now.isoformat(),
                        "actor_id": str(current_user.id),
                        "note": f"Stage advanced via approval {approval.id}",
                    }
                    project.stage = target_stage
                    project.stage_history = list(project.stage_history or []) + [history_entry]
                    project.updated_at = now
                    await db.flush()
                    await db.refresh(project)

                    await broadcast_to_team(
                        team_id,
                        {
                            "type": "project.stage_changed",
                            "data": {
                                "project_id": str(project.id),
                                "title": project.title,
                                "new_stage": target_stage,
                                "old_stage": current_stage,
                                "actor_name": current_user.name,
                            },
                        },
                    )
                    logger.info(
                        "Project %s advanced %s → %s via approval %s",
                        project.id,
                        current_stage,
                        target_stage,
                        approval.id,
                    )
        except Exception as exc:
            logger.error(
                "Error advancing project stage after approval %s: %s", approval.id, exc
            )
            # Non-fatal: the decision was recorded; log and continue.

    return ApprovalResponse.model_validate(approval)
