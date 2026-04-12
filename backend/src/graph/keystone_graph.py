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

# ── Model constant — import from here in all nodes ────────────────────────────
# MUST be defined before node imports to avoid circular import failure.
KEYSTONE_MODEL = "gpt-5.4"

# ── Node imports — after KEYSTONE_MODEL so nodes can import it safely ─────────
from src.graph.nodes.transcript_ingester import transcript_ingester_node
from src.graph.nodes.noise_filter import noise_filter_node
from src.graph.nodes.research_agent import research_agent_node
from src.graph.nodes.disambiguator import disambiguator_node
from src.graph.nodes.content_extractor import content_extractor_node
from src.graph.nodes.brief_compiler import brief_compiler_node

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
