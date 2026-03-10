"""
Vercel OAuth integration router.
Endpoints for connecting, disconnecting, and syncing Vercel projects.
"""
import logging
import secrets

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.config import settings
from src.database import get_db
from src.models.user import User
from src.routers.auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/integrations", tags=["integrations"])

# In-memory OAuth state store (acceptable for single-worker setup)
_oauth_states: dict[str, str] = {}  # state -> user_id


@router.get(
    "/vercel/auth-url",
    status_code=status.HTTP_200_OK,
    summary="Get Vercel OAuth authorization URL",
)
async def get_vercel_auth_url(
    current_user: User = Depends(get_current_user),
) -> dict:
    if not settings.VERCEL_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Vercel integration is not configured. Add VERCEL_CLIENT_ID and VERCEL_CLIENT_SECRET to environment.",
        )

    state = secrets.token_urlsafe(24)
    _oauth_states[state] = str(current_user.id)

    redirect_uri = f"{settings.FRONTEND_URL}/api/auth/vercel/callback"
    url = (
        f"https://vercel.com/integrations/{settings.VERCEL_CLIENT_ID}/new"
        f"?state={state}"
        f"&redirect_uri={redirect_uri}"
    )

    return {"url": url, "state": state}


@router.get(
    "/vercel/status",
    status_code=status.HTTP_200_OK,
    summary="Get Vercel connection status for the current user",
)
async def get_vercel_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    if not current_user.vercel_user_id:
        return {"connected": False}

    # Count projects synced from Vercel
    from sqlalchemy import select, func
    from src.models.project import Project
    count_result = await db.execute(
        select(func.count()).select_from(Project).where(
            Project.team_id == current_user.team_id,
            Project.vercel_project_id.isnot(None),
        )
    )
    project_count = count_result.scalar() or 0

    return {
        "connected": True,
        "vercel_user_name": current_user.vercel_user_name,
        "vercel_user_id": current_user.vercel_user_id,
        "project_count": project_count,
    }


@router.post(
    "/vercel/callback",
    status_code=status.HTTP_200_OK,
    summary="Handle Vercel OAuth callback — exchange code for token and import projects",
)
async def vercel_callback(
    body: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    code = body.get("code")
    state = body.get("state")

    if not code:
        raise HTTPException(status_code=400, detail="Missing code parameter")

    # Validate state if we have it
    if state and state in _oauth_states:
        expected_user_id = _oauth_states.pop(state)
        if expected_user_id != str(current_user.id):
            raise HTTPException(status_code=403, detail="OAuth state mismatch")
    elif state:
        _oauth_states.pop(state, None)

    if not settings.VERCEL_CLIENT_ID or not settings.VERCEL_CLIENT_SECRET:
        raise HTTPException(
            status_code=503,
            detail="Vercel OAuth not configured",
        )

    try:
        from src.services.vercel_service import exchange_code_for_token, get_vercel_user, import_projects_for_user

        redirect_uri = f"{settings.FRONTEND_URL}/api/auth/vercel/callback"
        token_data = await exchange_code_for_token(code, redirect_uri)
        access_token = token_data.get("access_token")
        if not access_token:
            raise HTTPException(status_code=400, detail="Failed to get access token from Vercel")

        # Fetch user info
        user_info = await get_vercel_user(access_token)
        vercel_user = user_info.get("user", user_info)
        vercel_team_id = token_data.get("team_id")

        # Update user record
        current_user.vercel_access_token = access_token
        current_user.vercel_user_id = vercel_user.get("uid") or vercel_user.get("id", "")
        current_user.vercel_user_name = vercel_user.get("username") or vercel_user.get("name", "")
        current_user.vercel_team_id = vercel_team_id
        await db.flush()

        # Import projects
        project_count = await import_projects_for_user(
            user_id=str(current_user.id),
            team_id=str(current_user.team_id) if current_user.team_id else "",
            access_token=access_token,
            vercel_team_id=vercel_team_id,
            db=db,
        )

        return {
            "connected": True,
            "vercel_user_name": current_user.vercel_user_name,
            "projects_imported": project_count,
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Vercel OAuth callback error: %s", exc)
        raise HTTPException(status_code=500, detail=f"Failed to connect Vercel: {exc}")


@router.post(
    "/vercel/sync",
    status_code=status.HTTP_200_OK,
    summary="Re-sync Vercel projects for the current user",
)
async def sync_vercel_projects(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    if not current_user.vercel_access_token:
        raise HTTPException(status_code=400, detail="Vercel not connected")

    try:
        from src.services.vercel_service import import_projects_for_user

        project_count = await import_projects_for_user(
            user_id=str(current_user.id),
            team_id=str(current_user.team_id) if current_user.team_id else "",
            access_token=current_user.vercel_access_token,
            vercel_team_id=current_user.vercel_team_id,
            db=db,
        )
        return {"synced": project_count}
    except Exception as exc:
        logger.error("Vercel sync error: %s", exc)
        raise HTTPException(status_code=500, detail="Sync failed")


@router.delete(
    "/vercel/disconnect",
    status_code=status.HTTP_200_OK,
    summary="Disconnect Vercel from the current user account",
)
async def disconnect_vercel(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    current_user.vercel_access_token = None
    current_user.vercel_user_id = None
    current_user.vercel_user_name = None
    current_user.vercel_team_id = None
    await db.flush()
    return {"disconnected": True}
