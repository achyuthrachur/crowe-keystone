"""
test_engagements.py — integration tests for /api/v1/engagements

Uses real Neon DB + auth_client fixture from conftest.py.
"""
import pytest
from httpx import AsyncClient


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
