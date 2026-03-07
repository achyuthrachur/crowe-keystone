# Crowe Keystone — Setup & Execution Guide
## Everything you need to install and exactly how to run this build
### Written for your machine (Windows ARM64, Crowe corporate network, no admin rights)
### Decision: Vercel Postgres (cloud) — no Docker, shared database for the whole team

---

## THE WORKFLOW ANSWER

**Use GSD. It's already installed. It runs the phases.**

GSD and the Keystone custom agents work together — they are not competing:

```
GSD manages the PHASE LIFECYCLE
  /gsd:new-project    → sets up the project
  /gsd:plan-phase     → plans Phase 1
  /gsd:execute-phase  → runs Phase 1 (this is where custom agents fire)
  /gsd:verify-work    → checks the deliverables checklist
  /gsd:complete-milestone → closes the phase, moves to next

CUSTOM AGENTS do the DOMAIN WORK inside each phase
  keystone-schema-validator, keystone-web-frontend,
  keystone-mobile-frontend, keystone-pwa-specialist,
  keystone-backend-api, keystone-langgraph, etc.
```

GSD = the project manager running the lifecycle.
Custom agents = the team members doing the work in parallel.

---

## PART 1 — WHAT YOU ALREADY HAVE

Confirmed on your machine — nothing to do here:
- ✅ GSD (fully installed at `C:\Users\RachurA\.claude\`)
- ✅ Claude Code (claude CLI)
- ✅ Node.js (multiple Next.js projects confirmed)
- ✅ Git + GitHub CLI (`gh`)
- ✅ Python (confirmed from your Python projects)
- ✅ VS Code

---

## PART 2 — WHAT YOU NEED TO INSTALL

Run all of these in **Git Bash**.

---

### Step 1: Verify Node version (needs 20+)

```bash
node --version
```

If it shows v18 or lower, download the Node 20 LTS **user installer** (not the system installer) from nodejs.org. The user installer doesn't need admin rights.

---

### Step 2: Verify Python version (needs 3.11+)

```bash
python --version
```

If it shows 3.10 or lower, download Python 3.11 from python.org. During install: check "Add to PATH", uncheck "Install for all users" (keeps it user-scope, no admin needed).

---

### Step 3: Install Vercel CLI

```bash
npm install -g vercel

# Verify:
vercel --version
```

If npm fails due to Crowe SSL proxy, run this first (one-time fix):
```bash
npm config set strict-ssl false
```

Then retry.

---

### Step 4: Install Railway CLI

Railway is where the Python backend (FastAPI + LangGraph) deploys.

```bash
npm install -g @railway/cli

# Verify:
railway --version
```

---

### Step 5: Generate VAPID keys (do this RIGHT NOW, one time only)

These are the keys that make push notifications work on phones.
Run this, then save both keys in a safe place (Notes, 1Password, anywhere).

```bash
npx web-push generate-vapid-keys
```

Output looks like:
```
Public Key:  BG7abc123...long string...
Private Key: 2Kxyz789...long string...
```

**Save both.** You'll need them when setting up environment variables.
- Public key → goes in frontend AND backend `.env` files
- Private key → goes in backend `.env` ONLY. Never in frontend. Never in git.

---

### Step 6: Create accounts (if you don't have them already)

**Vercel** — vercel.com → Sign up with GitHub (achyuthrachur)
You likely already have this from other projects.

**Railway** — railway.app → Sign up with GitHub (achyuthrachur)
Free tier is fine for development. $5/month hobby plan if you want persistent deploys.

---

### Step 7: Enable Agent Teams (for Phases 5 and 6 only)

Phases 5 and 6 use experimental Claude Code Agent Teams where multiple Claude
instances work as teammates that can talk directly to each other.

Add this to your `.bashrc` so it's always available:

```bash
# Open your bash profile:
code ~/.bashrc

# Add this line at the bottom:
export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1

# Save and reload:
source ~/.bashrc
```

Alternatively, skip the profile change and just prefix the command when you need it:
```bash
CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1 claude
```

You only need this for Phases 5 and 6. All other phases use standard subagents.

---

## PART 3 — DATABASE SETUP (Vercel Postgres)

Because the decision is Vercel Postgres (not Docker), everyone on the team
shares the same database. You set it up once, hand out the connection string.

### Step 1: Create the Vercel project and database

```bash
cd "C:/Users/RachurA/OneDrive - Crowe LLP/VS Code Programming Projects/Crowe-Keystone"

# Link to Vercel (SSL bypass for Crowe network):
NODE_TLS_REJECT_UNAUTHORIZED=0 vercel link --yes --project crowe-keystone

# Create the Postgres database:
NODE_TLS_REJECT_UNAUTHORIZED=0 vercel postgres create crowe-keystone-db

# Pull the connection string into your local environment:
NODE_TLS_REJECT_UNAUTHORIZED=0 vercel env pull backend/.env.vercel
```

The `backend/.env.vercel` file now contains your `POSTGRES_URL` and related vars.

### Step 2: Understand the two database URLs you need

Vercel Postgres gives you two connection strings:
- `POSTGRES_URL` — uses connection pooling (Prisma/serverless friendly)
- `POSTGRES_URL_NON_POOLING` — direct connection (what Alembic migrations need)

For this project:
```
DATABASE_URL      = POSTGRES_URL_NON_POOLING  (backend connects here, async SQLAlchemy)
DATABASE_URL_SYNC = POSTGRES_URL_NON_POOLING  (Alembic migrations connect here)
```

Both point to the same non-pooling URL. SQLAlchemy handles its own connection pooling.

### Step 3: Create your .env files

**Backend** (`backend/.env`):
```bash
# Copy the values from backend/.env.vercel into this file

DATABASE_URL=postgresql+asyncpg://USER:PASS@HOST:5432/verceldb
DATABASE_URL_SYNC=postgresql://USER:PASS@HOST:5432/verceldb
# (replace the prefix: asyncpg for async, plain postgresql for sync)

ANTHROPIC_API_KEY=sk-ant-YOUR_KEY_HERE

VAPID_PUBLIC_KEY=YOUR_PUBLIC_KEY_FROM_STEP_5
VAPID_PRIVATE_KEY=YOUR_PRIVATE_KEY_FROM_STEP_5
VAPID_CONTACT=rachura@crowe.com

SECRET_KEY=GENERATE_THIS_BELOW
FRONTEND_URL=http://localhost:3000
ALLOWED_ORIGINS=http://localhost:3000
ENVIRONMENT=development
LOG_LEVEL=INFO
CONFLICT_THRESHOLD=0.75
```

**Frontend** (`frontend/.env.local`):
```bash
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=GENERATE_THIS_BELOW
BACKEND_URL=http://localhost:8001
NEXT_PUBLIC_APP_NAME=Crowe Keystone
NEXT_PUBLIC_BACKEND_URL=http://localhost:8001
NEXT_PUBLIC_VAPID_PUBLIC_KEY=YOUR_PUBLIC_KEY_FROM_STEP_5
```

**Generate SECRET_KEY and NEXTAUTH_SECRET:**
```bash
# Run this twice — use one output for SECRET_KEY, one for NEXTAUTH_SECRET:
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Step 4: Never commit .env files

```bash
# Make sure these are in .gitignore:
echo "backend/.env" >> .gitignore
echo "backend/.env.vercel" >> .gitignore
echo "frontend/.env.local" >> .gitignore
git add .gitignore
git commit -m "chore: add env files to gitignore"
```

---

## PART 4 — PROJECT SETUP (run once before Phase 1)

```bash
cd "C:/Users/RachurA/OneDrive - Crowe LLP/VS Code Programming Projects/Crowe-Keystone"

# Create the monorepo subdirectories:
mkdir frontend
mkdir backend
mkdir -p .claude/agents

# Initialize git (if not already done):
git init
git add .
git commit -m "feat: initial PRD and project structure"

# Create GitHub repo (Crowe network needs SSL bypass):
GIT_SSL_NO_VERIFY=true gh repo create achyuthrachur/crowe-keystone --public --source=. --remote=origin --push
```

---

## PART 5 — HOW TO RUN EACH PHASE

### Daily development session setup

Three Git Bash windows:

**Window 1 — Backend (open after Phase 1 completes):**
```bash
cd "C:/Users/RachurA/OneDrive - Crowe LLP/VS Code Programming Projects/Crowe-Keystone/backend"
source venv/Scripts/activate
alembic upgrade head
uvicorn src.main:app --reload --port 8001
```

**Window 2 — Frontend (open after Phase 1 completes):**
```bash
cd "C:/Users/RachurA/OneDrive - Crowe LLP/VS Code Programming Projects/Crowe-Keystone/frontend"
npm run dev
# Opens at http://localhost:3000
```

**Window 3 — Claude Code (always open, this is where you build):**
```bash
cd "C:/Users/RachurA/OneDrive - Crowe LLP/VS Code Programming Projects/Crowe-Keystone"
claude
```

---

### Starting Phase 1

In Window 3 (Claude Code), type:

```
/gsd:new-project
```

When GSD asks for the project description, paste this:

```
Read all 7 files in the PRD/ directory in order (Part1 through Part7).
Read CLAUDE.md. Read WORKFLOWS.md.

This is Crowe Keystone — an AI-native operating system for AI building teams.
Monorepo: /frontend (Next.js 15) + /backend (Python + FastAPI + LangGraph).
Database: Vercel Postgres (cloud, shared). No local Docker.

When finished reading all documents, start Phase 1 using the Subagents
approach (1 terminal). Follow the Phase 1 agent roster in PRD-Part6 exactly.
Spawn Schema Agent first (blocking). Then Web Frontend, Mobile Frontend,
Backend API, PWA, and SSE agents in parallel. Test Agent last.
Do not proceed past Phase 1 until all checklist items pass.
```

---

### Moving between phases

After each phase completes:

```
/gsd:verify-work
```

After verification passes:

```
/gsd:complete-milestone
/gsd:plan-phase
```

Then paste the next phase kickoff prompt from PRD-Part6 or PRD-Part7.

---

### Phases 5 and 6 — Agent Teams

```bash
# Close the current Claude Code session
# Open a new Git Bash in the project directory:
CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1 claude

# Then run the normal GSD commands
```

If Agent Teams feels unstable (teammates crashing), close it and reopen without the flag:
```bash
claude
```
Standard subagents still work for Phases 5 and 6 — just less parallel.

---

### Testing push notifications on your phone during development

The service worker requires HTTPS. ngrok gives you a temporary HTTPS tunnel:

```bash
# One-time install:
npm install -g ngrok

# In a 4th terminal while frontend is running:
ngrok http 3000
# Gives you: https://abc123.ngrok.io

# Open that URL in Safari on your iPhone
# PWA install + push notifications work through ngrok
```

---

## PART 6 — DEPLOYMENT (Phase 8)

### Frontend → Vercel

```bash
cd frontend

# Set production env vars in Vercel dashboard FIRST
# (vercel.com → crowe-keystone → Settings → Environment Variables)
# Add the same vars from frontend/.env.local but with production values:
#   NEXTAUTH_URL = https://crowe-keystone.vercel.app
#   BACKEND_URL  = https://crowe-keystone-api.railway.app
#   (everything else stays the same)

# Deploy:
NODE_TLS_REJECT_UNAUTHORIZED=0 vercel deploy --prod --yes
```

### Backend → Railway

```bash
cd backend

# Set env vars in Railway dashboard FIRST
# (railway.app → your project → Variables)
# Add all vars from backend/.env but with production values:
#   FRONTEND_URL    = https://crowe-keystone.vercel.app
#   ALLOWED_ORIGINS = https://crowe-keystone.vercel.app
#   ENVIRONMENT     = production
#   DATABASE_URL    = your Vercel Postgres non-pooling URL
#   (ANTHROPIC_API_KEY, VAPID keys stay the same)

# Deploy:
railway up
```

### Sharing with the team

Once deployed, the only thing teammates need is:
1. The URL: `https://crowe-keystone.vercel.app`
2. An invite (you POST to `/api/v1/auth/invite` or share a signup link)

They open it in their browser or Safari on iPhone — done.
No installs, no database setup, no environment variables on their end.

---

## PART 7 — GIVING TEAMMATES ACCESS TO THE DATABASE

Since everyone shares Vercel Postgres, you don't hand out `.env` files.
You hand out the app URL and invite them as users.

If a teammate needs to run the backend locally for development (unlikely for non-builders):

```bash
# They run this from the project directory:
NODE_TLS_REJECT_UNAUTHORIZED=0 vercel env pull backend/.env.local --yes
```

This pulls the database credentials directly from Vercel into their local `.env`.
They need to be added to the Vercel project first (Settings → Members).

---

## PART 8 — CROWE NETWORK SSL FIXES (one-time)

Run these once. They persist across sessions.

```bash
# npm:
npm config set strict-ssl false

# pip:
pip config set global.trusted-host "pypi.org files.pythonhosted.org pypi.python.org"

# git:
git config --global http.sslVerify false
# (only do this if git push/pull consistently fails — be aware this is global)
```

Per-command SSL bypass (use when the global fix isn't enough):
```bash
NODE_TLS_REJECT_UNAUTHORIZED=0 vercel deploy   # Vercel
GIT_SSL_NO_VERIFY=true git push                # Git
```

---

## PART 9 — INSTALL CHECKLIST (verify before starting Phase 1)

```bash
node --version        # needs v20.x or higher
npm --version         # needs v10.x or higher
python --version      # needs 3.11.x or higher
git --version         # any version fine
gh --version          # any version fine
vercel --version      # any version fine
railway --version     # any version fine
claude --version      # any version fine
```

---

## PART 10 — QUICK REFERENCE CARD

```
DAILY SESSION (3 Git Bash windows):
  Window 1: cd backend && source venv/Scripts/activate && uvicorn src.main:app --reload --port 8001
  Window 2: cd frontend && npm run dev
  Window 3: cd Crowe-Keystone && claude

GSD PHASE COMMANDS (inside Window 3):
  /gsd:new-project         → set up new project (Phase 1 only)
  /gsd:plan-phase          → plan next phase
  /gsd:execute-phase       → run the phase
  /gsd:verify-work         → check deliverables checklist
  /gsd:complete-milestone  → close phase
  /gsd:progress            → see where you are
  /gsd:debug               → if something's broken
  /gsd:add-todo            → capture a task mid-execution
  /gsd:quick               → quick task without full phase overhead

PHASES 5-6 (Agent Teams):
  CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1 claude

MOBILE TESTING ON REAL PHONE:
  ngrok http 3000
  Open ngrok URL in Safari on iPhone

GENERATE SECRETS:
  VAPID keys:     npx web-push generate-vapid-keys
  SECRET_KEY:     node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
  NEXTAUTH_SECRET: same command, run again

DATABASE MIGRATIONS:
  alembic upgrade head       → apply all migrations
  alembic downgrade -1       → roll back one
  (no Docker needed — targets Vercel Postgres directly)

DEPLOY:
  Frontend: NODE_TLS_REJECT_UNAUTHORIZED=0 vercel deploy --prod --yes
  Backend:  railway up

GIT PUSH (Crowe network):
  GIT_SSL_NO_VERIFY=true git push origin main
```

---

## PART 11 — THE EXACT FIRST COMMAND TO RUN

Once you've verified the install checklist:

```bash
# 1. Open Git Bash
cd "C:/Users/RachurA/OneDrive - Crowe LLP/VS Code Programming Projects/Crowe-Keystone"

# 2. Start Claude Code:
claude

# 3. Inside claude:
/gsd:new-project

# 4. Paste the Phase 1 kickoff prompt when GSD asks for project info
```
