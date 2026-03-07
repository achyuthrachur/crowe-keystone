"""
Phase 7 backend tests — Integrations + Memory + Settings.

Tests cover:
  - GET /team returns team details
  - GET /team/approval-chains returns chains
  - PUT /team/approval-chains updates config
  - POST /decisions creates decision
  - GET /decisions returns list
  - GET /decisions/{id} returns detail
  - GET /memory returns results
  - POST /projects/{id}/retrospective triggers agent
  - GET /projects/{id}/retrospective returns 404 when none
  - GitHub webhook: sample push payload with no matching project returns ok
  - GitHub webhook: ignores non-push events

Run: cd backend && pytest tests/test_phase7.py -v
"""

import json
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
# Setup helpers
# ---------------------------------------------------------------------------


async def _setup_user(db_url: str):
    engine = create_async_engine(_build_asyncpg_url(db_url), echo=False, connect_args={"ssl": _ssl_context})
    factory = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)
    slug = f"test-p7-{uuid.uuid4().hex[:8]}"
    team = Team(name="Phase7 Team", slug=slug)
    async with factory() as s:
        s.add(team)
        await s.flush()
        user = User(
            email=f"test-p7-{uuid.uuid4().hex[:8]}@example.com",
            name="Phase7 Admin",
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


async def _cleanup(db_url: str, team_id, user_id):
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
def p7_client(shared_event_loop):
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
    shared_event_loop.run_until_complete(_cleanup(settings.DATABASE_URL, team.id, user.id))


@pytest.fixture()
def p7_project(p7_client):
    r = p7_client.post("/api/v1/projects", json={"title": f"Phase7 Test {uuid.uuid4().hex[:6]}"})
    assert r.status_code == 201
    project = r.json()
    yield project
    p7_client.delete(f"/api/v1/projects/{project['id']}/archive")


# ---------------------------------------------------------------------------
# Team management tests
# ---------------------------------------------------------------------------


def test_get_team_returns_members(p7_client):
    r = p7_client.get("/api/v1/team")
    assert r.status_code == 200
    data = r.json()
    assert "members" in data
    assert data["member_count"] >= 1
    assert any(m["role"] == "admin" for m in data["members"])


def test_get_approval_chains(p7_client):
    r = p7_client.get("/api/v1/team/approval-chains")
    assert r.status_code == 200
    data = r.json()
    assert "chains" in data
    assert isinstance(data["chains"], dict)


def test_put_approval_chains(p7_client):
    chains = {"review": ["admin"], "approved": ["admin"]}
    r = p7_client.put("/api/v1/team/approval-chains", json={"chains": chains})
    assert r.status_code == 200
    data = r.json()
    assert data["chains"] == chains


# ---------------------------------------------------------------------------
# Decisions tests
# ---------------------------------------------------------------------------


def test_create_decision(p7_client, p7_project):
    r = p7_client.post("/api/v1/decisions", json={
        "title": "Use PostgreSQL over MongoDB",
        "rationale": "Team familiarity, ACID compliance needed.",
        "type": "stack",
        "tags": ["database", "postgres"],
        "project_id": p7_project["id"],
    })
    assert r.status_code == 201
    data = r.json()
    assert data["title"] == "Use PostgreSQL over MongoDB"
    assert "postgres" in data["tags"]
    assert data["type"] == "stack"


def test_list_decisions(p7_client):
    # Create one first
    p7_client.post("/api/v1/decisions", json={
        "title": "Use FastAPI", "rationale": "Async first.", "type": "stack",
    })
    r = p7_client.get("/api/v1/decisions")
    assert r.status_code == 200
    assert isinstance(r.json(), list)
    assert len(r.json()) >= 1


def test_get_decision_detail(p7_client):
    r = p7_client.post("/api/v1/decisions", json={
        "title": "Prefer LangGraph over CrewAI",
        "rationale": "Better checkpoint support.",
        "type": "architectural",
    })
    assert r.status_code == 201
    decision_id = r.json()["id"]

    r2 = p7_client.get(f"/api/v1/decisions/{decision_id}")
    assert r2.status_code == 200
    data = r2.json()
    assert data["title"] == "Prefer LangGraph over CrewAI"
    assert "rationale" in data


# ---------------------------------------------------------------------------
# Memory search tests
# ---------------------------------------------------------------------------


def test_memory_search_returns_results(p7_client):
    # Create a decision to search for
    p7_client.post("/api/v1/decisions", json={
        "title": "Use Neon DB for serverless Postgres",
        "rationale": "Serverless scaling, autosuspend.",
        "type": "stack",
        "tags": ["neon", "postgres"],
    })
    r = p7_client.get("/api/v1/memory?query=neon")
    assert r.status_code == 200
    data = r.json()
    assert "results" in data
    assert any("neon" in str(x.get("title", "")).lower() for x in data["results"])


def test_memory_type_filter(p7_client):
    r = p7_client.get("/api/v1/memory?type=decisions")
    assert r.status_code == 200
    data = r.json()
    assert "results" in data
    assert all(x.get("entry_type") == "decision" for x in data["results"])


# ---------------------------------------------------------------------------
# Retrospective tests
# ---------------------------------------------------------------------------


def test_retrospective_404_when_none(p7_client, p7_project):
    pid = p7_project["id"]
    r = p7_client.get(f"/api/v1/projects/{pid}/retrospective")
    assert r.status_code == 404


def test_trigger_retrospective_returns_run_id(p7_client, p7_project):
    pid = p7_project["id"]
    r = p7_client.post(f"/api/v1/projects/{pid}/retrospective")
    assert r.status_code == 202
    data = r.json()
    assert "run_id" in data
    assert data["status"] == "generating"


# ---------------------------------------------------------------------------
# GitHub webhook tests
# ---------------------------------------------------------------------------


def test_github_webhook_unknown_repo(p7_client):
    """Unknown repo returns 200 with ignored=true (never errors GitHub)."""
    payload = {
        "ref": "refs/heads/main",
        "repository": {"full_name": "achyuthrachur/unknown-project-xyz"},
        "commits": [{"id": "abc1234", "message": "fix: updated login"}],
    }
    r = p7_client.post(
        "/api/v1/webhooks/github",
        content=json.dumps(payload),
        headers={"X-GitHub-Event": "push", "Content-Type": "application/json"},
    )
    assert r.status_code == 200
    data = r.json()
    assert data.get("ok") is True or "ignored" in data


def test_github_webhook_non_push_event(p7_client):
    """Non-push events are accepted but ignored."""
    r = p7_client.post(
        "/api/v1/webhooks/github",
        content=json.dumps({"action": "opened"}),
        headers={"X-GitHub-Event": "pull_request", "Content-Type": "application/json"},
    )
    assert r.status_code == 200
    data = r.json()
    assert data.get("ok") is True
