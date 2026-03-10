# Project State: Crowe Keystone

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-07)

**Core value:** A team using Keystone never re-litigates past decisions, misses a conflict, or loses track of where something stands.
**Current focus:** Phase 6 — Agent Integration (frontend wiring)

## Current Phase

**Phase 7: Integrations + Memory + Settings**

Status: PENDING
Started: —

Phase 2 goal: Full stage graph. Stage advance creates approvals. Approvals visible in inbox. SSE events fire and update UI in real time. Push notifications buzz phone.

## Phase History

| Phase | Status | Completed |
|-------|--------|-----------|
| Phase 1: Foundation | ✓ Complete | 2026-03-07 |
| Phase 2: Stage Transitions + Approvals + Push | ✓ Complete | 2026-03-07 |
| Phase 3: Living PRD System | ✓ Complete | 2026-03-07 |
| Phase 4: React Flow Graph | ✓ Complete | 2026-03-07 |
| Phase 5: LangGraph Engine | ✓ Complete | 2026-03-07 |
| Phase 6: Agent Integration | ✓ Complete | 2026-03-07 |
| Phase 7: Integrations + Memory + Settings | ✓ Complete | 2026-03-07 |
| Phase 8: Polish + Performance + Production | ✓ Complete | 2026-03-08 |

## Phase 5 Completion Notes (2026-03-07)

All nodes implemented and tested:
- classifier, brief_generator, prd_drafter (5 sections + merger), stress_tester + red_team
- assumption_excavator, conflict_detector (embedding-based + LLM classify)
- approval_router, update_writer, daily_brief_generator, daily_brief_persister
- open_question_extractor, prompt_writer, quality_gate, human_checkpoint
- memory_indexer (Phase 7 stub), retro_generator
- keystone_graph.py: all 4 graphs compiled and tested
- agents.py router: POST /agents/run, GET /agents/run/{id}, POST /agents/run/{id}/respond
- APScheduler daily brief job wired in main.py (7:00 UTC)
- conflict_scanner triggered as background task on stage advance

Phase 3 completion notes:
- All backend PRD CRUD endpoints passing (22/22 tests)
- Frontend PRDEditor uses real API with JWT auth
- Project detail page uses SWR + real API (not mock data)
- TopBar PRD version badge wired to prd.updated SSE
- PRDUpdate schema supports partial saves (content optional)

## Key Technical Notes

- Python: C:\Users\RachurA\AppData\Local\Programs\Python\Python313\python.exe
- Backend venv: backend/venv/Scripts/ (pip, uvicorn, alembic, etc.)
- Corporate SSL: NODE_TLS_REJECT_UNAUTHORIZED=0 for npm, --trusted-host for pip, GIT_SSL_NO_VERIFY=true for git
- Neon DB: postgresql://neondb_owner:npg_uVh79FPNHjoO@ep-billowing-river-a45djnaz.us-east-1.aws.neon.tech/keystone
- asyncpg SSL: ssl_context connect_arg (not sslmode in URL)
- Alembic sync: channel_binding=disable in DATABASE_URL_SYNC
- gh CLI: /c/Users/RachurA/AppData/Local/gh-cli/bin/gh (authenticated)
- Backend: Koyeb (https://app.koyeb.com) — deploys from GitHub main branch, backend/ directory, Dockerfile
- Frontend deploy: Vercel — https://crowe-keystone.vercel.app (live)
- Frontend dev port: 3002 (3000/3001 occupied)
- Phase 2 migration: 002_phase2 (head) — approvals + conflicts tables live

## Next Steps After Phase 2

1. Verify Phase 2 checklist (all 19 items)
2. Commit Phase 2 code + push to GitHub
3. Immediately begin Phase 3: Living PRD System

---
*State initialized: 2026-03-07*
*Phase 1 complete. Phase 2 agents running.*
