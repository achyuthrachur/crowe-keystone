"""
Classifier node — determines input type and routing decision.

Returns: agent_type, input_type, loop_count
Routes: needs_brief | has_brief | low_confidence
"""

import logging

from src.state import KeystoneState

logger = logging.getLogger(__name__)


async def classifier_node(state: KeystoneState) -> dict:
    """
    Determines whether a brief already exists, needs to be generated,
    or confidence is too low to proceed.

    Returns ONLY the fields this node modifies.
    Never raises exceptions.
    """
    try:
        raw_input = state.get("raw_input", "")

        # Reject inputs that are too short to be meaningful
        if len(raw_input.strip()) < 20:
            return {
                "status": "failed",
                "errors": [
                    *state.get("errors", []),
                    "classifier_node: Input too short (minimum 20 characters required)",
                ],
            }

        return {
            "agent_type": state.get("agent_type", "brief_generator"),
            "input_type": classify_input_type(raw_input),
            "loop_count": state.get("loop_count", 0),
        }

    except Exception as e:
        return {
            "errors": [
                *state.get("errors", []),
                f"classifier_node failed: {str(e)}",
            ],
            "status": "failed",
        }


def classify_input_type(text: str) -> str:
    """Classify the raw input into one of the known input type categories."""
    text_lower = text.lower()

    if any(kw in text_lower for kw in ("prd", "requirements", "requirement", "spec", "specification")):
        return "prd"

    if any(kw in text_lower for kw in ("code", "build", "deploy", "implement", "develop", "git", "commit")):
        return "notes"

    if any(kw in text_lower for kw in ("data", "metrics", "analytics", "report", "dashboard", "measure")):
        return "data"

    return "spark"


def route_after_classify(state: KeystoneState) -> str:
    """
    Conditional edge function: determines next node after classifier.

    Returns:
        'has_brief'      — brief already exists, skip to section_problem
        'low_confidence' — loop_count >= 3, route to human checkpoint
        'needs_brief'    — default path, generate a brief
    """
    if state.get("brief") is not None:
        return "has_brief"

    if state.get("loop_count", 0) >= 3:
        return "low_confidence"

    return "needs_brief"
