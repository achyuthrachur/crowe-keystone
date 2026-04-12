# Keystone — PRD Phase C3: Output Builders
> Version 1.0 | Status: Draft | Author: Achyuth Rachur
> Prereq: Phase C2 HANDOFF.md — full pipeline runs end-to-end, status=complete reached

---

## Overview

Phase C3 replaces the two stub builders from C2 with real implementations.
When C3 is complete, the pipeline produces a proper Crowe-branded Word document
and a valid, fully-structured JSON handoff file.

Phase C3 deliverables:
1. `backend/src/services/docx_builder.py` — full replacement of C2 stub
2. `backend/src/services/json_builder.py` — full replacement of C2 stub

No new routes, no schema changes, no frontend work. The brief_compiler node
already calls both builders — C3 just makes them do real work.

Exit criteria: after a complete pipeline run, `deck_brief.docx` downloads as
a properly structured, Crowe-branded Word document, and `deck_handoff.json`
validates against the schema defined in section 2.

---

## 1. JSON Deck Handoff — json_builder.py

Replace the stub entirely. This is the exact structure Claude Code reads
when starting a deck generation session.

```python
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

    # Build content_ids → section mapping for deck_instructions
    all_items = []
    for section_key in (
        "key_themes", "pain_points", "stated_priorities",
        "open_questions", "potential_recommendations", "suggested_next_steps",
    ):
        all_items.extend(outline.get(section_key, []))

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
```

---

## 2. Word Document Deck Brief — docx_builder.py

Replace the stub entirely. Produces a Crowe-branded Word document.

### 2.1 Crowe Brand Specifications

These values are fixed. Do not vary them.

| Element | Spec |
|---|---|
| Heading 1 | Crowe dark navy `#1B2A4A`, Helvetica Now / Calibri, 18pt, bold |
| Heading 2 | Crowe navy `#1B4F8A`, 14pt, bold |
| Body text | Dark gray `#333333`, 11pt, Calibri |
| Accent / highlight | Crowe orange `#E87722` — used sparingly for callout labels only |
| Page margins | 1 inch all sides |
| Header | "CONFIDENTIAL — INTERNAL USE ONLY" right-aligned, 8pt, gray `#888888` |
| Footer | "Crowe LLP — Keystone Deck Brief" left, page number right, 8pt, gray |

### 2.2 Document Structure

```
[Header — CONFIDENTIAL — INTERNAL USE ONLY]

[Title — "Deck Brief: {client_name}"]
[Subtitle — "{client_industry} | {engagement_date} | Generated by Keystone"]

─── SECTION 1: Client Context ───────────────────────────────────────────────
Summary paragraph from client_context_profile.summary

Key Facts (bullet list from client_context_profile.key_facts)

Regulatory Environment
{client_context_profile.regulatory_environment}

─── SECTION 2: Acronym Glossary ──────────────────────────────────────────────
2-column table: Term | Expansion
One row per entry in final_glossary

─── SECTION 3: Discovery Findings ────────────────────────────────────────────
For each of the 6 content categories with items present:

[Heading 2] Key Themes / Pain Points / etc.
For each item:
  • {item.text}
    Source: "{item.source_quote}"
    [if slide_type_hint] Suggested slide type: {item.slide_type_hint}

─── SECTION 4: Deck Structure Recommendation ────────────────────────────────
Suggested slide count: N slides
Narrative arc: Context → Challenges & Priorities → Findings → Recommendations → Next Steps

[Footer — Crowe LLP — Keystone Deck Brief | Page N]
```

### 2.3 Implementation

```python
"""
docx_builder.py — Crowe-branded Deck Brief Word document assembly.

Produces deck_brief.docx from final KeystoneState after Gate 3.
Called by brief_compiler node.

Crowe brand colors:
  Dark navy:  #1B2A4A  (Heading 1)
  Navy:       #1B4F8A  (Heading 2)
  Orange:     #E87722  (accent labels)
  Dark gray:  #333333  (body text)
  Light gray: #888888  (header/footer)
"""

import io
from datetime import datetime, timezone

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor
from docx.enum.section import WD_SECTION

from src.state import KeystoneState

# ── Crowe brand colors ────────────────────────────────────────────────────────
_NAVY_DARK = RGBColor(0x1B, 0x2A, 0x4A)
_NAVY = RGBColor(0x1B, 0x4F, 0x8A)
_ORANGE = RGBColor(0xE8, 0x77, 0x22)
_DARK_GRAY = RGBColor(0x33, 0x33, 0x33)
_LIGHT_GRAY = RGBColor(0x88, 0x88, 0x88)

_SECTION_LABELS = {
    "key_themes": "Key Themes",
    "pain_points": "Pain Points",
    "stated_priorities": "Stated Priorities",
    "open_questions": "Open Questions",
    "potential_recommendations": "Potential Recommendations",
    "suggested_next_steps": "Suggested Next Steps",
}


def build_docx(state: KeystoneState) -> bytes:
    """
    Assemble deck_brief.docx from final KeystoneState.
    Returns raw bytes of the .docx file.
    """
    outline = state.get("final_outline") or state.get("content_outline") or {}
    glossary = state.get("final_glossary") or state.get("acronym_glossary") or []
    context = state.get("client_context_profile") or {}

    doc = Document()
    _set_margins(doc)
    _add_header_footer(doc, state)

    # ── Title ─────────────────────────────────────────────────────────────────
    title = doc.add_heading(f"Deck Brief: {state.get('client_name', 'Client')}", level=0)
    title.runs[0].font.color.rgb = _NAVY_DARK
    title.runs[0].font.size = Pt(22)

    subtitle = doc.add_paragraph(
        f"{state.get('client_industry', '')}  |  "
        f"Generated by Keystone  |  "
        f"{datetime.now(tz=timezone.utc).strftime('%B %d, %Y')}"
    )
    subtitle.runs[0].font.color.rgb = _LIGHT_GRAY
    subtitle.runs[0].font.size = Pt(10)
    doc.add_paragraph()

    # ── Section 1: Client Context ─────────────────────────────────────────────
    _heading1(doc, "1. Client Context")

    if context.get("summary"):
        _body(doc, context["summary"])

    if context.get("key_facts"):
        _heading2(doc, "Key Facts")
        for fact in context["key_facts"]:
            doc.add_paragraph(fact, style="List Bullet")

    if context.get("regulatory_environment"):
        _heading2(doc, "Regulatory Environment")
        _body(doc, context["regulatory_environment"])

    if context.get("recent_news"):
        _heading2(doc, "Recent Developments")
        for news in context["recent_news"]:
            doc.add_paragraph(news, style="List Bullet")

    doc.add_paragraph()

    # ── Section 2: Acronym Glossary ───────────────────────────────────────────
    if glossary:
        _heading1(doc, "2. Acronym Glossary")
        table = doc.add_table(rows=1, cols=2)
        table.style = "Table Grid"
        hdr_cells = table.rows[0].cells
        hdr_cells[0].text = "Term"
        hdr_cells[1].text = "Expansion"
        for cell in hdr_cells:
            _set_cell_bg(cell, "1B2A4A")
            for run in cell.paragraphs[0].runs:
                run.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
                run.font.bold = True

        for entry in glossary:
            if isinstance(entry, dict):
                term = entry.get("term", "")
                expansion = entry.get("expansion", "")
            else:
                term = getattr(entry, "term", "")
                expansion = getattr(entry, "expansion", "")
            row = table.add_row().cells
            row[0].text = term
            row[1].text = expansion

        doc.add_paragraph()

    # ── Section 3: Discovery Findings ─────────────────────────────────────────
    _heading1(doc, "3. Discovery Findings")

    section_num = 1
    for section_key, label in _SECTION_LABELS.items():
        items = outline.get(section_key, [])
        if not items:
            continue

        _heading2(doc, f"3.{section_num} {label}")
        section_num += 1

        for item in items:
            # Item text as bullet
            p = doc.add_paragraph(style="List Bullet")
            run = p.add_run(item.get("text", ""))
            run.font.color.rgb = _DARK_GRAY
            run.font.size = Pt(11)

            # Source quote in smaller italic
            source = item.get("source_quote", "")
            if source:
                sq = doc.add_paragraph()
                sq.paragraph_format.left_indent = Cm(1.0)
                r = sq.add_run(f'"{source}"')
                r.font.italic = True
                r.font.size = Pt(9)
                r.font.color.rgb = _LIGHT_GRAY

            # Slide type hint if present
            hint = item.get("slide_type_hint")
            if hint:
                hp = doc.add_paragraph()
                hp.paragraph_format.left_indent = Cm(1.0)
                hr = hp.add_run(f"Suggested slide type: {hint}")
                hr.font.size = Pt(9)
                hr.font.color.rgb = _ORANGE

        doc.add_paragraph()

    # ── Section 4: Deck Structure Recommendation ──────────────────────────────
    _heading1(doc, "4. Recommended Deck Structure")

    total_items = sum(len(outline.get(k, [])) for k in _SECTION_LABELS)
    slide_count = max(10, min(15, 2 + (total_items // 2) + 2))
    _body(doc, f"Suggested slide count: {slide_count} slides")
    _body(doc, "Narrative arc: Context → Challenges & Priorities → Findings → Recommendations → Next Steps")

    doc.add_paragraph()
    _body(doc, "This document is a human-review artifact. The corresponding deck_handoff.json file is used by Claude Code to begin deck generation.")

    buf = io.BytesIO()
    doc.save(buf)
    return buf.getvalue()


# ── Helpers ───────────────────────────────────────────────────────────────────

def _set_margins(doc: Document) -> None:
    for section in doc.sections:
        section.top_margin = Cm(2.54)
        section.bottom_margin = Cm(2.54)
        section.left_margin = Cm(2.54)
        section.right_margin = Cm(2.54)


def _add_header_footer(doc: Document, state: KeystoneState) -> None:
    section = doc.sections[0]

    # Header
    header = section.header
    header.is_linked_to_previous = False
    hp = header.paragraphs[0]
    hp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    run = hp.add_run("CONFIDENTIAL — INTERNAL USE ONLY")
    run.font.size = Pt(8)
    run.font.color.rgb = _LIGHT_GRAY

    # Footer
    footer = section.footer
    footer.is_linked_to_previous = False
    fp = footer.paragraphs[0]
    fp.alignment = WD_ALIGN_PARAGRAPH.LEFT
    r_left = fp.add_run("Crowe LLP — Keystone Deck Brief")
    r_left.font.size = Pt(8)
    r_left.font.color.rgb = _LIGHT_GRAY

    # Page number field (right-aligned via tab)
    fp.add_run("\t\t")
    _add_page_number_field(fp)


def _add_page_number_field(paragraph) -> None:
    """Add {PAGE} field to a paragraph for auto page numbering."""
    run = paragraph.add_run()
    fld_char1 = OxmlElement("w:fldChar")
    fld_char1.set(qn("w:fldCharType"), "begin")
    instr = OxmlElement("w:instrText")
    instr.text = " PAGE "
    fld_char2 = OxmlElement("w:fldChar")
    fld_char2.set(qn("w:fldCharType"), "end")
    run._r.append(fld_char1)
    run._r.append(instr)
    run._r.append(fld_char2)
    run.font.size = Pt(8)
    run.font.color.rgb = _LIGHT_GRAY


def _set_cell_bg(cell, hex_color: str) -> None:
    """Set table cell background color via OOXML."""
    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), hex_color)
    tcPr.append(shd)


def _heading1(doc: Document, text: str) -> None:
    h = doc.add_heading(text, level=1)
    if h.runs:
        h.runs[0].font.color.rgb = _NAVY_DARK
        h.runs[0].font.size = Pt(16)


def _heading2(doc: Document, text: str) -> None:
    h = doc.add_heading(text, level=2)
    if h.runs:
        h.runs[0].font.color.rgb = _NAVY
        h.runs[0].font.size = Pt(13)


def _body(doc: Document, text: str) -> None:
    p = doc.add_paragraph(text)
    if p.runs:
        p.runs[0].font.color.rgb = _DARK_GRAY
        p.runs[0].font.size = Pt(11)
```

---

## 3. Verification Checklist

```bash
cd backend
source venv/Scripts/activate

# 1. pytest
python -m pytest tests/ -x --tb=short

# 2. Full pipeline run with output verification (manual):
#    a. Run a complete pipeline (C2 end-to-end test steps a–l)
#    b. GET /api/v1/engagements/{id}/output/brief
#       → Downloads as deck_brief.docx
#       → Open in Word — verify: title present, Crowe navy header, sections populated
#    c. GET /api/v1/engagements/{id}/output/handoff
#       → Downloads as deck_handoff.json
#       → Open in editor — verify: schema_version "1.0", content_outline populated,
#          acronym_glossary present, deck_instructions.suggested_sections non-empty

# 3. JSON schema validation (quick Python check):
python -c "
import json, pathlib
data = json.loads(pathlib.Path('deck_handoff.json').read_text())
required = ['schema_version', 'engagement', 'client_context', 'acronym_glossary', 'content_outline', 'deck_instructions']
missing = [k for k in required if k not in data]
print('Missing fields:', missing or 'None — schema valid')
"

# 4. Frontend typecheck
cd ../frontend && npm run typecheck
```

---

## 4. Update CONTEXT.md and HANDOFF.md After C3

When C3 is complete, update these fields in CONTEXT.md:

- Under "What Has Been Built" — add Phase C1, C2, C3 completion notes
- Under "What Remains to Be Built" — remove the Phase C items, leave D and E
- Under "PRD Files" — add entries for C1, C2, C3 PRDs
- Update "Last updated" date at the top

Write HANDOFF.md with:
- List of all files created/modified across C1 + C2 + C3
- Current pytest status
- Confirmation that a full end-to-end pipeline run completed successfully
- What Phase D starts with (all backend API live, UI is next)
