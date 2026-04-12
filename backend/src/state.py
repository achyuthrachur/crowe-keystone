# backend/src/state.py
# REPLACE ENTIRELY in Phase B.
# This file defines the LangGraph state for the Keystone transcript pipeline.
# Nodes return a DICT with only the fields they modify — not the full state.
# Annotated[list, operator.add] fields are automatically merged across parallel branches.

import operator
from typing import Annotated, Optional, TypedDict


# ---------------------------------------------------------------------------
# Support TypedDicts — used as field types within KeystoneState
# ---------------------------------------------------------------------------

class RemovedSegment(TypedDict):
    id: str                    # uuid4 string, assigned by noise_filter
    text: str                  # the removed text block
    reason: str                # off_topic | personal_chatter | other_workstream | admin


class AcronymEntry(TypedDict):
    term: str                  # e.g. "P&C"
    expansion: str             # e.g. "Property & Casualty"
    confidence: float          # 0.0–1.0, from research_agent
    source: str                # web_search | inferred | user_edited


class OutlineItem(TypedDict):
    id: str                    # uuid4 string, assigned by content_extractor
    text: str                  # the finding or recommendation text
    source_quote: str          # verbatim snippet from disambiguated_transcript
    slide_type_hint: Optional[str]  # user-added hint, e.g. "bullet list", "stat callout"


class ContentOutline(TypedDict):
    key_themes: list[OutlineItem]
    pain_points: list[OutlineItem]
    stated_priorities: list[OutlineItem]
    open_questions: list[OutlineItem]
    potential_recommendations: list[OutlineItem]
    suggested_next_steps: list[OutlineItem]


# ---------------------------------------------------------------------------
# KeystoneState — the single state object passed through the LangGraph graph
# ---------------------------------------------------------------------------

class KeystoneState(TypedDict):
    # ── Identity ─────────────────────────────────────────────────────────────
    run_id: str                # matches KeystoneRun.id
    engagement_id: str         # matches Engagement.id
    team_id: str
    triggered_by: str          # user_id

    # ── Engagement metadata (copied in at run start, not re-fetched by nodes)
    client_name: str
    client_industry: str

    # ── Uploaded document storage keys (set by runs router before graph starts)
    transcript_storage_key: str           # required
    preread_storage_key: Optional[str]    # optional
    agenda_storage_key: Optional[str]     # optional

    # ── Node 1 output — transcript_ingester ──────────────────────────────────
    clean_transcript: str                 # normalized plain text

    # ── Node 2 output — noise_filter ─────────────────────────────────────────
    filtered_transcript: str
    removed_segments: list[RemovedSegment]

    # ── HITL Gate 1 — set by runs router when user submits review ────────────
    gate1_approved: bool
    gate1_restored_segments: list[str]    # list of RemovedSegment.id strings

    # ── Node 3 output — research_agent ───────────────────────────────────────
    client_context_profile: dict          # free-form JSON, see Phase C for exact shape
    acronym_glossary: list[AcronymEntry]

    # ── Node 4 output — disambiguator ────────────────────────────────────────
    disambiguated_transcript: str
    unresolved_terms: list[str]           # terms the disambiguator could not resolve

    # ── HITL Gate 2 — set by runs router when user submits glossary ──────────
    gate2_approved: bool
    final_glossary: list[AcronymEntry]    # user-edited version of acronym_glossary

    # ── Node 5 output — content_extractor ────────────────────────────────────
    content_outline: Optional[ContentOutline]

    # ── HITL Gate 3 — set by runs router when user submits outline ───────────
    gate3_approved: bool
    final_outline: Optional[ContentOutline]  # user-edited version of content_outline

    # ── Node 6 output — brief_compiler ───────────────────────────────────────
    deck_brief_storage_key: Optional[str]    # storage key for .docx
    deck_handoff_storage_key: Optional[str]  # storage key for .json

    # ── Control flow ─────────────────────────────────────────────────────────
    current_node: str          # name of the node currently executing
    errors: Annotated[list[str], operator.add]
    status: str
    # running | awaiting_review_1 | awaiting_review_2 | awaiting_review_3
    # | compiling | complete | failed
