"""
Memory Indexer node — indexes decisions and learnings into institutional memory.

Phase 5: Stub implementation. Returns an empty memory_entries list and marks
         the run complete. Full implementation in Phase 7 when the decisions
         and retrospectives tables are added.

When fully implemented (Phase 7):
  1. Calls the memory_indexer.md system prompt against the retrospective data.
  2. Parses output into { decisions, learnings, patterns } via Pydantic.
  3. Persists each entry to the decisions and memory_entries tables.
  4. Updates similar_prior_projects for future context_loader runs.
"""

import logging

from src.state import KeystoneState

logger = logging.getLogger(__name__)


async def memory_indexer_node(state: KeystoneState) -> dict:
    """
    Indexes decisions and learnings into institutional memory.

    Phase 5 stub — returns empty memory_entries and marks the run complete.
    Phase 7 will add DB persistence and the full LLM extraction pipeline.

    Returns ONLY the fields this node modifies.
    Never raises exceptions.
    """
    # NOTE (Phase 7): Load prompts/memory_indexer.md and call LLM here.
    # Extract { decisions, learnings, patterns } with Pydantic, persist to DB.
    try:
        logger.info(
            "memory_indexer_node: Phase 5 stub — skipping persistence (run_id=%s)",
            state.get("run_id", "unknown"),
        )
        return {
            "memory_entries": [],
            "status": "complete",
        }
    except Exception as e:
        logger.warning("memory_indexer_node failed: %s", str(e))
        return {
            "errors": [
                *state.get("errors", []),
                f"memory_indexer_node failed: {str(e)}",
            ],
        }
