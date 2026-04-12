# Keystone — PRD Phase F: Deploy to Demo/POC
> Version 1.0 | Status: Draft | Author: Achyuth Rachur
> Prereq: Phase E complete — 46 tests passing, CONTEXT.md current

---

## Overview

Phase F gets the Demo/POC environment fully live and smoke-tested end-to-end.
It is split into two parts:

**Part 1 — Code/config fixes** (Claude Code handles these)
- Fix KOYEB-ENV-VARS.env: ENVIRONMENT, FILE_STORAGE_BACKEND, Supabase vars
- Add KOYEB-ENV-VARS.env to .gitignore (it contains live credentials)
- Create DEPLOY-CHECKLIST.md with the full manual verification steps

**Part 2 — Manual steps** (Achyuth runs these in dashboards + terminal)
- Update Koyeb env vars to match the corrected reference file
- Verify Vercel rootDirectory is set to "frontend/" in the Vercel dashboard
- Verify all Vercel env vars are present
- Push to GitHub to trigger redeploy of both services
- Run seed_synthetic.py against Neon
- Smoke test end-to-end

Exit criteria: the full user journey completes on the live Vercel URL using
synthetic data — create engagement → upload transcript → run pipeline →
review 3 HITL gates → download deck_brief.docx and deck_handoff.json.

---

## Part 1 — Code/Config Fixes

### 1.1 Add KOYEB-ENV-VARS.env to .gitignore

KOYEB-ENV-VARS.env contains live credentials (OpenAI API key, DB password,
VAPID keys, SECRET_KEY). It is NOT currently gitignored — the pattern `.env`
does not match a file named `KOYEB-ENV-VARS.env`.

Add these two lines to `.gitignore` in the repo root (under the "Environment
files" section):

```
KOYEB-ENV-VARS.env
RAILWAY-ENV-VARS.env
```

**Verify it is not already staged:**
```bash
git status KOYEB-ENV-VARS.env
# Should show "nothing to commit" or "ignored" after the gitignore change.
# If it shows as tracked, run: git rm --cached KOYEB-ENV-VARS.env
```

### 1.2 Fix KOYEB-ENV-VARS.env

Three critical corrections plus Supabase vars. Overwrite the file with:

```bash
# Koyeb Environment Variables — Crowe Keystone Backend (Demo/POC)
# Copy each of these into the Koyeb dashboard (Service → Settings → Environment Variables).
# This file is gitignored. Do NOT commit it.
#
# CRITICAL: ENVIRONMENT must be "test" not "production" for the demo environment.
# "production" bypasses synthetic_guard.py and would allow real client data.

DATABASE_URL=postgresql+asyncpg://neondb_owner:npg_uVh79FPNHjoO@ep-billowing-river-a45djnaz.us-east-1.aws.neon.tech/keystone

DATABASE_URL_SYNC=postgresql://neondb_owner:npg_uVh79FPNHjoO@ep-billowing-river-a45djnaz.us-east-1.aws.neon.tech/keystone?channel_binding=disable

OPENAI_API_KEY=<your-openai-api-key>

SECRET_KEY=aVOfrvve/e9mu9oIhl4hZ/XNU5Qg3b2TenVeY6Vog0o=

VAPID_PUBLIC_KEY=BL3qj4MDfd6qWsMBpWM14ohkNsaybLHEnXWgDM37LGFy3ty_ZN1HVGH9-SPg6gop1PAlGK6HSgfgTm-em4it-H8
VAPID_PRIVATE_KEY=aFLKpabkJ2JrEtflNPxpIJAXdf-LG9TDarKOcKOFpQ0
VAPID_CONTACT=achyuth.rachur@crowe.com

JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=10080

FRONTEND_URL=https://crowe-keystone.vercel.app
ALLOWED_ORIGINS=https://crowe-keystone.vercel.app,http://localhost:3002

# ── CORRECTED: was "production" — must be "test" for demo/POC environment ────
ENVIRONMENT=test

# ── ADDED: was missing — must be "supabase" or container storage is ephemeral ─
FILE_STORAGE_BACKEND=supabase

# ── ADDED: get these from Supabase dashboard → Project Settings → API ─────────
# Project URL: Settings → General → Reference ID → https://<ref>.supabase.co
# Service Role Key: Settings → API → service_role (secret key, not anon key)
SUPABASE_URL=https://REPLACE_WITH_YOUR_PROJECT_REF.supabase.co
SUPABASE_SERVICE_KEY=REPLACE_WITH_YOUR_SERVICE_ROLE_KEY

LOG_LEVEL=INFO

# ── After updating Koyeb, note the service URL here for reference ─────────────
# KOYEB_SERVICE_URL=https://printed-ebony-crowe-e5ded4c2.koyeb.app
```

**Supabase setup note:** If a Supabase project doesn't exist yet:
1. Go to supabase.com → New project
2. Create a storage bucket named `keystone-uploads` (public: no)
3. Go to Project Settings → API → copy the Project URL and service_role key
4. Replace the placeholder values above

### 1.3 Create DEPLOY-CHECKLIST.md

Create this file in the repo root. It is the step-by-step manual guide for
completing and verifying the deployment. Claude Code writes it; Achyuth runs it.

```markdown
# Keystone — Demo/POC Deployment Checklist
> Work through this top to bottom. Check each box as you complete it.

---

## Prerequisites

- [ ] Supabase project exists with a `keystone-uploads` storage bucket
- [ ] KOYEB-ENV-VARS.env has real SUPABASE_URL and SUPABASE_SERVICE_KEY filled in
- [ ] You are logged into: Koyeb, Vercel, Neon dashboards

---

## Step 1 — Update Koyeb Environment Variables

Go to: https://app.koyeb.com → your Keystone service → Settings → Environment Variables

Update or add each variable from KOYEB-ENV-VARS.env:

Critical changes (must verify these exist with correct values):
- [ ] `ENVIRONMENT` = `test`  (NOT production)
- [ ] `FILE_STORAGE_BACKEND` = `supabase`
- [ ] `SUPABASE_URL` = your project URL
- [ ] `SUPABASE_SERVICE_KEY` = your service role key

Verify these are also set (copy from KOYEB-ENV-VARS.env):
- [ ] `DATABASE_URL`
- [ ] `DATABASE_URL_SYNC`
- [ ] `OPENAI_API_KEY`
- [ ] `SECRET_KEY`
- [ ] `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_CONTACT`
- [ ] `FRONTEND_URL` = `https://crowe-keystone.vercel.app`
- [ ] `ALLOWED_ORIGINS` = `https://crowe-keystone.vercel.app,http://localhost:3002`
- [ ] `JWT_ALGORITHM` = `HS256`
- [ ] `JWT_EXPIRE_MINUTES` = `10080`

After saving all variables: click "Redeploy" in Koyeb.
- [ ] Koyeb redeploy triggered
- [ ] Wait for deploy to show "Healthy" (watch logs for migration output)
- [ ] Koyeb logs show: "Migrations complete. Starting server..."

---

## Step 2 — Verify Backend Health

```bash
curl https://printed-ebony-crowe-e5ded4c2.koyeb.app/api/v1/health
# Expected: {"status": "ok", "version": "1.0.0", ...}
```
- [ ] Health check returns 200

---

## Step 3 — Verify Vercel Configuration

Go to: https://vercel.com → crowe-keystone project → Settings

**Root Directory:**
- [ ] Settings → General → Root Directory is set to `frontend`
  (If not: click Edit → type `frontend` → Save)

**Environment Variables** (Settings → Environment Variables):
Verify all of these exist for Production + Preview + Development:
- [ ] `NEXTAUTH_URL` = `https://crowe-keystone.vercel.app`
- [ ] `NEXTAUTH_SECRET` = (same value as backend SECRET_KEY)
- [ ] `BACKEND_URL` = `https://printed-ebony-crowe-e5ded4c2.koyeb.app`
- [ ] `NEXT_PUBLIC_BACKEND_URL` = `https://printed-ebony-crowe-e5ded4c2.koyeb.app`
- [ ] `NEXT_PUBLIC_VAPID_PUBLIC_KEY` = (VAPID_PUBLIC_KEY value)
- [ ] `NEXT_PUBLIC_APP_NAME` = `Crowe Keystone`

After verifying: trigger a Vercel redeploy.
- [ ] Vercel redeploy triggered (Deployments → Redeploy latest, or push to GitHub main)
- [ ] Vercel build succeeds (no build errors in deployment logs)
- [ ] `https://crowe-keystone.vercel.app` loads without error

---

## Step 4 — Seed the Database

Run from your local machine (backend venv must be active, .env must have Neon
DATABASE_URL set):

```bash
cd "C:\Users\rachura\OneDrive - Crowe LLP\VS Code Programming Projects\Crowe-Keystone\backend"
venv\Scripts\activate
python scripts/seed_synthetic.py
```

Expected output:
```
Seed complete.
  Team: Crowe IRM AI Team (slug: crowe-irm-ai)
  Admin login: achyuth@crowe-synthetic.test / synthetic-password-123
  3 engagements seeded with status=complete
```
- [ ] Seed completed without errors
- [ ] Note: If the team/users already exist from a previous seed, you may get
  unique constraint errors. In that case, either drop and recreate the tables
  (`alembic downgrade -1 && alembic upgrade head`) or comment out the team/user
  creation and re-run.

---

## Step 5 — Smoke Test End-to-End

Open https://crowe-keystone.vercel.app in a browser.

**Auth:**
- [ ] Login page loads
- [ ] Login with `achyuth@crowe-synthetic.test` / `synthetic-password-123` succeeds
- [ ] Redirected to `/engagements` — Kanban board renders
- [ ] 3 synthetic engagements appear in the "Complete" column

**Create & Upload:**
- [ ] Click "New Engagement" → `/engagements/new` loads
- [ ] Fill in form (Client Name, Date, Attendees) → click Create
- [ ] Upload a `.txt` transcript file (any plain text file works)
- [ ] Engagement moves to "Ready" column on Kanban

**Run Pipeline:**
- [ ] Click "Run Pipeline" on the engagement detail page
- [ ] Confirm modal appears → click "Start Pipeline"
- [ ] Status changes to "Running" — node progress rows appear in UI
- [ ] SSE events arrive (node names update in real time)

**HITL Gates** (pipeline takes 2-5 minutes to reach each gate):
- [ ] Gate 1: removed segments panel appears — click "Looks Good"
- [ ] Gate 2: glossary table appears with acronyms — click "Approve Glossary"
- [ ] Gate 3: content outline accordion appears — click "Finalize Outline"

**Output:**
- [ ] Status reaches "Complete"
- [ ] `/engagements/[id]` output step shows download buttons
- [ ] Click "Deck Brief" → downloads a .docx file
- [ ] Click "Deck Handoff" → downloads a .json file
- [ ] Open .docx in Word — verify Crowe branding, sections populated
- [ ] Open .json — verify schema_version "1.0", content_outline present

---

## Step 6 — Update URLs in CONTEXT.md and HANDOFF.md

Once both services are confirmed live:
- [ ] Update CONTEXT.md under "Demo/POC" to add the confirmed live URLs
- [ ] Write HANDOFF.md noting Phase F complete

---

## Troubleshooting

**Koyeb logs show "supabase" import error:**
→ `pip install supabase==2.9.1` — check requirements.txt includes it (it does)
→ Trigger redeploy

**File upload returns 500:**
→ Check SUPABASE_URL and SUPABASE_SERVICE_KEY are correct in Koyeb
→ Verify the `keystone-uploads` bucket exists in Supabase with correct permissions:
  Supabase → Storage → keystone-uploads → Policies → add INSERT policy for service role

**Pipeline fails immediately with "transcript_ingester failed":**
→ Check that FILE_STORAGE_BACKEND=supabase is set in Koyeb
→ Check SUPABASE credentials are correct

**Vercel build fails with "Cannot find module":**
→ Verify Root Directory is set to `frontend` in Vercel settings
→ Check the build log for the exact missing module

**SSE events not arriving (pipeline appears frozen in UI):**
→ Koyeb must be running with --workers 1 (it is — check Dockerfile CMD)
→ Some corporate proxies strip SSE connections — test on personal network or phone hotspot

**Login fails on deployed app:**
→ Verify NEXTAUTH_SECRET in Vercel matches SECRET_KEY in Koyeb
→ Verify BACKEND_URL in Vercel points to the correct Koyeb URL

**Seed script fails with unique constraint:**
→ Users/team already seeded from a previous run
→ Option A: Run `alembic downgrade -1 && alembic upgrade head` then re-seed
→ Option B: Skip the team/user creation in the script (comment out lines 82-104)
   and just create the engagements pointing to the existing team/admin user ID
```

---

## Part 2 — Manual Steps Summary

These cannot be automated — they require dashboard access:

1. **Supabase** — create project if needed, create `keystone-uploads` bucket,
   copy Project URL and service_role key into KOYEB-ENV-VARS.env
2. **Koyeb** — update all env vars per Step 1 above, redeploy, verify healthy
3. **Vercel** — verify Root Directory = `frontend`, verify all env vars, redeploy
4. **Terminal** — run `seed_synthetic.py` against Neon
5. **Browser** — run the smoke test checklist in Step 5

---

## Verification Checklist (for Claude Code)

The code changes in Part 1 are minimal. After making them:

```bash
# 1. Confirm .gitignore now ignores the env vars file
git check-ignore -v KOYEB-ENV-VARS.env
# Expected output: .gitignore:X:KOYEB-ENV-VARS.env  KOYEB-ENV-VARS.env

# 2. Confirm it's not staged
git status KOYEB-ENV-VARS.env
# Expected: nothing (ignored)

# 3. Confirm backend tests still pass (no regressions from file changes)
cd backend
python -m pytest tests/ -x --tb=short
# Expected: 46 passed / 0 failed

# 4. Confirm frontend still builds
cd ../frontend
npm run typecheck && npm run build
# Expected: 0 errors, clean build
```

Write HANDOFF.md after the code changes. The manual deploy steps
are tracked in DEPLOY-CHECKLIST.md — Achyuth completes those separately.
```
