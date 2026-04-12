"""
disambiguator.py — Node 4.

Replaces acronyms in the filtered transcript with their expansions.
Flags any terms that could not be resolved.
Pauses graph at Gate 2.

Inputs used:
    filtered_transcript, acronym_glossary, run_id, engagement_id, team_id

Outputs set:
    disambiguated_transcript, unresolved_terms, status, current_node
"""
import logging
from pathlib import Path

from openai import AsyncOpenAI
from pydantic import BaseModel

from src.graph.keystone_graph import KEYSTONE_MODEL
from src.routers.stream import broadcast_to_team
from src.state import KeystoneState

logger = logging.getLogger(__name__)
_PROMPT = (Path(__file__).parent.parent / "prompts" / "disambiguator.md").read_text(encoding="utf-8")


class _DisambiguatorResult(BaseModel):
    disambiguated_transcript: str
    unresolved_terms: list[str]


async def disambiguator_node(state: KeystoneState) -> dict:
    await broadcast_to_team(state["team_id"], {
        "type": "agent.node_entered",
        "data": {"run_id": state["run_id"], "node": "disambiguator"},
    })

    if state.get("loop_count", 0) >= 3:  # type: ignore
        return {"status": "failed", "errors": state.get("errors", []) + ["Loop limit reached."]}

    try:
        client = AsyncOpenAI()
        glossary_text = "\n".join(
            f"{e['term']}: {e['expansion']}"
            for e in state.get("acronym_glossary", [])
        )
        user_message = (
            f"GLOSSARY:\n{glossary_text}\n\n"
            f"TRANSCRIPT:\n{state['filtered_transcript']}"
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
        result = _DisambiguatorResult.model_validate_json(raw)

        await _set_gate2_status(state["run_id"], state["engagement_id"], state["team_id"])

        return {
            "disambiguated_transcript": result.disambiguated_transcript,
            "unresolved_terms": result.unresolved_terms,
            "status": "awaiting_review_2",
            "current_node": "content_extractor",
        }

    except Exception as exc:
        logger.exception("disambiguator failed: %s", exc)
        return {
            "status": "failed",
            "errors": state.get("errors", []) + [f"disambiguator: {exc}"],
            "current_node": "disambiguator",
        }


async def _set_gate2_status(run_id: str, engagement_id: str, team_id: str) -> None:
    try:
        from sqlalchemy import update
        from src.database import AsyncSessionLocal
        from src.models.keystone_run import KeystoneRun
        from src.models.engagement import Engagement
        import uuid as _uuid

        async with AsyncSessionLocal() as db:
            await db.execute(update(KeystoneRun).where(KeystoneRun.id == _uuid.UUID(run_id)).values(status="awaiting_review_2"))
            await db.execute(update(Engagement).where(Engagement.id == _uuid.UUID(engagement_id)).values(status="awaiting_review_2"))
            await db.commit()

        await broadcast_to_team(team_id, {
            "type": "keystone.awaiting_review_2",
            "data": {"engagement_id": engagement_id, "run_id": run_id},
        })
        await broadcast_to_team(team_id, {
            "type": "keystone.status_changed",
            "data": {"engagement_id": engagement_id, "old_status": "running", "new_status": "awaiting_review_2"},
        })
    except Exception as exc:
        logger.error("_set_gate2_status failed (non-fatal): %s", exc)
