# Crowe Keystone — Claude Code Kickoff Prompt
# Paste this entire prompt into Claude Code to start the project from scratch.
# Claude Code handles everything: Neon DB, env files, folder structure, dependencies.

---

PASTE THIS INTO CLAUDE CODE:

---

You are setting up Crowe Keystone from scratch. This is a full-stack monorepo:
- Frontend: Next.js 15 + TypeScript + Tailwind + shadcn/ui + React Flow + Framer Motion
- Backend: Python 3.11 + FastAPI + LangGraph + SQLAlchemy + Alembic
- AI: OpenAI API — model: gpt-5.4 for all LangGraph agents (released March 5, 2026)
- Database: Neon Postgres (use the Neon MCP to create and configure it)
- Mobile: PWA (Progressive Web App — same codebase, installable on iPhone/Android)
- Push notifications: Web Push API (VAPID keys already generated — see below)
- Deploy: Vercel (frontend) + Railway (backend)

Read all 7 files in the PRD/ directory in order before doing anything else:
PRD/PRD-Part1-Identity-Design.md
PRD/PRD-Part2-Repository-Database-API.md
PRD/PRD-Part3-PWA-WebLayout.md
PRD/PRD-Part4-MobileLayout-LangGraph.md
PRD/PRD-Part5-AgentDefinitions-CLAUDE.md
PRD/PRD-Part6-Phases1to5.md
PRD/PRD-Part7-Phases6to8-Deployment.md

Also read CLAUDE.md and WORKFLOWS.md in this directory.

---

CREDENTIALS (use these exactly):

VAPID Public Key:
BL3qj4MDfd6qWsMBpWM14ohkNsaybLHEnXWgDM37LGFy3ty_ZN1HVGH9-SPg6gop1PAlGK6HSgfgTm-em4it-H8

VAPID Private Key:
aFLKpabkJ2JrEtflNPxpIJAXdf-LG9TDarKOcKOFpQ0

VAPID Contact: rachura@crowe.com
GitHub: achyuthrachur
Project name: crowe-keystone

---

STEP 1 — CREATE THE NEON DATABASE

Use the Neon MCP tool to:
1. Create a new Neon project named "crowe-keystone"
2. Select region: AWS US East (us-east-2)
3. Get the connection string (both pooled and non-pooled)
4. Note the connection string — you will use it in the .env files below

---

STEP 2 — CREATE PROJECT STRUCTURE

Create these directories:
- frontend/
- frontend/public/
- frontend/src/app/
- frontend/src/components/
- frontend/src/lib/
- frontend/src/hooks/
- frontend/src/stores/
- frontend/src/types/
- backend/
- backend/src/
- backend/src/models/
- backend/src/schemas/
- backend/src/routers/
- backend/src/graph/
- backend/src/graph/nodes/
- backend/src/graph/prompts/
- backend/src/services/
- backend/src/background/
- backend/alembic/
- backend/tests/
- .claude/
- .claude/agents/
- docs/

---

STEP 3 — CREATE ENV FILES

Generate two secret keys using Node:
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
Run this twice. First output = SECRET_KEY. Second output = NEXTAUTH_SECRET.

Create frontend/.env.local:
```
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=[GENERATED_VALUE_1]
BACKEND_URL=http://localhost:8001
NEXT_PUBLIC_APP_NAME=Crowe Keystone
NEXT_PUBLIC_BACKEND_URL=http://localhost:8001
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BL3qj4MDfd6qWsMBpWM14ohkNsaybLHEnXWgDM37LGFy3ty_ZN1HVGH9-SPg6gop1PAlGK6HSgfgTm-em4it-H8
```

Create backend/.env:
```
DATABASE_URL=postgresql+asyncpg://[NEON_USER]:[NEON_PASS]@[NEON_HOST]/[NEON_DB]?sslmode=require
DATABASE_URL_SYNC=postgresql://[NEON_USER]:[NEON_PASS]@[NEON_HOST]/[NEON_DB]?sslmode=require
OPENAI_API_KEY=[ASK_USER_FOR_THIS]
VAPID_PUBLIC_KEY=BL3qj4MDfd6qWsMBpWM14ohkNsaybLHEnXWgDM37LGFy3ty_ZN1HVGH9-SPg6gop1PAlGK6HSgfgTm-em4it-H8
VAPID_PRIVATE_KEY=aFLKpabkJ2JrEtflNPxpIJAXdf-LG9TDarKOcKOFpQ0
VAPID_CONTACT=rachura@crowe.com
SECRET_KEY=[GENERATED_VALUE_2]
FRONTEND_URL=http://localhost:3000
ALLOWED_ORIGINS=http://localhost:3000
ENVIRONMENT=development
LOG_LEVEL=INFO
CONFLICT_THRESHOLD=0.75
```

IMPORTANT: Before filling in DATABASE_URL, ask the user for their OpenAI API key (starts with sk-...).
Fill in the Neon connection string you got from Step 1.

Create .gitignore:
```
node_modules/
.env
.env.local
.env.vercel
.env.production
__pycache__/
*.pyc
.venv/
venv/
.vercel/
.next/
out/
dist/
*.egg-info/
.DS_Store
```

---

STEP 4 — CREATE ALL AGENT DEFINITION FILES

Read PRD/PRD-Part5-AgentDefinitions-CLAUDE.md completely.
Create every agent .md file listed in that document inside .claude/agents/.
These are the specialist agents that will do the parallel domain work:
- keystone-orchestrator.md
- keystone-schema-validator.md
- keystone-graph-reviewer.md
- keystone-web-frontend.md
- keystone-mobile-frontend.md
- keystone-pwa-specialist.md
- keystone-backend-api.md
- keystone-langgraph.md
- keystone-prompt-engineer.md
- keystone-test-writer.md
- keystone-security-auditor.md
- keystone-migration-writer.md
- keystone-sse-specialist.md

Write each file with the full content specified in PRD-Part5.

---

STEP 5 — INITIALIZE GITHUB REPO

```bash
git init
git add .
git commit -m "feat: initial project setup — PRD, agent definitions, env structure"
GIT_SSL_NO_VERIFY=true gh repo create achyuthrachur/crowe-keystone --public --source=. --remote=origin --push
```

---

STEP 6 — START PHASE 1

Once Steps 1-5 are complete, immediately begin Phase 1 using GSD.

Run: /gsd:new-project

Then execute Phase 1 exactly as specified in PRD/PRD-Part6-Phases1to5.md.

Phase 1 uses the Subagents approach (single terminal).
Agent roster:
- Schema Agent FIRST (blocking) — write all Alembic migrations for Phase 1 tables, run them against the Neon database
- Then in parallel: Backend API Agent, Web Frontend Agent, Mobile Frontend Agent, PWA Agent, SSE Specialist
- Test Agent LAST

Do not proceed to Phase 2 until every item in the Phase 1 deliverables checklist passes.

---

IMPORTANT NOTES FOR THIS BUILD:

1. Database is Neon Postgres (cloud). No Docker. No local database.
   All Alembic migrations run directly against Neon.

2. Typography: Keystone uses Geist Sans + Plus Jakarta Sans + Geist Mono.
   NOT Helvetica Now (that's for client-facing Crowe tools).
   Keystone is a developer tool — it has its own design language per PRD-Part1.

3. Design system: Dark-first (surface-base: #0a0f1a).
   The CLAUDE.md design tokens are for client-facing projects.
   Keystone's CSS variables are defined in PRD-Part1 Section 2.2 — use those.

4. The CLAUDE.md in this directory covers general Crowe project standards.
   The Keystone-specific CLAUDE.md files are in PRD-Part5 and should be
   created as frontend/CLAUDE.md and backend/CLAUDE.md during setup.

5. Testing uses Playwright CLI (not MCP). During Phase 1 setup run:
   cd frontend && npx playwright install --with-deps chromium
   Always use --reporter=line flag to keep output compact.
   Test files go in frontend/tests/e2e/ as phase1.spec.ts, phase2.spec.ts etc.

6. On the Crowe corporate network, prefix npm/vercel/git commands with:
   NODE_TLS_REJECT_UNAUTHORIZED=0 (for npm/vercel)
   GIT_SSL_NO_VERIFY=true (for git)

Begin now. Start with Step 1 (Neon database creation via MCP).
