# Keystone — PRD Phase A: Foundation
> Version 2.0 | Status: Draft | Author: Achyuth Rachur
> Repo: https://github.com/achyuthrachur/Crowe-Keystone

---

## 1. What This Tool Is

**Keystone** is an internal multi-agent pipeline that transforms raw discovery
session transcripts into a structured, human-reviewed Deck Brief — a Word document
plus a JSON handoff file that Claude Code uses to start building a client presentation.

It is not a client-facing tool. It is not a demo. It is a production internal tool
used by 5 members of the Crowe IRM AI team on every client engagement where an
on-site discovery session is conducted.

**The problem it solves:**
- Raw transcripts contain extraneous content (personal chatter, off-topic threads,
  side conversations about other workstreams) that pollutes deck content.
- Acronyms and org-specific terms are resolved incorrectly when the team lacks an SME
  in the client's industry (e.g., P&C = Property & Casualty for Nationwide, not PNC Bank).
- The manual process of going from transcript → deck structure takes hours and is
  inconsistent across team members.

**The output it produces:**
1. A Crowe-branded Word document (.docx) — the Deck Brief — structured as a
   section-by-section outline with suggested slide types, speaker notes stubs,
   and a client context summary. This is the human review artifact.
2. A JSON file — the Deck Handoff — a machine-readable version of the same
   content structured for Claude Code to ingest and begin deck generation.

---

## 2. Two-Environment Architecture

This is the most important architectural decision in the PRD. The tool runs in
two completely separate environments with different deployment targets, different
databases, and different data policies. The codebase is one repo with
environment-aware configuration. No client data ever touches Vercel or Neon.

### 2.1 Production Environment — ADO

| Layer | Target |
|---|---|
| CI/CD | Azure DevOps Pipelines |
| Backend host | Azure Container Apps (or Azure App Service — TBD on ADO access) |
| Frontend host | Azure Static Web Apps |
| Database | Azure PostgreSQL Flexible Server (provisioned by Crowe IT or self-managed) |
| Auth | next-auth v5, email + password, JWT — unchanged |
| Data policy | Real client data. Never leaves ADO/Azure environment. |
| API keys | Azure Key Vault or ADO Pipeline variable groups — never in code |

> ADO is a prerequisite, not a dev blocker. Azure resource provisioning and
> ADO pipeline wiring are separate deliverables. Build the app fully against the
> test environment. ADO deployment is the handoff step, not a development gate.

### 2.2 Test / Dev Environment — Vercel + Neon

| Layer | Target |
|---|---|
| CI/CD | Vercel Git integration (auto-deploy on push to main) |
| Backend host | Koyeb (existing) |
| Frontend host | Vercel — https://crowe-keystone.vercel.app |
| Database | Neon PostgreSQL (existing connection string in .planning/STATE.md) |
| Auth | Same next-auth v5 config, separate NEXTAUTH_URL |
| Data policy | Synthetic data only. Zero real client data, ever. |
| API keys | Vercel environment variables + Koyeb dashboard |

A seed script (backend/scripts/seed_synthetic.py) populates Neon with fake
engagements, fake transcript files, and fake output artifacts so the pipeline
can be fully exercised without real engagement data.

### 2.3 Environment Detection in Code

ENVIRONMENT already exists in backend/src/config.py. It gains a third value.
The following fields are added to Settings in config.py — existing fields
are not removed or modified:

```python
# backend/src/config.py — additions only, append to Settings class

# Environment: development | test | production
# development: local machine, no real data
# test: Vercel/Neon/Koyeb, synthetic data only
# production: ADO/Azure, real client data
ENVIRONMENT: str = "development"

# File storage backend: local | azure_blob | supabase
# local:       writes to /tmp/keystone-uploads/ (development only)
# azure_blob:  Azure Blob Storage (production)
# supabase:    Supabase Storage (test)
FILE_STORAGE_BACKEND: str = "local"

# Azure Blob Storage — production only
AZURE_STORAGE_CONNECTION_STRING: str = ""
AZURE_STORAGE_CONTAINER: str = "keystone-uploads"

# Supabase storage — test environment only
SUPABASE_URL: str = ""
SUPABASE_SERVICE_KEY: str = ""

@property
def is_production(self) -> bool:
    return self.ENVIRONMENT.lower() == "production"

@property
def is_test(self) -> bool:
    return self.ENVIRONMENT.lower() == "test"
```

The rule enforced in code: if is_production is False, the upload endpoint
rejects real client data (enforced by synthetic_guard.py — see section 11).

### 2.4 ADO Pipeline YAML Skeleton

Not final. Drop at .ado/azure-pipelines.yml and track in source.
Wire in actual Azure steps after resources are provisioned.

```yaml
# .ado/azure-pipelines.yml — skeleton only
trigger:
  branches:
    include:
      - main

pool:
  vmImage: ubuntu-latest

stages:
  - stage: Build
    jobs:
      - job: BuildBackend
        steps:
          - task: Docker@2
            inputs:
              command: build
              Dockerfile: backend/Dockerfile
              tags: $(Build.BuildId)
      - job: BuildFrontend
        steps:
          - script: cd frontend && npm ci && npm run build
            env:
              NODE_TLS_REJECT_UNAUTHORIZED: "0"

  - stage: Deploy
    dependsOn: Build
    jobs:
      - job: DeployToAzure
        steps:
          # TODO: Azure Container Apps deploy step
          # TODO: Run Alembic migrations against Azure PostgreSQL before container start
          # TODO: Azure Static Web Apps deploy step
          - script: echo "Wire Azure deployment steps after resources are provisioned"
```

---

## 3. Repo Structure — What Changes, What Stays

Built inside the existing Crowe-Keystone repo. No new repo created.

### 3.1 What Is Deleted

Claude Code runs this as a checklist. After deletion, npm run typecheck
and pytest must both pass before Phase B begins.

**Backend — delete entirely:**
```
backend/src/graph/nodes/approval_router.py
backend/src/graph/nodes/assumption_excavator.py
backend/src/graph/nodes/brief_generator.py
backend/src/graph/nodes/build_log_persister.py
backend/src/graph/nodes/classifier.py
backend/src/graph/nodes/conflict_detector.py
backend/src/graph/nodes/context_loader.py
backend/src/graph/nodes/daily_brief_generator.py
backend/src/graph/nodes/daily_brief_persister.py
backend/src/graph/nodes/daily_data_gatherer.py
backend/src/graph/nodes/memory_indexer.py
backend/src/graph/nodes/open_question_extractor.py
backend/src/graph/nodes/prd_drafter.py
backend/src/graph/nodes/prd_persister.py
backend/src/graph/nodes/prompt_writer.py
backend/src/graph/nodes/quality_gate.py
backend/src/graph/nodes/retro_generator.py
backend/src/graph/nodes/retro_persister.py
backend/src/graph/nodes/stress_tester.py
backend/src/graph/nodes/update_writer.py
backend/src/graph/keystone_graph.py
backend/src/routers/approvals.py
backend/src/routers/conflicts.py
backend/src/routers/daily.py
backend/src/routers/decisions.py
backend/src/routers/graph.py
backend/src/routers/integrations.py
backend/src/routers/memory.py
backend/src/routers/prds.py
backend/src/routers/projects.py
backend/src/routers/retrospectives.py
backend/src/routers/webhooks.py
backend/src/models/approval.py
backend/src/models/conflict.py
backend/src/models/decision.py
backend/src/models/invitation.py
backend/src/models/prd.py
backend/src/models/project.py
backend/src/models/retrospective.py
backend/src/background/                     (entire directory)
```

**Backend — keep exactly as-is:**
```
backend/src/routers/auth.py
backend/src/routers/stream.py               (broadcast_to_team() is sacred)
backend/src/routers/agents.py               (modified in Phase C, not replaced)
backend/src/routers/health.py
backend/src/routers/push.py
backend/src/routers/team.py
backend/src/models/agent_run.py
backend/src/models/team.py
backend/src/models/user.py
backend/src/models/push_subscription.py
backend/src/database.py
backend/src/config.py                       (additive changes only per section 2.3)
backend/src/main.py                         (remove deleted router registrations)
backend/alembic/                            (chain preserved, 003 added in Phase B)
```

**Frontend — delete entirely:**
```
frontend/src/app/(app)/daily/
frontend/src/app/(app)/graph/
frontend/src/app/(app)/inbox/
frontend/src/app/(app)/memory/
frontend/src/app/(app)/projects/
frontend/src/components/agents/
frontend/src/components/approvals/
frontend/src/components/graph/
frontend/src/components/prd/
frontend/src/components/projects/
frontend/src/components/projects-mobile/
frontend/src/components/mobile/
```

**Frontend — keep exactly as-is:**
```
frontend/src/components/layout/AppShell     (nav items replaced in Phase D)
frontend/src/components/ui/                 (all shadcn primitives)
frontend/src/components/notifications/      (toast store + UI)
frontend/src/hooks/useSSE.ts                (modified in Phase D)
frontend/src/lib/sse.ts
frontend/src/stores/toast.store.ts
frontend/src/stores/notifications.store.ts
frontend/src/app/(auth)/
frontend/src/app/install/
frontend/src/app/globals.css
frontend/src/app/layout.tsx
frontend/tailwind.config.ts
frontend/src/app/(app)/settings/            (trim to profile + theme only)
```

### 3.2 What Is Added — High Level

**Backend new files:**
```
backend/src/graph/keystone_graph.py
backend/src/graph/nodes/transcript_ingester.py
backend/src/graph/nodes/noise_filter.py
backend/src/graph/nodes/research_agent.py
backend/src/graph/nodes/disambiguator.py
backend/src/graph/nodes/content_extractor.py
backend/src/graph/nodes/brief_compiler.py
backend/src/graph/prompts/noise_filter.md
backend/src/graph/prompts/research_agent.md
backend/src/graph/prompts/disambiguator.md
backend/src/graph/prompts/content_extractor.md
backend/src/graph/prompts/brief_compiler.md
backend/src/routers/engagements.py
backend/src/routers/upload.py
backend/src/routers/output.py
backend/src/routers/runs.py
backend/src/models/engagement.py
backend/src/models/uploaded_document.py
backend/src/models/keystone_run.py
backend/src/models/acronym_glossary.py
backend/src/services/docx_builder.py
backend/src/services/json_builder.py
backend/src/services/file_parser.py
backend/src/services/file_storage.py
backend/src/services/synthetic_guard.py
backend/src/services/synthetic_guard_blocklist.txt
backend/scripts/seed_synthetic.py
backend/alembic/versions/003_keystone.py
.ado/azure-pipelines.yml
```

**Frontend new files:**
```
frontend/src/app/(app)/engagements/page.tsx
frontend/src/app/(app)/engagements/[id]/page.tsx
frontend/src/app/(app)/engagements/[id]/upload/page.tsx
frontend/src/app/(app)/engagements/[id]/run/page.tsx
frontend/src/app/(app)/engagements/[id]/review/page.tsx
frontend/src/app/(app)/engagements/[id]/output/page.tsx
frontend/src/components/keystone/UploadZone.tsx
frontend/src/components/keystone/PipelineStatus.tsx
frontend/src/components/keystone/HitlPanel.tsx
frontend/src/components/keystone/TranscriptViewer.tsx
frontend/src/components/keystone/GlossaryEditor.tsx
frontend/src/components/keystone/ContentOutlineEditor.tsx
frontend/src/components/keystone/OutputPanel.tsx
frontend/src/stores/keystone.store.ts
frontend/src/types/keystone.types.ts
frontend/src/hooks/useKeystoneSSE.ts
```

---

## 4. AI Model

**Model:** gpt-5.4
**Provider:** OpenAI Chat Completions API
**Used by:** All 5 agent nodes that call the LLM (noise_filter, research_agent,
disambiguator, content_extractor, brief_compiler). transcript_ingester is pure
file parsing — no LLM call.

OPENAI_API_KEY already exists in config.py and in both Koyeb and Vercel
environment variables. No new key setup needed for the test environment.
For ADO production, stored in an ADO Pipeline variable group as a secret.

**All LLM-calling nodes follow this exact pattern:**
```python
# Constant — defined once in backend/src/graph/keystone_graph.py, imported by nodes
KEYSTONE_MODEL = "gpt-5.4"

# Node call pattern — no variation
response = await client.chat.completions.create(
    model=KEYSTONE_MODEL,
    messages=[
        {"role": "system", "content": system_prompt},   # loaded from .md file
        {"role": "user", "content": user_message},
    ],
    temperature=0.2,
    response_format={"type": "json_object"},
)
raw_output = response.choices[0].message.content or "{}"
parsed = SomeOutputModel.model_validate_json(raw_output)  # Pydantic — never regex
```

**Web search:** research_agent is the only node that makes external network
calls. It uses OpenAI's built-in web search via the Responses API:
```python
tools=[{"type": "web_search_preview"}]
```
No other node makes external calls.

---

## 5. Auth & Access

Existing next-auth v5 system unchanged. User.role (builder | lead | admin):
- All 5 team members: builder or lead
- Only lead or admin can delete an engagement
- All roles: create, upload, run, review, download

No new invite flow. Team is already provisioned via /auth/register.
All engagement data scoped to team_id, identical to AgentRun.

---

## 6. User Journey — End to End

```
Step 1 — Create Engagement
  /engagements → "New Engagement"
  Fields: client_name, client_industry, engagement_date, attendees (free text)
  Creates Engagement (status: draft)
  Redirects to /engagements/[id]/upload

Step 2 — Upload Documents
  Upload files:
    - Transcript (required): Fireflies .txt, Teams .vtt, plain .txt
    - Preread (optional): PDF or .docx
    - Agenda (optional): PDF or .docx
  Each file → parsed → stored via file_storage service → UploadedDocument created
  User clicks "Run Pipeline" → status: ready → running

Step 3 — Pipeline (6 nodes, 3 HITL gates)

  [NODE 1 — AUTO]  transcript_ingester
    Parses upload bytes → normalized plain text → KeystoneState.clean_transcript

  [NODE 2 — AUTO]  noise_filter
    Input: clean_transcript + agenda text (scope reference)
    Output: filtered_transcript + removed_segments[]

  ── HITL GATE 1 ──────────────────────────────────────────────────────────────
  SSE: keystone.awaiting_review_1
  UI: diff-style view of removed_segments
  User: restore any incorrectly removed segments
  User clicks "Looks Good" → pipeline resumes
  ─────────────────────────────────────────────────────────────────────────────

  [NODE 3 — AUTO]  research_agent
    Input: client_name + client_industry
    Output: client_context_profile{} + acronym_glossary[{term, expansion}]
    Uses web_search_preview tool.

  [NODE 4 — AUTO]  disambiguator
    Input: filtered_transcript + acronym_glossary
    Output: disambiguated_transcript + unresolved_terms[]

  ── HITL GATE 2 ──────────────────────────────────────────────────────────────
  SSE: keystone.awaiting_review_2
  UI: GlossaryEditor — full glossary with suggested expansions
  User: edit expansions, add missing terms, delete false positives
  User clicks "Approve Glossary" → pipeline resumes
  ─────────────────────────────────────────────────────────────────────────────

  [NODE 5 — AUTO]  content_extractor
    Input: disambiguated_transcript + client_context_profile
    Output: content_outline{} with sections:
      key_themes[], pain_points[], stated_priorities[],
      open_questions[], potential_recommendations[], suggested_next_steps[]

  ── HITL GATE 3 ──────────────────────────────────────────────────────────────
  SSE: keystone.awaiting_review_3
  UI: ContentOutlineEditor — editable structured outline
  User: edit fields, reorder items, add/remove items, add slide type hints
  User clicks "Finalize Outline" → pipeline resumes
  ─────────────────────────────────────────────────────────────────────────────

  [NODE 6 — AUTO]  brief_compiler
    Input: content_outline + client_context_profile + acronym_glossary
    Output: deck_brief.docx + deck_handoff.json
    Stores both files via file_storage service
    KeystoneRun.status → complete
    SSE: keystone.complete

Step 4 — Output
  /engagements/[id]/output
  Download .docx and .json
  Engagement.status = complete
```

---

## 7. State Machine — Engagement Status

```
draft → uploading → ready → running → awaiting_review_1 → running →
awaiting_review_2 → running → awaiting_review_3 → compiling → complete | failed
```

| Status | Trigger |
|---|---|
| draft | Engagement created |
| uploading | First upload starts |
| ready | At least one transcript successfully uploaded |
| running | User clicks "Run Pipeline" / pipeline resumes from HITL gate |
| awaiting_review_1 | noise_filter completes |
| awaiting_review_2 | disambiguator completes |
| awaiting_review_3 | content_extractor completes |
| compiling | User approves Gate 3, brief_compiler starts |
| complete | brief_compiler completes, both files downloadable |
| failed | Any node throws unhandled exception |

Every transition broadcasts keystone.status_changed SSE event:
{engagement_id, new_status, old_status}.
Frontend derives all UI state from Engagement.status exclusively.

---

## 8. Tech Stack — Exact Specifications

### 8.1 Backend — Additions to requirements.txt

```
python-docx==1.1.2
pypdf==4.3.1
python-multipart==0.0.9
azure-storage-blob==12.23.1
supabase==2.9.1
openai==1.57.0              (verify current version, upgrade if lower)
```

Remove from requirements.txt if present (no longer used):
```
anthropic
sentence-transformers
```

### 8.2 Frontend — package.json Changes

Remove:
```
@xyflow/react
@dagrejs/dagre
```

No new dependencies added. All UI uses existing installed packages.

### 8.3 Model Constant

```python
# backend/src/graph/keystone_graph.py — defined here, imported by all nodes
KEYSTONE_MODEL = "gpt-5.4"
```

---

## 9. Environment Variables — Complete Reference

### 9.1 Test Environment — Koyeb backend .env

```
DATABASE_URL=postgresql+asyncpg://neondb_owner:...@ep-billowing-river...neon.tech/keystone
DATABASE_URL_SYNC=postgresql+psycopg2://...?channel_binding=disable
OPENAI_API_KEY=sk-...
SECRET_KEY=...
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=10080
FRONTEND_URL=https://crowe-keystone.vercel.app
ALLOWED_ORIGINS=https://crowe-keystone.vercel.app,http://localhost:3002
ENVIRONMENT=test
FILE_STORAGE_BACKEND=supabase
SUPABASE_URL=https://...supabase.co
SUPABASE_SERVICE_KEY=...
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_CONTACT=rachura@crowe.com
```

### 9.2 Production — ADO Pipeline Variable Group (secrets)

```
DATABASE_URL=postgresql+asyncpg://...[Azure PostgreSQL]
DATABASE_URL_SYNC=postgresql+psycopg2://...[Azure PostgreSQL]?channel_binding=disable
OPENAI_API_KEY=sk-...
SECRET_KEY=...
ENVIRONMENT=production
FILE_STORAGE_BACKEND=azure_blob
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=...
AZURE_STORAGE_CONTAINER=keystone-uploads
FRONTEND_URL=https://[azure-static-web-app-url]
ALLOWED_ORIGINS=https://[azure-static-web-app-url]
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=10080
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_CONTACT=rachura@crowe.com
```

### 9.3 Frontend — Vercel .env.local (test)

```
NEXT_PUBLIC_BACKEND_URL=https://[koyeb-backend-url]
NEXTAUTH_SECRET=...
NEXTAUTH_URL=https://crowe-keystone.vercel.app
```

### 9.4 Frontend — ADO Production

```
NEXT_PUBLIC_BACKEND_URL=https://[azure-container-app-url]
NEXTAUTH_SECRET=...
NEXTAUTH_URL=https://[azure-static-web-app-url]
```

---

## 10. File Storage — Environment-Aware Service

All file I/O goes through backend/src/services/file_storage.py.
Nothing in routers or nodes touches storage directly.

**Interface contract:**
```python
async def store_upload(file_bytes: bytes, filename: str, engagement_id: str) -> str:
    """Returns storage_key — opaque string stored on UploadedDocument.storage_key"""

async def retrieve_upload(storage_key: str) -> bytes:
    """Returns raw file bytes"""

async def store_output(file_bytes: bytes, filename: str, engagement_id: str) -> str:
    """Stores generated .docx or .json. Returns storage_key."""

async def retrieve_output(storage_key: str) -> bytes:
    """Returns output file bytes"""
```

Backend routing on FILE_STORAGE_BACKEND:
- local       → /tmp/keystone-uploads/[engagement_id]/[filename]
- supabase    → Supabase Storage bucket keystone-uploads, object path [engagement_id]/[filename]
- azure_blob  → Azure Blob container keystone-uploads, blob name [engagement_id]/[filename]

storage_key is the object path string for all three backends.
For local, it is the absolute file path.

---

## 11. Synthetic Data Guard

backend/src/services/synthetic_guard.py runs on every upload in non-production
environments. If settings.is_production is True, guard is bypassed entirely.

In test or development, the guard checks:
1. Engagement.client_name is not in synthetic_guard_blocklist.txt
   (manually maintained list of real Crowe client names — one per line)
2. File content does not match patterns: SSNs (\d{3}-\d{2}-\d{4}),
   account numbers (9-18 consecutive digits), ABA routing numbers

Rejection response on failure:
```json
{
  "status": 422,
  "detail": "Real client data is not permitted in the test environment. Use the production deployment for live engagements."
}
```

---

## 12. Alembic Migration Chain

Existing chain preserved:
```
001_initial → 002_phase2 → 003_keystone
```

003_keystone.py must have down_revision = "002_phase2".

upgrade() must:
1. Drop (in dependency order): invitations, approvals, conflicts,
   decisions, retrospectives, prds, projects
2. Create: engagements, uploaded_documents, keystone_runs, acronym_glossary
   (exact schemas defined in Phase B)

downgrade() must fully reverse: drop new tables, recreate all dropped tables
from scratch. Required for safe rollback during ADO production deployment.

---

## 13. Out of Scope

- Fireflies MCP direct pull (files always uploaded manually)
- Decksmith / deck generator integration (JSON is the endpoint)
- Real-time collaborative editing (single-user per run)
- Email notifications (SSE toast sufficient)
- Mobile layout (desktop only — internal tool)
- APScheduler / scheduled jobs (all runs user-initiated)
- Conflict detection between engagements
- React Flow / xyflow visualization (dependency removed)
- Multi-transcript merging in a single run
- PDF output of Deck Brief (Word doc only)
- ADO pipeline YAML beyond skeleton in section 2.4
- Azure resource provisioning

---

## 14. Kickoff Prompt for Claude Code (Phase A)

See KICKOFF-PHASE-A.md in the project root.

---

## Phase B Preview

Phase B covers the Data Layer:
- Exact SQLAlchemy model definitions for Engagement, UploadedDocument,
  KeystoneRun, AcronymGlossary — all field types, constraints, indexes
- KeystoneState TypedDict — exact field list
- Alembic migration 003_keystone.py — complete upgrade() and downgrade()
- Pydantic request/response schemas for all 4 new routers
- JSON Deck Handoff schema — the exact structure Claude Code receives
- file_storage.py — full implementation for all 3 backends
- seed_synthetic.py — what fake data is created and in what shape
