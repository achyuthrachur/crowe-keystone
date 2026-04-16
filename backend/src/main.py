"""
Crowe Keystone — FastAPI application entry point.

IMPORTANT: Run with --workers 1 only.
The SSE stream.py module uses in-memory asyncio queues that are NOT shared across
multiple worker processes. If horizontal scaling is needed in Phase 9+, migrate to
Redis pub/sub and this restriction can be lifted.
"""

import logging
import time
from collections import defaultdict
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from src.config import settings
from src.database import init_db
from src.routers import auth, health, push, stream
from src.routers import agents as agents_router
from src.routers import team as team_router
from src.routers import engagements as engagements_router
from src.routers import upload as upload_router
from src.routers import runs as runs_router
from src.routers import output as output_router

logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s %(levelname)-8s %(name)s  %(message)s",
)
logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Lifespan — replaces deprecated @app.on_event("startup")
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Crowe Keystone API (env=%s)", settings.ENVIRONMENT)
    await init_db()

    # ── Crash recovery — mark interrupted runs as failed on startup ───────────
    from datetime import datetime, timezone
    from sqlalchemy import select, update as sa_update
    from src.database import AsyncSessionLocal
    from src.models.keystone_run import KeystoneRun
    from src.models.engagement import Engagement

    _INTERRUPTED = ("running", "awaiting_review_1", "awaiting_review_2",
                    "awaiting_review_3", "compiling")

    async with AsyncSessionLocal() as _db:
        _result = await _db.execute(
            select(KeystoneRun).where(KeystoneRun.status.in_(_INTERRUPTED))
        )
        _runs = _result.scalars().all()
        if _runs:
            logger.warning("Startup: marking %d interrupted run(s) as failed.", len(_runs))
            for _run in _runs:
                _run.status = "failed"
                _run.error = "Server restarted while run was in progress. Please re-run."
                _run.completed_at = datetime.now(tz=timezone.utc)
                await _db.execute(
                    sa_update(Engagement)
                    .where(Engagement.id == _run.engagement_id)
                    .values(status="failed")
                )
            await _db.commit()

    yield
    logger.info("Crowe Keystone API shutting down.")


# ---------------------------------------------------------------------------
# App instance
# ---------------------------------------------------------------------------
app = FastAPI(
    title="Crowe Keystone API",
    description="Backend API for the Crowe Keystone project management platform.",
    version="1.0.0",
    docs_url="/docs" if settings.is_development else None,
    redoc_url="/redoc" if settings.is_development else None,
    lifespan=lifespan,
)

# ---------------------------------------------------------------------------
# CORS — reads allowed origins from config (comma-separated list)
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_origin_regex=r"https://[^/]+\.vercel\.app|http://localhost(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Request logging middleware
# ---------------------------------------------------------------------------

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    duration_ms = int((time.perf_counter() - start) * 1000)
    logger.info(
        "%s %s %d %dms",
        request.method,
        request.url.path,
        response.status_code,
        duration_ms,
    )
    return response


# ---------------------------------------------------------------------------
# In-memory rate limiter for agent trigger endpoints
# Limit: 10 requests per minute per user (keyed by Bearer token prefix)
# ---------------------------------------------------------------------------

_rate_limit_store: dict = defaultdict(list)
_AGENT_RATE_LIMIT = 10   # max requests per window
_AGENT_RATE_WINDOW = 60  # seconds


@app.middleware("http")
async def agent_rate_limiter(request: Request, call_next):
    if request.url.path.endswith("/agents/run") and request.method == "POST":
        auth = request.headers.get("Authorization", "")
        key = auth[:40] if auth else request.client.host if request.client else "anon"
        now = time.time()
        _rate_limit_store[key] = [t for t in _rate_limit_store[key] if now - t < _AGENT_RATE_WINDOW]
        if len(_rate_limit_store[key]) >= _AGENT_RATE_LIMIT:
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={"detail": f"Rate limit exceeded: max {_AGENT_RATE_LIMIT} agent runs per minute"},
            )
        _rate_limit_store[key].append(now)
    return await call_next(request)


# ---------------------------------------------------------------------------
# Global exception handler — returns structured JSON errors
# ---------------------------------------------------------------------------
@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled exception on %s %s", request.method, request.url.path)
    response = JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An internal server error occurred. Please try again later."},
    )
    # This handler runs inside ServerErrorMiddleware (outermost), which is outside
    # CORSMiddleware — so CORS headers are never added automatically to 500 responses.
    # We must add them manually so the browser can read the error body cross-origin.
    import re as _re
    origin = request.headers.get("origin", "")
    if origin and (
        origin in settings.allowed_origins_list
        or _re.match(r"https://[^/]+\.vercel\.app$|http://localhost(:\d+)?$", origin)
    ):
        response.headers["access-control-allow-origin"] = origin
        response.headers["access-control-allow-credentials"] = "true"
    return response


# ---------------------------------------------------------------------------
# Router registration — all under /api/v1
# ---------------------------------------------------------------------------
API_PREFIX = "/api/v1"

app.include_router(health.router, prefix=API_PREFIX)
app.include_router(auth.router, prefix=API_PREFIX)
app.include_router(push.router, prefix=API_PREFIX)
app.include_router(stream.router, prefix=API_PREFIX)
app.include_router(agents_router.router, prefix=API_PREFIX)
app.include_router(team_router.router, prefix=API_PREFIX)
app.include_router(engagements_router.router, prefix=API_PREFIX)
app.include_router(upload_router.router, prefix=API_PREFIX)
app.include_router(runs_router.router, prefix=API_PREFIX)
app.include_router(output_router.router, prefix=API_PREFIX)


# ---------------------------------------------------------------------------
# Root redirect — convenience for browser navigation
# ---------------------------------------------------------------------------
@app.get("/", include_in_schema=False)
async def root() -> dict:
    return {"service": "Crowe Keystone API", "version": "1.0.0", "docs": f"{API_PREFIX}/docs"}
