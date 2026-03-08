import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db

logger = logging.getLogger(__name__)
router = APIRouter(tags=["health"])

APP_VERSION = "1.0.0"


@router.get(
    "/health",
    status_code=200,
    summary="Health check — returns DB connection status and version",
)
async def health_check(db: AsyncSession = Depends(get_db)) -> dict:
    """
    Returns:
      status: "ok" | "degraded"
      version: app version string
      db: "connected" | "error"
      timestamp: ISO UTC timestamp
    """
    db_status = "connected"
    try:
        await db.execute(text("SELECT 1"))
    except Exception as exc:
        logger.error("Health check: DB unavailable: %s", exc)
        db_status = "error"

    return {
        "status": "ok" if db_status == "connected" else "degraded",
        "version": APP_VERSION,
        "db": db_status,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
