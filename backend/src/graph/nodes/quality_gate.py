"""
Quality Gate node — scores PRD quality and routes the graph to pass / revise / fail.

Scoring rubric (each criterion worth a share of 1.0):
  0.20  problem_statement populated
  0.20  functional_requirements has >= 3 items
  0.15  user_stories has >= 2 items
  0.15  stack populated
  0.15  success_criteria populated
  0.15  claude_code_prompt populated

Routing:
  score >= 0.70  → 'pass'   (proceed to END)
  score <  0.70  → 'revise' (loop back to section_merger, max 3 loops)
  loop_count >= 3 → 'fail'  (graceful exit regardless of score)
"""

import logging

from src.state import KeystoneState

logger = logging.getLogger(__name__)


async def quality_gate_node(state: KeystoneState) -> dict:
    """
    Scores PRD quality (0.0–1.0) and stores the result in state.

    Does NOT make the routing decision — that is handled by evaluate_quality()
    which is the conditional edge function on this node.

    Returns ONLY the fields this node modifies.
    Never raises exceptions.
    """
    try:
        prd = state.get("prd_draft") or {}
        loop_count = state.get("loop_count", 0)

        score = 0.0

        if prd.get("problem_statement", "").strip():
            score += 0.20

        if len(prd.get("functional_requirements", [])) >= 3:
            score += 0.20

        if len(prd.get("user_stories", [])) >= 2:
            score += 0.15

        if prd.get("stack"):
            score += 0.15

        if prd.get("success_criteria"):
            score += 0.15

        if prd.get("claude_code_prompt", "").strip():
            score += 0.15

        logger.info(
            "quality_gate_node: score=%.2f loop_count=%d", score, loop_count
        )

        return {
            "quality_score": round(score, 4),
            "loop_count": loop_count,
        }

    except Exception as e:
        logger.warning("quality_gate_node failed: %s", str(e))
        return {
            "errors": [
                *state.get("errors", []),
                f"quality_gate_node failed: {str(e)}",
            ],
            "quality_score": 0.0,
        }


# ---------------------------------------------------------------------------
# Routing function — used as the conditional edge from quality_gate
# ---------------------------------------------------------------------------


def evaluate_quality(state: KeystoneState) -> str:
    """
    Conditional edge function: decides whether to pass, revise, or fail.

    Called by LangGraph after quality_gate_node completes.

    Returns:
        'pass'   — quality_score >= 0.70
        'revise' — quality_score < 0.70 AND loop_count < 3
        'fail'   — loop_count >= 3 (hard stop regardless of score)
    """
    loop_count = state.get("loop_count", 0)
    quality = state.get("quality_score", 0.0)

    if loop_count >= 3:
        logger.warning("quality_gate: max loops (%d) reached — routing to fail", loop_count)
        return "fail"

    if quality >= 0.70:
        logger.info("quality_gate: score %.2f >= 0.70 — routing to pass", quality)
        return "pass"

    logger.info(
        "quality_gate: score %.2f < 0.70 — routing to revise (loop %d)",
        quality,
        loop_count,
    )
    return "revise"
