# Crowe Keystone — PRD Part 2 of 7
## Repository Structure, Database Schema, API Contracts
### Version 2.0 | March 2026

---

# SECTION 3 — REPOSITORY STRUCTURE

Full monorepo. Every file listed here must exist. Agents use this as
their navigation map.

```
crowe-keystone/
│
├── frontend/                              ← Next.js 15 app (Vercel)
│   ├── public/
│   │   ├── manifest.json                  ← PWA manifest
│   │   ├── sw.js                          ← Service worker
│   │   ├── keystone-192.png               ← PWA icon (192×192, maskable)
│   │   ├── keystone-512.png               ← PWA icon (512×512, maskable)
│   │   ├── keystone-96.png                ← PWA badge icon (monochrome, 96×96)
│   │   ├── keystone-conflict-192.png      ← Conflict notification icon variant
│   │   ├── screenshot-mobile.png          ← PWA install screenshot (390×844)
│   │   ├── screenshot-desktop.png         ← PWA install screenshot (1280×720)
│   │   └── crowe-logo-white.svg
│   │
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx                 ← Root layout: fonts + PWA meta + providers
│   │   │   ├── globals.css                ← CSS variables + Tailwind base
│   │   │   ├── manifest.ts                ← Next.js 15 metadata manifest export
│   │   │   ├── (auth)/
│   │   │   │   ├── login/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── onboard/
│   │   │   │       └── page.tsx
│   │   │   ├── (app)/
│   │   │   │   ├── layout.tsx             ← AppShell wrapper (routes web/mobile)
│   │   │   │   ├── page.tsx               ← Redirect to /projects
│   │   │   │   ├── projects/
│   │   │   │   │   ├── page.tsx           ← Dashboard
│   │   │   │   │   └── [id]/
│   │   │   │   │       ├── page.tsx       ← Project detail
│   │   │   │   │       ├── prd/
│   │   │   │   │       │   └── page.tsx
│   │   │   │   │       ├── build/
│   │   │   │   │       │   └── page.tsx
│   │   │   │   │       └── retro/
│   │   │   │   │           └── page.tsx
│   │   │   │   ├── graph/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── inbox/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── memory/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── daily/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── settings/
│   │   │   │       ├── page.tsx
│   │   │   │       ├── team/page.tsx
│   │   │   │       ├── notifications/page.tsx  ← Push notification management
│   │   │   │       └── approval-chains/page.tsx
│   │   │   └── api/
│   │   │       ├── auth/
│   │   │       │   └── [...nextauth]/route.ts
│   │   │       └── webhooks/
│   │   │           ├── github/route.ts
│   │   │           └── fireflies/route.ts
│   │   │
│   │   ├── components/
│   │   │   ├── ui/                        ← shadcn components (Crowe-themed)
│   │   │   │
│   │   │   ├── layout/                    ← WEB layout components
│   │   │   │   ├── AppShell.tsx           ← Viewport router (web vs mobile)
│   │   │   │   ├── WebLayout.tsx          ← Sidebar + TopBar + main content
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   ├── TopBar.tsx
│   │   │   │   └── ViewportToggle.tsx     ← Web/Mobile preview switcher
│   │   │   │
│   │   │   ├── mobile/                    ← MOBILE layout and components
│   │   │   │   ├── MobileLayout.tsx       ← MobileTopBar + content + BottomNav
│   │   │   │   ├── MobileTopBar.tsx
│   │   │   │   ├── BottomNav.tsx
│   │   │   │   └── PhoneFrame.tsx         ← iPhone preview frame (desktop only)
│   │   │   │
│   │   │   ├── graph/
│   │   │   │   ├── KeystoneGraph.tsx      ← Full React Flow canvas
│   │   │   │   ├── GraphView.tsx          ← Routes: full graph vs mobile list
│   │   │   │   ├── MobileGraphList.tsx    ← Stage-grouped list for phones
│   │   │   │   ├── nodes/
│   │   │   │   │   ├── ProjectNode.tsx    ← 200×70px, memo, animated
│   │   │   │   │   ├── ConflictNode.tsx   ← Diamond shape, coral
│   │   │   │   │   ├── DecisionNode.tsx   ← Hexagon, amber
│   │   │   │   │   └── AgentNode.tsx      ← Shows active agent processing
│   │   │   │   └── edges/
│   │   │   │       ├── StageEdge.tsx
│   │   │   │       └── ConflictEdge.tsx   ← Dashed coral, animated dashoffset
│   │   │   │
│   │   │   ├── projects/                  ← Web project components
│   │   │   │   ├── ProjectCard.tsx        ← 280px wide card
│   │   │   │   ├── ProjectList.tsx
│   │   │   │   ├── StageFilterBar.tsx
│   │   │   │   ├── StageProgressBar.tsx
│   │   │   │   └── SparkInput.tsx         ← New project input sheet
│   │   │   │
│   │   │   ├── projects-mobile/           ← Mobile project components
│   │   │   │   ├── MobileProjectCard.tsx  ← 80px compact card
│   │   │   │   ├── MobileProjectList.tsx
│   │   │   │   ├── MobileStageFilter.tsx  ← Horizontal scroll filter
│   │   │   │   └── MobileProjectDetail.tsx ← Accordion-based detail view
│   │   │   │
│   │   │   ├── prd/
│   │   │   │   ├── PRDEditor.tsx          ← Section-by-section structured editor
│   │   │   │   ├── PRDSection.tsx         ← Single section (view + edit modes)
│   │   │   │   ├── PRDAccordion.tsx       ← Mobile PRD view
│   │   │   │   ├── OpenQuestionBlock.tsx
│   │   │   │   ├── StressTestPanel.tsx    ← Hypothesis results
│   │   │   │   └── VersionDiff.tsx        ← Split-pane diff view
│   │   │   │
│   │   │   ├── approvals/
│   │   │   │   ├── ApprovalRequest.tsx    ← Web approval card
│   │   │   │   ├── MobileApprovalCard.tsx ← Swipeable mobile card
│   │   │   │   ├── ApprovalChainView.tsx
│   │   │   │   └── ApprovalHistory.tsx
│   │   │   │
│   │   │   ├── conflicts/
│   │   │   │   ├── ConflictCard.tsx
│   │   │   │   ├── ConflictResolution.tsx
│   │   │   │   └── ConflictBadge.tsx
│   │   │   │
│   │   │   ├── agents/
│   │   │   │   ├── AgentPanel.tsx         ← Live agent progress (right sidebar)
│   │   │   │   ├── AgentThinking.tsx      ← Three amber dots animation
│   │   │   │   └── AgentOutput.tsx        ← Structured output display
│   │   │   │
│   │   │   ├── memory/
│   │   │   │   ├── MemoryBrowser.tsx
│   │   │   │   └── DecisionRecord.tsx
│   │   │   │
│   │   │   ├── daily/
│   │   │   │   ├── DailyBrief.tsx         ← Web version (prose layout)
│   │   │   │   └── MobileDailyBrief.tsx   ← Card-based mobile version
│   │   │   │
│   │   │   └── notifications/
│   │   │       ├── PushPermissionPrompt.tsx
│   │   │       ├── NotificationBell.tsx
│   │   │       ├── NotificationPanel.tsx  ← Slide-in panel from bell
│   │   │       └── ToastNotification.tsx
│   │   │
│   │   ├── lib/
│   │   │   ├── api.ts                     ← Typed API client (Railway backend)
│   │   │   ├── sse.ts                     ← SSE connection helpers
│   │   │   ├── motion.ts                  ← ALL animation variants (see Part 1)
│   │   │   ├── stage-colors.ts            ← STAGE_COLORS constant
│   │   │   ├── push-notifications.ts      ← Web Push subscription logic
│   │   │   ├── pwa.ts                     ← Install prompt + standalone detection
│   │   │   └── utils.ts
│   │   │
│   │   ├── hooks/
│   │   │   ├── useInView.ts               ← IntersectionObserver for scroll reveal
│   │   │   ├── useSSE.ts                  ← SSE subscription + event routing
│   │   │   ├── useProjectGraph.ts         ← React Flow data management
│   │   │   ├── useAgentStream.ts          ← Live agent output streaming
│   │   │   ├── useApprovals.ts            ← Pending approvals query
│   │   │   ├── useMediaQuery.ts           ← Responsive breakpoint detection
│   │   │   └── usePWA.ts                  ← PWA install prompt state
│   │   │
│   │   ├── stores/
│   │   │   ├── graph.store.ts             ← React Flow nodes/edges + updates
│   │   │   ├── notifications.store.ts     ← Bell notifications list
│   │   │   ├── agent.store.ts             ← Active agent runs
│   │   │   └── viewport.store.ts          ← 'web' | 'mobile' mode
│   │   │
│   │   └── types/
│   │       ├── project.types.ts
│   │       ├── prd.types.ts
│   │       ├── agent.types.ts
│   │       ├── approval.types.ts
│   │       └── graph.types.ts
│   │
│   ├── CLAUDE.md                          ← Frontend agent instructions
│   ├── next.config.ts
│   ├── tailwind.config.ts
│   ├── package.json
│   └── tsconfig.json
│
├── backend/                               ← Python + FastAPI + LangGraph (Railway)
│   ├── src/
│   │   ├── main.py                        ← FastAPI app entry point
│   │   ├── config.py                      ← Settings via pydantic-settings
│   │   ├── database.py                    ← SQLAlchemy async engine + session
│   │   ├── state.py                       ← LangGraph KeystoneState TypedDict
│   │   │
│   │   ├── models/
│   │   │   ├── team.py
│   │   │   ├── user.py
│   │   │   ├── project.py
│   │   │   ├── prd.py
│   │   │   ├── approval.py
│   │   │   ├── conflict.py
│   │   │   ├── decision.py
│   │   │   ├── retrospective.py
│   │   │   ├── daily_brief.py
│   │   │   ├── push_subscription.py
│   │   │   └── agent_run.py
│   │   │
│   │   ├── schemas/
│   │   │   ├── project.py
│   │   │   ├── prd.py
│   │   │   ├── agent.py
│   │   │   ├── approval.py
│   │   │   ├── conflict.py
│   │   │   └── push.py
│   │   │
│   │   ├── routers/
│   │   │   ├── auth.py
│   │   │   ├── projects.py
│   │   │   ├── prds.py
│   │   │   ├── agents.py
│   │   │   ├── approvals.py
│   │   │   ├── conflicts.py
│   │   │   ├── memory.py
│   │   │   ├── daily.py
│   │   │   ├── push.py
│   │   │   └── stream.py                  ← SSE endpoint
│   │   │
│   │   ├── graph/
│   │   │   ├── keystone_graph.py          ← Main LangGraph assembler
│   │   │   ├── nodes/
│   │   │   │   ├── classifier.py
│   │   │   │   ├── brief_generator.py
│   │   │   │   ├── prd_drafter.py
│   │   │   │   ├── stress_tester.py
│   │   │   │   ├── assumption_excavator.py
│   │   │   │   ├── conflict_detector.py
│   │   │   │   ├── approval_router.py
│   │   │   │   ├── update_writer.py
│   │   │   │   ├── retro_generator.py
│   │   │   │   ├── memory_indexer.py
│   │   │   │   └── daily_brief_generator.py
│   │   │   └── prompts/                   ← System prompts (versioned markdown)
│   │   │       ├── brief_generator.md
│   │   │       ├── prd_drafter.md
│   │   │       ├── stress_tester.md
│   │   │       ├── assumption_excavator.md
│   │   │       ├── conflict_detector.md
│   │   │       ├── approval_router.md
│   │   │       ├── update_writer.md
│   │   │       ├── retro_generator.md
│   │   │       └── memory_indexer.md
│   │   │
│   │   ├── services/
│   │   │   ├── project_service.py
│   │   │   ├── stage_service.py           ← Stage transition validation + logic
│   │   │   ├── conflict_service.py
│   │   │   ├── approval_service.py
│   │   │   ├── memory_service.py
│   │   │   └── push_service.py            ← Web Push via pywebpush
│   │   │
│   │   └── background/
│   │       ├── conflict_scanner.py        ← Runs on project changes
│   │       ├── daily_brief_scheduler.py   ← 7am per user timezone
│   │       └── github_sync.py             ← Commit log → Update Writer
│   │
│   ├── alembic/
│   │   └── versions/                      ← Migration files (named by phase)
│   ├── tests/
│   ├── CLAUDE.md
│   ├── requirements.txt
│   ├── pyproject.toml
│   └── Dockerfile
│
├── .claude/
│   └── agents/
│       ├── keystone-orchestrator.md
│       ├── keystone-schema-validator.md
│       ├── keystone-graph-reviewer.md
│       ├── keystone-web-frontend.md
│       ├── keystone-mobile-frontend.md
│       ├── keystone-pwa-specialist.md
│       ├── keystone-backend-api.md
│       ├── keystone-langgraph.md
│       ├── keystone-prompt-engineer.md
│       ├── keystone-test-writer.md
│       ├── keystone-security-auditor.md
│       ├── keystone-migration-writer.md
│       └── keystone-sse-specialist.md
│
├── docs/
│   ├── ARCHITECTURE.md
│   ├── LANGGRAPH_DESIGN.md
│   ├── REACT_FLOW_DESIGN.md
│   ├── PWA_SETUP.md
│   └── API_CONTRACTS.md
│
├── CLAUDE.md            ← Root (all agents read first)
├── WORKFLOWS.md         ← GSD, SDD, Taskmaster, Agent Teams reference
├── docker-compose.yml   ← Local Postgres + pgAdmin
└── README.md
```

---

# SECTION 4 — DATABASE SCHEMA

All tables created via Alembic migrations. Never modify schema directly.
Always run keystone-schema-validator after any schema change.
Always use keystone-migration-writer agent to write new migration files.

```sql
-- Phase 1 Migration: teams, users, projects, agent_runs, push_subscriptions

CREATE TABLE teams (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  slug       TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  avatar_url  TEXT,
  team_id     UUID REFERENCES teams(id),
  role        TEXT NOT NULL DEFAULT 'builder',
    -- builder | lead | admin
  timezone    TEXT DEFAULT 'America/Chicago',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE push_subscriptions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES users(id) NOT NULL,
  type         TEXT NOT NULL DEFAULT 'web_push',
    -- web_push (Phase 1-8) | apns | fcm (Phase 9+)
  endpoint     TEXT NOT NULL,
  p256dh       TEXT,          -- Web Push encryption key
  auth         TEXT,          -- Web Push auth secret
  device_token TEXT,          -- APNS/FCM (Phase 9)
  is_active    BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, endpoint)
);

CREATE TABLE projects (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id          UUID REFERENCES teams(id) NOT NULL,
  created_by       UUID REFERENCES users(id) NOT NULL,
  title            TEXT NOT NULL,
  description      TEXT,
  stage            TEXT NOT NULL DEFAULT 'spark',
    -- spark | brief | draft_prd | review | approved | in_build | shipped | retrospective
  stage_history    JSONB DEFAULT '[]',
    -- [{stage, timestamp, actor_id, note}]
  spark_content    TEXT,
  brief            JSONB,               -- BriefContent object
  prd_id           UUID,                -- FK to prds (set after PRD created)
  stack            TEXT[],
  effort_estimate  TEXT,                -- S | M | L | XL
  assigned_to      UUID REFERENCES users(id),
  build_log        JSONB DEFAULT '[]',
    -- [{timestamp, content, source, build_health}]
  metadata         JSONB DEFAULT '{}',
  archived         BOOLEAN DEFAULT FALSE,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Phase 2 Migration: approvals
CREATE TABLE approvals (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id       UUID REFERENCES projects(id) NOT NULL,
  prd_id           UUID REFERENCES prds(id),
  type             TEXT NOT NULL,
    -- stage_advance | architectural_decision | scope_change | deployment
  requested_by     UUID REFERENCES users(id) NOT NULL,
  assigned_to      UUID[] NOT NULL,     -- array of user IDs
  status           TEXT NOT NULL DEFAULT 'pending',
    -- pending | approved | rejected | changes_requested | expired
  request_summary  TEXT NOT NULL,       -- AI-generated, ≤120 words
  decisions        JSONB DEFAULT '[]',
    -- [{user_id, decision, note, timestamp}]
  deadline         TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  resolved_at      TIMESTAMPTZ
);

-- Phase 2 Migration: conflicts
CREATE TABLE conflicts (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id                UUID REFERENCES teams(id) NOT NULL,
  type                   TEXT NOT NULL,
    -- assumption_mismatch | decision_contradiction | resource_overlap |
    -- scope_collision | architectural_divergence
  severity               TEXT NOT NULL DEFAULT 'advisory',
    -- blocking | advisory
  project_a_id           UUID REFERENCES projects(id),
  project_b_id           UUID REFERENCES projects(id),
  description            TEXT NOT NULL,
  specific_conflict      TEXT NOT NULL,  -- exactly 2 sentences
  resolution_options     JSONB NOT NULL, -- [{option, implication}]
  decision_required_from UUID REFERENCES users(id),
  status                 TEXT NOT NULL DEFAULT 'open',
    -- open | resolved | dismissed
  resolution             TEXT,
  detected_at            TIMESTAMPTZ DEFAULT NOW(),
  resolved_at            TIMESTAMPTZ
);

-- Phase 3 Migration: prds
CREATE TABLE prds (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id           UUID REFERENCES projects(id) NOT NULL,
  version              INTEGER NOT NULL DEFAULT 1,
  status               TEXT NOT NULL DEFAULT 'draft',
    -- draft | in_review | approved | superseded
  content              JSONB NOT NULL,     -- PRDContent object (see Part 4)
  open_questions       JSONB DEFAULT '[]',
    -- [{id, question, blocking, owner, answered, answer}]
  stress_test_results  JSONB,              -- {hypotheses, assumption_audit}
  assumption_audit     JSONB,
  claude_code_prompt   TEXT,
  diff_from_previous   JSONB,             -- [{section, old, new}]
  word_count           INTEGER,
  created_by           UUID REFERENCES users(id),
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

-- Phase 5 Migration: decisions + retrospectives + daily_briefs + agent_runs
CREATE TABLE decisions (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id                 UUID REFERENCES teams(id) NOT NULL,
  project_id              UUID REFERENCES projects(id),
  type                    TEXT NOT NULL,
    -- architectural | process | tool | scope | technology
  title                   TEXT NOT NULL,
  rationale               TEXT NOT NULL,
  alternatives_considered TEXT[],
  made_by                 UUID REFERENCES users(id),
  approved_by             UUID[] DEFAULT '{}',
  superseded_by           UUID REFERENCES decisions(id),
  tags                    TEXT[] DEFAULT '{}',
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE retrospectives (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        UUID REFERENCES projects(id) NOT NULL,
  built_vs_scoped   JSONB,
  decisions_changed JSONB,
  learnings         TEXT[],
  what_would_change TEXT[],
  quality_signals   JSONB,
  draft             TEXT,
  published         BOOLEAN DEFAULT FALSE,
  published_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE daily_briefs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES users(id) NOT NULL,
  date          DATE NOT NULL,
  content       JSONB NOT NULL,     -- DailyBriefContent object (see Part 4)
  delivered_via TEXT[],             -- in_app | push
  read_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

CREATE TABLE agent_runs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id        UUID REFERENCES teams(id) NOT NULL,
  agent_type     TEXT NOT NULL,
    -- brief_generator | prd_drafter | stress_tester | conflict_detector |
    -- approval_router | update_writer | retro_generator | memory_indexer |
    -- daily_brief_generator
  project_id     UUID REFERENCES projects(id),
  triggered_by   UUID REFERENCES users(id),
  trigger_event  TEXT NOT NULL,
  input_summary  TEXT NOT NULL,
  output_summary TEXT,
  graph_state    JSONB,             -- full LangGraph state snapshot
  tokens_used    INTEGER,
  duration_ms    INTEGER,
  status         TEXT DEFAULT 'running',
    -- running | complete | failed | awaiting_human
  error          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  completed_at   TIMESTAMPTZ
);

-- Performance indexes
CREATE INDEX idx_projects_team_stage     ON projects(team_id, stage);
CREATE INDEX idx_projects_assigned       ON projects(assigned_to);
CREATE INDEX idx_approvals_assigned      ON approvals USING GIN(assigned_to);
CREATE INDEX idx_approvals_pending       ON approvals(status) WHERE status = 'pending';
CREATE INDEX idx_conflicts_team_open     ON conflicts(team_id) WHERE status = 'open';
CREATE INDEX idx_decisions_team          ON decisions(team_id);
CREATE INDEX idx_decisions_tags          ON decisions USING GIN(tags);
CREATE INDEX idx_agent_runs_project      ON agent_runs(project_id);
CREATE INDEX idx_agent_runs_running      ON agent_runs(status) WHERE status = 'running';
CREATE INDEX idx_push_user_active        ON push_subscriptions(user_id) WHERE is_active = TRUE;
CREATE INDEX idx_daily_briefs_user_date  ON daily_briefs(user_id, date DESC);
```

---

# SECTION 5 — API CONTRACTS

Base URL: `https://crowe-keystone-api.railway.app/api/v1/`
Auth: All requests include `Authorization: Bearer {nextauth_session_token}`
Content-Type: `application/json` for all requests and responses
All payloads: snake_case JSON

## 5.1 Auth Endpoints
```
POST   /auth/login              { email, password } → { user, token }
POST   /auth/logout             → 200 OK
GET    /auth/me                 → UserDetail
POST   /auth/invite             { email, role } → { invite_url }
```

## 5.2 Project Endpoints
```
GET    /projects                        → ProjectList[]
POST   /projects                        { title, spark_content?, description? }
                                        → ProjectDetail
GET    /projects/{id}                   → ProjectDetail
PATCH  /projects/{id}                   { title?, description?, assigned_to?,
                                          stack?, effort_estimate? }
                                        → ProjectDetail
POST   /projects/{id}/advance           { target_stage, note? }
                                        → { approval_id, project } or { project }
                                          (some advances require approval, some don't)
GET    /projects/{id}/prd               → PRDDetail (current version)
PUT    /projects/{id}/prd               { content, open_questions? }
                                        → PRDDetail (new version created)
POST   /projects/{id}/build-log         { raw_notes, source }
                                        → triggers update_writer agent
                                          returns { run_id }
DELETE /projects/{id}/archive           → 204 No Content
```

## 5.3 Approval Endpoints
```
GET    /approvals                       → ApprovalList[] (pending for current user)
GET    /approvals/all                   → ApprovalList[] (all for team, leads only)
GET    /approvals/{id}                  → ApprovalDetail
POST   /approvals/{id}/decide           { decision: 'approve'|'reject'|'changes',
                                          note? }
                                        → ApprovalDetail
```

## 5.4 Conflict Endpoints
```
GET    /conflicts                       → ConflictList[] (open, for team)
GET    /conflicts/{id}                  → ConflictDetail
POST   /conflicts/{id}/resolve          { resolution, option_chosen }
                                        → ConflictDetail
POST   /conflicts/{id}/dismiss          { reason }
                                        → ConflictDetail
```

## 5.5 Agent Endpoints
```
POST   /agents/run                      { agent_type, project_id?, input_data }
                                        → { run_id, status: 'running' }
GET    /agents/run/{id}                 → AgentRunStatus (status, output, node_progress)
POST   /agents/run/{id}/respond         { answer } (for human checkpoints)
                                        → { run_id, status: 'running' }
GET    /agents/run/{id}/stream          → SSE stream for single run (alternative to /stream)
```

## 5.6 Memory Endpoints
```
GET    /memory                          ?query=&type=&tag=&limit=20&offset=0
                                        → MemoryEntry[]
GET    /memory/{id}                     → MemoryEntryDetail
```

## 5.7 Daily Brief Endpoint
```
GET    /daily                           → DailyBriefContent (today, current user)
GET    /daily/{date}                    → DailyBriefContent (specific date)
```

## 5.8 Push Notification Endpoints
```
POST   /push/subscribe                  { endpoint, keys: { p256dh, auth } }
                                        → { subscription_id }
DELETE /push/subscribe                  { endpoint }
                                        → 204 No Content
GET    /push/vapid-public-key           → { key: string }
POST   /push/test                       → sends test notification (dev env only)
```

## 5.9 Team + Settings Endpoints
```
GET    /team                            → TeamDetail with members[]
PATCH  /team                            { name? } → TeamDetail
POST   /team/members                    { user_id, role } → TeamDetail
DELETE /team/members/{user_id}          → 204 No Content
GET    /team/approval-chains            → ApprovalChainConfig[]
PUT    /team/approval-chains            { chains: ApprovalChainConfig[] }
                                        → ApprovalChainConfig[]
```

## 5.10 SSE Stream — The Real-Time Bus
```
GET    /stream                          → text/event-stream (persistent connection)
Headers required: Cache-Control: no-cache, X-Accel-Buffering: no
```

Every significant state change broadcasts an event here.
Frontend subscribes once on app load (useSSE hook) and routes events
to the correct Zustand store.

Full SSE event type union (TypeScript, lives in `frontend/src/types/sse.types.ts`):

```typescript
export type KeystoneSSEEvent =
  | { type: 'connected';
      data: { user_id: string } }

  | { type: 'project.created';
      data: { project_id: string; title: string; stage: string; created_by: string } }

  | { type: 'project.stage_changed';
      data: { project_id: string; title: string; new_stage: string;
              old_stage: string; actor_name: string } }

  | { type: 'project.build_log_updated';
      data: { project_id: string; entry: BuildLogEntry } }

  | { type: 'conflict.detected';
      data: { conflict_id: string; type: string; severity: string;
              project_a_id: string; project_a_title: string;
              project_b_id: string; project_b_title: string;
              specific_conflict: string } }

  | { type: 'conflict.resolved';
      data: { conflict_id: string; resolution: string } }

  | { type: 'approval.requested';
      data: { approval_id: string; project_id: string; project_title: string;
              type: string; summary: string; deadline: string } }

  | { type: 'approval.decided';
      data: { approval_id: string; project_id: string;
              decision: string; decided_by: string } }

  | { type: 'agent.started';
      data: { run_id: string; agent_type: string; project_id?: string } }

  | { type: 'agent.node_entered';
      data: { run_id: string; node_name: string;
              node_index: number; total_nodes: number } }

  | { type: 'agent.checkpoint';
      data: { run_id: string; project_id?: string; question: string } }

  | { type: 'agent.completed';
      data: { run_id: string; output_summary: string; tokens_used: number } }

  | { type: 'agent.failed';
      data: { run_id: string; error: string } }

  | { type: 'prd.updated';
      data: { project_id: string; version: number; updated_by: string } }

  | { type: 'daily_brief.ready';
      data: { user_id: string; date: string } }

  | { type: 'memory.entry_added';
      data: { entry_id: string; type: string; project_id?: string } };
```

## 5.11 SSE Server Implementation (backend)

```python
# backend/src/routers/stream.py
import asyncio, json
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

router = APIRouter()

# In-memory team queues (one asyncio.Queue per team)
# For Phase 7+: replace with Redis pub/sub for multi-instance support
_team_queues: dict[str, asyncio.Queue] = {}

async def get_or_create_queue(team_id: str) -> asyncio.Queue:
    if team_id not in _team_queues:
        _team_queues[team_id] = asyncio.Queue()
    return _team_queues[team_id]

async def broadcast_to_team(team_id: str, event: dict) -> None:
    """Called by all services and agents when something changes."""
    queue = _team_queues.get(team_id)
    if queue:
        await queue.put(event)

async def event_generator(team_id: str, user_id: str):
    queue = await get_or_create_queue(team_id)
    # Initial handshake
    yield f"data: {json.dumps({'type': 'connected', 'data': {'user_id': user_id}})}\n\n"
    while True:
        try:
            event = await asyncio.wait_for(queue.get(), timeout=25.0)
            yield f"data: {json.dumps(event)}\n\n"
        except asyncio.TimeoutError:
            yield ": heartbeat\n\n"  # keeps connection alive through proxies
        except GeneratorExit:
            break

@router.get("/stream")
async def stream(current_user = Depends(get_current_user)):
    return StreamingResponse(
        event_generator(current_user.team_id, str(current_user.id)),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
        }
    )
```

---

*Continue reading: PRD-Part3-PWA-WebLayout.md*
