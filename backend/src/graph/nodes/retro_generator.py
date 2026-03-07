"""
Retro Generator node — generates a structured project retrospective.

Loads prompt from: prompts/retro_generator.md
Model: gpt-4o  (TODO: update to gpt-5.4 when available)
Output: structured_update dict matching the retrospectives table structure

Output schema:
  {
    built_vs_scoped:       str   — what was built vs. what the PRD specified
    decisions_changed:     list  — architectural/scope decisions that shifted
    learnings:             list  — 3-5 specific learnings for future projects
    what_would_change:     list  — 2-3 specific things to do differently
    quality_signals:       dict  — { on_time, scope_adherence, estimated_vs_actual_effort }
  }
"""

import json
import logging
from pathlib import Path

from openai import AsyncOpenAI

from src.state import KeystoneState

logger = logging.getLogger(__name__)


async def retro_generator_node(state: KeystoneState) -> dict:
    """
    Generates a project retrospective from the project history in state['context'].

    1. Guards against runaway loops.
    2. Loads retro_generator.md system prompt from disk.
    3. Calls OpenAI gpt-4o with the project context.
    4. Parses JSON output via json.loads (Pydantic validation added in Phase 7).
    5. Returns ONLY the fields this node modifies.

    Never raises exceptions.
    """
    # ── 1. Loop guard ─────────────────────────────────────────────────────────
    if state.get("loop_count", 0) >= 3:
        return {
            "status": "failed",
            "errors": [
                *state.get("errors", []),
                "retro_generator_node: Max loop count (3) reached",
            ],
        }

    try:
        # ── 2. Load prompt from file — never inline ───────────────────────────
        prompt_path = Path(__file__).parent.parent / "prompts" / "retro_generator.md"
        system_prompt = prompt_path.read_text(encoding="utf-8")

        # ── 3. Build user content from project context ─────────────────────────
        context = state.get("context") or {}
        prd = state.get("prd_draft") or {}
        user_content = json.dumps(
            {
                "project_context": context,
                "prd_summary": {
                    "problem_statement": prd.get("problem_statement", ""),
                    "stack": prd.get("stack", []),
                    "success_criteria": prd.get("success_criteria", []),
                },
                "structured_update": state.get("structured_update"),
            }
        )

        # ── 4. Call OpenAI ────────────────────────────────────────────────────
        client = AsyncOpenAI()
        response = await client.chat.completions.create(
            model="gpt-4o",  # TODO: update to gpt-5.4 when available
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content},
            ],
            temperature=0.3,
            response_format={"type": "json_object"},
        )

        raw_output = response.choices[0].message.content or "{}"
        result = json.loads(raw_output)

        # ── 5. Return ONLY the fields this node modifies ──────────────────────
        return {
            "structured_update": result,
            "status": "complete",
        }

    except Exception as e:
        logger.warning("retro_generator_node failed: %s", str(e))
        return {
            "errors": [
                *state.get("errors", []),
                f"retro_generator_node failed: {str(e)}",
            ],
            "status": "failed",
        }
