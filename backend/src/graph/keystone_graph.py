"""
Keystone Graph — LangGraph graph assembly for all 4 agent workflows.

Graphs defined here:
  build_prd_architect_graph()     — full PRD generation pipeline with human checkpoint
  build_conflict_detector_graph() — pairwise conflict detection (background task)
  build_daily_brief_graph()       — per-user daily brief (scheduled at 7am)
  build_approval_routing_graph()  — generates approval request summary

IMPORTANT: Compiled with PostgresSaver for human-in-the-loop checkpoint support.
The PRD architect graph is the only graph that uses interrupt_before.
All other graphs run to completion without pausing.
"""

import logging
from typing import Any

from langgraph.graph import END, StateGraph
from langgraph.types import Send

from src.state import KeystoneState

# ── Node imports ──────────────────────────────────────────────────────────────

from src.graph.nodes.context_loader import context_loader_node
from src.graph.nodes.classifier import (
    classifier_node,
    route_after_classify,
)
from src.graph.nodes.brief_generator import (
    brief_generator_node,
    check_brief_confidence,
)
from src.graph.nodes.human_checkpoint import (
    human_checkpoint_node,
    check_checkpoint_response,
)
from src.graph.nodes.prd_drafter import (
    draft_problem_statement_node,
    draft_user_stories_node,
    draft_requirements_node,
    draft_stack_node,
    draft_components_node,
    section_merger_node,
    spawn_parallel_sections,
)
from src.graph.nodes.stress_tester import (
    stress_tester_spawner_node,
    test_hypothesis_node,
    red_team_node,
)
from src.graph.nodes.assumption_excavator import assumption_excavator_node
from src.graph.nodes.open_question_extractor import open_question_extractor_node
from src.graph.nodes.prompt_writer import claude_code_prompt_writer_node
from src.graph.nodes.quality_gate import quality_gate_node, evaluate_quality
from src.graph.nodes.conflict_detector import (
    conflict_detector_node,
    conflict_persister_node,
    conflict_notifier_node,
)
from src.graph.nodes.daily_data_gatherer import daily_data_gatherer_node
from src.graph.nodes.daily_brief_generator import daily_brief_generator_node
from src.graph.nodes.daily_brief_persister import (
    daily_brief_persister_node,
    daily_brief_notifier_node,
)
from src.graph.nodes.approval_router import approval_router_node
from src.graph.nodes.prd_persister import prd_persister_node
from src.graph.nodes.build_log_persister import build_log_persister_node

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Spawn function for adversarial parallel analysis
# ---------------------------------------------------------------------------

def spawn_adversarial_analysis(state: KeystoneState):
    """
    Fans out from section_merger to run stress_tester and assumption_excavator
    in parallel using the LangGraph Send API.
    """
    return [
        Send("stress_tester", state),
        Send("assumption_excavator", state),
    ]


# ---------------------------------------------------------------------------
# Approval routing final node — persists and broadcasts
# ---------------------------------------------------------------------------

async def approval_routing_persister_node(state: KeystoneState) -> dict:
    """Broadcasts approval.requested SSE after approval_router generates summary."""
    try:
        from src.routers.stream import broadcast_to_team
        await broadcast_to_team(
            state.get("team_id", ""),
            {
                "type": "approval.requested",
                "data": {
                    "run_id": state.get("run_id"),
                    "project_id": state.get("project_id"),
                    "approval_type": state.get("approval_type"),
                    "summary": state.get("approval_context_summary", ""),
                    "approval_chain": state.get("approval_chain", []),
                },
            },
        )
    except Exception as e:
        logger.warning("approval_routing_persister_node broadcast failed: %s", str(e))
    return {"status": "complete"}


# ---------------------------------------------------------------------------
# Graph 1: PRD Architect (main workflow)
# ---------------------------------------------------------------------------

def build_prd_architect_graph(database_url: str | None = None) -> Any:
    """
    Full PRD generation pipeline.

    Flow:
      context_loader
        → classifier
          → brief_generator (if no brief)      \
          → section_problem (if brief exists)   ├─ converge at section_problem
          → human_checkpoint (low confidence)  /
        → section_problem
          → [section_stories, section_requirements, section_stack, section_components]  (parallel Send)
          → section_merger
          → [stress_tester, assumption_excavator]  (parallel Send)
            stress_tester → test_hypothesis → red_team → open_question_extractor
            assumption_excavator             → open_question_extractor
          → prompt_writer
          → quality_gate
            → pass   → END
            → revise → section_merger  (max 3 loops)
            → fail   → END

    Compiled with PostgresSaver checkpointer and interrupt_before=["human_checkpoint"]
    for human-in-the-loop support. Falls back to no checkpointer if database_url is
    not provided (useful for unit tests).
    """
    graph = StateGraph(KeystoneState)

    # ── Register nodes ────────────────────────────────────────────────────────
    graph.add_node("context_loader",          context_loader_node)
    graph.add_node("classifier",              classifier_node)
    graph.add_node("brief_generator",         brief_generator_node)
    graph.add_node("human_checkpoint",        human_checkpoint_node)
    graph.add_node("section_problem",         draft_problem_statement_node)
    graph.add_node("section_stories",         draft_user_stories_node)
    graph.add_node("section_requirements",    draft_requirements_node)
    graph.add_node("section_stack",           draft_stack_node)
    graph.add_node("section_components",      draft_components_node)
    graph.add_node("section_merger",          section_merger_node)
    graph.add_node("stress_tester",           stress_tester_spawner_node)
    graph.add_node("test_hypothesis",         test_hypothesis_node)
    graph.add_node("red_team",                red_team_node)
    graph.add_node("assumption_excavator",    assumption_excavator_node)
    graph.add_node("open_question_extractor", open_question_extractor_node)
    graph.add_node("prompt_writer",           claude_code_prompt_writer_node)
    graph.add_node("quality_gate",            quality_gate_node)
    graph.add_node("prd_persister",           prd_persister_node)

    # ── Entry point ───────────────────────────────────────────────────────────
    graph.set_entry_point("context_loader")
    graph.add_edge("context_loader", "classifier")

    # ── Classifier routing ────────────────────────────────────────────────────
    graph.add_conditional_edges(
        "classifier",
        route_after_classify,
        {
            "needs_brief":    "brief_generator",
            "has_brief":      "section_problem",
            "low_confidence": "human_checkpoint",
        },
    )

    # ── Brief → section_problem or human checkpoint ───────────────────────────
    graph.add_conditional_edges(
        "brief_generator",
        check_brief_confidence,
        {
            "high": "section_problem",
            "low":  "human_checkpoint",
        },
    )

    # ── Human checkpoint — pauses; resumes via POST /agents/run/{id}/respond ──
    graph.add_conditional_edges(
        "human_checkpoint",
        check_checkpoint_response,
        {
            "responded": "section_problem",
            "waiting":   END,
        },
    )

    # ── Parallel section drafting (Send API) ──────────────────────────────────
    # section_problem runs first, then its output is fanned out to the other
    # four drafters in parallel. All four sections report back to section_merger.
    graph.add_conditional_edges(
        "section_problem",
        spawn_parallel_sections,
        ["section_stories", "section_requirements", "section_stack", "section_components"],
    )

    graph.add_edge("section_stories",      "section_merger")
    graph.add_edge("section_requirements", "section_merger")
    graph.add_edge("section_stack",        "section_merger")
    graph.add_edge("section_components",   "section_merger")

    # ── Parallel adversarial analysis (Send API) ──────────────────────────────
    graph.add_conditional_edges(
        "section_merger",
        spawn_adversarial_analysis,
        ["stress_tester", "assumption_excavator"],
    )

    # stress_tester branch
    graph.add_edge("stress_tester",           "test_hypothesis")
    graph.add_edge("test_hypothesis",          "red_team")
    graph.add_edge("red_team",                 "open_question_extractor")

    # assumption_excavator branch converges at open_question_extractor
    graph.add_edge("assumption_excavator",    "open_question_extractor")

    # ── Final steps ───────────────────────────────────────────────────────────
    graph.add_edge("open_question_extractor", "prompt_writer")
    graph.add_edge("prompt_writer",            "quality_gate")

    # ── Quality gate loop (max 3 revisions) ───────────────────────────────────
    graph.add_conditional_edges(
        "quality_gate",
        evaluate_quality,
        {
            "pass":   "prd_persister",
            "revise": "section_merger",
            "fail":   "prd_persister",  # persist best effort on fail too
        },
    )
    graph.add_edge("prd_persister", END)

    # ── Compile with optional checkpointer ───────────────────────────────────
    if database_url:
        try:
            from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
            checkpointer = AsyncPostgresSaver.from_conn_string(database_url)
            return graph.compile(
                checkpointer=checkpointer,
                interrupt_before=["human_checkpoint"],
            )
        except Exception as e:
            logger.warning(
                "build_prd_architect_graph: PostgresSaver unavailable (%s) — "
                "compiling without checkpointer. Human checkpoints will NOT persist.",
                str(e),
            )

    return graph.compile()


# ---------------------------------------------------------------------------
# Graph 2: Conflict Detector (background scan)
# ---------------------------------------------------------------------------

def build_conflict_detector_graph() -> Any:
    """
    Pairwise conflict detection.

    Triggered by FastAPI background task after any project state change.
    Runs sentence-transformer embeddings on all active projects, checks
    cosine similarity, and classifies high-similarity pairs via LLM.

    Flow: conflict_detector → conflict_persister → conflict_notifier → END
    """
    graph = StateGraph(KeystoneState)

    graph.add_node("conflict_detector",  conflict_detector_node)
    graph.add_node("conflict_persister", conflict_persister_node)
    graph.add_node("conflict_notifier",  conflict_notifier_node)

    graph.set_entry_point("conflict_detector")
    graph.add_edge("conflict_detector",  "conflict_persister")
    graph.add_edge("conflict_persister", "conflict_notifier")
    graph.add_edge("conflict_notifier",  END)

    return graph.compile()


# ---------------------------------------------------------------------------
# Graph 3: Daily Brief (scheduled, per-user)
# ---------------------------------------------------------------------------

def build_daily_brief_graph() -> Any:
    """
    Per-user daily brief generation.

    Scheduled by APScheduler at 7am in the user's timezone.
    Gathers project data from DB, generates a structured brief,
    persists it, and fires a push notification.

    Flow: data_gatherer → brief_generator → brief_persister → brief_notifier → END
    """
    graph = StateGraph(KeystoneState)

    graph.add_node("data_gatherer",   daily_data_gatherer_node)
    graph.add_node("brief_generator", daily_brief_generator_node)
    graph.add_node("brief_persister", daily_brief_persister_node)
    graph.add_node("brief_notifier",  daily_brief_notifier_node)

    graph.set_entry_point("data_gatherer")
    graph.add_edge("data_gatherer",   "brief_generator")
    graph.add_edge("brief_generator", "brief_persister")
    graph.add_edge("brief_persister", "brief_notifier")
    graph.add_edge("brief_notifier",  END)

    return graph.compile()


# ---------------------------------------------------------------------------
# Graph 4: Approval Routing
# ---------------------------------------------------------------------------

def build_approval_routing_graph() -> Any:
    """
    Generates an approval request summary and determines the approval chain.

    Triggered when a project stage advance requires approval.
    Produces a ≤120 word summary suitable for mobile reading.

    Flow: approval_router → approval_routing_persister → END
    """
    graph = StateGraph(KeystoneState)

    graph.add_node("approval_router",             approval_router_node)
    graph.add_node("approval_routing_persister",  approval_routing_persister_node)

    graph.set_entry_point("approval_router")
    graph.add_edge("approval_router",            "approval_routing_persister")
    graph.add_edge("approval_routing_persister", END)

    return graph.compile()
