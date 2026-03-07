# Crowe Keystone

## What This Is

Crowe Keystone is an AI-native operating system for teams building AI products. It replaces scattered Slack threads, stale docs, and verbal approvals with a single living graph of everything the team is building — every idea, every PRD, every decision, every conflict, every approval. The AI participates as a team member: drafting PRDs, detecting conflicts, routing approvals, writing daily briefs, and buzzing your phone when something needs attention.

## Core Value

A team using Keystone should never waste time re-litigating a past decision, miss a conflict between two projects, or lose track of where something stands — the graph is always current, the AI handles coordination, and the phone buzzes when human judgment is actually required.

## Requirements

### Validated

- ✓ Project directory structure (frontend/, backend/, .claude/agents/, docs/) — Phase 1
- ✓ Neon Postgres database with teams, users, projects, agent_runs, push_subscriptions — Phase 1
- ✓ FastAPI backend with auth, projects, push, SSE, health endpoints — Phase 1
- ✓ Next.js 15 frontend with dark-first design system (Geist, Plus Jakarta Sans) — Phase 1
- ✓ Web layout: AppShell → WebLayout (Sidebar + TopBar + ViewportToggle) — Phase 1
- ✓ Mobile layout: MobileLayout + BottomNav + PhoneFrame (iPhone 14 Pro) — Phase 1
- ✓ PWA foundation: manifest.json + service worker (install/activate/fetch) — Phase 1
- ✓ All CSS variables from PRD design system (--surface-base #0a0f1a) — Phase 1
- ✓ All Framer Motion animation variants in src/lib/motion.ts — Phase 1
- ✓ STAGE_COLORS constant in src/lib/stage-colors.ts — Phase 1
- ✓ Mock projects dashboard with 5 projects across all 8 stages — Phase 1

### Active

- [ ] Stage transitions with approval gates (spark→brief→draft_prd→review→approved→in_build→shipped→retrospective)
- [ ] Approvals inbox — web card with approve/reject/changes, mobile swipe gestures
- [ ] Real-time SSE — approval.requested, approval.decided, project.stage_changed events fire and update UI
- [ ] Push notifications — VAPID web push buzzes phone for approvals and conflicts
- [ ] Living PRD system — structured sections, versioning, diffs, open questions
- [ ] React Flow graph — all projects as nodes, conflict edges, dagre layout, live SSE updates
- [ ] LangGraph backend — brief_generator, prd_drafter, stress_tester, conflict_detector, approval_router, update_writer, daily_brief_generator, retro_generator, memory_indexer nodes
- [ ] Full AI integration — Stage Actions trigger real agents, AgentPanel shows live progress
- [ ] GitHub webhook → build log auto-populated via update_writer
- [ ] Institutional memory browser — searchable decisions/retros
- [ ] Production deployment — Vercel (frontend) + Railway (backend)

### Out of Scope (Phases 1-8)

- Billing/subscription — internal tool
- Native iOS/Android app (Capacitor) — PWA covers it
- APNS/FCM native push — Web Push covers it
- Multi-tenancy — single team per deployment
- Azure AD/Microsoft SSO — Phase 9+
- CI/CD (GitHub Actions) — Phase 9+
- Redis pub/sub SSE scaling — single worker sufficient
- pgvector semantic search — ILIKE sufficient for Phase 7
- Dark/light mode toggle — dark mode only

## Context

- **Stack**: Next.js 15 + TypeScript + Tailwind + shadcn/ui + React Flow + Framer Motion (frontend); Python 3.11 + FastAPI + LangGraph + SQLAlchemy async + Alembic (backend)
- **Database**: Neon Postgres (cloud) — `keystone` database on `ep-billowing-river-a45djnaz.us-east-1.aws.neon.tech`
- **AI**: OpenAI API (gpt-5.4 for all LangGraph agents)
- **Deploy**: Vercel (frontend) + Railway (backend, --workers 1 mandatory for SSE)
- **Push**: Web Push API with VAPID keys already generated
- **Corporate network**: All npm/pip commands need NODE_TLS_REJECT_UNAUTHORIZED=0 or --trusted-host; git needs GIT_SSL_NO_VERIFY=true; asyncpg SSL needs ssl_context connect_arg; psycopg2/Alembic needs channel_binding=disable
- **Python**: 3.13 at C:\Users\RachurA\AppData\Local\Programs\Python\Python313\
- **gh CLI**: C:\Users\RachurA\AppData\Local\gh-cli\bin\gh.exe (authenticated as achyuthrachur)
- **neonctl**: Authenticated, Vercel-managed org (org-wild-mode-49639482) — can't create new Neon projects, but can create databases in existing project

## Constraints

- **Tech**: Backend must run with `--workers 1` — in-memory SSE queue breaks with multiple workers
- **Security**: ANTHROPIC_API_KEY / OPENAI_API_KEY / VAPID_PRIVATE_KEY never client-side; all LLM calls via Railway backend
- **Mobile**: All touch targets minimum 44×44px; push permission only in settings or after 60s engagement
- **LangGraph**: state.py is sacred — run keystone-schema-validator before ANY change

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Dark-first design system (surface-base: #0a0f1a) | Developer tool, not client-facing; Geist over Helvetica Now | ✓ Good |
| Neon Postgres via Vercel-managed org | Only available option; created `keystone` DB in existing project | ✓ Good |
| asyncpg + pg8000/psycopg2 split | asyncpg for runtime (no sslmode param); psycopg2 for Alembic migrations | ✓ Good |
| channel_binding=disable for sync connections | Neon SCRAM requirement incompatible with pg8000/psycopg2 without it | ✓ Good |
| OpenAI gpt-5.4 (not Anthropic claude-sonnet) | Kickoff spec updated after initial PRD writing | — Pending |
| Single Railway worker | In-memory _team_queues; Redis pub/sub deferred to Phase 9 | ✓ Good |
| Playwright CLI for e2e tests (not MCP) | Token-efficient subprocess model | ✓ Good |

---
*Last updated: 2026-03-07 after Phase 1 completion*
