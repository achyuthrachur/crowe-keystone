"""
Crowe Keystone — FastAPI application entry point.

IMPORTANT: Run with --workers 1 only.
The SSE stream.py module uses in-memory asyncio queues that are NOT shared across
multiple worker processes. If horizontal scaling is needed in Phase 9+, migrate to
Redis pub/sub and this restriction can be lifted.
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from src.config import settings
from src.database import init_db
from src.routers import approvals, auth, conflicts, health, projects, prds, push, stream
from src.routers import graph as graph_router
from src.routers import agents as agents_router

logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s %(levelname)-8s %(name)s  %(message)s",
)
logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# APScheduler — daily brief job (Phase 5)
# ---------------------------------------------------------------------------

def _start_scheduler() -> None:
    """
    Sets up the APScheduler daily brief job.
    Runs daily_brief_generator for each active user at 7:00 AM UTC.
    Full timezone-aware scheduling per user is wired in Phase 7.
    """
    try:
        from apscheduler.schedulers.asyncio import AsyncIOScheduler

        scheduler = AsyncIOScheduler()

        async def _run_daily_brief_for_all_users() -> None:
            """Background job: generate daily brief for all active users."""
            try:
                from src.database import AsyncSessionLocal
                from sqlalchemy import select
                from src.models.user import User
                from src.graph.keystone_graph import build_daily_brief_graph
                import uuid as _uuid

                async with AsyncSessionLocal() as db:
                    result = await db.execute(select(User))
                    users = result.scalars().all()

                graph = build_daily_brief_graph()

                for user in users:
                    if user.team_id is None:
                        continue
                    try:
                        initial_state = {
                            "run_id": str(_uuid.uuid4()),
                            "agent_type": "daily_brief_generator",
                            "project_id": None,
                            "team_id": str(user.team_id),
                            "triggered_by": str(user.id),
                            "user_id": str(user.id),
                            "raw_input": "",
                            "input_type": "data",
                            "context": {},
                            "brief": None,
                            "prd_draft": None,
                            "prd_version": 1,
                            "hypotheses": [],
                            "adversarial_findings": [],
                            "assumption_audit": [],
                            "stress_test_confidence": 0.0,
                            "all_project_states": [],
                            "detected_conflicts": [],
                            "approval_type": None,
                            "approval_chain": [],
                            "approval_context_summary": "",
                            "raw_build_notes": None,
                            "structured_update": None,
                            "brief_sections": None,
                            "memory_entries": [],
                            "similar_prior_projects": [],
                            "human_checkpoint_needed": False,
                            "checkpoint_question": None,
                            "checkpoint_response": None,
                            "quality_score": 0.0,
                            "loop_count": 0,
                            "errors": [],
                            "status": "running",
                        }
                        await graph.ainvoke(initial_state)
                        logger.info("Daily brief generated for user %s", user.id)
                    except Exception as exc:
                        logger.warning("Daily brief failed for user %s: %s", user.id, exc)
            except Exception as exc:
                logger.error("Daily brief scheduler job failed: %s", exc)

        # Schedule at 7:00 AM UTC daily (Phase 7 will make this per-user timezone)
        scheduler.add_job(
            _run_daily_brief_for_all_users,
            trigger="cron",
            hour=7,
            minute=0,
            id="daily_brief_job",
            replace_existing=True,
        )
        scheduler.start()
        logger.info("APScheduler started — daily_brief_job scheduled at 07:00 UTC")
        return scheduler
    except ImportError:
        logger.warning("APScheduler not installed — daily brief scheduling disabled")
        return None


# ---------------------------------------------------------------------------
# Lifespan — replaces deprecated @app.on_event("startup")
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Crowe Keystone API (env=%s)", settings.ENVIRONMENT)
    await init_db()
    scheduler = _start_scheduler()
    yield
    if scheduler is not None:
        scheduler.shutdown(wait=False)
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
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Global exception handler — returns structured JSON errors
# ---------------------------------------------------------------------------
@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled exception on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An internal server error occurred. Please try again later."},
    )


# ---------------------------------------------------------------------------
# Router registration — all under /api/v1
# ---------------------------------------------------------------------------
API_PREFIX = "/api/v1"

app.include_router(health.router, prefix=API_PREFIX)
app.include_router(auth.router, prefix=API_PREFIX)
app.include_router(projects.router, prefix=API_PREFIX)
app.include_router(prds.router, prefix=API_PREFIX)
app.include_router(approvals.router, prefix=API_PREFIX)
app.include_router(conflicts.router, prefix=API_PREFIX)
app.include_router(push.router, prefix=API_PREFIX)
app.include_router(stream.router, prefix=API_PREFIX)
app.include_router(graph_router.router, prefix=API_PREFIX)
app.include_router(agents_router.router, prefix=API_PREFIX)


# ---------------------------------------------------------------------------
# Root redirect — convenience for browser navigation
# ---------------------------------------------------------------------------
@app.get("/", include_in_schema=False)
async def root() -> dict:
    return {"service": "Crowe Keystone API", "version": "1.0.0", "docs": f"{API_PREFIX}/docs"}
