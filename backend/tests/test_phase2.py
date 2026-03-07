"""
Phase 2 backend tests — Stage Transitions + Approvals.

Tests cover:
  - stage_service: validate_transition, requires_approval
  - POST /projects/{id}/advance: valid and invalid transitions
  - POST /approvals/{id}/decide: approve and reject decisions
  - GET /approvals: pending approvals for current user

Run: cd backend && pytest tests/test_phase2.py -v
"""

import asyncio
import uuid
from collections.abc import AsyncGenerator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from starlette.testclient import TestClient

from src.config import settings
from src.database import Base, get_db, _build_asyncpg_url, _ssl_context
from src.main import app
from src.models.approval import Approval
from src.models.project import Project
from src.models.team import Team
from src.models.user import User
from src.routers.auth import hash_password
from src.services.stage_service import REQUIRES_APPROVAL, VALID_TRANSITIONS, requires_approval, validate_transition


# ---------------------------------------------------------------------------
# Test database engine — same Neon Postgres as Phase 1 tests
# ---------------------------------------------------------------------------

# Engine and session factory are created inside a session-scoped fixture
# to share the same asyncio event loop as the tests.

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest_asyncio.fixture(scope="session", autouse=True)
async def session_factory():
    """Create async engine + session factory once per test session.

    Also patches src.database.engine and src.database.AsyncSessionLocal
    so FastAPI's own database module uses the same event-loop-bound engine.
    """
    import src.database as db_module

    engine = create_async_engine(
        _build_asyncpg_url(settings.DATABASE_URL),
        echo=False,
        connect_args={"ssl": _ssl_context},
    )
    factory = async_sessionmaker(
        bind=engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autocommit=False,
        autoflush=False,
    )
    # Patch the module-level engine and session factory used by the app
    original_engine = db_module.engine
    original_session_local = db_module.AsyncSessionLocal
    db_module.engine = engine
    db_module.AsyncSessionLocal = factory

    yield factory

    # Restore originals and dispose test engine
    db_module.engine = original_engine
    db_module.AsyncSessionLocal = original_session_local
    await engine.dispose()


@pytest_asyncio.fixture()
async def db(session_factory) -> AsyncGenerator[AsyncSession, None]:
    """Yields a test DB session."""
    async with session_factory() as session:
        yield session


@pytest_asyncio.fixture()
async def team_and_user(db: AsyncSession, session_factory):
    """Create a test team + admin user; clean up after test."""
    slug = f"test-team-p2-{uuid.uuid4().hex[:8]}"
    team = Team(name="Phase2 Test Team", slug=slug)
    db.add(team)
    await db.flush()

    user = User(
        email=f"test-p2-{uuid.uuid4().hex[:8]}@example.com",
        name="Phase2 User",
        team_id=team.id,
        role="admin",
        hashed_password=hash_password("testpassword123"),
    )
    db.add(user)
    await db.flush()
    await db.commit()

    yield team, user

    # Cleanup — use a fresh session to avoid concurrent operation errors
    async with session_factory() as cleanup_session:
        u = await cleanup_session.get(type(user), user.id)
        t = await cleanup_session.get(type(team), team.id)
        if u:
            await cleanup_session.delete(u)
        if t:
            await cleanup_session.delete(t)
        await cleanup_session.commit()


def make_db_override(factory):
    """Return a FastAPI dependency override for get_db using the test session factory."""
    async def override_get_db():
        async with factory() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise
    return override_get_db


def _run(coro, loop=None):
    """Run a coroutine using a shared event loop (avoids closing it)."""
    if loop is None:
        loop = asyncio.get_event_loop()
    return loop.run_until_complete(coro)


async def _setup_test_user(db_url: str):
    """Create team+user in a fresh async session, return (team, user, plain_password)."""
    engine = create_async_engine(_build_asyncpg_url(db_url), echo=False, connect_args={"ssl": _ssl_context})
    factory = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)
    plain_password = "testpassword123"
    slug = f"test-team-p2-{uuid.uuid4().hex[:8]}"
    team = Team(name="Phase2 Test Team", slug=slug)
    async with factory() as s:
        s.add(team)
        await s.flush()
        user = User(
            email=f"test-p2-{uuid.uuid4().hex[:8]}@example.com",
            name="Phase2 User",
            team_id=team.id,
            role="admin",
            hashed_password=hash_password(plain_password),
        )
        s.add(user)
        await s.commit()
        await s.refresh(team)
        await s.refresh(user)
    await engine.dispose()
    return team, user, plain_password


async def _cleanup_test_user(db_url: str, team_id, user_id):
    """Delete test user and team."""
    engine = create_async_engine(_build_asyncpg_url(db_url), echo=False, connect_args={"ssl": _ssl_context})
    factory = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)
    async with factory() as s:
        u = await s.get(User, user_id)
        t = await s.get(Team, team_id)
        if u:
            await s.delete(u)
        if t:
            await s.delete(t)
        await s.commit()
    await engine.dispose()


@pytest.fixture()
def auth_client(shared_event_loop):
    """Synchronous TestClient with JWT auth. Creates team+user, cleans up after."""
    team, user, pwd = _run(_setup_test_user(settings.DATABASE_URL), shared_event_loop)

    # Override get_db — engine is created inside the async generator so it binds
    # to TestClient's ASGI event loop, not the test thread's loop.
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
    # Log in to get token
    r = client.post("/api/v1/auth/login", json={"email": user.email, "password": pwd})
    assert r.status_code == 200, f"Login failed: {r.text}"
    token = r.json()["token"]
    client.headers["Authorization"] = f"Bearer {token}"

    yield client

    app.dependency_overrides.clear()
    _run(_cleanup_test_user(settings.DATABASE_URL, team.id, user.id), shared_event_loop)


@pytest.fixture()
def project_in_spark(auth_client):
    """Create a project in 'spark' stage; archive it after the test."""
    r = auth_client.post("/api/v1/projects", json={"title": f"Phase2 Spark {uuid.uuid4().hex[:6]}"})
    assert r.status_code == 201
    project = r.json()
    yield project
    auth_client.delete(f"/api/v1/projects/{project['id']}/archive")


@pytest.fixture()
def pending_approval(auth_client, project_in_spark):
    """Advance to draft_prd→review to produce a pending approval."""
    pid = project_in_spark["id"]
    r = auth_client.post(f"/api/v1/projects/{pid}/advance", json={"target_stage": "brief"})
    assert r.status_code == 200, f"spark→brief: {r.text}"
    r = auth_client.post(f"/api/v1/projects/{pid}/advance", json={"target_stage": "draft_prd"})
    assert r.status_code == 200, f"brief→draft_prd: {r.text}"
    r = auth_client.post(f"/api/v1/projects/{pid}/advance", json={"target_stage": "review"})
    assert r.status_code == 200, f"draft_prd→review: {r.text}"
    data = r.json()
    assert data.get("requires_approval") is True
    yield data["approval_id"]


# ---------------------------------------------------------------------------
# Unit tests — stage_service (pure functions, no DB)
# ---------------------------------------------------------------------------


class TestStageTransitionsValid:
    """validate_transition returns True for every documented valid hop."""

    def test_spark_to_brief(self):
        assert validate_transition("spark", "brief") is True

    def test_brief_to_draft_prd(self):
        assert validate_transition("brief", "draft_prd") is True

    def test_draft_prd_to_review(self):
        assert validate_transition("draft_prd", "review") is True

    def test_review_to_approved(self):
        assert validate_transition("review", "approved") is True

    def test_review_back_to_draft_prd(self):
        # review can be sent back to draft_prd
        assert validate_transition("review", "draft_prd") is True

    def test_approved_to_in_build(self):
        assert validate_transition("approved", "in_build") is True

    def test_in_build_to_shipped(self):
        assert validate_transition("in_build", "shipped") is True

    def test_shipped_to_retrospective(self):
        assert validate_transition("shipped", "retrospective") is True


class TestStageTransitionsInvalid:
    """validate_transition returns False for disallowed hops."""

    def test_spark_to_approved(self):
        assert validate_transition("spark", "approved") is False

    def test_spark_to_shipped(self):
        assert validate_transition("spark", "shipped") is False

    def test_spark_to_review(self):
        assert validate_transition("spark", "review") is False

    def test_review_back_to_spark(self):
        assert validate_transition("review", "spark") is False

    def test_shipped_to_spark(self):
        assert validate_transition("shipped", "spark") is False

    def test_retrospective_to_anything(self):
        # retrospective has no outgoing transitions
        for stage in VALID_TRANSITIONS:
            assert validate_transition("retrospective", stage) is False

    def test_unknown_from_stage(self):
        assert validate_transition("nonexistent_stage", "brief") is False


class TestRequiresApproval:
    """requires_approval reflects the REQUIRES_APPROVAL table exactly."""

    def test_review_requires_approval(self):
        # draft_prd → review needs an approval record
        assert requires_approval("review") is True

    def test_approved_requires_approval(self):
        # review → approved needs an approval record
        assert requires_approval("approved") is True

    def test_brief_does_not_require_approval(self):
        # spark → brief is immediate
        assert requires_approval("brief") is False

    def test_draft_prd_does_not_require_approval(self):
        assert requires_approval("draft_prd") is False

    def test_in_build_does_not_require_approval(self):
        assert requires_approval("in_build") is False

    def test_shipped_does_not_require_approval(self):
        assert requires_approval("shipped") is False

    def test_retrospective_does_not_require_approval(self):
        assert requires_approval("retrospective") is False

    def test_unknown_stage_returns_false(self):
        # Unknown stages default to False — never accidentally gate progress
        assert requires_approval("nonexistent_stage") is False

    def test_all_stages_in_requires_approval_table(self):
        """Every stage in VALID_TRANSITIONS must have an entry in REQUIRES_APPROVAL."""
        for stage in VALID_TRANSITIONS:
            assert stage in REQUIRES_APPROVAL, (
                f"Stage '{stage}' is in VALID_TRANSITIONS but missing from REQUIRES_APPROVAL"
            )


# ---------------------------------------------------------------------------
# Integration tests — advance endpoint (synchronous TestClient)
# ---------------------------------------------------------------------------


def test_valid_stage_advance_spark_to_brief(auth_client, project_in_spark):
    pid = project_in_spark["id"]
    assert project_in_spark["stage"] == "spark"
    r = auth_client.post(f"/api/v1/projects/{pid}/advance", json={"target_stage": "brief"})
    assert r.status_code == 200
    data = r.json()
    assert data.get("requires_approval") is False
    assert data.get("project", {}).get("stage") == "brief"


def test_stage_advance_to_review_creates_approval(auth_client, project_in_spark):
    pid = project_in_spark["id"]
    auth_client.post(f"/api/v1/projects/{pid}/advance", json={"target_stage": "brief"})
    auth_client.post(f"/api/v1/projects/{pid}/advance", json={"target_stage": "draft_prd"})
    r = auth_client.post(f"/api/v1/projects/{pid}/advance", json={"target_stage": "review"})
    assert r.status_code == 200
    data = r.json()
    assert data.get("requires_approval") is True
    assert data.get("approval_id") is not None
    # Stage must NOT have advanced yet
    assert data.get("project", {}).get("stage") == "draft_prd"
    # Verify approval visible in /approvals/all
    ar = auth_client.get("/api/v1/approvals/all")
    assert ar.status_code == 200
    ids = [a["id"] for a in ar.json()]
    assert data["approval_id"] in ids


def test_invalid_stage_skip_returns_422(auth_client, project_in_spark):
    pid = project_in_spark["id"]
    r = auth_client.post(f"/api/v1/projects/{pid}/advance", json={"target_stage": "approved"})
    assert r.status_code == 422


def test_invalid_stage_skip_spark_to_shipped(auth_client, project_in_spark):
    pid = project_in_spark["id"]
    r = auth_client.post(f"/api/v1/projects/{pid}/advance", json={"target_stage": "shipped"})
    assert r.status_code == 422


def test_advance_nonexistent_project_returns_404(auth_client):
    r = auth_client.post(f"/api/v1/projects/{uuid.uuid4()}/advance", json={"target_stage": "brief"})
    assert r.status_code == 404


# ---------------------------------------------------------------------------
# Integration tests — GET /approvals
# ---------------------------------------------------------------------------


def test_get_pending_approvals_returns_list(auth_client):
    r = auth_client.get("/api/v1/approvals")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_get_pending_approvals_contains_new_approval(auth_client, pending_approval):
    r = auth_client.get("/api/v1/approvals/all")
    assert r.status_code == 200
    assert pending_approval in [a["id"] for a in r.json()]


def test_get_pending_approvals_status_is_pending(auth_client, pending_approval):
    r = auth_client.get(f"/api/v1/approvals/{pending_approval}")
    assert r.status_code == 200
    assert r.json()["status"] == "pending"


# ---------------------------------------------------------------------------
# Integration tests — POST /approvals/{id}/decide
# ---------------------------------------------------------------------------


def test_approve_decision_sets_status_approved(auth_client, pending_approval):
    r = auth_client.post(f"/api/v1/approvals/{pending_approval}/decide", json={"decision": "approve"})
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "approved"
    assert data["resolved_at"] is not None


def test_approve_decision_advances_project_stage(auth_client, project_in_spark):
    pid = project_in_spark["id"]
    auth_client.post(f"/api/v1/projects/{pid}/advance", json={"target_stage": "brief"})
    auth_client.post(f"/api/v1/projects/{pid}/advance", json={"target_stage": "draft_prd"})
    r = auth_client.post(f"/api/v1/projects/{pid}/advance", json={"target_stage": "review"})
    approval_id = r.json()["approval_id"]
    auth_client.post(f"/api/v1/approvals/{approval_id}/decide", json={"decision": "approve"})
    pr = auth_client.get(f"/api/v1/projects/{pid}")
    assert pr.status_code == 200
    assert pr.json()["stage"] == "review"


def test_reject_decision_sets_status_rejected(auth_client, pending_approval):
    r = auth_client.post(f"/api/v1/approvals/{pending_approval}/decide",
                         json={"decision": "reject", "note": "Not ready"})
    assert r.status_code == 200
    assert r.json()["status"] == "rejected"


def test_reject_decision_does_not_advance_project_stage(auth_client, project_in_spark):
    pid = project_in_spark["id"]
    auth_client.post(f"/api/v1/projects/{pid}/advance", json={"target_stage": "brief"})
    auth_client.post(f"/api/v1/projects/{pid}/advance", json={"target_stage": "draft_prd"})
    r = auth_client.post(f"/api/v1/projects/{pid}/advance", json={"target_stage": "review"})
    approval_id = r.json()["approval_id"]
    auth_client.post(f"/api/v1/approvals/{approval_id}/decide", json={"decision": "reject"})
    pr = auth_client.get(f"/api/v1/projects/{pid}")
    assert pr.status_code == 200
    assert pr.json()["stage"] == "draft_prd"


def test_changes_requested_decision_sets_status(auth_client, pending_approval):
    r = auth_client.post(f"/api/v1/approvals/{pending_approval}/decide",
                         json={"decision": "changes_requested", "note": "Update section 3"})
    assert r.status_code == 200
    assert r.json()["status"] == "changes_requested"


def test_cannot_re_decide_resolved_approval(auth_client, pending_approval):
    auth_client.post(f"/api/v1/approvals/{pending_approval}/decide", json={"decision": "reject"})
    r = auth_client.post(f"/api/v1/approvals/{pending_approval}/decide", json={"decision": "approve"})
    assert r.status_code == 422


def test_decide_nonexistent_approval_returns_404(auth_client):
    r = auth_client.post(f"/api/v1/approvals/{uuid.uuid4()}/decide", json={"decision": "approve"})
    assert r.status_code == 404


def test_approval_response_shape(auth_client, pending_approval):
    r = auth_client.get(f"/api/v1/approvals/{pending_approval}")
    assert r.status_code == 200
    data = r.json()
    for field in ("id", "project_id", "type", "status", "request_summary", "created_at"):
        assert field in data, f"Missing field: {field}"
    assert data["type"] == "stage_advance"
    assert data["status"] == "pending"
