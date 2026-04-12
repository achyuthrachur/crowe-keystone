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
