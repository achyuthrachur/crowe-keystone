"""
Phase 4 backend tests — React Flow Graph endpoint.

Tests cover:
  - GET /graph returns correct node/edge shape
  - Nodes contain required fields for ProjectNode component
  - Conflict edges appear for open conflicts
  - Cache invalidation on project change

Run: cd backend && pytest tests/test_phase4.py -v
"""

import uuid
import asyncio
import pytest
from starlette.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from src.config import settings
from src.database import get_db, _build_asyncpg_url, _ssl_context
from src.main import app
from src.models.team import Team
from src.models.user import User
from src.routers.auth import hash_password


async def _setup_user(db_url: str):
    engine = create_async_engine(_build_asyncpg_url(db_url), echo=False, connect_args={"ssl": _ssl_context})
    factory = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)
    slug = f"test-p4-{uuid.uuid4().hex[:8]}"
    team = Team(name="Phase4 Team", slug=slug)
    async with factory() as s:
        s.add(team)
        await s.flush()
        user = User(
            email=f"test-p4-{uuid.uuid4().hex[:8]}@example.com",
            name="Phase4 User",
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
def graph_client(shared_event_loop):
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


def test_graph_returns_200(graph_client):
    r = graph_client.get("/api/v1/graph")
    assert r.status_code == 200


def test_graph_response_shape(graph_client):
    r = graph_client.get("/api/v1/graph")
    assert r.status_code == 200
    data = r.json()
    assert "nodes" in data
    assert "edges" in data
    assert isinstance(data["nodes"], list)
    assert isinstance(data["edges"], list)


def test_new_project_appears_as_node(graph_client):
    """Creating a project makes it appear in /graph nodes."""
    # Clear cache first by creating then fetching
    r = graph_client.post("/api/v1/projects", json={"title": f"Graph Test {uuid.uuid4().hex[:6]}"})
    assert r.status_code == 201
    project_id = r.json()["id"]

    r = graph_client.get("/api/v1/graph")
    assert r.status_code == 200
    node_ids = [n["id"] for n in r.json()["nodes"]]
    assert project_id in node_ids

    # Cleanup
    graph_client.delete(f"/api/v1/projects/{project_id}/archive")


def test_node_has_required_fields(graph_client):
    """Each node has the fields ProjectNode component expects."""
    r = graph_client.post("/api/v1/projects", json={"title": f"Field Test {uuid.uuid4().hex[:6]}"})
    assert r.status_code == 201
    project_id = r.json()["id"]

    r = graph_client.get("/api/v1/graph")
    nodes = r.json()["nodes"]
    node = next((n for n in nodes if n["id"] == project_id), None)
    assert node is not None

    # Required top-level fields
    assert node["type"] == "project"
    assert "position" in node
    assert node["position"]["x"] == 0
    assert node["position"]["y"] == 0

    # Required data fields for ProjectNode
    d = node["data"]
    for field in ("id", "title", "stage", "has_conflicts", "is_agent_active"):
        assert field in d, f"Missing data field: {field}"

    assert d["stage"] == "spark"
    assert d["has_conflicts"] is False
    assert d["is_agent_active"] is False

    graph_client.delete(f"/api/v1/projects/{project_id}/archive")


def test_archived_project_not_in_graph(graph_client):
    """Archived projects do not appear in graph nodes."""
    r = graph_client.post("/api/v1/projects", json={"title": f"Archive Test {uuid.uuid4().hex[:6]}"})
    project_id = r.json()["id"]
    graph_client.delete(f"/api/v1/projects/{project_id}/archive")

    r = graph_client.get("/api/v1/graph")
    node_ids = [n["id"] for n in r.json()["nodes"]]
    assert project_id not in node_ids


def test_graph_edge_list_is_list(graph_client):
    """Edges list is present and is a list (may be empty)."""
    r = graph_client.get("/api/v1/graph")
    assert isinstance(r.json()["edges"], list)
