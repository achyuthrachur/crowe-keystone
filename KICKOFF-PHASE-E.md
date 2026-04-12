# KICKOFF — Phase E: Cleanup + Test Coverage

## Your first 3 actions (do these before writing any code):

1. Read `HANDOFF.md` in the project root
2. Read `PRD-PHASE-E-CLEANUP-AND-TESTS.md` in full
3. Run `python -m pytest tests/ -v --tb=short` from the `backend/` directory
   and confirm the baseline: 7 passed / 0 failed

## Then execute these sections in order:

1. **Section 1** — Delete stale files (verify no imports first with grep)
2. **Section 2** — Fix stale comments in 3 files (targeted edits only)
3. **Sections 3–7** — Create 5 new test files in `backend/tests/`
4. **Section 9** — Overwrite `CONTEXT.md` with the updated version from the PRD
5. Run the full verification checklist at the bottom of the PRD

## Rules:
- Work through sections sequentially — do not skip ahead
- Do NOT rewrite entire files — make targeted edits for Sections 1 and 2
- After each section, confirm no import errors before moving on
- Do NOT touch any frontend files — this phase is backend + docs only
- After deleting stale files, run pytest immediately to confirm still 7 passed
- Write `HANDOFF.md` when the checklist is fully green
