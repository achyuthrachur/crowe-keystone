"""
content_extractor.py — Node 5.

Maps the disambiguated transcript to a structured content outline.
Pauses graph at Gate 3.

Inputs used:
    disambiguated_transcript, client_context_profile, run_id, engagement_id, team_id

Outputs set:
    content_outline, status, current_node
"""
import logging
import uuid
from pathlib import Path
from typing import Optional

from openai import AsyncOpenAI
from pydantic import BaseModel

from src.graph.keystone_graph import KEYSTONE_MODEL
from src.routers.stream import broadcast_to_team
from src.state import KeystoneState, ContentOutline, OutlineItem

logger = logging.getLogger(__name__)
_PROMPT = (Path(__file__).parent.parent / "prompts" / "content_extractor.md").read_text(encoding="utf-8")


class _OutlineItemRaw(BaseModel):
    id: Optional[str] = None
    text: str
    source_quote: str
    slide_type_hint: Optional[str] = None


class _ContentOutlineRaw(BaseModel):
    key_themes: list[_OutlineItemRaw] = []
    pain_points: list[_OutlineItemRaw] = []
    stated_priorities: list[_OutlineItemRaw] = []
    open_questions: list[_OutlineItemRaw] = []
    potential_recommendations: list[_OutlineItemRaw] = []
    suggested_next_steps: list[_OutlineItemRaw] = []


class _ContentExtractorResult(BaseModel):
    content_outline: _ContentOutlineRaw


def _normalize_items(items: list[_OutlineItemRaw]) -> list[OutlineItem]:
    return [
        {
            "id": item.id or str(uuid.uuid4()),
            "text": item.text,
            "source_quote": item.source_quote,
            "slide_type_hint": item.slide_type_hint,
        }
        for item in items
    ]


async def content_extractor_node(state: KeystoneState) -> dict:
    await broadcast_to_team(state["team_id"], {
        "type": "agent.node_entered",
        "data": {"run_id": state["run_id"], "node": "content_extractor"},
    })

    if state.get("loop_count", 0) >= 3:  # type: ignore
        return {"status": "failed", "errors": state.get("errors", []) + ["Loop limit reached."]}

    try:
        client = AsyncOpenAI()
        context = state.get("client_context_profile", {})
        user_message = (
            f"CLIENT CONTEXT:\n{context}\n\n"
            f"TRANSCRIPT:\n{state['disambiguated_transcript']}"
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
        result = _ContentExtractorResult.model_validate_json(raw)

        outline: ContentOutline = {
            "key_themes": _normalize_items(result.content_outline.key_themes),
            "pain_points": _normalize_items(result.content_outline.pain_points),
            "stated_priorities": _normalize_items(result.content_outline.stated_priorities),
            "open_questions": _normalize_items(result.content_outline.open_questions),
            "potential_recommendations": _normalize_items(result.content_outline.potential_recommendations),
            "suggested_next_steps": _normalize_items(result.content_outline.suggested_next_steps),
        }

        await _set_gate3_status(state["run_id"], state["engagement_id"], state["team_id"])

        return {
            "content_outline": outline,
            "status": "awaiting_review_3",
            "current_node": "brief_compiler",
        }

    except Exception as exc:
        logger.exception("content_extractor failed: %s", exc)
        return {
            "status": "failed",
            "errors": state.get("errors", []) + [f"content_extractor: {exc}"],
            "current_node": "content_extractor",
        }


async def _set_gate3_status(run_id: str, engagement_id: str, team_id: str) -> None:
    try:
        from sqlalchemy import update
        from src.database import AsyncSessionLocal
        from src.models.keystone_run import KeystoneRun
        from src.models.engagement import Engagement
        import uuid as _uuid

        async with AsyncSessionLocal() as db:
            await db.execute(update(KeystoneRun).where(KeystoneRun.id == _uuid.UUID(run_id)).values(status="awaiting_review_3"))
            await db.execute(update(Engagement).where(Engagement.id == _uuid.UUID(engagement_id)).values(status="awaiting_review_3"))
            await db.commit()

        await broadcast_to_team(team_id, {
            "type": "keystone.awaiting_review_3",
            "data": {"engagement_id": engagement_id, "run_id": run_id},
        })
        await broadcast_to_team(team_id, {
            "type": "keystone.status_changed",
            "data": {"engagement_id": engagement_id, "old_status": "running", "new_status": "awaiting_review_3"},
        })
    except Exception as exc:
        logger.error("_set_gate3_status failed (non-fatal): %s", exc)
