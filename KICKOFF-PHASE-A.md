You are working on Keystone — an internal multi-agent pipeline that transforms
discovery session transcripts into structured deck briefs. This repo was previously
a different version of Crowe Keystone. It is being repurposed. Do not reference
or rebuild any prior Keystone features (graph, PRD system, approvals, conflicts, etc).

Read PRD-PHASE-A-FOUNDATION.md in full before touching any code.

Phase A is deletion and configuration only. Do NOT create any new feature files.
Execute in this exact order. After each step, confirm what was done before proceeding.

---

STEP 1 — Audit current state
Read backend/src/models/__init__.py. List every model currently imported.
Read backend/src/main.py. List every router currently registered.
Read backend/requirements.txt. Note current openai version.
Read frontend/package.json. Note presence of @xyflow/react and @dagrejs/dagre.

---

STEP 2 — Delete backend files
Delete every file listed in PRD-PHASE-A-FOUNDATION.md section 3.1 under
"Backend — delete entirely". Work through the list top to bottom.
After deleting, confirm each file is gone before moving on.

---

STEP 3 — Delete frontend directories
Delete every directory listed in PRD-PHASE-A-FOUNDATION.md section 3.1 under
"Frontend — delete entirely". These are entire directories — delete recursively.

---

STEP 4 — Update backend/src/models/__init__.py
Remove import lines for every deleted model.
Keep imports for: Team, User, AgentRun, PushSubscription.
The file should import exactly those 4 models and nothing else after this step.

---

STEP 5 — Update backend/src/main.py
- Remove all include_router() calls for deleted routers
- Remove APScheduler setup, imports, and any background job wiring
- Remove all imports that reference deleted modules
- Keep: auth, stream, agents, health, push, team routers
- Keep: database setup, CORS middleware, startup/shutdown events

---

STEP 6 — Update backend/src/routers/agents.py
- Remove imports of all deleted node modules at the top of the file
- Remove deleted agent_type values from _VALID_AGENT_TYPES set
  (set will be empty after deletion and refilled in Phase C)
- Remove deleted graph builder calls from _select_graph()
- The router endpoints (POST /run, GET /run/{id}, POST /run/{id}/respond) stay intact

---

STEP 7 — Update backend/src/config.py
Add the following fields to the Settings class exactly as shown in
PRD-PHASE-A-FOUNDATION.md section 2.3. Do not remove or modify any existing fields.
Add after the existing ENVIRONMENT field:

    FILE_STORAGE_BACKEND: str = "local"
    AZURE_STORAGE_CONNECTION_STRING: str = ""
    AZURE_STORAGE_CONTAINER: str = "keystone-uploads"
    SUPABASE_URL: str = ""
    SUPABASE_SERVICE_KEY: str = ""

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT.lower() == "production"

    @property
    def is_test(self) -> bool:
        return self.ENVIRONMENT.lower() == "test"

---

STEP 8 — Update backend/requirements.txt
Add these packages (append to end of file):
    python-docx==1.1.2
    pypdf==4.3.1
    python-multipart==0.0.9
    azure-storage-blob==12.23.1
    supabase==2.9.1

Check current openai version. If lower than 1.57.0, update it to 1.57.0.

Remove these lines entirely if present:
    anthropic (any version)
    sentence-transformers (any version)

---

STEP 9 — Update frontend/package.json
Remove @xyflow/react and @dagrejs/dagre from dependencies.
Then run:
    cd frontend && npm install

---

STEP 10 — Create ADO pipeline skeleton
Create the file .ado/azure-pipelines.yml using the exact content from
PRD-PHASE-A-FOUNDATION.md section 2.4. Create the .ado directory first if needed.

---

STEP 11 — Run backend tests
    cd backend
    source venv/Scripts/activate
    python -m pytest tests/ -x --tb=short

If tests fail, read the error, fix the cause (almost certainly a broken import
from a deleted module), and re-run. Do not proceed until tests pass.

---

STEP 12 — Run frontend typecheck
    cd frontend
    npm run typecheck

Fix all TypeScript errors. These will mostly be broken imports referencing
deleted component directories. Remove or stub the imports until typecheck is clean.

---

STEP 13 — Verify clean build
    cd frontend
    npm run build

Fix any build errors. Do not proceed to Phase B until build passes clean.

---

STEP 14 — Write HANDOFF.md
Create HANDOFF.md in the project root with exactly this structure:

## Phase A — Handoff

### Completed
[list every file deleted]
[list every file modified and what changed]

### Test Suite Status
Backend pytest: [X passed / Y failed]
Frontend typecheck: [pass / fail]
Frontend build: [pass / fail]

### What Phase B Starts With
- backend/src/models/__init__.py imports: Team, User, AgentRun, PushSubscription
- backend/src/main.py registers: auth, stream, agents, health, push, team
- backend/src/routers/agents.py _VALID_AGENT_TYPES is empty (refilled in Phase C)
- backend/src/config.py has new FILE_STORAGE_BACKEND and environment fields
- frontend builds clean with no references to deleted components
- .ado/azure-pipelines.yml exists at project root

---

RULES:
- Do not create any new feature files in this session. Phase A is deletion and cleanup only.
- Do not ask clarifying questions. If a file listed for deletion does not exist, skip it and note it in HANDOFF.md.
- Do not rewrite files wholesale. Make targeted edits — remove the specific lines, leave everything else intact.
- If something is genuinely ambiguous, make a reasonable call, note it in HANDOFF.md, and keep moving.
- Write HANDOFF.md before ending the session regardless of whether all steps completed.
