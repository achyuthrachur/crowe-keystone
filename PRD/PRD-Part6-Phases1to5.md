# Crowe Keystone — PRD Part 6 of 7
## Phase Execution Plan — Phases 1 through 5
### Version 2.0 | March 2026

---

> **AGENT READING THIS:**
> Each phase section contains: Goal, Duration, Terminal Approach,
> Full Agent Roster with exact domains, Coordination Points,
> Complete Deliverables Checklist, and Kickoff Prompt.
> Do not begin Phase N until Phase N-1 checklist is 100% complete.
> Read BOTH the phase spec AND the relevant PRD sections before starting.

---

# ═══════════════════════════════════════════
# PHASE 1 — FOUNDATION
# ═══════════════════════════════════════════

**Goal:** Running app. Auth working. Project CRUD working. PWA shell installed.
Web and mobile layouts render. No AI agents yet. Just proving the data model
and UI patterns work together before adding complexity.

**Duration:** 1 week
**Terminal:** 1 terminal window
**Approach:** Subagents (Task tool)

## Phase 1 Agent Roster

```
STEP 1 — SCHEMA AGENT (BLOCKING — nothing else starts until this completes)

  Agent: keystone-schema-validator + keystone-migration-writer
  Domain: backend/src/models/, backend/src/schemas/, backend/alembic/

  Tasks:
    Write Phase 1 migration: teams, users, projects, agent_runs, push_subscriptions
    Write all 5 SQLAlchemy models
    Write all Pydantic schemas for project CRUD
    Run: alembic upgrade head
    Run: alembic downgrade -1 && alembic upgrade head
    Run: keystone-schema-validator to verify consistency

  Schema Agent reports: "All migrations verified. 5 tables created. Schemas consistent."
  ONLY THEN do Steps 2A-2E start.

STEP 2 — PARALLEL AGENTS (all 5 start simultaneously after Schema Agent)

  Agent 2A — Backend API Agent (keystone-backend-api)
  Domain: backend/src/routers/, backend/src/services/, backend/src/main.py,
          backend/src/database.py, backend/src/config.py
  Tasks:
    FastAPI app setup (CORS, auth middleware, router registration)
    Auth router: POST /auth/login, POST /auth/logout, GET /auth/me
    Projects router: GET /projects, POST /projects, GET /projects/{id}, PATCH /projects/{id}
    Push router: POST /push/subscribe, DELETE /push/subscribe, GET /push/vapid-public-key
    SSE router: GET /stream (stub — accepts connection, sends heartbeat only, no events yet)
    Health check: GET /health
    Database async engine setup
    Does NOT implement any agent triggers yet (Phase 5)

  Agent 2B — Web Frontend Agent (keystone-web-frontend)
  Domain: frontend/src/components/ (excl. mobile/), frontend/src/app/
  Tasks:
    Next.js 15 init with correct dependencies (see package.json spec below)
    root layout.tsx with Geist + Plus Jakarta + service worker registration
    globals.css with ALL CSS variables from PRD Part 1
    AppShell.tsx routing to WebLayout or MobileLayout
    WebLayout.tsx: sidebar + topbar + main content area
    Sidebar.tsx: 5 nav items, amber active indicator, layoutId animation
    TopBar.tsx: logo + search placeholder + ViewportToggle + bell + avatar
    ViewportToggle.tsx: web/mobile switcher (see Part 3 spec)
    Login page: animated form with bg-dots pattern
    Dashboard (/projects): grid of 5 MOCK project cards
    ProjectCard.tsx: all specs from Part 3 (stage colors, conflict dot, hover states)
    StageFilterBar.tsx: pills with count badges
    Project detail /projects/[id]: 3-tab layout with RIGHT panel
    All using motion.ts variants, STAGE_COLORS, CSS variables
    API calls return mock data (typed stubs) — real API wired in Phase 2
    viewport.store.ts implemented

  Agent 2C — Mobile Frontend Agent (keystone-mobile-frontend)
  Domain: frontend/src/components/mobile/
  Tasks:
    MobileLayout.tsx with MobileTopBar + content area + BottomNav
    MobileTopBar.tsx (compact h-12 header)
    BottomNav.tsx: 4 tabs, amber active indicator, badge support (stub count = 0)
    PhoneFrame.tsx: iPhone 14 Pro shell with Dynamic Island (see Part 4 spec)
    MobileProjectCard.tsx: 80px compact card, all specs from Part 4
    MobileProjectList.tsx: vertical list with stagger
    MobileStageFilter.tsx: horizontal scroll-x pills with snap
    MobileProjectDetail.tsx: accordion sections + quick actions
    All mobile CSS requirements from Part 1 (safe areas, tap highlight, overscroll)
    Uses SAME mock data as Agent 2B

  Agent 2D — PWA Agent (keystone-pwa-specialist)
  Domain: frontend/public/sw.js, manifest.json, icons,
          frontend/src/lib/push-notifications.ts, frontend/src/lib/pwa.ts
  Tasks:
    manifest.json with all required fields (see Part 3 spec)
    app/manifest.ts Next.js metadata export
    sw.js: install + activate + fetch handlers (NO push handler yet — Phase 2)
    Service worker registration in layout.tsx
    PWA meta tags in layout.tsx (theme-color, apple-mobile-web-app, etc.)
    push-notifications.ts: all helpers (subscribeToPushNotifications, getVapidPublicKey,
      isPWAInstalled, urlBase64ToUint8Array) — NOT wired to real endpoint yet
    pwa.ts: install prompt detection helpers
    usePWA.ts hook
    Placeholder icon files (simple SVG-based PNGs for now)
    PushPermissionPrompt.tsx: renders but not shown anywhere yet

  Agent 2E — SSE Specialist (keystone-sse-specialist)
  Domain: frontend/src/hooks/useSSE.ts, frontend/src/stores/
  Tasks:
    useSSE.ts hook with full SSE event routing (stubs for most handlers)
    Reconnection with exponential backoff
    graph.store.ts: initial node/edge structure, update functions
    notifications.store.ts: notification list + badge count
    agent.store.ts: active run tracking
    viewport.store.ts: web/mobile mode + isMobileDevice detection
    SSE events typed via KeystoneSSEEvent union (see Part 2)
    This is stub-wired to stub API — real events come in Phase 2

STEP 3 — TEST AGENT (after all Phase 2 agents complete)

  Agent: keystone-test-writer
  Tasks:
    Frontend unit tests (Vitest):
      ProjectCard renders with correct stage color
      StageFilterBar filters project list
      ViewportToggle switches viewport.store mode
      BottomNav renders 4 tabs, active tab shows amber indicator
      PhoneFrame renders at 393×852 dimensions
      AppShell routes to WebLayout when mode='web' on desktop
      AppShell routes to PhoneFrame+MobileLayout when mode='mobile' on desktop
      AppShell routes to MobileLayout on real mobile device

    Backend tests (pytest):
      POST /auth/login returns token for valid credentials
      GET /projects returns empty list for new team
      POST /projects creates project with spark stage
      GET /projects/{id} returns created project
      PATCH /projects/{id}/stage is rejected (stage advance not yet implemented)
      alembic upgrade head completes without error
```

## Phase 1 package.json (frontend)

```json
{
  "dependencies": {
    "next": "15.x",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "geist": "^1.3.0",
    "framer-motion": "^11.0.0",
    "@xyflow/react": "^12.0.0",
    "@dagrejs/dagre": "^1.0.0",
    "zustand": "^5.0.0",
    "next-auth": "5.x",
    "lucide-react": "^0.400.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.0.0",
    "@radix-ui/react-dialog": "^1.0.0",
    "@radix-ui/react-dropdown-menu": "^2.0.0",
    "@radix-ui/react-tabs": "^1.0.0",
    "cmdk": "^1.0.0",
    "swr": "^2.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/react": "^19.0.0",
    "@types/node": "^20.0.0",
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10.0.0",
    "vitest": "^2.0.0",
    "@testing-library/react": "^16.0.0",
    "@testing-library/user-event": "^14.0.0",
    "@vitejs/plugin-react": "^4.0.0",
    "eslint": "^9.0.0",
    "eslint-config-next": "15.x"
  }
}
```

## Phase 1 requirements.txt (backend, key packages)

```
fastapi==0.111.x
uvicorn[standard]==0.30.x
sqlalchemy[asyncio]==2.0.x
asyncpg==0.29.x
alembic==1.13.x
pydantic==2.7.x
pydantic-settings==2.3.x
python-jose[cryptography]==3.3.x
passlib[bcrypt]==1.7.x
openai==1.x
langgraph==0.2.x
langchain==0.2.x
langchain-openai==0.1.x
pywebpush==2.0.x
sentence-transformers==3.0.x
apscheduler==3.10.x
pytest==8.2.x
pytest-asyncio==0.23.x
httpx==0.27.x
ruff==0.4.x
mypy==1.10.x
```

## Phase 1 Deliverables Checklist

- [ ] `alembic upgrade head` — all 5 tables created without error (runs against Neon)
- [ ] `alembic downgrade -1 && alembic upgrade head` — clean round-trip
- [ ] `POST /api/v1/auth/login` with test credentials returns `{ user, token }`
- [ ] `GET /api/v1/projects` returns `[]` for new team
- [ ] `POST /api/v1/projects` with `{title, spark_content}` creates row in DB
- [ ] `GET /api/v1/projects/{id}` returns created project with correct shape
- [ ] `PATCH /api/v1/projects/{id}` updates title field
- [ ] `GET /api/v1/stream` returns SSE stream with heartbeat comments
- [ ] `GET /api/v1/push/vapid-public-key` returns `{ key: string }`
- [ ] `npm run build` — zero TypeScript errors, zero build warnings
- [ ] Login page renders: animated form, bg-dots background, Plus Jakarta display font
- [ ] Web app shell: sidebar renders with 5 nav items
- [ ] Dashboard shows 5 mock project cards with correct stage badge colors
- [ ] Stage filter bar renders all 8 stage pills with count badges
- [ ] ViewportToggle in TopBar: click Mobile → PhoneFrame appears on desktop
- [ ] PhoneFrame renders at correct 393×852 dimensions with Dynamic Island
- [ ] Mobile dashboard inside PhoneFrame: compact cards + horizontal stage filter
- [ ] Mobile BottomNav: 4 tabs render, active tab shows amber indicator
- [ ] `manifest.json` accessible at `GET /manifest.json` — Lighthouse "installable" check passes
- [ ] Service worker registers in browser console without errors
- [ ] All Vitest frontend tests pass
- [ ] All pytest backend tests pass

## Phase 1 Kickoff Prompt

```
Terminal: open ONE terminal in crowe-keystone/ directory
Command: claude

Paste this:

---
Read PRD/PRD-Part6-Phases.md completely, focusing on Phase 1.
Read root CLAUDE.md completely.
Read WORKFLOWS.md completely.
You are the Phase 1 orchestrator using Subagent Approach (1 terminal).

STEP 1 (BLOCKING):
Spawn keystone-schema-validator + keystone-migration-writer agent.
Goal: Write all Phase 1 migrations (teams, users, projects, agent_runs, push_subscriptions).
Wait for agent to report: "All migrations verified. X tables created."
Run: cd backend && alembic upgrade head
Verify: migration succeeded with no errors.

STEP 2 (PARALLEL — spawn all simultaneously):
Spawn Agent 2A: keystone-backend-api → Phase 1 Backend API tasks
Spawn Agent 2B: keystone-web-frontend → Phase 1 Web Frontend tasks
Spawn Agent 2C: keystone-mobile-frontend → Phase 1 Mobile tasks
Spawn Agent 2D: keystone-pwa-specialist → Phase 1 PWA tasks
Spawn Agent 2E: keystone-sse-specialist → Phase 1 SSE/Stores tasks
All agents work from their domain boundaries. They do not touch each other's files.

STEP 3 (AFTER ALL PARALLEL COMPLETE):
Spawn keystone-test-writer → write and run all Phase 1 tests.

STEP 4: Run Phase 1 deliverables checklist line by line.
Report each: PASS or FAIL.
If any FAIL: spawn the responsible agent with specific fix instructions.
Re-run checklist after fixes.
Do NOT proceed to Phase 2 until ALL items are PASS.
---
```

---

# ═══════════════════════════════════════════
# PHASE 2 — STAGE TRANSITIONS + APPROVALS + PUSH
# ═══════════════════════════════════════════

**Goal:** Full stage graph. Stage advance creates approvals. Approvals
visible in inbox. SSE events fire and update UI in real time. Push
notifications buzz phone for approvals. End-to-end: create spark →
advance stage → approval appears in inbox → push notification → tap → inbox.

**Duration:** 1 week
**Terminal:** 1 terminal window
**Approach:** Subagents

## Phase 2 Agent Roster

```
STEP 1 — SCHEMA AGENT (BLOCKING)

  New tables: approvals, conflicts (empty for now)
  Migration: 002_phase2_approvals_conflicts.py
  New schemas: ApprovalCreate, ApprovalResponse, ApprovalDecision
  Alembic round-trip verified.

STEP 2 — PARALLEL AGENTS

  Agent 2A — Backend API Agent
  New:
    Stage validation service: valid_transitions dict, rejects invalid skips
    Approval chain config: which stage advances require which approvals
    POST /projects/{id}/advance: validates transition, creates approval if required,
      broadcasts project.stage_changed SSE, triggers push notify_stage_changed
    POST /approvals/{id}/decide: records decision, advances project if all approved,
      broadcasts approval.decided SSE, broadcasts project.stage_changed if advanced
    POST /push/subscribe: saves to push_subscriptions table
    Approval auto-creation: when stage advance requires approval, create approval record,
      broadcast approval.requested SSE, call push_service.notify_approval_requested

  Agent 2B — Web Frontend Agent
  New:
    Inbox page (/inbox): three sections (Approvals, Conflicts stub, Checkpoints stub)
    ApprovalRequest.tsx: full card spec from PRD Part 3
    Approve: teal flash (200ms) → AnimatePresence exit slide-right
    Reject: coral flash → exit slide-left
    Changes: amber flash → exit slide-up
    mode="popLayout" on ApprovalList AnimatePresence container
    Bell notification panel (NotificationPanel.tsx): slide-in from right
    Bell badge count: reads from notifications.store.pendingCount
    Stage progress bar on project detail: fills on stage advance
      uses progressFillVariants on the colored fill portion
    Toast notifications (ToastNotification.tsx): bottom-right, 4s auto-dismiss
    useSSE.ts: wire approval.requested → notifications.store.addApproval
               wire approval.decided → update approval status in store
               wire project.stage_changed → graph.store.updateNodeStage

  Agent 2C — Mobile Frontend Agent
  New:
    Mobile Inbox page
    MobileApprovalCard.tsx: full swipe implementation (see Part 4 spec)
      drag="x", dragConstraints, onDragEnd with SWIPE_THRESHOLD
      Teal reveal layer on right (approve), amber reveal layer on left (changes)
    BottomNav badge: reads notifications.store.pendingCount, shows coral count
    Mobile toast: shorter, centers at top on mobile
    Stage progress dots update when stage changes (SSE-driven)

  Agent 2D — PWA Agent
  New:
    Push notification wiring (this is Phase 2's primary PWA task)
    Service worker: add push event handler (see Part 3 spec)
    Service worker: add notificationclick handler with URL navigation
    push-notifications.ts: subscribeToPushNotifications() wired to real endpoint
    settings/notifications/page.tsx: Enable notifications page
      Shows permission status, [Enable push notifications] button
    PushPermissionPrompt.tsx: shown as banner after 60s engagement on mobile web
    Backend push_service.py: fully implemented (all notify_* functions)

  Agent 2E — SSE Specialist
  New:
    SSE server-side broadcast: broadcast_to_team() called by all services
    useSSE.ts: full event routing for approval.requested, approval.decided,
      project.stage_changed, conflict.detected (stub for now)
    notifications.store.ts: addApproval, removeApproval, pendingCount computed

STEP 3 — TEST AGENT

  Frontend:
    Stage advance button fires POST /projects/{id}/advance
    Approval card appears in inbox after advance
    Approve button: teal flash + card dismisses
    Reject button: coral flash + card dismisses
    Bell badge increments when approval.requested SSE fires
    Bell badge decrements when approval decided
    Mobile swipe right > 120px calls onApprove
    Mobile swipe left > 120px calls onRequestChanges
    Stage progress bar fills to correct percentage for each stage

  Backend:
    Spark → Brief advance: creates approval, returns 201
    Spark → Approved: rejected with 422 (invalid transition)
    Approve decision: project advances to next stage
    Reject decision: project stays in current stage
    Push subscription saved to DB
    notify_approval_requested called after approval created
    SSE broadcast fires after stage change
```

## Phase 2 Deliverables Checklist

- [ ] `POST /api/v1/projects/{id}/advance` with `{target_stage: 'brief'}` advances stage
- [ ] Same endpoint creates approval record visible in `/api/v1/approvals`
- [ ] `POST /api/v1/approvals/{id}/decide` with `{decision: 'approve'}` resolves approval
- [ ] Approval approval → project advances to next stage in DB
- [ ] Rejecting an approval → project stage unchanged in DB
- [ ] Invalid stage skip (spark → approved) returns 422 from backend
- [ ] Web: Inbox page shows pending approval card
- [ ] Approve action: teal flash + card slides out right + count decrements
- [ ] Reject action: coral flash + card slides out left
- [ ] Bell badge increments in real time without page refresh (SSE)
- [ ] Bell badge decrements after approve/reject
- [ ] Stage progress bar on project detail fills to correct position
- [ ] Stage progress bar animates (600ms) when stage changes via SSE
- [ ] Mobile: swipe right > 120px on approval card calls approve handler
- [ ] Mobile: swipe left > 120px calls request changes handler
- [ ] Mobile: BottomNav Inbox tab shows pending count badge
- [ ] Push subscription endpoint: `POST /api/v1/push/subscribe` saves to DB
- [ ] Advance stage → push notification fires to assigned user (verify via logs)
- [ ] `manifest.json` still passes Lighthouse PWA check
- [ ] All Phase 2 Vitest and pytest tests pass

## Phase 2 Kickoff Prompt

```
Read PRD/PRD-Part6-Phases.md Phase 2 section.
Phase 1 is complete. All Phase 1 checklist items passed.

STEP 1: Spawn Schema Agent for Phase 2 migration (approvals + conflicts tables).
Wait for migration verified.

STEP 2: Spawn parallel agents 2A-2E simultaneously.
Key coordination point: Agent 2A (backend) and Agent 2D (PWA) must coordinate
on the push notification endpoint shape. Agent 2D reads the API contract
from PRD Part 2 before implementing the frontend subscription call.

STEP 3: Test Agent after all complete.
STEP 4: Full Phase 2 checklist. All items PASS before Phase 3 starts.
```

---

# ═══════════════════════════════════════════
# PHASE 3 — LIVING PRD SYSTEM
# ═══════════════════════════════════════════

**Goal:** Full PRD creation, versioning, section editing, diff view.
Human-authored PRDs only (AI drafting is Phase 5). The PRD structure
proves correct before AI fills it in. StressTestPanel is a UI stub.

**Duration:** 1 week
**Terminal:** 1 terminal window
**Approach:** Subagents

## Phase 3 Agent Roster

```
STEP 1 — SCHEMA AGENT (BLOCKING)
  New table: prds
  Migration: 003_phase3_prds.py
  PRDContent TypedDict stub (fields defined but not populated by AI yet)
  Pydantic schemas: PRDCreate, PRDUpdate, PRDResponse, PRDVersionResponse

STEP 2 — PARALLEL AGENTS

  Agent 2A — Backend API Agent
  New:
    GET /projects/{id}/prd → returns current PRD version
    PUT /projects/{id}/prd → saves new version (increments version counter,
      marks previous as 'superseded', stores diff)
    Version diff computation: compare PRD versions field-by-field
    Validation: cannot advance from draft_prd to review if blocking open questions > 0
    SSE broadcast: prd.updated on each save

  Agent 2B — Web Frontend Agent
  New:
    PRDEditor.tsx: renders full PRD as section-by-section structured display
    PRDSection.tsx: each section with view mode + edit mode (AnimatePresence)
    Edit mode: appropriate field type per section (textarea, list editor, etc.)
    Save: PUT /projects/{id}/prd with updated content (optimistic update)
    StressTestPanel.tsx: amber background, shows "Run stress test →" placeholder only
    OpenQuestionBlock.tsx: blocking (⛔ coral) vs non-blocking (○) visual distinction
    VersionDiff.tsx: split-pane view (left = previous, right = current)
      Added: teal-glow bg + teal left border
      Removed: coral-glow bg + coral left border + strikethrough
    "Copy Claude Code prompt" button (clipboard API)
    PRD tab on project detail wired to real /projects/{id}/prd endpoint

  Agent 2C — Mobile Frontend Agent
  New:
    PRDAccordion.tsx: all PRD sections as collapsible accordion rows
    Each section: accordion header + accordionVariants content
    OpenQuestionBlock: compact mobile variant (blocking shown with ⛔ count in header)
    Quick CTA: "Generate Full PRD" amber button (stub — triggers nothing yet)
    Mobile project detail /projects/[id] shows PRD accordion as primary content

  Agent 2D — PWA Agent
  No new PWA work in Phase 3. Verify existing PWA still scores ≥ 90 after changes.

  Agent 2E — SSE Specialist
  New:
    Handle prd.updated SSE event: trigger SWR revalidation for /projects/{id}/prd
    PRD version badge in web header updates without page refresh

STEP 3 — TEST AGENT
  PRD creates for a project
  PUT /prd increments version number
  Blocking open question blocks stage advance (422)
  Non-blocking question allows advance
  VersionDiff renders correctly
  Copy prompt writes to clipboard
  Mobile accordion sections expand/collapse
```

## Phase 3 Deliverables Checklist

- [ ] `POST /api/v1/projects` then `PUT /api/v1/projects/{id}/prd` creates PRD with version 1
- [ ] Second `PUT` creates version 2, marks version 1 as superseded
- [ ] Version diff available via diff_from_previous field
- [ ] Stage advance with blocking open question returns 422
- [ ] Stage advance with only non-blocking questions succeeds
- [ ] Web PRD view: all sections render with view mode
- [ ] Clicking "Edit" on any section enters edit mode (AnimatePresence transition)
- [ ] Saving section sends PUT request and updates display optimistically
- [ ] StressTestPanel renders as amber placeholder with "Run stress test →" CTA
- [ ] OpenQuestionBlock shows ⛔ for blocking, ○ for non-blocking questions
- [ ] VersionDiff shows colored diff when toggled
- [ ] "Copy Claude Code prompt" button copies to clipboard (verify via console)
- [ ] Mobile accordion sections expand and collapse with smooth animation
- [ ] PRD version badge in TopBar updates via SSE without page refresh
- [ ] Lighthouse PWA score still ≥ 90
- [ ] All Phase 3 Vitest and pytest tests pass

---

# ═══════════════════════════════════════════
# PHASE 4 — REACT FLOW GRAPH VISUALIZATION
# ═══════════════════════════════════════════

**Goal:** Portfolio graph at /graph showing all projects as nodes.
Conflict edges between conflicting projects. Live SSE updates
animate node stage changes. Node click opens project drawer.
Mobile shows stage-grouped list. Desktop shows full graph.

**Duration:** 1.5 weeks
**Terminal:** 1 terminal window
**Approach:** Subagents (frontend-heavy, graph and SSE integration)

## Phase 4 Agent Roster

```
STEP 1 — NO SCHEMA CHANGES
  keystone-schema-validator runs to confirm schema is still consistent.

STEP 1 (parallel immediately after verify):
  Agent 1A — Backend API Agent
  New:
    GET /api/v1/graph endpoint:
      Returns { nodes: ReactFlowNode[], edges: ReactFlowEdge[] }
      nodes: one per project, data fields from Part 3 ProjectNode spec
      edges: stage edges (project relationships) + conflict edges (from conflicts table)
    Response cached in memory with 10s TTL
    Cache invalidated by SSE events (project.stage_changed, conflict.detected)

STEP 2 — PARALLEL AGENTS

  Agent 2A — Web Frontend (Graph Specialist) (keystone-web-frontend)
  Domain focus: graph/ directory only this phase
  New:
    KeystoneGraph.tsx: full React Flow configuration (see Part 3 spec)
    dagre layout (see Part 3 implementation)
    ProjectNode.tsx: 200×70px memo component (full spec from Part 3)
      isAgentActive: amber pulsing border animation
      hasConflicts: coral conflict dot with conflictPulseVariants
      selected: 2px amber ring
    ConflictNode.tsx: diamond shape, coral colors
    DecisionNode.tsx: hexagon shape, amber colors
    StageEdge.tsx: directed, label shows on hover
    ConflictEdge.tsx: dashed coral line with dashoffset animation
    GraphView.tsx: routes to KeystoneGraph vs MobileGraphList based on screen size
    /graph page: renders GraphView with project detail drawer on node click
    Project detail drawer: right slide-in panel, shows project summary + link to full detail

  Agent 2B — Mobile Frontend Agent (keystone-mobile-frontend)
  New:
    MobileGraphList.tsx: accordion grouped by stage
      8 stage sections: each expandable
      Within each: 60px project rows
      Conflict indicators: coral dot + "⚠ conflict" text on affected rows
    "View full graph ↗" link at bottom (opens /graph, landscape preferred)

  Agent 2C — SSE Specialist (keystone-sse-specialist)
  New:
    graph.store.ts: updateNodeStage with stageTransitionVariants trigger
    graph.store.ts: addConflictEdge, removeConflictEdge
    graph.store.ts: addProjectNode (for new projects via SSE)
    useSSE.ts: wire project.stage_changed to graph store
    useSSE.ts: wire conflict.detected to addConflictEdge
    useSSE.ts: wire conflict.resolved to removeConflictEdge
    useSSE.ts: wire project.created to addProjectNode
    Verify: stage change fires stageTransitionVariants on the node
    Verify: conflict.detected makes ConflictEdge appear with opacity 0→1 animation

  Agent 2D — No PWA changes needed. Verify still works.

STEP 3 — TEST AGENT
  GET /graph returns correct node/edge shape
  Node with hasConflicts: true shows conflict dot
  Node with isAgentActive: true shows amber pulsing border
  Stage change SSE fires: node color updates without full graph reload
  Conflict detected SSE fires: ConflictEdge appears between correct nodes
  ConflictEdge dashes animate (CSS animation present in DOM)
  MobileGraphList renders stage groups for all 8 stages
```

## Phase 4 Deliverables Checklist

- [ ] `/graph` route loads with all projects as nodes in dagre layout
- [ ] Nodes colored by current stage (STAGE_COLORS applied correctly)
- [ ] Nodes grouped by stage on vertical axis (dagre rankdir: 'TB')
- [ ] Open conflicts: ConflictEdge (dashed coral) appears between conflicting projects
- [ ] ConflictEdge dashes animate (stroke-dashoffset CSS animation)
- [ ] Clicking a node opens project detail drawer on right
- [ ] Project detail drawer shows project title, stage, owner, PRD link
- [ ] SSE `project.stage_changed` fires: node recolors with stageTransitionVariants
- [ ] SSE `conflict.detected` fires: ConflictEdge appears with fade-in animation
- [ ] SSE `conflict.resolved` fires: ConflictEdge disappears
- [ ] MiniMap renders in bottom-right corner with correct node colors
- [ ] Background dot pattern renders at 4% opacity
- [ ] Controls (zoom in/out/fit) render with correct styling
- [ ] Mobile: /graph shows MobileGraphList with 8 stage accordion groups
- [ ] Mobile: project rows show conflict indicators on affected projects
- [ ] All Phase 4 Vitest and pytest tests pass

---

# ═══════════════════════════════════════════
# PHASE 5 — LANGGRAPH BACKEND ENGINE
# ═══════════════════════════════════════════

**Goal:** Full LangGraph implementation. All nodes coded and tested.
State machine working end-to-end. Human checkpoints pause and resume.
Tested via API directly (not connected to frontend yet — that's Phase 6).

**Duration:** 2 weeks
**Terminal:** 1 terminal OR 2-3 terminals (your choice — Agent Teams or Worktrees)
**Approach:** Agent Teams (recommended) OR Git Worktrees

### Phase 5 Terminal Setup (Agent Teams, recommended)

```bash
# Add to Git Bash environment:
export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1
cd crowe-keystone
claude
# Paste Phase 5 kickoff prompt
```

### Phase 5 Terminal Setup (Git Worktrees, alternative)

```bash
# Terminal 1 — LangGraph nodes
git worktree add ../keystone-langgraph-p5 phase5-langgraph
cd ../keystone-langgraph-p5
claude  # works on backend/src/graph/ only

# Terminal 2 — Backend API wiring
git worktree add ../keystone-backend-p5 phase5-backend  
cd ../keystone-backend-p5
claude  # works on backend/src/routers/ and services/ only

# Terminal 3 — Tests
git worktree add ../keystone-tests-p5 phase5-tests
cd ../keystone-tests-p5
claude  # writes and runs tests against both

# Merge when all complete:
git worktree remove ../keystone-langgraph-p5
git worktree remove ../keystone-backend-p5
git merge phase5-langgraph phase5-backend
```

## Phase 5 Pre-Phase Requirements (MUST COMPLETE BEFORE SPAWNING ANY AGENT)

```
Before any Phase 5 agent writes a single line:

1. Run keystone-schema-validator on the full state.py file
   Confirm: KeystoneState is complete, all fields typed, no issues.

2. Confirm all Pydantic output schemas exist for each node:
   BriefContent, PRDContent, StressTestOutput, ConflictResult,
   ApprovalRouterOutput, UpdateWriterOutput, DailyBriefContent,
   RetroOutput, MemoryIndexOutput

3. Read ALL prompt files in backend/src/graph/prompts/
   If any are missing: spawn keystone-prompt-engineer to write them first.

4. Set up LangGraph Postgres checkpointer:
   DATABASE_URL_SYNC must be set in .env (synchronous URL for Alembic/checkpointer)
   Test: from langgraph.checkpoint.postgres import PostgresSaver
         cp = PostgresSaver.from_conn_string(os.environ['DATABASE_URL_SYNC'])
         # Should succeed without error

5. Create integration test harness:
   tests/test_graph_integration.py with fixtures for running single nodes
   and full graph runs against test database
```

## Phase 5 Agent Roster

```
TEAM LEAD (Agent Teams) OR ORCHESTRATOR (Subagents):
  Coordinates everything. Owns state.py modifications (any needed changes).
  Runs keystone-schema-validator after any state.py change.
  Accepts node implementations from teammates after keystone-graph-reviewer approves.

TEAMMATE A — Brief Generator + Classifier (keystone-langgraph)
Domain: nodes/classifier.py, nodes/brief_generator.py, prompts/brief_generator.md
Tasks:
  classifier.py: determines input type, checks for existing brief,
    returns route decision (needs_brief | has_brief | low_confidence)
  brief_generator.py: full implementation per Part 4 spec
    Loads brief_generator.md prompt
    Calls gpt-5.4 for all generation (single model throughout)
    Sets human_checkpoint_needed=True if confidence < 0.6
  Unit tests for both nodes (3 sample inputs each)

TEAMMATE B — PRD Drafter (keystone-langgraph)
Domain: nodes/prd_drafter.py + section drafters, prompts/prd_drafter.md
Tasks:
  Implement all 5 section drafter nodes (section_problem, section_stories,
    section_requirements, section_stack, section_components)
  Each uses gpt-5.4
  section_merger.py: assembles sections, runs deduplication
  spawn_parallel_sections function: uses Send API to dispatch all 5 in parallel
  Unit tests per section drafter

TEAMMATE C — Stress Tester + Assumption Excavator (keystone-langgraph)
Domain: nodes/stress_tester.py, nodes/assumption_excavator.py,
        nodes/red_team.py, prompts/stress_tester.md, prompts/assumption_excavator.md
Tasks:
  stress_tester.py: spawner that creates 3 hypothesis test branches
  test_hypothesis.py: tests a single hypothesis, returns HypothesisResult
  red_team.py: adversarially challenges the top hypothesis
  assumption_excavator.py: runs in parallel with stress_tester
  Both run in parallel via Send API from section_merger
  Unit tests with known-weak and known-strong PRDs

TEAMMATE D — Conflict Detector (keystone-langgraph)
Domain: nodes/conflict_detector.py, prompts/conflict_detector.md,
        background/conflict_scanner.py
Tasks:
  conflict_detector_node: embedding-based similarity, pairwise check
    Uses sentence-transformers for embedding (all-MiniLM-L6-v2)
    Cosine similarity threshold from CONFLICT_THRESHOLD env var
    For pairs above threshold: calls conflict classification LLM
  conflict classification: uses conflict_detector.md prompt
  background/conflict_scanner.py: called as FastAPI background task
  Unit tests: 2 clearly conflicting projects, 2 clearly non-conflicting

TEAMMATE E — Approval Router + Update Writer + Daily Brief (keystone-langgraph)
Domain: nodes/approval_router.py, nodes/update_writer.py,
        nodes/daily_brief_generator.py, nodes/daily_data_gatherer.py,
        corresponding prompts/
Tasks:
  approval_router.py: determines chain, generates ≤120 word summary
  update_writer.py: converts raw notes to structured UpdateEntry
  daily_brief_generator.py: generates DailyBriefContent from data
  daily_data_gatherer.py: queries DB for all brief sections data
  Unit tests per node

TEAMMATE F — Memory Indexer + Retro Generator + Graph Assembly (keystone-langgraph)
Domain: nodes/memory_indexer.py, nodes/retro_generator.py,
        nodes/open_question_extractor.py, nodes/prompt_writer.py,
        nodes/quality_gate.py, nodes/human_checkpoint.py,
        keystone_graph.py (the final assembly)
Tasks:
  All remaining nodes
  keystone_graph.py: assembles all 4 full graphs
    (prd_architect, conflict_detector, daily_brief, approval_routing)
  quality_gate.py: scores PRD quality 0-1, routes revise/pass/fail
  human_checkpoint.py: pauses execution, sets awaiting_human status
  Integration test: full prd_architect graph end-to-end

BACKEND WIRING AGENT (keystone-backend-api)
Runs in parallel with graph implementation teammates.
Domain: backend/src/routers/agents.py, backend/src/services/
Tasks:
  POST /agents/run: creates agent_run record, spawns async LangGraph task
  GET /agents/run/{id}: returns current status, partial output if running
  POST /agents/run/{id}/respond: handles human checkpoint responses
  agent.node_entered SSE broadcast: FastAPI background task reads graph
    events via astream() and broadcasts to SSE queue
  LangGraph graph invocation with PostgresSaver checkpointer
  apscheduler setup for daily_brief_scheduler.py

TEST AGENT (after ALL teammates AND backend wiring complete):
  Full integration tests:
    Trigger brief_generator via /agents/run → verify BriefContent output
    Trigger prd_drafter → verify PRDContent output (all sections populated)
    Trigger stress_tester → verify 3 hypotheses in parallel output
    Trigger conflict_detector → manufactured conflict detected
    Trigger approval_router → ≤120 word summary generated
    Trigger update_writer → structured update output correct
    Human checkpoint: run pauses, state saved, resume after /respond
    Daily brief: all 4 required sections populated
    agent_runs table has complete records with tokens_used
```

## Phase 5 Node Quality Gate (run for EACH node before accepting)

```
For every node implementation:
[ ] Unit test with 3 sample inputs
[ ] Returns dict with only valid KeystoneState field names (schema-validator)
[ ] Catches all exceptions (try/except present)
[ ] Respects loop_count guard
[ ] Prompt loaded from file (grep for inline strings)
[ ] Output parsed with Pydantic (grep for regex)
[ ] keystone-graph-reviewer approves the node
```

## Phase 5 Deliverables Checklist

- [ ] `POST /api/v1/agents/run` with `{agent_type: 'brief_generator', raw_input: '...'}` returns `{run_id}`
- [ ] GET /agents/run/{id} returns status 'running' then 'complete'
- [ ] Brief generator output: valid BriefContent JSON with all required fields
- [ ] PRD drafter: all 5 sections populated in output
- [ ] Stress tester: exactly 3 hypotheses in output, ran in parallel (verify via node timing logs)
- [ ] Assumption excavator: 3 assumptions with fragility_score values
- [ ] Conflict detector: `run_conflict_scan(team_id)` identifies manufactured conflict in test data
- [ ] Approval router: summary ≤ 120 words, approval_chain populated
- [ ] Update writer: valid UpdateEntry output from sample git commits
- [ ] Daily brief generator: active_work, waiting_on_you, team_activity, upcoming sections populated
- [ ] Human checkpoint: agent pauses, status becomes 'awaiting_human', SSE fires `agent.checkpoint`
- [ ] Resume via /agents/run/{id}/respond: agent resumes from checkpoint, reaches completion
- [ ] agent_runs table has complete records with tokens_used, duration_ms
- [ ] All nodes pass keystone-graph-reviewer review (BLOCKING issues = 0)
- [ ] Integration test: full prd_architect graph runs start to finish with sample spark
- [ ] apscheduler daily brief job created (not necessarily fired, just created)
- [ ] All Phase 5 pytest tests pass

## Phase 5 Kickoff Prompt

```
Read PRD/PRD-Part6-Phases.md Phase 5 section completely.
Read PRD/PRD-Part4-MobileLayout-LangGraph.md Section 9 completely.
Read backend/CLAUDE.md.

BEFORE SPAWNING ANY AGENT:
1. Run keystone-schema-validator on backend/src/state.py. Verify zero BLOCKING issues.
2. Verify all Pydantic output schemas exist (list them if any are missing).
3. Verify all prompt .md files exist in backend/src/graph/prompts/.
4. Test PostgresSaver connection: python3 -c "from langgraph.checkpoint.postgres import PostgresSaver; print('OK')"

ONLY AFTER ALL FOUR PASS:
Enable CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1
Spawn the Phase 5 team as specified above.
Team Lead coordinates state.py changes and ensures no schema conflicts between teammates.
Each teammate must get keystone-graph-reviewer approval before Team Lead accepts node.

Spawn Backend Wiring Agent (keystone-backend-api) in parallel with graph teammates.

After all teammates AND backend wiring complete:
Spawn keystone-test-writer for Phase 5 tests.
Run Phase 5 deliverables checklist. All items PASS before Phase 6 starts.
```

---

*Continue reading: PRD-Part7-Phases6to8-Deployment.md (Phases 6–8, deployment, out-of-scope)*
