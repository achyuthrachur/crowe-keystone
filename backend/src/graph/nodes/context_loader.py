"""
Context Loader node — loads relevant context from DB before the graph begins.

Phase 5: Lightweight stub that populates required state fields.
Phase 7+: Will query the decisions and retrospectives tables for similar
          prior projects and team institutional memory.
"""

import logging

from src.state import KeystoneState

logger = logging.getLogger(__name__)


async def context_loader_node(state: KeystoneState) -> dict:
    """
    Loads context from DB (similar projects, team decisions).

    Phase 5 implementation: passes through existing state values and
    initialises similar_prior_projects to an empty list. Full semantic
    search against the memory/decisions tables is wired in Phase 7.

    Returns ONLY the fields this node modifies.
    Never raises exceptions.
    """
    try:
        return {
            "all_project_states": state.get("all_project_states") or [],
            "memory_entries": state.get("memory_entries") or [],
            "similar_prior_projects": [],
        }
    except Exception as e:
        logger.warning("context_loader_node failed: %s", str(e))
        return {
            "errors": [*state.get("errors", []), f"context_loader_node failed: {str(e)}"],
            "all_project_states": state.get("all_project_states") or [],
            "memory_entries": state.get("memory_entries") or [],
            "similar_prior_projects": [],
        }
