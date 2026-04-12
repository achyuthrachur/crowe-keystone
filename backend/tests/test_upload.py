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
