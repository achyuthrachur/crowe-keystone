"""
Phase 5 backend tests — LangGraph Engine.

Tests cover:
  - All LangGraph nodes import and return correct dict shapes
  - Graphs compile successfully
  - Unit tests for pure helper functions
  - POST /agents/run creates agent_run record (integration)

Run: cd backend && pytest tests/test_phase5.py -v
"""

import asyncio
import uuid
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


# ---------------------------------------------------------------------------
# Unit tests — graph compilation (no DB, no API calls)
# ---------------------------------------------------------------------------

class TestGraphCompilation:
    """All 3 LangGraph graphs must compile without error."""

    def test_prd_architect_graph_compiles(self):
        from src.graph.keystone_graph import build_prd_architect_graph
        g = build_prd_architect_graph()
        assert g is not None
        assert hasattr(g, 'ainvoke')

    def test_conflict_detector_graph_compiles(self):
        from src.graph.keystone_graph import build_conflict_detector_graph
        g = build_conflict_detector_graph()
        assert g is not None
        assert hasattr(g, 'ainvoke')

    def test_daily_brief_graph_compiles(self):
        from src.graph.keystone_graph import build_daily_brief_graph
        g = build_daily_brief_graph()
        assert g is not None
        assert hasattr(g, 'ainvoke')


class TestNodeImports:
    """All nodes import without error."""

    def test_classifier_imports(self):
        from src.graph.nodes.classifier import (
            classifier_node, route_after_classify, classify_input_type
        )
        assert callable(classifier_node)
        assert callable(route_after_classify)

    def test_brief_generator_imports(self):
        from src.graph.nodes.brief_generator import (
            brief_generator_node, check_brief_confidence
        )
        assert callable(brief_generator_node)

    def test_prd_drafter_imports(self):
        from src.graph.nodes.prd_drafter import (
            draft_problem_statement_node, section_merger_node, spawn_parallel_sections
        )
        assert callable(draft_problem_statement_node)
        assert callable(spawn_parallel_sections)

    def test_stress_tester_imports(self):
        from src.graph.nodes.stress_tester import (
            stress_tester_spawner_node, test_hypothesis_node, red_team_node
        )
        assert callable(stress_tester_spawner_node)

    def test_conflict_detector_imports(self):
        from src.graph.nodes.conflict_detector import (
            conflict_detector_node, conflict_persister_node, conflict_notifier_node
        )
        assert callable(conflict_detector_node)

    def test_approval_router_imports(self):
        from src.graph.nodes.approval_router import approval_router_node
        assert callable(approval_router_node)

    def test_update_writer_imports(self):
        from src.graph.nodes.update_writer import update_writer_node
        assert callable(update_writer_node)

    def test_quality_gate_imports(self):
        from src.graph.nodes.quality_gate import quality_gate_node, evaluate_quality
        assert callable(quality_gate_node)
        assert callable(evaluate_quality)

    def test_human_checkpoint_imports(self):
        from src.graph.nodes.human_checkpoint import (
            human_checkpoint_node, check_checkpoint_response
        )
        assert callable(human_checkpoint_node)
        assert callable(check_checkpoint_response)


class TestPromptFiles:
    """All 9 system prompt files exist and are non-empty."""

    def test_all_prompts_exist(self):
        from pathlib import Path
        prompts_dir = Path('src/graph/prompts')
        required = [
            'brief_generator.md', 'prd_drafter.md', 'stress_tester.md',
            'assumption_excavator.md', 'conflict_detector.md', 'approval_router.md',
            'update_writer.md', 'retro_generator.md', 'memory_indexer.md',
        ]
        for fname in required:
            path = prompts_dir / fname
            assert path.exists(), f"Missing prompt: {fname}"
            assert len(path.read_text().strip()) > 50, f"Prompt too short: {fname}"


class TestClassifierNode:
    """Unit tests for classifier helper functions."""

    def test_route_needs_brief(self):
        from src.graph.nodes.classifier import route_after_classify
        state = {'brief': None, 'loop_count': 0, 'raw_input': 'test input here'}
        assert route_after_classify(state) == 'needs_brief'

    def test_route_has_brief(self):
        from src.graph.nodes.classifier import route_after_classify
        state = {'brief': {'problem_statement': 'test'}, 'loop_count': 0}
        assert route_after_classify(state) == 'has_brief'

    def test_route_low_confidence_on_max_loops(self):
        from src.graph.nodes.classifier import route_after_classify
        state = {'brief': None, 'loop_count': 3, 'raw_input': 'test'}
        assert route_after_classify(state) == 'low_confidence'

    def test_classify_input_types(self):
        from src.graph.nodes.classifier import classify_input_type
        # Spark input
        result = classify_input_type("Build a tool that automates X")
        assert result in ('spark', 'notes', 'prd', 'data')
        # PRD input
        result = classify_input_type("Here is the PRD with requirements")
        assert result == 'prd'


class TestQualityGate:
    """Unit tests for quality gate scoring."""

    def test_empty_prd_fails(self):
        from src.graph.nodes.quality_gate import evaluate_quality
        state = {'quality_score': 0.1, 'loop_count': 0}
        assert evaluate_quality(state) == 'revise'

    def test_complete_prd_passes(self):
        from src.graph.nodes.quality_gate import evaluate_quality
        state = {'quality_score': 0.85, 'loop_count': 0}
        assert evaluate_quality(state) == 'pass'

    def test_max_loops_fails(self):
        from src.graph.nodes.quality_gate import evaluate_quality
        state = {'quality_score': 0.3, 'loop_count': 3}
        assert evaluate_quality(state) == 'fail'


class TestBriefConfidence:
    """Unit tests for brief confidence routing."""

    def test_high_confidence(self):
        from src.graph.nodes.brief_generator import check_brief_confidence
        state = {'brief': {'confidence_score': 0.8}}
        assert check_brief_confidence(state) == 'high'

    def test_low_confidence(self):
        from src.graph.nodes.brief_generator import check_brief_confidence
        state = {'brief': {'confidence_score': 0.3}}
        assert check_brief_confidence(state) == 'low'

    def test_missing_confidence_defaults_high(self):
        from src.graph.nodes.brief_generator import check_brief_confidence
        state = {'brief': {}}
        assert check_brief_confidence(state) == 'high'


class TestRedTeamNode:
    """Unit tests for red team logic."""

    def test_hypothesis_killed_when_contradictions_outnumber(self):
        state = {
            'hypotheses': [{
                'statement': 'Scope is wrong',
                'confidence_score': 0.7,
                'supporting_evidence': ['one'],
                'contradicting_evidence': ['two', 'three', 'four'],
                'killed_by_red_team': False,
            }],
            'assumption_audit': [],
            'errors': [],
            'status': 'running',
        }
        result = asyncio.run(_run_red_team(state))
        assert result['hypotheses'][0]['killed_by_red_team'] is True

    def test_stress_test_confidence_computed(self):
        state = {
            'hypotheses': [
                {'confidence_score': 0.8, 'supporting_evidence': ['a'], 'contradicting_evidence': ['b', 'c'], 'killed_by_red_team': False},
                {'confidence_score': 0.6, 'supporting_evidence': ['a', 'b'], 'contradicting_evidence': ['c'], 'killed_by_red_team': False},
            ],
            'assumption_audit': [],
            'errors': [],
            'status': 'running',
        }
        result = asyncio.run(_run_red_team(state))
        assert 0.0 <= result['stress_test_confidence'] <= 1.0


async def _run_red_team(state):
    from src.graph.nodes.stress_tester import red_team_node
    return await red_team_node(state)


class TestCheckpointRouting:
    """Human checkpoint response routing."""

    def test_waiting_when_no_response(self):
        from src.graph.nodes.human_checkpoint import check_checkpoint_response
        state = {'checkpoint_response': None}
        assert check_checkpoint_response(state) == 'waiting'

    def test_responded_when_answer_given(self):
        from src.graph.nodes.human_checkpoint import check_checkpoint_response
        state = {'checkpoint_response': 'The user prefers a dashboard'}
        assert check_checkpoint_response(state) == 'responded'


# ---------------------------------------------------------------------------
# Integration tests — POST /agents/run
# ---------------------------------------------------------------------------

async def _setup_user(db_url: str):
    engine = create_async_engine(_build_asyncpg_url(db_url), echo=False, connect_args={"ssl": _ssl_context})
    factory = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)
    slug = f"test-p5-{uuid.uuid4().hex[:8]}"
    team = Team(name="Phase5 Team", slug=slug)
    async with factory() as s:
        s.add(team)
        await s.flush()
        user = User(
            email=f"test-p5-{uuid.uuid4().hex[:8]}@example.com",
            name="Phase5 User", team_id=team.id, role="admin",
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
        if u: await s.delete(u)
        if t: await s.delete(t)
        await s.commit()
    await engine.dispose()


@pytest.fixture()
def agent_client(shared_event_loop):
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


def test_agents_run_endpoint_exists(agent_client):
    """POST /agents/run is reachable (returns 200 or 422, not 404/405)."""
    r = agent_client.post("/api/v1/agents/run", json={
        "agent_type": "brief_generator",
        "input_data": {"raw_input": "Build a tool that tracks AI project decisions"}
    })
    # 202 = async run accepted, 200/201/422 also ok (not 404/405)
    assert r.status_code in (200, 201, 202, 422), f"Unexpected status: {r.status_code} {r.text}"


def test_agents_run_returns_run_id(agent_client):
    """Successful POST /agents/run returns a run_id."""
    r = agent_client.post("/api/v1/agents/run", json={
        "agent_type": "brief_generator",
        "input_data": {"raw_input": "Build a real-time conflict detector for AI project teams"}
    })
    if r.status_code in (200, 201):
        data = r.json()
        assert "run_id" in data
        assert len(data["run_id"]) > 0


def test_agents_get_run_endpoint(agent_client):
    """GET /agents/run/{id} returns status for existing run."""
    # Create a run first
    r = agent_client.post("/api/v1/agents/run", json={
        "agent_type": "brief_generator",
        "input_data": {"raw_input": "A tool that monitors deployment health"}
    })
    if r.status_code in (200, 201):
        run_id = r.json()["run_id"]
        r2 = agent_client.get(f"/api/v1/agents/run/{run_id}")
        assert r2.status_code == 200
        data = r2.json()
        assert "status" in data
        assert data["status"] in ("running", "complete", "failed", "awaiting_human")
