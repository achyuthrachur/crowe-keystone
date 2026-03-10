"""
Vercel OAuth integration service.
Handles token exchange, user/project fetching, and project import.
"""
import logging
from datetime import datetime, timezone
from typing import Optional

import httpx

from src.config import settings

logger = logging.getLogger(__name__)

VERCEL_API = "https://api.vercel.com"
VERCEL_TOKEN_URL = "https://api.vercel.com/v2/oauth/access_token"


async def exchange_code_for_token(code: str, redirect_uri: str) -> dict:
    """Exchange an OAuth code for a Vercel access token."""
    if not settings.VERCEL_CLIENT_ID or not settings.VERCEL_CLIENT_SECRET:
        raise ValueError("Vercel OAuth not configured")

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            VERCEL_TOKEN_URL,
            data={
                "code": code,
                "client_id": settings.VERCEL_CLIENT_ID,
                "client_secret": settings.VERCEL_CLIENT_SECRET,
                "redirect_uri": redirect_uri,
            },
            headers={"Accept": "application/json"},
            timeout=15.0,
        )
        resp.raise_for_status()
        return resp.json()


async def get_vercel_user(access_token: str) -> dict:
    """Fetch the authenticated Vercel user's profile."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{VERCEL_API}/v2/user",
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=10.0,
        )
        resp.raise_for_status()
        return resp.json()


async def fetch_all_vercel_projects(access_token: str, team_id: Optional[str] = None) -> list[dict]:
    """Fetch all Vercel projects for the authenticated user (or team)."""
    projects: list[dict] = []
    url = f"{VERCEL_API}/v9/projects"
    params: dict = {"limit": 100}
    if team_id:
        params["teamId"] = team_id

    async with httpx.AsyncClient() as client:
        while url:
            resp = await client.get(
                url,
                headers={"Authorization": f"Bearer {access_token}"},
                params=params,
                timeout=15.0,
            )
            resp.raise_for_status()
            data = resp.json()
            projects.extend(data.get("projects", []))
            # Handle pagination
            pagination = data.get("pagination", {})
            next_cursor = pagination.get("next")
            if next_cursor:
                params = {"until": next_cursor, "limit": 100}
                if team_id:
                    params["teamId"] = team_id
            else:
                break

    return projects


async def import_projects_for_user(
    user_id: str,
    team_id: str,
    access_token: str,
    vercel_team_id: Optional[str],
    db,
) -> int:
    """Fetch Vercel projects and import/update them in the DB. Returns count of projects synced."""
    from sqlalchemy import select
    from src.models.project import Project
    from src.models.user import User

    try:
        raw_projects = await fetch_all_vercel_projects(access_token, vercel_team_id)
    except Exception as exc:
        logger.error("Failed to fetch Vercel projects: %s", exc)
        return 0

    import uuid as _uuid

    synced = 0
    for vp in raw_projects:
        vp_id = vp.get("id", "")
        vp_name = vp.get("name", "Unnamed Project")
        vp_url = f"https://{vp.get('alias', [{}])[0].get('domain', '')}" if vp.get("alias") else ""
        vp_framework = vp.get("framework", "") or ""

        # Check if project already exists by vercel_project_id
        result = await db.execute(
            select(Project).where(
                Project.vercel_project_id == vp_id,
                Project.team_id == _uuid.UUID(team_id),
            )
        )
        existing = result.scalar_one_or_none()

        if existing:
            existing.vercel_project_url = vp_url or existing.vercel_project_url
            existing.vercel_framework = vp_framework or existing.vercel_framework
            existing.last_synced_at = datetime.now(timezone.utc)
        else:
            project = Project(
                team_id=_uuid.UUID(team_id),
                created_by=_uuid.UUID(user_id),
                title=vp_name,
                description=f"Imported from Vercel",
                stage="spark",
                vercel_project_id=vp_id,
                vercel_project_url=vp_url,
                vercel_framework=vp_framework,
                last_synced_at=datetime.now(timezone.utc),
                metadata_={"source": "vercel", "vercel_id": vp_id},
            )
            db.add(project)

        synced += 1

    if synced > 0:
        await db.flush()

    logger.info("Vercel sync: %d projects synced for user %s", synced, user_id)
    return synced
