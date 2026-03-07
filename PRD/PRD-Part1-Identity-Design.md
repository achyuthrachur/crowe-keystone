# Crowe Keystone — PRD Part 1 of 7
## Identity, Philosophy, Design System, Multi-Agent Terminal Guide
### Version 2.0 | March 2026 | Achyuth Rachur

---

> **READING ORDER FOR CODING AGENTS:**
> PRD-Part1 → PRD-Part2 → PRD-Part3 → PRD-Part4 → PRD-Part5 → PRD-Part6 → PRD-Part7
> Read ALL parts before writing ANY code.
> Read CLAUDE.md (root + your domain). Read WORKFLOWS.md.
> Do not start Phase N until Phase N-1 checklist is fully verified.

---

# SECTION 0 — THE TERMINAL QUESTION

This is the most important operational question for this build.
Read it once. The phase specs then handle everything automatically.

## How Claude Code Multi-Agent Works — The Definitive Answer

### Short answer: ONE terminal window for most of this build.

Claude Code manages parallel agents internally via the Task tool. You open one
Claude Code session, paste the phase kickoff prompt, and Claude Code spawns the
subagents, runs them in parallel, collects results, and reports back.
You do not manually open multiple terminals for standard phases.

### The three approaches and exactly when to use each

---

**APPROACH 1 — SUBAGENTS (1 terminal, standard)**

Claude Code spawns helper agents using the Task tool internally.
Each subagent has focused scope, bounded context, reports results back
to the orchestrating session. You see the orchestrator coordinate them.

HOW TO START:
```bash
cd crowe-keystone
claude
# Then paste the phase kickoff prompt
```

USE FOR: Phases 1, 2, 3, 4, 7, 8
These phases have clear domain separation (frontend/backend/schema/tests)
where the domains are not so large that context window becomes the bottleneck.

WHAT YOU SEE IN THE TERMINAL:
```
[Orchestrator] Reading PRD Phase 1...
[Orchestrator] Spawning Schema Agent (Agent A)...
[Agent A] Writing Alembic migrations...
[Agent A] Complete. 10 tables migrated successfully.
[Orchestrator] Schema complete. Spawning Agents B, C, D, E in parallel...
[Agent B] Writing FastAPI routers...
[Agent C] Building web frontend...
[Agent D] Building mobile layout...
[Agent E] Writing PWA files...
[Agent B] Complete.
[Agent C] Complete.
...
```

---

**APPROACH 2 — AGENT TEAMS (1 terminal, experimental)**

Multiple Claude Code instances running as a team inside one terminal.
One session is the Team Lead. Teammates run as background processes.
Teammates can communicate with each other directly — unlike subagents
which can only report back to the main session.

HOW TO ENABLE AND START:
```bash
# Add to your shell environment (Git Bash on Windows):
export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1

# Or set in settings.json:
# { "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1" }

cd crowe-keystone
claude
# Then paste the phase kickoff prompt
```

USE FOR: Phase 5 (LangGraph) and Phase 6 (Agent Integration)
These phases have 5+ distinct domains where direct teammate-to-teammate
communication has real value. Example: the Schema Teammate can tell the
LangGraph Teammate "state.py is finalized, you can start" without
going through the Team Lead.

KNOWN LIMITATIONS (as of March 2026):
- Session resumption is experimental — if a teammate crashes, restart the team
- Coordination overhead is higher than subagents — use only when justified
- Shutdown behavior can be unpredictable — always explicitly wind down teammates

---

**APPROACH 3 — GIT WORKTREES (2-3 terminals, maximum parallelism)**

Multiple separate Claude Code sessions, each in their own git worktree
(separate directory checkout of the same repo, separate branch).
Each session has completely isolated context window and file system view.

HOW TO SET UP (3 terminal windows):
```bash
# Terminal 1 — Backend work
cd crowe-keystone
git worktree add ../keystone-backend-p5 phase5-backend
cd ../keystone-backend-p5
claude
# This session works only on /backend

# Terminal 2 — Frontend work  
cd crowe-keystone
git worktree add ../keystone-frontend-p5 phase5-frontend
cd ../keystone-frontend-p5
claude
# This session works only on /frontend

# Terminal 3 — Test/integration work (optional)
cd crowe-keystone
git worktree add ../keystone-tests-p5 phase5-tests
cd ../keystone-tests-p5
claude

# When all complete:
git worktree remove ../keystone-backend-p5
git worktree remove ../keystone-frontend-p5
git merge phase5-backend phase5-frontend
```

USE FOR: Optional upgrade to Approach 2 for Phases 5-6 if you want
maximum parallelism and are comfortable managing multiple terminals.

WHEN WORKTREES BEAT AGENT TEAMS:
- You want to be able to review/interact with one branch while another runs
- One domain is much larger and you don't want it competing for context
- You want to run `npm run dev` in one window while building backend in another

---

### Phase-by-Phase Terminal Strategy

| Phase | Approach | Terminals | Why |
|-------|----------|-----------|-----|
| 1 — Foundation | Subagents | 1 | Clear domain split, not context-heavy |
| 2 — Stage + Approvals + Push | Subagents | 1 | Well-defined APIs between domains |
| 3 — Living PRD | Subagents | 1 | PRD system is one coherent feature |
| 4 — React Flow Graph | Subagents | 1 | Frontend-heavy but bounded |
| 5 — LangGraph Engine | Agent Teams OR Worktrees | 1 (or 2-3) | 6 domains, direct coordination valuable |
| 6 — Agent Integration | Agent Teams OR Worktrees | 1 (or 2-3) | Frontend + Backend + E2E testing |
| 7 — Integrations | Subagents | 1 | Feature-by-feature, sequential |
| 8 — Polish + PWA Audit | Subagents | 1 | Mostly audits and fixes |

**Recommendation for first-time run:** Use Subagents (Approach 1) for ALL phases.
Switch to Agent Teams for Phase 5 only if Approach 1 feels too slow.
Worktrees are for when you want to actively participate in multiple streams.

---

# SECTION 1 — PROJECT IDENTITY

## 1.1 Identity Table

| Field | Value |
|-------|-------|
| **Name** | Crowe Keystone |
| **Tagline** | Where AI teams build together |
| **Repo** | `achyuthrachur/crowe-keystone` |
| **Frontend URL** | `https://crowe-keystone.vercel.app` |
| **Backend URL** | `https://crowe-keystone-api.railway.app` |
| **Frontend Stack** | Next.js 15 · TypeScript 5 · Tailwind CSS 3 · shadcn/ui · React Flow (@xyflow/react) · Framer Motion · Geist Sans · Geist Mono · Plus Jakarta Sans · Zustand · NextAuth.js |
| **Backend Stack** | Python 3.11 · FastAPI · LangGraph · LangChain · SQLAlchemy (async) · Alembic · Pydantic v2 · Anthropic SDK · pywebpush · sentence-transformers |
| **Database** | PostgreSQL via Vercel Postgres |
| **Mobile** | Progressive Web App (PWA) — same codebase, installable on iPhone Safari + Android Chrome |
| **Push Notifications** | Web Push API (VAPID keys) — buzzes phone when app is backgrounded |
| **AI Models** | GPT-5.4 (all LangGraph agents) via OpenAI API |
| **Deployment** | Vercel (frontend + Postgres) · Railway (Python backend, single worker for SSE) |

## 1.2 What Keystone Is (one paragraph for every agent to internalize)

Keystone is an AI-native operating system for teams building AI products.
It replaces scattered Slack threads, stale docs, and verbal approvals
with a single living graph of everything the team is building — every idea,
every PRD, every decision, every conflict, every approval.

The AI doesn't assist with the work. It participates in it. It drafts PRDs,
writes daily updates, detects conflicts before they cost a week of rework,
routes approvals with full context, and builds institutional memory so the
team never re-litigates the same decision twice. It also buzzes your phone
when something needs you — no email required.

The team focuses on building. Keystone handles coordination.

## 1.3 The Eight Non-Negotiable Design Principles

1. **The AI is a participant, not a tool.** It does work, not suggestions.
2. **Every stage transition is explicit and documented.** Nothing advances silently.
3. **The graph is always visible.** Users see the state of everything at all times.
4. **Conflicts surface before they cost time.** The detector runs continuously.
5. **The tool gets smarter over time.** Every decision feeds institutional memory.
6. **Zero coordination overhead.** The system handles what currently requires meetings.
7. **Phone-first parity.** Every feature works on a phone. Push notifications replace email.
8. **Geist everywhere.** Clean, technical, premium. Not a corporate tool.

---

# SECTION 2 — DESIGN SYSTEM

## 2.1 Typography — The Geist Decision

Explicit departure from Crowe's Helvetica Now brand.
Keystone is a developer tool, not a client deliverable.
It must feel like the premium tools developers actually want to use.

| Role | Font | Where Used |
|------|------|-----------|
| Body / UI | **Geist Sans** | All body text, labels, nav items, form fields, buttons |
| Display / Hero | **Plus Jakarta Sans** | Large headings (h1-h2), welcome screen, empty states, onboarding |
| Monospace | **Geist Mono** | Code blocks, node IDs, technical values, PRD version numbers, timestamps in build log |

**Why Geist over Inter:**
Inter is everywhere in 2026. Geist is specifically made for developer-centric
interfaces by Vercel. Shorter ascenders/descenders, squarish shapes with softly
bent arcs, technical sophistication. It's also Next.js 15's default font,
so it ships with zero configuration overhead.

**Why Plus Jakarta Sans for display:**
Geist at large display sizes (48px+) feels too neutral. Plus Jakarta Sans has
personality at large sizes while complementing Geist at body size.

```tsx
// frontend/src/app/layout.tsx
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { Plus_Jakarta_Sans } from 'next/font/google';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['400', '500', '600', '700', '800'],
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`
      ${GeistSans.variable}
      ${GeistMono.variable}
      ${plusJakarta.variable}
    `}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
```

```typescript
// frontend/tailwind.config.ts — fontFamily extension
fontFamily: {
  sans:    ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
  mono:    ['var(--font-geist-mono)', 'Consolas', 'monospace'],
  display: ['var(--font-display)', 'var(--font-geist-sans)', 'system-ui'],
},
```

## 2.2 Color System

Dark-first design throughout. Every color is a CSS custom property.
Never use raw hex values in className strings in JSX.
Always reference via CSS variables or Tailwind tokens that map to them.

```css
/* frontend/src/app/globals.css */
:root {
  /* ── PAGE SURFACES ─────────────────────────────────────── */
  --surface-base:       #0a0f1a;   /* Page background — deep indigo-tinted black */
  --surface-elevated:   #0f1623;   /* Cards, panels — slightly lifted */
  --surface-overlay:    #141d2e;   /* Modals, popovers */
  --surface-input:      #1a2438;   /* Input backgrounds */
  --surface-hover:      #1f2b40;   /* Hover states on interactive elements */
  --surface-selected:   #243350;   /* Active/selected items */

  /* ── CROWE BRAND ────────────────────────────────────────── */
  --indigo-dark:        #011E41;
  --indigo-core:        #002E62;
  --indigo-bright:      #003F9F;
  --indigo-glow:        rgba(0, 63, 159, 0.15);

  --amber-core:         #F5A800;   /* PRIMARY brand color for Keystone */
  --amber-dark:         #D7761D;
  --amber-bright:       #FFD231;
  --amber-glow:         rgba(245, 168, 0, 0.12);
  --amber-glow-strong:  rgba(245, 168, 0, 0.25);

  /* ── SEMANTIC STATUS COLORS ─────────────────────────────── */
  --teal:               #05AB8C;   /* Success, Approved, Shipped */
  --teal-glow:          rgba(5, 171, 140, 0.12);

  --violet:             #B14FC5;   /* Approval Router agent, Review stage */
  --violet-glow:        rgba(177, 79, 197, 0.12);

  --blue:               #0075C9;   /* In Build, Update Writer agent */
  --blue-glow:          rgba(0, 117, 201, 0.12);

  --coral:              #E5376B;   /* Conflicts, errors, blocking issues */
  --coral-glow:         rgba(229, 55, 107, 0.12);

  --orange:             #F97316;   /* Review stage, non-blocking warnings */
  --orange-glow:        rgba(249, 115, 22, 0.12);

  /* ── TEXT ───────────────────────────────────────────────── */
  --text-primary:       #f0f4ff;   /* Primary content on dark backgrounds */
  --text-secondary:     #8892a4;   /* Secondary, muted, supporting text */
  --text-tertiary:      #4a5568;   /* Placeholders, disabled states */
  --text-inverse:       #0a0f1a;   /* Text on amber/light backgrounds */

  /* ── BORDERS ────────────────────────────────────────────── */
  --border-subtle:      rgba(255, 255, 255, 0.06);
  --border-default:     rgba(255, 255, 255, 0.10);
  --border-strong:      rgba(255, 255, 255, 0.18);
  --border-amber:       rgba(245, 168, 0, 0.30);
  --border-teal:        rgba(5, 171, 140, 0.30);
  --border-coral:       rgba(229, 55, 107, 0.30);
  --border-violet:      rgba(177, 79, 197, 0.30);
  --border-blue:        rgba(0, 117, 201, 0.30);
  --border-orange:      rgba(249, 115, 22, 0.30);

  /* ── SHADOWS ────────────────────────────────────────────── */
  --shadow-sm:          0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3);
  --shadow-md:          0 4px 12px rgba(0,0,0,0.5), 0 2px 4px rgba(0,0,0,0.3);
  --shadow-lg:          0 8px 24px rgba(0,0,0,0.6), 0 4px 8px rgba(0,0,0,0.4);
  --shadow-amber:       0 0 20px rgba(245,168,0,0.2), 0 0 40px rgba(245,168,0,0.08);
  --shadow-teal:        0 0 20px rgba(5,171,140,0.2), 0 0 40px rgba(5,171,140,0.08);
  --shadow-coral:       0 0 20px rgba(229,55,107,0.2), 0 0 40px rgba(229,55,107,0.08);
}
```

**Stage Color Map — import from `@/lib/stage-colors.ts` everywhere:**
```typescript
// frontend/src/lib/stage-colors.ts
export const STAGE_COLORS = {
  spark:         { bg: 'var(--amber-glow)',   border: 'var(--border-amber)',   text: 'var(--amber-core)',  icon: '✦' },
  brief:         { bg: 'var(--orange-glow)',  border: 'var(--border-orange)',  text: '#F97316',            icon: '◈' },
  draft_prd:     { bg: 'var(--blue-glow)',    border: 'var(--border-blue)',    text: 'var(--blue)',         icon: '◎' },
  review:        { bg: 'var(--violet-glow)',  border: 'var(--border-violet)',  text: 'var(--violet)',       icon: '◇' },
  approved:      { bg: 'var(--teal-glow)',    border: 'var(--border-teal)',    text: 'var(--teal)',         icon: '◉' },
  in_build:      { bg: 'var(--blue-glow)',    border: 'var(--border-blue)',    text: 'var(--blue)',         icon: '⬡' },
  shipped:       { bg: 'var(--teal-glow)',    border: 'var(--border-teal)',    text: 'var(--teal)',         icon: '✓' },
  retrospective: { bg: 'var(--amber-glow)',   border: 'var(--border-amber)',   text: 'var(--amber-core)',  icon: '◍' },
} as const;

export type Stage = keyof typeof STAGE_COLORS;
```

## 2.3 Animation System

All animation variants live in `frontend/src/lib/motion.ts`.
**RULE: Never create inline animation objects in components.
Always import from this file. Add new patterns here when needed.**

```typescript
// frontend/src/lib/motion.ts
import type { Variants, Transition } from 'framer-motion';

export const EASING = {
  out:          [0.16, 1, 0.3, 1] as const,
  in:           [0.7, 0, 0.84, 0] as const,
  inOut:        [0.65, 0, 0.35, 1] as const,
  spring:       { type: 'spring', stiffness: 400, damping: 30 } as Transition,
  springGentle: { type: 'spring', stiffness: 200, damping: 25 } as Transition,
  springBouncy: { type: 'spring', stiffness: 500, damping: 20 } as Transition,
};

export const DURATION = {
  instant:  0.075,
  fast:     0.15,
  normal:   0.25,
  slow:     0.35,
  slower:   0.5,
};

// Page-level entrance (used in every route's root motion.div)
export const pageVariants: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: DURATION.slow, ease: EASING.out } },
  exit:    { opacity: 0, y: -4, transition: { duration: DURATION.fast, ease: EASING.in } },
};

// Card and panel entrance
export const cardVariants: Variants = {
  initial: { opacity: 0, scale: 0.97, y: 12 },
  animate: { opacity: 1, scale: 1, y: 0, transition: { duration: DURATION.normal, ease: EASING.out } },
};

// Staggered list — put on the container
export const listContainerVariants: Variants = {
  animate: { transition: { staggerChildren: 0.06 } },
};

// Staggered list item — web (slides from left)
export const listItemVariants: Variants = {
  initial: { opacity: 0, x: -8 },
  animate: { opacity: 1, x: 0, transition: { duration: DURATION.normal, ease: EASING.out } },
};

// Staggered list item — mobile (fades up)
export const mobileListItemVariants: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: DURATION.normal, ease: EASING.out } },
};

// Toast / notification slides in from right
export const notificationVariants: Variants = {
  initial: { opacity: 0, x: 48, scale: 0.95 },
  animate: { opacity: 1, x: 0, scale: 1, transition: EASING.spring },
  exit:    { opacity: 0, x: 48, scale: 0.95, transition: { duration: DURATION.fast } },
};

// Node changes stage — used on React Flow nodes
export const stageTransitionVariants: Variants = {
  initial: { opacity: 0, scale: 0.9, filter: 'blur(4px)' },
  animate: { opacity: 1, scale: 1, filter: 'blur(0px)', transition: { duration: DURATION.slow, ease: EASING.out } },
  exit:    { opacity: 0, scale: 1.05, filter: 'blur(2px)', transition: { duration: DURATION.normal, ease: EASING.in } },
};

// Conflict badge pulsing (infinite, on coral elements)
export const conflictPulseVariants: Variants = {
  animate: {
    scale: [1, 1.05, 1],
    boxShadow: [
      '0 0 0 0 rgba(229,55,107,0)',
      '0 0 0 6px rgba(229,55,107,0.2)',
      '0 0 0 0 rgba(229,55,107,0)',
    ],
    transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
  },
};

// Agent thinking dots (use with index * 0.15 delay per dot)
export const agentDotVariants: Variants = {
  animate: {
    y: [0, -6, 0],
    transition: { duration: 0.6, repeat: Infinity, ease: 'easeInOut' },
  },
};

// Phone frame reveal on desktop preview mode
export const phoneFrameVariants: Variants = {
  initial: { opacity: 0, scale: 0.9, y: 20 },
  animate: { opacity: 1, scale: 1, y: 0, transition: { duration: DURATION.slower, ease: EASING.out } },
  exit:    { opacity: 0, scale: 0.95, y: 10, transition: { duration: DURATION.normal } },
};

// PRD section accordion expand/collapse
export const accordionVariants: Variants = {
  collapsed: { height: 0, opacity: 0, transition: { duration: DURATION.normal } },
  expanded:  { height: 'auto', opacity: 1, transition: { duration: DURATION.normal, ease: EASING.out } },
};

// Stage progress bar fill (on advance)
export const progressFillVariants: Variants = {
  initial: { width: '0%' },
  animate: { width: '100%', transition: { duration: 0.6, ease: EASING.out } },
};

// ViewportToggle indicator — use with layoutId="viewport-indicator"
export const viewportIndicatorTransition: Transition = {
  type: 'spring', stiffness: 400, damping: 30,
};

// Swipe card threshold for mobile approve/reject
export const SWIPE_THRESHOLD = 120; // px

// Mobile tap feedback for interactive elements
export const tapVariants = {
  tap: { scale: 0.97, transition: { duration: DURATION.instant } },
};

// Bottom nav item tap
export const navTapVariants = {
  tap: { scale: 0.92, transition: { duration: DURATION.instant } },
};
```

## 2.4 Tailwind Config (critical sections)

```typescript
// frontend/tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans:    ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        mono:    ['var(--font-geist-mono)', 'Consolas', 'monospace'],
        display: ['var(--font-display)', 'var(--font-geist-sans)', 'system-ui'],
      },
      colors: {
        crowe: {
          amber:      '#F5A800',
          'amber-dk': '#D7761D',
          teal:       '#05AB8C',
          violet:     '#B14FC5',
          blue:       '#0075C9',
          coral:      '#E5376B',
          orange:     '#F97316',
          indigo:     '#002E62',
        },
        surface: {
          base:     'var(--surface-base)',
          elevated: 'var(--surface-elevated)',
          overlay:  'var(--surface-overlay)',
          input:    'var(--surface-input)',
          hover:    'var(--surface-hover)',
          selected: 'var(--surface-selected)',
        },
      },
      screens: {
        xs: '375px',
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
        '2xl': '1536px',
      },
    },
  },
  plugins: [],
};
export default config;
```

## 2.5 Mobile CSS Foundation

These global styles go in `globals.css` and apply to the entire app.

```css
/* Prevent text resize on iOS orientation change */
html { -webkit-text-size-adjust: 100%; height: -webkit-fill-available; }
body { min-height: -webkit-fill-available; }

/* Remove iOS tap highlight */
* { -webkit-tap-highlight-color: transparent; }

/* Momentum scroll */
.scroll-momentum { -webkit-overflow-scrolling: touch; }

/* Prevent pull-to-refresh (conflicts with swipe gestures) */
body { overscroll-behavior-y: contain; }

/* Safe area helpers */
.safe-top    { padding-top:    env(safe-area-inset-top); }
.safe-bottom { padding-bottom: env(safe-area-inset-bottom); }
.safe-left   { padding-left:   env(safe-area-inset-left); }
.safe-right  { padding-right:  env(safe-area-inset-right); }

/* Horizontal scroll containers (stage filter, stack tags) */
.scroll-x {
  overflow-x: auto;
  overflow-y: hidden;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.scroll-x::-webkit-scrollbar { display: none; }

/* Dot grid background for graph and hero areas */
.bg-dots {
  background-image: radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px);
  background-size: 24px 24px;
}
```

---

*Continue reading: PRD-Part2-Repository-Database-API.md*
