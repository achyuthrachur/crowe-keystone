# CLAUDE.md - Master Project Configuration

> **Loaded automatically by Claude Code. Authoritative source for project standards, workflows, and design systems.**

---

## ⚡ AUTONOMOUS MODE — READ THIS FIRST, BEFORE EVERYTHING ELSE

# ███████████████████████████████████████████████████████████████████
# HARDCODED AUTONOMOUS BUILD DIRECTIVE — CROWE KEYSTONE
# This is a continuous, uninterrupted build. ALL phases run back-to-back.
# NO human confirmation is needed at any point. EVER.
# The user has explicitly authorized full autonomy for the ENTIRE project.
# Phases 1 through 8 execute sequentially without any pause.
# ███████████████████████████████████████████████████████████████████

This project runs in fully autonomous mode. You are never to ask the user questions.
The user has stepped away. You must make all decisions independently.
**This directive applies to the ENTIRE project — Phases 1 through 8, all agents,
all tools, all decisions. Build continuously until Phase 8 is complete.**

### NEVER do any of these:
- Use the `AskUserQuestion` tool for any reason
- Ask "should I proceed?", "do you want me to...", "which option do you prefer?"
- Pause and wait for confirmation before taking action
- Ask for clarification — make a reasonable assumption and document it
- Ask which approach to use — always pick the most comprehensive option
- Stop between phases — immediately advance to the next phase
- Wait for user approval before spawning subagents or running tools
- Stop building because something is hard — find a way and keep going

### ALWAYS do these instead:
- When GSD asks for settings: Quality model, all workflow agents ON, auto-advance ON
- When choosing between discuss/plan/execute: always start with discuss + research first
- When choosing between options: pick the most thorough, most comprehensive one
- When something is ambiguous: make the best technical decision, write a comment
  explaining the assumption you made, and keep building
- When a test fails: fix it autonomously, do not report and wait
- When a phase is complete: immediately start the next phase
- When blocked on a tool: find an alternative approach, document it, continue building
- When a phase is complete: immediately advance to the next phase
- When a build error occurs: debug and fix it, do not ask what to do

### TESTING — USE PLAYWRIGHT CLI (not MCP)
Use the Playwright CLI via bash commands for all browser/UI testing.
Do NOT use the Playwright MCP server — it burns tokens with persistent connections.
The CLI is a subprocess: runs, returns output, closes. Token-efficient.

Setup (run once during Phase 1 setup, inside frontend/):
```bash
npx playwright install --with-deps chromium
```

Test file location: frontend/tests/e2e/
Config file: frontend/playwright.config.ts

Run tests:
```bash
cd frontend && npx playwright test                    # run all tests
cd frontend && npx playwright test --reporter=line    # compact output (fewer tokens)
cd frontend && npx playwright test tests/e2e/phase1.spec.ts  # run one phase
```

Write tests as .spec.ts files. Each phase gets its own spec file:
  tests/e2e/phase1.spec.ts  — foundation checks
  tests/e2e/phase2.spec.ts  — approvals + push
  tests/e2e/phase3.spec.ts  — PRD system
  tests/e2e/phase4.spec.ts  — React Flow graph
  tests/e2e/phase5.spec.ts  — agent integration
  etc.

Test pattern to use (fast, token-efficient):
```typescript
import { test, expect } from '@playwright/test';

test('dashboard loads with project cards', async ({ page }) => {
  await page.goto('http://localhost:3000/projects');
  await expect(page.locator('[data-testid="project-card"]')).toBeVisible();
});

test('mobile viewport renders bottom nav', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('http://localhost:3000/projects');
  await expect(page.locator('[data-testid="bottom-nav"]')).toBeVisible();
});
```

After every phase: run the phase spec file. If tests fail, fix the code
autonomously and re-run. Do not ask the user what to do.
If the dev server is not running, start it first with `npm run dev &` then
wait 3 seconds before running tests.

### GSD SETTINGS (pre-configured, do not change):
- Model profile: Quality
- Research: ON (always research before planning)
- Plan check: ON (always verify plans)
- Verifier: ON (always verify execution)
- Auto-advance: ON (discuss → plan → execute automatically)
- Nyquist validation: ON
- Branching: None

---


## SECTION A: UNIVERSAL PROJECT STANDARDS

### 1. PROJECT MANAGEMENT & AGENT ORCHESTRATION

**Agent Hierarchy:** PM Agent (orchestrator) → delegates to Architect, Frontend, Backend, QA subagents.

**When to use subagents:** Codebase exploration, research tasks, parallel investigation, complex refactoring analysis.
**When NOT to:** Simple file edits, direct implementation, when you need immediate context continuity.

**Task Pattern:** Define → Design → Implement → Test → Review → Deploy

---

### 2. DESIGN SYSTEM: CROWE BRAND IDENTITY

> **CRITICAL:** All UI must align with Crowe's official digital brand guidelines. Crowe Indigo and Crowe Amber are the dominant primary colors. Secondary colors (Teal, Cyan, Blue, Violet, Coral) accent but never dominate.

> **THE FEEL:** The Crowe web experience is **warm, soft, and premium** — not cold corporate. Think high-end consulting: generous whitespace, warm cream/off-white backgrounds (never pure #FFFFFF as a page background), borderless cards that float on soft indigo-tinted shadows, subtle amber accents that draw the eye, and smooth transitions everywhere. Avoid harsh lines, hard borders, stark black-on-white contrast, or anything that feels clinical. The brand should feel like a warm handshake — trustworthy, confident, and approachable.

> **Source of truth:** https://www.crowedigitalbrand.com

#### 2.1 Typography System

**Primary Font: Helvetica Now**
Crowe's brand typeface is **Helvetica Now**, transitioning from the legacy Helvetica family. It is optimized for digital platforms with superior legibility.

```css
/* ─────────────────────────────────────────────────
   CROWE TYPOGRAPHY SYSTEM
   Primary: Helvetica Now (licensed — must be self-hosted or loaded via Adobe Fonts)
   Fallback: Arial → Helvetica Neue → system-ui (web-safe chain)
   ───────────────────────────────────────────────── */

/* Headlines & Display — Helvetica Now Display Bold */
--font-display: 'Helvetica Now Display', 'Helvetica Neue', Arial, system-ui, sans-serif;

/* Subheadings — Helvetica Now Text Bold */
--font-subhead: 'Helvetica Now Text', 'Helvetica Neue', Arial, system-ui, sans-serif;

/* Body & UI — Helvetica Now Text Regular */
--font-body: 'Helvetica Now Text', 'Helvetica Neue', Arial, system-ui, sans-serif;

/* Monospace (Code/Data) — not part of Crowe brand, choose a clean mono */
--font-mono: 'JetBrains Mono', 'Fira Code', 'IBM Plex Mono', 'Consolas', monospace;
```

**Type Styling Rules:**
- **Headlines:** Helvetica Now Display Bold — captures attention, sets the stage
- **Subheadings:** Helvetica Now Text Bold — mirrors body style, no paragraph space, underscores important info without disrupting flow
- **Body copy:** Helvetica Now Text Regular — comfortable reading experience
- **Captions/Labels:** Helvetica Now Text Regular at smaller sizes

**Type Scale (rem-based):**
```css
--text-xs: 0.75rem;    /* 12px - captions, labels */
--text-sm: 0.875rem;   /* 14px - secondary text */
--text-base: 1rem;     /* 16px - body text */
--text-lg: 1.125rem;   /* 18px - emphasized body */
--text-xl: 1.25rem;    /* 20px - small headings */
--text-2xl: 1.5rem;    /* 24px - section headings */
--text-3xl: 1.875rem;  /* 30px - page headings */
--text-4xl: 2.25rem;   /* 36px - hero headings */
--text-5xl: 3rem;      /* 48px - display text */
--text-6xl: 3.75rem;   /* 60px - large display */
```

**NEVER do:**
- Use non-brand-compliant fonts
- Neglect line spacing and letter spacing
- Compromise readability with excessively small font sizes
- Clutter designs with too many font weights or styles
- Use more than 2 font families per project (brand + mono for code only)

**Font Loading Strategy (Next.js):**
```tsx
// If self-hosting Helvetica Now (with license):
import localFont from 'next/font/local';

const helveticaNowDisplay = localFont({
  src: [
    { path: './fonts/HelveticaNowDisplay-Bold.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-display',
  display: 'swap',
});

const helveticaNowText = localFont({
  src: [
    { path: './fonts/HelveticaNowText-Regular.woff2', weight: '400', style: 'normal' },
    { path: './fonts/HelveticaNowText-Bold.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-body',
  display: 'swap',
});

// If NOT licensed, use the closest web-safe fallback stack:
// font-family: Arial, 'Helvetica Neue', Helvetica, system-ui, sans-serif;
```

#### 2.2 Color System — Crowe Official Brand Palette

> **Philosophy:** Crowe Indigo and Crowe Amber are the foundation. They must be dominant across digital assets. Secondary colors complement and accentuate — they should never overshadow the primaries. Crowe uses a **unified color approach** (no color-coding for departments or service lines).

**DO NOT:**
- Use secondary colors for text
- Use secondary colors for backgrounds
- Use gradients as backgrounds (only in SmartPath, data visuals, infographics)
- Use large areas of black for backgrounds or assets
- Let a secondary color dominate any application
- Choose low-contrast text/background combinations

```css
:root {
  /* ═══════════════════════════════════════════════════════════════
     CROWE PRIMARY COLORS
     These are the foundation — must dominate all digital assets
     ═══════════════════════════════════════════════════════════════ */
  --crowe-amber-bright: #FFD231;     /* RGB 255, 210, 49 */
  --crowe-amber-core: #F5A800;       /* RGB 245, 168, 0 — PRIMARY */
  --crowe-amber-dark: #D7761D;       /* RGB 215, 118, 29 */

  --crowe-indigo-bright: #003F9F;    /* RGB 0, 63, 159 */
  --crowe-indigo-core: #002E62;      /* RGB 0, 46, 98 */
  --crowe-indigo-dark: #011E41;      /* RGB 1, 30, 65 — PRIMARY */

  /* ═══════════════════════════════════════════════════════════════
     CROWE SECONDARY COLORS
     Complement primaries — never overshadow, never for text/backgrounds
     ═══════════════════════════════════════════════════════════════ */
  --crowe-teal-bright: #16D9BC;      /* RGB 22, 217, 188 */
  --crowe-teal-core: #05AB8C;        /* RGB 5, 171, 140 */
  --crowe-teal-dark: #0C7876;        /* RGB 12, 120, 118 */

  --crowe-cyan-light: #8FE1FF;       /* RGB 143, 225, 255 */
  --crowe-cyan-core: #54C0E8;        /* RGB 84, 192, 232 */
  --crowe-cyan-dark: #007DA3;        /* RGB 0, 125, 163 */

  --crowe-blue-light: #32A8FD;       /* RGB 50, 168, 253 */
  --crowe-blue-core: #0075C9;        /* RGB 0, 117, 201 */
  --crowe-blue-dark: #0050AD;        /* RGB 0, 80, 173 */

  --crowe-violet-bright: #EA80FF;    /* RGB 234, 128, 255 */
  --crowe-violet-core: #B14FC5;      /* RGB 177, 79, 197 */
  --crowe-violet-dark: #612080;      /* RGB 97, 32, 128 */

  --crowe-coral-bright: #FF526F;     /* RGB 255, 82, 111 */
  --crowe-coral-core: #E5376B;       /* RGB 229, 55, 107 */
  --crowe-coral-dark: #992A5C;       /* RGB 153, 42, 92 */

  /* ═══════════════════════════════════════════════════════════════
     NEUTRAL TINTS — WARM undertone (not pure gray!)
     These set the overall warmth of the UI. Every gray has a hint
     of indigo warmth so nothing feels cold or clinical.
     ═══════════════════════════════════════════════════════════════ */
  --crowe-white: #FFFFFF;
  --crowe-black: #000000;
  --crowe-tint-950: #1a1d2b;         /* Near-black with indigo warmth — use instead of #000 */
  --crowe-tint-900: #2d3142;         /* Primary text — warm dark slate, NOT pure #333 */
  --crowe-tint-700: #545968;         /* Secondary text — muted with blue undertone */
  --crowe-tint-500: #8b90a0;         /* Muted/placeholder text */
  --crowe-tint-300: #c8cbd6;         /* Soft borders, dividers */
  --crowe-tint-200: #dfe1e8;         /* Subtle separators */
  --crowe-tint-100: #eef0f4;         /* Very subtle backgrounds */
  --crowe-tint-50: #f6f7fa;          /* Off-white sections — warm, not stark */

  /* ═══════════════════════════════════════════════════════════════
     SEMANTIC TOKENS — Warm & soft by default
     ═══════════════════════════════════════════════════════════════ */
  --color-text-primary: var(--crowe-tint-900);      /* #2d3142 — warm dark, not harsh */
  --color-text-secondary: var(--crowe-tint-700);    /* #545968 */
  --color-text-muted: var(--crowe-tint-500);        /* #8b90a0 */
  --color-text-inverse: #f6f7fa;                    /* Soft white, not pure white */
  --color-text-brand: var(--crowe-indigo-dark);     /* #011E41 for bold brand text */

  /* SURFACES — Layered warm backgrounds, never pure white page bg */
  --color-surface-page: #f8f9fc;                    /* Page background — warm off-white */
  --color-surface-primary: #fafbfd;                 /* Card/content background — barely visible lift */
  --color-surface-secondary: var(--crowe-tint-50);  /* Alternating sections — #f6f7fa */
  --color-surface-elevated: var(--crowe-white);     /* Modals, popovers — pure white only here */
  --color-surface-brand: var(--crowe-indigo-dark);  /* Hero sections, footer */
  --color-surface-brand-soft: #f0f2f8;              /* Light indigo wash — for feature sections */
  --color-surface-accent: var(--crowe-amber-core);  /* Amber highlight surfaces (use sparingly) */
  --color-surface-amber-soft: #fff8eb;              /* Very light amber wash */

  --color-accent-primary: var(--crowe-amber-core);
  --color-accent-primary-hover: var(--crowe-amber-dark);
  --color-accent-secondary: var(--crowe-indigo-core);

  /* BORDERS — Subtle! Prefer shadows over borders wherever possible */
  --color-border: var(--crowe-tint-200);            /* #dfe1e8 — very soft */
  --color-border-strong: var(--crowe-tint-300);     /* #c8cbd6 — only when needed */

  /* Functional colors (use sparingly, aligned to brand) */
  --color-success: #05AB8C;           /* Crowe Teal */
  --color-warning: var(--crowe-amber-core);
  --color-error: var(--crowe-coral-core);
  --color-info: var(--crowe-blue-core);
}
```

**Color Rules:**
1. **Indigo + Amber dominate:** 60% warm neutrals/off-whites, 30% Indigo (text, headers, nav, footer), 10% Amber accents (CTAs, links, highlights)
2. **Never use pure white (#FFFFFF) as a page background.** Use `--color-surface-page` (#f8f9fc) instead. Pure white is reserved for elevated elements like modals and popovers
3. **Never use pure black (#000000) for text.** Use `--crowe-tint-900` (#2d3142) — a warm dark slate with indigo undertone
4. **Prefer shadows over borders.** Cards, containers, and sections should float on soft shadows instead of being outlined with borders. If a border is needed, use `--color-border` (#dfe1e8) — never anything darker
5. **Secondary colors are accents only:** Use for data visualization, infographics, icons, SmartPath elements — never for text, backgrounds, or dominant UI elements
6. **No gradient backgrounds:** Gradients are reserved for SmartPath device, data visuals, and infographics only
7. **Accessibility first:** All text must meet WCAG 2.1 AA (4.5:1 ratio minimum). Test contrast between text and background
8. **Warm everything:** If a color looks cold or clinical, add a slight warm/indigo shift. Shadows should use `rgba(1, 30, 65, 0.06)` (indigo-tinted) instead of `rgba(0, 0, 0, 0.06)` (pure black)

**Tailwind CSS Integration:**
```javascript
// tailwind.config.ts
const config = {
  theme: {
    extend: {
      colors: {
        crowe: {
          amber: {
            bright: '#FFD231',
            DEFAULT: '#F5A800',
            dark: '#D7761D',
          },
          indigo: {
            bright: '#003F9F',
            DEFAULT: '#002E62',
            dark: '#011E41',
          },
          teal: {
            bright: '#16D9BC',
            DEFAULT: '#05AB8C',
            dark: '#0C7876',
          },
          cyan: {
            light: '#8FE1FF',
            DEFAULT: '#54C0E8',
            dark: '#007DA3',
          },
          blue: {
            light: '#32A8FD',
            DEFAULT: '#0075C9',
            dark: '#0050AD',
          },
          violet: {
            bright: '#EA80FF',
            DEFAULT: '#B14FC5',
            dark: '#612080',
          },
          coral: {
            bright: '#FF526F',
            DEFAULT: '#E5376B',
            dark: '#992A5C',
          },
        },
        tint: {
          950: '#1a1d2b',
          900: '#2d3142',
          700: '#545968',
          500: '#8b90a0',
          300: '#c8cbd6',
          200: '#dfe1e8',
          100: '#eef0f4',
          50: '#f6f7fa',
        },
      },
      fontFamily: {
        display: ['Helvetica Now Display', 'Helvetica Neue', 'Arial', 'system-ui', 'sans-serif'],
        body: ['Helvetica Now Text', 'Helvetica Neue', 'Arial', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'IBM Plex Mono', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'crowe-sm': '0 1px 3px rgba(1,30,65,0.06), 0 1px 2px rgba(1,30,65,0.04)',
        'crowe-md': '0 4px 8px -2px rgba(1,30,65,0.06), 0 2px 4px -1px rgba(1,30,65,0.04)',
        'crowe-lg': '0 6px 16px -4px rgba(1,30,65,0.07), 0 4px 6px -2px rgba(1,30,65,0.04)',
        'crowe-xl': '0 12px 32px -8px rgba(1,30,65,0.08), 0 8px 16px -4px rgba(1,30,65,0.03)',
        'crowe-hover': '0 8px 24px -4px rgba(1,30,65,0.10), 0 4px 8px -2px rgba(1,30,65,0.04)',
        'crowe-card': '0 1px 3px rgba(1,30,65,0.04), 0 6px 16px rgba(1,30,65,0.04), 0 12px 32px rgba(1,30,65,0.02)',
        'amber-glow': '0 4px 16px rgba(245,168,0,0.20)',
      },
      backgroundColor: {
        'page': '#f8f9fc',
        'section': '#f6f7fa',
        'section-warm': '#f0f2f8',
        'section-amber': '#fff8eb',
      },
    },
  },
};
```

#### 2.3 Spacing & Layout

**8px Grid System:**
```css
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-5: 1.25rem;   /* 20px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
--space-10: 2.5rem;   /* 40px */
--space-12: 3rem;     /* 48px */
--space-16: 4rem;     /* 64px */
--space-20: 5rem;     /* 80px */
--space-24: 6rem;     /* 96px */
```

**Border Radius (soft but not bubbly — professional with warmth):**
```css
--radius-sm: 6px;     /* Buttons, inputs, chips */
--radius-md: 10px;    /* Small cards, containers */
--radius-lg: 12px;    /* Cards, panels */
--radius-xl: 16px;    /* Feature sections, large cards */
--radius-2xl: 20px;   /* Hero cards, modals */
--radius-full: 9999px; /* Pills, avatars only */
```

#### 2.4 Surface Treatments & Backgrounds

> **Crowe design principle:** Warmth through layering. Backgrounds should never be flat white. Use subtle warm off-whites and cream tints. Cards and containers should feel like they're floating — achieved through soft, indigo-tinted shadows, NOT hard borders.

```css
/* ─── PAGE BACKGROUND — always warm, never pure white ─── */
.bg-page {
  background: #f8f9fc;  /* Warm off-white with slight blue-indigo warmth */
}

/* ─── SECTION ALTERNATION — gentle contrast between sections ─── */
.bg-section-light {
  background: #fafbfd;  /* Barely-there lift above page bg */
}
.bg-section-warm {
  background: #f6f7fa;  /* Slightly more visible, still very soft */
}
.bg-section-indigo-wash {
  background: #f0f2f8;  /* Light indigo wash for feature/CTA sections */
}
.bg-section-amber-wash {
  background: #fff8eb;  /* Very soft amber glow — testimonials, highlights */
}

/* ─── INDIGO BRAND SURFACE — hero sections, footer, CTAs ─── */
.bg-crowe-brand {
  background: var(--crowe-indigo-dark);
  color: #f6f7fa;  /* Soft white text, not pure #FFF */
}

/* ─── SUBTLE TEXTURE — optional, for added depth ─── */
.bg-grid-subtle {
  background:
    linear-gradient(to bottom, #f8f9fc 0%, #f0f2f8 100%),
    repeating-linear-gradient(
      0deg,
      transparent,
      transparent 1px,
      rgba(1, 30, 65, 0.012) 1px,  /* Indigo-tinted grid lines */
      rgba(1, 30, 65, 0.012) 2px
    );
}

/* ─── GLASSMORPHISM — modals, popovers, floating panels ─── */
.bg-glass {
  background: rgba(250, 251, 253, 0.85);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(1, 30, 65, 0.04);  /* Barely visible indigo border */
  box-shadow:
    0 1px 2px rgba(1, 30, 65, 0.04),
    0 8px 24px rgba(1, 30, 65, 0.06);
}

/* ─── DOT PATTERN — decorative, use very sparingly ─── */
.bg-dots {
  background-image: radial-gradient(
    circle,
    rgba(1, 30, 65, 0.06) 1px,
    transparent 1px
  );
  background-size: 24px 24px;
}
```

**Card Pattern — Borderless with Soft Shadows:**
```css
/* ✅ CORRECT — Crowe-style card (warm, floating, no harsh borders) */
.card {
  background: var(--crowe-white);       /* White card on off-white page = subtle float */
  border: none;                         /* NO borders on cards! */
  border-radius: var(--radius-lg);      /* 12px — soft but not excessive */
  box-shadow:
    0 1px 3px rgba(1, 30, 65, 0.04),   /* Tight shadow — defines edge */
    0 6px 16px rgba(1, 30, 65, 0.04),  /* Mid shadow — depth */
    0 12px 32px rgba(1, 30, 65, 0.02); /* Ambient shadow — atmosphere */
  transition: box-shadow var(--duration-normal) var(--ease-out),
              transform var(--duration-normal) var(--ease-out);
}

.card:hover {
  box-shadow:
    0 2px 4px rgba(1, 30, 65, 0.06),
    0 8px 24px rgba(1, 30, 65, 0.06),
    0 16px 48px rgba(1, 30, 65, 0.04);
  transform: translateY(-2px);          /* Subtle lift on hover */
}

/* ❌ WRONG — harsh, clinical card */
.card-bad {
  background: #FFFFFF;
  border: 1px solid #E0E0E0;           /* Hard gray border = ugly */
  box-shadow: 0 2px 4px rgba(0,0,0,0.1); /* Pure black shadow = cold */
}
```

#### 2.5 Shadow System

> **Key insight:** Shadows should use indigo-tinted rgba (from `#011E41`), NOT pure black. This creates a warm, cohesive feel that ties back to the brand.

```css
/* ─── LAYERED SHADOWS — indigo-tinted, not black ─── */
--shadow-xs: 0 1px 2px rgba(1, 30, 65, 0.04);
--shadow-sm: 0 1px 3px rgba(1, 30, 65, 0.06), 0 1px 2px rgba(1, 30, 65, 0.04);
--shadow-md: 0 4px 8px -2px rgba(1, 30, 65, 0.06), 0 2px 4px -1px rgba(1, 30, 65, 0.04);
--shadow-lg: 0 6px 16px -4px rgba(1, 30, 65, 0.07), 0 4px 6px -2px rgba(1, 30, 65, 0.04);
--shadow-xl: 0 12px 32px -8px rgba(1, 30, 65, 0.08), 0 8px 16px -4px rgba(1, 30, 65, 0.03);
--shadow-2xl: 0 24px 48px -12px rgba(1, 30, 65, 0.12);

/* ─── INTERACTIVE SHADOWS — hover lift effect ─── */
--shadow-hover: 0 8px 24px -4px rgba(1, 30, 65, 0.10), 0 4px 8px -2px rgba(1, 30, 65, 0.04);
--shadow-active: 0 2px 4px rgba(1, 30, 65, 0.08);  /* Pressed/active state */

/* ─── AMBER GLOW — for CTAs and important actions ─── */
--shadow-amber-glow: 0 4px 16px rgba(245, 168, 0, 0.20);
--shadow-amber-glow-hover: 0 6px 24px rgba(245, 168, 0, 0.30);

/* ❌ NEVER USE: */
/* box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);  — pure black = cold and harsh */
/* border: 1px solid #E0E0E0;  — hard gray borders kill warmth */
```

#### 2.6 Common Anti-Patterns — What Makes It Look Harsh

> **If your output looks stark, cold, or clinical, check these items first:**

| ❌ HARSH (avoid) | ✅ SOFT (do this instead) |
|---|---|
| `background: #FFFFFF` as page bg | `background: #f8f9fc` (warm off-white) |
| `color: #333333` or `color: #000` | `color: #2d3142` (warm dark slate) |
| `border: 1px solid #E0E0E0` on cards | `box-shadow: 0 1px 3px rgba(1,30,65,0.06)` |
| `border: 1px solid #ccc` dividers | `border: 1px solid rgba(1,30,65,0.06)` or just spacing |
| `rgba(0,0,0,0.1)` shadows | `rgba(1,30,65,0.06)` indigo-tinted shadows |
| Hard 1px borders everywhere | Soft shadows + background color differentiation |
| Pure black `#000` anywhere | `--crowe-tint-950` (#1a1d2b) or Indigo Dark |
| `border-radius: 4px` | `border-radius: 10-12px` for cards, `6px` for inputs |
| Stark section transitions | Subtle background color shifts between sections |
| No spacing between sections | `py-16` to `py-24` minimum between major sections |
| `<hr>` or horizontal rules | Whitespace + section background changes |

**The Litmus Test:** Squint at your page. If you see harsh horizontal or vertical lines separating content, replace those borders with either (a) soft shadows, (b) subtle background color changes, or (c) generous whitespace.

---


### 3. ANIMATION SYSTEM

> **Principle:** Animations serve UX purposes—they're not decoration. Every animation must have a functional reason. Keep the Crowe brand feeling polished, professional, and modern with smooth, intentional motion.

#### 3.1 Timing & Easing

```css
/* Duration tokens */
--duration-instant: 75ms;    /* Micro-feedback */
--duration-fast: 150ms;      /* Hover states, toggles */
--duration-normal: 250ms;    /* Standard transitions */
--duration-slow: 350ms;      /* Complex state changes */
--duration-slower: 500ms;    /* Page transitions, reveals */

/* Easing curves */
--ease-out: cubic-bezier(0.16, 1, 0.3, 1);      /* Enter animations */
--ease-in: cubic-bezier(0.7, 0, 0.84, 0);       /* Exit animations */
--ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);  /* Symmetric animations */
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1); /* Bouncy feel */
```

#### 3.2 Animation Library: Anime.js v4

**Installation:**
```bash
npm install animejs
```

**Basic Usage (React):**
```jsx
import { animate, stagger, createScope } from 'animejs';
import { useEffect, useRef } from 'react';

function AnimatedComponent() {
  const root = useRef(null);
  const scope = useRef(null);

  useEffect(() => {
    scope.current = createScope({ root }).add(self => {
      // Staggered entrance animation
      animate('.card', {
        opacity: [0, 1],
        translateY: [20, 0],
        duration: 600,
        delay: stagger(80, { from: 'first' }),
        ease: 'outQuint'
      });
    });

    return () => scope.current?.revert();
  }, []);

  return <div ref={root}>{/* content */}</div>;
}
```

**Common Animation Patterns:**

```javascript
// Page load reveal
animate('.hero-content', {
  opacity: [0, 1],
  translateY: [30, 0],
  duration: 800,
  delay: 200,
  ease: 'outQuint'
});

// Hover micro-interaction
animate(element, {
  scale: 1.02,
  duration: 200,
  ease: 'outQuad'
});

// Scroll-triggered animation
import { createScope, animate, onScroll } from 'animejs';

onScroll({
  target: '.section',
  enter: 'bottom 80%',
  onEnter: () => {
    animate('.section .content', {
      opacity: [0, 1],
      translateY: [40, 0],
      duration: 700,
      ease: 'outQuint'
    });
  }
});

// Crowe Amber accent pulse (e.g., CTA button glow)
animate('.cta-button', {
  boxShadow: [
    '0 0 0 0 rgba(245, 168, 0, 0.4)',
    '0 0 0 12px rgba(245, 168, 0, 0)',
  ],
  duration: 1500,
  loop: true,
  ease: 'outQuad'
});

// Number counter (stats, metrics)
animate('.stat-number', {
  innerHTML: [0, 500],
  round: 1,
  duration: 2000,
  ease: 'outExpo'
});
```

#### 3.3 Alternative: Framer Motion (React-specific)

**When to use Motion over Anime.js:**
- React-only projects
- Gesture-heavy interfaces
- Layout animations
- AnimatePresence (mount/unmount animations)

```jsx
import { motion, AnimatePresence } from 'framer-motion';

// Basic animation
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
>
  Content
</motion.div>

// Staggered children
const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

<motion.ul variants={container} initial="hidden" animate="show">
  {items.map(i => <motion.li key={i} variants={item}>{i}</motion.li>)}
</motion.ul>

// Crowe-branded page transition
const pageTransition = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20 },
  transition: { duration: 0.35, ease: [0.65, 0, 0.35, 1] }
};

// Scroll-triggered reveal with Crowe Indigo underline
<motion.div
  initial={{ opacity: 0, y: 30 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true, margin: '-100px' }}
  transition={{ duration: 0.6, ease: 'easeOut' }}
>
  <h2>Smart decisions today.</h2>
  <motion.div
    className="h-1 bg-crowe-amber"
    initial={{ width: 0 }}
    whileInView={{ width: '100%' }}
    transition={{ delay: 0.3, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
  />
</motion.div>
```

#### 3.4 Animation Rules

**DO:**
- Use animations to provide feedback (button press, form submission)
- Animate state changes to maintain context
- Use staggered animations for lists (50-100ms delay between items)
- Respect `prefers-reduced-motion`
- Use Crowe Amber for attention-drawing micro-animations (glows, underlines)
- Use smooth, professional easing — the brand is trustworthy and polished

**DON'T:**
- Add animation for decoration alone
- Use durations longer than 500ms for UI elements
- Animate multiple properties simultaneously (sequencing is better)
- Block user interaction during animations
- Use flashy/playful animations that undermine Crowe's professional tone

```css
/* Always respect user preferences */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---


---

### 4. DEVELOPMENT STANDARDS

#### 4.1 Tech Stack (Default)

```
Framework:     Next.js 14+ (App Router)
Styling:       Tailwind CSS + CSS Variables (Crowe brand tokens)
Animation:     Anime.js v4 + Framer Motion
UI Components: shadcn/ui (themed to Crowe palette)
State:         React Context + Zustand (if needed)
Database:      Prisma + PostgreSQL (Vercel Postgres/Supabase)
Auth:          NextAuth.js or Clerk
Testing:       Vitest + React Testing Library
Deployment:    Vercel
```

#### 4.2 shadcn/ui — Crowe Theme

```css
/* globals.css — shadcn overrides for warm Crowe brand */
@layer base {
  :root {
    --background: 225 33% 98%;              /* #f8f9fc warm off-white */
    --foreground: 228 20% 22%;              /* #2d3142 warm dark */
    --card: 225 50% 99%;                    /* #fafbfd lifted card */
    --card-foreground: 228 20% 22%;
    --popover: 0 0% 100%;
    --popover-foreground: 228 20% 22%;
    --primary: 215 98% 13%;                 /* Crowe Indigo Dark */
    --primary-foreground: 225 33% 97%;
    --secondary: 39 100% 48%;              /* Crowe Amber */
    --secondary-foreground: 215 98% 13%;
    --muted: 225 20% 96%;                   /* #f0f2f8 indigo-wash */
    --muted-foreground: 228 10% 37%;        /* #545968 */
    --accent: 39 100% 48%;
    --accent-foreground: 215 98% 13%;
    --destructive: 341 79% 56%;            /* Crowe Coral */
    --destructive-foreground: 225 33% 97%;
    --border: 226 17% 89%;                  /* #dfe1e8 soft */
    --input: 226 17% 89%;
    --ring: 215 100% 19%;                  /* Crowe Indigo Core */
    --radius: 0.75rem;
  }
}
```

#### 4.3 Code Style

**TypeScript:** Use `interface` for objects, `type` for unions. Always type params and returns. Never use `any`.

**React:** Functional components with TypeScript. Named exports (not default). Colocate styles, tests, components.

**File Naming:** PascalCase for components (`Button/Button.tsx`), kebab-case for routes (`app/dashboard/page.tsx`).

#### 4.4 Git Workflow

**Branches:** `feature/[id]-desc`, `bugfix/[id]-desc`, `hotfix/[id]-desc`

**Commits (Conventional):** `feat:`, `fix:`, `docs:`, `style:`, `refactor:`, `test:`, `chore:`

**Pre-commit:** Husky + lint-staged → ESLint fix + Prettier on `*.{ts,tsx}`.

---

### 5. DEPLOYMENT (VERCEL)

```bash
# Setup
git init && git add . && git commit -m "feat: initial setup"
gh repo create achyuthrachur/[name] --public --source=. --remote=origin --push
vercel          # Link project
vercel --prod   # Production deploy
```

**vercel.json:**
```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "version": 2,
  "framework": "nextjs",
  "regions": ["iad1"],
  "headers": [
    { "source": "/(.*)", "headers": [
      { "key": "X-Frame-Options", "value": "SAMEORIGIN" },
      { "key": "X-Content-Type-Options", "value": "nosniff" }
    ]},
    { "source": "/fonts/(.*)", "headers": [
      { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
    ]}
  ]
}
```

**Environment Variables:**
```bash
vercel env add DATABASE_URL production
vercel env add NEXTAUTH_SECRET production  # openssl rand -base64 32
```

---

### 6. GITHUB & CI/CD

**GitHub Username:** `achyuthrachur`

```bash
gh repo create achyuthrachur/[name] --public --source=. --remote=origin --push
```

**CI (`.github/workflows/ci.yml`):**
```yaml
name: CI
on:
  push: { branches: [main, develop] }
  pull_request: { branches: [main] }
jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run test -- --coverage
      - run: npm run build
```

**Deploy (`.github/workflows/deploy.yml`):**
```yaml
name: Deploy
on: { push: { branches: [main] } }
env:
  VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
  VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm install -g vercel@latest
      - run: vercel pull --yes --environment=production --token=${{ secrets.VERCEL_TOKEN }}
      - run: vercel build --prod --token=${{ secrets.VERCEL_TOKEN }}
      - run: vercel deploy --prebuilt --prod --token=${{ secrets.VERCEL_TOKEN }}
```

**Secrets:** `gh secret set VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`

---

### 7. QUICK REFERENCE COMMANDS

```bash
# Dev
npm run dev | build | start | lint | lint:fix | typecheck | test | test:watch

# Deploy
vercel | vercel --prod | vercel env pull | vercel logs

# Git/GitHub
gh repo create achyuthrachur/[name] --public --source=. --remote=origin --push
gh pr create --fill | gh pr list | gh pr merge [n]
gh run list | gh run watch

# Database (Prisma)
npx prisma generate | db push | migrate dev | studio

# Utilities
npx create-next-app@latest [name] --typescript --tailwind --eslint --app --src-dir
npx shadcn@latest init | add [component]
```

---

### 8. NEW PROJECT INIT

```bash
# 1. Create
npx create-next-app@latest [name] --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
cd [name]

# 2. Dependencies
npx shadcn@latest init
npm install animejs framer-motion
npm install -D husky lint-staged prettier

# 3. Brand setup
# Place Helvetica Now .woff2 in src/fonts/ (if licensed)
# Copy Crowe color tokens from Section 2.2 into globals.css
# Apply shadcn theme from Section 4.2

# 4. Linting
npx husky init && echo "npx lint-staged" > .husky/pre-commit

# 5. Push
git add . && git commit -m "feat: initial setup with Crowe brand"
gh repo create achyuthrachur/[name] --public --source=. --remote=origin --push

# 6. Vercel
vercel link && vercel env pull .env.local

# 7. CI/CD — copy ci.yml + deploy.yml from Section 6
mkdir -p .github/workflows

# Verify: npm run dev && npm run build && npm run lint && npm run typecheck
```

---

### 9. QUALITY GATES

Before merging: ✅ Tests pass · ✅ TypeScript clean · ✅ ESLint clean · ✅ Preview deploys · ✅ Lighthouse > 90 · ✅ No console errors · ✅ Responsive verified · ✅ Crowe brand: warm bgs, soft shadows, no harsh borders

---

### 10. CONFIG FILES

**`.prettierrc`:** `{ "semi": true, "singleQuote": true, "tabWidth": 2, "trailingComma": "es5", "printWidth": 100 }`

---

## SECTION B: PROJECT-SPECIFIC CONFIGURATION

> Fill when starting a new project. Overrides Section A where conflicts exist.

| Field | Value |
|-------|-------|
| **Name** | `[PROJECT_NAME]` |
| **Repo** | `https://github.com/achyuthrachur/[PROJECT_NAME]` |
| **URL** | `https://[PROJECT_NAME].vercel.app` |
| **Type** | [SaaS / Marketing / Dashboard / Other] |

**Stack Deviations:** (only if different from defaults)
**Color Override:** (if approved) `--color-brand: #___;`
**Terminology:** SmartPath = Crowe's dynamic brand device (only context where gradients are permitted)

---

## APPENDIX A: UI & ANIMATION LIBRARY TOOLKIT

> **These are the approved libraries for building Crowe-branded UIs.** Agents should use these as their primary building blocks. Always apply Crowe colors/tokens when using them — never use default library colors.

---

### A1. shadcn/ui — Component Foundation

**Docs:** https://ui.shadcn.com · **Install:** `npx shadcn@latest init` then `npx shadcn@latest add [component]`

**What it is:** Copy-paste React components built on Radix UI + Tailwind. Not a dependency — components live in YOUR codebase at `components/ui/`. Full ownership, full customization.

**Core components to use:** Accordion, Alert, Avatar, Badge, Button, Calendar, Card, Carousel, Checkbox, Collapsible, Command, Dialog, Dropdown Menu, Form, Hover Card, Input, Label, Navigation Menu, Pagination, Popover, Progress, Radio Group, Scroll Area, Select, Separator, Sheet, Sidebar, Skeleton, Slider, Switch, Table, Tabs, Textarea, Toast, Toggle, Tooltip.

**Crowe theming is MANDATORY.** After `init`, immediately apply the shadcn HSL overrides from Section 4.2. Every shadcn component reads from these CSS variables — set them once and everything is on-brand.

**Blocks:** shadcn also provides full page blocks at https://ui.shadcn.com/blocks — use these as starting points for dashboards, auth pages, settings, etc. Always re-skin to Crowe tokens.

---

### A2. 21st.dev — Premium Community Components

**Browse:** https://21st.dev/community/components

**What it is:** Community-built component registry. Higher-end, more animated, more polished than base shadcn. Think of it as the "premium layer" on top of shadcn.

**Key categories:** Heroes (landing parallax/animated heroes), Buttons (animated CTAs, magnetic, ripple), Cards (hover animations, feature/pricing/testimonial), Scroll Areas (scroll reveals, parallax), Backgrounds (particles, mesh, animated gradients), Shaders (WebGL hero backgrounds), Text (animated reveals, typewriter, gradient text), Navigation (animated navbars, mega menus, docks), Features (bento grids, icon showcases), Testimonials (carousel, quote animations), Pricing (toggle, animated cards), Footers (animated link sections).

**Usage pattern:** Browse → preview → copy code → adapt to Crowe colors. Replace defaults with `--crowe-indigo-dark`, `--crowe-amber-core`, and warm tint tokens.

---

### A3. React Bits — Animated Components

**Docs:** https://reactbits.dev · **Install:** `npx shadcn@latest add @react-bits/[Component]-TS-TW`

**What it is:** 110+ animated, interactive React components. Copy-paste or CLI install. Each comes in 4 variants: JS-CSS, JS-TW, TS-CSS, TS-TW. **Always use TS-TW variant** for our stack.

**Top categories:** Backgrounds (9.8/10 — Aurora, Beams, Particles, Waves), Animations (9.5/10 — BlobCursor, SplashCursor, Magnet, FollowCursor), Text Animations (9.0/10 — BlurText, SplitText, CountUp, CircularText, FuzzyText, GradientText), Components (AnimatedList, TiltCard, Dock, SpotlightCard, StackedCards).

**Crowe integration:** BlurText/SplitText → hero headings in `--crowe-indigo-dark`. CountUp → stats. Aurora/Particles → colors `['#011E41','#002E62','#F5A800']`. TiltCard → `--shadow-crowe-lg`. Always wrap in `prefers-reduced-motion` check.

---

### A4. Anime.js v4 — Low-Level Animation Engine

**Docs:** https://animejs.com/documentation · **Install:** `npm install animejs`

**What it is:** The Swiss army knife — animate DOM, SVG, CSS, objects. Use when React Bits / Framer Motion don't have the specific pattern you need.

**V4 API (modular imports — only import what you need):**
```javascript
import { animate, stagger, createTimeline, createScope, createDraggable,
         createSpring, onScroll, createDrawable, morphTo, createMotionPath } from 'animejs';
```

**Key modules:** `animate()` (10.8KB — single element anims), `createTimeline()` (+0.55KB — sequenced multi-step), `onScroll()` (+4.3KB — scroll-triggered/parallax), `stagger()` (+0.48KB — staggered list entrances), `createDraggable()` (+6.4KB — drag/swipe/flick), `createSpring()` (+0.52KB — physics-based), `createScope()` (+0.22KB — media queries + cleanup), SVG: `createDrawable`/`morphTo`/`createMotionPath` (0.35KB — line drawing, shape morphing, motion paths). Total bundle: 24.5KB — import only what you need.

**Crowe-specific patterns already in Section 3.2** — refer there for page load, hover, scroll-trigger, amber pulse, and counter examples.

---

### A5. Iconsax — Icon Library

**Browse:** https://app.iconsax.io · **Install:** `npm i iconsax-react`

**What it is:** 1000 icons × 6 styles = 6000 icon variants. 24px grid, tree-shakeable. Replaces Lucide for richer icon options.

**6 Styles:** `Linear` (default, thin outline — body/nav icons), `Bold` (filled — active states, CTAs), `Outline` (medium outline — secondary buttons), `TwoTone` (dual-tone — feature highlights with Indigo+Amber), `Bulk` (filled+opacity — dashboards), `Broken` (gapped — decorative).

**Usage:** `import { ArrowRight, Chart } from 'iconsax-react';` → `<Chart color="var(--crowe-indigo-dark)" variant="Bold" size={24} />`

**Crowe icon rules:** Default `Linear` for body, `Bold` for CTAs. Color: `currentColor` (inherits warm `#2d3142`). Amber for attention icons. Sizes: 20px inline, 24px standalone, 32-48px features. No colored icon backgrounds.

---

### Library Decision Tree

Standard UI component → **shadcn/ui (A1)** · Fancy animated version → **21st.dev (A2)** then **React Bits (A3)** · Specific animation (scroll/stagger/SVG/drag) → **Anime.js v4 (A4)** · Layout/gesture React animations → **Framer Motion (Section 3.3)** · Icon → **Iconsax (A5)**

---

## APPENDIX B: RESOURCES

- [Crowe Brand Hub](https://www.crowedigitalbrand.com/) · [Color](https://www.crowedigitalbrand.com/color) · [Typography](https://www.crowedigitalbrand.com/typography)
- [shadcn/ui](https://ui.shadcn.com/) · [21st.dev](https://21st.dev/community/components) · [React Bits](https://reactbits.dev)
- [Anime.js](https://animejs.com/documentation/) · [Framer Motion](https://motion.dev/) · [Iconsax](https://app.iconsax.io/)
- [Contrast Checker](https://webaim.org/resources/contrastchecker/)
