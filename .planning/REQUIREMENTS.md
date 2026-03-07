# Requirements: Crowe Keystone

**Defined:** 2026-03-07
**Core Value:** A team using Keystone should never waste time re-litigating past decisions, miss a conflict, or lose track of where something stands — the graph is always current, the AI handles coordination, and the phone buzzes when human judgment is required.

## v1 Requirements

### Foundation (Phase 1 — COMPLETE)

- [x] **FOUND-01**: Running Next.js 15 app with dark-first design system renders at localhost:3002
- [x] **FOUND-02**: FastAPI backend runs at localhost:8001 with DB connection verified
- [x] **FOUND-03**: Neon Postgres database with 5 Phase 1 tables (teams/users/projects/agent_runs/push_subscriptions)
- [x] **FOUND-04**: Web layout (Sidebar + TopBar + ViewportToggle) renders correctly
- [x] **FOUND-05**: Mobile layout (MobileLayout + BottomNav) renders inside PhoneFrame on desktop
- [x] **FOUND-06**: PWA manifest.json accessible, service worker registers without errors
- [x] **FOUND-07**: Dashboard shows project cards with correct stage badge colors from STAGE_COLORS
- [x] **FOUND-08**: All animation variants in motion.ts (pageVariants, cardVariants, tapVariants, etc.)
- [x] **FOUND-09**: 13 custom agent definitions in .claude/agents/
- [x] **FOUND-10**: Git repo at github.com/achyuthrachur/crowe-keystone

### Stage Transitions + Approvals + Push (Phase 2)

- [ ] **STAGE-01**: POST /projects/{id}/advance validates transition and rejects invalid skips (422)
- [ ] **STAGE-02**: Stage advance to draft_prd or review creates approval record
- [ ] **STAGE-03**: POST /approvals/{id}/decide with approve/reject/changes updates approval status
- [ ] **STAGE-04**: Full approval → project stage advances automatically in DB
- [ ] **APPROV-01**: Web Inbox shows pending approval cards with approve/reject/changes actions
- [ ] **APPROV-02**: Approve flashes teal → card slides out right; reject slides out left
- [ ] **APPROV-03**: Mobile approval card has swipe-right (approve) and swipe-left (changes) gestures
- [ ] **APPROV-04**: Bell badge increments in real time without page refresh (via SSE)
- [ ] **APPROV-05**: Stage progress bar on project detail fills and animates on stage change
- [ ] **PUSH-01**: POST /push/subscribe saves Web Push subscription to push_subscriptions table
- [ ] **PUSH-02**: Stage advance → push notification fires to assigned user within 2s
- [ ] **PUSH-03**: Service worker handles push events and shows system notifications

### Living PRD System (Phase 3)

- [ ] **PRD-01**: POST /projects/{id}/prd creates PRD version 1 with all 10 structured sections
- [ ] **PRD-02**: Second PUT creates version 2, marks v1 as superseded, stores diff
- [ ] **PRD-03**: Blocking open question prevents stage advance (422)
- [ ] **PRD-04**: Web PRD view renders all sections with view + edit mode toggle (AnimatePresence)
- [ ] **PRD-05**: StressTestPanel renders as amber placeholder with "Run stress test →" CTA
- [ ] **PRD-06**: VersionDiff shows colored diff (teal=added, coral=removed) when toggled
- [ ] **PRD-07**: Mobile accordion sections expand/collapse with smooth animation
- [ ] **PRD-08**: PRD version badge updates via SSE without page refresh

### React Flow Graph (Phase 4)

- [ ] **GRAPH-01**: /graph route loads all projects as nodes in dagre TB layout
- [ ] **GRAPH-02**: Nodes colored by current stage using STAGE_COLORS
- [ ] **GRAPH-03**: Open conflicts show ConflictEdge (dashed coral, animated dashoffset)
- [ ] **GRAPH-04**: Node click opens project detail drawer on right
- [ ] **GRAPH-05**: SSE project.stage_changed fires → node recolors with stageTransitionVariants
- [ ] **GRAPH-06**: SSE conflict.detected → ConflictEdge appears with fade-in animation
- [ ] **GRAPH-07**: Mobile /graph shows MobileGraphList with 8 stage accordion groups

### LangGraph Backend Engine (Phase 5)

- [ ] **LANG-01**: POST /agents/run triggers brief_generator, returns run_id
- [ ] **LANG-02**: Brief generator output: valid BriefContent JSON with all required fields
- [ ] **LANG-03**: PRD drafter: all 5 sections drafted in parallel via Send API
- [ ] **LANG-04**: Stress tester: exactly 3 hypotheses, ran in parallel
- [ ] **LANG-05**: Conflict detector: identifies manufactured conflict in test data
- [ ] **LANG-06**: Approval router: ≤120 word summary, approval_chain populated
- [ ] **LANG-07**: Human checkpoint: agent pauses, status=awaiting_human, SSE fires agent.checkpoint
- [ ] **LANG-08**: Resume via /respond: agent continues from checkpoint to completion
- [ ] **LANG-09**: Daily brief generator: all 4 sections (active_work, waiting, team_activity, upcoming)
- [ ] **LANG-10**: agent_runs table records tokens_used and duration_ms

### Agent Integration with Frontend (Phase 6)

- [ ] **INTEG-01**: "Generate Brief" button triggers PRD Architect agent
- [ ] **INTEG-02**: AgentPanel slides in when agent starts, shows live node progress list
- [ ] **INTEG-03**: Brief content appears in PRD tab after agent.completed (no page refresh)
- [ ] **INTEG-04**: StressTestPanel renders real hypothesis data (3 cards, confidence bars)
- [ ] **INTEG-05**: Human checkpoint appears in AgentPanel + Inbox checkpoints section
- [ ] **INTEG-06**: Conflict scanner auto-runs after project state change → ConflictEdge appears
- [ ] **INTEG-07**: "Log Update" → structured entry in Build tab via update_writer
- [ ] **INTEG-08**: All 4 push scenarios fire: approval, conflict, checkpoint, daily brief

### Integrations + Memory + Settings (Phase 7)

- [ ] **MEM-01**: POST /webhooks/github with push payload creates build log entry
- [ ] **MEM-02**: GET /memory?query= returns relevant results (ILIKE search)
- [ ] **MEM-03**: Publish retrospective triggers memory_indexer → decision records in /memory
- [ ] **MEM-04**: /settings/team: member list with roles, invite by email
- [ ] **MEM-05**: /settings/approval-chains: configurable stage → approvers mapping
- [ ] **MEM-06**: Web /daily brief in DailyBrief.tsx (prose layout)

### Polish + Performance + Production (Phase 8)

- [ ] **PROD-01**: Lighthouse Performance ≥ 90 desktop, ≥ 85 mobile
- [ ] **PROD-02**: Lighthouse Accessibility ≥ 90
- [ ] **PROD-03**: Lighthouse PWA ≥ 90
- [ ] **PROD-04**: Initial JS bundle < 250KB gzipped
- [ ] **PROD-05**: Zero TypeScript errors, zero ESLint errors
- [ ] **PROD-06**: All touch targets ≥ 44×44px on mobile
- [ ] **PROD-07**: Vercel production deployment live at crowe-keystone.vercel.app
- [ ] **PROD-08**: Railway production deployment live with /health returning 200

## v2 Requirements

### Phase 9+ Features

- Native iOS/Android via Capacitor
- Azure AD / Microsoft SSO for Crowe corporate
- Redis pub/sub for SSE horizontal scaling
- pgvector semantic search for memory
- CI/CD via GitHub Actions
- Multi-tenancy (multiple orgs per deployment)

## Out of Scope (Phases 1-8)

| Feature | Reason |
|---------|--------|
| Billing/subscription | Internal tool, no billing needed |
| File attachments in PRDs | PRDs are structured data |
| Native APNS/FCM push | Web Push covers the use case |
| Offline mode | Requires internet |
| Gantt chart / timeline view | Stage graph IS the timeline |
| Direct Slack/Teams posting | Phase 9 integration |
| AI model selection UI | gpt-5.4 everywhere, hardcoded |
| Dark/light mode toggle | Dark mode only — developer tool |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| FOUND-01 through FOUND-10 | Phase 1 | Complete |
| STAGE-01 through STAGE-04 | Phase 2 | In Progress |
| APPROV-01 through APPROV-05 | Phase 2 | In Progress |
| PUSH-01 through PUSH-03 | Phase 2 | In Progress |
| PRD-01 through PRD-08 | Phase 3 | Pending |
| GRAPH-01 through GRAPH-07 | Phase 4 | Pending |
| LANG-01 through LANG-10 | Phase 5 | Pending |
| INTEG-01 through INTEG-08 | Phase 6 | Pending |
| MEM-01 through MEM-06 | Phase 7 | Pending |
| PROD-01 through PROD-08 | Phase 8 | Pending |

**Coverage:**
- v1 requirements: 51 total
- Mapped to phases: 51
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-07*
*Last updated: 2026-03-07 after Phase 1 completion*
