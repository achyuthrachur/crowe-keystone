# Crowe Keystone — Synthetic Data Generation Guide

This document describes the entire Keystone system end-to-end so you can generate
realistic synthetic data for the demo/POC database.

---

## What Keystone Is

Keystone is an internal multi-agent pipeline used by the **Crowe IRM AI team** (5 people).
It takes a raw discovery session transcript from a Fireflies recording and produces:

1. **`deck_brief.docx`** — a Crowe-branded Word document with a section-by-section
   deck outline, suggested slide types, and speaker note stubs.
2. **`deck_handoff.json`** — a machine-readable version that Claude Code ingests to
   begin building the actual client presentation deck.

**Who uses it:** Crowe IRM AI team members preparing for client engagements in financial
services (banking, credit unions, insurance). The tool is never shown to clients directly.

**The problem it solves:** On-site discovery sessions are recorded via Fireflies. The raw
transcript is noisy — off-topic chatter, acronyms misread without client context (e.g.
"P&C" read as PNC Bank instead of Property & Casualty). Getting from raw transcript to a
structured deck outline currently takes hours and produces inconsistent results.

---

## The Six-Node Pipeline

The pipeline pauses at three human review gates (HITL = Human In The Loop).

```
Upload transcript (+ optional preread, agenda)
        │
[Node 1] transcript_ingester
        Parses the uploaded file into normalized plain text.
        Handles: .txt, .vtt (Fireflies), .srt, .json (Fireflies API), .pdf, .docx
        Output: clean_transcript (plain text)
        │
[Node 2] noise_filter
        Removes off-topic content: personal chatter, other workstream mentions,
        admin logistics, greetings/sign-offs.
        Output: filtered_transcript + removed_segments[] (each with id, text, reason)
        │
── HITL Gate 1 ──────────────────────────────────────────────────────────
   User sees what was removed. Can restore any segment they disagree with.
   Approves to continue.
────────────────────────────────────────────────────────────────────────
        │
[Node 3] research_agent
        Web searches on the client (name + industry).
        Builds client_context_profile (summary, key facts, regulatory environment,
        recent news). Also populates acronym_glossary with industry-specific terms.
        Output: client_context_profile (dict), acronym_glossary[]
        │
[Node 4] disambiguator
        Replaces acronyms in the filtered transcript using the glossary.
        e.g. "P&C" → "Property & Casualty (P&C)"
        Output: disambiguated_transcript, unresolved_terms[]
        │
── HITL Gate 2 ──────────────────────────────────────────────────────────
   User reviews and edits the acronym glossary.
   Can correct expansions or add missing terms.
   Approves to continue.
────────────────────────────────────────────────────────────────────────
        │
[Node 5] content_extractor
        Maps the disambiguated transcript to a structured content outline with
        six sections: key_themes, pain_points, stated_priorities, open_questions,
        potential_recommendations, suggested_next_steps.
        Each item has: id, text, source_quote (verbatim from transcript),
        optional slide_type_hint.
        Output: content_outline (ContentOutline)
        │
── HITL Gate 3 ──────────────────────────────────────────────────────────
   User reviews and edits the content outline.
   Can reword items, move them between sections, add/delete.
   Approves to continue.
────────────────────────────────────────────────────────────────────────
        │
[Node 6] brief_compiler
        Assembles deck_brief.docx (Crowe-branded Word doc) and
        deck_handoff.json (machine-readable version).
        Uploads both to Supabase storage.
        Output: deck_brief_storage_key, deck_handoff_storage_key
```

---

## Database Schema

The Neon PostgreSQL database has these tables relevant to synthetic data:

### `teams`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| name | text | e.g. "Crowe IRM AI Team" |
| slug | text | e.g. "crowe-irm-ai" |

### `users`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| email | text | unique |
| name | text | display name |
| team_id | UUID | FK → teams |
| role | text | "admin" or "builder" |
| hashed_password | text | bcrypt hash |
| email_verified | boolean | true for seed users |

### `engagements`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| team_id | UUID | FK → teams |
| created_by | UUID | FK → users |
| client_name | text | e.g. "First Midwest Bank (Synthetic)" |
| client_industry | text | e.g. "Community Banking" |
| engagement_date | date | date of the discovery session |
| attendees | text | comma-separated list of titles |
| status | text | see Status State Machine below |
| created_at | timestamptz | |
| updated_at | timestamptz | |

**Status state machine:**
```
draft → uploading → ready → running
→ awaiting_review_1 → running
→ awaiting_review_2 → running
→ awaiting_review_3 → compiling → complete | failed
```

### `uploaded_documents`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| engagement_id | UUID | FK → engagements |
| uploaded_by | UUID | FK → users |
| doc_type | text | "transcript", "preread", or "agenda" |
| original_filename | text | e.g. "discovery-session-transcript.txt" |
| storage_key | text | path in Supabase: "{engagement_id}/transcript/filename.txt" |
| file_size_bytes | int | approximate |
| parsed_text | text | normalized plain text after Node 1 |

### `keystone_runs`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| engagement_id | UUID | FK → engagements |
| triggered_by | UUID | FK → users |
| status | text | "complete", "failed", etc. |
| graph_state | JSONB | full KeystoneState snapshot (can be null for seed data) |
| deck_brief_storage_key | text | "{engagement_id}/output/deck_brief.docx" |
| deck_handoff_storage_key | text | "{engagement_id}/output/deck_handoff.json" |
| error | text | null if successful |
| created_at | timestamptz | |
| completed_at | timestamptz | |

### `acronym_glossary`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| engagement_id | UUID | FK → engagements |
| term | text | e.g. "CECL" |
| expansion | text | e.g. "Current Expected Credit Loss" |
| confidence | float | 0.0–1.0 |
| source | text | "web_search", "inferred", or "user_edited" |

---

## What the Seed Script Already Creates

The existing `seed_synthetic.py` creates:

**1 team:** Crowe IRM AI Team (slug: crowe-irm-ai)

**3 users:**
- `achyuth@crowe-synthetic.test` / `synthetic-password-123` (admin)
- `builder1@crowe-synthetic.test` / `synthetic-password-123` (builder)
- `builder2@crowe-synthetic.test` / `synthetic-password-123` (builder)

**3 completed engagements** (status = "complete"), each with:
- 2 uploaded documents (transcript + preread)
- 1 keystone_run (status = "complete")
- 4 acronym glossary entries

The three engagements are:
1. First Midwest Bank (Synthetic) — Community Banking — March 15, 2025
2. Lakefront Credit Union (Synthetic) — Credit Union — Feb 28, 2025
3. Tristate Insurance Group (Synthetic) — P&C Insurance — March 5, 2025

All use the same generic transcript (a short MRM-themed conversation) and placeholder
storage keys pointing to files that don't actually exist in Supabase.

---

## What Good Synthetic Data Looks Like

The demo is used to show internal Crowe stakeholders what the tool does.
The Kanban board shows engagements in columns by status. To show a realistic demo,
you want engagements at **different stages** of the pipeline, not all "complete."

### Recommended set of 6 engagements for a strong demo:

| # | Client (Synthetic) | Industry | Status | What it demonstrates |
|---|---|---|---|---|
| 1 | Heartland Community Bank (Synthetic) | Community Banking | `complete` | Full pipeline done — output downloadable |
| 2 | Prairie Credit Union (Synthetic) | Credit Union | `complete` | Full pipeline done — different industry |
| 3 | Midland Insurance Holdings (Synthetic) | P&C Insurance | `awaiting_review_2` | Pipeline paused at Gate 2 (glossary review) |
| 4 | Great Lakes Asset Management (Synthetic) | Investment Management | `awaiting_review_1` | Pipeline paused at Gate 1 (noise filter review) |
| 5 | Cornerstone Regional Bank (Synthetic) | Regional Banking | `ready` | Transcript uploaded, run not yet started |
| 6 | Summit Financial Group (Synthetic) | Wealth Management | `draft` | Just created, nothing uploaded yet |

---

## Realistic Transcript Content

Each transcript should read like a Fireflies recording of a 60–90 minute discovery
session between Crowe consultants and client stakeholders.

**Structure of a good synthetic transcript:**
1. Opening logistics (2–3 lines — this gets filtered out by Node 2)
2. Introductions (2–3 lines — gets filtered out)
3. Client describes their current state (the main content — 60–70% of transcript)
4. Pain points discussed (20–25% of content)
5. Crowe asks clarifying questions
6. Closing / next steps (2–3 lines — gets filtered out)

**Realistic acronyms to include by industry:**

Community/Regional Banking:
- CECL (Current Expected Credit Loss)
- PD (Probability of Default), LGD (Loss Given Default)
- MRM (Model Risk Management)
- SR 11-7 (Federal Reserve supervisory guidance on model risk)
- DFAST (Dodd-Frank Act Stress Testing)
- ACH (Automated Clearing House)
- BSA (Bank Secrecy Act)
- OCC (Office of the Comptroller of the Currency)

Credit Union:
- BSA (Bank Secrecy Act)
- AML (Anti-Money Laundering)
- SAR (Suspicious Activity Report)
- KYC (Know Your Customer)
- NCUA (National Credit Union Administration)
- CUSO (Credit Union Service Organization)
- ALM (Asset Liability Management)

P&C Insurance:
- P&C (Property & Casualty)
- CAT (Catastrophe modeling)
- IBNR (Incurred But Not Reported)
- RBC (Risk-Based Capital)
- NAIC (National Association of Insurance Commissioners)
- LOB (Line of Business)
- UW (Underwriting)

Investment Management / Wealth Management:
- AUM (Assets Under Management)
- RIA (Registered Investment Adviser)
- MiFID (Markets in Financial Instruments Directive)
- KYC (Know Your Customer)
- AML (Anti-Money Laundering)
- ESG (Environmental, Social, Governance)
- SMA (Separately Managed Account)

---

## The SQL You Need to Run

Run this against the Neon database. Connection string:
```
postgresql://neondb_owner:npg_uVh79FPNHjoO@ep-billowing-river-a45djnaz.us-east-1.aws.neon.tech/keystone?sslmode=require&channel_binding=disable
```

**Step 1 — Look up the team and admin user IDs (run this first to get real UUIDs):**
```sql
SELECT id, name, slug FROM teams;
SELECT id, email, role FROM users;
```

**Step 2 — Insert engagements** using the real team_id and created_by (admin user id)
from Step 1. Example pattern:
```sql
INSERT INTO engagements (id, team_id, created_by, client_name, client_industry, engagement_date, attendees, status)
VALUES (
  gen_random_uuid(),
  '<team_id>',
  '<admin_user_id>',
  'Heartland Community Bank (Synthetic)',
  'Community Banking',
  '2025-03-20',
  'CRO, Head of Model Risk, Chief Compliance Officer',
  'complete'
);
```

**Step 3 — Insert uploaded_documents** for each engagement. Use the engagement's UUID.
For `complete` and `awaiting_review_*` engagements, insert at least a transcript doc.
For `draft` engagements, insert nothing.
For `ready` engagements, insert the transcript doc only.

```sql
INSERT INTO uploaded_documents (id, engagement_id, uploaded_by, doc_type, original_filename, storage_key, file_size_bytes, parsed_text)
VALUES (
  gen_random_uuid(),
  '<engagement_id>',
  '<admin_user_id>',
  'transcript',
  'discovery-session-transcript.txt',
  '<engagement_id>/transcript/discovery-session-transcript.txt',
  2048,
  '<paste full transcript text here>'
);
```

**Step 4 — Insert keystone_runs** for engagements that have been run (status not draft/ready).
```sql
INSERT INTO keystone_runs (id, engagement_id, triggered_by, status, deck_brief_storage_key, deck_handoff_storage_key, completed_at)
VALUES (
  gen_random_uuid(),
  '<engagement_id>',
  '<admin_user_id>',
  'complete',
  '<engagement_id>/output/deck_brief.docx',
  '<engagement_id>/output/deck_handoff.json',
  NOW()
);
```

For `awaiting_review_1`, use status = 'awaiting_review_1' and omit deck_brief_storage_key
and deck_handoff_storage_key (leave as NULL). Same logic for `awaiting_review_2`.

**Step 5 — Insert acronym_glossary** for any engagement that has passed Gate 1.
```sql
INSERT INTO acronym_glossary (id, engagement_id, term, expansion, confidence, source)
VALUES
  (gen_random_uuid(), '<engagement_id>', 'CECL', 'Current Expected Credit Loss', 0.98, 'web_search'),
  (gen_random_uuid(), '<engagement_id>', 'MRM', 'Model Risk Management', 0.99, 'web_search'),
  (gen_random_uuid(), '<engagement_id>', 'SR 11-7', 'Federal Reserve Model Risk Management Guidance', 0.97, 'web_search');
```

---

## Important Rules

1. **Always append `(Synthetic)` to every client name.** The synthetic guard
   (`synthetic_guard.py`) blocks real Crowe client names. Engagements without
   "(Synthetic)" in the name may be blocked in the test environment.

2. **Status must match the documents and runs.** If status = `complete`, there must be
   a keystone_run with status = `complete`. If status = `awaiting_review_2`, the run
   status must also be `awaiting_review_2`.

3. **Storage keys for output files are fake for seed data.** The files don't actually
   exist in Supabase — the download buttons will 404. This is acceptable for demo
   purposes. Only real pipeline runs produce actual output files.

4. **Parsed_text in uploaded_documents is what the pipeline actually processes.**
   Make this realistic — it's what Nodes 2–5 operate on.

5. **Do not use real client names.** The blocklist includes actual Crowe clients.
   Use fictional bank/insurance/credit union names that are plausibly Midwestern
   or regional financial institutions.
