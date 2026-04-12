# Keystone — Full Project Context
> Read this file at the start of every new Claude / Claude Code session.
> It replaces the need to re-read the entire conversation history.
> Updated after Phase E. Last updated: 2026-03-26.

---

## What This Tool Is

**Keystone** is an internal multi-agent pipeline that transforms raw discovery
session transcripts into a structured Deck Brief — a Word document (.docx) plus
a JSON handoff file that Claude Code uses to start building a client presentation.

**Who uses it:** 5 members of the Crowe IRM AI team. Internal use only.
Not shown to clients directly, but the Demo/POC deployment (Vercel) is used to
demonstrate the tool to internal stakeholders and to get ADO/Azure buy-in before
moving to the production environment.

**The problem it solves:**
On-site discovery sessions with financial services clients are recorded via
Fireflies. The raw transcript is noisy — personal chatter, off-topic threads,
and acronyms that get misread without client context (e.g. "P&C" read as PNC
Bank instead of Property & Casualty). Getting from raw transcript to a polished
deck outline currently takes hours and produces inconsistent results.

**What it produces:**
1. `deck_brief.docx` — Crowe-branded Word document with a section-by-section
   deck outline, suggested slide types, and speaker notes stubs.
2. `deck_handoff.json` — Machine-readable version for Claude Code to ingest
   and begin deck generation.

---

## The Six-Node Pipeline

```
[Node 1]  transcript_ingester   → parses uploaded file → clean plain text
[Node 2]  noise_filter          → removes off-topic content → filtered transcript + removed_segments[]
          ── HITL Gate 1 ──     user reviews removed content, restores anything wrong
[Node 3]  research_agent        → web search on client → client_context_profile + acronym_glossary
[Node 4]  disambiguator         → resolves acronyms in transcript using glossary
          ── HITL Gate 2 ──     user reviews/edits the acronym glossary
[Node 5]  content_extractor     → maps transcript to structured outline (themes, pain points, etc.)
          ── HITL Gate 3 ──     user reviews/edits the content outline
[Node 6]  brief_compiler        → assembles deck_brief.docx + deck_handoff.json
```

HITL gates use LangGraph `interrupt_before` + SSE. Pipeline pauses, broadcasts
an SSE event, frontend shows a review UI, user submits, pipeline resumes via
`keystone_graph.aupdate_state()` + `keystone_graph.astream(None, config)`.

---

## Two-Environment Architecture

There are two deployment targets. The codebase is one repo. Environment-aware
configuration via `ENVIRONMENT` and `FILE_STORAGE_BACKEND` env vars determines
which backend is active. No code changes needed between environments.

### Demo / POC — Vercel + Railway + Neon

| Layer | Target |
|---|---|
| Frontend | Vercel — crowe-keystone.vercel.app |
| Backend | Railway (preferred) — auto-deploy from GitHub main |
| Database | Neon PostgreSQL |
| File storage | Supabase Storage |
| CI/CD | Vercel / Railway Git integration |
| Data policy | **Synthetic data only. Zero real client data, ever.** |
| Env var | `ENVIRONMENT=test`, `FILE_STORAGE_BACKEND=supabase` |

### Production — ADO + Azure

| Layer | Target |
|---|---|
| Frontend | Azure Static Web Apps |
| Backend | Azure Container Apps |
| Database | Azure PostgreSQL Flexible Server |
| File storage | Azure Blob Storage |
| CI/CD | Azure DevOps Pipelines (.ado/azure-pipelines.yml) |
| Data policy | **Real client data permitted.** Synthetic guard bypassed. |
| Env var | `ENVIRONMENT=production`, `FILE_STORAGE_BACKEND=azure_blob` |

**The only things that differ between environments are env vars.**
No code changes. No branching. No separate builds.

---

## Tech Stack

**Backend:** Python 3.11, FastAPI, LangGraph, SQLAlchemy (async), Alembic,
Pydantic v2, OpenAI SDK

**AI model:** `gpt-5.4` (OpenAI)
All nodes: `temperature=0.2`, `response_format={"type": "json_object"}`,
Pydantic parsing — never regex. Constant: `KEYSTONE_MODEL = "gpt-5.4"` in
`backend/src/graph/keystone_graph.py`.

Web search: `research_agent` only, via `tools=[{"type": "web_search_preview"}]`
in the OpenAI Responses API.

**Frontend:** Next.js 15, TypeScript, Tailwind CSS, shadcn/ui, Zustand, SWR,
framer-motion, @dnd-kit/core, next-auth v5

**Deploy (Demo/POC):** Vercel + Railway (`--workers 1` required for SSE) + Neon
**Deploy (Production):** Azure Static Web Apps + Azure Container Apps + Azure PostgreSQL

**Corporate network:** `NODE_TLS_REJECT_UNAUTHORIZED=0` for npm/vercel.
`GIT_SSL_NO_VERIFY=true` for git. asyncpg SSL uses `ssl_context` connect arg.
Alembic sync URL needs `channel_binding=disable`.

---

## Current Repo Structure

```
Crowe-Keystone/
├── .ado/
│   └── azure-pipelines.yml
├── .claude/
│   └── agents/                      ← Claude Code sub-agent skill files
├── backend/
│   ├── alembic/versions/
│   │   ├── 001_initial.py
│   │   ├── 002_phase2.py
│   │   └── 003_keystone.py
│   ├── scripts/
│   │   └── seed_synthetic.py
│   ├── tests/
│   │   ├── conftest.py              ← shared fixtures: auth_client, anon_client, etc.
│   │   ├── test_phase1.py
│   │   ├── test_file_parser.py      ← Phase E
│   │   ├── test_engagements.py      ← Phase E
│   │   ├── test_upload.py           ← Phase E
│   │   ├── test_runs.py             ← Phase E
│   │   └── test_output.py           ← Phase E
│   └── src/
│       ├── graph/
│       │   ├── keystone_graph.py    ← compiled LangGraph graph, KEYSTONE_MODEL constant
│       │   ├── nodes/
│       │   │   ├── transcript_ingester.py
│       │   │   ├── noise_filter.py
│       │   │   ├── research_agent.py
│       │   │   ├── disambiguator.py
│       │   │   ├── content_extractor.py
│       │   │   └── brief_compiler.py
│       │   └── prompts/
│       │       ├── noise_filter.md
│       │       ├── research_agent.md
│       │       ├── disambiguator.md
│       │       ├── content_extractor.md
│       │       └── brief_compiler.md
│       ├── models/
│       │   ├── agent_run.py
│       │   ├── team.py
│       │   ├── user.py
│       │   ├── push_subscription.py
│       │   ├── engagement.py
│       │   ├── uploaded_document.py
│       │   ├── keystone_run.py
│       │   └── acronym_glossary.py
│       ├── routers/
│       │   ├── auth.py
│       │   ├── stream.py            ← broadcast_to_team() is the SSE bus
│       │   ├── agents.py
│       │   ├── health.py
│       │   ├── push.py
│       │   ├── team.py
│       │   ├── engagements.py       ← CRUD
│       │   ├── upload.py            ← file upload
│       │   ├── runs.py              ← start run + HITL gates
│       │   └── output.py            ← download .docx and .json
│       ├── schemas/
│       │   ├── engagement.py
│       │   ├── upload.py
│       │   ├── runs.py
│       │   └── output.py
│       ├── services/
│       │   ├── file_parser.py       ← .txt .vtt .srt .json .pdf .docx
│       │   ├── file_storage.py      ← local/supabase/azure_blob
│       │   ├── synthetic_guard.py
│       │   ├── synthetic_guard_blocklist.txt
│       │   ├── docx_builder.py      ← Crowe-branded Word doc assembly
│       │   ├── json_builder.py      ← deck handoff JSON assembly
│       │   └── push_service.py
│       ├── config.py
│       ├── database.py
│       ├── main.py
│       └── state.py                 ← KeystoneState TypedDict
├── frontend/
│   └── src/
│       ├── app/
│       │   ├── (auth)/              ← login / register
│       │   ├── (app)/
│       │   │   ├── engagements/
│       │   │   │   ├── page.tsx     ← Kanban board
│       │   │   │   ├── new/page.tsx ← creation form
│       │   │   │   └── [id]/page.tsx ← detail + stepper + HITL + output
│       │   │   └── settings/
│       │   └── install/
│       ├── components/
│       │   ├── ui/                  ← shadcn primitives
│       │   ├── layout/              ← AppShell, WebLayout, Sidebar, TopBar
│       │   ├── notifications/
│       │   └── keystone/
│       │       ├── KanbanBoard.tsx
│       │       ├── KanbanColumn.tsx
│       │       ├── EngagementCard.tsx
│       │       ├── EngagementCardSkeleton.tsx
│       │       ├── StatusBadge.tsx
│       │       ├── PipelineStepIndicator.tsx
│       │       ├── PipelineStepper.tsx
│       │       ├── UploadStep.tsx
│       │       ├── TranscriptDropzone.tsx
│       │       ├── RunStep.tsx
│       │       ├── RunConfirmModal.tsx
│       │       ├── PipelineNodeProgress.tsx
│       │       ├── Gate1Panel.tsx
│       │       ├── Gate2Panel.tsx
│       │       ├── Gate3Panel.tsx
│       │       ├── OutputStep.tsx
│       │       └── Spinner.tsx
│       ├── hooks/
│       │   ├── useSSE.ts
│       │   ├── useKeystoneSSE.ts
│       │   ├── useRunGraphState.ts
│       │   └── useMediaQuery.ts
│       ├── stores/
│       │   ├── toast.store.ts
│       │   ├── notifications.store.ts
│       │   └── keystone.store.ts
│       └── types/
│           └── keystone.types.ts
├── CLAUDE.md
├── CONTEXT.md                       ← THIS FILE
├── HANDOFF.md
└── PRD-PHASE-*.md                   ← one per phase, A through E
```

---

## Database

**Alembic head:** `003_keystone`
**Connection:** Neon PostgreSQL (Demo/POC) — see .planning/STATE.md for strings

| Table | Purpose |
|---|---|
| `teams` | One team: Crowe IRM AI |
| `users` | Team members |
| `agent_runs` | Kept for run tracking |
| `push_subscriptions` | Web push registrations |
| `engagements` | One per discovery session |
| `uploaded_documents` | Transcript, preread, agenda per engagement |
| `keystone_runs` | One LangGraph run per engagement |
| `acronym_glossary` | Acronym entries, user-edited |

**Synthetic data (Demo/POC only):**
3 complete engagements seeded. Admin: `achyuth@crowe-synthetic.test` / `synthetic-password-123`

---

## Key Patterns

**SSE:** All real-time updates via `broadcast_to_team(team_id, event_dict)` in
`stream.py`. Backend must run with `--workers 1`. Frontend hook: `useKeystoneSSE`.

**LangGraph HITL:** `interrupt_before=["research_agent", "content_extractor", "brief_compiler"]`.
Resume: `await keystone_graph.aupdate_state(config, gate_fields)` then
`background_tasks.add_task(_resume_graph, config)`.

**File storage:** All I/O via `file_storage.py`. No router or node touches
storage directly. `FILE_STORAGE_BACKEND` controls routing: local / supabase / azure_blob.

**Crash recovery:** On startup, `main.py` marks any `running/awaiting_review*/compiling`
runs as `failed` since MemorySaver state is lost on restart.

---

## Engagement Status State Machine

```
draft → uploading → ready → running
→ awaiting_review_1 → running
→ awaiting_review_2 → running
→ awaiting_review_3 → compiling → complete | failed
```

`Engagement.status` is the single source of truth. Every transition broadcasts
`keystone.status_changed` SSE.

---

## What Has Been Built — All Phases Complete

| Phase | What Was Built |
|---|---|
| A | Deleted old nodes/routers/models/frontend, removed APScheduler + React Flow, added env config |
| B | KeystoneState TypedDict, 4 SQLAlchemy models, Alembic migration 003, schemas, file_storage, synthetic_guard, seed script |
| C1 | file_parser.py, engagements/upload/runs/output routers, crash recovery in main.py |
| C2 | keystone_graph.py, 6 nodes, 5 prompts, graph wired into runs.py |
| C3 | docx_builder.py (Crowe-branded), json_builder.py (deck handoff schema) |
| D1 | keystone.types.ts, keystone.store.ts, useKeystoneSSE.ts, sidebar updated, page shells |
| D2 | 8-column Kanban, dnd-kit drag-and-drop, EngagementCard with all status signals, skeleton |
| D3 | Vertical stepper, UploadStep (dropzone), RunStep, RunConfirmModal, PipelineNodeProgress |
| D4 | Gate1Panel, Gate2Panel, Gate3Panel, useRunGraphState |
| D5 | OutputStep, TranscriptDropzone, Spinner, new engagement form |
| E | Deleted stale files, fixed stale comments, 39 new tests, CONTEXT.md updated |

---

## What Remains

**Phase F — Deploy to Demo/POC**
- Verify Dockerfile and Railway config
- Deploy backend to Railway with correct env vars
- Deploy frontend to Vercel with NEXT_PUBLIC_BACKEND_URL → Railway URL
- Run seed_synthetic.py against Neon
- Smoke test deployed URLs end-to-end

---

## PRD Files

| File | Covers |
|---|---|
| PRD-PHASE-A-FOUNDATION.md | Architecture, environments, deletion/config |
| PRD-PHASE-B-DATA-LAYER.md | Models, migration, schemas, services, seed |
| PRD-PHASE-C1-FILE-PARSER-AND-ROUTERS.md | file_parser + 4 routers + main.py |
| PRD-PHASE-C2-GRAPH-AND-NODES.md | LangGraph graph + 6 nodes + 5 prompts |
| PRD-PHASE-C3-OUTPUT-BUILDERS.md | docx_builder + json_builder |
| PRD-PHASE-D1-FOUNDATION.md | Types, store, SSE hook, sidebar, @dnd-kit install |
| PRD-PHASE-D2-KANBAN-BOARD.md | Kanban board, cards, drag-and-drop |
| PRD-PHASE-D3-DETAIL-UPLOAD-RUN.md | Stepper, upload, run modal, node progress |
| PRD-PHASE-D4-HITL-PANELS.md | Gate1/2/3 review panels |
| PRD-PHASE-D5-OUTPUT-AND-NEW-FORM.md | Output page, new engagement form |
| PRD-PHASE-E-CLEANUP-AND-TESTS.md | Stale file deletion, comment fixes, 39 tests |

## Current State File

`HANDOFF.md` — always contains the most recent phase completion notes.
Read this first when resuming any session.
