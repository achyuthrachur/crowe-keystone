"""
Open Question Extractor node — derives open questions from stress test results.

Converts high-confidence hypotheses and fragile assumptions into structured
open questions that are attached to the PRD draft's open_questions list.
"""

import logging
import uuid

from src.state import KeystoneState

logger = logging.getLogger(__name__)


async def open_question_extractor_node(state: KeystoneState) -> dict:
    """
    Extracts open questions from the PRD and stress test results.

    Sources:
    - Hypotheses with confidence_score > 0.6 that were NOT killed by red team
      → become non-blocking validation questions.
    - Assumptions with fragility_score > 0.7
      → become blocking questions when fragility_score > 0.85, non-blocking otherwise.

    Returns ONLY the fields this node modifies.
    Never raises exceptions.
    """
    try:
        questions: list[dict] = []

        # ── Hypotheses that survived red team review ──────────────────────────
        for h in state.get("hypotheses", []):
            if h.get("confidence_score", 0) > 0.6 and not h.get("killed_by_red_team", False):
                questions.append(
                    {
                        "id": str(uuid.uuid4()),
                        "question": f"Validate hypothesis: {h.get('statement', '')}",
                        "blocking": False,
                        "owner": None,
                        "answered": False,
                        "answer": None,
                    }
                )

        # ── Fragile assumptions ───────────────────────────────────────────────
        for a in state.get("assumption_audit", []):
            fragility = a.get("fragility_score", 0)
            if fragility > 0.7:
                questions.append(
                    {
                        "id": str(uuid.uuid4()),
                        "question": f"Test assumption: {a.get('assumption', '')}",
                        "blocking": fragility > 0.85,
                        "owner": None,
                        "answered": False,
                        "answer": None,
                    }
                )

        existing = state.get("prd_draft") or {}
        return {
            "prd_draft": {**existing, "open_questions": questions},
        }

    except Exception as e:
        logger.warning("open_question_extractor_node failed: %s", str(e))
        return {
            "errors": [
                *state.get("errors", []),
                f"open_question_extractor_node failed: {str(e)}",
            ],
        }
