"""
noise_filter.py — Node 2.

Removes off-topic content from the transcript. Pauses graph at Gate 1.

Inputs used:
    clean_transcript, client_name, run_id, engagement_id, team_id

Outputs set:
    filtered_transcript, removed_segments, status, current_node
"""
import logging
import uuid
from pathlib import Path

from openai import AsyncOpenAI
from pydantic import BaseModel

from src.graph.keystone_graph import KEYSTONE_MODEL
from src.routers.stream import broadcast_to_team
from src.state import KeystoneState, RemovedSegment

logger = logging.getLogger(__name__)
_PROMPT = (Path(__file__).parent.parent / "prompts" / "noise_filter.md").read_text(encoding="utf-8")


class _Segment(BaseModel):
    id: str = ""
    text: str
    reason: str


class _NoiseFilterResult(BaseModel):
    filtered_transcript: str
    removed_segments: list[_Segment]


async def noise_filter_node(state: KeystoneState) -> dict:
    await broadcast_to_team(state["team_id"], {
        "type": "agent.node_entered",
        "data": {"run_id": state["run_id"], "node": "noise_filter"},
    })

    loop_count = state.get("loop_count", 0)  # type: ignore[attr-defined]
    if loop_count >= 3:
        return {"status": "failed", "errors": state.get("errors", []) + ["Loop limit reached."]}

    try:
        client = AsyncOpenAI()
        user_message = (
            f"CLIENT NAME: {state['client_name']}\n\n"
            f"TRANSCRIPT:\n{state['clean_transcript']}"
        )
        response = await client.chat.completions.create(
            model=KEYSTONE_MODEL,
            messages=[
                {"role": "system", "content": _PROMPT},
                {"role": "user", "content": user_message},
            ],
            temperature=0.2,
            response_format={"type": "json_object"},
        )
        raw = response.choices[0].message.content or "{}"
        result = _NoiseFilterResult.model_validate_json(raw)

        # Assign UUIDs to any segment missing an id
        segments: list[RemovedSegment] = []
        for seg in result.removed_segments:
            segments.append({
                "id": seg.id if seg.id else str(uuid.uuid4()),
                "text": seg.text,
                "reason": seg.reason,
            })

        # Update DB and broadcast gate event
        await _set_gate1_status(state["run_id"], state["engagement_id"], state["team_id"])

        return {
            "filtered_transcript": result.filtered_transcript,
            "removed_segments": segments,
            "status": "awaiting_review_1",
            "current_node": "research_agent",
        }

    except Exception as exc:
        logger.exception("noise_filter failed: %s", exc)
        return {
            "status": "failed",
            "errors": state.get("errors", []) + [f"noise_filter: {exc}"],
            "current_node": "noise_filter",
        }


async def _set_gate1_status(run_id: str, engagement_id: str, team_id: str) -> None:
    """Persist awaiting_review_1 status and broadcast SSE."""
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
                .values(status="awaiting_review_1")
            )
            await db.execute(
                update(Engagement)
                .where(Engagement.id == _uuid.UUID(engagement_id))
                .values(status="awaiting_review_1")
            )
            await db.commit()

        await broadcast_to_team(team_id, {
            "type": "keystone.awaiting_review_1",
            "data": {"engagement_id": engagement_id, "run_id": run_id},
        })
        await broadcast_to_team(team_id, {
            "type": "keystone.status_changed",
            "data": {
                "engagement_id": engagement_id,
                "old_status": "running",
                "new_status": "awaiting_review_1",
            },
        })
    except Exception as exc:
        logger.error("_set_gate1_status failed (non-fatal): %s", exc)
