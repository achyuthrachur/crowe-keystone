"""
output.py — output file download router.
"""
import uuid
import logging

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.models.engagement import Engagement
from src.models.keystone_run import KeystoneRun
from src.models.user import User
from src.routers.auth import get_current_user
from src.schemas.output import OutputFilesResponse
from src.services.file_storage import retrieve_output

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/engagements", tags=["output"])


@router.get("/{engagement_id}/output", response_model=OutputFilesResponse)
async def get_output_status(
    engagement_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> OutputFilesResponse:
    run = await _get_completed_run_or_404(db, engagement_id, current_user.team_id)
    base = f"/api/v1/engagements/{engagement_id}/output"
    return OutputFilesResponse(
        engagement_id=str(engagement_id),
        deck_brief_available=bool(run.deck_brief_storage_key),
        deck_handoff_available=bool(run.deck_handoff_storage_key),
        deck_brief_download_url=f"{base}/brief",
        deck_handoff_download_url=f"{base}/handoff",
    )


@router.get("/{engagement_id}/output/brief")
async def download_brief(
    engagement_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Response:
    run = await _get_completed_run_or_404(db, engagement_id, current_user.team_id)
    if not run.deck_brief_storage_key:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Deck brief not yet generated.")
    file_bytes = await retrieve_output(run.deck_brief_storage_key)
    return Response(
        content=file_bytes,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": 'attachment; filename="deck_brief.docx"'},
    )


@router.get("/{engagement_id}/output/handoff")
async def download_handoff(
    engagement_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Response:
    run = await _get_completed_run_or_404(db, engagement_id, current_user.team_id)
    if not run.deck_handoff_storage_key:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Deck handoff not yet generated.")
    file_bytes = await retrieve_output(run.deck_handoff_storage_key)
    return Response(
        content=file_bytes,
        media_type="application/json",
        headers={"Content-Disposition": 'attachment; filename="deck_handoff.json"'},
    )


async def _get_completed_run_or_404(
    db: AsyncSession, engagement_id: uuid.UUID, team_id: uuid.UUID
) -> KeystoneRun:
    result = await db.execute(
        select(Engagement).where(
            Engagement.id == engagement_id, Engagement.team_id == team_id
        )
    )
    if result.scalar_one_or_none() is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Engagement not found.")

    result = await db.execute(
        select(KeystoneRun)
        .where(KeystoneRun.engagement_id == engagement_id)
        .order_by(KeystoneRun.created_at.desc())
        .limit(1)
    )
    run = result.scalar_one_or_none()
    if run is None or run.status != "complete":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Output files are not available. Run must be in 'complete' status.",
        )
    return run
