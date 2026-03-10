# Crowe Keystone — PRD
## AI-Native Operating System for AI Building Teams
### Version 1.0 | March 2026 | Achyuth Rachur, Crowe LLP AI Innovation Team

---

## HOW TO USE THIS PRD

Read this file before writing any code. Work through phases in order.
Do not start Phase N until Phase N-1 is fully working.
For each phase: read the goal, build what's listed, verify the checklist, then stop and confirm before proceeding.

**Skills to load:**
- UI work → `.claude/skills/frontend/SKILL.md` + `.claude/skills/branding/SKILL.md`
- Deployment → `.claude/skills/deployment/SKILL.md`
- Architecture → `.claude/skills/architecture/SKILL.md`

---

## PART 0 — PROJECT IDENTITY

| Field | Value |
|-------|-------|
| **Name** | Crowe Keystone |
| **Tagline** | Where AI teams build together |
| **Repo** | `achyuthrachur/crowe-keystone` |
| **Frontend URL** | `https://crowe-keystone.vercel.app` |
| **Backend URL** | `https://crowe-keystone-api.railway.app` |
| **Frontend Stack** | Next.js 15 + TypeScript + Tailwind + shadcn/ui + Geist + React Flow + Framer Motion |
| **Backend Stack** | Python 3.11 + FastAPI + LangGraph + LangChain + PostgreSQL |
| **AI** | Claude Sonnet (complex nodes) + Claude Haiku (simple nodes) |
| **Deployment** | Vercel (frontend) + Railway (backend) + Vercel Postgres |

## What Keystone Is

Keystone is an AI-native project management OS for teams building AI products.
It replaces scattered Slack threads, stale docs, and verbal approvals with a single living graph.
Every idea, PRD, decision, conflict, and approval lives as a node in a LangGraph state graph.
The AI drafts PRDs, surfaces conflicts, routes approvals, and builds institutional memory.

## Design Principles

1. The AI is a participant, not a tool — it does work, not suggestions
2. Every stage transition is explicit and documented
3. The graph is always visible
4. Conflicts surface before they cost time
5. Zero coordination overhead

## Typography

Keystone departs from Crowe's Helvetica Now — this is a developer tool, not a client deliverable.

- **Primary:** Geist Sans (Vercel's open-source geometric sans, native to Next.js 15)
- **Monospace:** Geist Mono (code blocks, node IDs, technical values)
- **Display:** Plus Jakarta Sans (hero text, large headings)

```tsx
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { Plus_Jakarta_Sans } from 'next/font/google';
```

## Color System

Dark-first. Uses Crowe palette applied to a near-black dark surface system.

```css
:root {
  --surface-base:     #0a0f1a;
  --surface-elevated: #0f1623;
  --surface-overlay:  #141d2e;
  --surface-input:    #1a2438;
  --surface-hover:    #1f2b40;
  --surface-selected: #243350;

  --indigo-dark:  #011E41;
  --indigo-core:  #002E62;
  --amber-core:   #F5A800;
  --amber-glow:   rgba(245, 168, 0, 0.12);

  --teal:   #05AB8C;
  --violet: #B14FC5;
  --blue:   #0075C9;
  --coral:  #E5376B;

  --text-primary:   #f0f4ff;
  --text-secondary: #8892a4;

  --border-subtle:  rgba(255, 255, 255, 0.06);
  --border-default: rgba(255, 255, 255, 0.10);
  --border-amber:   rgba(245, 168, 0, 0.30);
  --border-coral:   rgba(229, 55, 107, 0.30);
}
```

Stage colors:
```typescript
export const STAGE_COLORS = {
  spark:     { bg: 'var(--amber-glow)',  border: 'var(--border-amber)', text: 'var(--amber-core)' },
  brief:     { bg: 'rgba(249,115,22,.12)', border: 'rgba(249,115,22,.3)', text: '#F97316' },
  draft_prd: { bg: 'rgba(0,117,201,.12)', border: 'rgba(0,117,201,.3)', text: 'var(--blue)' },
  review:    { bg: 'rgba(177,79,197,.12)', border: 'rgba(177,79,197,.3)', text: 'var(--violet)' },
  approved:  { bg: 'rgba(5,171,140,.12)', border: 'rgba(5,171,140,.3)', text: 'var(--teal)' },
  in_build:  { bg: 'rgba(0,117,201,.12)', border: 'rgba(0,117,201,.3)', text: 'var(--blue)' },
  shipped:   { bg: 'rgba(5,171,140,.12)', border: 'rgba(5,171,140,.3)', text: 'var(--teal)' },
} as const;
```

---

## PART 1 — SYSTEM ARCHITECTURE

### Repository Structure

```
crowe-keystone/
├── frontend/          ← Next.js 15
│   └── src/
│       ├── app/       ← App Router
│       ├── components/
│       │   ├── ui/          ← shadcn (Crowe themed)
│       │   ├── graph/       ← React Flow nodes/edges
│       │   ├── projects/
│       │   ├── prd/
│       │   ├── approvals/
│       │   ├── conflicts/
│       │   └── agents/
│       ├── lib/
│       ├── hooks/
│       └── stores/    ← Zustand
├── backend/           ← Python FastAPI + LangGraph
│   └── src/
│       ├── graph/
│       │   ├── nodes/
│       │   └── prompts/
│       ├── routers/
│       ├── models/
│       └── services/
└── .claude/
    └── skills/        ← Load on demand
```

### Database Schema (key tables)

```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL,
  title TEXT NOT NULL,
  stage TEXT NOT NULL DEFAULT 'spark',
    -- spark | brief | draft_prd | review | approved | in_build | shipped | retrospective
  spark_content TEXT,
  brief JSONB,
  prd_id UUID,
  assigned_to UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE prds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'draft',
  content JSONB NOT NULL,
  open_questions JSONB DEFAULT '[]',
  stress_test_results JSONB,
  claude_code_prompt TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  type TEXT NOT NULL,
  assigned_to UUID[] NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  request_summary TEXT NOT NULL,
  decisions JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL,
  type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'advisory',
  project_a_id UUID,
  project_b_id UUID,
  description TEXT NOT NULL,
  resolution_options JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'open'
);
```

### API Endpoints

```
GET    /api/v1/projects
POST   /api/v1/projects
GET    /api/v1/projects/{id}
PATCH  /api/v1/projects/{id}
POST   /api/v1/projects/{id}/advance
GET    /api/v1/projects/{id}/prd
PUT    /api/v1/projects/{id}/prd

GET    /api/v1/approvals
POST   /api/v1/approvals/{id}/decide

GET    /api/v1/conflicts
POST   /api/v1/conflicts/{id}/resolve

GET    /api/v1/graph
GET    /api/v1/stream          ← SSE for real-time updates
POST   /api/v1/agents/run
```

---

## PART 2 — PHASE EXECUTION PLAN

### Phase 1 — Foundation
**Goal:** Auth, project CRUD, stage graph, database. No AI agents yet.

Build in this order:
1. All Alembic migrations + SQLAlchemy models
2. FastAPI skeleton — project CRUD, auth endpoints, SSE stub
3. Next.js 15 app shell — sidebar, topbar, dashboard with mock data, login page

**Checklist before proceeding:**
- [ ] Docker compose with Postgres runs locally
- [ ] POST/GET/PATCH project endpoints work
- [ ] NextAuth login works with test credentials
- [ ] App shell renders with sidebar navigation
- [ ] Dashboard shows mock project cards with correct stage colors
- [ ] `npm run build` passes with zero TypeScript errors

---

### Phase 2 — Stage Transitions + Approvals
**Goal:** Full stage graph working. Manual stage advances. Approval routing. Inbox page.

Build: stage advance endpoint, approval creation, inbox page, approval cards, SSE events for approvals, stage progress bar (animated).

**Checklist before proceeding:**
- [ ] Project advances from Spark → Brief
- [ ] Approval created automatically on stage advance
- [ ] Inbox shows pending approvals
- [ ] Approving/rejecting dismisses card with animation
- [ ] Bell notification updates via SSE
- [ ] Invalid stage skips rejected by backend

---

### Phase 3 — PRD System
**Goal:** Full PRD creation, editing, versioning, diff view. Human-authored only (no AI yet).

Build: PRD editor (section by section), version tracking, diff view, open questions section.

**Checklist before proceeding:**
- [ ] Can create and edit a PRD for a project
- [ ] Saving a section increments version
- [ ] Diff view shows changes correctly
- [ ] Open questions show blocking vs non-blocking
- [ ] Cannot advance from Draft PRD → Review with unresolved blocking questions

---

### Phase 4 — React Flow Graph
**Goal:** Portfolio graph showing all projects as nodes. Live updates via SSE.

Build: /graph route, React Flow canvas, ProjectNode/ConflictNode/StageEdge/ConflictEdge components, dagre layout, Zustand graph store, SSE → graph store integration.

```typescript
// dagre layout — group by stage on vertical axis
import dagre from '@dagrejs/dagre';
const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setGraph({ rankdir: 'TB', ranksep: 120, nodesep: 40 });
```

**Checklist before proceeding:**
- [ ] /graph loads with all projects as nodes, colored by stage
- [ ] Conflict edges appear between conflicting projects
- [ ] Clicking a node opens project detail sidebar
- [ ] SSE event triggers node color update with animation
- [ ] dagre layout groups nodes by stage vertically

---

### Phase 5 — LangGraph Backend
**Goal:** Full LangGraph implementation. All nodes coded. Tested via API.

**Four agents to build:**

**Agent 1 — Project Intelligence Agent (conflict detector)**
Runs on project state changes. Embeds project assumptions, computes pairwise similarity, flags conflicts when similarity > 0.75.

**Agent 2 — PRD Architect Agent**
Triggered on stage advances. Generates brief → PRD → stress test → assumption audit → open questions → Claude Code prompt. Parallel section drafting.

**Agent 3 — Approval Router Agent**
Triggered on stage advances. Computes approval chain. Writes ≤120 word approval summary for each reviewer.

**Agent 4 — Update Writer / Daily Brief Agent**
Converts git commits → structured build log entries. Generates daily brief at 7am per user timezone.

**LangGraph state:**
```python
class KeystoneState(TypedDict):
    run_id: str
    agent_type: str
    project_id: Optional[str]
    team_id: str
    raw_input: str
    brief: Optional[dict]
    prd_draft: Optional[dict]
    hypotheses: list
    detected_conflicts: list
    approval_chain: list
    human_checkpoint_needed: bool
    checkpoint_response: Optional[str]
    quality_score: float
    loop_count: int
    errors: list
    status: str
```

**Checklist before proceeding:**
- [ ] POST /api/v1/agents/run triggers brief generation from a spark
- [ ] Brief generation produces valid JSON
- [ ] Stress test runs 3 hypotheses
- [ ] Conflict detector identifies a test conflict
- [ ] Human checkpoint fires and pauses graph
- [ ] Graph resumes after checkpoint response
- [ ] All agent runs logged in agent_runs table

---

### Phase 6 — Agent ↔ Frontend Integration
**Goal:** Full end-to-end AI experience. Agents triggered from UI, results visible live.

Build: AgentPanel component (live node progress), AgentThinking animation, "Generate Brief" button triggers real agent, PRD sections appear as agent completes, StressTestPanel, conflict cards via SSE, human checkpoint UI.

**The demo moment:** User creates a Spark → AgentPanel appears → watches nodes execute → Brief appears → conflict with another project detected and shown as a card. This is the core value proof.

**Checklist before proceeding:**
- [ ] Clicking "Generate Brief" shows AgentPanel with thinking animation
- [ ] Agent nodes light up as they execute
- [ ] Brief appears after agent completes
- [ ] Conflict detected → ConflictCard appears on dashboard instantly
- [ ] Human checkpoint renders question, accepts answer, resumes agent

---

### Phase 7 — Integrations
**Goal:** GitHub sync, Fireflies transcript import, Azure AD SSO.

- GitHub webhook → build log update via update_writer agent
- Fireflies transcript → Spark suggestions
- Microsoft Entra ID provider added to NextAuth for @crowe.com accounts

---

### Phase 8 — Polish + Production
**Goal:** Lighthouse ≥ 90, zero console errors, full mobile support.

- Lazy load React Flow: `dynamic(() => import(...), { ssr: false })`
- Virtualize project list when > 20 items
- All images via `next/image`
- `prefers-reduced-motion` respected everywhere
- Mobile: sidebar → bottom sheet, single column grid

---

## PART 3 — OUT OF SCOPE

Billing, file attachments, video/audio, offline mode, multi-tenancy, fine-tuning, time tracking, external client access, Gantt chart, AI code generation, direct Slack posting.

---

## PART 4 — ENVIRONMENT VARIABLES

**Frontend:**
```
NEXTAUTH_URL=https://crowe-keystone.vercel.app
NEXTAUTH_SECRET=
BACKEND_URL=https://crowe-keystone-api.railway.app
```

**Backend:**
```
DATABASE_URL=postgresql+asyncpg://...
ANTHROPIC_API_KEY=
SECRET_KEY=
FRONTEND_URL=https://crowe-keystone.vercel.app
CONFLICT_THRESHOLD=0.75
```

---

## KICKOFF PROMPT

```
Read PRD.md and CLAUDE.md in full before writing any code.
Load .claude/skills/architecture/SKILL.md and .claude/skills/frontend/SKILL.md.

Work through phases in order. Start with Phase 1.
For each phase: read the goal, build what's listed, verify the checklist.
Do not proceed to the next phase until all checklist items pass.

Do NOT spawn subagents. Do NOT rewrite entire files for small changes.
Make targeted edits. Ask before making architecture decisions not covered here.

Run npm run build and npm run typecheck after every phase.
```
