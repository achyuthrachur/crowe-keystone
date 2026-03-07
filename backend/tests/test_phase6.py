"""
Phase 6 backend tests — Agent Integration.

Tests cover:
  - GET /projects/{id}/kickoff-prompt returns 404 when no PRD
  - GET /projects/{id}/kickoff-prompt returns prompt after PRD created
  - POST /projects/{id}/build-log creates agent_run record
  - GET /daily returns generating status when no brief today
  - approval_router agent triggered on stage advance (via agent_runs table)

Run: cd backend && pytest tests/test_phase6.py -v
"""

import uuid
import pytest
from starlette.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from src.config import settings
from src.database import get_db, _build_asyncpg_url, _ssl_context
from src.main import app
from src.models.team import Team
from src.models.user import User
from src.routers.auth import hash_password


# ---------------------------------------------------------------------------
# Shared setup helpers
# ---------------------------------------------------------------------------


async def _setup_user(db_url: str):
    engine = create_async_engine(_build_asyncpg_url(db_url), echo=False, connect_args={"ssl": _ssl_context})
    factory = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)
    slug = f"test-p6-{uuid.uuid4().hex[:8]}"
    team = Team(name="Phase6 Team", slug=slug)
    async with factory() as s:
        s.add(team)
        await s.flush()
        user = User(
            email=f"test-p6-{uuid.uuid4().hex[:8]}@example.com",
            name="Phase6 User",
            team_id=team.id,
            role="admin",
            hashed_password=hash_password("testpassword123"),
        )
        s.add(user)
        await s.commit()
        await s.refresh(team)
        await s.refresh(user)
    await engine.dispose()
    return team, user


async def _cleanup_user(db_url: str, team_id, user_id):
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
def p6_client(shared_event_loop):
    team, user = shared_event_loop.run_until_complete(_setup_user(settings.DATABASE_URL))
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
    r = client.post("/api/v1/auth/login", json={"email": user.email, "password": "testpassword123"})
    assert r.status_code == 200, f"Login failed: {r.text}"
    client.headers["Authorization"] = f"Bearer {r.json()['token']}"
    yield client
    app.dependency_overrides.clear()
    shared_event_loop.run_until_complete(_cleanup_user(settings.DATABASE_URL, team.id, user.id))


@pytest.fixture()
def p6_project(p6_client):
    r = p6_client.post("/api/v1/projects", json={"title": f"Phase6 Test {uuid.uuid4().hex[:6]}"})
    assert r.status_code == 201
    project = r.json()
    yield project
    p6_client.delete(f"/api/v1/projects/{project['id']}/archive")


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


def test_kickoff_prompt_404_when_no_prd(p6_client, p6_project):
    """GET /kickoff-prompt returns 404 when project has no PRD."""
    pid = p6_project["id"]
    r = p6_client.get(f"/api/v1/projects/{pid}/kickoff-prompt")
    assert r.status_code == 404


def test_kickoff_prompt_returns_prompt_when_prd_has_one(p6_client, p6_project):
    """GET /kickoff-prompt returns prompt from PRD claude_code_prompt field."""
    pid = p6_project["id"]
    content = {
        "problem_statement": "Test problem",
        "user_stories": [], "functional_requirements": [], "non_functional_requirements": [],
        "out_of_scope": [], "stack": ["Next.js"], "component_inventory": [],
        "data_layer_spec": {}, "api_contracts": [], "success_criteria": [],
        "open_questions": [], "claude_code_prompt": "Use claude to build this project.",
    }
    p6_client.put(f"/api/v1/projects/{pid}/prd", json={"content": content})
    r = p6_client.get(f"/api/v1/projects/{pid}/kickoff-prompt")
    assert r.status_code == 200
    data = r.json()
    assert "prompt" in data
    assert len(data["prompt"]) > 0


def test_build_log_creates_agent_run(p6_client, p6_project):
    """POST /build-log creates an agent_run record and returns a run_id."""
    pid = p6_project["id"]
    r = p6_client.post(
        f"/api/v1/projects/{pid}/build-log",
        json={"raw_notes": "Deployed v1.2. Fixed the login flow. Next: add email notifications.", "source": "manual"},
    )
    assert r.status_code == 200
    data = r.json()
    assert "run_id" in data
    assert data["run_id"] != "stub"
    # Verify the agent_run is retrievable
    run_id = data["run_id"]
    r2 = p6_client.get(f"/api/v1/agents/run/{run_id}")
    assert r2.status_code == 200
    assert r2.json()["agent_type"] == "update_writer"


def test_daily_brief_endpoint_exists(p6_client):
    """GET /daily returns a valid response (generating or ready)."""
    r = p6_client.get("/api/v1/daily")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] in ("ready", "generating")
    assert "brief" in data
    brief = data["brief"]
    assert "active_work" in brief
    assert "waiting_on_you" in brief
    assert "team_activity" in brief
    assert "upcoming" in brief


def test_daily_brief_has_run_id_when_generating(p6_client):
    """GET /daily returns a run_id when triggering generation."""
    r = p6_client.get("/api/v1/daily")
    assert r.status_code == 200
    data = r.json()
    if data["status"] == "generating":
        assert "run_id" in data
        assert len(data["run_id"]) > 0
