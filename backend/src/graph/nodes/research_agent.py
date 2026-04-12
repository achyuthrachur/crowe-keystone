"""
research_agent.py — Node 3.

Researches the client via web search. Produces client context profile
and initial acronym glossary.

Inputs used:
    client_name, client_industry, team_id, run_id

Outputs set:
    client_context_profile, acronym_glossary, current_node
"""
import logging
from pathlib import Path

from openai import AsyncOpenAI
from pydantic import BaseModel

from src.graph.keystone_graph import KEYSTONE_MODEL
from src.routers.stream import broadcast_to_team
from src.state import KeystoneState, AcronymEntry

logger = logging.getLogger(__name__)
_PROMPT = (Path(__file__).parent.parent / "prompts" / "research_agent.md").read_text(encoding="utf-8")


class _ClientContextProfile(BaseModel):
    summary: str
    key_facts: list[str]
    regulatory_environment: str
    recent_news: list[str]


class _ResearchResult(BaseModel):
    client_context_profile: _ClientContextProfile
    acronym_glossary: list[dict]  # {term, expansion, confidence, source}


async def research_agent_node(state: KeystoneState) -> dict:
    await broadcast_to_team(state["team_id"], {
        "type": "agent.node_entered",
        "data": {"run_id": state["run_id"], "node": "research_agent"},
    })

    if state.get("loop_count", 0) >= 3:  # type: ignore
        return {"status": "failed", "errors": state.get("errors", []) + ["Loop limit reached."]}

    try:
        client = AsyncOpenAI()

        # OpenAI Responses API with web_search_preview
        response = await client.responses.create(
            model=KEYSTONE_MODEL,
            instructions=_PROMPT,
            input=(
                f"Research this client:\n"
                f"Client name: {state['client_name']}\n"
                f"Industry: {state['client_industry']}"
            ),
            tools=[{"type": "web_search_preview"}],
            temperature=0.2,
        )

        # Extract the text output from the response
        raw = ""
        for block in response.output:
            if hasattr(block, "content"):
                for content_item in block.content:
                    if hasattr(content_item, "text"):
                        raw += content_item.text

        result = _ResearchResult.model_validate_json(raw)

        acronym_glossary: list[AcronymEntry] = []
        for entry in result.acronym_glossary:
            acronym_glossary.append({
                "term": entry.get("term", ""),
                "expansion": entry.get("expansion", ""),
                "confidence": float(entry.get("confidence", 0.8)),
                "source": entry.get("source", "web_search"),
            })

        return {
            "client_context_profile": result.client_context_profile.model_dump(),
            "acronym_glossary": acronym_glossary,
            "current_node": "disambiguator",
        }

    except Exception as exc:
        logger.exception("research_agent failed: %s", exc)
        return {
            "status": "failed",
            "errors": state.get("errors", []) + [f"research_agent: {exc}"],
            "current_node": "research_agent",
        }
