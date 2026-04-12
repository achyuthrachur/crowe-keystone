# KICKOFF — Phase F: Deploy to Demo/POC

## Your first 3 actions (do these before touching any file):

1. Read `HANDOFF.md` in the project root
2. Read `PRD-PHASE-F-DEPLOY.md` in full
3. Run `python -m pytest tests/ -x --tb=short` from `backend/` — confirm baseline 46 passed

## Then execute Part 1 only (in order):

1. **Section 1.1** — Add `KOYEB-ENV-VARS.env` and `RAILWAY-ENV-VARS.env` to `.gitignore`
   - Verify with `git check-ignore -v KOYEB-ENV-VARS.env`
   - If file is already tracked: run `git rm --cached KOYEB-ENV-VARS.env`

2. **Section 1.2** — Overwrite `KOYEB-ENV-VARS.env` with the corrected version from the PRD
   - The `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` lines stay as placeholders — do not invent values

3. **Section 1.3** — Create `DEPLOY-CHECKLIST.md` in the repo root with the content from the PRD

4. Run the verification checklist at the bottom of the PRD (git check-ignore, pytest, typecheck, build)

5. Write `HANDOFF.md` when all checks pass

## Rules:
- Part 1 is ALL Claude Code does — do NOT attempt the manual dashboard steps
- Do NOT modify any .py or .tsx files — this phase has zero backend/frontend code changes
- The SUPABASE_URL and SUPABASE_SERVICE_KEY in KOYEB-ENV-VARS.env stay as REPLACE_WITH_* placeholders
- Keep the existing Koyeb URL (`https://printed-ebony-crowe-e5ded4c2.koyeb.app`) in the file — do not remove it
