"""
brief_compiler.py — Node 6.

Assembles the deck_brief.docx and deck_handoff.json output files.
Stores them via file_storage and marks the run complete.

Inputs used:
    final_outline, final_glossary, client_context_profile,
    engagement_id, run_id, team_id, client_name, client_industry

Outputs set:
    deck_brief_storage_key, deck_handoff_storage_key, status, current_node
"""
import logging
from datetime import datetime, timezone
from pathlib import Path

from src.graph.keystone_graph import KEYSTONE_MODEL
from src.routers.stream import broadcast_to_team
from src.state import KeystoneState
from src.services.file_storage import store_output

logger = logging.getLogger(__name__)
_PROMPT = (Path(__file__).parent.parent / "prompts" / "brief_compiler.md").read_text(encoding="utf-8")


async def brief_compiler_node(state: KeystoneState) -> dict:
    await broadcast_to_team(state["team_id"], {
        "type": "agent.node_entered",
        "data": {"run_id": state["run_id"], "node": "brief_compiler"},
    })

    if state.get("loop_count", 0) >= 3:  # type: ignore
        return {"status": "failed", "errors": state.get("errors", []) + ["Loop limit reached."]}

    try:
        from src.services.docx_builder import build_docx
        from src.services.json_builder import build_json

        docx_bytes = build_docx(state)
        json_bytes = build_json(state)

        engagement_id = state["engagement_id"]
        brief_key = await store_output(docx_bytes, "deck_brief.docx", engagement_id)
        handoff_key = await store_output(json_bytes, "deck_handoff.json", engagement_id)

        await _set_complete_status(
            state["run_id"], engagement_id, state["team_id"],
            brief_key, handoff_key,
        )

        return {
            "deck_brief_storage_key": brief_key,
            "deck_handoff_storage_key": handoff_key,
            "status": "complete",
            "current_node": "complete",
        }

    except Exception as exc:
        logger.exception("brief_compiler failed: %s", exc)
        await _set_failed_status(state["run_id"], state["engagement_id"], state["team_id"], str(exc))
        return {
            "status": "failed",
            "errors": state.get("errors", []) + [f"brief_compiler: {exc}"],
            "current_node": "brief_compiler",
        }


async def _set_complete_status(
    run_id: str, engagement_id: str, team_id: str, brief_key: str, handoff_key: str
) -> None:
    try:
        from sqlalchemy import update
        from src.database import AsyncSessionLocal
        from src.models.keystone_run import KeystoneRun
        from src.models.engagement import Engagement
        import uuid as _uuid

        async with AsyncSessionLocal() as db:
            await db.execute(
                update(KeystoneRun)
                .where(KeystoneRun.id == _uuid.UUID(run_id))
                .values(
                    status="complete",
                    deck_brief_storage_key=brief_key,
                    deck_handoff_storage_key=handoff_key,
                    completed_at=datetime.now(tz=timezone.utc),
                )
            )
            await db.execute(
                update(Engagement)
                .where(Engagement.id == _uuid.UUID(engagement_id))
                .values(status="complete")
            )
            await db.commit()

        await broadcast_to_team(team_id, {
            "type": "keystone.complete",
            "data": {"engagement_id": engagement_id, "run_id": run_id},
        })
        await broadcast_to_team(team_id, {
            "type": "keystone.status_changed",
            "data": {"engagement_id": engagement_id, "old_status": "compiling", "new_status": "complete"},
        })
    except Exception as exc:
        logger.error("_set_complete_status failed (non-fatal): %s", exc)


async def _set_failed_status(run_id: str, engagement_id: str, team_id: str, error: str) -> None:
    try:
        from sqlalchemy import update
        from src.database import AsyncSessionLocal
        from src.models.keystone_run import KeystoneRun
        from src.models.engagement import Engagement
        import uuid as _uuid

        async with AsyncSessionLocal() as db:
            await db.execute(
                update(KeystoneRun)
                .where(KeystoneRun.id == _uuid.UUID(run_id))
                .values(status="failed", error=error[:1000], completed_at=datetime.now(tz=timezone.utc))
            )
            await db.execute(
                update(Engagement)
                .where(Engagement.id == _uuid.UUID(engagement_id))
                .values(status="failed")
            )
            await db.commit()
    except Exception as exc2:
        logger.error("_set_failed_status failed: %s", exc2)
