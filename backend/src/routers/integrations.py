"""
Vercel Personal Access Token integration.
Users generate a PAT at vercel.com/account/tokens and paste it here.
No OAuth app required — works on free Vercel accounts.
"""
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from src.database import get_db
from src.models.user import User
from src.models.project import Project
from src.routers.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/integrations", tags=["integrations"])


@router.get("/vercel/status")
async def get_vercel_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Return whether the current user has Vercel connected via PAT."""
    if not current_user.vercel_access_token:
        return {"connected": False}

    count_result = await db.execute(
        select(func.count()).select_from(Project).where(
            Project.team_id == current_user.team_id,
            Project.vercel_project_id.isnot(None),
        )
    )
    return {
        "connected": True,
        "vercel_user_name": current_user.vercel_user_name or "",
        "project_count": count_result.scalar() or 0,
    }


@router.post("/vercel/connect")
async def connect_vercel(
    body: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Accept a Vercel Personal Access Token, validate it, store it,
    and import projects.

    How users get a PAT:
      1. Go to vercel.com/account/tokens
      2. Create Token -> name it anything -> set no expiry
      3. Copy and paste here
    """
    import httpx
    access_token = (body.get("access_token") or "").strip()
    if not access_token:
        raise HTTPException(status_code=400, detail="access_token is required")

    # Validate the token against Vercel API
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                "https://api.vercel.com/v2/user",
                headers={"Authorization": f"Bearer {access_token}"},
                timeout=10.0,
            )
        if resp.status_code == 401:
            raise HTTPException(
                status_code=400,
                detail="Invalid token. Check it was copied correctly and has not expired.",
            )
        resp.raise_for_status()
        vercel_user = resp.json().get("user", {})
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not validate token: {e}")

    # Store on user record
    current_user.vercel_access_token = access_token
    current_user.vercel_user_id = vercel_user.get("uid") or vercel_user.get("id", "")
    current_user.vercel_user_name = vercel_user.get("username") or vercel_user.get("name", "")
    current_user.vercel_team_id = None
    await db.flush()

    # Import projects
    imported = 0
    try:
        from src.services.vercel_service import import_projects_for_user
        result = await import_projects_for_user(
            user_id=str(current_user.id),
            team_id=str(current_user.team_id) if current_user.team_id else "",
            access_token=access_token,
            vercel_team_id=None,
            db=db,
        )
        # import_projects_for_user returns an int count
        imported = result if isinstance(result, int) else result.get("imported", 0)
    except Exception as e:
        logger.warning("Vercel import failed after connect: %s", e)

    return {
        "connected": True,
        "vercel_user_name": current_user.vercel_user_name,
        "projects_imported": imported,
    }


@router.post("/vercel/sync")
async def sync_vercel_projects(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Re-sync all projects from Vercel using the stored PAT."""
    if not current_user.vercel_access_token:
        raise HTTPException(status_code=400, detail="Vercel not connected")

    try:
        from src.services.vercel_service import import_projects_for_user
        result = await import_projects_for_user(
            user_id=str(current_user.id),
            team_id=str(current_user.team_id) if current_user.team_id else "",
            access_token=current_user.vercel_access_token,
            vercel_team_id=current_user.vercel_team_id,
            db=db,
        )
        count = result if isinstance(result, int) else result.get("imported", 0)
        return {"synced": True, "imported": count}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Sync failed: {exc}")


@router.delete("/vercel/disconnect")
async def disconnect_vercel(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Disconnect Vercel by removing the stored PAT."""
    current_user.vercel_access_token = None
    current_user.vercel_user_id = None
    current_user.vercel_user_name = None
    current_user.vercel_team_id = None
    await db.flush()
    return {"disconnected": True}
