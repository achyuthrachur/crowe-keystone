import logging
import ssl
from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from src.config import settings

logger = logging.getLogger(__name__)


class Base(DeclarativeBase):
    """Shared declarative base for all SQLAlchemy models."""
    pass


# ---------------------------------------------------------------------------
# Build clean asyncpg URL — strip psycopg2/libpq-specific query params that
# asyncpg doesn't understand (sslmode, channel_binding).  SSL is passed via
# connect_args instead.
# ---------------------------------------------------------------------------
def _build_asyncpg_url(url: str) -> str:
    for param in ("sslmode=require", "sslmode=verify-full", "sslmode=verify-ca",
                  "channel_binding=require", "channel_binding=disable"):
        url = url.replace("&" + param, "").replace("?" + param + "&", "?").replace("?" + param, "")
    return url.rstrip("?")


_asyncpg_url = _build_asyncpg_url(settings.DATABASE_URL)

# asyncpg needs ssl=True passed as a connect_arg, not in the URL
_ssl_context = ssl.create_default_context()
_ssl_context.check_hostname = False
_ssl_context.verify_mode = ssl.CERT_NONE  # corporate proxy may intercept; app traffic is still encrypted


# ---------------------------------------------------------------------------
# Engine — created once at module import time.
# ---------------------------------------------------------------------------
engine: AsyncEngine = create_async_engine(
    _asyncpg_url,
    echo=settings.is_development,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10,
    connect_args={"ssl": _ssl_context},
)

# ---------------------------------------------------------------------------
# Session factory
# ---------------------------------------------------------------------------
AsyncSessionLocal: async_sessionmaker[AsyncSession] = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


# ---------------------------------------------------------------------------
# FastAPI dependency — yields an async session per request, rolls back on error
# ---------------------------------------------------------------------------
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


# ---------------------------------------------------------------------------
# Startup initialiser — called from FastAPI lifespan
# Does NOT create tables (Alembic handles that); just verifies connectivity.
# ---------------------------------------------------------------------------
async def init_db() -> None:
    try:
        async with engine.begin() as conn:
            # Light connectivity check
            from sqlalchemy import text
            await conn.execute(text("SELECT 1"))
        logger.info("Database connection verified successfully.")
    except Exception as exc:
        logger.error("Database connection failed on startup: %s", exc)
        raise
