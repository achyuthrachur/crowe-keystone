"""
Phase 1 backend tests.

Tests run against a real Neon Postgres database (uses the DATABASE_URL from .env).
Each test is isolated via DB transactions that are rolled back after each test,
or via explicit cleanup in fixtures.

Run: cd backend && pytest tests/test_phase1.py -v
"""

import uuid

import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import inspect, text

from src.database import get_db
from src.main import app
from tests.conftest import test_engine, TestingSessionLocal


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_health_check(anon_client: AsyncClient):
    """GET /health returns 200 with correct payload."""
    response = await anon_client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "version" in data


@pytest.mark.asyncio
async def test_login_valid_credentials(team_and_user, anon_client: AsyncClient):
    """POST /auth/login returns token and user for valid credentials."""
    team, user = team_and_user

    async def override_get_db():
        async with TestingSessionLocal() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    app.dependency_overrides[get_db] = override_get_db

    try:
        response = await anon_client.post(
            "/api/v1/auth/login",
            json={"email": user.email, "password": "testpassword123"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == user.email
        assert data["token_type"] == "bearer"
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_login_invalid_credentials(team_and_user, anon_client: AsyncClient):
    """POST /auth/login returns 401 for wrong password."""
    team, user = team_and_user

    async def override_get_db():
        async with TestingSessionLocal() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    app.dependency_overrides[get_db] = override_get_db

    try:
        response = await anon_client.post(
            "/api/v1/auth/login",
            json={"email": user.email, "password": "wrongpassword"},
        )
        assert response.status_code == 401
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_get_me(auth_client: AsyncClient):
    """GET /auth/me returns current user."""
    response = await auth_client.get("/api/v1/auth/me")
    assert response.status_code == 200
    data = response.json()
    assert "id" in data
    assert "email" in data
    assert "team_id" in data


@pytest.mark.asyncio
async def test_unauthenticated_request_returns_401(anon_client: AsyncClient):
    """Requests without a token return 401."""
    response = await anon_client.get("/api/v1/auth/me")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_push_vapid_public_key(anon_client: AsyncClient):
    """GET /push/vapid-public-key returns a key string."""
    response = await anon_client.get("/api/v1/push/vapid-public-key")
    assert response.status_code == 200
    data = response.json()
    assert "key" in data
    assert isinstance(data["key"], str)
    assert len(data["key"]) > 0


@pytest.mark.asyncio
async def test_alembic_migration():
    """Verify that all Phase 1 tables exist in the database.

    This is a connectivity + schema verification test, not an actual migration run.
    The full round-trip (alembic upgrade head && downgrade -1 && upgrade head)
    should be run manually against the database before deploying.
    """
    from sqlalchemy import inspect, text

    async with test_engine.connect() as conn:
        # Verify we can connect
        result = await conn.execute(text("SELECT 1"))
        assert result.scalar() == 1

        # Verify all Phase 1 tables exist
        def get_table_names(sync_conn):
            inspector = inspect(sync_conn)
            return inspector.get_table_names()

        table_names = await conn.run_sync(get_table_names)

    expected_tables = {"teams", "users", "agent_runs", "push_subscriptions"}
    missing = expected_tables - set(table_names)
    assert not missing, (
        f"Missing Phase 1 tables: {missing}. "
        "Run 'alembic upgrade head' before running tests."
    )
