# Keystone — PRD Phase C1: File Parser + API Routers
> Version 1.0 | Status: Draft | Author: Achyuth Rachur
> Prereq: Phase B HANDOFF.md reports 7 passed / 0 failed, typecheck pass, build pass

---

## Overview

Phase C1 builds the HTTP API layer and file parsing service. No LangGraph,
no LLM calls. When C1 is complete, all four new routers are live and testable
via `/docs`. The graph itself is wired in C2.

Phase C1 deliverables:
1. `backend/src/services/file_parser.py`
2. `backend/src/routers/engagements.py`
3. `backend/src/routers/upload.py`
4. `backend/src/routers/runs.py` (HITL gate endpoints — DB + SSE only, no graph)
5. `backend/src/routers/output.py`
6. `backend/src/main.py` — register 4 routers + crash recovery lifespan step

Exit criteria: `pytest` passes, all endpoints visible in `/docs`, upload +
engagement CRUD manually smoke-testable.

---

## 1. Crash Recovery — main.py lifespan update

Add this block to the `lifespan()` context manager in `backend/src/main.py`,
immediately after `await init_db()`. Do not touch anything else in main.py
except the two import blocks and the four `app.include_router` calls at the end.

```python
# ── Crash recovery — mark interrupted runs as failed on startup ───────────
from datetime import datetime, timezone
from sqlalchemy import select, update as sa_update
from src.database import AsyncSessionLocal
from src.models.keystone_run import KeystoneRun
from src.models.engagement import Engagement

_INTERRUPTED = ("running", "awaiting_review_1", "awaiting_review_2",
                "awaiting_review_3", "compiling")

async with AsyncSessionLocal() as _db:
    _result = await _db.execute(
        select(KeystoneRun).where(KeystoneRun.status.in_(_INTERRUPTED))
    )
    _runs = _result.scalars().all()
    if _runs:
        logger.warning("Startup: marking %d interrupted run(s) as failed.", len(_runs))
        for _run in _runs:
            _run.status = "failed"
            _run.error = "Server restarted while run was in progress. Please re-run."
            _run.completed_at = datetime.now(tz=timezone.utc)
            await _db.execute(
                sa_update(Engagement)
                .where(Engagement.id == _run.engagement_id)
                .values(status="failed")
            )
        await _db.commit()
```

Add new router imports at top of main.py alongside existing router imports:

```python
from src.routers import engagements as engagements_router
from src.routers import upload as upload_router
from src.routers import runs as runs_router
from src.routers import output as output_router
```

Add four include_router calls after the existing team_router line:

```python
app.include_router(engagements_router.router, prefix=API_PREFIX)
app.include_router(upload_router.router, prefix=API_PREFIX)
app.include_router(runs_router.router, prefix=API_PREFIX)
app.include_router(output_router.router, prefix=API_PREFIX)
```

---

## 2. File Parser — backend/src/services/file_parser.py

Supports: `.txt`, `.vtt` (WebVTT — Teams/Zoom/Fireflies), `.srt` (SubRip),
`.json` (Fireflies JSON export), `.pdf` (pypdf), `.docx` (python-docx).

Two public functions:
- `parse_transcript(file_bytes, filename) -> str` — for transcript files
- `parse_document(file_bytes, filename) -> str` — for preread/agenda files

All parsers strip timestamps and format metadata. Speaker labels are preserved
in the format `"Speaker Name: text"` where available.

```python
"""
file_parser.py — transcript and document file parser.

Public API:
    parse_transcript(file_bytes: bytes, filename: str) -> str
    parse_document(file_bytes: bytes, filename: str) -> str
"""
import json
import logging
import re
from pathlib import Path

logger = logging.getLogger(__name__)


def parse_transcript(file_bytes: bytes, filename: str) -> str:
    suffix = Path(filename).suffix.lower()
    if suffix == ".txt":
        return _parse_txt(file_bytes)
    if suffix == ".vtt":
        return _parse_vtt(file_bytes)
    if suffix == ".srt":
        return _parse_srt(file_bytes)
    if suffix == ".json":
        return _parse_fireflies_json(file_bytes)
    if suffix == ".pdf":
        return _parse_pdf(file_bytes)
    if suffix in (".docx", ".doc"):
        return _parse_docx(file_bytes)
    raise ValueError(
        f"Unsupported transcript format: {suffix!r}. "
        "Supported: .txt .vtt .srt .json .pdf .docx"
    )


def parse_document(file_bytes: bytes, filename: str) -> str:
    suffix = Path(filename).suffix.lower()
    if suffix == ".pdf":
        return _parse_pdf(file_bytes)
    if suffix in (".docx", ".doc"):
        return _parse_docx(file_bytes)
    if suffix == ".txt":
        return _parse_txt(file_bytes)
    raise ValueError(
        f"Unsupported document format: {suffix!r}. Supported: .pdf .docx .txt"
    )


# ── .txt ──────────────────────────────────────────────────────────────────────

def _parse_txt(file_bytes: bytes) -> str:
    text = file_bytes.decode("utf-8-sig", errors="replace")
    return text.replace("\r\n", "\n").replace("\r", "\n").strip()


# ── .vtt (WebVTT) ─────────────────────────────────────────────────────────────

_VTT_TS = re.compile(r"^\d{2}:\d{2}:\d{2}\.\d{3}\s+-->\s+\d{2}:\d{2}:\d{2}\.\d{3}")
_VTT_TAG = re.compile(r"<[^>]+>")


def _parse_vtt(file_bytes: bytes) -> str:
    lines = file_bytes.decode("utf-8-sig", errors="replace") \
        .replace("\r\n", "\n").replace("\r", "\n").split("\n")

    output, speaker, parts = [], None, []

    def flush():
        if parts:
            text = " ".join(parts).strip()
            if text:
                output.append(f"{speaker}: {text}" if speaker else text)
            parts.clear()

    for line in lines:
        s = line.strip()
        if not s:
            flush()
            speaker = None
            continue
        if s.startswith("WEBVTT") or s.startswith("NOTE") \
                or s.startswith("STYLE") or s.startswith("REGION"):
            continue
        if _VTT_TS.match(s):
            continue
        if re.match(r"^\d+$", s):
            continue
        # Extract speaker from <v Speaker Name>text</v>
        vm = re.search(r"<v[^>]*\s([^>]+)>", s)
        if vm:
            speaker = vm.group(1).strip()
        clean = _VTT_TAG.sub("", s).strip()
        if clean:
            parts.append(clean)

    flush()
    return "\n".join(output).strip()


# ── .srt (SubRip) ─────────────────────────────────────────────────────────────

_SRT_TS = re.compile(r"^\d{2}:\d{2}:\d{2},\d{3}\s+-->\s+\d{2}:\d{2}:\d{2},\d{3}$")
_SRT_TAG = re.compile(r"<[^>]+>")


def _parse_srt(file_bytes: bytes) -> str:
    lines = file_bytes.decode("utf-8-sig", errors="replace") \
        .replace("\r\n", "\n").replace("\r", "\n").split("\n")
    output = []
    for line in lines:
        s = line.strip()
        if not s or re.match(r"^\d+$", s) or _SRT_TS.match(s):
            continue
        clean = _SRT_TAG.sub("", s).strip()
        if clean:
            output.append(clean)
    return "\n".join(output).strip()


# ── .json (Fireflies) ─────────────────────────────────────────────────────────

def _parse_fireflies_json(file_bytes: bytes) -> str:
    """
    Handles three Fireflies export shapes:
    Shape 1: {"sentences": [{"speaker_name": str, "text": str}]}
    Shape 2: {"data": {"transcript": {"sentences": [...]}}}  (GraphQL export)
    Shape 3: {"transcript": "<plain text>"}
    """
    try:
        data = json.loads(file_bytes.decode("utf-8", errors="replace"))
    except json.JSONDecodeError as exc:
        raise ValueError(f"Invalid JSON: {exc}") from exc

    # Shape 3
    if isinstance(data.get("transcript"), str):
        return data["transcript"].strip()

    # Shape 2
    sentences = None
    if isinstance(data.get("data"), dict):
        nested = data["data"].get("transcript", {})
        if isinstance(nested, dict):
            sentences = nested.get("sentences")

    # Shape 1
    if sentences is None:
        sentences = data.get("sentences")

    if isinstance(sentences, list):
        lines = []
        for s in sentences:
            if not isinstance(s, dict):
                continue
            speaker = (s.get("speaker_name") or "").strip()
            text = (s.get("text") or s.get("raw_text") or "").strip()
            if not text:
                continue
            lines.append(f"{speaker}: {text}" if speaker else text)
        return "\n".join(lines).strip()

    raise ValueError(
        "Unrecognized Fireflies JSON. Expected 'sentences' array or 'transcript' string."
    )


# ── .pdf ──────────────────────────────────────────────────────────────────────

def _parse_pdf(file_bytes: bytes) -> str:
    try:
        from pypdf import PdfReader
        import io
        reader = PdfReader(io.BytesIO(file_bytes))
        pages = [page.extract_text() or "" for page in reader.pages]
        return "\n\n".join(p.strip() for p in pages if p.strip()).strip()
    except Exception as exc:
        raise ValueError(f"Could not parse PDF: {exc}") from exc


# ── .docx ─────────────────────────────────────────────────────────────────────

def _parse_docx(file_bytes: bytes) -> str:
    try:
        from docx import Document
        import io
        doc = Document(io.BytesIO(file_bytes))
        return "\n".join(p.text.strip() for p in doc.paragraphs if p.text.strip()).strip()
    except Exception as exc:
        raise ValueError(f"Could not parse DOCX: {exc}") from exc
```

---

## 3. Engagements Router — backend/src/routers/engagements.py

```
Prefix: /engagements
Auth: all endpoints require get_current_user
Team scoping: every query filters by current_user.team_id
```

| Method | Path | Description |
|--------|------|-------------|
| GET | `/engagements` | List all engagements for the team |
| POST | `/engagements` | Create a new engagement (status: draft) |
| GET | `/engagements/{id}` | Get a single engagement |
| PATCH | `/engagements/{id}` | Update metadata (client_name, industry, date, attendees) |
| DELETE | `/engagements/{id}` | Delete — lead/admin only |

SSE events to broadcast on POST, PATCH, DELETE:
- `keystone.engagement_created` — `{engagement_id, client_name}`
- `keystone.engagement_updated` — `{engagement_id, fields_changed}`
- `keystone.engagement_deleted` — `{engagement_id}`

Synthetic guard: call `check_engagement_name(payload.client_name)` on POST.
Wrap in try/except SyntheticGuardError → HTTP 422 with the guard's message.

```python
"""
engagements.py — CRUD router for Keystone engagements.
"""
import uuid
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.models.engagement import Engagement
from src.models.user import User
from src.routers.auth import get_current_user
from src.routers.stream import broadcast_to_team
from src.schemas.engagement import (
    EngagementCreate, EngagementUpdate,
    EngagementResponse, EngagementListResponse,
)
from src.services.synthetic_guard import check_engagement_name, SyntheticGuardError

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/engagements", tags=["engagements"])


@router.get("", response_model=EngagementListResponse)
async def list_engagements(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> EngagementListResponse:
    result = await db.execute(
        select(Engagement)
        .where(Engagement.team_id == current_user.team_id)
        .order_by(Engagement.created_at.desc())
    )
    engagements = result.scalars().all()
    return EngagementListResponse(
        engagements=[EngagementResponse.model_validate(e) for e in engagements],
        total=len(engagements),
    )


@router.post("", response_model=EngagementResponse, status_code=status.HTTP_201_CREATED)
async def create_engagement(
    payload: EngagementCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> EngagementResponse:
    try:
        check_engagement_name(payload.client_name)
    except SyntheticGuardError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc))

    engagement = Engagement(
        id=uuid.uuid4(),
        team_id=current_user.team_id,
        created_by=current_user.id,
        client_name=payload.client_name,
        client_industry=payload.client_industry,
        engagement_date=payload.engagement_date,
        attendees=payload.attendees,
        status="draft",
    )
    db.add(engagement)
    await db.commit()
    await db.refresh(engagement)

    await broadcast_to_team(str(current_user.team_id), {
        "type": "keystone.engagement_created",
        "data": {"engagement_id": str(engagement.id), "client_name": engagement.client_name},
    })

    return EngagementResponse.model_validate(engagement)


@router.get("/{engagement_id}", response_model=EngagementResponse)
async def get_engagement(
    engagement_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> EngagementResponse:
    engagement = await _get_engagement_or_404(db, engagement_id, current_user.team_id)
    return EngagementResponse.model_validate(engagement)


@router.patch("/{engagement_id}", response_model=EngagementResponse)
async def update_engagement(
    engagement_id: uuid.UUID,
    payload: EngagementUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> EngagementResponse:
    engagement = await _get_engagement_or_404(db, engagement_id, current_user.team_id)

    update_data = payload.model_dump(exclude_none=True)
    if "client_name" in update_data:
        try:
            check_engagement_name(update_data["client_name"])
        except SyntheticGuardError as exc:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc))

    for field, value in update_data.items():
        setattr(engagement, field, value)
    engagement.updated_at = datetime.now(tz=timezone.utc)

    await db.commit()
    await db.refresh(engagement)

    await broadcast_to_team(str(current_user.team_id), {
        "type": "keystone.engagement_updated",
        "data": {"engagement_id": str(engagement.id), "fields_changed": list(update_data.keys())},
    })

    return EngagementResponse.model_validate(engagement)


@router.delete("/{engagement_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_engagement(
    engagement_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    if current_user.role not in ("lead", "admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only leads and admins can delete engagements.")

    engagement = await _get_engagement_or_404(db, engagement_id, current_user.team_id)
    await db.delete(engagement)
    await db.commit()

    await broadcast_to_team(str(current_user.team_id), {
        "type": "keystone.engagement_deleted",
        "data": {"engagement_id": str(engagement_id)},
    })


# ── Helper ────────────────────────────────────────────────────────────────────

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
```

---

## 4. Upload Router — backend/src/routers/upload.py

```
Prefix: /engagements/{engagement_id}/documents
Auth: get_current_user, team scoping
```

| Method | Path | Description |
|--------|------|-------------|
| POST | `/engagements/{id}/documents` | Upload a file (transcript, preread, or agenda) |
| GET | `/engagements/{id}/documents` | List uploaded documents for an engagement |
| DELETE | `/engagements/{id}/documents/{doc_id}` | Delete a document |

Upload rules:
- `doc_type` query param: `transcript | preread | agenda` (required)
- Allowed extensions by type:
  - `transcript`: `.txt .vtt .srt .json .pdf .docx`
  - `preread`: `.pdf .docx .txt`
  - `agenda`: `.pdf .docx .txt`
- Max file size: 10 MB (10_485_760 bytes)
- Call `check_file_content(file_bytes)` from synthetic_guard — wrap in 422
- Call `parse_transcript()` or `parse_document()` from file_parser and store `parsed_text` on the record
- Call `store_upload()` from file_storage — store returned key as `storage_key`
- After a transcript upload, set `engagement.status = "ready"` (if it was `draft` or `uploading`)
- Broadcast `keystone.document_uploaded` SSE: `{engagement_id, doc_id, doc_type, filename}`

```python
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
```

---

## 5. Runs Router — backend/src/routers/runs.py

Phase C1 stubs: all endpoints update the DB and broadcast SSE correctly,
but do not invoke LangGraph yet. C2 replaces the stubs with real graph calls.

```
Prefix: /engagements/{engagement_id}/runs
Auth: get_current_user, team scoping
```

| Method | Path | Description |
|--------|------|-------------|
| POST | `/engagements/{id}/runs` | Start pipeline — creates KeystoneRun, sets status=running |
| GET | `/engagements/{id}/runs/latest` | Get latest run status |
| POST | `/engagements/{id}/runs/latest/gate1` | Submit Gate 1 review |
| POST | `/engagements/{id}/runs/latest/gate2` | Submit Gate 2 review |
| POST | `/engagements/{id}/runs/latest/gate3` | Submit Gate 3 review |

SSE events:
- Start: `keystone.status_changed` `{engagement_id, old_status, new_status: "running"}`
- Gate submits: `keystone.status_changed` `{engagement_id, old_status, new_status: "running"}`

Push notification: broadcast a web push (using existing push infrastructure)
at each HITL gate. Call it after the SSE broadcast.
Event text: `"[ClientName] — Gate N ready for review"`

Start run validations:
- Engagement must be `status=ready` — 409 if not
- Must have at least one document with `doc_type=transcript` — 400 if not

Gate validations:
- Run must be in the expected `awaiting_review_N` status — 409 if not

```python
"""
runs.py — pipeline start and HITL gate endpoints.

C1 note: graph invocation is stubbed. C2 wires in the real LangGraph calls.
"""
import uuid
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.models.engagement import Engagement
from src.models.keystone_run import KeystoneRun
from src.models.uploaded_document import UploadedDocument
from src.models.user import User
from src.routers.auth import get_current_user
from src.routers.stream import broadcast_to_team
from src.schemas.runs import (
    StartRunResponse, RunStatusResponse,
    Gate1ReviewRequest, Gate2ReviewRequest, Gate3ReviewRequest,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/engagements", tags=["runs"])


@router.post(
    "/{engagement_id}/runs",
    response_model=StartRunResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def start_run(
    engagement_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> StartRunResponse:
    engagement = await _get_engagement_or_404(db, engagement_id, current_user.team_id)

    if engagement.status != "ready":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Engagement must be in 'ready' status to start a run (current: {engagement.status!r}).",
        )

    # Verify transcript exists
    result = await db.execute(
        select(UploadedDocument).where(
            UploadedDocument.engagement_id == engagement_id,
            UploadedDocument.doc_type == "transcript",
        )
    )
    if result.scalar_one_or_none() is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No transcript document found. Upload a transcript before starting the pipeline.",
        )

    run = KeystoneRun(
        id=uuid.uuid4(),
        engagement_id=engagement_id,
        triggered_by=current_user.id,
        status="running",
    )
    db.add(run)
    engagement.status = "running"
    engagement.updated_at = datetime.now(tz=timezone.utc)
    await db.commit()
    await db.refresh(run)

    await broadcast_to_team(str(current_user.team_id), {
        "type": "keystone.status_changed",
        "data": {
            "engagement_id": str(engagement_id),
            "old_status": "ready",
            "new_status": "running",
        },
    })

    # TODO (C2): replace this stub with real graph invocation
    # background_tasks.add_task(_invoke_graph, run_id=str(run.id), ...)

    return StartRunResponse(
        run_id=run.id,
        engagement_id=engagement_id,
        status="running",
    )


@router.get("/{engagement_id}/runs/latest", response_model=RunStatusResponse)
async def get_latest_run(
    engagement_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> RunStatusResponse:
    await _get_engagement_or_404(db, engagement_id, current_user.team_id)
    result = await db.execute(
        select(KeystoneRun)
        .where(KeystoneRun.engagement_id == engagement_id)
        .order_by(KeystoneRun.created_at.desc())
        .limit(1)
    )
    run = result.scalar_one_or_none()
    if run is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No runs found for this engagement.")

    graph_state = run.graph_state or {}
    return RunStatusResponse(
        run_id=run.id,
        engagement_id=engagement_id,
        status=run.status,
        current_node=graph_state.get("current_node"),
        error=run.error,
        created_at=run.created_at,
        completed_at=run.completed_at,
    )


@router.post("/{engagement_id}/runs/latest/gate1", response_model=RunStatusResponse)
async def submit_gate1(
    engagement_id: uuid.UUID,
    payload: Gate1ReviewRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> RunStatusResponse:
    engagement, run = await _get_engagement_and_run(db, engagement_id, current_user.team_id)
    _assert_run_status(run, "awaiting_review_1")

    graph_state = run.graph_state or {}
    graph_state["gate1_approved"] = True
    graph_state["gate1_restored_segments"] = payload.restored_segment_ids
    run.graph_state = graph_state
    run.status = "running"
    engagement.status = "running"
    engagement.updated_at = datetime.now(tz=timezone.utc)
    await db.commit()

    await broadcast_to_team(str(current_user.team_id), {
        "type": "keystone.status_changed",
        "data": {"engagement_id": str(engagement_id), "old_status": "awaiting_review_1", "new_status": "running"},
    })
    await _push_gate_notification(engagement, 1, current_user.team_id, db)

    # TODO (C2): resume graph from checkpoint

    return RunStatusResponse(
        run_id=run.id, engagement_id=engagement_id,
        status=run.status, current_node=graph_state.get("current_node"),
        error=run.error, created_at=run.created_at, completed_at=run.completed_at,
    )


@router.post("/{engagement_id}/runs/latest/gate2", response_model=RunStatusResponse)
async def submit_gate2(
    engagement_id: uuid.UUID,
    payload: Gate2ReviewRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> RunStatusResponse:
    engagement, run = await _get_engagement_and_run(db, engagement_id, current_user.team_id)
    _assert_run_status(run, "awaiting_review_2")

    graph_state = run.graph_state or {}
    graph_state["gate2_approved"] = True
    graph_state["final_glossary"] = [g.model_dump() for g in payload.glossary]
    run.graph_state = graph_state
    run.status = "running"
    engagement.status = "running"
    engagement.updated_at = datetime.now(tz=timezone.utc)
    await db.commit()

    await broadcast_to_team(str(current_user.team_id), {
        "type": "keystone.status_changed",
        "data": {"engagement_id": str(engagement_id), "old_status": "awaiting_review_2", "new_status": "running"},
    })
    await _push_gate_notification(engagement, 2, current_user.team_id, db)

    # TODO (C2): resume graph from checkpoint

    return RunStatusResponse(
        run_id=run.id, engagement_id=engagement_id,
        status=run.status, current_node=graph_state.get("current_node"),
        error=run.error, created_at=run.created_at, completed_at=run.completed_at,
    )


@router.post("/{engagement_id}/runs/latest/gate3", response_model=RunStatusResponse)
async def submit_gate3(
    engagement_id: uuid.UUID,
    payload: Gate3ReviewRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> RunStatusResponse:
    engagement, run = await _get_engagement_and_run(db, engagement_id, current_user.team_id)
    _assert_run_status(run, "awaiting_review_3")

    graph_state = run.graph_state or {}
    graph_state["gate3_approved"] = True
    graph_state["final_outline"] = payload.outline.model_dump()
    run.graph_state = graph_state
    run.status = "compiling"
    engagement.status = "compiling"
    engagement.updated_at = datetime.now(tz=timezone.utc)
    await db.commit()

    await broadcast_to_team(str(current_user.team_id), {
        "type": "keystone.status_changed",
        "data": {"engagement_id": str(engagement_id), "old_status": "awaiting_review_3", "new_status": "compiling"},
    })
    await _push_gate_notification(engagement, 3, current_user.team_id, db)

    # TODO (C2): resume graph from checkpoint

    return RunStatusResponse(
        run_id=run.id, engagement_id=engagement_id,
        status=run.status, current_node=graph_state.get("current_node"),
        error=run.error, created_at=run.created_at, completed_at=run.completed_at,
    )


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _get_engagement_or_404(
    db: AsyncSession, engagement_id: uuid.UUID, team_id: uuid.UUID
) -> Engagement:
    result = await db.execute(
        select(Engagement).where(
            Engagement.id == engagement_id, Engagement.team_id == team_id
        )
    )
    e = result.scalar_one_or_none()
    if e is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Engagement not found.")
    return e


async def _get_engagement_and_run(
    db: AsyncSession, engagement_id: uuid.UUID, team_id: uuid.UUID
) -> tuple[Engagement, KeystoneRun]:
    engagement = await _get_engagement_or_404(db, engagement_id, team_id)
    result = await db.execute(
        select(KeystoneRun)
        .where(KeystoneRun.engagement_id == engagement_id)
        .order_by(KeystoneRun.created_at.desc())
        .limit(1)
    )
    run = result.scalar_one_or_none()
    if run is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No runs found.")
    return engagement, run


def _assert_run_status(run: KeystoneRun, expected: str) -> None:
    if run.status != expected:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Run must be in '{expected}' status (current: {run.status!r}).",
        )


async def _push_gate_notification(
    engagement: Engagement, gate_num: int, team_id: uuid.UUID, db: AsyncSession
) -> None:
    """Send web push notification to all team members that a gate is ready."""
    try:
        from src.models.push_subscription import PushSubscription
        from src.routers.push import send_push_notification

        result = await db.execute(
            select(PushSubscription).where(PushSubscription.team_id == team_id)
        )
        subscriptions = result.scalars().all()
        for sub in subscriptions:
            await send_push_notification(
                subscription_info={
                    "endpoint": sub.endpoint,
                    "keys": {"p256dh": sub.p256dh, "auth": sub.auth},
                },
                title=f"Keystone — Gate {gate_num} Ready",
                body=f"{engagement.client_name} — Gate {gate_num} is ready for review.",
            )
    except Exception as exc:
        logger.warning("Gate push notification failed (non-fatal): %s", exc)
```

---

## 6. Output Router — backend/src/routers/output.py

```
Prefix: /engagements/{engagement_id}/output
Auth: get_current_user, team scoping
```

| Method | Path | Description |
|--------|------|-------------|
| GET | `/engagements/{id}/output` | Check if output files are available |
| GET | `/engagements/{id}/output/brief` | Download `deck_brief.docx` |
| GET | `/engagements/{id}/output/handoff` | Download `deck_handoff.json` |

```python
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
        headers={"Content-Disposition": f'attachment; filename="deck_brief.docx"'},
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
        headers={"Content-Disposition": f'attachment; filename="deck_handoff.json"'},
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
```

---

## 7. Push Notification Helper

The `_push_gate_notification` function in `runs.py` calls
`send_push_notification()` from `src.routers.push`. Verify that function
exists and has a compatible signature before C1 is complete. If the existing
push router exposes only a route handler (not a standalone callable), extract
the send logic into a helper or call the pywebpush library directly:

```python
# Fallback — call pywebpush directly if send_push_notification isn't importable
from pywebpush import webpush, WebPushException
from src.config import settings

webpush(
    subscription_info=subscription_info,
    data=json.dumps({"title": title, "body": body}),
    vapid_private_key=settings.VAPID_PRIVATE_KEY,
    vapid_claims={"sub": f"mailto:{settings.VAPID_CONTACT}"},
)
```

---

## 8. Update agents.py

Fill `_VALID_AGENT_TYPES` in `backend/src/routers/agents.py`:

```python
_VALID_AGENT_TYPES: set[str] = {"keystone_pipeline"}
```

---

## 9. Verification Checklist

Run in order. All must pass before writing HANDOFF.md and starting C2.

```bash
cd backend
source venv/Scripts/activate   # Windows: venv\Scripts\activate

# 1. pytest
python -m pytest tests/ -x --tb=short

# 2. Start server and verify /docs shows all new endpoints
uvicorn src.main:app --workers 1 --port 8000 --reload
# Open http://localhost:8000/docs
# Confirm these tag groups appear: engagements, upload, runs, output

# 3. Smoke test via /docs (manual):
#    POST /api/v1/engagements  → 201
#    GET  /api/v1/engagements  → 200 with list
#    POST /api/v1/engagements/{id}/documents?doc_type=transcript  → upload a .txt → 201
#    POST /api/v1/engagements/{id}/runs  → 202

# 4. Frontend typecheck (no new frontend files — should still pass clean)
cd ../frontend && npm run typecheck
```
