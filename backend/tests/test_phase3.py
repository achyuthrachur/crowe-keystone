"""
Phase 3 backend tests — Living PRD System.

Tests cover:
  - prd_service: has_blocking_open_questions, compute_diff, count_words (pure functions)
  - POST /projects/{id}/prd: creates version 1
  - PUT /projects/{id}/prd: creates version 2, supersedes version 1
  - Blocking open question blocks stage advance (422)
  - Non-blocking questions allow stage advance

Run: cd backend && pytest tests/test_phase3.py -v
"""

import uuid
import asyncio
import pytest
import pytest_asyncio
from starlette.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from src.config import settings
from src.database import get_db, _build_asyncpg_url, _ssl_context
from src.main import app
from src.models.team import Team
from src.models.user import User
from src.routers.auth import hash_password
from src.services.prd_service import (
    has_blocking_open_questions,
    compute_diff,
    count_words,
)


# ---------------------------------------------------------------------------
# Unit tests — pure functions (no DB)
# ---------------------------------------------------------------------------


class TestHasBlockingOpenQuestions:
    def _make_prd(self, questions):
        """Helper: mock Prd-like object with open_questions."""
        class FakePrd:
            def __init__(self, qs):
                self.open_questions = qs
        return FakePrd(questions)

    def test_no_questions_returns_false(self):
        prd = self._make_prd([])
        assert has_blocking_open_questions(prd) is False

    def test_all_answered_returns_false(self):
        prd = self._make_prd([
            {"blocking": True, "answered": True},
            {"blocking": True, "answered": True},
        ])
        assert has_blocking_open_questions(prd) is False

    def test_unanswered_non_blocking_returns_false(self):
        prd = self._make_prd([
            {"blocking": False, "answered": False},
        ])
        assert has_blocking_open_questions(prd) is False

    def test_unanswered_blocking_returns_true(self):
        prd = self._make_prd([
            {"blocking": True, "answered": False},
        ])
        assert has_blocking_open_questions(prd) is True

    def test_mixed_one_blocking_unanswered(self):
        prd = self._make_prd([
            {"blocking": False, "answered": False},
            {"blocking": True, "answered": True},
            {"blocking": True, "answered": False},  # this one blocks
        ])
        assert has_blocking_open_questions(prd) is True

    def test_null_open_questions_returns_false(self):
        prd = self._make_prd(None)
        assert has_blocking_open_questions(prd) is False


class TestComputeDiff:
    def test_identical_content_produces_empty_diff(self):
        content = {"problem_statement": "Test", "stack": ["Next.js"]}
        diff = compute_diff(content, content)
        assert diff == []

    def test_changed_field_in_diff(self):
        old = {"problem_statement": "Old text"}
        new = {"problem_statement": "New text"}
        diff = compute_diff(old, new)
        assert len(diff) == 1
        assert diff[0]["section"] == "problem_statement"
        assert diff[0]["old"] == "Old text"
        assert diff[0]["new"] == "New text"

    def test_added_field_in_diff(self):
        old = {}
        new = {"problem_statement": "New"}
        diff = compute_diff(old, new)
        assert len(diff) == 1

    def test_multiple_changes(self):
        old = {"a": "old_a", "b": "same", "c": "old_c"}
        new = {"a": "new_a", "b": "same", "c": "new_c"}
        diff = compute_diff(old, new)
        assert len(diff) == 2
        sections = {d["section"] for d in diff}
        assert sections == {"a", "c"}


class TestCountWords:
    def test_simple_string(self):
        assert count_words({"field": "hello world"}) == 2

    def test_empty_content(self):
        assert count_words({}) == 0

    def test_nested_list(self):
        content = {"items": ["one two", "three"]}
        assert count_words(content) == 3

    def test_nested_dict(self):
        content = {"meta": {"title": "one two three"}}
        assert count_words(content) == 3

    def test_mixed_types_ignored(self):
        # Non-string values are ignored
        content = {"count": 42, "flag": True, "text": "hello"}
        assert count_words(content) == 1


# ---------------------------------------------------------------------------
# Helpers for integration tests (sync + shared event loop)
# ---------------------------------------------------------------------------


async def _setup_user(db_url: str):
    engine = create_async_engine(_build_asyncpg_url(db_url), echo=False, connect_args={"ssl": _ssl_context})
    factory = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)
    slug = f"test-p3-{uuid.uuid4().hex[:8]}"
    team = Team(name="Phase3 Team", slug=slug)
    async with factory() as s:
        s.add(team)
        await s.flush()
        user = User(
            email=f"test-p3-{uuid.uuid4().hex[:8]}@example.com",
            name="Phase3 User",
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
def prd_client(shared_event_loop):
    """TestClient with auth for Phase 3 PRD tests."""
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
def project_for_prd(prd_client):
    """Create a project for PRD tests."""
    r = prd_client.post("/api/v1/projects", json={"title": f"PRD Test {uuid.uuid4().hex[:6]}"})
    assert r.status_code == 201
    project = r.json()
    yield project
    prd_client.delete(f"/api/v1/projects/{project['id']}/archive")


SAMPLE_CONTENT = {
    "problem_statement": "Teams lose track of decisions during AI product builds.",
    "user_stories": [{"as": "a PM", "i_want": "to track PRD versions"}],
    "functional_requirements": [{"id": "FR-01", "description": "PRD versioning"}],
    "non_functional_requirements": [],
    "out_of_scope": ["Email integration"],
    "stack": ["Next.js", "FastAPI", "LangGraph"],
    "component_inventory": [],
    "data_layer_spec": {"primary_db": "Postgres"},
    "api_contracts": [],
    "success_criteria": ["Users can create and version PRDs"],
}


# ---------------------------------------------------------------------------
# Integration tests — PRD CRUD
# ---------------------------------------------------------------------------


def test_get_prd_404_when_none_exists(prd_client, project_for_prd):
    """GET /prd on a fresh project returns 404."""
    pid = project_for_prd["id"]
    r = prd_client.get(f"/api/v1/projects/{pid}/prd")
    assert r.status_code == 404


def test_put_creates_prd_version_1(prd_client, project_for_prd):
    """PUT /prd creates version 1."""
    pid = project_for_prd["id"]
    r = prd_client.put(f"/api/v1/projects/{pid}/prd", json={"content": SAMPLE_CONTENT})
    assert r.status_code == 200
    data = r.json()
    assert data["version"] == 1
    assert data["status"] == "draft"
    assert data["content"]["problem_statement"] == SAMPLE_CONTENT["problem_statement"]


def test_put_second_time_creates_version_2(prd_client, project_for_prd):
    """Second PUT creates version 2 and supersedes version 1."""
    pid = project_for_prd["id"]
    prd_client.put(f"/api/v1/projects/{pid}/prd", json={"content": SAMPLE_CONTENT})

    updated = dict(SAMPLE_CONTENT)
    updated["problem_statement"] = "Updated problem statement."
    r = prd_client.put(f"/api/v1/projects/{pid}/prd", json={"content": updated})
    assert r.status_code == 200
    data = r.json()
    assert data["version"] == 2
    assert data["content"]["problem_statement"] == "Updated problem statement."


def test_get_prd_after_creation(prd_client, project_for_prd):
    """GET /prd returns the current version after PUT."""
    pid = project_for_prd["id"]
    prd_client.put(f"/api/v1/projects/{pid}/prd", json={"content": SAMPLE_CONTENT})
    r = prd_client.get(f"/api/v1/projects/{pid}/prd")
    assert r.status_code == 200
    data = r.json()
    assert data["version"] >= 1
    assert "content" in data


def test_versions_list_grows(prd_client, project_for_prd):
    """GET /prd/versions returns all versions."""
    pid = project_for_prd["id"]
    prd_client.put(f"/api/v1/projects/{pid}/prd", json={"content": SAMPLE_CONTENT})
    prd_client.put(f"/api/v1/projects/{pid}/prd", json={"content": SAMPLE_CONTENT})
    r = prd_client.get(f"/api/v1/projects/{pid}/prd/versions")
    assert r.status_code == 200
    versions = r.json()
    assert len(versions) >= 2


def test_blocking_question_blocks_advance(prd_client, project_for_prd):
    """Stage advance to review is blocked when PRD has unanswered blocking questions."""
    pid = project_for_prd["id"]
    content_with_blocking = dict(SAMPLE_CONTENT)
    blocking_questions = [{"id": "Q-01", "question": "Who are the users?", "blocking": True, "answered": False}]
    prd_client.put(f"/api/v1/projects/{pid}/prd",
                   json={"content": content_with_blocking, "open_questions": blocking_questions})

    # Advance to draft_prd first (spark→brief→draft_prd)
    prd_client.post(f"/api/v1/projects/{pid}/advance", json={"target_stage": "brief"})
    prd_client.post(f"/api/v1/projects/{pid}/advance", json={"target_stage": "draft_prd"})

    # Now try to advance to review — should be blocked
    r = prd_client.post(f"/api/v1/projects/{pid}/advance", json={"target_stage": "review"})
    assert r.status_code == 422
    assert "blocking" in r.json()["detail"].lower() or "question" in r.json()["detail"].lower()


def test_non_blocking_questions_allow_advance(prd_client, project_for_prd):
    """Non-blocking questions do NOT block stage advance."""
    pid = project_for_prd["id"]
    non_blocking_questions = [{"id": "Q-01", "question": "Nice to have?", "blocking": False, "answered": False}]
    prd_client.put(f"/api/v1/projects/{pid}/prd",
                   json={"content": SAMPLE_CONTENT, "open_questions": non_blocking_questions})

    prd_client.post(f"/api/v1/projects/{pid}/advance", json={"target_stage": "brief"})
    prd_client.post(f"/api/v1/projects/{pid}/advance", json={"target_stage": "draft_prd"})

    # Should NOT be blocked (non-blocking questions are fine)
    r = prd_client.post(f"/api/v1/projects/{pid}/advance", json={"target_stage": "review"})
    # Returns 200 (approval created) not 422
    assert r.status_code == 200
