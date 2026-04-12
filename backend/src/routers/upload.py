"""
upload.py — file upload router for Keystone engagements.
"""
import uuid
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.models.engagement import Engagement
from src.models.uploaded_document import UploadedDocument
from src.models.user import User
from src.routers.auth import get_current_user
from src.routers.stream import broadcast_to_team
from src.schemas.upload import UploadedDocumentResponse
from src.services.file_parser import parse_transcript, parse_document
from src.services.file_storage import store_upload
from src.services.synthetic_guard import check_file_content, SyntheticGuardError

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/engagements", tags=["upload"])

MAX_FILE_BYTES = 10 * 1024 * 1024  # 10 MB

_ALLOWED_EXTENSIONS = {
    "transcript": {".txt", ".vtt", ".srt", ".json", ".pdf", ".docx"},
    "preread":    {".pdf", ".docx", ".txt"},
    "agenda":     {".pdf", ".docx", ".txt"},
}


@router.post(
    "/{engagement_id}/documents",
    response_model=UploadedDocumentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_document(
    engagement_id: uuid.UUID,
    doc_type: str = Query(..., pattern="^(transcript|preread|agenda)$"),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> UploadedDocumentResponse:
    engagement = await _get_engagement_or_404(db, engagement_id, current_user.team_id)

    # Extension check
    filename = file.filename or "upload"
    suffix = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if suffix not in _ALLOWED_EXTENSIONS[doc_type]:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"File type {suffix!r} not allowed for doc_type={doc_type!r}.",
        )

    # Read bytes + size check
    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File exceeds 10 MB limit.",
        )

    # Synthetic guard
    try:
        check_file_content(file_bytes)
    except SyntheticGuardError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc))

    # Parse text
    try:
        if doc_type == "transcript":
            parsed_text = parse_transcript(file_bytes, filename)
        else:
            parsed_text = parse_document(file_bytes, filename)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc))

    # Store file
    storage_key = await store_upload(file_bytes, filename, str(engagement_id))

    # Persist document record
    doc = UploadedDocument(
        id=uuid.uuid4(),
        engagement_id=engagement_id,
        uploaded_by=current_user.id,
        doc_type=doc_type,
        original_filename=filename,
        storage_key=storage_key,
        file_size_bytes=len(file_bytes),
        parsed_text=parsed_text,
    )
    db.add(doc)

    # Advance engagement status when transcript is uploaded
    if doc_type == "transcript" and engagement.status in ("draft", "uploading"):
        engagement.status = "ready"
        engagement.updated_at = datetime.now(tz=timezone.utc)
    elif engagement.status == "draft":
        engagement.status = "uploading"
        engagement.updated_at = datetime.now(tz=timezone.utc)

    await db.commit()
    await db.refresh(doc)

    await broadcast_to_team(str(current_user.team_id), {
        "type": "keystone.document_uploaded",
        "data": {
            "engagement_id": str(engagement_id),
            "doc_id": str(doc.id),
            "doc_type": doc_type,
            "filename": filename,
        },
    })

    return UploadedDocumentResponse.model_validate(doc)


@router.get("/{engagement_id}/documents", response_model=list[UploadedDocumentResponse])
async def list_documents(
    engagement_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[UploadedDocumentResponse]:
    await _get_engagement_or_404(db, engagement_id, current_user.team_id)
    result = await db.execute(
        select(UploadedDocument)
        .where(UploadedDocument.engagement_id == engagement_id)
        .order_by(UploadedDocument.created_at)
    )
    docs = result.scalars().all()
    return [UploadedDocumentResponse.model_validate(d) for d in docs]


@router.delete("/{engagement_id}/documents/{doc_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    engagement_id: uuid.UUID,
    doc_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    await _get_engagement_or_404(db, engagement_id, current_user.team_id)
    result = await db.execute(
        select(UploadedDocument).where(
            UploadedDocument.id == doc_id,
            UploadedDocument.engagement_id == engagement_id,
        )
    )
    doc = result.scalar_one_or_none()
    if doc is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")
    await db.delete(doc)
    await db.commit()


async def _get_engagement_or_404(
    db: AsyncSession, engagement_id: uuid.UUID, team_id: uuid.UUID
) -> Engagement:
    result = await db.execute(
        select(Engagement).where(
            Engagement.id == engagement_id,
            Engagement.team_id == team_id,
        )
    )
    engagement = result.scalar_one_or_none()
    if engagement is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Engagement not found.")
    return engagement
