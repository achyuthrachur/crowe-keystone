You are working on Keystone — an internal multi-agent pipeline that transforms
discovery session transcripts into structured deck briefs.

Read PRD-PHASE-B-DATA-LAYER.md in full before touching any code.
Read HANDOFF.md to confirm Phase A is complete (7 passed / 0 failed, typecheck pass, build pass).

Phase B builds the data layer. Every model, schema, migration, service, and seed
script is defined in the PRD with exact code. Write it exactly as specified.
Do not invent field names, add extra fields, or change types.

Execute in this exact order. Confirm each step before proceeding.

---

STEP 1 — Config cleanup
Open backend/src/config.py and make exactly these two changes:

1. Remove these four fields entirely:
   CONFLICT_THRESHOLD: float = 0.75
   GITHUB_WEBHOOK_SECRET: str = ""
   RESEND_API_KEY: str = ""
   REGISTRATION_MODE: str = "open"

2. Change the container name:
   AZURE_STORAGE_CONTAINER: str = "debrief-uploads"
   → AZURE_STORAGE_CONTAINER: str = "keystone-uploads"

3. Fix the comment above FILE_STORAGE_BACKEND to say /tmp/keystone-uploads/

Do NOT remove any other fields.

---

STEP 2 — Replace backend/src/state.py
Delete the entire contents of backend/src/state.py.
Write the new file exactly as shown in PRD-PHASE-B-DATA-LAYER.md section 2.
This file defines: RemovedSegment, AcronymEntry, OutlineItem, ContentOutline, KeystoneState.

---

STEP 3 — Write 4 new SQLAlchemy models
Write exactly as specified in PRD section 3:

  backend/src/models/engagement.py         (section 3.1)
  backend/src/models/uploaded_document.py  (section 3.2)
  backend/src/models/keystone_run.py       (section 3.3)
  backend/src/models/acronym_glossary.py   (section 3.4)

---

STEP 4 — Update backend/src/models/__init__.py
Replace the file with the content from PRD section 3.5.
It should now import exactly 8 models:
Team, User, AgentRun, PushSubscription, Engagement, UploadedDocument, KeystoneRun, AcronymGlossary

---

STEP 5 — Write the Alembic migration
Write backend/alembic/versions/003_keystone.py exactly as shown in PRD section 4.
Confirm:
  - down_revision = "002_phase2"
  - upgrade() drops 7 old tables then creates 4 new ones
  - downgrade() drops 4 new tables then recreates the 7 old ones (bare structure)

---

STEP 6 — Create schemas directory and write 4 schema files
Create backend/src/schemas/__init__.py (empty file).
Write exactly as specified in PRD section 5:

  backend/src/schemas/engagement.py   (section 5.1)
  backend/src/schemas/upload.py       (section 5.2)
  backend/src/schemas/runs.py         (section 5.3)
  backend/src/schemas/output.py       (section 5.4)

---

STEP 7 — Write file storage service
Write backend/src/services/file_storage.py exactly as shown in PRD section 7.
Create backend/src/services/__init__.py if it does not exist (empty file).

---

STEP 8 — Write synthetic guard
Write backend/src/services/synthetic_guard.py exactly as shown in PRD section 8.
Create backend/src/services/synthetic_guard_blocklist.txt as an empty file.

---

STEP 9 — Write seed script
Create backend/scripts/ directory if it does not exist.
Create backend/scripts/__init__.py as an empty file.
Write backend/scripts/seed_synthetic.py exactly as shown in PRD section 9.

---

STEP 10 — Update agents.py
In backend/src/routers/agents.py make exactly two changes as specified in PRD section 10:

1. Replace the entire initial_state block with the new KeystoneState shape.
2. Update RunAgentRequest: remove project_id field, add engagement_id field.

---

STEP 11 — Run migration against Neon
    cd backend
    source venv/Scripts/activate
    alembic upgrade head

If the migration fails:
  - Read the error carefully
  - Fix the migration file (do not create a new one)
  - Run alembic downgrade -1 if needed to reset, then alembic upgrade head again
  - Do not proceed until migration succeeds

---

STEP 12 — Verify tables
Run the table check command from PRD section 11 step 2.
Confirm all 8 expected tables are present.

---

STEP 13 — Run pytest
    python -m pytest tests/ -x --tb=short

Fix any failures. Most failures at this stage will be import errors from the
updated state.py or agents.py. Fix the imports, do not delete tests.

---

STEP 14 — Run seed script
    python scripts/seed_synthetic.py

Confirm it prints "Seed complete." and lists 3 engagements seeded.
If it fails, fix the error (usually an import or DB connection issue).

---

STEP 15 — Frontend typecheck and build
    cd ../frontend && npm run typecheck
    npm run build

Fix any errors. Phase B does not touch the frontend, so failures here
are likely pre-existing. Fix them and note in HANDOFF.md.

---

STEP 16 — Write HANDOFF.md
Update HANDOFF.md in the project root. Replace existing content with:

## Phase B — Handoff

### Completed
[list every new file created]
[list every modified file and what changed]

### Migration Status
alembic upgrade head: [pass / fail]
Tables present: engagements, uploaded_documents, keystone_runs, acronym_glossary, teams, users, agent_runs, push_subscriptions

### Seed Status
seed_synthetic.py: [pass / fail — how many engagements seeded]

### Test Suite Status
Backend pytest: [X passed / Y failed]
Frontend typecheck: [pass / fail]
Frontend build: [pass / fail]

### What Phase C Starts With
- backend/src/state.py: new KeystoneState TypedDict in place
- 4 new SQLAlchemy models registered in __init__.py
- Migration 003_keystone applied to Neon
- backend/src/schemas/ contains 4 schema files
- backend/src/services/file_storage.py implemented for all 3 backends
- backend/src/services/synthetic_guard.py in place
- backend/src/routers/agents.py uses new KeystoneState shape
- _VALID_AGENT_TYPES is still empty (Phase C fills it)
- No LangGraph nodes or graph exist yet (Phase C builds them)

---

RULES:
- Write every file exactly as specified in the PRD. No additions, no omissions.
- Do not create any router, node, or UI files. Phase B is data layer only.
- If a file already partially exists from a prior attempt, overwrite it completely.
- If the migration fails, fix it in place — do not create a new migration file.
- Write HANDOFF.md before ending the session regardless of whether all steps completed.
