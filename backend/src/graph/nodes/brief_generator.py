"""
Brief Generator node — generates a structured project brief from a spark/raw input.

Loads prompt from: prompts/brief_generator.md
Model: gpt-4o  (TODO: update to gpt-5.4 when available)
Output: BriefContent dict stored in state['brief']
"""

import logging
import os
from pathlib import Path

from openai import AsyncOpenAI
from pydantic import BaseModel, Field

from src.state import KeystoneState

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Pydantic output model — used for model_validate_json() parsing
# ---------------------------------------------------------------------------


class BriefContentModel(BaseModel):
    problem_statement: str = ""
    proposed_scope: list = Field(default_factory=list)
    ai_recommendation: str = "build"
    effort_estimate: str = "M"
    stack_recommendation: list = Field(default_factory=list)
    overlaps_with: list = Field(default_factory=list)
    open_questions: list = Field(default_factory=list)
    confidence_score: float = 0.8
    # Optional checkpoint fields — only present when confidence < 0.6
    human_checkpoint_needed: bool = False
    checkpoint_question: str = ""


# ---------------------------------------------------------------------------
# Node
# ---------------------------------------------------------------------------


async def brief_generator_node(state: KeystoneState) -> dict:
    """
    Generates a project brief from state['raw_input'].

    1. Guards against runaway loops.
    2. Loads brief_generator.md system prompt from disk.
    3. Builds context string from similar projects and team context.
    4. Calls OpenAI gpt-4o with json_object response format.
    5. Parses output with BriefContentModel (Pydantic) — never regex.
    6. Sets human_checkpoint_needed=True if confidence_score < 0.6.
    7. Returns ONLY the fields this node modifies.
    """

    # ── 1. Loop guard ────────────────────────────────────────────────────────
    if state.get("loop_count", 0) >= 3:
        return {
            "status": "failed",
            "errors": [
                *state.get("errors", []),
                "brief_generator_node: Max loop count (3) reached",
            ],
        }

    try:
        # ── 2. Load prompt from file — never inline ───────────────────────────
        prompt_path = Path(__file__).parent.parent / "prompts" / "brief_generator.md"
        system_prompt = prompt_path.read_text(encoding="utf-8")

        # ── 3. Build context string ───────────────────────────────────────────
        context_parts: list[str] = []

        similar = state.get("similar_prior_projects", [])
        if similar:
            context_parts.append("Similar prior projects:")
            for p in similar:
                title = p.get("title", "untitled")
                stage = p.get("stage", "unknown")
                pid = p.get("id", "")
                context_parts.append(f"  - [{pid}] {title} (stage: {stage})")

        all_projects = state.get("all_project_states", [])
        if all_projects:
            context_parts.append("All active projects (for overlap detection):")
            for p in all_projects:
                title = p.get("title", "untitled")
                pid = p.get("id", "")
                context_parts.append(f"  - [{pid}] {title}")

        extra_context = state.get("context", {})
        if extra_context:
            context_parts.append(f"Additional context: {extra_context}")

        context_str = "\n".join(context_parts) if context_parts else "No additional context available."

        # ── 4. Call OpenAI ────────────────────────────────────────────────────
        # TODO: update to gpt-5.4 when available
        model = "gpt-4o"
        client = AsyncOpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

        response = await client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {
                    "role": "user",
                    "content": (
                        f"Project spark: {state['raw_input']}\n\n"
                        f"Context:\n{context_str}"
                    ),
                },
            ],
            temperature=0.3,
            response_format={"type": "json_object"},
        )

        raw_output = response.choices[0].message.content or "{}"

        # ── 5. Parse with Pydantic — never regex ─────────────────────────────
        parsed = BriefContentModel.model_validate_json(raw_output)

        # ── 6. Determine checkpoint need based on confidence ──────────────────
        human_checkpoint_needed = parsed.human_checkpoint_needed
        checkpoint_question: str | None = None

        if parsed.confidence_score < 0.6:
            human_checkpoint_needed = True
            checkpoint_question = parsed.checkpoint_question or (
                "The brief confidence is low. "
                "Can you provide more context about the problem this project solves "
                "and who the primary user is?"
            )

        # Build brief dict — only the BriefContent fields (no checkpoint fields)
        brief_dict = {
            "problem_statement": parsed.problem_statement,
            "proposed_scope": parsed.proposed_scope,
            "ai_recommendation": parsed.ai_recommendation,
            "effort_estimate": parsed.effort_estimate,
            "stack_recommendation": parsed.stack_recommendation,
            "overlaps_with": parsed.overlaps_with,
            "open_questions": parsed.open_questions,
            "confidence_score": parsed.confidence_score,
        }

        # ── 7. Return ONLY the fields this node modifies ──────────────────────
        result: dict = {
            "brief": brief_dict,
            "loop_count": state.get("loop_count", 0) + 1,
            "human_checkpoint_needed": human_checkpoint_needed,
            "checkpoint_question": checkpoint_question,
        }

        return result

    except Exception as e:
        return {
            "errors": [
                *state.get("errors", []),
                f"brief_generator_node failed: {str(e)}",
            ],
            "status": "failed",
        }


# ---------------------------------------------------------------------------
# Routing function
# ---------------------------------------------------------------------------


def check_brief_confidence(state: KeystoneState) -> str:
    """
    Conditional edge function: routes based on confidence score in generated brief.

    Returns:
        'high' — confidence >= 0.6, proceed to section drafting
        'low'  — confidence < 0.6, route to human checkpoint
    """
    brief = state.get("brief") or {}
    confidence = brief.get("confidence_score", 0.8)
    return "high" if confidence >= 0.6 else "low"
