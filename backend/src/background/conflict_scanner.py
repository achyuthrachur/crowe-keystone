"""
Conflict Scanner — background task that runs pairwise conflict detection.

Called by FastAPI background tasks after any project state change that could
introduce a new conflict (stage advance, PRD update, etc.).

Scans all active, non-spark, non-shipped projects for the given team,
builds the all_project_states list, and invokes the conflict_detector graph.

Detected conflicts are broadcast via SSE (handled inside conflict_notifier_node).
DB persistence of conflict records is handled in Phase 6 when the conflicts
service is wired to the conflict_persister_node.
"""

import logging
import uuid

from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

# Stages that are excluded from conflict scanning:
# - spark   : project not yet defined enough to conflict
# - shipped : project complete, no longer active
# - retrospective : archived for review only
_INACTIVE_STAGES = {"spark", "shipped", "retrospective"}


async def run_conflict_scan(team_id: str, db: AsyncSession) -> list[dict]:
    """
    Runs pairwise conflict detection for all active projects of a team.

    Args:
        team_id: UUID string of the team to scan.
        db:      SQLAlchemy async session (provided by FastAPI dependency or
                 injected by the calling background task).

    Returns:
        List of ConflictResult dicts for any newly detected conflicts.
        Returns [] if fewer than 2 active projects exist.

    This function is intentionally non-raising — all exceptions are caught
    and logged so that a scanner failure never blocks the primary request.
    """
    try:
        from sqlalchemy import select
        from src.models.project import Project
        from src.graph.keystone_graph import build_conflict_detector_graph

        # ── Load active projects for the team ─────────────────────────────────
        result = await db.execute(
            select(Project).where(
                Project.team_id == uuid.UUID(team_id),
                Project.archived == False,  # noqa: E712
                Project.stage.notin_(list(_INACTIVE_STAGES)),
            )
        )
        projects = result.scalars().all()

        if len(projects) < 2:
            logger.debug(
                "conflict_scanner: team=%s has %d active project(s) — skipping scan",
                team_id,
                len(projects),
            )
            return []

        # ── Build project state snapshots for the graph ────────────────────────
        all_project_states = [
            {
                "id": str(p.id),
                "title": p.title,
                "description": p.description or "",
                "stage": p.stage,
                "stack": list(p.stack) if p.stack else [],
            }
            for p in projects
        ]

        logger.info(
            "conflict_scanner: scanning %d projects for team=%s",
            len(all_project_states),
            team_id,
        )

        # ── Build minimal initial state for the conflict detector graph ────────
        initial_state = {
            "run_id": str(uuid.uuid4()),
            "agent_type": "conflict_detector",
            "project_id": None,
            "team_id": team_id,
            "triggered_by": "",
            "trigger_event": "project_state_change",
            "input_summary": f"Scan {len(projects)} projects for team {team_id}",
            "raw_input": "",
            "input_type": "data",
            "context": {},
            "all_project_states": all_project_states,
            "detected_conflicts": [],
            "hypotheses": [],
            "adversarial_findings": [],
            "assumption_audit": [],
            "human_checkpoint_needed": False,
            "checkpoint_question": None,
            "checkpoint_response": None,
            "quality_score": 0.0,
            "loop_count": 0,
            "errors": [],
            "status": "running",
            "memory_entries": [],
            "similar_prior_projects": [],
            "prd_version": 1,
            "stress_test_confidence": 0.0,
            "brief": None,
            "prd_draft": None,
            "approval_type": None,
            "approval_chain": [],
            "approval_context_summary": "",
            "raw_build_notes": None,
            "structured_update": None,
            "user_id": None,
            "brief_sections": None,
        }

        # ── Run the conflict detector graph ────────────────────────────────────
        graph = build_conflict_detector_graph()
        result_state: dict = await graph.ainvoke(initial_state)

        conflicts = result_state.get("detected_conflicts", [])

        if conflicts:
            logger.info(
                "conflict_scanner: detected %d conflict(s) for team=%s: %s",
                len(conflicts),
                team_id,
                [c.get("type") for c in conflicts],
            )
        else:
            logger.debug(
                "conflict_scanner: no conflicts detected for team=%s", team_id
            )

        return conflicts

    except Exception as exc:
        logger.exception(
            "conflict_scanner: unexpected error for team=%s: %s", team_id, str(exc)
        )
        return []
