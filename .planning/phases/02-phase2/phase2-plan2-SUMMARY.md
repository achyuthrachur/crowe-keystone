---
phase: 2
plan: 2
subsystem: platform
tags: [theme, auth, vercel, install, push-notifications, migration]
dependency-graph:
  requires: [phase1-foundation, phase7-settings]
  provides: [light-mode, real-auth, vercel-oauth, install-page, push-typed-helpers]
  affects: [frontend-layout, backend-auth, push-notifications, project-model]
tech-stack:
  added: [qrcode.react, resend-email-service, vercel-oauth]
  patterns: [zustand-persist, anti-fouc-script, data-theme-attribute, typed-push-helpers]
key-files:
  created:
    - frontend/src/stores/theme.store.ts
    - frontend/src/components/layout/ThemeInitializer.tsx
    - frontend/src/components/layout/ThemeToggle.tsx
    - frontend/src/components/layout/OnboardingBanner.tsx
    - frontend/src/app/install/page.tsx
    - frontend/src/app/(auth)/register/page.tsx
    - frontend/src/app/(app)/settings/connected-apps/page.tsx
    - frontend/src/app/api/auth/vercel/callback/route.ts
    - backend/src/models/invitation.py
    - backend/src/routers/integrations.py
    - backend/src/services/email_service.py
    - backend/src/services/vercel_service.py
    - backend/alembic/versions/005_phase2_platform.py
    - backend/tests/test_phase9.py
    - frontend/tests/e2e/phase9-theme.spec.ts
    - frontend/tests/e2e/phase9-install.spec.ts
    - frontend/tests/e2e/phase9-auth.spec.ts
    - frontend/tests/e2e/phase9-settings.spec.ts
  modified:
    - frontend/src/app/globals.css
    - frontend/src/app/layout.tsx
    - frontend/src/lib/motion.ts
    - frontend/src/components/layout/TopBar.tsx
    - frontend/src/components/layout/Sidebar.tsx
    - frontend/src/components/mobile/MobileLayout.tsx
    - frontend/src/components/mobile/BottomNav.tsx
    - frontend/src/components/projects/ProjectCard.tsx
    - frontend/src/app/(app)/settings/team/page.tsx
    - frontend/src/app/(auth)/login/page.tsx
    - backend/src/models/user.py
    - backend/src/models/project.py
    - backend/src/models/__init__.py
    - backend/src/routers/auth.py
    - backend/src/schemas/auth.py
    - backend/src/services/push_service.py
    - backend/src/config.py
    - backend/src/main.py
    - backend/alembic/env.py
decisions:
  - ThemePreference stored in Zustand persist (localStorage key keystone-theme); anti-FOUC script in layout.tsx head reads same key before React hydration
  - Registration open by default (REGISTRATION_MODE=open); first user gets admin role and auto-creates a team from their email domain
  - Vercel OAuth state store in-memory dict — acceptable for single-worker Koyeb deployment; migrate to Redis if scaling later
  - alembic env.py updated to use _build_asyncpg_url + ssl_context to fix sslmode connect error during migrations
  - qrcode.react required .next cache clear + new dev port (3003) due to stale webpack chunk 548.js after package install
  - Next.js (auth) route group exposes routes as /login and /register (no /auth/ prefix) — test specs updated accordingly
metrics:
  duration: 6h
  completed: "2026-03-10"
  tasks: 30
  files: 41
---

# Phase 2 Plan 2: Platform Polish — Light Mode, Real Auth, Vercel Integration Summary

Light/dark/system theme with anti-FOUC, real POST /auth/register + invite flow, Vercel OAuth project import, /install PWA guide page, and typed push notification helpers across all 4 trigger types.

## What Was Built

### Sub-Phase A: Theme System
- `theme.store.ts` — Zustand persisted store with `preference` (dark/light/system) and `resolved` (computed)
- `ThemeInitializer.tsx` — client component that calls `initTheme()` on mount, wires system media query listener
- `ThemeToggle.tsx` — animated sun/moon button with AnimatePresence, aria-label for accessibility
- Anti-FOUC inline script in `layout.tsx` head — reads localStorage before React hydration, sets `data-theme` on `<html>`
- Light theme CSS vars in `globals.css` under `[data-theme="light"]` — covers all surface, text, border, shadow tokens
- React Flow light mode overrides for graph page
- Theme selector (dark/light/system buttons) added to /settings page
- ThemeToggle added to TopBar and MobileTopBar

### Sub-Phase D: /install Page
- Full-page PWA installation guide at `/install` (no auth required)
- QRCodeSVG showing live app URL with amber pulse animation
- iOS (Safari) and Android (Chrome) step-by-step instructions with tab switcher
- OS/browser detection via navigator.userAgent to default to correct tab
- iOS+Chrome warning with copy-URL button
- Notification type grid (approval requests, conflicts, checkpoints, daily briefs)
- Install App link in Sidebar; Install tab in BottomNav (hidden when PWA is standalone)

### Sub-Phase B: Real Auth
- DB migration 005: invitations table, user vercel fields, user email_verified, project vercel fields
- `Invitation` model + imports in `__init__.py`
- `POST /auth/register` — creates user, auto-creates team for first user, validates invite token, sends welcome email
- `GET /auth/invite/{token}` — returns invitation preview (team_name, role, invited_by_name)
- Updated `POST /auth/invite` — creates real DB record, sends email via Resend, returns invitation_id
- `email_service.py` — Resend integration (falls back to console log when RESEND_API_KEY not set)
- Register page at `/register` — split-panel dark/light design, password strength meter, invite token pre-fill
- Login page redesigned — split-panel, real POST /auth/login, stores JWT to localStorage
- `OnboardingBanner` on projects page — first-time user onboarding checklist (Connect Vercel, Invite team, Install app)

### Sub-Phase C: Vercel Integration
- `vercel_service.py` — OAuth token exchange, user fetch, paginated project fetch, import to DB
- `integrations.py` router — 5 endpoints: auth-url, status, callback, sync, disconnect
- Registered in `main.py` under `/api/v1/integrations`
- `/api/auth/vercel/callback/route.ts` — Next.js API route to relay OAuth redirect
- `/settings/connected-apps` page — shows connection status, Connect Vercel button, Sync Now, Disconnect
- Vercel badge on ProjectCard for imported projects

### Sub-Phase E: Push Notifications
- 4 new typed helpers in `push_service.py`:
  - `push_approval_request(assignee_id, project_name, target_stage, approval_id, db)`
  - `push_conflict_detected(team_id, project_a_name, project_b_name, conflict_id, db)`
  - `push_daily_brief(user_id, active_count, approval_count, db)`
  - `push_agent_checkpoint(user_id, project_name, agent_type, project_id, run_id, db)`
- `send_push_to_user` generic helper added

## Test Results

| Suite | Tests | Result |
|-------|-------|--------|
| Backend test_phase9.py | 5 | 5 passed |
| Backend test_phase8.py | 4 | 4 passed |
| Frontend phase9-theme.spec.ts | 7 | 7 passed |
| Frontend phase9-install.spec.ts | 7 | 7 passed |
| Frontend phase9-auth.spec.ts | 7 | 7 passed |
| Frontend phase9-settings.spec.ts | 4 | 4 passed |
| TypeScript typecheck | - | PASSED |
| ESLint | - | PASSED (warnings only) |
| Production build | - | PASSED |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] alembic env.py failed with sslmode error**
- **Found during:** B14 — `alembic upgrade head`
- **Issue:** asyncpg connect() received unexpected keyword `sslmode` from URL
- **Fix:** Updated `env.py` to import and use `_build_asyncpg_url()` and ssl context from `src.database`, matching the app's pattern
- **Files modified:** `backend/alembic/env.py`
- **Commit:** 8c3c6b7

**2. [Rule 3 - Blocking] Stale webpack chunk 548.js after npm install qrcode.react**
- **Found during:** D6 — /install page tests
- **Issue:** Old dev server had stale `.next` build artifacts; after installing qrcode.react the chunk was missing
- **Fix:** Cleared `.next` cache, started fresh dev server on port 3003 (old port 3002 still occupied by Windows process)
- **Files modified:** `frontend/playwright.config.ts` — added `PLAYWRIGHT_BASE_URL` env var support

**3. [Rule 1 - Bug] Next.js (auth) route group URL path mismatch**
- **Found during:** B16 — phase9-auth.spec.ts test failures
- **Issue:** Tests used `/auth/login` and `/auth/register`, but Next.js App Router route groups strip the `(auth)` segment — routes are actually `/login` and `/register`
- **Fix:** Updated test spec URLs from `/auth/login` to `/login`, `/auth/register` to `/register`
- **Files modified:** `frontend/tests/e2e/phase9-auth.spec.ts`
- **Commit:** 8c3c6b7

**4. [Rule 1 - Bug] Theme settings test strict mode violation**
- **Found during:** A10 — phase9-theme.spec.ts
- **Issue:** `getByRole('button', { name: /light/i })` matched both ThemeToggle (aria-label "Switch to light mode") and settings button (text "light")
- **Fix:** Changed to `{ name: 'light', exact: true }` for all 3 theme preference buttons
- **Files modified:** `frontend/tests/e2e/phase9-theme.spec.ts`
- **Commit:** 8c3c6b7

**5. [Rule 2 - Missing] Team.slug field required**
- **Found during:** B9 — register endpoint implementation
- **Issue:** Team model has a `slug` field (unique, not nullable) not mentioned in plan — need to generate a slug when creating first user's team
- **Fix:** Generate slug as `{domain_slug}-{hex_token}` using `re.sub` and `secrets.token_hex(4)`
- **Files modified:** `backend/src/routers/auth.py`
- **Commit:** 8c3c6b7

## Self-Check: PASSED

Key files verified:
- `frontend/src/stores/theme.store.ts` — exists
- `frontend/src/app/install/page.tsx` — exists
- `frontend/src/app/(auth)/register/page.tsx` — exists
- `frontend/src/app/(app)/settings/connected-apps/page.tsx` — exists
- `backend/src/models/invitation.py` — exists
- `backend/src/routers/integrations.py` — exists
- `backend/alembic/versions/005_phase2_platform.py` — exists
- Migration applied — `alembic upgrade head` ran successfully
- Commit hash: `8c3c6b7`
- Deployed: `https://crowe-keystone.vercel.app`
