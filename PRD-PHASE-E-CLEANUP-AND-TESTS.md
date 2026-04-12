# Keystone — PRD Phase E: Cleanup + Test Coverage
> Version 1.0 | Status: Draft | Author: Achyuth Rachur
> Prereq: Phase D5 HANDOFF.md — full end-to-end journey completable in browser

---

## Overview

Phase E has no new features. It fixes four problems that accumulated across
phases C and D:

1. **Stale files** — 7 old service files and 9 old prompt files from the
   original Keystone codebase were never deleted during Phase A.
2. **Stale comments** — several C-phase files still contain "TODO C2/C3" notes
   that are no longer accurate now that those phases are complete.
3. **Zero test coverage** — only 7 tests exist, all from Phase 1 (auth, health,
   push, migration). Nothing tests the 4 new routers, file parser, or builders.
4. **CONTEXT.md is 4 phases out of date** — still shows C1 as "next" and D
   as "not yet written."

Phase E deliverables:
1. Delete 7 stale service files + 9 stale prompt files
2. Fix stale comments in 3 backend source files
3. `backend/tests/test_file_parser.py` — 12 unit tests, no DB required
4. `backend/tests/test_engagements.py` — 8 integration tests
5. `backend/tests/test_upload.py` — 7 integration tests
6. `backend/tests/test_runs.py` — 8 integration tests
7. `backend/tests/test_output.py` — 4 integration tests
8. `CONTEXT.md` — full rewrite to reflect true current state

Exit criteria: `pytest` passes with ≥ 44 tests (7 existing + 39 new),
`npm run typecheck` passes, `npm run build` passes, `CONTEXT.md` accurately
describes the current codebase.

---

## 1. Delete Stale Files

Delete all of the following. They are leftovers from the original Keystone
codebase that Phase A was supposed to remove. Nothing in the current codebase
imports them — confirm with a grep before deleting if in doubt.

**Stale service files** (backend/src/services/):
```
approval_service.py
conflict_service.py
email_service.py
prd_service.py
project_service.py
stage_service.py
vercel_service.py
```

**Stale prompt files** (backend/src/graph/prompts/):
```
approval_router.md
assumption_excavator.md
brief_generator.md
conflict_detector.md
memory_indexer.md
prd_drafter.md
retro_generator.md
stress_tester.md
update_writer.md
```

**Stale node file** (backend/src/graph/nodes/):
```
human_checkpoint.py   ← old HITL pattern, replaced by interrupt_before in keystone_graph.py
```

After deletion, run `python -m pytest tests/ -x --tb=short` and verify still
7 passed / 0 failed before proceeding.

---

## 2. Fix Stale Comments

### 2.1 backend/src/graph/nodes/brief_compiler.py

Remove the stale C2/C3 stub comments. The real builders are already in place.

Find and remove these two comment lines:
```python
        # C2: stub builders — replaced by real implementations in C3
```
and the two trailing inline comments:
```python
        docx_bytes = build_docx(state)   # returns bytes
        json_bytes = build_json(state)   # returns bytes
```
Replace with clean lines (no comments needed):
```python
        docx_bytes = build_docx(state)
        json_bytes = build_json(state)
```

Also update the module docstring — remove the line:
```
In Phase C2, docx_builder and json_builder are stubs.
Phase C3 implements the real builders.
```

### 2.2 backend/src/routers/runs.py

Remove the module docstring line:
```
C1 note: graph invocation is stubbed. C2 wires in the real LangGraph calls.
```

### 2.3 backend/src/routers/engagements.py (if present)

Check for any `# EMPTY — Phase C builds` or similar stale comments and remove them.

---

## 3. Test Infrastructure Notes

All new tests follow the exact same pattern as `tests/test_phase1.py`:
- Real Neon PostgreSQL via `DATABASE_URL` from `.env`
- `ASGITransport` + `AsyncClient` from httpx
- `auth_client` fixture from `conftest.py` (already exists — import it)
- `asyncio_mode = "auto"` is set in pyproject.toml — `@pytest.mark.asyncio`
  decorator is optional but keep it for clarity, matching existing tests
- All tests that create DB rows must clean up after themselves

**FILE_STORAGE_BACKEND** defaults to `local` in development. File upload tests
will write to `/tmp/keystone-uploads/` on the test machine. This is fine.
Do not mock file storage in tests — test the real service.

**Do not mock LangGraph** — `test_runs.py` only tests the HTTP endpoints up to
the point where `background_tasks.add_task` is called. It does not wait for or
assert on graph execution results. The graph runs async in the background and
its output is tested separately via status poll.

---

## 4. test_file_parser.py

Unit tests. No DB, no HTTP, no fixtures needed.
All synthetic content — no real file I/O except what the parser itself does.

```python
"""
test_file_parser.py — unit tests for backend/src/services/file_parser.py

Tests each supported format independently.
No database, no HTTP client needed.
"""
import json
import pytest
from src.services.file_parser import parse_transcript, parse_document


# ── .txt ──────────────────────────────────────────────────────────────────────

def test_parse_txt_basic():
    content = "Hello world\nThis is a transcript."
    result = parse_transcript(content.encode("utf-8"), "transcript.txt")
    assert "Hello world" in result
    assert "This is a transcript" in result


def test_parse_txt_strips_bom():
    content = "\ufeffBOM at start of file"
    result = parse_transcript(content.encode("utf-8-sig"), "transcript.txt")
    assert result.startswith("BOM")
    assert "\ufeff" not in result


def test_parse_txt_normalizes_crlf():
    content = "Line one\r\nLine two\r\nLine three"
    result = parse_transcript(content.encode("utf-8"), "transcript.txt")
    assert "\r\n" not in result
    assert "Line one" in result


# ── .vtt ──────────────────────────────────────────────────────────────────────

def test_parse_vtt_strips_timestamps():
    content = (
        "WEBVTT\n\n"
        "00:00:01.000 --> 00:00:04.000\n"
        "Hello from the meeting.\n\n"
        "00:00:05.000 --> 00:00:08.000\n"
        "Good morning everyone.\n"
    )
    result = parse_transcript(content.encode("utf-8"), "transcript.vtt")
    assert "00:00:01" not in result
    assert "Hello from the meeting" in result
    assert "Good morning everyone" in result


def test_parse_vtt_preserves_speaker_labels():
    content = (
        "WEBVTT\n\n"
        "00:00:01.000 --> 00:00:04.000\n"
        "<v John Smith>Hello from the meeting.</v>\n"
    )
    result = parse_transcript(content.encode("utf-8"), "transcript.vtt")
    assert "John Smith" in result
    assert "Hello from the meeting" in result


# ── .srt ──────────────────────────────────────────────────────────────────────

def test_parse_srt_strips_sequence_numbers_and_timestamps():
    content = (
        "1\n"
        "00:00:01,000 --> 00:00:04,000\n"
        "This is the first subtitle.\n\n"
        "2\n"
        "00:00:05,000 --> 00:00:08,000\n"
        "This is the second subtitle.\n"
    )
    result = parse_transcript(content.encode("utf-8"), "transcript.srt")
    assert "00:00:01,000" not in result
    assert "1" not in result.split("\n")[0]  # sequence number stripped
    assert "This is the first subtitle" in result
    assert "This is the second subtitle" in result


# ── .json (Fireflies) ─────────────────────────────────────────────────────────

def test_parse_fireflies_json_shape1():
    """Shape 1: top-level sentences array."""
    data = {
        "sentences": [
            {"speaker_name": "Alice", "text": "Hello everyone."},
            {"speaker_name": "Bob", "text": "Good morning."},
        ]
    }
    result = parse_transcript(json.dumps(data).encode("utf-8"), "transcript.json")
    assert "Alice: Hello everyone." in result
    assert "Bob: Good morning." in result


def test_parse_fireflies_json_shape2():
    """Shape 2: nested GraphQL data.transcript.sentences."""
    data = {
        "data": {
            "transcript": {
                "sentences": [
                    {"speaker_name": "Alice", "raw_text": "Testing shape two."},
                ]
            }
        }
    }
    result = parse_transcript(json.dumps(data).encode("utf-8"), "transcript.json")
    assert "Alice: Testing shape two." in result


def test_parse_fireflies_json_shape3():
    """Shape 3: plain transcript string."""
    data = {"transcript": "This is a plain transcript string."}
    result = parse_transcript(json.dumps(data).encode("utf-8"), "transcript.json")
    assert "This is a plain transcript string." in result


def test_parse_fireflies_json_invalid_raises():
    with pytest.raises(ValueError, match="Invalid JSON"):
        parse_transcript(b"not valid json {{", "transcript.json")


# ── Unsupported format ────────────────────────────────────────────────────────

def test_parse_transcript_unsupported_format_raises():
    with pytest.raises(ValueError, match="Unsupported"):
        parse_transcript(b"some content", "transcript.mp3")


def test_parse_document_unsupported_format_raises():
    with pytest.raises(ValueError, match="Unsupported"):
        parse_document(b"some content", "document.xlsx")
```

---

## 5. test_engagements.py

```python
"""
test_engagements.py — integration tests for /api/v1/engagements

Uses real Neon DB + auth_client fixture from conftest.py.
"""
import pytest
from httpx import AsyncClient

from tests.conftest import TestingSessionLocal
from src.models.engagement import Engagement


VALID_PAYLOAD = {
    "client_name": "Test Bank (Synthetic)",
    "client_industry": "Community Banking",
    "engagement_date": "2025-06-15",
    "attendees": "CRO, Head of MRM",
}


@pytest.mark.asyncio
async def test_create_engagement(auth_client: AsyncClient):
    """POST /engagements creates a new engagement with status=draft."""
    response = await auth_client.post("/api/v1/engagements", json=VALID_PAYLOAD)
    assert response.status_code == 201
    data = response.json()
    assert data["client_name"] == "Test Bank (Synthetic)"
    assert data["status"] == "draft"
    assert "id" in data

    # Cleanup
    await auth_client.delete(f"/api/v1/engagements/{data['id']}")


@pytest.mark.asyncio
async def test_list_engagements(auth_client: AsyncClient):
    """GET /engagements returns list with total."""
    response = await auth_client.get("/api/v1/engagements")
    assert response.status_code == 200
    data = response.json()
    assert "engagements" in data
    assert "total" in data
    assert isinstance(data["engagements"], list)


@pytest.mark.asyncio
async def test_get_engagement(auth_client: AsyncClient):
    """GET /engagements/{id} returns correct engagement."""
    create = await auth_client.post("/api/v1/engagements", json=VALID_PAYLOAD)
    eid = create.json()["id"]

    response = await auth_client.get(f"/api/v1/engagements/{eid}")
    assert response.status_code == 200
    assert response.json()["id"] == eid

    await auth_client.delete(f"/api/v1/engagements/{eid}")


@pytest.mark.asyncio
async def test_get_engagement_not_found(auth_client: AsyncClient):
    """GET /engagements/{random_uuid} returns 404."""
    import uuid
    response = await auth_client.get(f"/api/v1/engagements/{uuid.uuid4()}")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_patch_engagement(auth_client: AsyncClient):
    """PATCH /engagements/{id} updates fields."""
    create = await auth_client.post("/api/v1/engagements", json=VALID_PAYLOAD)
    eid = create.json()["id"]

    patch = await auth_client.patch(
        f"/api/v1/engagements/{eid}",
        json={"attendees": "CRO, CFO, CDO"},
    )
    assert patch.status_code == 200
    assert patch.json()["attendees"] == "CRO, CFO, CDO"

    await auth_client.delete(f"/api/v1/engagements/{eid}")


@pytest.mark.asyncio
async def test_delete_engagement(auth_client: AsyncClient):
    """DELETE /engagements/{id} removes the engagement."""
    create = await auth_client.post("/api/v1/engagements", json=VALID_PAYLOAD)
    eid = create.json()["id"]

    delete = await auth_client.delete(f"/api/v1/engagements/{eid}")
    assert delete.status_code == 204

    get = await auth_client.get(f"/api/v1/engagements/{eid}")
    assert get.status_code == 404


@pytest.mark.asyncio
async def test_create_engagement_missing_required_field(auth_client: AsyncClient):
    """POST /engagements without client_name returns 422."""
    payload = {k: v for k, v in VALID_PAYLOAD.items() if k != "client_name"}
    response = await auth_client.post("/api/v1/engagements", json=payload)
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_unauthenticated_engagements_returns_401(anon_client: AsyncClient):
    """GET /engagements without auth returns 401."""
    response = await anon_client.get("/api/v1/engagements")
    assert response.status_code == 401
```

---

## 6. test_upload.py

```python
"""
test_upload.py — integration tests for /api/v1/engagements/{id}/documents

Uses real Neon DB + local file storage backend.
"""
import io
import pytest
from httpx import AsyncClient


ENGAGEMENT_PAYLOAD = {
    "client_name": "Upload Test Bank (Synthetic)",
    "client_industry": "Community Banking",
    "engagement_date": "2025-07-01",
    "attendees": "CRO",
}

SYNTHETIC_TRANSCRIPT = b"""Facilitator: Good morning. Let's discuss your model risk program.
Client Lead: We have about forty models in production. SR 11-7 compliance is a challenge.
Facilitator: What percentage have gone through formal validation?
Client Lead: Maybe sixty percent. The rest are legacy systems.
"""


@pytest.fixture
async def engagement_id(auth_client: AsyncClient):
    """Create and yield an engagement, then delete it."""
    resp = await auth_client.post("/api/v1/engagements", json=ENGAGEMENT_PAYLOAD)
    eid = resp.json()["id"]
    yield eid
    await auth_client.delete(f"/api/v1/engagements/{eid}")


@pytest.mark.asyncio
async def test_upload_transcript_sets_status_ready(auth_client: AsyncClient, engagement_id: str):
    """Uploading a transcript advances engagement status to 'ready'."""
    response = await auth_client.post(
        f"/api/v1/engagements/{engagement_id}/documents?doc_type=transcript",
        files={"file": ("transcript.txt", io.BytesIO(SYNTHETIC_TRANSCRIPT), "text/plain")},
    )
    assert response.status_code == 201
    assert response.json()["doc_type"] == "transcript"

    # Engagement status should now be ready
    get = await auth_client.get(f"/api/v1/engagements/{engagement_id}")
    assert get.json()["status"] == "ready"


@pytest.mark.asyncio
async def test_upload_preread_does_not_change_status(auth_client: AsyncClient, engagement_id: str):
    """Uploading a preread (no transcript) advances to uploading, not ready."""
    preread = b"This is a pre-read document for the engagement."
    response = await auth_client.post(
        f"/api/v1/engagements/{engagement_id}/documents?doc_type=preread",
        files={"file": ("preread.txt", io.BytesIO(preread), "text/plain")},
    )
    assert response.status_code == 201
    assert response.json()["doc_type"] == "preread"

    get = await auth_client.get(f"/api/v1/engagements/{engagement_id}")
    # Should be uploading (or draft), not ready — no transcript yet
    assert get.json()["status"] in ("uploading", "draft")


@pytest.mark.asyncio
async def test_upload_wrong_doc_type_returns_422(auth_client: AsyncClient, engagement_id: str):
    """Uploading with invalid doc_type returns 422."""
    response = await auth_client.post(
        f"/api/v1/engagements/{engagement_id}/documents?doc_type=invalid",
        files={"file": ("file.txt", io.BytesIO(b"content"), "text/plain")},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_upload_wrong_extension_for_type(auth_client: AsyncClient, engagement_id: str):
    """Uploading an .mp3 as transcript returns 422."""
    response = await auth_client.post(
        f"/api/v1/engagements/{engagement_id}/documents?doc_type=transcript",
        files={"file": ("audio.mp3", io.BytesIO(b"fake audio"), "audio/mpeg")},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_list_documents(auth_client: AsyncClient, engagement_id: str):
    """GET /documents returns uploaded documents."""
    await auth_client.post(
        f"/api/v1/engagements/{engagement_id}/documents?doc_type=transcript",
        files={"file": ("t.txt", io.BytesIO(SYNTHETIC_TRANSCRIPT), "text/plain")},
    )
    response = await auth_client.get(f"/api/v1/engagements/{engagement_id}/documents")
    assert response.status_code == 200
    docs = response.json()
    assert isinstance(docs, list)
    assert len(docs) >= 1
    assert docs[0]["doc_type"] == "transcript"


@pytest.mark.asyncio
async def test_delete_document(auth_client: AsyncClient, engagement_id: str):
    """DELETE /documents/{doc_id} removes the document."""
    upload = await auth_client.post(
        f"/api/v1/engagements/{engagement_id}/documents?doc_type=transcript",
        files={"file": ("t.txt", io.BytesIO(SYNTHETIC_TRANSCRIPT), "text/plain")},
    )
    doc_id = upload.json()["id"]

    delete = await auth_client.delete(
        f"/api/v1/engagements/{engagement_id}/documents/{doc_id}"
    )
    assert delete.status_code == 204


@pytest.mark.asyncio
async def test_upload_to_nonexistent_engagement(auth_client: AsyncClient):
    """Upload to a non-existent engagement returns 404."""
    import uuid
    response = await auth_client.post(
        f"/api/v1/engagements/{uuid.uuid4()}/documents?doc_type=transcript",
        files={"file": ("t.txt", io.BytesIO(b"content"), "text/plain")},
    )
    assert response.status_code == 404
```

---

## 7. test_runs.py

Tests only the HTTP layer — does not wait for or assert on graph execution.
The graph runs as a background task; these tests verify the endpoint contracts.

```python
"""
test_runs.py — integration tests for /api/v1/engagements/{id}/runs

Tests HTTP contracts only. Does not assert on graph execution results
(graph runs async in background; results tested via status poll).
"""
import io
import pytest
from httpx import AsyncClient


ENGAGEMENT_PAYLOAD = {
    "client_name": "Runs Test Bank (Synthetic)",
    "client_industry": "Community Banking",
    "engagement_date": "2025-08-01",
    "attendees": "CRO",
}

SYNTHETIC_TRANSCRIPT = b"""Facilitator: Morning. Let's talk about your risk framework.
Client Lead: We use SR 11-7 as our standard. PD and LGD models are the core.
Facilitator: How many models in total?
Client Lead: About thirty. CECL is the biggest challenge right now.
"""


@pytest.fixture
async def ready_engagement(auth_client: AsyncClient):
    """Engagement in 'ready' status with a transcript uploaded."""
    resp = await auth_client.post("/api/v1/engagements", json=ENGAGEMENT_PAYLOAD)
    eid = resp.json()["id"]

    await auth_client.post(
        f"/api/v1/engagements/{eid}/documents?doc_type=transcript",
        files={"file": ("t.txt", io.BytesIO(SYNTHETIC_TRANSCRIPT), "text/plain")},
    )

    yield eid
    await auth_client.delete(f"/api/v1/engagements/{eid}")


@pytest.mark.asyncio
async def test_start_run_returns_202(auth_client: AsyncClient, ready_engagement: str):
    """POST /runs on a ready engagement returns 202 with run_id."""
    response = await auth_client.post(f"/api/v1/engagements/{ready_engagement}/runs")
    assert response.status_code == 202
    data = response.json()
    assert "run_id" in data
    assert data["status"] == "running"


@pytest.mark.asyncio
async def test_start_run_on_draft_returns_409(auth_client: AsyncClient):
    """POST /runs on a draft engagement (no transcript) returns 409."""
    resp = await auth_client.post("/api/v1/engagements", json=ENGAGEMENT_PAYLOAD)
    eid = resp.json()["id"]

    try:
        response = await auth_client.post(f"/api/v1/engagements/{eid}/runs")
        assert response.status_code == 409
    finally:
        await auth_client.delete(f"/api/v1/engagements/{eid}")


@pytest.mark.asyncio
async def test_start_run_without_transcript_returns_400(auth_client: AsyncClient):
    """POST /runs on ready-but-no-transcript engagement returns 400."""
    # Create engagement and manually patch to ready without uploading transcript
    resp = await auth_client.post("/api/v1/engagements", json={
        **ENGAGEMENT_PAYLOAD,
        "client_name": "No Transcript Bank (Synthetic)",
    })
    eid = resp.json()["id"]

    # Patch status to ready without a transcript (simulates edge case)
    await auth_client.patch(f"/api/v1/engagements/{eid}", json={"attendees": "updated"})

    try:
        # engagement is draft — POST runs should return 409 (not ready)
        response = await auth_client.post(f"/api/v1/engagements/{eid}/runs")
        assert response.status_code in (400, 409)
    finally:
        await auth_client.delete(f"/api/v1/engagements/{eid}")


@pytest.mark.asyncio
async def test_get_latest_run_after_start(auth_client: AsyncClient, ready_engagement: str):
    """GET /runs/latest returns run status after starting."""
    await auth_client.post(f"/api/v1/engagements/{ready_engagement}/runs")
    response = await auth_client.get(f"/api/v1/engagements/{ready_engagement}/runs/latest")
    assert response.status_code == 200
    data = response.json()
    assert "run_id" in data
    assert data["status"] in ("running", "awaiting_review_1", "complete", "failed")


@pytest.mark.asyncio
async def test_get_latest_run_no_runs_returns_404(auth_client: AsyncClient):
    """GET /runs/latest with no runs returns 404."""
    resp = await auth_client.post("/api/v1/engagements", json={
        **ENGAGEMENT_PAYLOAD,
        "client_name": "No Runs Bank (Synthetic)",
    })
    eid = resp.json()["id"]
    try:
        response = await auth_client.get(f"/api/v1/engagements/{eid}/runs/latest")
        assert response.status_code == 404
    finally:
        await auth_client.delete(f"/api/v1/engagements/{eid}")


@pytest.mark.asyncio
async def test_gate1_wrong_status_returns_409(auth_client: AsyncClient, ready_engagement: str):
    """POST /runs/latest/gate1 on a running (not awaiting_review_1) run returns 409."""
    await auth_client.post(f"/api/v1/engagements/{ready_engagement}/runs")
    # Run just started — status is running, not awaiting_review_1
    response = await auth_client.post(
        f"/api/v1/engagements/{ready_engagement}/runs/latest/gate1",
        json={"restored_segment_ids": []},
    )
    # Should be 409 — not yet at gate 1
    assert response.status_code == 409


@pytest.mark.asyncio
async def test_gate2_wrong_status_returns_409(auth_client: AsyncClient, ready_engagement: str):
    """POST /runs/latest/gate2 on wrong status returns 409."""
    await auth_client.post(f"/api/v1/engagements/{ready_engagement}/runs")
    response = await auth_client.post(
        f"/api/v1/engagements/{ready_engagement}/runs/latest/gate2",
        json={"glossary": []},
    )
    assert response.status_code == 409


@pytest.mark.asyncio
async def test_gate3_wrong_status_returns_409(auth_client: AsyncClient, ready_engagement: str):
    """POST /runs/latest/gate3 on wrong status returns 409."""
    await auth_client.post(f"/api/v1/engagements/{ready_engagement}/runs")
    response = await auth_client.post(
        f"/api/v1/engagements/{ready_engagement}/runs/latest/gate3",
        json={"outline": {
            "key_themes": [], "pain_points": [], "stated_priorities": [],
            "open_questions": [], "potential_recommendations": [], "suggested_next_steps": [],
        }},
    )
    assert response.status_code == 409
```

---

## 8. test_output.py

```python
"""
test_output.py — integration tests for /api/v1/engagements/{id}/output

Tests the output availability check and download endpoints.
"""
import uuid
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_output_status_no_complete_run_returns_404(auth_client: AsyncClient):
    """GET /output returns 404 when no complete run exists."""
    resp = await auth_client.post("/api/v1/engagements", json={
        "client_name": "Output Test Bank (Synthetic)",
        "client_industry": "Community Banking",
        "engagement_date": "2025-09-01",
        "attendees": "CRO",
    })
    eid = resp.json()["id"]
    try:
        response = await auth_client.get(f"/api/v1/engagements/{eid}/output")
        assert response.status_code == 404
    finally:
        await auth_client.delete(f"/api/v1/engagements/{eid}")


@pytest.mark.asyncio
async def test_download_brief_no_run_returns_404(auth_client: AsyncClient):
    """GET /output/brief returns 404 when no complete run exists."""
    resp = await auth_client.post("/api/v1/engagements", json={
        "client_name": "Brief Test Bank (Synthetic)",
        "client_industry": "Community Banking",
        "engagement_date": "2025-09-01",
        "attendees": "CRO",
    })
    eid = resp.json()["id"]
    try:
        response = await auth_client.get(f"/api/v1/engagements/{eid}/output/brief")
        assert response.status_code == 404
    finally:
        await auth_client.delete(f"/api/v1/engagements/{eid}")


@pytest.mark.asyncio
async def test_download_handoff_no_run_returns_404(auth_client: AsyncClient):
    """GET /output/handoff returns 404 when no complete run exists."""
    resp = await auth_client.post("/api/v1/engagements", json={
        "client_name": "Handoff Test Bank (Synthetic)",
        "client_industry": "Community Banking",
        "engagement_date": "2025-09-01",
        "attendees": "CRO",
    })
    eid = resp.json()["id"]
    try:
        response = await auth_client.get(f"/api/v1/engagements/{eid}/output/handoff")
        assert response.status_code == 404
    finally:
        await auth_client.delete(f"/api/v1/engagements/{eid}")


@pytest.mark.asyncio
async def test_output_nonexistent_engagement_returns_404(auth_client: AsyncClient):
    """GET /output on a non-existent engagement returns 404."""
    response = await auth_client.get(f"/api/v1/engagements/{uuid.uuid4()}/output")
    assert response.status_code == 404
```

---

## 9. Update CONTEXT.md

Replace the entire file with the following. Every field reflects the true
current state of the codebase after Phase D5.

```markdown
# Keystone — Full Project Context
> Read this file at the start of every new Claude / Claude Code session.
> It replaces the need to re-read the entire conversation history.
> Updated after Phase E. Last updated: 2026-03-26.

---

## What This Tool Is

**Keystone** is an internal multi-agent pipeline that transforms raw discovery
session transcripts into a structured Deck Brief — a Word document (.docx) plus
a JSON handoff file that Claude Code uses to start building a client presentation.

**Who uses it:** 5 members of the Crowe IRM AI team. Internal use only.
Not shown to clients directly, but the Demo/POC deployment (Vercel) is used to
demonstrate the tool to internal stakeholders and to get ADO/Azure buy-in before
moving to the production environment.

**The problem it solves:**
On-site discovery sessions with financial services clients are recorded via
Fireflies. The raw transcript is noisy — personal chatter, off-topic threads,
and acronyms that get misread without client context (e.g. "P&C" read as PNC
Bank instead of Property & Casualty). Getting from raw transcript to a polished
deck outline currently takes hours and produces inconsistent results.

**What it produces:**
1. `deck_brief.docx` — Crowe-branded Word document with a section-by-section
   deck outline, suggested slide types, and speaker notes stubs.
2. `deck_handoff.json` — Machine-readable version for Claude Code to ingest
   and begin deck generation.

---

## The Six-Node Pipeline

```
[Node 1]  transcript_ingester   → parses uploaded file → clean plain text
[Node 2]  noise_filter          → removes off-topic content → filtered transcript + removed_segments[]
          ── HITL Gate 1 ──     user reviews removed content, restores anything wrong
[Node 3]  research_agent        → web search on client → client_context_profile + acronym_glossary
[Node 4]  disambiguator         → resolves acronyms in transcript using glossary
          ── HITL Gate 2 ──     user reviews/edits the acronym glossary
[Node 5]  content_extractor     → maps transcript to structured outline (themes, pain points, etc.)
          ── HITL Gate 3 ──     user reviews/edits the content outline
[Node 6]  brief_compiler        → assembles deck_brief.docx + deck_handoff.json
```

HITL gates use LangGraph `interrupt_before` + SSE. Pipeline pauses, broadcasts
an SSE event, frontend shows a review UI, user submits, pipeline resumes via
`keystone_graph.aupdate_state()` + `keystone_graph.astream(None, config)`.

---

## Two-Environment Architecture

There are two deployment targets. The codebase is one repo. Environment-aware
configuration via `ENVIRONMENT` and `FILE_STORAGE_BACKEND` env vars determines
which backend is active. No code changes needed between environments.

### Demo / POC — Vercel + Railway + Neon

| Layer | Target |
|---|---|
| Frontend | Vercel — crowe-keystone.vercel.app |
| Backend | Railway (preferred) — auto-deploy from GitHub main |
| Database | Neon PostgreSQL |
| File storage | Supabase Storage |
| CI/CD | Vercel / Railway Git integration |
| Data policy | **Synthetic data only. Zero real client data, ever.** |
| Env var | `ENVIRONMENT=test`, `FILE_STORAGE_BACKEND=supabase` |

### Production — ADO + Azure

| Layer | Target |
|---|---|
| Frontend | Azure Static Web Apps |
| Backend | Azure Container Apps |
| Database | Azure PostgreSQL Flexible Server |
| File storage | Azure Blob Storage |
| CI/CD | Azure DevOps Pipelines (.ado/azure-pipelines.yml) |
| Data policy | **Real client data permitted.** Synthetic guard bypassed. |
| Env var | `ENVIRONMENT=production`, `FILE_STORAGE_BACKEND=azure_blob` |

**The only things that differ between environments are env vars.**
No code changes. No branching. No separate builds.

---

## Tech Stack

**Backend:** Python 3.11, FastAPI, LangGraph, SQLAlchemy (async), Alembic,
Pydantic v2, OpenAI SDK

**AI model:** `gpt-5.4` (OpenAI)
All nodes: `temperature=0.2`, `response_format={"type": "json_object"}`,
Pydantic parsing — never regex. Constant: `KEYSTONE_MODEL = "gpt-5.4"` in
`backend/src/graph/keystone_graph.py`.

Web search: `research_agent` only, via `tools=[{"type": "web_search_preview"}]`
in the OpenAI Responses API.

**Frontend:** Next.js 15, TypeScript, Tailwind CSS, shadcn/ui, Zustand, SWR,
framer-motion, @dnd-kit/core, next-auth v5

**Deploy (Demo/POC):** Vercel + Railway (`--workers 1` required for SSE) + Neon
**Deploy (Production):** Azure Static Web Apps + Azure Container Apps + Azure PostgreSQL

**Corporate network:** `NODE_TLS_REJECT_UNAUTHORIZED=0` for npm/vercel.
`GIT_SSL_NO_VERIFY=true` for git. asyncpg SSL uses `ssl_context` connect arg.
Alembic sync URL needs `channel_binding=disable`.

---

## Current Repo Structure

```
Crowe-Keystone/
├── .ado/
│   └── azure-pipelines.yml
├── .claude/
│   └── agents/                      ← Claude Code sub-agent skill files
├── backend/
│   ├── alembic/versions/
│   │   ├── 001_initial.py
│   │   ├── 002_phase2.py
│   │   └── 003_keystone.py
│   ├── scripts/
│   │   └── seed_synthetic.py
│   ├── tests/
│   │   ├── conftest.py
│   │   ├── test_phase1.py
│   │   ├── test_file_parser.py      ← Phase E
│   │   ├── test_engagements.py      ← Phase E
│   │   ├── test_upload.py           ← Phase E
│   │   ├── test_runs.py             ← Phase E
│   │   └── test_output.py           ← Phase E
│   └── src/
│       ├── graph/
│       │   ├── keystone_graph.py    ← compiled LangGraph graph, KEYSTONE_MODEL constant
│       │   ├── nodes/
│       │   │   ├── transcript_ingester.py
│       │   │   ├── noise_filter.py
│       │   │   ├── research_agent.py
│       │   │   ├── disambiguator.py
│       │   │   ├── content_extractor.py
│       │   │   └── brief_compiler.py
│       │   └── prompts/
│       │       ├── noise_filter.md
│       │       ├── research_agent.md
│       │       ├── disambiguator.md
│       │       ├── content_extractor.md
│       │       └── brief_compiler.md
│       ├── models/
│       │   ├── agent_run.py
│       │   ├── team.py
│       │   ├── user.py
│       │   ├── push_subscription.py
│       │   ├── engagement.py
│       │   ├── uploaded_document.py
│       │   ├── keystone_run.py
│       │   └── acronym_glossary.py
│       ├── routers/
│       │   ├── auth.py
│       │   ├── stream.py            ← broadcast_to_team() is the SSE bus
│       │   ├── agents.py
│       │   ├── health.py
│       │   ├── push.py
│       │   ├── team.py
│       │   ├── engagements.py       ← CRUD
│       │   ├── upload.py            ← file upload
│       │   ├── runs.py              ← start run + HITL gates
│       │   └── output.py            ← download .docx and .json
│       ├── schemas/
│       │   ├── engagement.py
│       │   ├── upload.py
│       │   ├── runs.py
│       │   └── output.py
│       ├── services/
│       │   ├── file_parser.py       ← .txt .vtt .srt .json .pdf .docx
│       │   ├── file_storage.py      ← local/supabase/azure_blob
│       │   ├── synthetic_guard.py
│       │   ├── synthetic_guard_blocklist.txt
│       │   ├── docx_builder.py      ← Crowe-branded Word doc assembly
│       │   ├── json_builder.py      ← deck handoff JSON assembly
│       │   └── push_service.py
│       ├── config.py
│       ├── database.py
│       ├── main.py
│       └── state.py                 ← KeystoneState TypedDict
├── frontend/
│   └── src/
│       ├── app/
│       │   ├── (auth)/              ← login / register
│       │   ├── (app)/
│       │   │   ├── engagements/
│       │   │   │   ├── page.tsx     ← Kanban board
│       │   │   │   ├── new/page.tsx ← creation form
│       │   │   │   └── [id]/page.tsx ← detail + stepper + HITL + output
│       │   │   └── settings/
│       │   └── install/
│       ├── components/
│       │   ├── ui/                  ← shadcn primitives
│       │   ├── layout/              ← AppShell, WebLayout, Sidebar, TopBar
│       │   ├── notifications/
│       │   └── keystone/
│       │       ├── KanbanBoard.tsx
│       │       ├── KanbanColumn.tsx
│       │       ├── EngagementCard.tsx
│       │       ├── EngagementCardSkeleton.tsx
│       │       ├── StatusBadge.tsx
│       │       ├── PipelineStepIndicator.tsx
│       │       ├── PipelineStepper.tsx
│       │       ├── UploadStep.tsx
│       │       ├── TranscriptDropzone.tsx
│       │       ├── RunStep.tsx
│       │       ├── RunConfirmModal.tsx
│       │       ├── PipelineNodeProgress.tsx
│       │       ├── Gate1Panel.tsx
│       │       ├── Gate2Panel.tsx
│       │       ├── Gate3Panel.tsx
│       │       ├── OutputStep.tsx
│       │       └── Spinner.tsx
│       ├── hooks/
│       │   ├── useSSE.ts
│       │   ├── useKeystoneSSE.ts
│       │   ├── useRunGraphState.ts
│       │   └── useMediaQuery.ts
│       ├── stores/
│       │   ├── toast.store.ts
│       │   ├── notifications.store.ts
│       │   └── keystone.store.ts
│       └── types/
│           └── keystone.types.ts
├── CLAUDE.md
├── CONTEXT.md                       ← THIS FILE
├── HANDOFF.md
└── PRD-PHASE-*.md                   ← one per phase, A through E
```

---

## Database

**Alembic head:** `003_keystone`
**Connection:** Neon PostgreSQL (Demo/POC) — see .planning/STATE.md for strings

| Table | Purpose |
|---|---|
| `teams` | One team: Crowe IRM AI |
| `users` | Team members |
| `agent_runs` | Kept for run tracking |
| `push_subscriptions` | Web push registrations |
| `engagements` | One per discovery session |
| `uploaded_documents` | Transcript, preread, agenda per engagement |
| `keystone_runs` | One LangGraph run per engagement |
| `acronym_glossary` | Acronym entries, user-edited |

**Synthetic data (Demo/POC only):**
3 complete engagements seeded. Admin: `achyuth@crowe-synthetic.test` / `synthetic-password-123`

---

## Key Patterns

**SSE:** All real-time updates via `broadcast_to_team(team_id, event_dict)` in
`stream.py`. Backend must run with `--workers 1`. Frontend hook: `useKeystoneSSE`.

**LangGraph HITL:** `interrupt_before=["research_agent", "content_extractor", "brief_compiler"]`.
Resume: `await keystone_graph.aupdate_state(config, gate_fields)` then
`background_tasks.add_task(_resume_graph, config)`.

**File storage:** All I/O via `file_storage.py`. No router or node touches
storage directly. `FILE_STORAGE_BACKEND` controls routing: local / supabase / azure_blob.

**Crash recovery:** On startup, `main.py` marks any `running/awaiting_review*/compiling`
runs as `failed` since MemorySaver state is lost on restart.

---

## Engagement Status State Machine

```
draft → uploading → ready → running
→ awaiting_review_1 → running
→ awaiting_review_2 → running
→ awaiting_review_3 → compiling → complete | failed
```

`Engagement.status` is the single source of truth. Every transition broadcasts
`keystone.status_changed` SSE.

---

## What Has Been Built — All Phases Complete

| Phase | What Was Built |
|---|---|
| A | Deleted old nodes/routers/models/frontend, removed APScheduler + React Flow, added env config |
| B | KeystoneState TypedDict, 4 SQLAlchemy models, Alembic migration 003, schemas, file_storage, synthetic_guard, seed script |
| C1 | file_parser.py, engagements/upload/runs/output routers, crash recovery in main.py |
| C2 | keystone_graph.py, 6 nodes, 5 prompts, graph wired into runs.py |
| C3 | docx_builder.py (Crowe-branded), json_builder.py (deck handoff schema) |
| D1 | keystone.types.ts, keystone.store.ts, useKeystoneSSE.ts, sidebar updated, page shells |
| D2 | 8-column Kanban, dnd-kit drag-and-drop, EngagementCard with all status signals, skeleton |
| D3 | Vertical stepper, UploadStep (dropzone), RunStep, RunConfirmModal, PipelineNodeProgress |
| D4 | Gate1Panel, Gate2Panel, Gate3Panel, useRunGraphState |
| D5 | OutputStep, TranscriptDropzone, Spinner, new engagement form |
| E | Deleted stale files, fixed stale comments, 39 new tests, CONTEXT.md updated |

---

## What Remains

**Phase F — Deploy to Demo/POC**
- Verify Dockerfile and Railway config
- Deploy backend to Railway with correct env vars
- Deploy frontend to Vercel with NEXT_PUBLIC_BACKEND_URL → Railway URL
- Run seed_synthetic.py against Neon
- Smoke test deployed URLs end-to-end

---

## PRD Files

| File | Covers |
|---|---|
| PRD-PHASE-A-FOUNDATION.md | Architecture, environments, deletion/config |
| PRD-PHASE-B-DATA-LAYER.md | Models, migration, schemas, services, seed |
| PRD-PHASE-C1-FILE-PARSER-AND-ROUTERS.md | file_parser + 4 routers + main.py |
| PRD-PHASE-C2-GRAPH-AND-NODES.md | LangGraph graph + 6 nodes + 5 prompts |
| PRD-PHASE-C3-OUTPUT-BUILDERS.md | docx_builder + json_builder |
| PRD-PHASE-D1-FOUNDATION.md | Types, store, SSE hook, sidebar, @dnd-kit install |
| PRD-PHASE-D2-KANBAN-BOARD.md | Kanban board, cards, drag-and-drop |
| PRD-PHASE-D3-DETAIL-UPLOAD-RUN.md | Stepper, upload, run modal, node progress |
| PRD-PHASE-D4-HITL-PANELS.md | Gate1/2/3 review panels |
| PRD-PHASE-D5-OUTPUT-AND-NEW-FORM.md | Output page, new engagement form |
| PRD-PHASE-E-CLEANUP-AND-TESTS.md | Stale file deletion, comment fixes, 39 tests |

## Current State File

`HANDOFF.md` — always contains the most recent phase completion notes.
Read this first when resuming any session.
```

---

## 10. Verification Checklist

Run in order. All must pass before writing HANDOFF.md.

```bash
cd backend
source venv/Scripts/activate  # Windows: venv\Scripts\activate

# 1. Confirm stale files are gone — these should all return "not found"
python -c "import src.services.approval_service" 2>&1 | grep -i "no module\|not found" || echo "STILL EXISTS"
python -c "import src.services.conflict_service" 2>&1 | grep -i "no module\|not found" || echo "STILL EXISTS"

# 2. Confirm only 5 prompt files remain
ls backend/src/graph/prompts/*.md | wc -l  # should be 5

# 3. Run full test suite
python -m pytest tests/ -v --tb=short

# Expected: 46+ passed / 0 failed
# (7 original + 12 file_parser + 8 engagements + 7 upload + 8 runs + 4 output)

# 4. Frontend still clean
cd ../frontend
npm run typecheck
npm run build
```
