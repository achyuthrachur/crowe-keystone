"""
Human Checkpoint node — pauses the graph and waits for human input.

When the graph reaches this node:
  - Sets status to 'awaiting_human'
  - Broadcasts SSE event: agent.checkpoint (with run_id, project_id, question)
  - LangGraph's interrupt_before mechanism holds execution until
    graph.aupdate_state() is called with checkpoint_response.

Resume flow (handled externally by agents router):
  POST /api/v1/agents/run/{id}/respond
  → graph.aupdate_state(config, {"checkpoint_response": answer})
  → graph.astream(None, config=config)
"""

import logging

from src.state import KeystoneState

logger = logging.getLogger(__name__)


async def human_checkpoint_node(state: KeystoneState) -> dict:
    """
    Pauses the graph for human input.

    Broadcasts agent.checkpoint SSE event so the frontend can display
    the blocking question. Falls back gracefully if broadcast fails.

    Returns ONLY the fields this node modifies.
    Never raises exceptions.
    """
    try:
        from src.routers.stream import broadcast_to_team

        await broadcast_to_team(
            state["team_id"],
            {
                "type": "agent.checkpoint",
                "data": {
                    "run_id": state["run_id"],
                    "project_id": state.get("project_id"),
                    "question": state.get(
                        "checkpoint_question",
                        "Please provide additional context to continue.",
                    ),
                },
            },
        )
        logger.info(
            "agent.checkpoint broadcast sent: run_id=%s team_id=%s",
            state.get("run_id"),
            state.get("team_id"),
        )
    except Exception as e:
        # Broadcast failure must not halt the graph state update.
        # The status change to 'awaiting_human' is the critical path.
        logger.warning("human_checkpoint_node: SSE broadcast failed: %s", str(e))

    return {
        "status": "awaiting_human",
    }


# ---------------------------------------------------------------------------
# Routing function
# ---------------------------------------------------------------------------


def check_checkpoint_response(state: KeystoneState) -> str:
    """
    Conditional edge function: routes based on whether human has responded.

    Called after the graph is resumed via graph.aupdate_state().

    Returns:
        'responded' — checkpoint_response is present, proceed to section_problem
        'waiting'   — no response yet, end the graph run (LangGraph will resume later)
    """
    if state.get("checkpoint_response"):
        return "responded"
    return "waiting"
