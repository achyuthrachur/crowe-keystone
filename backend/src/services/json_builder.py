"""
json_builder.py — Deck Handoff JSON assembly.

Produces deck_handoff.json from the final KeystoneState after Gate 3.
Claude Code reads this file at the start of a deck generation session.

Schema version: 1.0
"""

import json
from datetime import datetime, timezone
from src.state import KeystoneState


def build_json(state: KeystoneState) -> bytes:
    """
    Assemble deck_handoff.json from final KeystoneState.
    Returns UTF-8 encoded JSON bytes.

    Called by brief_compiler node after Gate 3 is approved.
    Uses final_outline (user-edited) if present, falls back to content_outline.
    Uses final_glossary (user-edited) if present, falls back to acronym_glossary.
    """
    outline = state.get("final_outline") or state.get("content_outline") or {}
    glossary = state.get("final_glossary") or state.get("acronym_glossary") or []
    context = state.get("client_context_profile") or {}

    # Build suggested sections following the narrative arc
    suggested_sections = _build_suggested_sections(outline)

    payload = {
        "schema_version": "1.0",
        "generated_at": datetime.now(tz=timezone.utc).isoformat(),

        "engagement": {
            "client_name": state.get("client_name", ""),
            "client_industry": state.get("client_industry", ""),
            "run_id": state.get("run_id", ""),
        },

        "client_context": {
            "summary": context.get("summary", ""),
            "key_facts": context.get("key_facts", []),
            "regulatory_environment": context.get("regulatory_environment", ""),
            "recent_news": context.get("recent_news", []),
        },

        "acronym_glossary": [
            {
                "term": entry.get("term", "") if isinstance(entry, dict) else getattr(entry, "term", ""),
                "expansion": entry.get("expansion", "") if isinstance(entry, dict) else getattr(entry, "expansion", ""),
            }
            for entry in glossary
        ],

        "content_outline": {
            section_key: [
                {
                    "id": item.get("id", ""),
                    "text": item.get("text", ""),
                    "source_quote": item.get("source_quote", ""),
                    "slide_type_hint": item.get("slide_type_hint"),
                }
                for item in outline.get(section_key, [])
            ]
            for section_key in (
                "key_themes", "pain_points", "stated_priorities",
                "open_questions", "potential_recommendations", "suggested_next_steps",
            )
        },

        "deck_instructions": {
            "suggested_slide_count": _suggested_slide_count(outline),
            "suggested_sections": suggested_sections,
            "tone": "executive briefing",
            "branding": "Crowe standard",
        },
    }

    return json.dumps(payload, indent=2, ensure_ascii=False).encode("utf-8")


def _suggested_slide_count(outline: dict) -> int:
    """Estimate slide count: 2 intro + 1 per 2 items + 2 closing. Capped 10–15."""
    total_items = sum(
        len(outline.get(k, []))
        for k in ("key_themes", "pain_points", "stated_priorities",
                  "open_questions", "potential_recommendations", "suggested_next_steps")
    )
    count = 2 + (total_items // 2) + 2
    return max(10, min(15, count))


def _build_suggested_sections(outline: dict) -> list[dict]:
    """Map content outline sections to a narrative deck structure."""
    sections = []

    # Title / Executive Summary — always present
    sections.append({
        "title": "Executive Summary",
        "content_ids": [],
    })

    # Client Context — no content_ids (populated from client_context_profile)
    sections.append({
        "title": "Client Overview",
        "content_ids": [],
    })

    # Key Themes
    kt_ids = [item["id"] for item in outline.get("key_themes", []) if item.get("id")]
    if kt_ids:
        sections.append({"title": "Key Themes", "content_ids": kt_ids})

    # Pain Points + Stated Priorities together
    pp_ids = [item["id"] for item in outline.get("pain_points", []) if item.get("id")]
    sp_ids = [item["id"] for item in outline.get("stated_priorities", []) if item.get("id")]
    if pp_ids or sp_ids:
        sections.append({"title": "Challenges & Priorities", "content_ids": pp_ids + sp_ids})

    # Open Questions
    oq_ids = [item["id"] for item in outline.get("open_questions", []) if item.get("id")]
    if oq_ids:
        sections.append({"title": "Open Questions", "content_ids": oq_ids})

    # Potential Recommendations
    pr_ids = [item["id"] for item in outline.get("potential_recommendations", []) if item.get("id")]
    if pr_ids:
        sections.append({"title": "Potential Recommendations", "content_ids": pr_ids})

    # Suggested Next Steps
    sn_ids = [item["id"] for item in outline.get("suggested_next_steps", []) if item.get("id")]
    if sn_ids:
        sections.append({"title": "Suggested Next Steps", "content_ids": sn_ids})

    # Closing — always present
    sections.append({"title": "Q&A / Discussion", "content_ids": []})

    return sections
