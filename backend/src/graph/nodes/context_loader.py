"""
Context Loader node — loads relevant context from DB before the graph begins.

Loads the current project (if project_id is set) and all active projects for
the team so the brief_generator and conflict_detector have real context.
Phase 7+: Will also query decisions/retrospectives tables for memory.
"""

import logging
import uuid

from src.state import KeystoneState

logger = logging.getLogger(__name__)


async def context_loader_node(state: KeystoneState) -> dict:
    """
    Loads project and team context from DB.

    1. Fetches the current project's title, description, spark_content, stage, brief.
    2. Fetches all non-archived projects for the team (for conflict detection).
    3. Enriches state['context'] with project metadata.
    4. Falls back gracefully if DB is unavailable or project_id is missing.

    Returns ONLY the fields this node modifies.
    Never raises exceptions.
    """
    project_id_str = state.get("project_id")
    team_id_str = state.get("team_id", "")

    all_project_states: list[dict] = list(state.get("all_project_states") or [])
    context: dict = dict(state.get("context") or {})
    raw_input: str = state.get("raw_input", "")

    try:
        from src.database import AsyncSessionLocal
        from src.models.project import Project
        from sqlalchemy import select

        async with AsyncSessionLocal() as db:
            # Load the current project
            if project_id_str:
                try:
                    project_uuid = uuid.UUID(project_id_str)
                    result = await db.execute(select(Project).where(Project.id == project_uuid))
                    project = result.scalar_one_or_none()
                    if project:
                        context["title"] = project.title
                        context["description"] = project.description or ""
                        context["stage"] = project.stage
                        context["stack"] = project.stack or []
                        context["effort_estimate"] = project.effort_estimate
                        # Use spark_content as raw_input if not already provided
                        if not raw_input and project.spark_content:
                            raw_input = project.spark_content
                        if project.brief:
                            context["existing_brief"] = project.brief
                except Exception as exc:
                    logger.warning("context_loader: failed to load project %s: %s", project_id_str, exc)

            # Load all team projects for conflict scanning
            if team_id_str and not all_project_states:
                try:
                    team_uuid = uuid.UUID(team_id_str)
                    result = await db.execute(
                        select(Project).where(
                            Project.team_id == team_uuid,
                            Project.archived.is_(False),
                        )
                    )
                    projects = result.scalars().all()
                    all_project_states = [
                        {
                            "id": str(p.id),
                            "title": p.title,
                            "stage": p.stage,
                            "description": p.description or "",
                            "spark_content": p.spark_content or "",
                            "stack": p.stack or [],
                        }
                        for p in projects
                    ]
                except Exception as exc:
                    logger.warning("context_loader: failed to load team projects: %s", exc)

    except Exception as e:
        logger.warning("context_loader_node: DB connection failed: %s", str(e))

    return {
        "all_project_states": all_project_states,
        "memory_entries": state.get("memory_entries") or [],
        "similar_prior_projects": [],
        "context": context,
        "raw_input": raw_input,
    }
