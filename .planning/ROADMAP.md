# Roadmap: Crowe Keystone

**8 phases** | **51 requirements mapped** | All v1 requirements covered ✓

| # | Phase | Goal | Requirements | Status |
|---|-------|------|--------------|--------|
| 1 | Foundation | Running app, auth, project CRUD, PWA shell, web+mobile layouts | FOUND-01 to FOUND-10 | ✓ Complete |
| 2 | Stage Transitions + Approvals + Push | Full stage graph, approval inbox, SSE real-time, push notifications | STAGE-01 to STAGE-04, APPROV-01 to APPROV-05, PUSH-01 to PUSH-03 | ◆ In Progress |
| 3 | Living PRD System | PRD CRUD, versioning, diffs, open questions, structured sections | PRD-01 to PRD-08 | ○ Pending |
| 4 | React Flow Graph | Portfolio graph, conflict edges, live SSE updates, mobile list | GRAPH-01 to GRAPH-07 | ○ Pending |
| 5 | LangGraph Engine | All AI nodes implemented and tested via API | LANG-01 to LANG-10 | ○ Pending |
| 6 | Agent Integration | Stage Actions trigger real agents, AgentPanel live, end-to-end demo | INTEG-01 to INTEG-08 | ○ Pending |
| 7 | Integrations + Memory + Settings | GitHub webhook, memory browser, retrospectives, team settings | MEM-01 to MEM-06 | ○ Pending |
| 8 | Polish + Performance + Production | Lighthouse ≥ 90, zero errors, production deploy on Vercel + Railway | PROD-01 to PROD-08 | ○ Pending |

---

## Phase 1: Foundation ✓ COMPLETE

**Goal:** Running app. Auth working. Project CRUD working. PWA shell installed. Web and mobile layouts render.

**Requirements:** FOUND-01 through FOUND-10

**Success Criteria:**
1. `npm run build` completes with zero TypeScript errors
2. FastAPI starts, connects to Neon, `GET /health` returns 200
3. Web dashboard shows project cards with correct stage badge colors
4. ViewportToggle switches to PhoneFrame with iPhone 14 Pro shell
5. `alembic current` shows `001_phase1 (head)`
6. manifest.json accessible, service worker registers without errors

**Deliverables shipped:**
- 5 Neon tables: teams, users, projects, agent_runs, push_subscriptions
- FastAPI with auth, projects, push, SSE stub, health endpoints
- Next.js 15 with full dark-first design system
- Web layout (Sidebar + TopBar + ViewportToggle + AppShell)
- Mobile layout (MobileLayout + BottomNav + PhoneFrame)
- PWA manifest + service worker foundation
- 13 custom agent definitions in .claude/agents/
- GitHub repo at achyuthrachur/crowe-keystone

---

## Phase 2: Stage Transitions + Approvals + Push ◆ IN PROGRESS

**Goal:** Full stage graph. Stage advance creates approvals. Approvals visible in inbox. SSE events fire and update UI in real time. Push notifications buzz phone for approvals.

**Requirements:** STAGE-01 to STAGE-04, APPROV-01 to APPROV-05, PUSH-01 to PUSH-03

**Success Criteria:**
1. POST /projects/{id}/advance validates transitions, rejects invalid skips (422)
2. Stage advance to review creates approval record visible in /approvals
3. Web Inbox shows pending approval card; approve → teal flash + slide-right exit
4. Mobile: swipe right >120px on approval card calls approve handler
5. Bell badge increments in real-time without page refresh (SSE driving it)
6. POST /push/subscribe saves to DB; stage advance fires push notification to user

**End-to-end flow to verify:**
Create project → advance stage → approval in inbox → push notification → tap → inbox → approve → project advances

---

## Phase 3: Living PRD System

**Goal:** Full PRD creation, versioning, section editing, diff view. Human-authored PRDs only (AI drafting is Phase 5).

**Requirements:** PRD-01 through PRD-08

**Success Criteria:**
1. PUT /projects/{id}/prd creates v1 with all 10 structured sections
2. Second PUT creates v2, v1 marked superseded, diff stored
3. Blocking open question prevents stage advance (422)
4. Web PRD: section edit mode with AnimatePresence transition
5. VersionDiff shows teal=added, coral=removed
6. Mobile accordion sections expand/collapse smoothly

---

## Phase 4: React Flow Graph Visualization

**Goal:** Portfolio graph at /graph showing all projects as nodes. Conflict edges between conflicting projects. Live SSE updates animate node stage changes. Mobile shows stage-grouped list.

**Requirements:** GRAPH-01 through GRAPH-07

**Success Criteria:**
1. /graph loads all projects as dagre-layout nodes colored by stage
2. Open conflicts show ConflictEdge (dashed coral, animated dashoffset)
3. Node click opens project detail drawer
4. SSE project.stage_changed → node recolors with stageTransitionVariants
5. SSE conflict.detected → ConflictEdge appears with fade-in
6. Mobile shows MobileGraphList with 8 stage accordion groups

---

## Phase 5: LangGraph Backend Engine

**Goal:** Full LangGraph implementation. All nodes coded and tested. State machine working end-to-end. Human checkpoints pause and resume. Tested via API directly.

**Requirements:** LANG-01 through LANG-10

**Success Criteria:**
1. POST /agents/run {agent_type: 'brief_generator'} returns {run_id}
2. Brief generator: valid BriefContent JSON with all required fields
3. PRD drafter: all 5 sections populated in parallel (verify via timing logs)
4. Stress tester: exactly 3 hypotheses in output
5. Human checkpoint: pauses, status=awaiting_human, SSE fires agent.checkpoint
6. Resume via /respond: agent continues to completion
7. agent_runs table has complete records with tokens_used, duration_ms

---

## Phase 6: Agent Integration with Frontend

**Goal:** Full end-to-end AI experience. Stage Actions trigger real agents. AgentPanel shows live progress. The demo moment works start to finish.

**The Demo Moment (must work end-to-end):**
User creates Spark → clicks "Generate Brief" → AgentPanel slides in → three amber dots → node list builds → brief appears in PRD tab → ConflictEdge appears on /graph → push notification buzzes phone

**Requirements:** INTEG-01 through INTEG-08

**Success Criteria:**
1. "Generate Brief" triggers agent, AgentPanel appears immediately (agent.started SSE)
2. Node list populates with correct names as agent.node_entered fires
3. Brief content appears in PRD tab after agent.completed (no page refresh)
4. StressTestPanel renders 3 real hypothesis cards with confidence bars
5. Conflict scanner auto-runs after project change → ConflictEdge appears
6. All 4 push scenarios fire: approval, conflict, checkpoint, daily brief

---

## Phase 7: Integrations + Memory + Settings

**Goal:** GitHub webhook populates build logs. Memory browser is searchable. Retrospective generation feeds institutional memory. Team settings complete.

**Requirements:** MEM-01 through MEM-06

**Success Criteria:**
1. GitHub webhook POST with sample payload → build log entry in project
2. GET /memory?query=postgres → relevant decisions returned
3. Publish retro → memory_indexer fires → decisions appear in /memory
4. /settings/team: member list, invite by email
5. /settings/approval-chains: save and reload returns correct config
6. Web /daily brief renders DailyBriefContent in prose layout

---

## Phase 8: Polish + Performance + Production

**Goal:** Production-grade quality. Lighthouse ≥ 90. Zero console errors. Complete error states. Accessibility audit. Security audit. Deploy to Vercel and Railway.

**Requirements:** PROD-01 through PROD-08

**Success Criteria:**
1. Lighthouse Performance ≥ 90 desktop, ≥ 85 mobile (tested on production URL)
2. Lighthouse Accessibility ≥ 90
3. Lighthouse PWA ≥ 90
4. Initial JS bundle < 250KB gzipped (Next.js bundle analyzer)
5. Zero TypeScript errors (`npm run typecheck` clean)
6. Zero ESLint errors (`npm run lint` clean)
7. Vercel: login works at crowe-keystone.vercel.app
8. Railway: GET /health returns 200 at crowe-keystone-api.railway.app
9. Push notification fires on real device at production URL
10. PWA installs from production URL in Safari on iPhone

---
*Roadmap created: 2026-03-07*
*Phase 1 complete. Phase 2 in progress.*
