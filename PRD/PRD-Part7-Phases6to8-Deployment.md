# Crowe Keystone — PRD Part 7 of 7
## Phases 6–8, Deployment, Environment Variables, Out of Scope
### Version 2.0 | March 2026

---

# ═══════════════════════════════════════════
# PHASE 6 — AGENT INTEGRATION WITH FRONTEND
# ═══════════════════════════════════════════

**Goal:** Full end-to-end AI experience. Stage Actions trigger real agents.
AgentPanel shows live progress. PRD draft appears after agent completes.
StressTestPanel renders real hypothesis data. Push notifications fire for
checkpoints. The demo moment works start to finish without manual steps.

**Duration:** 1.5 weeks
**Terminal:** 1 terminal (Agent Teams if Phase 5 used them, else Subagents)
**Approach:** Agent Teams recommended

## Phase 6 The Demo Moment (Required to Pass)

This exact sequence must work with zero manual intervention when Phase 6 is done:

```
1. User creates Spark: "Build a tool that auto-tests LangGraph pipelines"
2. User clicks "Generate Brief" in Stage Actions right panel
3. AgentPanel slides in from right side of project detail
4. Three amber dots pulse. "Brief Generator · Classifying..."
5. Node list builds: [✓] context_loader  [✓] classifier  [→] brief_generator
6. Brief content appears in PRD tab (SWR revalidates after agent.completed SSE)
7. AgentPanel: teal checkmark "Complete · 847 tokens"  → auto-collapses after 3s
8. Project Intelligence fires in background (silent, no UI interruption)
9. "⚠ Conflict detected" — ConflictEdge appears on /graph for this project
10. Push notification fires: "⚠ Conflict detected" buzzes the phone
11. User on phone: taps notification → graph view → ConflictEdge pulsing coral
```

## Phase 6 Agent Roster

```
STEP 1 — SCHEMA VALIDATION (not a schema change phase)
  keystone-schema-validator: verify state.py + all node outputs still consistent
  after Phase 5 changes. Zero BLOCKING issues required to proceed.

STEP 2 — PARALLEL AGENTS

  Agent A — Web Frontend (keystone-web-frontend)
  Domain: src/components/agents/, src/components/prd/ (StressTestPanel),
          Stage Actions wiring throughout project detail
  New:
    AgentPanel.tsx — complete implementation per PRD Part 3 spec
      Slides in from right (x: 20 → 0, opacity 0 → 1, 300ms)
      Disappears when no active agent for this project
      Header: agent emoji + name + status text in amber
      Thinking: AgentThinking.tsx component (three dots, agentDotVariants, 0/150/300ms)
      Node progress list: populates as agent.node_entered fires
        [✓] completed node — text-secondary, Geist Mono 12px
        [→] current node — amber color, Geist Mono 12px
        [○] pending nodes — text-tertiary, Geist Mono 12px
        Each new node: mobileListItemVariants fade-up entrance
      Checkpoint UI (conditional on agent.store.hasCheckpoint):
        Amber rounded box with question text
        44px text input + [Submit] amber button
        POST /agents/run/{id}/respond on submit
      Completion state:
        Teal ✓ + "Complete · {tokens_used} tokens"
        accordionVariants collapse after 3 seconds
        Expandable "View output" section persists
    AgentThinking.tsx — standalone three-dot component
    AgentOutput.tsx — renders agent output object as formatted sections
    useAgentStream.ts — subscribes to agent.* SSE events for specific project_id
      Reads from agent.store.activeRunForProject(project_id)
    Stage Actions — wire all 6 buttons to real API calls:
      "Generate Brief"     → POST /agents/run {agent_type: 'brief_generator', project_id}
      "Draft Full PRD"     → POST /agents/run {agent_type: 'prd_drafter', project_id}
      "Run Stress Test"    → POST /agents/run {agent_type: 'stress_tester', project_id}
      "Send for Review"    → POST /projects/{id}/advance {target_stage: 'review'}
      "Log Update"         → bottom sheet textarea → POST /projects/{id}/build-log
      "Start Build"        → POST /projects/{id}/advance → GET /projects/{id}/kickoff-prompt
                             → modal showing Claude Code prompt + copy button
    StressTestPanel.tsx — REAL implementation (replaces Phase 3 stub):
      Three hypothesis cards in responsive grid (3 cols desktop, 1 col mobile)
      Each card: hypothesis statement + confidence bar (progressFillVariants on reveal)
        Supporting evidence: teal bullet list
        Contradicting evidence: coral bullet list
        confidence_score: 0-100% bar, amber fill
      killed_by_red_team: coral badge "Killed by red team"
      Adversarial findings section: coral-glow bg, coral left border
      Assumption audit: sorted by fragility_score desc, orange cards
        fragility_score bar: orange fill, 0 = "Bedrock" label, 1 = "House of cards"
      Overall stress_test_confidence: large number top-right, amber
    Build log tab in project detail: shows build_log entries from project
      Each entry: timestamp (Geist Mono) + build_health badge + content
      Structured entries rendered nicely (completed[], next, new_questions[])

  Agent B — Mobile Frontend (keystone-mobile-frontend)
  New:
    Mobile AgentStatus bar in MobileProjectDetail:
      Conditional amber bar below quick actions
      "⚡ {agent_name} · {status_text}" + three dots
      Auto-removes 3 seconds after completion
    Mobile checkpoint handling:
      When agent.checkpoint SSE fires: add to inbox CHECKPOINTS section
      Checkpoint card in mobile inbox: question text + text input + submit
    Mobile "Log Update" sheet: bottom sheet, min-h 200px textarea
    Mobile StressTestPanel: single column card list (same data, stacked layout)
    Mobile build log: compact entries in build tab

  Agent C — SSE Specialist (keystone-sse-specialist)
  New:
    agent.store.ts — full final implementation:
      interface AgentRun: run_id, agent_type, project_id, status, current_node,
        nodes_completed[], checkpoint_question?, output_summary?, tokens_used?
      addRun(run): adds to runs map
      updateRunNode(run_id, node_name): updates current_node, appends to nodes_completed
      setCheckpoint(run_id, question): sets checkpoint_question, status='awaiting_human'
      completeRun(run_id, summary, tokens): status='complete', sets output
      failRun(run_id, error): status='failed'
      activeRunForProject(project_id): computed, returns run or undefined
      clearRun(run_id): removes after 10 seconds post-completion
    useSSE.ts — agent event routing:
      agent.started     → agent.store.addRun
      agent.node_entered → agent.store.updateRunNode
      agent.checkpoint  → agent.store.setCheckpoint + notifications.store.add
      agent.completed   → agent.store.completeRun + SWR cache invalidation for prd
      agent.failed      → agent.store.failRun + notifications.store.addError
    Conflict scanner auto-trigger:
      After project.created SSE: trigger GET /api/v1/conflicts (re-fetches)
      After project.stage_changed SSE: same refresh
      conflict.detected SSE already routes to graph.store.addConflictEdge (Phase 4)

  Agent D — PWA Agent (keystone-pwa-specialist)
  New:
    Wire agent.checkpoint → push notification:
      Verify: when agent pauses, notify_agent_checkpoint fires in backend
      Verify: push notification arrives on test device within 2 seconds
    Verify all 4 push scenarios work end-to-end:
      1. Approval requested    → notify_approval_requested → phone buzz
      2. Conflict (blocking)   → notify_conflict_detected → phone buzz
      3. Agent checkpoint      → notify_agent_checkpoint → phone buzz
      4. Daily brief ready     → push with "Your daily brief is ready"
    Run full Lighthouse audit: PWA ≥ 90, Performance ≥ 85, Accessibility ≥ 90

  Agent E — Backend (keystone-backend-api)
  New:
    Wire stage advance to approval_router agent:
      After approval record created: trigger approval_router agent in background
      ApprovalRouterOutput updates approval.request_summary in DB
      SSE broadcast: approval.requested with the AI-generated summary
    Wire build log to update_writer agent:
      POST /projects/{id}/build-log receives raw_notes
      Triggers update_writer agent
      Structured output appended to project.build_log JSONB array
      SSE broadcast: project.build_log_updated
    GET /projects/{id}/kickoff-prompt:
      Returns { prompt: string } from current approved PRD claude_code_prompt field
    Conflict scanner auto-run:
      FastAPI background task: after any project state change, run conflict_scanner.py
      Not triggered by user — runs automatically
    Daily brief endpoint: GET /daily returns today's brief or triggers generation if missing

STEP 3 — TEST AGENT (full end-to-end scenarios)
  Scenario 1: Spark → Generate Brief → agent completes → brief in PRD tab
  Scenario 2: Brief → Draft PRD → all PRD sections populated
  Scenario 3: Draft PRD → Run Stress Test → StressTestPanel renders real data
  Scenario 4: Any stage advance → approval_router generates ≤120 word summary
  Scenario 5: Two projects with overlapping stack → conflict detected → ConflictEdge
  Scenario 6: Agent checkpoint → pauses → checkpoint in inbox → answer → resumes
  Scenario 7: Log Update → raw notes → update_writer → structured build log entry
  All 4 push notification types fire (verify via backend logs)
```

## Phase 6 Deliverables Checklist

- [ ] "Generate Brief" button triggers PRD Architect agent via POST /agents/run
- [ ] AgentPanel slides in immediately when agent starts (agent.started SSE)
- [ ] Three amber dots pulse in AgentPanel during execution
- [ ] Node list populates with correct names as agent.node_entered fires
- [ ] Brief content appears in PRD tab after agent.completed (no page refresh)
- [ ] "Draft Full PRD" → all 10 PRD sections populated after completion
- [ ] "Run Stress Test" → StressTestPanel renders 3 real hypothesis cards
- [ ] Hypothesis confidence bars animate on reveal (progressFillVariants)
- [ ] Assumption audit cards sorted by fragility_score descending
- [ ] AgentPanel shows "Complete · {tokens} tokens" after completion
- [ ] AgentPanel auto-collapses 3 seconds after completion
- [ ] Human checkpoint: AgentPanel shows question + text input
- [ ] Submitting checkpoint answer: agent resumes (verify via SSE node_entered)
- [ ] Conflict scanner: two projects with same stack auto-detected, ConflictEdge appears
- [ ] "Log Update" sheet: raw notes → structured entry in Build tab
- [ ] "Start Build": kickoff prompt appears in modal, copy button works
- [ ] Mobile: amber AgentStatus bar appears and disappears correctly
- [ ] Mobile: checkpoint appears in Inbox CHECKPOINTS section
- [ ] Daily brief: GET /daily returns full DailyBriefContent for test user
- [ ] Push: approval requested → notification within 2s (verify backend logs)
- [ ] Push: conflict detected → notification within 2s (verify backend logs)
- [ ] Push: agent checkpoint → notification within 2s (verify backend logs)
- [ ] Lighthouse Performance ≥ 85, PWA ≥ 90, Accessibility ≥ 90
- [ ] All Phase 6 Vitest and pytest tests pass

## Phase 6 Kickoff Prompt

```
Read PRD/PRD-Part7-Phases6to8-Deployment.md Phase 6 section.
Phase 5 is complete. All Phase 5 checklist items passed.

STEP 1: keystone-schema-validator — verify state.py zero BLOCKING issues.

STEP 2: Enable CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1
Spawn agents A through E simultaneously. Key coordination:
  Agent C (SSE) must define agent.store interface before Agent A (Web) writes useAgentStream.
  Share the interface definition before parallel work begins.
  Agent E (Backend) kickoff-prompt endpoint needed by Agent A for Start Build button.
  Coordinate: Agent E implements GET /kickoff-prompt first (simple endpoint), 
  Agent A can stub until it's ready.

STEP 3: Test Agent after all complete — verify "The Demo Moment" sequence works.

STEP 4: Full Phase 6 checklist. ALL items PASS before Phase 7 starts.
```

---

# ═══════════════════════════════════════════
# PHASE 7 — INTEGRATIONS + MEMORY + SETTINGS
# ═══════════════════════════════════════════

**Goal:** GitHub webhook populates build logs automatically. Memory browser
is fully searchable. Retrospective generation works end-to-end and feeds
institutional memory. Team management and approval chain settings pages complete.

**Duration:** 1 week
**Terminal:** 1 terminal window
**Approach:** Subagents

## Phase 7 Agent Roster

```
STEP 1 — SCHEMA AGENT (BLOCKING)
  New tables: decisions, retrospectives
  Migration: 004_phase7_decisions_retrospectives.py
  Alembic round-trip verified.

STEP 2 — PARALLEL AGENTS

  Agent 2A — Backend API Agent
  New:
    GitHub webhook: POST /api/webhooks/github
      Validates GitHub signature (X-Hub-Signature-256 header)
      Parses push event: extracts commit messages + repo URL
      Matches repo to project via metadata.github_repo field
      Triggers update_writer agent: raw_build_notes from commits
      Error handling: unknown repo → 200 OK (do nothing, don't break GitHub)
    Memory endpoints:
      GET /memory?query=&type=&tag=&limit=20&offset=0
        Full-text search: Postgres ILIKE on decisions.title, decisions.rationale,
          retrospectives.learnings, retrospectives.what_would_change
        Filter by type: decisions | retrospectives | conflicts | patterns
        Filter by tag: decisions.tags JSONB contains filter
      GET /memory/{id} → full MemoryEntryDetail
    Retrospective endpoints:
      POST /projects/{id}/retrospective → triggers retro_generator agent
      GET /projects/{id}/retrospective → returns current retrospective
      POST /projects/{id}/retrospective/publish → publishes retro +
        triggers memory_indexer agent + marks retrospective.published=true
    Decision endpoints:
      GET /decisions?tag=&type= → paginated decision list
      POST /decisions → manual architectural decision creation
      GET /decisions/{id} → full decision with rationale
    Team management:
      GET /team → TeamDetail with members[], roles
      POST /team/invite → sends invite email (or invite link for now)
      PATCH /team/members/{user_id} → update role
      DELETE /team/members/{user_id} → remove (soft, archive projects first)
    Approval chain config:
      GET /team/approval-chains → current chain configuration
      PUT /team/approval-chains → update chain configuration
    GitHub connection:
      PATCH /projects/{id} accepts metadata.github_repo field

  Agent 2B — Web Frontend Agent
  New:
    /memory page — full memory browser:
      Search bar: 400px, surface-input, real-time search (debounced 300ms)
      Left filter sidebar (200px): type filter + tag filter (dynamic from API)
      Results list: animated with listItemVariants
      DecisionRecord.tsx: full card with rationale, alternatives, tags
      Retrospective summary card: built vs scoped table, learnings list
      Empty state: "No memory entries yet. Ship a project to get started."
    /projects/[id]/retro page:
      RetroView.tsx: all retro sections rendered (built_vs_scoped table, 
        decisions_changed list, learnings bullets, what_would_change bullets)
      "Publish Retrospective" amber button
      Published state: teal badge "Published to institutional memory"
    Settings pages (stubs in Phase 1, now real):
      /settings/team: member list with roles, invite by email form
      /settings/approval-chains: table of stage → required approvals config
      /settings/notifications: push notification management (already built Phase 2)
    GitHub connection UI:
      In project detail ⋯ menu: "Connect GitHub repo"
        Opens small modal: input for repo URL (github.com/org/repo format)
        Saves to project.metadata.github_repo
    Daily brief web version:
      DailyBrief.tsx: prose-style layout (wider than mobile, sectioned)
      Same data as mobile, different rendering (multi-column for active work)

  Agent 2C — Mobile Frontend Agent
  New:
    /memory mobile: search bar + scrollable list (no sidebar, type filter is tabs)
    /settings mobile: single-column settings menu
    GitHub connection mobile: same modal, 44px touch targets

  Agent 2D — PWA Agent
  New:
    Update sw.js SHELL_ASSETS: add /memory and /settings
    Run full Lighthouse audit after all Phase 7 changes
    Verify: PWA ≥ 90 still

STEP 3 — TEST AGENT
  GitHub webhook: sample push payload → build log entry in project
  Memory search: "postgres" returns decision about database choice
  Retrospective: triggers retro_generator → generates all sections
  Retro publish: triggers memory_indexer → decision records created
  Team invite: POST /team/invite creates pending invite
  Approval chain config: PUT /team/approval-chains saves and returns updated config
```

## Phase 7 Deliverables Checklist

- [ ] GitHub webhook: POST /webhooks/github with sample payload creates build log entry
- [ ] GitHub webhook: unknown repo returns 200 without error
- [ ] GET /memory with query returns relevant results
- [ ] Memory browser: type filter shows correct subset
- [ ] Memory browser: tag filter narrows results
- [ ] POST /projects/{id}/retrospective triggers retro_generator agent
- [ ] Retro view: all 4 sections rendered (built_vs_scoped, decisions_changed, learnings, change)
- [ ] Publish retro: triggers memory_indexer, decision records appear in /memory
- [ ] GET /team returns team members with roles
- [ ] POST /team/invite creates invite (link or email)
- [ ] Approval chain config: save and reload returns correct configuration
- [ ] GitHub repo URL saved to project metadata, shows in UI
- [ ] Web daily brief: /daily renders in DailyBrief.tsx (prose layout)
- [ ] Mobile /memory: search works, results scroll correctly
- [ ] Lighthouse PWA ≥ 90 still passing after all changes
- [ ] All Phase 7 Vitest and pytest tests pass

---

# ═══════════════════════════════════════════
# PHASE 8 — POLISH, PERFORMANCE, PRODUCTION
# ═══════════════════════════════════════════

**Goal:** Production-grade quality. Lighthouse ≥ 90 on all metrics.
Full mobile testing. Zero console errors. Complete error states.
Accessibility audit. Security audit. Deploy to Vercel and Railway.

**Duration:** 1 week
**Terminal:** 1 terminal window
**Approach:** Subagents

## Performance Targets

| Metric | Target |
|--------|--------|
| Lighthouse Performance | ≥ 90 desktop, ≥ 85 mobile |
| Lighthouse Accessibility | ≥ 90 |
| Lighthouse PWA | ≥ 90 |
| LCP (Largest Contentful Paint) | < 2.5s desktop, < 3.5s mobile |
| TTI (Time to Interactive) | < 3.5s desktop |
| Bundle size (initial load) | < 250KB gzipped |
| React Flow with 20+ nodes | No visible frame drop |

## Phase 8 Agent Roster

```
STEP 1 — SECURITY AUDIT (keystone-security-auditor)
  Runs before any polish work begins.
  Full security checklist from .claude/agents/keystone-security-auditor.md
  All CRITICAL issues fixed before proceeding to parallel agents.
  All HIGH issues fixed or explicitly deferred with written rationale.

STEP 2 — PARALLEL AGENTS

  Agent 2A — Web Frontend (Performance + Accessibility)
  Tasks:
    Lazy load React Flow with dynamic import + loading skeleton:
      const KeystoneGraph = dynamic(() => import('./KeystoneGraph'), { ssr: false })
    Virtualize project list when > 20 items (react-window FixedSizeList)
    Code split: separate chunk for PRD editor (dynamic import)
    Image optimization: all avatars via next/image with correct sizes
    SWR for non-real-time data (projects list, project detail, memory):
      refreshInterval: 0 (SSE handles live updates)
      revalidateOnFocus: false
    prefers-reduced-motion: wrap all animation variants:
      const shouldReduce = useReducedMotion()
      Apply instant alternatives everywhere shouldReduce === true
    Accessibility audit and fixes:
      All icon buttons: aria-label attributes
      All form inputs: associated labels
      Focus indicators visible (amber outline, 2px, offset 2px)
      Color contrast: verify all text ≥ 4.5:1 against backgrounds
      Keyboard navigation: Tab through all interactive elements in order
      ARIA roles on React Flow nodes (role="button" with aria-label)
      Screen reader test: VoiceOver/NVDA through main user flows
    Error states (every async operation needs all three):
      Loading state: skeleton with correct dimensions
      Error state: error message + retry button
      Empty state: helpful illustration + CTA
      Implement for: project list, PRD view, memory browser, daily brief, graph

  Agent 2B — Mobile Frontend (Testing + Fixes)
  Tasks:
    Test all mobile screens at these exact viewports:
      375px (iPhone SE), 390px (iPhone 14), 430px (iPhone 14 Pro Max)
      412px (Android standard), 360px (Android compact)
    Fix any horizontal overflow at any viewport
    Fix any touch target < 44px
    Test all swipe gestures in Chrome DevTools touch mode
    Verify safe area insets apply correctly at all viewport sizes
    Sidebar collapsible: implement hamburger menu on < 768px
      (sidebar was intentionally not collapsible Phase 1-7, now implement)
    Collapsible sidebar: hamburger in TopBar → bottom sheet navigation menu
    Verify PhoneFrame preview matches actual mobile layout exactly

  Agent 2C — PWA Agent (Final Audit)
  Tasks:
    Run full Lighthouse in Chrome DevTools (not CI — use actual browser)
    If PWA < 90: fix the specific failing criteria
    Common fixes:
      maskable icons: verify keystone-192.png has maskable purpose
      theme-color: verify meta tag correct in layout.tsx
      offline fallback: verify sw.js returns cached shell for offline
    Test actual install on real iPhone (Safari) — if possible, or BrowserStack
    Test actual install on real Android (Chrome) — or BrowserStack
    Verify: installed app is truly full-screen (no browser bar)
    Verify: push notification arrives on locked screen (not just notification center)

  Agent 2D — Backend (Optimization + Error Handling)
  Tasks:
    Add rate limiting on agent trigger endpoints (max 10/minute per user)
    Add proper error responses for all edge cases (missing project, wrong team, etc.)
    Verify all indexes in PRD Section 4 are created in migrations
    Add request logging middleware (log method, path, status, duration)
    Health check endpoint: GET /health returns DB connection status + version
    Ensure single worker deployment: verify Dockerfile CMD uses --workers 1

STEP 3 — DEPLOYMENT (after all polish complete and checklist passes)

  Deploy frontend (Vercel):
    vercel link --project crowe-keystone
    Set all environment variables in Vercel dashboard
    vercel deploy --prod
    Verify: https://crowe-keystone.vercel.app loads

  Deploy backend (Railway):
    railway init
    railway add (add Postgres)
    Set all environment variables in Railway dashboard
    railway up
    Verify: https://crowe-keystone-api.railway.app/health returns 200

  Post-deploy verification:
    Login works on production URL
    Create project → advance stage → approval in inbox
    Push notification fires on real device
    PWA installs from production URL in Safari

STEP 4 — TEST AGENT (final full regression)
  Run complete test suite against production URLs (smoke tests)
  Verify: no console errors on any page
  Verify: no 500 errors in Railway logs
  Verify: Lighthouse scores on production URL (not localhost)
```

## Phase 8 Deliverables Checklist

- [ ] Lighthouse Performance ≥ 90 (desktop), ≥ 85 (mobile)
- [ ] Lighthouse Accessibility ≥ 90
- [ ] Lighthouse PWA ≥ 90
- [ ] LCP < 2.5s on desktop (Lighthouse lab data)
- [ ] Initial JS bundle < 250KB gzipped (Next.js bundle analyzer)
- [ ] React Flow with 20+ nodes: no visible frame drop (60fps in Performance tab)
- [ ] Zero TypeScript errors: `npm run typecheck` clean
- [ ] Zero ESLint errors: `npm run lint` clean
- [ ] Zero console errors on any page (all browsers: Chrome, Safari, Firefox)
- [ ] All icon-only buttons have aria-label
- [ ] All form inputs have associated labels
- [ ] Keyboard navigation: Tab traversal works on all interactive elements
- [ ] Color contrast: all text ≥ 4.5:1 (WCAG AA)
- [ ] prefers-reduced-motion: all animations have instant fallback
- [ ] 375px viewport: zero horizontal overflow on all pages
- [ ] 430px viewport: zero horizontal overflow on all pages
- [ ] All interactive elements on mobile: ≥ 44×44px touch target
- [ ] Sidebar hamburger menu works on mobile viewports
- [ ] Loading state: skeleton for project list, PRD, memory, graph
- [ ] Error state: retry button for all async operations
- [ ] Empty state: meaningful CTAs on all empty states
- [ ] Rate limiting on /agents/run: 10/minute per user
- [ ] GET /health returns DB status + version
- [ ] Vercel deployment: login works at production URL
- [ ] Railway deployment: /health returns 200
- [ ] Push notification fires on real device at production URL
- [ ] PWA installs from production URL in Safari on iPhone
- [ ] All Vitest and pytest pass against production

---

# SECTION 12 — DEPLOYMENT CONFIGURATION

## 12.1 Environment Variables — Complete Reference

### Frontend (.env.local / Vercel Dashboard)

```
NEXTAUTH_URL=https://crowe-keystone.vercel.app
NEXTAUTH_SECRET=<generate: openssl rand -base64 32>
BACKEND_URL=https://crowe-keystone-api.railway.app
NEXT_PUBLIC_APP_NAME=Crowe Keystone
NEXT_PUBLIC_BACKEND_URL=https://crowe-keystone-api.railway.app
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<from npx web-push generate-vapid-keys>
```

### Backend (.env / Railway Dashboard)

```
DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/keystone
DATABASE_URL_SYNC=postgresql://user:pass@host:5432/keystone
ANTHROPIC_API_KEY=sk-ant-...
VAPID_PUBLIC_KEY=<from npx web-push generate-vapid-keys>
VAPID_PRIVATE_KEY=<from npx web-push generate-vapid-keys>
VAPID_CONTACT=admin@crowe-keystone.app
SECRET_KEY=<generate: openssl rand -base64 32>
FRONTEND_URL=https://crowe-keystone.vercel.app
ALLOWED_ORIGINS=https://crowe-keystone.vercel.app,http://localhost:3000
ENVIRONMENT=production
LOG_LEVEL=INFO
CONFLICT_THRESHOLD=0.75
GITHUB_WEBHOOK_SECRET=<generate: openssl rand -hex 20>
```

### Generate VAPID keys (run once, save both):
```bash
npx web-push generate-vapid-keys
# Output:
# Public Key: BG7...
# Private Key: 2K...
#
# NEXT_PUBLIC_VAPID_PUBLIC_KEY = Public Key
# VAPID_PUBLIC_KEY = Public Key
# VAPID_PRIVATE_KEY = Private Key
```

## 12.2 Vercel Deployment

```bash
# From crowe-keystone/frontend/ directory
# On Crowe network (SSL inspection proxy):

NODE_TLS_REJECT_UNAUTHORIZED=0 npx vercel link --yes --project crowe-keystone
NODE_TLS_REJECT_UNAUTHORIZED=0 npx vercel env pull .env.local --yes
# Set all env vars in Vercel dashboard before deploying

NODE_TLS_REJECT_UNAUTHORIZED=0 npx vercel deploy --prod --yes
```

**vercel.json:**
```json
{
  "version": 2,
  "framework": "nextjs",
  "regions": ["iad1"],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Frame-Options", "value": "SAMEORIGIN" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" }
      ]
    },
    {
      "source": "/sw.js",
      "headers": [
        { "key": "Cache-Control", "value": "no-cache" },
        { "key": "Service-Worker-Allowed", "value": "/" }
      ]
    }
  ]
}
```

Note: The service worker file (`/sw.js`) MUST have `Cache-Control: no-cache`
so browsers always fetch the latest version. Without this, users get stale
service workers that don't process new push notification formats.

## 12.3 Railway Deployment

```bash
# From crowe-keystone/backend/ directory
railway login
railway init  # creates new project
railway add   # add Postgres plugin
railway variables set ANTHROPIC_API_KEY=sk-ant-...
# Set all other env vars via Railway dashboard

railway up    # deploys using Dockerfile
```

**Dockerfile:**
```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Run Alembic migrations then start server
CMD alembic upgrade head && \
    uvicorn src.main:app \
    --host 0.0.0.0 \
    --port ${PORT:-8000} \
    --workers 1 \
    --log-level info
```

**Critical: `--workers 1` is mandatory.** The in-memory SSE queue (`_team_queues`)
is not shared across workers. Multiple workers = SSE events routing to wrong worker
= clients missing events. If you need to scale beyond one worker in Phase 9,
replace `_team_queues` with Redis pub/sub before adding workers.

## 12.4 GitHub Repo Setup

```bash
# From crowe-keystone/ root directory
# On Crowe network (SSL proxy):

git config --global http.sslVerify false  # temporary for corporate network
gh repo create achyuthrachur/crowe-keystone --public --source=. --remote=origin --push
git config --global http.sslVerify true   # re-enable

# Connect GitHub Actions for CI (Phase 9):
# .github/workflows/ci.yml: run tests on every PR
```

## 12.5 Local Development Setup

```bash
# Prerequisites: Node 20+, Python 3.11, Docker Desktop

# 1. Start Postgres
docker-compose up -d

# 2. Backend setup
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env       # fill in values
alembic upgrade head
uvicorn src.main:app --reload --port 8001

# 3. Frontend setup (new terminal)
cd frontend
npm install
cp .env.local.example .env.local  # fill in values (BACKEND_URL=http://localhost:8001)
npm run dev                        # starts at http://localhost:3000

# 4. Test PWA on mobile (local)
# Use ngrok to expose localhost to your phone:
ngrok http 3000
# Open ngrok URL in Safari on iPhone
# Service worker and PWA work on HTTPS only (ngrok provides this)
```

**docker-compose.yml:**
```yaml
version: '3.8'
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: keystone_dev
      POSTGRES_USER: keystone
      POSTGRES_PASSWORD: keystone_local
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
  pgadmin:
    image: dpage/pgadmin4
    environment:
      PGADMIN_DEFAULT_EMAIL: admin@local.com
      PGADMIN_DEFAULT_PASSWORD: admin
    ports:
      - "5050:80"
    depends_on:
      - postgres

volumes:
  postgres_data:
```

---

# SECTION 13 — OUT OF SCOPE (Phases 1–8)

The following are explicitly excluded. They are Phase 9+ roadmap items.

| Item | Reason |
|------|--------|
| Billing / subscription | Internal tool, no billing needed |
| File attachments in PRDs | PRDs are structured data, not documents |
| Video/audio recording | Not a meeting tool |
| Capacitor native app (iOS/Android) | PWA covers the use case; Phase 9 if needed |
| APNS/FCM push (native) | Web Push covers the use case |
| Offline mode | Requires internet connection |
| Multi-tenancy (multiple orgs) | Single team per deployment, Phase 9 |
| AI model selection UI | claude-sonnet-4-5 everywhere, hardcoded |
| Fine-tuning | Not applicable |
| Time tracking | Not a time management tool |
| External client access | Internal team only |
| Gantt chart / timeline view | Stage graph is the timeline |
| Direct Slack/Teams message posting | Phase 9 integration |
| Custom approval chain UI builder | Config via settings page is sufficient |
| Azure AD / Microsoft SSO | Phase 9 for Crowe corporate deployment |
| CI/CD pipeline (GitHub Actions) | Phase 9 |
| Redis pub/sub (SSE scaling) | Single worker is fine for team size |
| pgvector semantic search | ILIKE search sufficient in Phase 7 |
| Multi-language support | English only |
| Dark/light mode toggle | Dark mode only — this is a developer tool |

---

# SECTION 14 — MASTER INDEX

| File | Contents |
|------|----------|
| PRD-Part1-Identity-Design.md | Terminal guide, project identity, design system, typography, color, animations |
| PRD-Part2-Repository-Database-API.md | Full repo structure, complete database schema, all API endpoints, SSE events |
| PRD-Part3-PWA-WebLayout.md | PWA spec (manifest, sw.js, push), all web screen layouts |
| PRD-Part4-MobileLayout-LangGraph.md | All mobile layouts, swipe gestures, LangGraph architecture and all prompts |
| PRD-Part5-AgentDefinitions-CLAUDE.md | Root + domain CLAUDE.md files, all 12 custom agent definitions |
| PRD-Part6-Phases1to5.md | Phases 1-5: full agent rosters, checklists, kickoff prompts |
| PRD-Part7-Phases6to8-Deployment.md | Phases 6-8, deployment config, env vars, out of scope |

**When handing this PRD to Claude Code:**
Start with this prompt:
```
Read all 7 files in the PRD/ directory in order (Part1 through Part7).
Read root CLAUDE.md.
Read WORKFLOWS.md.
When finished reading all documents, report:
  1. Your understanding of what Keystone is
  2. The Phase 1 agent roster you will spawn
  3. Any ambiguities that would change architecture (one sentence each)
Then wait for confirmation before starting Phase 1.
```

---

*Crowe Keystone PRD v2.0 — Complete*
*Author: Achyuth Rachur, Crowe LLP AI Innovation Team*
*March 2026*
