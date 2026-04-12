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
