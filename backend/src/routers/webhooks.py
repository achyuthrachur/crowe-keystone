"""
GitHub webhook router.

POST /webhooks/github  — receives GitHub push events, triggers update_writer
"""

import hashlib
import hmac
import json
import logging
import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, Header, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from src.config import settings
from src.database import get_db
from src.models.project import Project

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/webhooks", tags=["webhooks"])


def _verify_github_signature(payload: bytes, signature: Optional[str], secret: str) -> bool:
    """Verify X-Hub-Signature-256 header against HMAC-SHA256."""
    if not signature or not secret:
        return not secret  # If no secret configured, accept all (dev mode)
    expected = "sha256=" + hmac.new(secret.encode(), payload, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)


@router.post(
    "/github",
    status_code=status.HTTP_200_OK,
    summary="GitHub push event webhook — triggers update_writer agent",
    include_in_schema=True,
)
async def github_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    x_hub_signature_256: Optional[str] = Header(None),
    x_github_event: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Receives GitHub push events and triggers the update_writer agent.

    Matching: projects.metadata.github_repo must equal the repo full_name
    from the payload (e.g., "achyuthrachur/crowe-keystone").

    Error handling: all errors return 200 so GitHub doesn't disable the webhook.
    """
    try:
        payload_bytes = await request.body()

        # Verify signature if GITHUB_WEBHOOK_SECRET is configured
        webhook_secret = getattr(settings, "GITHUB_WEBHOOK_SECRET", "") or ""
        if webhook_secret and not _verify_github_signature(payload_bytes, x_hub_signature_256, webhook_secret):
            logger.warning("GitHub webhook: invalid signature — rejecting")
            return {"ok": False, "error": "invalid_signature"}

        # Only process push events
        if x_github_event != "push":
            return {"ok": True, "ignored": f"event={x_github_event}"}

        payload = json.loads(payload_bytes)
        repo_full_name = payload.get("repository", {}).get("full_name", "")
        commits = payload.get("commits", [])

        if not repo_full_name:
            return {"ok": True, "ignored": "no_repo"}

        # Find matching project by metadata_.github_repo
        # (metadata_ is the Python attribute; "metadata" is the DB column name)
        result = await db.execute(
            select(Project).where(
                Project.archived == False,  # noqa: E712
                Project.metadata_["github_repo"].astext == repo_full_name,
            )
        )
        project = result.scalar_one_or_none()
        if project is None:
            logger.info("GitHub webhook: no project matches repo=%s", repo_full_name)
            return {"ok": True, "ignored": f"unknown_repo={repo_full_name}"}

        # Build raw notes from commit messages
        raw_notes = "\n".join(
            f"[{c.get('id', '')[:7]}] {c.get('message', '')}"
            for c in commits
            if c.get("message")
        )
        if not raw_notes:
            return {"ok": True, "ignored": "no_commits"}

        # Trigger update_writer as background task
        async def _trigger_update_writer() -> None:
            try:
                from src.models.agent_run import AgentRun
                from src.state import KeystoneState
                from src.routers.agents import _run_graph_task, _select_graph
                from src.database import AsyncSessionLocal

                run_id = str(uuid.uuid4())
                async with AsyncSessionLocal() as s:
                    ar = AgentRun(
                        id=uuid.UUID(run_id),
                        team_id=project.team_id,
                        agent_type="update_writer",
                        project_id=project.id,
                        triggered_by=project.created_by,
                        trigger_event="github_push",
                        input_summary=raw_notes[:200],
                        status="running",
                    )
                    s.add(ar)
                    await s.commit()

                initial_state: KeystoneState = {
                    "run_id": run_id, "agent_type": "update_writer",
                    "project_id": str(project.id),
                    "team_id": str(project.team_id),
                    "triggered_by": str(project.created_by),
                    "raw_build_notes": raw_notes,
                    "context": {"source": "github", "repo": repo_full_name},
                    "raw_input": raw_notes, "input_type": "notes",
                    "brief": None, "prd_draft": None, "prd_version": 1,
                    "hypotheses": [], "adversarial_findings": [], "assumption_audit": [],
                    "stress_test_confidence": 0.0, "all_project_states": [],
                    "detected_conflicts": [], "approval_type": None,
                    "approval_chain": [], "approval_context_summary": "",
                    "structured_update": None, "user_id": None, "brief_sections": None,
                    "memory_entries": [], "similar_prior_projects": [],
                    "human_checkpoint_needed": False, "checkpoint_question": None,
                    "checkpoint_response": None, "quality_score": 0.0,
                    "loop_count": 0, "errors": [], "status": "running",
                }
                graph = _select_graph("update_writer")
                await _run_graph_task(
                    run_id=run_id, graph=graph, initial_state=initial_state,
                    team_id=str(project.team_id), db_url=settings.DATABASE_URL,
                )
                logger.info("GitHub webhook: update_writer run_id=%s for project=%s", run_id, project.id)
            except Exception as exc:
                logger.error("GitHub webhook: update_writer failed: %s", exc)

        background_tasks.add_task(_trigger_update_writer)

        return {"ok": True, "project_id": str(project.id), "commit_count": len(commits)}

    except Exception as exc:
        # Always return 200 so GitHub doesn't disable the webhook
        logger.error("GitHub webhook handler error: %s", exc)
        return {"ok": False, "error": str(exc)[:100]}
