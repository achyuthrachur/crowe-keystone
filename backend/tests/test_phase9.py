"""Phase 2 backend tests."""
import uuid
import pytest
from starlette.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from src.config import settings
from src.database import get_db, _build_asyncpg_url, _ssl_context
from src.main import app


@pytest.fixture()
def p9_client(shared_event_loop):
    _db_url = _build_asyncpg_url(settings.DATABASE_URL)

    async def override_get_db():
        engine = create_async_engine(_db_url, echo=False, connect_args={"ssl": _ssl_context})
        factory = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)
        async with factory() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise
        await engine.dispose()

    app.dependency_overrides[get_db] = override_get_db
    client = TestClient(app, raise_server_exceptions=False)
    yield client
    app.dependency_overrides.clear()


def test_register_endpoint_exists(p9_client):
    r = p9_client.post(
        "/api/v1/auth/register",
        json={"email": "test@example.com", "name": "Test User", "password": "password123"}
    )
    assert r.status_code not in (404, 405)


def test_invite_token_lookup_404_for_invalid(p9_client):
    r = p9_client.get("/api/v1/auth/invite/definitely-not-a-real-token")
    assert r.status_code == 404


def test_vercel_status_returns_not_connected(p9_client):
    email = f"test-p9-{uuid.uuid4().hex[:8]}@example.com"
    reg = p9_client.post(
        "/api/v1/auth/register",
        json={"email": email, "name": "Test P9", "password": "password123"}
    )
    if reg.status_code not in (200, 201):
        pytest.skip("Registration failed — first user may already exist")
    token = reg.json().get("token")
    if not token:
        pytest.skip("No token returned")
    r = p9_client.get(
        "/api/v1/integrations/vercel/status",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert r.status_code == 200
    assert r.json()["connected"] == False


def test_vercel_connect_rejects_invalid_token(p9_client):
    """POST /integrations/vercel/connect returns 400 for an invalid PAT."""
    email = f"test-p9-{uuid.uuid4().hex[:8]}@example.com"
    reg = p9_client.post(
        "/api/v1/auth/register",
        json={"email": email, "name": "Test P9 Auth", "password": "password123"}
    )
    if reg.status_code not in (200, 201):
        pytest.skip("Registration failed")
    token = reg.json().get("token")
    if not token:
        pytest.skip("No token returned")
    r = p9_client.post(
        "/api/v1/integrations/vercel/connect",
        json={"access_token": "invalid-token-that-will-not-work"},
        headers={"Authorization": f"Bearer {token}"}
    )
    # 400 (invalid token rejected by Vercel) or 422 (validation)
    assert r.status_code in (400, 422)


def test_health_still_passes(p9_client):
    r = p9_client.get("/api/v1/health")
    assert r.status_code == 200
    assert r.json()["status"] in ("ok", "degraded")
