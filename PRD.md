# Crowe Keystone — Master PRD
## AI-Native Operating System for AI Building Teams
### Version 1.0 | March 2026 | Achyuth Rachur, Crowe LLP AI Innovation Team

---

> **To the coding agent reading this:**
> Read CLAUDE.md and DESIGN.md in full before touching any code.
> Read WORKFLOWS.md to understand which agentic workflow to use for each phase.
> This PRD is your source of truth. When in doubt, re-read it.
> Do not begin Phase N until Phase N-1 checklist is fully verified.
> Every phase has a dedicated agent team specification. Spawn them as specified.

---

## PART 0 — PROJECT IDENTITY AND PHILOSOPHY

### 0.1 Project Identity

| Field | Value |
|-------|-------|
| **Name** | Crowe Keystone |
| **Tagline** | Where AI teams build together |
| **Repo** | `achyuthrachur/crowe-keystone` |
| **Frontend URL** | `https://crowe-keystone.vercel.app` |
| **Backend URL** | `https://crowe-keystone-api.railway.app` |
| **Stack** | Next.js 15 + TypeScript + Tailwind + shadcn + Geist + React Flow + Framer Motion |
| **Backend** | Python 3.11 + FastAPI + LangGraph + LangChain + PostgreSQL + Prisma |
| **AI** | Claude claude-sonnet-4-5 (all agents) + Claude Haiku (cheap nodes) |
| **Deployment** | Vercel (frontend) + Railway (backend) + Vercel Postgres (database) |

### 0.2 What Keystone Is

Keystone is an AI-native operating system for teams building AI products together.
It replaces the scattered reality of Slack threads, stale Google docs, and verbal
approvals with a single living graph of everything the team is building.

Every idea, every PRD, every decision, every conflict, every approval lives in
Keystone as a node in a LangGraph state graph. The AI doesn't assist with the
work — it participates in it. It drafts PRDs, writes updates, surfaces conflicts,
routes approvals, and builds institutional memory. The team focuses on building.
Keystone handles coordination.

### 0.3 The Non-Negotiable Design Principles

1. **The AI is a participant, not a tool.** It does work, not suggestions.
2. **Every stage transition is explicit and documented.** Nothing advances silently.
3. **The graph is visible.** Users see the state of everything at all times.
4. **Conflicts surface before they cost time.** The conflict detector runs continuously.
5. **The tool gets smarter.** Every decision feeds institutional memory.
6. **Zero coordination overhead.** The system handles what currently requires meetings.
7. **Geist everywhere.** Clean, technical, premium. No Helvetica. Not a corporate tool.

### 0.4 Typography — The Geist Decision

We are explicitly departing from Crowe's Helvetica Now brand for Keystone.
Keystone is a developer tool, not a client deliverable. It should feel like
the premium tools developers actually want to use.

**Primary:** Geist Sans — Vercel's open-source geometric sans-serif. Modern,
technical, Swiss-influenced without being cold. Variable font. Free under SIL OFL.
Native to Next.js 15 (it's the default font).

**Monospace:** Geist Mono — for code blocks, node IDs, technical values, PRD IDs.

**Display accent:** Plus Jakarta Sans — for hero text, large headings, the
welcome screen. Has personality that Geist Sans lacks at display sizes.

**Why Geist over Inter:** Inter is everywhere. Geist is specifically made for
developer-centric interfaces. It has shorter ascenders/descenders, squarish
touches with softly bent arcs, and a technical sophistication that matches
what Keystone is. It also makes a clear visual statement: this is not another
corporate consulting tool.

```tsx
// src/app/layout.tsx
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { Plus_Jakarta_Sans } from 'next/font/google';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['400', '500', '600', '700', '800'],
});

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`
        ${GeistSans.variable}
        ${GeistMono.variable}
        ${plusJakarta.variable}
      `}
    >
      <body className="font-sans">{children}</body>
    </html>
  );
}
```

**CSS Variables:**
```css
:root {
  --font-sans:    var(--font-geist-sans);
  --font-mono:    var(--font-geist-mono);
  --font-display: var(--font-plus-jakarta);
}
```

### 0.5 Color System

Keystone uses the Crowe brand palette but with a darker, more purposeful
application than typical Crowe tools. This is a power tool, not a marketing page.

```css
:root {
  /* ── PAGE SURFACES ─────────────────────────────────────────── */
  --surface-base:         #0a0f1a;   /* Near-black with deep indigo tint */
  --surface-elevated:     #0f1623;   /* Cards, panels — slightly lifted */
  --surface-overlay:      #141d2e;   /* Modals, popovers */
  --surface-input:        #1a2438;   /* Input backgrounds */
  --surface-hover:        #1f2b40;   /* Hover states */
  --surface-selected:     #243350;   /* Selected/active */
  --surface-light:        #f8f9fc;   /* Light mode page (for light mode toggle) */

  /* ── CROWE BRAND (adapted for dark-first design) ───────────── */
  --indigo-dark:    #011E41;
  --indigo-core:    #002E62;
  --indigo-bright:  #003F9F;
  --indigo-glow:    rgba(0, 63, 159, 0.15);

  --amber-core:     #F5A800;
  --amber-dark:     #D7761D;
  --amber-bright:   #FFD231;
  --amber-glow:     rgba(245, 168, 0, 0.12);
  --amber-glow-strong: rgba(245, 168, 0, 0.25);

  /* ── SEMANTIC STATUS COLORS ─────────────────────────────────── */
  --teal:           #05AB8C;   /* Success, Shipped, Approved */
  --teal-glow:      rgba(5, 171, 140, 0.12);
  --violet:         #B14FC5;   /* Approval Router agent */
  --violet-glow:    rgba(177, 79, 197, 0.12);
  --blue:           #0075C9;   /* Update Writer agent, In Build */
  --blue-glow:      rgba(0, 117, 201, 0.12);
  --coral:          #E5376B;   /* Conflicts, errors, blocking */
  --coral-glow:     rgba(229, 55, 107, 0.12);
  --orange:         #F97316;   /* Review stage, warnings */
  --orange-glow:    rgba(249, 115, 22, 0.12);

  /* ── TEXT ──────────────────────────────────────────────────── */
  --text-primary:   #f0f4ff;   /* Primary text on dark */
  --text-secondary: #8892a4;   /* Secondary, muted */
  --text-tertiary:  #4a5568;   /* Placeholders, disabled */
  --text-inverse:   #0a0f1a;   /* Text on amber/light backgrounds */

  /* ── BORDERS ───────────────────────────────────────────────── */
  --border-subtle:  rgba(255, 255, 255, 0.06);
  --border-default: rgba(255, 255, 255, 0.10);
  --border-strong:  rgba(255, 255, 255, 0.18);
  --border-amber:   rgba(245, 168, 0, 0.30);
  --border-teal:    rgba(5, 171, 140, 0.30);
  --border-coral:   rgba(229, 55, 107, 0.30);

  /* ── SHADOWS ───────────────────────────────────────────────── */
  --shadow-sm:      0 1px 3px rgba(0, 0, 0, 0.4), 0 1px 2px rgba(0, 0, 0, 0.3);
  --shadow-md:      0 4px 12px rgba(0, 0, 0, 0.5), 0 2px 4px rgba(0, 0, 0, 0.3);
  --shadow-lg:      0 8px 24px rgba(0, 0, 0, 0.6), 0 4px 8px rgba(0, 0, 0, 0.4);
  --shadow-amber:   0 0 20px rgba(245, 168, 0, 0.2), 0 0 40px rgba(245, 168, 0, 0.08);
  --shadow-teal:    0 0 20px rgba(5, 171, 140, 0.2), 0 0 40px rgba(5, 171, 140, 0.08);
  --shadow-coral:   0 0 20px rgba(229, 55, 107, 0.2), 0 0 40px rgba(229, 55, 107, 0.08);
}
```

**Stage Colors — these are used throughout the UI consistently:**
```typescript
export const STAGE_COLORS = {
  spark:        { bg: 'var(--amber-glow)',  border: 'var(--border-amber)', text: 'var(--amber-core)',  icon: '✦' },
  brief:        { bg: 'var(--orange-glow)', border: 'var(--border-orange)', text: '#F97316',           icon: '◈' },
  draft_prd:    { bg: 'var(--blue-glow)',   border: 'var(--border-blue)',   text: 'var(--blue)',        icon: '◎' },
  review:       { bg: 'var(--violet-glow)', border: 'var(--border-violet)', text: 'var(--violet)',      icon: '◇' },
  approved:     { bg: 'var(--teal-glow)',   border: 'var(--border-teal)',   text: 'var(--teal)',        icon: '◉' },
  in_build:     { bg: 'var(--blue-glow)',   border: 'var(--border-blue)',   text: 'var(--blue)',        icon: '⬡' },
  shipped:      { bg: 'var(--teal-glow)',   border: 'var(--border-teal)',   text: 'var(--teal)',        icon: '✓' },
  retrospective:{ bg: 'var(--amber-glow)',  border: 'var(--border-amber)', text: 'var(--amber-core)',  icon: '◍' },
} as const;
```

### 0.6 Animation System

**Core principle:** Motion communicates state change and system intelligence.
Every animation must have a functional reason. Nothing decorates.

```typescript
// src/lib/motion.ts — shared animation variants

export const EASING = {
  out:      [0.16, 1, 0.3, 1],        // Enter: fast start, soft landing
  in:       [0.7, 0, 0.84, 0],        // Exit: slow start, fast out
  spring:   { type: 'spring', stiffness: 400, damping: 30 },
  springGentle: { type: 'spring', stiffness: 200, damping: 25 },
};

export const DURATION = {
  instant:  0.075,
  fast:     0.15,
  normal:   0.25,
  slow:     0.35,
  slower:   0.5,
};

// Page entrance
export const pageVariants = {
  initial:  { opacity: 0, y: 8 },
  animate:  { opacity: 1, y: 0, transition: { duration: DURATION.slow, ease: EASING.out } },
  exit:     { opacity: 0, y: -4, transition: { duration: DURATION.fast, ease: EASING.in } },
};

// Card / panel entrance
export const cardVariants = {
  initial:  { opacity: 0, scale: 0.97, y: 12 },
  animate:  { opacity: 1, scale: 1, y: 0, transition: { duration: DURATION.normal, ease: EASING.out } },
};

// Staggered list
export const listContainerVariants = {
  animate:  { transition: { staggerChildren: 0.06 } },
};
export const listItemVariants = {
  initial:  { opacity: 0, x: -8 },
  animate:  { opacity: 1, x: 0, transition: { duration: DURATION.normal, ease: EASING.out } },
};

// Notification / toast slide-in from right
export const notificationVariants = {
  initial:  { opacity: 0, x: 48, scale: 0.95 },
  animate:  { opacity: 1, x: 0, scale: 1, transition: EASING.spring },
  exit:     { opacity: 0, x: 48, scale: 0.95, transition: { duration: DURATION.fast } },
};

// Conflict badge pulse
export const conflictPulse = {
  animate: {
    scale: [1, 1.05, 1],
    boxShadow: [
      '0 0 0 0 rgba(229, 55, 107, 0)',
      '0 0 0 6px rgba(229, 55, 107, 0.2)',
      '0 0 0 0 rgba(229, 55, 107, 0)',
    ],
    transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
  },
};

// Stage transition — node moves between stages
export const stageTransitionVariants = {
  initial:  { opacity: 0, scale: 0.9, filter: 'blur(4px)' },
  animate:  {
    opacity: 1, scale: 1, filter: 'blur(0px)',
    transition: { duration: DURATION.slow, ease: EASING.out },
  },
  exit:     {
    opacity: 0, scale: 1.05, filter: 'blur(2px)',
    transition: { duration: DURATION.normal, ease: EASING.in },
  },
};

// Agent thinking indicator — amber glow pulse
export const agentThinkingVariants = {
  animate: {
    opacity: [0.4, 1, 0.4],
    transition: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' },
  },
};

// React Flow node highlight on conflict
export const nodeConflictAnimation = (nodeId: string) => ({
  borderColor: 'var(--coral)',
  boxShadow: 'var(--shadow-coral)',
  transition: { duration: 0.3 },
});
```

**Scroll behavior:**
All major sections use `IntersectionObserver` with a `useInView` hook.
Content animates in as it enters the viewport. This applies to:
- Dashboard project cards (staggered, 60ms between cards)
- PRD section blocks (fade up, 80ms stagger)
- Notification list items (slide from right, 40ms stagger)
- Conflict list items (slide from left, 50ms stagger)

```typescript
// src/hooks/useInView.ts
import { useEffect, useRef, useState } from 'react';

export function useInView(options = {}) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setInView(true); },
      { threshold: 0.1, ...options }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return { ref, inView };
}
```

---

## PART 1 — SYSTEM ARCHITECTURE

### 1.1 Repository Structure

```
crowe-keystone/                           ← Root monorepo
├── frontend/                             ← Next.js 15 app
│   ├── src/
│   │   ├── app/                          ← App Router routes
│   │   │   ├── (auth)/                   ← Auth group
│   │   │   │   ├── login/page.tsx
│   │   │   │   └── onboard/page.tsx
│   │   │   ├── (app)/                    ← Authenticated app
│   │   │   │   ├── layout.tsx            ← App shell with sidebar
│   │   │   │   ├── page.tsx              ← Dashboard (redirect to /projects)
│   │   │   │   ├── projects/
│   │   │   │   │   ├── page.tsx          ← Project list / portfolio view
│   │   │   │   │   └── [id]/
│   │   │   │   │       ├── page.tsx      ← Project detail with React Flow
│   │   │   │   │       ├── prd/page.tsx  ← Living PRD view
│   │   │   │   │       ├── build/page.tsx ← Build log
│   │   │   │   │       └── retro/page.tsx ← Retrospective
│   │   │   │   ├── graph/page.tsx        ← Portfolio-level React Flow graph
│   │   │   │   ├── inbox/page.tsx        ← All approvals + conflicts for user
│   │   │   │   ├── memory/page.tsx       ← Institutional memory browser
│   │   │   │   ├── daily/page.tsx        ← Today's brief
│   │   │   │   └── settings/
│   │   │   │       ├── page.tsx
│   │   │   │       ├── team/page.tsx
│   │   │   │       └── approval-chains/page.tsx
│   │   │   └── api/                      ← Next.js API routes (thin layer only)
│   │   │       ├── auth/[...nextauth]/route.ts
│   │   │       └── webhooks/             ← GitHub, Fireflies webhooks
│   │   ├── components/
│   │   │   ├── ui/                       ← shadcn components (Crowe themed)
│   │   │   ├── layout/
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   ├── TopBar.tsx
│   │   │   │   └── AppShell.tsx
│   │   │   ├── graph/                    ← React Flow components
│   │   │   │   ├── KeystoneGraph.tsx     ← Main graph canvas
│   │   │   │   ├── nodes/
│   │   │   │   │   ├── ProjectNode.tsx
│   │   │   │   │   ├── StageNode.tsx
│   │   │   │   │   ├── ConflictNode.tsx
│   │   │   │   │   ├── DecisionNode.tsx
│   │   │   │   │   └── AgentNode.tsx     ← Shows active agent processing
│   │   │   │   ├── edges/
│   │   │   │   │   ├── StageEdge.tsx
│   │   │   │   │   └── ConflictEdge.tsx
│   │   │   │   └── controls/
│   │   │   │       ├── GraphControls.tsx
│   │   │   │       └── MiniMap.tsx
│   │   │   ├── projects/
│   │   │   │   ├── ProjectCard.tsx
│   │   │   │   ├── StageBar.tsx
│   │   │   │   ├── SparkInput.tsx        ← Quick idea capture
│   │   │   │   └── ProjectList.tsx
│   │   │   ├── prd/
│   │   │   │   ├── PRDEditor.tsx
│   │   │   │   ├── PRDSection.tsx
│   │   │   │   ├── OpenQuestionBlock.tsx
│   │   │   │   ├── StressTestPanel.tsx   ← Hypothesis results
│   │   │   │   └── VersionDiff.tsx
│   │   │   ├── approvals/
│   │   │   │   ├── ApprovalRequest.tsx
│   │   │   │   ├── ApprovalChainView.tsx
│   │   │   │   └── ApprovalHistory.tsx
│   │   │   ├── conflicts/
│   │   │   │   ├── ConflictCard.tsx
│   │   │   │   ├── ConflictResolution.tsx
│   │   │   │   └── ConflictBadge.tsx
│   │   │   ├── agents/
│   │   │   │   ├── AgentPanel.tsx        ← Shows what an agent is doing live
│   │   │   │   ├── AgentThinking.tsx     ← Animated thinking indicator
│   │   │   │   └── AgentOutput.tsx       ← Structured agent output display
│   │   │   ├── memory/
│   │   │   │   ├── MemoryBrowser.tsx
│   │   │   │   ├── DecisionRecord.tsx
│   │   │   │   └── RetroSummary.tsx
│   │   │   └── daily/
│   │   │       ├── DailyBrief.tsx
│   │   │       └── BriefSection.tsx
│   │   ├── lib/
│   │   │   ├── api.ts                    ← Typed API client (calls backend)
│   │   │   ├── sse.ts                    ← SSE connection management
│   │   │   ├── motion.ts                 ← Animation variants (see above)
│   │   │   ├── stage-colors.ts           ← Stage color constants
│   │   │   └── utils.ts
│   │   ├── hooks/
│   │   │   ├── useInView.ts
│   │   │   ├── useSSE.ts                 ← Subscribe to backend SSE stream
│   │   │   ├── useProjectGraph.ts        ← React Flow state management
│   │   │   ├── useAgentStream.ts         ← Stream agent output live
│   │   │   └── useApprovals.ts
│   │   ├── stores/                       ← Zustand stores
│   │   │   ├── graph.store.ts            ← React Flow nodes/edges
│   │   │   ├── notifications.store.ts    ← Real-time notifications
│   │   │   └── agent.store.ts            ← Active agent runs
│   │   └── types/
│   │       ├── project.types.ts
│   │       ├── prd.types.ts
│   │       ├── agent.types.ts
│   │       └── graph.types.ts
│   ├── public/
│   │   ├── crowe-logo-white.svg
│   │   └── keystone-mark.svg             ← Custom Keystone logomark
│   ├── CLAUDE.md                         ← Frontend agent instructions
│   ├── next.config.ts
│   ├── tailwind.config.ts
│   ├── package.json
│   └── tsconfig.json
│
├── backend/                              ← Python FastAPI + LangGraph
│   ├── src/
│   │   ├── main.py                       ← FastAPI app entry point
│   │   ├── config.py                     ← Settings via pydantic-settings
│   │   ├── database.py                   ← SQLAlchemy + async engine
│   │   ├── state.py                      ← LangGraph TypedDict state definitions
│   │   ├── models/                       ← SQLAlchemy ORM models
│   │   │   ├── project.py
│   │   │   ├── prd.py
│   │   │   ├── approval.py
│   │   │   ├── conflict.py
│   │   │   ├── decision.py
│   │   │   └── memory.py
│   │   ├── schemas/                      ← Pydantic request/response schemas
│   │   │   ├── project.py
│   │   │   ├── prd.py
│   │   │   ├── agent.py
│   │   │   └── approval.py
│   │   ├── routers/                      ← FastAPI route handlers
│   │   │   ├── projects.py
│   │   │   ├── prds.py
│   │   │   ├── agents.py                 ← Triggers agent runs
│   │   │   ├── approvals.py
│   │   │   ├── conflicts.py
│   │   │   ├── memory.py
│   │   │   ├── daily.py
│   │   │   └── stream.py                 ← SSE endpoint
│   │   ├── graph/                        ← LangGraph definitions
│   │   │   ├── keystone_graph.py         ← Main graph assembler
│   │   │   ├── nodes/                    ← One file per node
│   │   │   │   ├── classifier.py
│   │   │   │   ├── brief_generator.py
│   │   │   │   ├── prd_drafter.py
│   │   │   │   ├── stress_tester.py
│   │   │   │   ├── assumption_excavator.py
│   │   │   │   ├── conflict_detector.py
│   │   │   │   ├── approval_router.py
│   │   │   │   ├── update_writer.py
│   │   │   │   ├── retro_generator.py
│   │   │   │   ├── memory_indexer.py
│   │   │   │   └── daily_brief_generator.py
│   │   │   └── prompts/                  ← System prompts, versioned
│   │   │       ├── brief_generator.md
│   │   │       ├── prd_drafter.md
│   │   │       ├── stress_tester.md
│   │   │       ├── conflict_detector.md
│   │   │       ├── approval_router.md
│   │   │       ├── update_writer.md
│   │   │       └── memory_indexer.md
│   │   ├── services/                     ← Business logic
│   │   │   ├── project_service.py
│   │   │   ├── stage_service.py          ← Stage transition logic
│   │   │   ├── conflict_service.py
│   │   │   ├── approval_service.py
│   │   │   └── memory_service.py
│   │   └── background/                   ← Background tasks
│   │       ├── conflict_scanner.py       ← Runs on project state changes
│   │       ├── daily_brief_scheduler.py  ← Runs at 7am per team member
│   │       └── github_sync.py            ← Parses commit logs
│   ├── alembic/                          ← Database migrations
│   ├── tests/
│   ├── CLAUDE.md                         ← Backend agent instructions
│   ├── requirements.txt
│   └── pyproject.toml
│
├── .claude/
│   └── agents/                           ← Custom Claude Code agents
│       ├── keystone-schema-validator.md
│       ├── keystone-graph-reviewer.md
│       ├── keystone-frontend-specialist.md
│       ├── keystone-test-writer.md
│       ├── keystone-security-auditor.md
│       ├── keystone-prompt-engineer.md
│       ├── keystone-migration-writer.md
│       └── keystone-sse-specialist.md
│
├── docs/
│   ├── KEYSTONE_OVERVIEW.md
│   ├── ARCHITECTURE.md
│   ├── LANGGRAPH_DESIGN.md
│   ├── REACT_FLOW_DESIGN.md
│   └── API_CONTRACTS.md
│
├── CLAUDE.md                             ← Root CLAUDE.md (applies to both)
├── WORKFLOWS.md                          ← This document
├── docker-compose.yml                    ← Local dev with Postgres
└── README.md
```

### 1.2 Database Schema (PostgreSQL via SQLAlchemy)

```sql
-- Users and Teams
CREATE TABLE teams (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  slug        TEXT UNIQUE NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           TEXT UNIQUE NOT NULL,
  name            TEXT NOT NULL,
  avatar_url      TEXT,
  team_id         UUID REFERENCES teams(id),
  role            TEXT NOT NULL DEFAULT 'builder',  -- builder, lead, admin
  timezone        TEXT DEFAULT 'America/Chicago',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Projects (work items at any stage)
CREATE TABLE projects (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id         UUID REFERENCES teams(id) NOT NULL,
  created_by      UUID REFERENCES users(id) NOT NULL,
  title           TEXT NOT NULL,
  description     TEXT,
  stage           TEXT NOT NULL DEFAULT 'spark',
    -- spark | brief | draft_prd | review | approved | in_build | shipped | retrospective
  stage_history   JSONB DEFAULT '[]',  -- array of {stage, timestamp, actor_id, note}
  spark_content   TEXT,                -- raw initial idea
  brief           JSONB,               -- structured brief object
  prd_id          UUID,                -- FK to prds table
  stack           TEXT[],              -- technology array
  effort_estimate TEXT,                -- S | M | L | XL
  assigned_to     UUID REFERENCES users(id),
  build_log       JSONB DEFAULT '[]',  -- array of {timestamp, content, source}
  metadata        JSONB DEFAULT '{}',  -- flexible extra data
  archived        BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- PRDs (living document objects)
CREATE TABLE prds (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id          UUID REFERENCES projects(id) NOT NULL,
  version             INTEGER NOT NULL DEFAULT 1,
  status              TEXT NOT NULL DEFAULT 'draft',
    -- draft | in_review | approved | superseded
  content             JSONB NOT NULL,   -- full structured PRD (see PRD schema below)
  open_questions      JSONB DEFAULT '[]',
  stress_test_results JSONB,            -- hypothesis test output
  assumption_audit    JSONB,            -- excavated assumptions
  claude_code_prompt  TEXT,             -- auto-generated kickoff prompt
  diff_from_previous  JSONB,            -- structured diff for reviewer
  word_count          INTEGER,
  created_by          UUID REFERENCES users(id),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Approvals
CREATE TABLE approvals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID REFERENCES projects(id) NOT NULL,
  prd_id          UUID REFERENCES prds(id),
  type            TEXT NOT NULL,
    -- stage_advance | architectural_decision | scope_change | deployment
  requested_by    UUID REFERENCES users(id) NOT NULL,
  assigned_to     UUID[] NOT NULL,      -- multiple reviewers
  status          TEXT NOT NULL DEFAULT 'pending',
    -- pending | approved | rejected | changes_requested | expired
  request_summary TEXT NOT NULL,        -- AI-generated context for reviewer
  decisions       JSONB DEFAULT '[]',   -- array of {user_id, decision, note, timestamp}
  deadline        TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  resolved_at     TIMESTAMPTZ
);

-- Conflicts
CREATE TABLE conflicts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id         UUID REFERENCES teams(id) NOT NULL,
  type            TEXT NOT NULL,
    -- assumption_mismatch | decision_contradiction | resource_overlap |
    -- scope_collision | architectural_divergence
  severity        TEXT NOT NULL DEFAULT 'advisory',  -- blocking | advisory
  project_a_id    UUID REFERENCES projects(id),
  project_b_id    UUID REFERENCES projects(id),
  description     TEXT NOT NULL,
  specific_conflict TEXT NOT NULL,
  resolution_options JSONB NOT NULL,    -- array of {option, implication}
  decision_required_from UUID REFERENCES users(id),
  status          TEXT NOT NULL DEFAULT 'open',  -- open | resolved | dismissed
  resolution      TEXT,
  detected_at     TIMESTAMPTZ DEFAULT NOW(),
  resolved_at     TIMESTAMPTZ
);

-- Decisions (institutional memory entries)
CREATE TABLE decisions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id         UUID REFERENCES teams(id) NOT NULL,
  project_id      UUID REFERENCES projects(id),
  type            TEXT NOT NULL,
    -- architectural | process | tool | scope | technology
  title           TEXT NOT NULL,
  rationale       TEXT NOT NULL,
  alternatives_considered TEXT[],
  made_by         UUID REFERENCES users(id),
  approved_by     UUID[] DEFAULT '{}',
  superseded_by   UUID REFERENCES decisions(id),
  tags            TEXT[] DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Retrospectives
CREATE TABLE retrospectives (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID REFERENCES projects(id) NOT NULL,
  built_vs_scoped JSONB,        -- comparison of actual vs. planned
  decisions_changed JSONB,      -- decisions that changed during build
  learnings       TEXT[],       -- extracted key learnings
  what_would_change TEXT[],     -- things to do differently
  quality_signals JSONB,        -- metrics from the build
  draft           TEXT,         -- AI-generated draft
  published       BOOLEAN DEFAULT FALSE,
  published_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Daily Briefs (generated and stored for each user per day)
CREATE TABLE daily_briefs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id) NOT NULL,
  date            DATE NOT NULL,
  content         JSONB NOT NULL,    -- structured brief sections
  delivered_via   TEXT[],            -- email | slack | in_app
  read_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Agent Runs (audit trail for all AI operations)
CREATE TABLE agent_runs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id         UUID REFERENCES teams(id) NOT NULL,
  agent_type      TEXT NOT NULL,
    -- brief_generator | prd_drafter | stress_tester | conflict_detector |
    -- approval_router | update_writer | retro_generator | memory_indexer | daily_brief
  project_id      UUID REFERENCES projects(id),
  triggered_by    UUID REFERENCES users(id),
  trigger_event   TEXT NOT NULL,     -- what caused this run
  input_summary   TEXT NOT NULL,
  output_summary  TEXT,
  graph_state     JSONB,             -- full LangGraph state at completion
  tokens_used     INTEGER,
  duration_ms     INTEGER,
  status          TEXT DEFAULT 'running',  -- running | complete | failed | interrupted
  error           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  completed_at    TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX idx_projects_team_stage ON projects(team_id, stage);
CREATE INDEX idx_approvals_assigned_to ON approvals USING gin(assigned_to);
CREATE INDEX idx_conflicts_team_open ON conflicts(team_id) WHERE status = 'open';
CREATE INDEX idx_decisions_team ON decisions(team_id);
CREATE INDEX idx_agent_runs_project ON agent_runs(project_id);
```

### 1.3 LangGraph State Schema

```python
# backend/src/state.py
from typing import TypedDict, Annotated, Optional
from datetime import datetime
import operator

class HypothesisResult(TypedDict):
    id: str
    statement: str
    supporting_evidence: list[str]
    contradicting_evidence: list[str]
    confidence_score: float           # 0.0 - 1.0
    killed: bool                       # True if red team killed it

class AssumptionAudit(TypedDict):
    assumption: str
    fragility_score: float             # 0.0 = bedrock, 1.0 = house of cards
    what_breaks_if_wrong: str
    evidence_available: bool

class ConflictResult(TypedDict):
    type: str
    severity: str                      # blocking | advisory
    project_a_id: str
    project_b_id: str
    specific_conflict: str
    resolution_options: list[dict]

class BriefContent(TypedDict):
    problem_statement: str
    proposed_scope: str
    ai_recommendation: str             # build | configure | optimize | no_action
    effort_estimate: str               # S | M | L | XL
    stack_recommendation: list[str]
    overlaps_with: list[str]           # project IDs with overlap
    open_questions: list[str]
    confidence_score: float

class PRDContent(TypedDict):
    problem_statement: str
    user_stories: list[dict]
    functional_requirements: list[dict]
    non_functional_requirements: list[dict]
    out_of_scope: list[str]
    stack: list[str]
    component_inventory: list[dict]
    data_layer_spec: dict
    api_contracts: list[dict]
    success_criteria: list[str]
    open_questions: list[dict]         # {question, blocking, owner}
    claude_code_prompt: str

# ── MAIN KEYSTONE STATE ────────────────────────────────────────────────────
class KeystoneState(TypedDict):
    # Identity
    run_id: str
    agent_type: str
    project_id: Optional[str]
    team_id: str
    triggered_by: str

    # Input
    raw_input: str
    input_type: str                    # spark | transcript | notes | prd | data
    context: dict                      # additional context from caller

    # Brief generation
    brief: Optional[BriefContent]

    # PRD drafting
    prd_draft: Optional[PRDContent]
    prd_version: int

    # Stress testing (parallel branches)
    hypotheses: list[HypothesisResult]
    adversarial_findings: list[str]
    assumption_audit: list[AssumptionAudit]
    stress_test_confidence: float

    # Conflict detection
    all_project_states: list[dict]     # snapshot of all active projects
    detected_conflicts: Annotated[list[ConflictResult], operator.add]

    # Approval routing
    approval_type: Optional[str]
    approval_chain: list[str]          # user IDs in order
    approval_context_summary: str

    # Update writing
    raw_build_notes: Optional[str]
    structured_update: Optional[dict]

    # Daily brief
    user_id: Optional[str]
    brief_sections: Optional[dict]

    # Memory
    memory_entries: list[dict]
    similar_prior_projects: list[dict]

    # Control flow
    human_checkpoint_needed: bool
    checkpoint_question: Optional[str]
    checkpoint_response: Optional[str]
    quality_score: float               # 0.0 - 1.0
    loop_count: int                    # prevents infinite loops
    errors: list[str]
    status: str                        # running | complete | failed | awaiting_human
```

### 1.4 API Contract (FastAPI → Next.js)

All endpoints are under `/api/v1/`. All responses use snake_case JSON.
Authentication via NextAuth session token in `Authorization: Bearer` header.

**Core project endpoints:**
```
GET    /api/v1/projects              → ProjectList
POST   /api/v1/projects              → CreateProject (with spark content)
GET    /api/v1/projects/{id}         → ProjectDetail
PATCH  /api/v1/projects/{id}         → UpdateProject
POST   /api/v1/projects/{id}/advance → AdvanceStage (triggers agent)
GET    /api/v1/projects/{id}/prd     → CurrentPRD
PUT    /api/v1/projects/{id}/prd     → UpdatePRD (human edits)

GET    /api/v1/approvals             → PendingApprovals (for current user)
POST   /api/v1/approvals/{id}/decide → ApprovalDecision (approve|reject|request_changes)

GET    /api/v1/conflicts             → OpenConflicts (for team)
POST   /api/v1/conflicts/{id}/resolve → ResolveConflict

GET    /api/v1/graph                 → FullTeamGraph (React Flow nodes + edges)
GET    /api/v1/memory                → InstitutionalMemorySearch
GET    /api/v1/daily                 → TodaysBrief (for current user)

POST   /api/v1/agents/run            → TriggerAgentRun
GET    /api/v1/agents/run/{id}       → AgentRunStatus

GET    /api/v1/stream                → SSE stream for real-time updates
```

**SSE Event Types:**
```typescript
type SSEEvent =
  | { type: 'project.stage_changed';  data: { project_id, new_stage, old_stage } }
  | { type: 'conflict.detected';      data: ConflictResult }
  | { type: 'conflict.resolved';      data: { conflict_id } }
  | { type: 'approval.requested';     data: { approval_id, project_id } }
  | { type: 'approval.decided';       data: { approval_id, decision } }
  | { type: 'agent.started';          data: { run_id, agent_type, project_id } }
  | { type: 'agent.node_entered';     data: { run_id, node_name } }
  | { type: 'agent.completed';        data: { run_id, output_summary } }
  | { type: 'prd.updated';            data: { project_id, version } }
  | { type: 'build_log.updated';      data: { project_id, entry } }
  | { type: 'daily_brief.ready';      data: { user_id, date } }
  | { type: 'memory.entry_added';     data: { entry_id, type } };
```

---

## PART 2 — FRONTEND ARCHITECTURE IN DEPTH

### 2.1 App Shell Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│ TOP BAR  h-14                                                           │
│ [Keystone mark + name] [Search ⌘K]  [Notifications bell] [Avatar]     │
│ bg: --surface-base, border-bottom: var(--border-subtle)                │
├──────────────────┬──────────────────────────────────────────────────────┤
│                  │                                                       │
│  SIDEBAR  w-60   │  MAIN CONTENT AREA  flex-1                          │
│                  │                                                       │
│  Navigation:     │  Routes render here.                                 │
│  • Dashboard     │  overflow-y-auto                                     │
│  • Projects      │  padding: 32px                                       │
│  • Graph View    │                                                       │
│  • Inbox         │                                                       │
│  • Memory        │                                                       │
│  • Daily Brief   │                                                       │
│  ─────────────   │                                                       │
│  [+ New Project] │                                                       │
│                  │                                                       │
│  Team status     │                                                       │
│  [avatars]       │                                                       │
│                  │                                                       │
└──────────────────┴──────────────────────────────────────────────────────┘
```

**Sidebar specifications:**
- `w-60` — fixed, not collapsible in Phase 1 (collapsible in Phase 8)
- Background: `var(--surface-base)` with subtle right border `var(--border-subtle)`
- Navigation items: 44px height, 12px horizontal padding, 8px border-radius
- Active state: `bg: var(--surface-selected)` + left border `2px solid var(--amber-core)`
- Hover state: `bg: var(--surface-hover)` with `transition: background 150ms`
- Active stage: Framer Motion `layoutId="active-nav"` for smooth indicator transitions
- Team status at bottom: shows avatar bubble for each online team member
  - Presence is real (connected via SSE), not fake — each session pings the backend
  - Online: `w-2 h-2 rounded-full bg-teal` dot on avatar
  - Away (>5min): `bg-amber-core` dot

**Top bar specifications:**
- `h-14` — fixed
- Background: `var(--surface-base)`
- Left: `keystone-mark.svg` (20px) + "Keystone" in Geist Sans 600 14px
- Center: Command palette trigger `⌘K` — see Section 2.7 for full spec
- Right: Notification bell (with count badge) + user avatar (32px circle)
- Notification bell: amber glow pulse animation when unread count > 0
- Amber glow: `box-shadow: var(--shadow-amber)`, animates with `conflictPulse` variant

### 2.2 Dashboard — `/projects`

The primary landing view after login.

**Layout:**
```
┌─────────────────────────────────────────────────────────────────────┐
│  HEADER ROW                                                          │
│  "Projects"  [h2, Plus Jakarta Sans 700 24px]  [+ New Spark button] │
├─────────────────────────────────────────────────────────────────────┤
│  STAGE FILTER BAR                                                    │
│  [All] [Spark] [Brief] [Draft PRD] [Review] [Approved] [In Build]  │
│  [Shipped]                                                           │
├─────────────────────────────────────────────────────────────────────┤
│  ACTIVE CONFLICTS BANNER (only visible if conflicts > 0)            │
│  ⚠ 2 conflicts need your attention   [View all conflicts →]         │
│  bg: var(--coral-glow), border: var(--border-coral), coral text     │
├─────────────────────────────────────────────────────────────────────┤
│  PROJECT GRID                                                        │
│  Grid: 3 cols on xl, 2 cols on lg, 1 col on mobile                 │
│  Each ProjectCard is 280px min-height                               │
│  Cards stagger in on load: listContainerVariants + listItemVariants │
└─────────────────────────────────────────────────────────────────────┘
```

**ProjectCard specifications:**
```tsx
// Each card contains:
// 1. Stage badge (top-left) — color from STAGE_COLORS
// 2. Project title — Geist Sans 600 16px
// 3. Description — 2-line clamp, text-secondary
// 4. Assigned avatar + name
// 5. Stack tags (max 3 shown, +N for rest)
// 6. Last activity timestamp
// 7. Conflict indicator (coral, if this project has open conflicts)
// 8. Stage progress indicator — thin bar showing which stage, color coded

// Card background: var(--surface-elevated)
// Hover: translateY(-2px), shadow increases
// Border: var(--border-subtle) default, var(--border-amber) on hover
// Transition: all 200ms ease-out
```

**Stage Filter Bar:**
- Pill buttons, 32px height, 12px horizontal padding
- Active: `bg: var(--amber-glow)`, `border: var(--border-amber)`, amber text
- Default: `bg: transparent`, `border: var(--border-subtle)`, text-secondary
- Count badge on each: small circle showing count for that stage
- Animated count: when count changes, number counter animation (Framer Motion)

**New Spark button:**
- Position: top-right of header row
- Style: `bg: var(--amber-core)`, dark text `var(--text-inverse)`, 36px height
- Icon: Sparkles icon (Lucide) 16px
- Click: opens SparkInput sheet (bottom sheet on mobile, modal on desktop)

**SparkInput sheet:**
- Full-width textarea, placeholder: "What do you want to build?"
- 400ms entrance animation (sheet slides up from bottom with spring easing)
- Submit: `Cmd+Enter` or send button
- After submission: brief amber flash on the new card as it appears
- The Project Intelligence Agent immediately runs in the background —
  user sees a subtle "Checking for conflicts..." indicator appear then disappear

### 2.3 Project Detail — `/projects/[id]`

```
┌─────────────────────────────────────────────────────────────────────┐
│  PROJECT HEADER                                                      │
│  [← Back]  [Stage Badge]  "Project Title"  [⋯ menu]                │
├─────────────────────────────────────────────────────────────────────┤
│  STAGE PROGRESS BAR                                                  │
│  ●━━━━━━━━━━━━━━━━━━━━━━━━━━━━━○                                    │
│  Spark  Brief  Draft  Review  Approved  Build  Shipped              │
│  Current stage glows, completed stages amber, future stages muted   │
├───────────────────────────────┬─────────────────────────────────────┤
│                               │                                      │
│  LEFT PANEL  flex-1           │  RIGHT PANEL  w-80                  │
│                               │                                      │
│  Tabs: [PRD] [Build] [Retro]  │  AGENT PANEL                        │
│                               │  (shows if agent is running)        │
│  PRD Tab:                     │  ─────────────────                  │
│  Living PRD sections          │  OPEN QUESTIONS                     │
│  (see Section 2.4)            │  ─────────────────                  │
│                               │  STAGE ACTIONS                      │
│  Build Tab:                   │  ─────────────────                  │
│  Commit log + AI summaries    │  ASSIGNED TO                        │
│                               │  ─────────────────                  │
│  Retro Tab:                   │  STACK                              │
│  Retrospective content        │  ─────────────────                  │
│                               │  RELATED DECISIONS                  │
│                               │  (from memory layer)                │
└───────────────────────────────┴─────────────────────────────────────┘
```

**Stage Progress Bar specifications:**
- Height: 4px track, 12px dots
- Completed stages: `var(--teal)` track + filled dot
- Current stage: `var(--amber-core)` dot with amber glow pulse
- Future stages: `var(--border-subtle)` — muted
- Transition: when stage advances, track fills with animated progress
  (Framer Motion `width` animation, 600ms, ease-out)

**Agent Panel (right sidebar, conditional):**
- Only visible when an agent run is active for this project
- Shows: agent name + icon, current node being processed, thinking animation
- ThinkingAnimation: three amber dots, staggered vertical bounce
  ```tsx
  // Three dots, each delays by 150ms
  animate={{ y: [0, -6, 0] }}
  transition={{ duration: 0.6, repeat: Infinity, delay: index * 0.15 }}
  ```
- As nodes complete: they appear in a list below with ✓ checkmarks
- Final output: appears as an expandable section with the agent's output

**Stage Actions (right sidebar, always visible):**
- Context-aware actions for the current stage
- Spark: "Generate Brief" (triggers PRD Architect)
- Brief: "Draft PRD" (triggers PRD Architect) + "Advance to Draft PRD"
- Draft PRD: "Run Stress Test" + "Send for Review"
- Review: "Approve" / "Request Changes" (only for reviewers)
- Approved: "Start Build" (generates Claude Code prompt)
- In Build: "Log Update" + "Mark Shipped"
- Shipped: "Generate Retrospective"

### 2.4 Living PRD View

The PRD is rendered as a structured document with distinct editable sections.
It's not a text editor — it's a form-based structured object that renders beautifully.

```
┌─────────────────────────────────────────────────────────────────────┐
│  PRD HEADER                                                          │
│  [Version badge: v3]  [Status badge: In Review]  [Last updated]    │
│  [Show diff from v2 →]  [Copy Claude Code prompt ↗]                │
├─────────────────────────────────────────────────────────────────────┤
│  STRESS TEST PANEL (collapsible, amber background, prominent)       │
│  ⚡ Stress Test Results                                             │
│  3 hypotheses tested · Leading failure mode: Scope assumption       │
│  [Expand to see full analysis]                                      │
├─────────────────────────────────────────────────────────────────────┤
│  SECTION: Problem Statement                                          │
│  [Edit button]  [AI regenerate button]                              │
│  Content...                                                         │
├─────────────────────────────────────────────────────────────────────┤
│  SECTION: User Stories                                              │
│  [Edit] [Add story] [AI generate more]                              │
│  Story 1: As a...  [edit] [delete]                                 │
│  Story 2: ...                                                       │
├─────────────────────────────────────────────────────────────────────┤
│  SECTION: Functional Requirements                                   │
│  [Edit] [Add requirement]                                           │
│  REQ-001: The system shall...  [edit]                               │
│  ...                                                                │
│  [More sections: Non-Functional, Out of Scope, Stack,              │
│   Components, Data Layer, API Contracts, Success Criteria]          │
├─────────────────────────────────────────────────────────────────────┤
│  OPEN QUESTIONS                                                     │
│  ⛔ BLOCKING (2)                                                    │
│  Q1: Authentication model — assigned to Achyuth  [Answer]          │
│  Q2: Shared database — needs team decision  [Answer]               │
│  ○ NON-BLOCKING (3)                                                │
│  Q3: ...                                                            │
└─────────────────────────────────────────────────────────────────────┘
```

**Stress Test Panel specifications:**
- Collapsed by default — user sees summary line
- Expanded: shows all 3-5 hypotheses tested, evidence for/against each,
  confidence scores as progress bars, adversarial findings in red
- Hypothesis confidence bars: animated fill on reveal (Framer Motion width)
- Red team findings: coral background, `var(--coral)` left border

**PRD Section editing:**
- Sections are not a text editor — they render structured data
- Click "Edit" on a section → inline form opens with structured fields
- Edit form fades in over the rendered content (Framer Motion AnimatePresence)
- Save triggers auto-update (no manual save, optimistic updates)
- Each section has an "AI regenerate" button that triggers the PRD Architect
  with the context of what already exists

**Version Diff View:**
- Toggle: "Show diff from v2"
- Uses a split-pane view: left = previous version, right = current
- Added content: `bg: teal-glow`, green left border
- Removed content: `bg: coral-glow`, red left border, strikethrough
- Changed content: `bg: amber-glow`, amber left border

### 2.5 React Flow Graph — `/graph` and project detail tabs

This is the signature visual of Keystone. Two contexts:
1. **Portfolio graph** (`/graph`) — all projects as nodes, relationships as edges
2. **Project graph** (project detail) — single project's internal state graph

#### Portfolio Graph

```
Node types:
- ProjectNode: pill-shaped, stage-colored, shows title + stage + owner avatar
- ConflictNode: diamond shape, coral, shows conflict type
- DecisionNode: hexagon, amber, shows decision title

Edge types:
- StageEdge: solid line — project dependency or relationship
- ConflictEdge: dashed coral line — connects two projects in conflict

Layout: dagre (hierarchical), grouped by stage on vertical axis
```

**ProjectNode component:**
```tsx
// Size: 200px wide, 70px tall
// Background: var(--surface-elevated)
// Border: 1.5px solid {stage color from STAGE_COLORS}
// Box shadow: 0 0 12px {stage glow color}
// Left accent bar: 4px wide, full height, stage color
// Contains:
//   - Project title (Geist 500 13px, white)
//   - Stage badge (tiny pill, bottom-right of title)
//   - Owner avatar (20px circle, bottom-left)
//   - Conflict indicator dot (coral, top-right, only if conflicts)
// Hover: scale(1.02), shadow intensifies
// Selected: ring 2px amber, scale(1.03)
// Active agent: pulsing amber border animation
```

**ConflictEdge:**
```tsx
// Dashed line, coral color: var(--coral)
// Animated: dashes move from project A toward project B
// strokeDasharray="8 4"
// Animation: strokeDashoffset animates from 0 to -36 over 1.5s, infinite
// Label: conflict type (small pill on edge midpoint)
```

**Graph interactions:**
- Pan: drag on background
- Zoom: scroll wheel, or pinch on trackpad
- Click node: opens project detail sidebar (slide from right)
- Click conflict edge: opens conflict resolution panel
- Right-click node: context menu (View PRD, View Build Log, Create Dependency)
- Mini-map: bottom-right, shows team overview at tiny scale

**React Flow configuration:**
```tsx
<ReactFlow
  nodes={nodes}
  edges={edges}
  nodeTypes={nodeTypes}
  edgeTypes={edgeTypes}
  fitView
  fitViewOptions={{ padding: 0.2 }}
  defaultEdgeOptions={{
    style: { strokeWidth: 1.5, stroke: 'var(--border-default)' },
    animated: false,
  }}
  proOptions={{ hideAttribution: true }}
  style={{ background: 'var(--surface-base)' }}
>
  <Background
    variant={BackgroundVariant.Dots}
    gap={24}
    size={1}
    color="rgba(255,255,255,0.04)"
  />
  <Controls style={{ background: 'var(--surface-elevated)' }} />
  <MiniMap
    nodeColor={(node) => STAGE_COLORS[node.data.stage]?.text || '#666'}
    maskColor="rgba(10, 15, 26, 0.7)"
  />
</ReactFlow>
```

**Live graph updates:**
When an SSE event arrives (e.g., `project.stage_changed`):
1. Zustand store updates the relevant node's data
2. React Flow re-renders the affected node
3. The node animates: `stageTransitionVariants` — scale + blur + color transition
4. If the stage change creates or resolves a conflict, edges update too

```typescript
// src/stores/graph.store.ts
import { create } from 'zustand';
import { Node, Edge, applyNodeChanges, applyEdgeChanges } from '@xyflow/react';

interface GraphStore {
  nodes: Node[];
  edges: Edge[];
  setNodes: (nodes: Node[]) => void;
  updateNodeStage: (nodeId: string, newStage: string) => void;
  addConflictEdge: (conflict: ConflictResult) => void;
  removeConflictEdge: (conflictId: string) => void;
}
```

### 2.6 Inbox — `/inbox`

The single place where a user sees everything that requires their attention.

**Sections:**
1. **Approvals Waiting for You** — sorted by urgency (deadline proximity)
2. **Conflicts Requiring Decision** — blocking conflicts first
3. **Checkpoint Responses Needed** — when an agent has paused for your input

**ApprovalRequest card:**
```
┌──────────────────────────────────────────────────────┐
│ [Stage advance: Draft PRD → Review]  2 hours ago     │
│                                                       │
│ crowe-ai-onboarding v3                                │
│                                                       │
│ AI Summary: PRD updated to include pgvector schema    │
│ and ingestion API. Open questions resolved: 3 of 4.   │
│ Remaining blocker: auth model for multi-user sessions.│
│                                                       │
│ Changed since last review: [see diff ↗]              │
│                                                       │
│ [Approve ✓]  [Request Changes ◎]  [Reject ✗]        │
└──────────────────────────────────────────────────────┘
```

**Card animations:**
- Entrance: `listItemVariants` (staggered fade-in from left)
- Approve action: card flashes teal, then slides out right with scale down
- Reject action: card flashes coral, then slides out left
- All using Framer Motion `AnimatePresence` with `mode="popLayout"`

### 2.7 Command Palette — Global `⌘K`

Available on every page. This is a power-user feature that makes Keystone
feel like a professional tool, not an enterprise app.

```
Trigger: ⌘K (Mac) or Ctrl+K (Windows)
Blur backdrop behind palette
Modal: 600px wide, centered, rounded-2xl, surface-overlay background

Commands available:
- Create new spark
- Go to project [fuzzy search by name]
- View graph
- Open inbox
- Run conflict scan now
- Generate daily brief
- View memory
- Approve pending [fuzzy search]
- Search all PRDs
- Go to settings

Keyboard navigation: Arrow up/down, Enter to select, Esc to close
Each result shows: icon + label + shortcut hint (if any)
Uses cmdk library (shadcn command component)
```

### 2.8 Real-Time Notifications

```typescript
// src/hooks/useSSE.ts
// Maintains a persistent SSE connection to /api/v1/stream
// Reconnects automatically with exponential backoff
// Events pipe into Zustand notification store

// Notification types shown to user:
// - Toast (transient, auto-dismiss): agent.completed, build_log.updated
// - Bell notification (persistent until read): approval.requested, conflict.detected
// - In-page update (silent): graph updates, prd.updated
```

**Toast notifications:**
- Position: bottom-right
- Size: max 380px wide, variable height
- Colors: teal for success, coral for conflict/error, amber for neutral
- Duration: 4 seconds, with hover to pause auto-dismiss
- Animation: `notificationVariants` — slide in from right with spring
- Exit: shrinks and fades simultaneously
- Stack: max 5 visible, older ones compress

**Bell notification panel:**
- Slide-in sheet from right, 360px wide
- Grouped by type (approvals, conflicts, activity)
- Unread count badge on bell icon: amber background, dark text
- Mark all read button
- Each item links to the relevant page/section

---

## PART 3 — LANGGRAPH AGENT SYSTEM IN DEPTH

### 3.1 The Four Agents — Detailed Specifications

#### Agent 1: Project Intelligence Agent

**Role:** Continuous watcher. Runs in the background. Never triggered manually.
Fires automatically on: project state changes, new PRD versions, stage advances,
new projects created, team composition changes.

**LangGraph structure:**
```python
# backend/src/graph/nodes/conflict_detector.py

def conflict_detector_node(state: KeystoneState) -> dict:
    """
    Receives the full state of all active projects.
    Generates embeddings for each project's key assumptions.
    Computes pairwise similarity across assumption sets.
    For high-similarity pairs, invokes the conflict classifier.
    """
    all_projects = state['all_project_states']
    conflicts = []

    # Build assumption embeddings for each project
    embeddings = {}
    for project in all_projects:
        if project['stage'] not in ('spark', 'shipped', 'retrospective'):
            embedding = get_project_embedding(project)
            embeddings[project['id']] = embedding

    # Check all pairs
    project_ids = list(embeddings.keys())
    for i in range(len(project_ids)):
        for j in range(i + 1, len(project_ids)):
            pid_a = project_ids[i]
            pid_b = project_ids[j]

            similarity = cosine_similarity(
                embeddings[pid_a],
                embeddings[pid_b]
            )

            if similarity > CONFLICT_THRESHOLD:  # 0.75
                conflict = classify_conflict(
                    all_projects[pid_a],
                    all_projects[pid_b],
                    similarity
                )
                if conflict:
                    conflicts.append(conflict)

    return {'detected_conflicts': conflicts}
```

**Conflict classifier system prompt** (`backend/src/graph/prompts/conflict_detector.md`):
```
You are the Project Intelligence Agent for Crowe Keystone. Your job is to
identify real conflicts between two AI-building projects that would waste time
or create problems if not addressed.

Given two project snapshots, determine if a REAL conflict exists. A conflict
must be:
1. Specific (not vague overlap in general topic area)
2. Actionable (there is a decision that resolves it)
3. Material (if unresolved, it will cost time or create technical debt)

Do NOT flag:
- Projects that are simply in the same domain
- Minor naming similarities
- Projects that are clearly sequential (v1 and v2)

If a conflict exists, classify it as one of:
- assumption_mismatch: both assume ownership of the same resource
- decision_contradiction: contradicts a prior approved decision
- resource_overlap: will contend for the same infrastructure
- scope_collision: describes overlapping functionality
- architectural_divergence: making incompatible architectural choices

Return: conflict_exists (bool), type, severity (blocking|advisory),
specific_conflict (2 sentences max, specific), resolution_options (2-3 options),
decision_required_from (role: lead|builder|team)

Return JSON only. No preamble.
```

#### Agent 2: PRD Architect Agent

**Role:** Document intelligence. Triggered by stage advances (Spark→Brief,
Brief→Draft PRD) and explicit user requests. Can also be triggered to
regenerate specific sections.

**Graph for PRD drafting (full graph):**
```
[INPUT]
  ↓
[CONTEXT_LOADER]          ← Loads similar prior projects from memory
  ↓
[CLASSIFIER]              ← What type of project is this? What domain?
  ↓
[BRIEF_GENERATOR]         ← If input is a spark, generates brief first
  ↓                         (skipped if input is already a brief)
[PARALLEL SECTION DRAFTERS — all run simultaneously]
  ↓           ↓           ↓           ↓           ↓
[PROBLEM]  [STORIES]  [REQS]  [STACK]  [COMPONENTS]
  ↓           ↓           ↓           ↓           ↓
[SECTION_MERGER]          ← Assembles all sections into coherent PRD
  ↓
[STRESS_TESTER]           ← Parallel hypothesis testing (3 branches)
  ↓
[ASSUMPTION_EXCAVATOR]    ← Runs in parallel with stress tester
  ↓
[OPEN_QUESTION_EXTRACTOR] ← Identifies what's still unknown
  ↓
[CLAUDE_CODE_PROMPT_WRITER] ← Writes the kickoff prompt
  ↓
[QUALITY_GATE]            ← Score < 0.7 → loops back to SECTION_MERGER
  ↓
[OUTPUT: Complete PRD]
```

**Brief generator system prompt** (`backend/src/graph/prompts/brief_generator.md`):
```
You are the PRD Architect for Crowe Keystone. You are generating a project
brief from a raw idea description.

The team builds AI-powered tools using:
- Next.js 15 + TypeScript + Tailwind CSS + shadcn/ui
- Python + FastAPI + LangGraph for AI backends
- OpenAI or Anthropic APIs
- Vercel for deployment

Your brief must include:
1. problem_statement: What problem does this solve? Who has this problem?
   (2-3 sentences, specific, grounded in the team's actual work)

2. proposed_scope: What does the tool do? What does it explicitly not do?
   (Bullet list, maximum 8 items total)

3. ai_recommendation: Should this be built, or does an existing tool solve it?
   - "build": genuinely new capability worth building
   - "configure": an existing tool (shadcn, React Flow, existing project) covers it
   - "optimize": this is a process issue, not a build issue
   - "no_action": not worth the build time right now

4. effort_estimate: S (< 1 week) | M (1-2 weeks) | L (2-4 weeks) | XL (> 1 month)

5. stack_recommendation: Specific technologies from the team stack

6. overlaps_with: IDs of any projects this may overlap with
   (will be provided as context)

7. open_questions: What do you need to know before drafting the full PRD?
   (Maximum 5, only genuinely blocking questions)

8. confidence_score: 0.0-1.0 — how confident are you in this brief given
   the information provided?

If confidence < 0.6, set human_checkpoint_needed = true and provide
a specific checkpoint_question that would raise your confidence.

Return JSON matching BriefContent TypedDict. No preamble.
```

**Stress tester system prompt** (`backend/src/graph/prompts/stress_tester.md`):
```
You are the stress-testing component of the PRD Architect. Your job is to
find the failure modes in this PRD before anyone wastes time building it.

Generate exactly 3 competing hypotheses about how this project could fail:
1. The optimistic hypothesis: it works as planned — what assumptions must
   be true for this to hold?
2. The scope hypothesis: the scope is wrong — either too large (will run
   for months), too small (won't solve the real problem), or targeting
   the wrong user
3. The assumption hypothesis: there's a hidden assumption that, if wrong,
   invalidates the entire approach

For each hypothesis:
- statement: the hypothesis in one sentence
- supporting_evidence: what in the PRD supports this being true
- contradicting_evidence: what in the PRD argues against it
- confidence_score: 0.0-1.0

Also identify the THREE most fragile assumptions in this PRD:
For each: assumption, fragility_score (0.0-1.0), what_breaks_if_wrong

Return JSON with {hypotheses: [...], assumption_audit: [...]}
No preamble. Be direct. Be specific. Don't be encouraging.
```

#### Agent 3: Approval Router Agent

**Role:** Decision intelligence. Triggered whenever a stage advance is requested
or an architectural decision is made. Computes the correct approval chain,
writes the approval request summary for each reviewer.

**System prompt** (`backend/src/graph/prompts/approval_router.md`):
```
You are the Approval Router for Crowe Keystone. You write approval requests
that give reviewers exactly what they need to make a decision in under 2 minutes.

You will receive:
- The work item (project + PRD)
- The type of approval needed
- The previous version (for diff context)
- The team's approval chain configuration

Your approval request summary must be:
1. ≤ 120 words
2. Written for a busy practice lead reviewing on their phone
3. Specific about what changed since last review
4. Explicit about what the approver is being asked to do
5. Flag any unresolved blocking open questions

Format:
"You are being asked to [approve stage advance | approve architectural decision | etc.]
for [project name].

[1-2 sentences: what is this project?]

[1-2 sentences: what changed since last review?]

[1 sentence: any open questions or flags?]"

Also output:
- approval_chain: ordered list of user IDs who must approve
- deadline: ISO timestamp (typically 48 hours from now)
```

#### Agent 4: Update Writer Agent

**Role:** Communication intelligence. Two contexts:
1. **Build log updates:** Converts raw git commits/build notes → structured entry
2. **Daily brief generation:** Runs at 7am per user timezone

**Build update system prompt:**
```
You are the Update Writer for Crowe Keystone. You convert raw build activity
into a structured update that the team can read.

Input: git commits, build notes, session context (paste of what happened)
Output: a structured build log entry

Rules:
- Lead with what was COMPLETED (past tense, specific)
- Note what CHANGED from the approved PRD (scope changes must be flagged)
- List what is NEXT (the next concrete action, not vague "continue work")
- Flag any NEW questions that opened during this session
- Do not pad. If nothing notable happened, say so.

Format:
completed: [string array]
changed_from_prd: [string array, empty if none]
next: [string — ONE specific next action]
new_questions: [string array]
build_health: "on_track" | "scope_growing" | "blocked" | "ahead_of_schedule"
```

**Daily brief generation:**
The brief is generated fresh each morning using the current state of the database.
It queries:
- All projects with `assigned_to = user_id` → active work
- All approvals with `assigned_to contains user_id AND status = pending` → waiting on you
- All conflicts with `decision_required_from user's role AND status = open` → decisions needed
- All projects modified in last 24h by teammates → team activity
- All projects with stage advance deadlines in next 7 days → upcoming

The brief is structured JSON stored in `daily_briefs` table, rendered client-side.

### 3.2 Human-in-the-Loop Checkpoints

```python
# backend/src/graph/keystone_graph.py

from langgraph.checkpoint.postgres import PostgresSaver

# Compile graph with postgres checkpointer
# This enables pause/resume with full state preservation
checkpointer = PostgresSaver.from_conn_string(DATABASE_URL)

keystone_graph = graph.compile(
    checkpointer=checkpointer,
    interrupt_before=["request_human_clarification"],
)

# When a checkpoint fires:
# 1. Agent run record in DB updated: status = 'awaiting_human'
# 2. SSE event fired: 'agent.checkpoint_reached'
# 3. Frontend shows checkpoint question in agent panel
# 4. User answers via POST /api/v1/agents/run/{id}/respond
# 5. Graph resumes from exact checkpoint with user's answer

async def respond_to_checkpoint(run_id: str, answer: str, session_id: str):
    config = {"configurable": {"thread_id": run_id}}
    state_update = {"checkpoint_response": answer}
    await keystone_graph.aupdate_state(config, state_update)
    # Resume the graph from the checkpoint
    async for event in keystone_graph.astream(None, config=config):
        yield event
```

### 3.3 SSE Stream Architecture

```python
# backend/src/routers/stream.py
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
import asyncio
import json

router = APIRouter()

# Per-team SSE queues (in-memory for Phase 1, Redis pub/sub for Phase 7)
team_queues: dict[str, asyncio.Queue] = {}

async def event_generator(team_id: str, user_id: str):
    """Generates SSE events for a specific user's connection."""
    queue = team_queues.setdefault(team_id, asyncio.Queue())

    # Send initial connection confirmation
    yield f"data: {json.dumps({'type': 'connected', 'user_id': user_id})}\n\n"

    while True:
        try:
            # Wait for events with 30s heartbeat
            event = await asyncio.wait_for(queue.get(), timeout=30.0)
            yield f"data: {json.dumps(event)}\n\n"
        except asyncio.TimeoutError:
            # Heartbeat to keep connection alive
            yield ": heartbeat\n\n"
        except Exception:
            break

@router.get("/stream")
async def stream_events(current_user = Depends(get_current_user)):
    return StreamingResponse(
        event_generator(current_user.team_id, current_user.id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        }
    )

async def broadcast_to_team(team_id: str, event: dict):
    """Called by all services when something changes."""
    queue = team_queues.get(team_id)
    if queue:
        await queue.put(event)
```

**Frontend SSE hook:**
```typescript
// src/hooks/useSSE.ts
import { useEffect } from 'react';
import { useNotificationStore } from '@/stores/notifications.store';
import { useGraphStore } from '@/stores/graph.store';

export function useSSE() {
  const addNotification = useNotificationStore(s => s.add);
  const updateNodeStage = useGraphStore(s => s.updateNodeStage);
  const addConflictEdge = useGraphStore(s => s.addConflictEdge);

  useEffect(() => {
    let retryDelay = 1000;
    let eventSource: EventSource;

    function connect() {
      eventSource = new EventSource('/api/v1/stream', {
        withCredentials: true,
      });

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleSSEEvent(data);
        retryDelay = 1000; // reset backoff on success
      };

      eventSource.onerror = () => {
        eventSource.close();
        setTimeout(connect, retryDelay);
        retryDelay = Math.min(retryDelay * 2, 30000); // cap at 30s
      };
    }

    function handleSSEEvent(event: SSEEvent) {
      switch (event.type) {
        case 'project.stage_changed':
          updateNodeStage(event.data.project_id, event.data.new_stage);
          addNotification({
            type: 'activity',
            title: 'Stage advanced',
            message: `${event.data.project_title} moved to ${event.data.new_stage}`,
          });
          break;
        case 'conflict.detected':
          addConflictEdge(event.data);
          addNotification({
            type: 'conflict',
            title: 'Conflict detected',
            message: event.data.specific_conflict,
            urgent: event.data.severity === 'blocking',
          });
          break;
        case 'approval.requested':
          addNotification({
            type: 'approval',
            title: 'Approval needed',
            message: `Review requested for ${event.data.project_title}`,
            actionUrl: `/inbox`,
          });
          break;
        case 'agent.node_entered':
          useAgentStore.getState().updateRunNode(event.data.run_id, event.data.node_name);
          break;
        // ... other events
      }
    }

    connect();
    return () => eventSource?.close();
  }, []);
}
```

---

## PART 4 — AUTHENTICATION AND TEAM MANAGEMENT

### 4.1 Authentication

**Provider:** NextAuth.js with credentials provider (email + password) for Phase 1.
Add Microsoft Entra ID (Azure AD) SSO in Phase 7 for Crowe internal use.

```typescript
// frontend/src/app/api/auth/[...nextauth]/route.ts
import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

export const authOptions = {
  providers: [
    CredentialsProvider({
      credentials: {
        email: { type: 'email' },
        password: { type: 'password' },
      },
      async authorize(credentials) {
        // Calls backend: POST /api/v1/auth/login
        const res = await fetch(`${process.env.BACKEND_URL}/api/v1/auth/login`, {
          method: 'POST',
          body: JSON.stringify(credentials),
          headers: { 'Content-Type': 'application/json' },
        });
        if (res.ok) return res.json();
        return null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.teamId = user.teamId;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.userId;
      session.user.teamId = token.teamId;
      session.user.role = token.role;
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
};
```

### 4.2 Login Page

**URL:** `/login`
**Design:**
```
┌─────────────────────────────────────────────────────────────────────┐
│ [Full-screen, surface-base background]                              │
│                                                                     │
│           [Keystone logomark — 40px]                                │
│           Keystone  [Plus Jakarta Sans 700 28px]                    │
│           Where AI teams build together  [text-secondary 14px]     │
│                                                                     │
│    ┌───────────────────────────────────────────┐                   │
│    │  Email                                    │                   │
│    │  [input field]                            │                   │
│    │  Password                                 │                   │
│    │  [input field]             [Show/hide]    │                   │
│    │                                           │                   │
│    │  [Sign in →]  [amber bg, full width]      │                   │
│    └───────────────────────────────────────────┘                   │
│                                                                     │
│    Don't have a team? Contact Achyuth to get started               │
└─────────────────────────────────────────────────────────────────────┘
```

**Animation:** Form card fades in with `cardVariants`. Logo appears first
(100ms delay), then form (250ms delay). Subtle background: slowly drifting
dot pattern at 5% opacity using `bg-dots` CSS pattern.

### 4.3 Onboarding

New team member arrives via invite link. Onboarding flow:
1. Set password
2. Set display name and avatar (optional)
3. Set timezone (pre-populated from browser)
4. "You're all set" screen with 3 suggested first actions:
   - "Browse the team's projects"
   - "Read the project graph"
   - "Set up the MCP server" (links to instructions)

---

## PART 5 — INSTITUTIONAL MEMORY LAYER

### 5.1 Memory Browser — `/memory`

Not an archive. An active, searchable intelligence layer.

**Layout:**
```
┌─────────────────────────────────────────────────────────────────────┐
│  "Institutional Memory"  [h2]                                        │
├─────────────────────────────────────────────────────────────────────┤
│  [Search bar — semantic search, 400px wide]                         │
├────────────────┬────────────────────────────────────────────────────┤
│  FILTERS       │  RESULTS                                            │
│  • Decisions   │  Sorted by relevance or date                       │
│  • Retros      │  Each entry card shows:                            │
│  • Conflicts   │  - Type badge (decision | retro | conflict)        │
│  • All         │  - Title                                           │
│                │  - Summary (2 lines)                               │
│  TAGS          │  - Date + project reference                        │
│  • architecture│  - [View full →]                                   │
│  • tool choice │                                                    │
│  • process     │                                                    │
│  • tech debt   │                                                    │
└────────────────┴────────────────────────────────────────────────────┘
```

### 5.2 Memory Indexer Node

When a project moves to Retrospective (or earlier for decisions):

```python
# backend/src/graph/nodes/memory_indexer.py

MEMORY_INDEX_PROMPT = """
You are the institutional memory system for Crowe Keystone.
Extract the following from this retrospective/decision content:

1. Key decisions made (architectural, process, technology choices)
   For each: title, rationale, alternatives_considered, type

2. Learnings to remember (things that would help future projects)
   For each: learning (1 sentence), category, applicability

3. Patterns to watch for (things that went wrong or could recur)
   For each: pattern, what_triggered_it, how_to_prevent

4. Tags that would help future search (max 10)

Return JSON. Optimize for a future engineer asking:
"Has this team done something like X before?"
"""

async def memory_indexer_node(state: KeystoneState) -> dict:
    retrospective = state['context'].get('retrospective')
    decisions = state['context'].get('decisions', [])

    # Extract structured memory from retro
    result = await llm.ainvoke([
        SystemMessage(content=MEMORY_INDEX_PROMPT),
        HumanMessage(content=json.dumps({
            'retrospective': retrospective,
            'decisions': decisions,
            'project_title': state['context'].get('project_title'),
            'stack': state['context'].get('stack'),
        }))
    ])

    memory_entry = json.loads(result.content)
    return {'memory_entries': [memory_entry]}
```

---

## PART 6 — PHASE EXECUTION PLAN

### Phase 1 — Foundation
**Goal:** Running app with auth, basic project CRUD, stage graph, and database.
No AI agents yet. Prove the data model and UI patterns.
**Duration:** 1 week
**Claude Code agents to spawn:**

```
Orchestrator reads this PRD through Phase 1 section.
Spawns 3 parallel domain agents:

Agent A (Schema): 
  - Creates all Alembic migrations
  - Writes all SQLAlchemy models
  - Writes all Pydantic schemas
  - Verifies migrations run cleanly

Agent B (Backend):
  - Implements FastAPI app skeleton
  - All project CRUD routers (no agents yet)
  - Auth endpoints
  - SSE stream endpoint (empty events)
  - Health check

Agent C (Frontend):
  - Next.js 15 init with Geist + Plus Jakarta + Tailwind + shadcn
  - App shell (sidebar + topbar)
  - Dashboard with project cards (static data)
  - Project detail page (static PRD)
  - Login page

Agents A and B coordinate: B waits for A's schemas before writing routers.
Agent C is independent — uses mock data until B is ready.
```

**Phase 1 Deliverables Checklist:**
- [ ] Docker compose with Postgres running locally
- [ ] All Alembic migrations run without error
- [ ] POST /api/v1/projects creates a project record
- [ ] GET /api/v1/projects returns project list
- [ ] PATCH /api/v1/projects/{id} updates stage
- [ ] NextAuth login works with test credentials
- [ ] App shell renders with sidebar navigation
- [ ] Dashboard shows 3 mock project cards with correct stage colors
- [ ] Stage filter bar filters cards
- [ ] Project detail shows mock PRD content
- [ ] `npm run build` passes with zero TypeScript errors
- [ ] `pytest` passes all backend tests

---

### Phase 2 — Stage Transitions + Approval System
**Goal:** Full stage graph working. Manual stage advances. Approval chain routing.
SSE events for approvals. Inbox page.
**Duration:** 1 week

**What gets built:**
- Stage advance endpoint with validation (can't skip stages)
- Approval creation on stage advance
- Approval decision endpoint
- Inbox page (/inbox)
- Approval cards with Framer Motion animations
- SSE events wiring (approval.requested, approval.decided)
- Real-time bell notification updates
- Stage progress bar on project detail (animated)

**Agent assignments:**
```
Domain parallel pattern (from WORKFLOWS.md):

Frontend Agent:
  - Inbox page + ApprovalRequest cards
  - Stage progress bar component
  - Bell notification panel
  - AnimatePresence for approval card dismissal
  - useSSE hook (Phase 1 stub → real implementation)

Backend Agent:
  - Stage validation service (can this project advance from X to Y?)
  - Approval creation logic (who needs to approve based on config)
  - POST /api/v1/projects/{id}/advance
  - POST /api/v1/approvals/{id}/decide
  - SSE broadcast on approval events

Test Agent (runs after both):
  - End-to-end: create project → advance stage → approval appears in inbox
  - Approve → project advances to next stage
  - Reject → project stays in current stage, feedback recorded
```

**Phase 2 Deliverables Checklist:**
- [ ] Project can advance from Spark → Brief (manual)
- [ ] Approval is created automatically on stage advance
- [ ] Inbox shows pending approvals
- [ ] Approving dismisses the card with teal flash animation
- [ ] Rejecting dismisses with coral flash animation
- [ ] Bell notification updates in real time via SSE
- [ ] Stage progress bar animates correctly when stage changes
- [ ] Invalid stage skips are rejected by the backend

---

### Phase 3 — PRD System + Living Document
**Goal:** Full PRD creation, editing, versioning, and diff view.
No AI drafting yet — human-authored PRDs only. Prove the structure.
**Duration:** 1 week

**What gets built:**
- PRD data model fully implemented
- PRD creation form (manual, structured)
- PRD editor (section by section)
- Version tracking
- Diff view between versions
- Open questions section
- Claude Code prompt display (human-authored for now)

**Agent assignments:**
```
Schema Agent:
  - PRD TypedDict fully specified
  - All PRD Pydantic schemas
  - Migration for prd_content JSONB structure

PRD Frontend Agent:
  - PRDEditor component (full section-by-section editor)
  - PRDSection component (individual section with edit mode)
  - OpenQuestionBlock component
  - VersionDiff component (split-pane diff)
  - PRD tab on project detail page

PRD Backend Agent:
  - GET/PUT /api/v1/projects/{id}/prd
  - Version increment logic
  - Diff computation between versions
  - PRD validation (all required sections present for stage advance)
```

**Phase 3 Deliverables Checklist:**
- [ ] Can create a PRD for a project
- [ ] All PRD sections editable individually
- [ ] Saving a section increments version
- [ ] Diff view shows changes correctly (colored, specific)
- [ ] Open questions show blocking vs non-blocking
- [ ] Cannot advance from Draft PRD → Review with unresolved blocking questions
- [ ] Claude Code prompt section copyable to clipboard

---

### Phase 4 — React Flow Graph Visualization
**Goal:** Portfolio graph showing all projects as nodes. Live updates via SSE.
**Duration:** 1.5 weeks

**What gets built:**
- /graph route
- React Flow canvas with all node types
- Edge types (stage edges, conflict edges)
- Graph data API (GET /api/v1/graph)
- Zustand graph store
- SSE → graph store integration (live node updates)
- Project detail slide-in panel on node click
- MiniMap and controls
- Background dot pattern

**Agent assignments:**
```
This is a complex, frontend-only phase. Single focused agent with subagents.

Main Agent reads this PRD's graph specifications in full.

Spawns subagents for:
SubAgent A: Node components (ProjectNode, StageNode, ConflictNode)
SubAgent B: Edge components (StageEdge, ConflictEdge with animations)
SubAgent C: Graph store (Zustand) + useSSE integration
SubAgent D: Graph page + layout (dagre) + React Flow config

SubAgents A and B run in parallel.
SubAgent C waits for basic node types from A.
SubAgent D waits for all three to complete.
```

**React Flow dagre layout:**
```typescript
import dagre from '@dagrejs/dagre';

const NODE_WIDTH = 200;
const NODE_HEIGHT = 70;

function getLayoutedElements(nodes: Node[], edges: Edge[]) {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({
    rankdir: 'TB',          // top-to-bottom
    ranksep: 120,           // vertical gap between ranks
    nodesep: 40,            // horizontal gap between nodes
  });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  });
  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  return {
    nodes: nodes.map((node) => {
      const { x, y } = dagreGraph.node(node.id);
      return { ...node, position: { x: x - NODE_WIDTH / 2, y: y - NODE_HEIGHT / 2 } };
    }),
    edges,
  };
}
```

**Phase 4 Deliverables Checklist:**
- [ ] /graph route loads with all team projects as nodes
- [ ] Nodes colored by stage (matching STAGE_COLORS constants)
- [ ] Conflict edges appear between conflicting projects
- [ ] Clicking a node opens project detail sidebar
- [ ] SSE event triggers node color/stage update with animation
- [ ] Conflict edge fires pulsing animation on conflict.detected SSE event
- [ ] MiniMap shows team overview
- [ ] dagre layout groups nodes by stage vertically
- [ ] Background dot pattern renders correctly
- [ ] Zoom + pan + fit-view work correctly

---

### Phase 5 — LangGraph Backend Engine
**Goal:** Full LangGraph implementation. All graph nodes coded. State machine working.
Agents not connected to frontend yet — tested via API directly.
**Duration:** 2 weeks

**This is the most complex phase. Use Taskmaster AI workflow.**

**Pre-phase tasks (blocking, must be in order):**
1. Finalize KeystoneState TypedDict (SCHEMA AGENT validates)
2. Finalize all Pydantic schemas for node outputs
3. Define all prompt files (PROMPT ENGINEER AGENT reviews)
4. Set up LangGraph checkpointer with Postgres
5. Write integration test harness

**Then parallel build:**
```
Agent Team (CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1):

Team Lead: orchestrates, ensures state contracts respected
Teammate A: conflict_detector node + Project Intelligence Agent graph
Teammate B: brief_generator + classifier nodes
Teammate C: prd_drafter + stress_tester + assumption_excavator nodes
Teammate D: approval_router + update_writer + daily_brief nodes
Teammate E: memory_indexer + retro_generator nodes
Teammate F: background task scheduler + SSE broadcast integration

All teammates share the state.py file as read-only.
State schema changes must go through Team Lead.
Team Lead reviews node output schemas from each teammate for consistency.
```

**Quality gate per node:**
Each node must pass:
1. Unit test with 3 sample inputs
2. Output validates against Pydantic schema
3. Confidence propagation works correctly
4. Human checkpoint fires when it should
5. Prompt engineer agent reviews system prompt quality

**Phase 5 Deliverables Checklist:**
- [ ] `POST /api/v1/agents/run` triggers brief generation for a spark
- [ ] Brief generation produces valid BriefContent JSON
- [ ] PRD drafting generates all required sections
- [ ] Stress test runs 3 hypotheses in parallel (verify via logs)
- [ ] Conflict detector identifies a manufactured conflict in test data
- [ ] Approval router generates context summary for reviewer
- [ ] Daily brief generates for a test user
- [ ] Human checkpoint fires and pauses graph
- [ ] Graph resumes after checkpoint response
- [ ] All agent runs logged in agent_runs table
- [ ] SSE events fire on agent.started, agent.node_entered, agent.completed

---

### Phase 6 — Agent Integration with Frontend
**Goal:** Full end-to-end AI experience. Agents triggered from UI, results visible live.
**Duration:** 1.5 weeks

**What gets built:**
- AgentPanel component (live agent progress visualization)
- AgentThinking animation component
- Agent run → SSE → AgentPanel real-time update
- "Generate Brief" button triggers actual PRD Architect
- PRD draft appearing in real-time as agent completes
- Stress test results panel (StressTestPanel component)
- Conflict cards appearing in real-time via SSE
- Daily brief page (/daily) with generated content
- Human checkpoint UI in AgentPanel

**The demo moment this phase enables:**
User creates a Spark: "Build a tool that automatically tests LangGraph pipelines"
Agent begins. AgentPanel appears on right side of project detail.
User watches: "Classifying input..." → "Generating brief..." → "Checking for conflicts..."
Within 8 seconds: Brief appears. Agent flags a conflict with crowe-ai-onboarding
(both use Vercel Postgres). Conflict card appears with amber animation.
Resolution options: separate databases / prefix schema / coordinate usage.
This is the wow moment that makes Keystone feel different from everything else.

**Agent assignments:**
```
Frontend Agent:
  - AgentPanel component (live node progress)
  - AgentThinking (three-dot animation)
  - Checkpoint UI (question + answer input)
  - StressTestPanel (hypothesis visualization)
  - DailyBrief page

Backend-Frontend Integration Agent:
  - Connects stage advance buttons to agent triggers
  - useAgentStream hook
  - Optimistic UI updates (show PRD draft sections as they arrive)
```

**Phase 6 Deliverables Checklist:**
- [ ] Creating a Spark and clicking "Generate Brief" runs the PRD Architect
- [ ] AgentPanel appears immediately with thinking animation
- [ ] Agent nodes light up as they execute
- [ ] Brief appears in project detail after agent completes
- [ ] Stress test results render in StressTestPanel
- [ ] Conflict detected → ConflictCard appears on dashboard instantly
- [ ] Daily brief is readable and accurate for the test user
- [ ] Human checkpoint renders question, accepts answer, resumes agent
- [ ] Lighthouse Performance ≥ 85 (target 90+ after Phase 8 optimization)

---

### Phase 7 — Integrations
**Goal:** GitHub sync, Fireflies import, Azure AD SSO. Team features.
**Duration:** 1.5 weeks

**GitHub integration:**
```python
# Webhook: POST /api/webhooks/github
# Triggered on push to repos linked to Keystone projects
# Parses commit messages → calls update_writer node → appends to build_log

async def process_github_push(payload: dict, project_id: str):
    commits = payload['commits']
    commit_summary = '\n'.join([
        f"- {c['message']} ({c['id'][:7]})"
        for c in commits
    ])
    # Trigger update_writer agent
    await trigger_agent_run(
        agent_type='update_writer',
        project_id=project_id,
        input_data={'raw_build_notes': commit_summary, 'source': 'github'},
    )
```

**Fireflies integration:**
Uses existing Fireflies MCP connection.
Meeting transcript → SparkInput prepopulation.
If a Fireflies transcript is shared, Keystone extracts potential Sparks
and asks: "This meeting mentioned 3 potential projects. Want to create Sparks?"

**Azure AD SSO:**
Add Microsoft Entra provider to NextAuth:
```typescript
import MicrosoftEntraID from 'next-auth/providers/microsoft-entra-id';
// Existing credentials provider remains for non-Crowe users
```

**Phase 7 Deliverables Checklist:**
- [ ] GitHub webhook registered for a test repo
- [ ] Push to linked repo triggers build log update
- [ ] Fireflies transcript creates Spark suggestions
- [ ] Azure AD login works for @crowe.com accounts
- [ ] Team management page (add/remove members, set roles)
- [ ] Approval chain configuration page

---

### Phase 8 — Polish, Performance, and Production Readiness
**Goal:** Production-grade. Lighthouse ≥ 90. Zero console errors. Full mobile support.
**Duration:** 1 week

**Performance targets:**
- Lighthouse Performance: ≥ 90 (desktop + mobile)
- Lighthouse Accessibility: ≥ 90
- LCP (Largest Contentful Paint): < 2.5s
- TTI (Time to Interactive): < 3.5s
- Bundle size: < 250KB gzipped for initial load

**Optimizations:**
```typescript
// Lazy load React Flow (large bundle)
const KeystoneGraph = dynamic(() => import('@/components/graph/KeystoneGraph'), {
  loading: () => <GraphSkeleton />,
  ssr: false,
});

// Virtualize project list when > 20 items
import { FixedSizeList } from 'react-window';

// Image optimization: all avatars via next/image

// API response caching: SWR for non-real-time data
import useSWR from 'swr';
const { data: projects } = useSWR('/api/v1/projects', fetcher, {
  refreshInterval: 0, // SSE handles updates
  revalidateOnFocus: false,
});
```

**Accessibility:**
- All interactive elements keyboard-accessible
- Focus indicators visible (amber outline)
- Screen reader labels on all icon buttons
- Color contrast ≥ 4.5:1 for all text
- Reduced motion: `prefers-reduced-motion` respected throughout

**Error states:**
Every async operation has: loading state, error state, empty state.
All three designed with the same care as success states.

**Mobile (375px → 768px):**
- Sidebar: hidden, accessible via hamburger menu (bottom sheet on mobile)
- Dashboard: single column grid
- Project detail: stacked (left panel full width, right panel below)
- Graph: simplified view with larger touch targets
- Bottom navigation bar for primary pages

---

## PART 7 — TESTING STRATEGY

### 7.1 Frontend Tests (Vitest + React Testing Library)

```typescript
// Test: ProjectCard renders correct stage color
describe('ProjectCard', () => {
  it('shows amber border for "in_build" stage', () => {
    render(<ProjectCard project={mockProject('in_build')} />);
    expect(screen.getByTestId('stage-badge')).toHaveStyle({
      borderColor: 'var(--blue)',
    });
  });

  it('shows conflict indicator when project has open conflicts', () => {
    render(<ProjectCard project={mockProject('review', { conflicts: 2 })} />);
    expect(screen.getByTestId('conflict-indicator')).toBeInTheDocument();
  });
});

// Test: Approval card dismiss animation
describe('ApprovalRequest', () => {
  it('removes card from DOM after approval', async () => {
    const onApprove = vi.fn();
    render(<ApprovalRequest approval={mockApproval()} onApprove={onApprove} />);
    await userEvent.click(screen.getByText('Approve'));
    expect(onApprove).toHaveBeenCalledOnce();
  });
});
```

### 7.2 Backend Tests (pytest + pytest-asyncio)

```python
# Test: Stage advance validation
async def test_cannot_skip_stages(client, test_project):
    """Cannot advance from spark directly to approved."""
    response = await client.post(
        f"/api/v1/projects/{test_project.id}/advance",
        json={"target_stage": "approved"}
    )
    assert response.status_code == 422
    assert "invalid stage transition" in response.json()['detail']

# Test: Conflict detection
async def test_conflict_detected_on_shared_resource(graph_runner, two_projects):
    """Two projects both claiming Vercel Postgres triggers conflict."""
    state = await graph_runner.run_conflict_detection([
        project_with_postgres_claim(),
        project_with_postgres_claim(),
    ])
    assert len(state['detected_conflicts']) > 0
    assert state['detected_conflicts'][0]['type'] == 'resource_overlap'

# Test: Daily brief contains all required sections
async def test_daily_brief_completeness(graph_runner, user_with_projects):
    state = await graph_runner.run_daily_brief(user_with_projects.id)
    assert 'active_work' in state['brief_sections']
    assert 'waiting_on_you' in state['brief_sections']
    assert 'team_activity' in state['brief_sections']
```

---

## PART 8 — DEPLOYMENT AND INFRASTRUCTURE

### 8.1 Frontend Deployment (Vercel)

```bash
# Setup (Crowe network — SSL proxy workaround)
git init && git add . && git commit -m "feat: initial crowe-keystone"
GH="/c/Users/RachurA/AppData/Local/gh-cli/bin/gh.exe"
"$GH" repo create achyuthrachur/crowe-keystone --public --source=. --remote=origin --push

NODE_TLS_REJECT_UNAUTHORIZED=0 vercel link --yes --project crowe-keystone
NODE_TLS_REJECT_UNAUTHORIZED=0 vercel postgres create crowe-keystone-db
NODE_TLS_REJECT_UNAUTHORIZED=0 vercel env pull .env.local --yes
NODE_TLS_REJECT_UNAUTHORIZED=0 vercel deploy --prod --yes
```

**Environment variables (frontend):**
```
NEXTAUTH_URL=https://crowe-keystone.vercel.app
NEXTAUTH_SECRET=[generate: openssl rand -base64 32]
BACKEND_URL=https://crowe-keystone-api.railway.app
NEXT_PUBLIC_APP_NAME=Crowe Keystone
```

### 8.2 Backend Deployment (Railway)

Railway is chosen over Render because LangGraph requires persistent server
for SSE connections and background tasks. Railway has better persistent
connection handling and built-in Postgres add-on.

```
Service: crowe-keystone-api
Build: Dockerfile
Environment: Python 3.11
Start command: uvicorn src.main:app --host 0.0.0.0 --port $PORT --workers 1
  (single worker for SSE — multiple workers break in-memory queues)

Environment variables:
DATABASE_URL=postgresql+asyncpg://...
ANTHROPIC_API_KEY=sk-ant-...
SECRET_KEY=[generate]
FRONTEND_URL=https://crowe-keystone.vercel.app
ALLOWED_ORIGINS=https://crowe-keystone.vercel.app,http://localhost:3000
```

**Dockerfile:**
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 8.3 vercel.json (frontend)

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "version": 2,
  "framework": "nextjs",
  "regions": ["iad1"],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Frame-Options", "value": "SAMEORIGIN" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" }
      ]
    },
    {
      "source": "/fonts/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
      ]
    }
  ]
}
```

---

## PART 9 — CLAUDE CODE MULTI-AGENT CONFIGURATION

### 9.1 Root CLAUDE.md

```markdown
# CLAUDE.md — Crowe Keystone

> Read this file completely before writing any code.
> Read WORKFLOWS.md to understand which workflow to use for each phase.
> This is a monorepo: /frontend (Next.js) and /backend (Python + FastAPI + LangGraph).

## PROJECT OVERVIEW
Keystone is an AI-native project management OS for AI building teams.
Two repos worth of code, fully integrated. The AI participates in the work.

## TECH STACK
Frontend: Next.js 15, TypeScript 5, Tailwind CSS 3, shadcn/ui,
          React Flow (xyflow), Framer Motion, Geist Sans, Plus Jakarta Sans
Backend:  Python 3.11, FastAPI, LangGraph, LangChain, SQLAlchemy (async),
          Alembic, Pydantic v2, anthropic SDK
Database: PostgreSQL (Vercel Postgres), async connections via asyncpg
Auth:     NextAuth.js (frontend), JWT validation (backend)
Deploy:   Vercel (frontend), Railway (backend)

## DOMAIN PARALLEL PATTERNS
When implementing cross-domain features, spawn parallel agents:
- Frontend Agent: src/components, src/app, src/hooks, src/stores
- Backend Agent: backend/src/routers, backend/src/services
- Schema Agent: backend/src/state.py, backend/src/models, backend/src/schemas
- Test Agent: runs AFTER domain agents complete, writes tests for both

State schema changes are the ONLY blocking dependency.
Schema Agent must complete before Backend Agent starts node implementations.

## CODE STANDARDS
TypeScript: interface for objects, type for unions, never any
React: functional components, named exports, colocate styles
Python: async/await everywhere, Pydantic v2 for all schemas, type hints required
Naming: snake_case (Python), camelCase (JS/TS), PascalCase (React components)

## IMPORTANT CONSTRAINTS
- NEVER expose ANTHROPIC_API_KEY or any API key client-side
- ALL LLM calls go through backend API routes
- ALL SSE connections go through /api/v1/stream endpoint
- ALWAYS validate schema changes with keystone-schema-validator agent
- State TypedDict in backend/src/state.py is the source of truth

## AGENT SPECIALIST ROUTING
If any agent sees a task outside their domain:
- Stop immediately
- Use the Task tool to delegate to the correct specialist agent
- Do NOT attempt work in another agent's domain

## QUALITY GATES (run before marking any phase complete)
Frontend: npm run build, npm run typecheck, npm run lint, npm test
Backend:  pytest, ruff check, mypy src/
Integration: docker-compose up, run end-to-end scenario from phase checklist
```

### 9.2 Custom Agent Definitions (.claude/agents/)

**keystone-schema-validator.md:**
```yaml
---
name: keystone-schema-validator
description: Validates all state TypedDicts, Pydantic models, and SQLAlchemy
  models in the Keystone codebase. Invoke whenever adding new state fields,
  modifying existing schema, or reviewing node return type consistency.
  Critical to run before any LangGraph node implementation begins.
model: claude-sonnet-4-5
tools:
  - read
  - grep
---

You validate data schemas in the Keystone codebase.

Primary responsibilities:
1. Verify KeystoneState TypedDict fields are complete and correctly typed
2. Ensure all LangGraph node return dicts match KeystoneState field types
3. Verify Pydantic schemas match SQLAlchemy model fields
4. Check that Alembic migrations match the model definitions
5. Ensure no circular dependencies in schema imports

When validating, check:
- backend/src/state.py: KeystoneState and all nested TypedDicts
- backend/src/models/*.py: SQLAlchemy models
- backend/src/schemas/*.py: Pydantic request/response schemas
- backend/alembic/versions/*.py: migration files

Report: list of issues found, severity (blocking/warning), and fix recommendation.
```

**keystone-graph-reviewer.md:**
```yaml
---
name: keystone-graph-reviewer
description: Reviews LangGraph node implementations for correctness, proper
  state handling, and graph composition. Use after implementing any new node,
  changing node return types, or modifying graph topology. Does NOT write code.
model: claude-sonnet-4-5
tools:
  - read
  - grep
---

You review LangGraph implementations for correctness.

Check each node for:
1. Returns a dict (not the full state) with only the fields it modifies
2. Handles errors and adds to state['errors'] list (doesn't raise)
3. Respects state['loop_count'] to prevent infinite loops
4. Calls the correct model (sonnet for complex, haiku for simple)
5. System prompt is in the correct prompts/ file (not hardcoded)
6. Output is structured JSON parsed by Pydantic (no freeform text parsing)

Check graph composition for:
1. All conditional edges have exhaustive match patterns
2. Parallel branches use the Send API correctly
3. Human checkpoint nodes have interrupt_before configured
4. All terminal nodes connect to END

Report issues as: BLOCKING (will crash) | WARNING (will degrade) | SUGGESTION
```

**keystone-frontend-specialist.md:**
```yaml
---
name: keystone-frontend-specialist
description: Specialist for React Flow, Framer Motion animations, and Crowe
  brand styling in Keystone. Invoke for: node/edge component implementation,
  animation debugging, brand color application, SSE → graph store integration.
model: claude-sonnet-4-5
tools:
  - read
  - write
  - edit
---

You are the frontend specialist for Crowe Keystone.

DESIGN SYSTEM:
- Font: Geist Sans (body/UI), Plus Jakarta Sans (display headings), Geist Mono (code)
- Colors: use CSS variables from Part 0 of the PRD (--surface-base, --amber-core, etc.)
- Animations: use variants from frontend/src/lib/motion.ts ONLY. Do not create ad-hoc animations.
- Stage colors: import from frontend/src/lib/stage-colors.ts ONLY.
- NEVER use rgba(0,0,0,...) for shadows — use rgba(0,0,0,...) is OK for dark mode
  (we're dark-first, not the Crowe warm shadow system)

REACT FLOW RULES:
- All custom nodes must use memo() for performance
- Node sizes: ProjectNode 200x70, ConflictNode diamond, DecisionNode hexagon
- Never mutate nodes/edges directly — use zustand store actions
- dagre layout must be recomputed when nodes are added/removed
- Background: BackgroundVariant.Dots, 24px gap, 1px size, 4% opacity

FRAMER MOTION RULES:
- Always use AnimatePresence for mount/unmount animations
- Use layoutId for shared element transitions between views
- Never exceed 500ms duration for UI elements
- Always add mode="popLayout" on lists that add/remove items
```

---

## PART 10 — KICKOFF PROMPTS FOR EACH PHASE

### Phase 1 Kickoff
```
Read CLAUDE.md in full.
Read WORKFLOWS.md — use GSD + domain parallel pattern for this phase.
Read this PRD Part 6 Phase 1 section.

You are the Phase 1 orchestrator. This phase builds:
1. Database schema (all migrations)
2. FastAPI backend (auth + basic CRUD, no agents)
3. Next.js frontend (app shell, dashboard, project detail — static data)

Spawn THREE parallel domain agents as specified in Phase 1 of the PRD.
Schema Agent MUST complete before Backend Agent starts.
Frontend Agent is fully independent.

After all three complete, run the Phase 1 deliverables checklist.
Report: which checklist items passed, which failed, what needs fixing.
Do not proceed to Phase 2 until ALL Phase 1 items pass.
```

### Phase 5 Kickoff (LangGraph)
```
Read CLAUDE.md in full.
Read WORKFLOWS.md — use Taskmaster AI + Agent Teams for this phase.
Read this PRD Part 3 (LangGraph specifications) and Part 6 Phase 5.

CRITICAL: Before ANY node implementation:
1. Run keystone-schema-validator on backend/src/state.py
2. Confirm all Pydantic schemas exist for node outputs
3. Read all system prompts in backend/src/graph/prompts/
4. Set up integration test harness

Only then enable CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1
and spawn the agent team as specified in Phase 5.

State schema changes require Team Lead approval.
Each node must pass quality gate before Team Lead accepts it.
Run keystone-graph-reviewer after all teammates complete.
```

---

## PART 11 — OUT OF SCOPE (Phase 1-8)

The following are deliberately excluded from this PRD. They are future work.

- **Billing / subscription** — Keystone is internal
- **File attachments** — PRDs are structured data only, no PDF uploads
- **Video/audio** — no meeting recording capability in Keystone itself
- **Mobile native app** — responsive web only
- **Offline mode** — requires internet connection
- **Multi-tenancy** — single team per deployment in Phase 1-8
- **AI model selection UI** — Claude claude-sonnet-4-5 everywhere, configurable later
- **Fine-tuning** — no custom model training
- **Time tracking** — not a time management tool
- **External client access** — internal team only in Phase 1-8
- **Gantt chart / timeline view** — stage graph is the timeline
- **AI-powered code generation** — Keystone tracks code, doesn't write it
  (that's Conductor's job)
- **Direct Slack/Teams posting** — Phase 9 roadmap item
- **Custom approval chain UI builder** — hardcoded chains in Phase 1-7,
  configurable in Phase 8

---

## APPENDIX A — ENVIRONMENT VARIABLES REFERENCE

**Frontend (.env.local):**
```
NEXTAUTH_URL=
NEXTAUTH_SECRET=
BACKEND_URL=
NEXT_PUBLIC_APP_NAME=Crowe Keystone
NEXT_PUBLIC_BACKEND_WS_URL=
```

**Backend (.env):**
```
DATABASE_URL=postgresql+asyncpg://...
DATABASE_URL_SYNC=postgresql://...  (for Alembic)
ANTHROPIC_API_KEY=
SECRET_KEY=
FRONTEND_URL=
ALLOWED_ORIGINS=
ENVIRONMENT=production  (or development)
LOG_LEVEL=INFO
CONFLICT_THRESHOLD=0.75  (similarity score for conflict detection)
```

---

## APPENDIX B — REACT FLOW CUSTOM NODE FULL SPEC

### ProjectNode
```tsx
// frontend/src/components/graph/nodes/ProjectNode.tsx
import { memo } from 'react';
import { NodeProps, Handle, Position } from '@xyflow/react';
import { motion } from 'framer-motion';
import { STAGE_COLORS } from '@/lib/stage-colors';

interface ProjectNodeData {
  id: string;
  title: string;
  stage: string;
  ownerName: string;
  ownerAvatar?: string;
  hasConflicts: boolean;
  isAgentActive: boolean;
  stack: string[];
}

// Node dimensions: 200px × 70px
// Left accent: 4px wide, full height, stage color
// Stage badge: small pill, bottom-right
// Owner avatar: 20px circle, bottom-left
// Conflict dot: 8px circle, top-right corner, coral, only if hasConflicts
// Agent active: amber pulsing border animation
// Hover: scale(1.02), shadow intensifies
// Selected: 2px amber ring

export const ProjectNode = memo(({ data, selected }: NodeProps<ProjectNodeData>) => {
  const colors = STAGE_COLORS[data.stage] || STAGE_COLORS.spark;

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      animate={data.isAgentActive ? {
        boxShadow: [
          '0 0 0 1.5px rgba(245,168,0,0.3)',
          '0 0 0 3px rgba(245,168,0,0.5)',
          '0 0 0 1.5px rgba(245,168,0,0.3)',
        ],
        transition: { duration: 1.5, repeat: Infinity }
      } : {}}
      style={{
        width: 200,
        height: 70,
        background: 'var(--surface-elevated)',
        border: `1.5px solid ${selected ? 'var(--amber-core)' : colors.border}`,
        borderRadius: 8,
        position: 'relative',
        overflow: 'hidden',
        cursor: 'pointer',
        boxShadow: selected
          ? `0 0 0 2px var(--amber-core), var(--shadow-md)`
          : 'var(--shadow-sm)',
      }}
    >
      {/* Left accent bar */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0,
        width: 4, background: colors.text, borderRadius: '8px 0 0 8px',
      }} />

      {/* Conflict dot */}
      {data.hasConflicts && (
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [1, 0.7, 1],
          }}
          transition={{ duration: 1.5, repeat: Infinity }}
          style={{
            position: 'absolute', top: 6, right: 6,
            width: 8, height: 8, borderRadius: '50%',
            background: 'var(--coral)',
          }}
        />
      )}

      {/* Content */}
      <div style={{ padding: '8px 8px 8px 14px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <p style={{
          fontSize: 13, fontWeight: 500, color: 'var(--text-primary)',
          margin: 0, lineHeight: 1.3,
          overflow: 'hidden', display: '-webkit-box',
          WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        }}>
          {data.title}
        </p>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {/* Owner avatar */}
          <div style={{
            width: 18, height: 18, borderRadius: '50%',
            background: 'var(--indigo-bright)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 9, fontWeight: 600, color: 'white',
          }}>
            {data.ownerName[0].toUpperCase()}
          </div>

          {/* Stage badge */}
          <span style={{
            fontSize: 9, fontWeight: 600, padding: '2px 6px',
            borderRadius: 4, background: colors.bg, color: colors.text,
            border: `1px solid ${colors.border}`, textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            {data.stage.replace('_', ' ')}
          </span>
        </div>
      </div>

      {/* React Flow handles */}
      <Handle type="target" position={Position.Top} style={{ visibility: 'hidden' }} />
      <Handle type="source" position={Position.Bottom} style={{ visibility: 'hidden' }} />
    </motion.div>
  );
});

ProjectNode.displayName = 'ProjectNode';
```

---

## APPENDIX C — DAILY BRIEF JSON STRUCTURE

```typescript
interface DailyBriefContent {
  date: string;                    // ISO date
  generated_at: string;            // ISO timestamp
  user_name: string;

  active_work: Array<{
    project_id: string;
    project_title: string;
    stage: string;
    status_summary: string;        // 1-2 sentences
    blocking?: string;             // what's blocking progress
    next_action: string;           // specific next step
  }>;

  waiting_on_you: Array<{
    type: 'approval' | 'conflict_decision' | 'checkpoint';
    title: string;
    project_title?: string;
    summary: string;               // 1-2 sentences
    urgency: 'blocking' | 'normal';
    action_url: string;
  }>;

  team_activity: Array<{
    actor_name: string;
    action: string;                // "moved X from Y to Z"
    project_title: string;
    timestamp: string;
  }>;

  decisions_needed: Array<{
    conflict_id: string;
    description: string;
    blocking_projects: string[];
  }>;

  upcoming: Array<{
    project_title: string;
    event: string;                 // "enters review window in 3 days"
    days_until: number;
  }>;
}
```

---

*This PRD is the source of truth for Crowe Keystone.*
*Version: 1.0 | Last updated: March 2026 | Author: Achyuth Rachur*
*Next update: After Phase 3 completion — incorporate learnings into Phases 5-8.*
