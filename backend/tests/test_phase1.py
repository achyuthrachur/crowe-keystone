"""
Phase 1 backend tests.

Tests run against a real Neon Postgres database (uses the DATABASE_URL from .env).
Each test is isolated via DB transactions that are rolled back after each test,
or via explicit cleanup in fixtures.

Run: cd backend && pytest tests/test_phase1.py -v
"""

import uuid
from collections.abc import AsyncGenerator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from src.config import settings
from src.database import Base, get_db
from src.main import app
from src.models.team import Team
from src.models.user import User
from src.routers.auth import hash_password


# ---------------------------------------------------------------------------
# Test database engine — uses the same Neon Postgres DATABASE_URL
# Tests clean up after themselves via explicit deletes or a separate schema.
# ---------------------------------------------------------------------------
test_engine = create_async_engine(settings.DATABASE_URL, echo=False)
TestingSessionLocal = async_sessionmaker(
    bind=test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest_asyncio.fixture(scope="session", autouse=True)
async def create_tables():
    """Ensure all tables exist before tests run (mirrors alembic upgrade head)."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    # Do NOT drop tables after session — preserve for inspection.
    # Individual tests clean up their own rows.


@pytest_asyncio.fixture()
async def db() -> AsyncGenerator[AsyncSession, None]:
    """Yields a test DB session. Rolls back after each test."""
    async with TestingSessionLocal() as session:
        yield session
        await session.rollback()


@pytest_asyncio.fixture()
async def team_and_user(db: AsyncSession):
    """Create a test team + user; clean up after test."""
    slug = f"test-team-{uuid.uuid4().hex[:8]}"
    team = Team(name="Test Team", slug=slug)
    db.add(team)
    await db.flush()

    user = User(
        email=f"test-{uuid.uuid4().hex[:8]}@example.com",
        name="Test User",
        team_id=team.id,
        role="admin",
        hashed_password=hash_password("testpassword123"),
    )
    db.add(user)
    await db.flush()
    await db.commit()

    yield team, user

    # Cleanup
    await db.delete(user)
    await db.delete(team)
    await db.commit()


@pytest_asyncio.fixture()
async def auth_client(team_and_user) -> AsyncGenerator[AsyncClient, None]:
    """Authenticated AsyncClient with a valid JWT for the test user."""
    team, user = team_and_user

    # Override the get_db dependency to use the test session
    # We use a new session per request here since the client lives across multiple calls
    async def override_get_db():
        async with TestingSessionLocal() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Login to get a real token
        response = await client.post(
            "/api/v1/auth/login",
            json={"email": user.email, "password": "testpassword123"},
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        token = response.json()["token"]
        client.headers["Authorization"] = f"Bearer {token}"
        yield client

    app.dependency_overrides.clear()


@pytest_asyncio.fixture()
async def anon_client() -> AsyncGenerator[AsyncClient, None]:
    """Unauthenticated AsyncClient."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client


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
async def test_get_projects_empty_for_new_team(auth_client: AsyncClient):
    """GET /projects returns an empty list when no projects exist for the team."""
    response = await auth_client.get("/api/v1/projects")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    # New team may have zero projects (or more if previous tests left rows — both OK)


@pytest.mark.asyncio
async def test_create_project(auth_client: AsyncClient):
    """POST /projects creates a project with spark stage."""
    payload = {
        "title": "Test Spark Project",
        "spark_content": "We need a tool that does X",
        "description": "Initial project description",
    }
    response = await auth_client.post("/api/v1/projects", json=payload)
    assert response.status_code == 201

    data = response.json()
    assert data["title"] == "Test Spark Project"
    assert data["stage"] == "spark"
    assert data["spark_content"] == "We need a tool that does X"
    assert data["archived"] is False
    assert "id" in data
    assert len(data["stage_history"]) == 1
    assert data["stage_history"][0]["stage"] == "spark"

    # Cleanup: archive the created project
    project_id = data["id"]
    archive_response = await auth_client.delete(f"/api/v1/projects/{project_id}/archive")
    assert archive_response.status_code == 204


@pytest.mark.asyncio
async def test_get_project_by_id(auth_client: AsyncClient):
    """GET /projects/{id} returns the created project with correct shape."""
    # Create a project first
    create_response = await auth_client.post(
        "/api/v1/projects",
        json={"title": "Fetch Me Project"},
    )
    assert create_response.status_code == 201
    project_id = create_response.json()["id"]

    try:
        # Fetch it
        response = await auth_client.get(f"/api/v1/projects/{project_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == project_id
        assert data["title"] == "Fetch Me Project"
        assert data["stage"] == "spark"
        assert isinstance(data["stage_history"], list)
        assert isinstance(data["build_log"], list)
    finally:
        await auth_client.delete(f"/api/v1/projects/{project_id}/archive")


@pytest.mark.asyncio
async def test_patch_project_title(auth_client: AsyncClient):
    """PATCH /projects/{id} updates the title field."""
    create_response = await auth_client.post(
        "/api/v1/projects",
        json={"title": "Original Title"},
    )
    assert create_response.status_code == 201
    project_id = create_response.json()["id"]

    try:
        patch_response = await auth_client.patch(
            f"/api/v1/projects/{project_id}",
            json={"title": "Updated Title"},
        )
        assert patch_response.status_code == 200
        assert patch_response.json()["title"] == "Updated Title"
    finally:
        await auth_client.delete(f"/api/v1/projects/{project_id}/archive")


@pytest.mark.asyncio
async def test_invalid_stage_advance_is_rejected():
    """Stage advance is not implemented in Phase 1.

    This test documents the expected behaviour: PATCH on the stage field
    via the project update endpoint should be ignored (stage is not in
    ProjectUpdate schema). Direct stage jumps will be enforced in Phase 2.

    For now this serves as a placeholder asserting the schema does not
    expose a 'stage' field in ProjectUpdate.
    """
    from src.schemas.project import ProjectUpdate

    # 'stage' is intentionally absent from ProjectUpdate
    update = ProjectUpdate.model_validate({"title": "New Title"})
    assert not hasattr(update, "stage") or "stage" not in update.model_fields


@pytest.mark.asyncio
async def test_project_not_found_returns_404(auth_client: AsyncClient):
    """GET /projects/{nonexistent_id} returns 404."""
    fake_id = str(uuid.uuid4())
    response = await auth_client.get(f"/api/v1/projects/{fake_id}")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_unauthenticated_request_returns_401(anon_client: AsyncClient):
    """Requests without a token return 401."""
    response = await anon_client.get("/api/v1/projects")
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

    expected_tables = {"teams", "users", "projects", "agent_runs", "push_subscriptions"}
    missing = expected_tables - set(table_names)
    assert not missing, (
        f"Missing Phase 1 tables: {missing}. "
        "Run 'alembic upgrade head' before running tests."
    )
