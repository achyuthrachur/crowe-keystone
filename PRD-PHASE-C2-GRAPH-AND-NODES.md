# Keystone — PRD Phase C2: LangGraph Pipeline
> Version 1.0 | Status: Draft | Author: Achyuth Rachur
> Prereq: Phase C1 HANDOFF.md — pytest pass, all 4 routers live in /docs

---

## Overview

Phase C2 builds the full LangGraph pipeline: the compiled graph, all 6 nodes,
and all 5 prompt files. It also replaces the `# TODO (C2)` stubs in `runs.py`
with real graph invocation and checkpoint resume calls.

Phase C2 deliverables:
1. `backend/src/graph/keystone_graph.py`
2. `backend/src/graph/nodes/transcript_ingester.py`
3. `backend/src/graph/nodes/noise_filter.py`
4. `backend/src/graph/nodes/research_agent.py`
5. `backend/src/graph/nodes/disambiguator.py`
6. `backend/src/graph/nodes/content_extractor.py`
7. `backend/src/graph/nodes/brief_compiler.py` (stubs out docx/json — C3 fills)
8. `backend/src/graph/prompts/noise_filter.md`
9. `backend/src/graph/prompts/research_agent.md`
10. `backend/src/graph/prompts/disambiguator.md`
11. `backend/src/graph/prompts/content_extractor.md`
12. `backend/src/graph/prompts/brief_compiler.md`
13. `backend/src/routers/runs.py` — replace `# TODO (C2)` stubs with real graph calls

Exit criteria: full pipeline runs end-to-end on a synthetic transcript through
all 3 HITL gates and reaches `status=complete` (brief_compiler produces stub
outputs until C3).

---

## 1. Model Constant

Defined once in `keystone_graph.py`, imported by every LLM-calling node:

```python
KEYSTONE_MODEL = "gpt-5.4"
```

---

## 2. Node Contract — Rules for Every Node

Every node must follow these rules without exception:

**Return only modified fields.** Nodes return a `dict` containing only the
`KeystoneState` fields they set. LangGraph merges this into the full state.

**Never raise.** All exceptions are caught. On error, append to `errors[]`
and set `status="failed"`. Partial state is always returned.

**Loop guard.** Each node checks `state.get("loop_count", 0)`. If `>= 3`,
return `{"status": "failed", "errors": state.get("errors", []) + ["Loop limit reached."]}`.

**Load prompts from file.** Use:
```python
_PROMPT_PATH = Path(__file__).parent.parent / "prompts" / "node_name.md"
```
Load once at module level. Never inline prompts in Python code.

**Parse LLM output with Pydantic.** Use `SomeModel.model_validate_json(raw)`.
Never use regex or `json.loads` directly against the raw string for structured
data — always go through a Pydantic model.

**SSE broadcast on node entry.** Each node broadcasts `agent.node_entered`
at its start so the UI can show progress:
```python
from src.routers.stream import broadcast_to_team
await broadcast_to_team(state["team_id"], {
    "type": "agent.node_entered",
    "data": {"run_id": state["run_id"], "node": "node_name"},
})
```

---

## 3. LLM Call Pattern

All LLM-calling nodes (nodes 2–6) use exactly this pattern:

```python
from openai import AsyncOpenAI
from src.graph.keystone_graph import KEYSTONE_MODEL

client = AsyncOpenAI()  # reads OPENAI_API_KEY from environment

response = await client.chat.completions.create(
    model=KEYSTONE_MODEL,
    messages=[
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_message},
    ],
    temperature=0.2,
    response_format={"type": "json_object"},
)
raw = response.choices[0].message.content or "{}"
parsed = SomePydanticModel.model_validate_json(raw)
```

`research_agent` is the only exception — it uses the OpenAI Responses API
with `tools=[{"type": "web_search_preview"}]` instead of chat completions.

---

## 4. keystone_graph.py

```python
"""
keystone_graph.py — compiled LangGraph graph for the Keystone pipeline.

Import:
    from src.graph.keystone_graph import keystone_graph, KEYSTONE_MODEL

HITL gates:
    interrupt_before=["research_agent", "content_extractor", "brief_compiler"]

    Gate 1: noise_filter finishes → graph pauses before research_agent
    Gate 2: disambiguator finishes → graph pauses before content_extractor
    Gate 3: content_extractor finishes → graph pauses before brief_compiler

Resume pattern (in runs router):
    config = {"configurable": {"thread_id": run_id}}
    await keystone_graph.aupdate_state(config, gate_fields)
    async for chunk in keystone_graph.astream(None, config=config):
        ...  # handle intermediate SSE if desired

Thread ID = run_id string. One MemorySaver entry per run.
MemorySaver is lost on server restart — crash recovery in main.py marks
interrupted runs as failed so users can re-run cleanly.
"""

from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver

from src.state import KeystoneState
from src.graph.nodes.transcript_ingester import transcript_ingester_node
from src.graph.nodes.noise_filter import noise_filter_node
from src.graph.nodes.research_agent import research_agent_node
from src.graph.nodes.disambiguator import disambiguator_node
from src.graph.nodes.content_extractor import content_extractor_node
from src.graph.nodes.brief_compiler import brief_compiler_node

# ── Model constant — import from here in all nodes ────────────────────────────
KEYSTONE_MODEL = "gpt-5.4"

# ── Build graph ───────────────────────────────────────────────────────────────
_builder = StateGraph(KeystoneState)

_builder.add_node("transcript_ingester", transcript_ingester_node)
_builder.add_node("noise_filter", noise_filter_node)
_builder.add_node("research_agent", research_agent_node)
_builder.add_node("disambiguator", disambiguator_node)
_builder.add_node("content_extractor", content_extractor_node)
_builder.add_node("brief_compiler", brief_compiler_node)

_builder.set_entry_point("transcript_ingester")
_builder.add_edge("transcript_ingester", "noise_filter")
_builder.add_edge("noise_filter", "research_agent")
_builder.add_edge("research_agent", "disambiguator")
_builder.add_edge("disambiguator", "content_extractor")
_builder.add_edge("content_extractor", "brief_compiler")
_builder.add_edge("brief_compiler", END)

_checkpointer = MemorySaver()

keystone_graph = _builder.compile(
    checkpointer=_checkpointer,
    interrupt_before=["research_agent", "content_extractor", "brief_compiler"],
)
```

---

## 5. Node Implementations

### 5.1 transcript_ingester.py

No LLM call. Reads the transcript file bytes via `retrieve_upload()`,
calls `parse_transcript()`, stores result as `clean_transcript`.
Also reads preread and agenda if storage keys are present, stores as
additional context in `state` (unused by later nodes directly —
they read `clean_transcript` and `filtered_transcript` only).

```python
"""
transcript_ingester.py — Node 1.

Reads uploaded files, parses transcript to normalized plain text.
No LLM call. Pure file I/O.

Inputs used from state:
    transcript_storage_key, preread_storage_key, agenda_storage_key

Outputs set in state:
    clean_transcript, current_node
"""
import logging
from pathlib import Path

from src.state import KeystoneState
from src.services.file_storage import retrieve_upload
from src.services.file_parser import parse_transcript, parse_document
from src.routers.stream import broadcast_to_team

logger = logging.getLogger(__name__)


async def transcript_ingester_node(state: KeystoneState) -> dict:
    await broadcast_to_team(state["team_id"], {
        "type": "agent.node_entered",
        "data": {"run_id": state["run_id"], "node": "transcript_ingester"},
    })

    try:
        transcript_bytes = await retrieve_upload(state["transcript_storage_key"])
        # Derive filename from storage key (last path segment)
        filename = state["transcript_storage_key"].rsplit("/", 1)[-1]
        clean_transcript = parse_transcript(transcript_bytes, filename)

        return {
            "clean_transcript": clean_transcript,
            "current_node": "noise_filter",
        }
    except Exception as exc:
        logger.exception("transcript_ingester failed: %s", exc)
        return {
            "status": "failed",
            "errors": [f"transcript_ingester: {exc}"],
            "current_node": "transcript_ingester",
        }
```

### 5.2 noise_filter.py

Sends the transcript to the LLM to identify and remove off-topic segments.
Returns the cleaned transcript and a list of `RemovedSegment` dicts.
After returning, the graph pauses at Gate 1 (interrupt_before research_agent).
The node must also broadcast `keystone.awaiting_review_1` and update the
KeystoneRun + Engagement status in the database before returning.

```python
"""
noise_filter.py — Node 2.

Removes off-topic content from the transcript. Pauses graph at Gate 1.

Inputs used:
    clean_transcript, client_name, run_id, engagement_id, team_id

Outputs set:
    filtered_transcript, removed_segments, status, current_node
"""
import json
import logging
import uuid
from pathlib import Path

from openai import AsyncOpenAI

from src.graph.keystone_graph import KEYSTONE_MODEL
from src.routers.stream import broadcast_to_team
from src.state import KeystoneState, RemovedSegment

logger = logging.getLogger(__name__)
_PROMPT = (Path(__file__).parent.parent / "prompts" / "noise_filter.md").read_text(encoding="utf-8")


class _NoiseFilterOutput:
    """Parsed from LLM JSON — not a full Pydantic model, validated manually."""
    pass


from pydantic import BaseModel

class _Segment(BaseModel):
    id: str
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
```

### 5.3 research_agent.py

Uses the OpenAI Responses API with `web_search_preview` to research the client.
Returns `client_context_profile` dict and `acronym_glossary` list.
After Gate 1 is approved and the graph resumes, this is the first node to run.

```python
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
```

### 5.4 disambiguator.py

Takes the filtered transcript and the acronym glossary, replaces acronyms
inline with their expansions, and flags any terms it could not resolve.
After returning, the graph pauses at Gate 2 (interrupt_before content_extractor).

```python
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
```

### 5.5 content_extractor.py

Extracts structured content from the disambiguated transcript.
Returns a `ContentOutline` with 6 sections. After returning, the graph
pauses at Gate 3 (interrupt_before brief_compiler).

```python
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
```

### 5.6 brief_compiler.py

Calls `docx_builder` and `json_builder`, stores output files, marks the
run complete. In C2, both builders are **stubs** — they return placeholder
bytes. C3 fills in the real implementations.

```python
"""
brief_compiler.py — Node 6.

Assembles the deck_brief.docx and deck_handoff.json output files.
Stores them via file_storage and marks the run complete.

In Phase C2, docx_builder and json_builder are stubs.
Phase C3 implements the real builders.

Inputs used:
    final_outline, final_glossary, client_context_profile,
    engagement_id, run_id, team_id, client_name, client_industry

Outputs set:
    deck_brief_storage_key, deck_handoff_storage_key, status, current_node
"""
import logging
import uuid
from datetime import datetime, timezone
from pathlib import Path

from openai import AsyncOpenAI
from pydantic import BaseModel

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
        # C2: stub builders — replaced by real implementations in C3
        from src.services.docx_builder import build_docx
        from src.services.json_builder import build_json

        docx_bytes = build_docx(state)   # returns bytes
        json_bytes = build_json(state)   # returns bytes

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
```

---

## 6. Prompt Files

### 6.1 backend/src/graph/prompts/noise_filter.md

```
You are a transcript noise filter for professional client discovery sessions
at a management consulting firm.

Your job is to remove off-topic content from a raw meeting transcript and return
the cleaned version. You must also return a list of every segment you removed,
with a reason for each removal.

REMOVE segments that are:
- Personal chatter (greetings, weather, lunch plans, weekend plans)
- Administrative logistics (scheduling, room bookings, who is dialing in late)
- Conversations about other client engagements or internal firm workstreams
- Extended technical difficulties ("can you hear me now?", mute/unmute sequences longer than 2 exchanges)
- Verbal filler that adds no informational content ("um", "uh" sequences longer than 3 words)

KEEP all content that is:
- Discussion of the client's business, operations, technology, or processes
- Client concerns, pain points, or priorities expressed in any form
- Questions asked by either party about the engagement topic
- Action items, follow-ups, or next steps
- Any named systems, vendors, regulations, or industry terms

IMPORTANT: When in doubt, KEEP the segment. It is better to include marginally
relevant content than to remove something that matters. Removal should be
conservative and confident, not aggressive.

Return JSON only. No preamble. No markdown code fences.

Output schema:
{
  "filtered_transcript": "<full transcript with removed segments deleted, whitespace normalized>",
  "removed_segments": [
    {
      "id": "<uuid4 string>",
      "text": "<exact text that was removed>",
      "reason": "<one of: off_topic | personal_chatter | other_workstream | admin>"
    }
  ]
}

If nothing should be removed, return an empty removed_segments array and
filtered_transcript equal to the input transcript.
```

### 6.2 backend/src/graph/prompts/research_agent.md

```
You are a client research specialist at a management consulting firm.

Your job is to research a client organization and produce two outputs:
1. A structured client context profile
2. An initial glossary of acronyms and industry-specific terms the client is
   likely to use in a discovery session

Use your web search capability to find current, accurate information about
the organization. Search for: the organization's name + industry, recent news,
key regulatory environment, and common acronyms in their specific sector.

Return JSON only. No preamble. No markdown code fences.

Output schema:
{
  "client_context_profile": {
    "summary": "<2-3 sentence overview of the organization and what they do>",
    "key_facts": ["<fact 1>", "<fact 2>", "<fact 3>"],
    "regulatory_environment": "<description of relevant regulatory bodies, frameworks, and requirements for this industry>",
    "recent_news": ["<relevant headline or development 1>", "<relevant headline or development 2>"]
  },
  "acronym_glossary": [
    {
      "term": "<acronym or abbreviation>",
      "expansion": "<full expansion>",
      "confidence": <float 0.0–1.0 — how confident you are this is the right expansion for this industry>,
      "source": "web_search"
    }
  ]
}

Include ALL common acronyms for the client's specific industry sub-sector.
For example, for a Property & Casualty insurer: P&C, CAT, IBNR, RBC, LOB, TPA.
For a community bank: CECL, PD, LGD, MRM, SR 11-7, ALLL, BSA, AML.
For a credit union: NCUA, CUSOs, CUSO, FOM, APYE.

Aim for 8–15 glossary entries per engagement. Do not include generic business
acronyms (CEO, CFO, ROI) unless they have industry-specific meanings.
```

### 6.3 backend/src/graph/prompts/disambiguator.md

```
You are a transcript disambiguator for professional consulting engagements.

You are given:
1. A glossary of acronyms with their correct expansions for the specific client
2. A transcript from a discovery session with that client

Your job is to replace every occurrence of each acronym in the transcript with
its full expansion inline, so that a reader unfamiliar with the client's
industry can understand the transcript without the glossary.

Rules:
- Replace ONLY acronyms that appear in the provided glossary
- Do not invent expansions for terms not in the glossary
- Preserve the exact wording of everything else — do not paraphrase or summarize
- Preserve speaker labels and transcript structure
- If an acronym appears multiple times, replace every occurrence
- If you encounter an acronym that is NOT in the glossary but appears industry-specific,
  add it to the unresolved_terms list — do not attempt to expand it

Format of replacement: replace "P&C" with "P&C (Property & Casualty)" on first
occurrence per speaker turn. On subsequent occurrences, use the expansion alone
if it is unambiguous, or keep the acronym if clarity requires it.

Return JSON only. No preamble. No markdown code fences.

Output schema:
{
  "disambiguated_transcript": "<full transcript with acronyms replaced inline>",
  "unresolved_terms": ["<term 1>", "<term 2>"]
}
```

### 6.4 backend/src/graph/prompts/content_extractor.md

```
You are a content strategist extracting structured intelligence from a
consulting discovery session transcript.

You are given:
1. A client context profile with key facts about the organization
2. A disambiguated transcript from a discovery session

Your job is to extract structured content organized into 6 categories.
Each item must be directly supported by something said in the transcript.
Do not infer or add content that was not discussed.

For each item, include:
- "text": a clean, consultant-quality statement of the finding (present tense, no fluff)
- "source_quote": a verbatim phrase or sentence from the transcript that supports it
- "id": a unique ID in format "kt-N" for key_themes, "pp-N" for pain_points, etc.

Category ID prefixes:
  key_themes           → kt-N
  pain_points          → pp-N
  stated_priorities    → sp-N
  open_questions       → oq-N
  potential_recommendations → pr-N
  suggested_next_steps → sn-N

Definitions:
- key_themes: recurring concerns or topics the client returned to multiple times
- pain_points: specific problems or friction points the client described
- stated_priorities: things the client explicitly said they want to address first
- open_questions: questions raised that were not answered in the session
- potential_recommendations: areas where Crowe's expertise could add value (inferred from pain points)
- suggested_next_steps: concrete next actions mentioned by either party

Aim for 3–6 items per category. Quality over quantity — only include items
clearly supported by the transcript.

Return JSON only. No preamble. No markdown code fences.

Output schema:
{
  "content_outline": {
    "key_themes": [{"id": "kt-1", "text": "...", "source_quote": "...", "slide_type_hint": null}],
    "pain_points": [...],
    "stated_priorities": [...],
    "open_questions": [...],
    "potential_recommendations": [...],
    "suggested_next_steps": [...]
  }
}
```

### 6.5 backend/src/graph/prompts/brief_compiler.md

```
You are a deck brief writer for a management consulting firm.

You are given structured outputs from a discovery session analysis:
a content outline, a client context profile, and an acronym glossary.

Your job is to produce a structured JSON object that describes the recommended
deck structure — which sections to include, how many slides, and how the
outline items map to slide sections.

This JSON is used by Claude Code to begin building the actual client presentation.

Rules:
- Suggested slide count should be appropriate for an executive briefing: 10–15 slides
- Every content item from the outline should map to at least one section
- Sections should follow a logical narrative arc: context → problem → findings → recommendations → next steps
- Tone: executive briefing (confident, direct, no fluff)
- Branding: Crowe standard

Return JSON only. No preamble. No markdown code fences.

Output schema:
{
  "deck_instructions": {
    "suggested_slide_count": <integer 10–15>,
    "suggested_sections": [
      {
        "title": "<section title>",
        "content_ids": ["<item id>", "<item id>"]
      }
    ],
    "tone": "executive briefing",
    "branding": "Crowe standard"
  }
}
```

---

## 7. Wire Graph into runs.py

Replace each `# TODO (C2): replace this stub` comment block with real graph calls.

### 7.1 start_run — invoke graph as background task

Replace the `# TODO (C2)` comment in `start_run()` with:

```python
from src.graph.keystone_graph import keystone_graph
from src.state import KeystoneState

# Build documents lookup for storage keys
docs_result = await db.execute(
    select(UploadedDocument).where(UploadedDocument.engagement_id == engagement_id)
)
docs = docs_result.scalars().all()
transcript_doc = next((d for d in docs if d.doc_type == "transcript"), None)
preread_doc = next((d for d in docs if d.doc_type == "preread"), None)
agenda_doc = next((d for d in docs if d.doc_type == "agenda"), None)

initial_state: KeystoneState = {
    "run_id": str(run.id),
    "engagement_id": str(engagement_id),
    "team_id": str(current_user.team_id),
    "triggered_by": str(current_user.id),
    "client_name": engagement.client_name,
    "client_industry": engagement.client_industry,
    "transcript_storage_key": transcript_doc.storage_key if transcript_doc else "",
    "preread_storage_key": preread_doc.storage_key if preread_doc else None,
    "agenda_storage_key": agenda_doc.storage_key if agenda_doc else None,
    "clean_transcript": "",
    "filtered_transcript": "",
    "removed_segments": [],
    "gate1_approved": False,
    "gate1_restored_segments": [],
    "client_context_profile": {},
    "acronym_glossary": [],
    "disambiguated_transcript": "",
    "unresolved_terms": [],
    "gate2_approved": False,
    "final_glossary": [],
    "content_outline": None,
    "gate3_approved": False,
    "final_outline": None,
    "deck_brief_storage_key": None,
    "deck_handoff_storage_key": None,
    "current_node": "transcript_ingester",
    "errors": [],
    "status": "running",
}
config = {"configurable": {"thread_id": str(run.id)}}
background_tasks.add_task(_invoke_graph, initial_state, config)
```

Add this background task function at module level in runs.py:

```python
async def _invoke_graph(initial_state: dict, config: dict) -> None:
    """Run the LangGraph pipeline. Catches all exceptions — never raises."""
    from src.graph.keystone_graph import keystone_graph
    try:
        async for _ in keystone_graph.astream(initial_state, config=config):
            pass  # Node SSE broadcasts happen inside the nodes themselves
    except Exception as exc:
        logger.exception("Graph invocation failed: %s", exc)
```

### 7.2 Gate endpoints — resume graph from checkpoint

Replace each `# TODO (C2): resume graph from checkpoint` comment with:

```python
config = {"configurable": {"thread_id": str(run.id)}}
background_tasks.add_task(_resume_graph, config)
```

Add this function at module level in runs.py (one function handles all gates):

```python
async def _resume_graph(config: dict) -> None:
    """Resume a paused LangGraph pipeline from its checkpoint. Never raises."""
    from src.graph.keystone_graph import keystone_graph
    try:
        async for _ in keystone_graph.astream(None, config=config):
            pass
    except Exception as exc:
        logger.exception("Graph resume failed: %s", exc)
```

The gate field updates (`gate1_approved`, `final_glossary`, `final_outline`)
are written to the DB in `run.graph_state` in C1. For LangGraph to pick them
up on resume, they must also be written into the MemorySaver checkpoint via
`aupdate_state`. Add this **before** the background task call in each gate endpoint:

```python
config = {"configurable": {"thread_id": str(run.id)}}
await keystone_graph.aupdate_state(config, {
    "gate1_approved": True,
    "gate1_restored_segments": payload.restored_segment_ids,
})
```

(Gate 2 and Gate 3 follow the same pattern with their respective fields.)

---

## 8. Stub Builders — C2 Only

Create these two stub files so `brief_compiler.py` can import them in C2.
C3 replaces their contents entirely.

**backend/src/services/docx_builder.py**:
```python
"""
docx_builder.py — Word document assembly.
STUB — Phase C3 implements the real builder.
"""
from src.state import KeystoneState


def build_docx(state: KeystoneState) -> bytes:
    """Returns a minimal placeholder .docx for C2 end-to-end testing."""
    from docx import Document
    import io
    doc = Document()
    doc.add_heading(f"Deck Brief — {state.get('client_name', 'Client')}", 0)
    doc.add_paragraph("PLACEHOLDER — Phase C3 will build the real document.")
    buf = io.BytesIO()
    doc.save(buf)
    return buf.getvalue()
```

**backend/src/services/json_builder.py**:
```python
"""
json_builder.py — Deck handoff JSON assembly.
STUB — Phase C3 implements the real builder.
"""
import json
from datetime import datetime, timezone
from src.state import KeystoneState


def build_json(state: KeystoneState) -> bytes:
    """Returns a minimal placeholder deck_handoff.json for C2 end-to-end testing."""
    payload = {
        "schema_version": "1.0",
        "generated_at": datetime.now(tz=timezone.utc).isoformat(),
        "engagement": {
            "client_name": state.get("client_name", ""),
            "client_industry": state.get("client_industry", ""),
            "run_id": state.get("run_id", ""),
        },
        "placeholder": "Phase C3 will build the full handoff JSON.",
    }
    return json.dumps(payload, indent=2).encode("utf-8")
```

---

## 9. Verification Checklist

```bash
cd backend
source venv/Scripts/activate

# 1. pytest
python -m pytest tests/ -x --tb=short

# 2. Import check — verify graph compiles without errors
python -c "from src.graph.keystone_graph import keystone_graph, KEYSTONE_MODEL; print('Graph OK:', KEYSTONE_MODEL)"

# 3. Full end-to-end pipeline test (manual):
#    a. Start server: uvicorn src.main:app --workers 1 --port 8000 --reload
#    b. POST /api/v1/engagements → create engagement
#    c. POST /api/v1/engagements/{id}/documents?doc_type=transcript → upload a .txt
#    d. POST /api/v1/engagements/{id}/runs → start pipeline
#    e. Watch logs — node_entered events should appear for transcript_ingester → noise_filter
#    f. GET /api/v1/engagements/{id}/runs/latest → should show awaiting_review_1
#    g. POST /api/v1/engagements/{id}/runs/latest/gate1 → submit empty restored_segment_ids
#    h. Watch logs — research_agent → disambiguator nodes should execute
#    i. GET /api/v1/engagements/{id}/runs/latest → awaiting_review_2
#    j. POST gate2 with glossary → resume → content_extractor runs → awaiting_review_3
#    k. POST gate3 with outline → resume → brief_compiler runs → complete
#    l. GET /api/v1/engagements/{id}/output → both files available: true

# 4. Frontend typecheck
cd ../frontend && npm run typecheck
```
