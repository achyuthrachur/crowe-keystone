# CLAUDE.md — Backend (crowe-keystone/backend/)
# EXTENDS root CLAUDE.md. Read root first.

---

## LANGGRAPH RULES

state.py is sacred. ALWAYS run keystone-schema-validator before changing it.

Node implementation:
  Return dict with ONLY the fields this node modifies — not the full state.
  NEVER raise exceptions. Catch all errors, append to state['errors'], return partial.
  Check loop_count before expensive operations. Return failed if loop_count >= 3.
  System prompts: ALWAYS load from prompts/*.md files. NEVER inline strings.
  Load prompt: Path(__file__).parent.parent / 'prompts' / 'filename.md'
  Structured output: parse with Pydantic model_validate_json(). NEVER regex.

Model selection (OpenAI):
  gpt-5.4: complex reasoning (PRD drafting, stress testing, conflict classification)
  gpt-4o-mini: simple extraction (classifier, brief formatting, tag extraction)

---

## SSE BROADCAST RULES

Every state-changing operation MUST broadcast to SSE team queue.
Call broadcast_to_team(team_id, event_dict) from all services and agent nodes.

SSE event sequence for agent runs:
  1. agent.started (on run creation)
  2. agent.node_entered (on each node — fired by background update)
  3. agent.checkpoint (if human input needed — triggers push notification)
  4. agent.completed OR agent.failed

Push notification triggers:
  Fire push notification 500ms AFTER the SSE broadcast for the same event.
  SSE serves users who have the app open.
  Push serves users whose app is backgrounded.
  Do NOT send push for events the user likely sees via SSE (build log updates).
  DO send push for: approval.requested, conflict.detected (blocking), agent.checkpoint.

---

## DEPLOYMENT: SINGLE WORKER

Railway must run uvicorn with --workers 1.
Multiple workers break the in-memory _team_queues dict in stream.py.
If scaling becomes needed in Phase 9+: migrate queue to Redis pub/sub.

---

## ALEMBIC MIGRATION RULES

Never modify the database schema directly.
All changes go through Alembic migrations.
Use keystone-migration-writer agent to generate migration files.
Migration file naming: {phase}_{description}.py (e.g., 001_phase1_initial_schema.py)
Always test migrations: alembic upgrade head && alembic downgrade -1 && alembic upgrade head

---

## BACKGROUND TASKS

background/conflict_scanner.py:
  Triggered by: FastAPI background task after any project state change.
  Runs sentence-transformer embeddings on all non-spark, non-shipped projects.
  Checks pairwise cosine similarity. Threshold from env: CONFLICT_THRESHOLD (default 0.75).
  For pairs above threshold: runs conflict_detector LangGraph graph.
  New conflicts: saved to DB, SSE broadcast, push notification.

background/daily_brief_scheduler.py:
  Uses APScheduler. Schedules per-user by timezone.
  Runs daily_brief LangGraph graph for each user.
  Stores in daily_briefs table. Fires push notification if not already read.

background/github_sync.py:
  Webhook receiver: POST /api/webhooks/github
  Parses commit messages from push payload.
  Triggers update_writer agent with raw_build_notes from commits.
  Matches repo to project via metadata.github_repo field.
