"""
Prompt Writer node — generates the Claude Code kickoff prompt from the approved PRD.

Produces a structured, self-contained prompt that a Claude Code session can execute
to bootstrap Phase 1 of the project without needing the full PRD document open.

This is the final content-generating step before quality_gate evaluation.
"""

import logging

from src.state import KeystoneState

logger = logging.getLogger(__name__)


async def claude_code_prompt_writer_node(state: KeystoneState) -> dict:
    """
    Generates the Claude Code kickoff prompt for the approved PRD.

    Assembles project title, problem, stack, functional requirements, and
    a phased task list into a concise prompt that Claude Code can execute
    to begin building Phase 1.

    Returns ONLY the fields this node modifies.
    Never raises exceptions.
    """
    try:
        prd = state.get("prd_draft") or {}
        context = state.get("context") or {}

        project_title = context.get("title", "Unnamed Project")
        problem = prd.get("problem_statement", "").strip()
        stack = prd.get("stack", [])
        functional_reqs = prd.get("functional_requirements", [])
        success_criteria = prd.get("success_criteria", [])

        # Build requirement bullets (cap at 5 to keep prompt concise)
        req_lines = []
        for r in functional_reqs[:5]:
            if isinstance(r, dict):
                req_lines.append(f"- {r.get('description', str(r))}")
            else:
                req_lines.append(f"- {r}")

        # Build success criteria bullets (cap at 3)
        criteria_lines = []
        for c in success_criteria[:3]:
            if isinstance(c, str):
                criteria_lines.append(f"- {c}")
            elif isinstance(c, dict):
                criteria_lines.append(f"- {c.get('criterion', str(c))}")

        prompt_sections = [
            "# Claude Code Kickoff Prompt",
            f"## Project: {project_title}",
            "",
            "## Problem",
            problem or "(see full PRD for problem statement)",
            "",
            "## Stack",
            ", ".join(stack) if stack else "(see full PRD for stack decisions)",
            "",
        ]

        if req_lines:
            prompt_sections += [
                "## Requirements (top 5)",
                *req_lines,
                "",
            ]

        if criteria_lines:
            prompt_sections += [
                "## Success Criteria",
                *criteria_lines,
                "",
            ]

        prompt_sections += [
            "## Phase 1 Tasks",
            "1. Set up project structure and install dependencies",
            "2. Initialise database with schema (run migrations)",
            "3. Build core API endpoints",
            "4. Build frontend foundation",
            "",
            "## Instructions",
            "Read the full PRD before starting.",
            "Build Phase 1 only. Do not begin Phase 2 without explicit instruction.",
            "Report completion with: checklist of deliverables, known blockers, next action.",
        ]

        claude_code_prompt = "\n".join(prompt_sections)

        existing = state.get("prd_draft") or {}
        return {
            "prd_draft": {**existing, "claude_code_prompt": claude_code_prompt},
            "status": "complete",
        }

    except Exception as e:
        logger.warning("claude_code_prompt_writer_node failed: %s", str(e))
        return {
            "errors": [
                *state.get("errors", []),
                f"claude_code_prompt_writer_node failed: {str(e)}",
            ],
            "status": "failed",
        }
