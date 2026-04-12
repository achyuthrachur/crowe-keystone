"""Shared pytest configuration and fixtures for all test modules."""
import asyncio
import uuid
from collections.abc import AsyncGenerator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.pool import NullPool
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from src.config import settings
from src.database import Base, get_db, _build_asyncpg_url, _ssl_context
from src.main import app
from src.models.team import Team
from src.models.user import User
from src.routers.auth import hash_password


# ---------------------------------------------------------------------------
# Test database engine — uses the same Neon Postgres DATABASE_URL
# ---------------------------------------------------------------------------
test_engine = create_async_engine(
    _build_asyncpg_url(settings.DATABASE_URL),
    echo=False,
    poolclass=NullPool,
    connect_args={"ssl": _ssl_context},
)
TestingSessionLocal = async_sessionmaker(
    bind=test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


# ---------------------------------------------------------------------------
# Shared fixtures
# ---------------------------------------------------------------------------

@pytest_asyncio.fixture(scope="session", autouse=True)
async def create_tables():
    """Ensure all tables exist before tests run."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


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

    await db.delete(user)
    await db.delete(team)
    await db.commit()


@pytest_asyncio.fixture()
async def auth_client(team_and_user) -> AsyncGenerator[AsyncClient, None]:
    """Authenticated AsyncClient with a valid JWT for the test user."""
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

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
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
