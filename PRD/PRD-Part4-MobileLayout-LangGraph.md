# Crowe Keystone — PRD Part 4 of 7
## Mobile Layout Specifications + LangGraph Architecture
### Version 2.0 | March 2026

---

# SECTION 8 — MOBILE LAYOUT SPECIFICATIONS

## 8.1 MobileLayout Shell

```
┌──────────────────────────────────────────────┐
│  MOBILE TOP BAR  h-12 (48px)                │
│  bg: surface-elevated                        │
│  border-b: border-subtle                     │
│  px-4                                        │
│                                              │
│  Left: route title (Geist 600 16px)          │
│  Right: route-specific action icon (if any)  │
├──────────────────────────────────────────────┤
│  CONTENT AREA  flex-1                        │
│  overflow-y-auto                             │
│  -webkit-overflow-scrolling: touch           │
│  p-4 (16px padding)                          │
│  overscroll-behavior-y: contain              │
│                                              │
│  Routes render here.                         │
│  mobileListItemVariants on list items.       │
│                                              │
│                                              │
├──────────────────────────────────────────────┤
│  BOTTOM TAB BAR  h-[83px]                   │
│  pb-[env(safe-area-inset-bottom)]            │
│  backdrop-filter: blur(20px)                 │
│  bg: rgba(15,22,35,0.85)                    │
│  border-top: 1px solid border-subtle         │
│  position: fixed bottom-0 left-0 right-0    │
│                                              │
│  [⬡ Projects] [⬤ Graph] [⬤ Inbox 3] [◍ Today] │
└──────────────────────────────────────────────┘
```

## 8.2 BottomNav Component

```tsx
// frontend/src/components/mobile/BottomNav.tsx
'use client';
import { Layers, GitBranch, Inbox, Sun } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { navTapVariants } from '@/lib/motion';
import { useNotificationStore } from '@/stores/notifications.store';

const tabs = [
  { href: '/projects', label: 'Projects', icon: Layers },
  { href: '/graph',    label: 'Graph',    icon: GitBranch },
  { href: '/inbox',    label: 'Inbox',    icon: Inbox,    showBadge: true },
  { href: '/daily',    label: 'Today',    icon: Sun },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const pendingCount = useNotificationStore(s => s.pendingCount);

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      height: 83,
      paddingBottom: 'env(safe-area-inset-bottom)',
      background: 'rgba(15,22,35,0.85)',
      backdropFilter: 'blur(20px)',
      borderTop: '1px solid var(--border-subtle)',
      display: 'flex', alignItems: 'center',
      zIndex: 50,
    }}>
      {tabs.map(({ href, label, icon: Icon, showBadge }) => {
        const isActive = pathname.startsWith(href);
        return (
          <motion.button
            key={href}
            variants={navTapVariants}
            whileTap="tap"
            onClick={() => router.push(href)}
            style={{
              flex: 1,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: 4, height: 49,
              background: 'none', border: 'none',
              cursor: 'pointer',
              position: 'relative',
            }}
          >
            {/* Amber indicator bar above active tab */}
            {isActive && (
              <motion.div
                layoutId="bottom-nav-indicator"
                style={{
                  position: 'absolute', top: 0, left: '20%', right: '20%',
                  height: 2, background: 'var(--amber-core)',
                  borderRadius: '0 0 2px 2px',
                }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
            {/* Badge for Inbox */}
            {showBadge && pendingCount > 0 && (
              <span style={{
                position: 'absolute', top: 4, right: '20%',
                minWidth: 16, height: 16, borderRadius: 8,
                background: 'var(--coral)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 600, color: 'white',
                padding: '0 4px',
              }}>
                {pendingCount > 9 ? '9+' : pendingCount}
              </span>
            )}
            <Icon
              size={22}
              color={isActive ? 'var(--amber-core)' : 'var(--text-tertiary)'}
            />
            {/* Label only shows on active tab on narrow screens */}
            <span style={{
              fontSize: 10, fontWeight: isActive ? 600 : 400,
              color: isActive ? 'var(--amber-core)' : 'var(--text-tertiary)',
              fontFamily: 'var(--font-geist-sans)',
            }}>
              {label}
            </span>
          </motion.button>
        );
      })}
    </nav>
  );
}
```

## 8.3 PhoneFrame — Desktop Preview

```tsx
// frontend/src/components/mobile/PhoneFrame.tsx
// Renders only when mode === 'mobile' && !isMobileDevice
// iPhone 14 Pro dimensions: 393 × 852 points

export function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      width: 393,
      height: 852,
      background: '#000',
      borderRadius: 55,
      padding: 12,
      boxShadow: '0 0 0 2px #2a2a2a, 0 0 0 4px #555, 0 80px 160px rgba(0,0,0,0.9)',
      position: 'relative',
      flexShrink: 0,
    }}>
      {/* Dynamic Island */}
      <div style={{
        position: 'absolute', top: 14, left: '50%',
        transform: 'translateX(-50%)',
        width: 120, height: 37,
        background: '#000', borderRadius: 22, zIndex: 20,
        boxShadow: '0 0 0 2px #1a1a1a',
      }} />
      {/* Side buttons */}
      <div style={{ position: 'absolute', left: -3, top: 100, width: 3, height: 35, background: '#333', borderRadius: '4px 0 0 4px' }} />
      <div style={{ position: 'absolute', left: -3, top: 150, width: 3, height: 65, background: '#333', borderRadius: '4px 0 0 4px' }} />
      <div style={{ position: 'absolute', left: -3, top: 225, width: 3, height: 65, background: '#333', borderRadius: '4px 0 0 4px' }} />
      <div style={{ position: 'absolute', right: -3, top: 170, width: 3, height: 80, background: '#333', borderRadius: '0 4px 4px 0' }} />
      {/* Screen */}
      <div style={{
        width: '100%', height: '100%',
        background: 'var(--surface-base)',
        borderRadius: 44,
        overflow: 'hidden',
        position: 'relative',
      }}>
        {children}
      </div>
    </div>
  );
}
```

## 8.4 Mobile Dashboard — /projects

```
┌──────────────────────────────────────────────┐
│  MobileTopBar: "Projects"      [+ New]        │
├──────────────────────────────────────────────┤
│  STAGE FILTER (scroll-x class, mt-2, -mx-4,  │
│  px-4, gap-2, no scrollbar)                  │
│  ← [All] [Spark] [Brief] [Draft] [Review] →  │
│  scroll-snap-align: start per pill            │
│  Active: amber-glow bg, border-amber          │
│  Height: 30px pills                           │
├──────────────────────────────────────────────┤
│  CONFLICT BANNER (if conflicts > 0)           │
│  bg coral-glow, border-coral, border-l-4      │
│  mt-3 p-3 rounded-lg                          │
│  "⚠ 2 conflicts  [Resolve →]"                │
├──────────────────────────────────────────────┤
│  PROJECT LIST (mt-3, flex col, gap-2)         │
│  listContainerVariants + mobileListItemVariants│
│                                              │
│  ┌──────────────────────────────────────┐   │
│  │ [3px amber left bar]                 │   │
│  │ ⬡  crowe-ai-onboarding             │   │
│  │    Achyuth · In Build · 2 days ago  │   │
│  └──────────────────────────────────────┘   │
│  ┌──────────────────────────────────────┐   │
│  │ [3px violet left bar]                │   │
│  │ ◇  Keystone PRD                     │   │
│  │    Achyuth · Review · 1 hour ago ⚠ │   │
│  └──────────────────────────────────────┘   │
└──────────────────────────────────────────────┘
```

**MobileProjectCard specifications:**
```
Height: 80px (h-20), rounded-xl, surface-elevated
Left accent bar: absolute, 3px wide, full height, stage color
Padding: pl-4 pr-3 py-3 (left padding accounts for accent bar)
Touch target: full card is tappable (44px minimum height met)
Tap: navTapVariants (scale 0.97) → navigate to /projects/[id]
Long press (500ms): context menu (shadcn ContextMenu)

ROW 1: Stage icon (10px) + Project title (Geist 500 14px, 1-line clamp)
ROW 2: Owner name (11px, text-secondary) + " · " + stage label (11px, stage color)
       + time ago (11px, text-tertiary, right-aligned)
       + conflict dot (8px coral, conflictPulseVariants, if conflicts)

Long press context menu items:
  View PRD
  Assign to me
  Advance stage →
  Archive
```

## 8.5 Mobile Project Detail — /projects/[id]

```
┌──────────────────────────────────────────────┐
│  MobileTopBar: [← Back] [Stage badge] [⋯]   │
├──────────────────────────────────────────────┤
│  STAGE PROGRESS (compact, px-4, py-3)         │
│  Seven dots in a row: ●●●●○○○                 │
│  Filled: teal  Current: amber pulse  Future: muted│
│  Below dots: "In Build · Phase 2 of 3"        │
│  Geist 12px text-secondary                    │
├──────────────────────────────────────────────┤
│  QUICK ACTIONS (px-4, gap-2, mt-2)            │
│  [Advance Stage →] — amber, full-width, h-11  │
│  [Log Update] — surface-input outline, h-11   │
├──────────────────────────────────────────────┤
│  AGENT STATUS (conditional, px-4, mt-3)       │
│  bg amber-glow rounded-xl p-3                 │
│  "⚡ PRD Architect · Generating brief..."     │
│  Three amber dots (agentDotVariants)          │
├──────────────────────────────────────────────┤
│  PRD ACCORDION (mt-4, flex col, gap-1)         │
│  Each section = collapsible row:              │
│                                              │
│  ┌──────────────────────────────────────┐   │
│  │ ▼ Problem Statement        [Edit ✏]  │   │
│  │   Content expanded here...           │   │
│  └──────────────────────────────────────┘   │
│  ┌──────────────────────────────────────┐   │
│  │ ▶ User Stories  (3)                  │   │
│  └──────────────────────────────────────┘   │
│  ┌──────────────────────────────────────┐   │
│  │ ▶ Requirements  (8)                  │   │
│  └──────────────────────────────────────┘   │
│  ┌──────────────────────────────────────┐   │
│  │ ▶ Open Questions  ⛔ 2 blocking      │   │
│  └──────────────────────────────────────┘   │
│                                              │
│  BUILD LOG (last 5 entries, mt-4)            │
│  [See full log →]                            │
└──────────────────────────────────────────────┘
```

Accordion animation: `accordionVariants` (height 0 → auto, opacity 0 → 1).
Wrap content in `<motion.div>` with `overflow: hidden`.

## 8.6 Mobile Inbox — /inbox (Most Critical Mobile Screen)

```
┌──────────────────────────────────────────────┐
│  MobileTopBar: "Inbox"  [3 pending]          │
├──────────────────────────────────────────────┤
│  APPROVALS (2)                               │
│                                              │
│  ┌──────────────────────────────────────┐   │
│  │                                      │   │
│  │  Stage advance                       │   │
│  │  crowe-onboarding · 2h ago           │   │
│  │  ─────────────────────────────────   │   │
│  │  PRD updated. 3 questions resolved.  │   │
│  │  1 blocker remains: auth model.      │   │
│  │                                      │   │
│  │  [✓ Approve]    [◎ Changes]          │   │
│  │                                      │   │
│  └──────────────────────────────────────┘   │
│  Swipe right (>120px) = approve             │
│  Swipe left  (>120px) = request changes     │
│  Drag reveals: teal bg right, amber bg left │
│                                              │
│  CONFLICTS (1)                               │
│  ┌──────────────────────────────────────┐   │
│  │ ⚠ Resource overlap — BLOCKING         │   │
│  │ onboarding ↔ mcp-server              │   │
│  │ Both claim Vercel Postgres            │   │
│  │ [Resolve →]                          │   │
│  └──────────────────────────────────────┘   │
│                                              │
│  CHECKPOINTS (0)                             │
│  ─ No agent checkpoints pending ✓ ─         │
└──────────────────────────────────────────────┘
```

**MobileApprovalCard swipe implementation:**
```tsx
// frontend/src/components/approvals/MobileApprovalCard.tsx
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion';
import { SWIPE_THRESHOLD, tapVariants } from '@/lib/motion';

export function MobileApprovalCard({ approval, onApprove, onRequestChanges }) {
  const x = useMotionValue(0);
  const bgOpacity = useTransform(x, [-200, -SWIPE_THRESHOLD, 0, SWIPE_THRESHOLD, 200], [1, 1, 0, 1, 1]);
  const leftBgColor = useTransform(x, [-200, 0], ['rgba(245,168,0,0.2)', 'rgba(245,168,0,0)']);
  const rightBgColor = useTransform(x, [0, 200], ['rgba(5,171,140,0)', 'rgba(5,171,140,0.2)']);

  return (
    <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 12 }}>
      {/* Reveal backgrounds */}
      <motion.div style={{
        position: 'absolute', inset: 0,
        background: leftBgColor,
        display: 'flex', alignItems: 'center', paddingLeft: 16,
        borderRadius: 12,
      }}>
        <span style={{ fontSize: 12, color: 'var(--amber-core)', fontWeight: 600 }}>
          ◎ Changes
        </span>
      </motion.div>
      <motion.div style={{
        position: 'absolute', inset: 0,
        background: rightBgColor,
        display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 16,
        borderRadius: 12,
      }}>
        <span style={{ fontSize: 12, color: 'var(--teal)', fontWeight: 600 }}>
          ✓ Approve
        </span>
      </motion.div>

      {/* Draggable card */}
      <motion.div
        style={{ x, position: 'relative', zIndex: 1 }}
        drag="x"
        dragConstraints={{ left: -220, right: 220 }}
        dragElastic={0.15}
        onDragEnd={(_, info) => {
          if (info.offset.x > SWIPE_THRESHOLD)  onApprove(approval.id);
          if (info.offset.x < -SWIPE_THRESHOLD) onRequestChanges(approval.id);
        }}
      >
        {/* Card content */}
        <div style={{
          background: 'var(--surface-elevated)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 12, padding: 16,
        }}>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>
            {approval.type.replace('_', ' ')} · {formatTimeAgo(approval.created_at)}
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
            {approval.project_title}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            {approval.request_summary}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <motion.button
              variants={tapVariants} whileTap="tap"
              onClick={() => onApprove(approval.id)}
              style={{
                flex: 1, height: 44,
                background: 'var(--teal-glow)',
                border: '1px solid var(--border-teal)',
                borderRadius: 8, cursor: 'pointer',
                fontSize: 13, fontWeight: 600, color: 'var(--teal)',
                fontFamily: 'var(--font-geist-sans)',
              }}
            >
              ✓ Approve
            </motion.button>
            <motion.button
              variants={tapVariants} whileTap="tap"
              onClick={() => onRequestChanges(approval.id)}
              style={{
                flex: 1, height: 44,
                background: 'var(--amber-glow)',
                border: '1px solid var(--border-amber)',
                borderRadius: 8, cursor: 'pointer',
                fontSize: 13, fontWeight: 600, color: 'var(--amber-core)',
                fontFamily: 'var(--font-geist-sans)',
              }}
            >
              ◎ Changes
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
```

## 8.7 Mobile Graph View — /graph

```tsx
// frontend/src/components/graph/GraphView.tsx
// Routes based on screen width
'use client';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import dynamic from 'next/dynamic';
import { MobileGraphList } from './MobileGraphList';

const KeystoneGraph = dynamic(() => import('./KeystoneGraph'), {
  ssr: false,
  loading: () => <GraphSkeleton />,
});

export function GraphView() {
  const isSmall = useMediaQuery('(max-width: 639px)');
  if (isSmall) return <MobileGraphList />;
  return <KeystoneGraph />;
}
```

**MobileGraphList structure:**
```
One accordion per stage (8 stages):
  Stage header: stage icon + stage name + count
  Expanded: list of project rows (60px each)
    Each row: stage dot + title + time ago + conflict indicator

Conflict indicators on affected projects:
  Coral dot + "⚠ conflict" text in coral

"View full graph ↗" at bottom — opens graph in landscape only
```

## 8.8 Mobile Daily Brief — /daily

```
┌──────────────────────────────────────────────┐
│  MobileTopBar: "Today"  Fri Mar 7            │
├──────────────────────────────────────────────┤
│  YOUR WORK (2)  ── section heading ──        │
│                                              │
│  ┌──────────────────────────────────────┐   │
│  │ crowe-ai-onboarding                  │   │
│  │ ⬡ In Build · Phase 4               │   │
│  │ Next: npm run ingest                 │   │
│  │ [View project →]                     │   │
│  └──────────────────────────────────────┘   │
│                                              │
│  WAITING ON YOU (1)  ─────────────────────  │
│                                              │
│  ┌──────────────────────────────────────┐   │
│  │ ◇ Review — Keystone PRD v3           │   │
│  │ Awaiting your review decision        │   │
│  │ [Review now →]                       │   │
│  └──────────────────────────────────────┘   │
│                                              │
│  TEAM ACTIVITY (3)  ──────────────────────  │
│  • Alex: wire-detection → Brief · 2h        │
│  • Alex: opened conflict #4                 │
│  • crowe-onboarding stage changed           │
│                                              │
│  UPCOMING (1)  ────────────────────────── │
│  Keystone v3 enters review in 3 days        │
└──────────────────────────────────────────────┘
```

Section headings: Geist 600 11px, uppercase, letter-spacing 0.08em, text-tertiary.
Cards: surface-elevated, border-subtle, rounded-xl, p-3.
All card lists use mobileListItemVariants stagger.

## 8.9 PWA Install Prompt

```tsx
// frontend/src/components/notifications/PushPermissionPrompt.tsx
// Shown in settings/notifications/page.tsx (not on app load)
// Also shown as a dismissable banner after 60s of engagement on mobile web

// Banner (mobile web, not yet installed):
// Bottom-anchored, surface-elevated, shadow-lg
// "Add Keystone to Home Screen for push notifications"
// [Add to Home Screen] amber button
// [Dismiss] text button
// iOS: shows Safari manual instructions (no programmatic install on iOS)
// Android: uses beforeinstallprompt event for one-tap install

// Settings → Notifications page always shows:
// Current status (Enabled / Disabled / Not supported)
// [Enable push notifications] button if not enabled
// What notifications they'll receive (list)
// [Send test notification] (shown in dev only)
// [Disable notifications] button if enabled
```

---

# SECTION 9 — LANGGRAPH ARCHITECTURE

## 9.1 KeystoneState TypedDict

```python
# backend/src/state.py
# THIS FILE IS SACRED.
# Run keystone-schema-validator before ANY change.
# Nodes return DICT with only the fields they modify — not the full state.

from typing import TypedDict, Annotated, Optional
import operator

class HypothesisResult(TypedDict):
    id: str
    statement: str
    supporting_evidence: list[str]
    contradicting_evidence: list[str]
    confidence_score: float           # 0.0 to 1.0
    killed_by_red_team: bool

class AssumptionAudit(TypedDict):
    assumption: str
    fragility_score: float            # 0.0 = bedrock, 1.0 = house of cards
    what_breaks_if_wrong: str
    evidence_available: bool

class ConflictResult(TypedDict):
    id: str
    type: str
    severity: str
    project_a_id: str
    project_b_id: str
    specific_conflict: str            # exactly 2 sentences
    resolution_options: list[dict]    # [{option, implication}]

class BriefContent(TypedDict):
    problem_statement: str
    proposed_scope: str
    ai_recommendation: str            # build | configure | optimize | no_action
    effort_estimate: str              # S | M | L | XL
    stack_recommendation: list[str]
    overlaps_with: list[str]          # project IDs
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
    open_questions: list[dict]        # {id, question, blocking, owner}
    claude_code_prompt: str

class KeystoneState(TypedDict):
    # ── Identity
    run_id: str
    agent_type: str
    project_id: Optional[str]
    team_id: str
    triggered_by: str                 # user_id

    # ── Input
    raw_input: str
    input_type: str                   # spark | notes | prd | data
    context: dict                     # additional context from caller

    # ── Brief
    brief: Optional[BriefContent]

    # ── PRD
    prd_draft: Optional[PRDContent]
    prd_version: int

    # ── Stress test (parallel branches — Annotated[list, operator.add] merges results)
    hypotheses: Annotated[list[HypothesisResult], operator.add]
    adversarial_findings: list[str]
    assumption_audit: Annotated[list[AssumptionAudit], operator.add]
    stress_test_confidence: float

    # ── Conflict detection
    all_project_states: list[dict]
    detected_conflicts: Annotated[list[ConflictResult], operator.add]

    # ── Approvals
    approval_type: Optional[str]
    approval_chain: list[str]
    approval_context_summary: str

    # ── Build updates
    raw_build_notes: Optional[str]
    structured_update: Optional[dict]

    # ── Daily brief
    user_id: Optional[str]
    brief_sections: Optional[dict]

    # ── Memory
    memory_entries: list[dict]
    similar_prior_projects: list[dict]

    # ── Control flow
    human_checkpoint_needed: bool
    checkpoint_question: Optional[str]
    checkpoint_response: Optional[str]
    quality_score: float              # 0.0 to 1.0
    loop_count: int                   # prevents runaway loops (max 3)
    errors: list[str]
    status: str                       # running | complete | failed | awaiting_human
```

## 9.2 PRD Architect Graph — Full Topology

```python
# backend/src/graph/keystone_graph.py

from langgraph.graph import StateGraph, END, Send
from langgraph.checkpoint.postgres import PostgresSaver

def build_prd_architect_graph(database_url: str):
    graph = StateGraph(KeystoneState)

    # Register all nodes
    graph.add_node("context_loader",          context_loader_node)
    graph.add_node("classifier",              classifier_node)
    graph.add_node("brief_generator",         brief_generator_node)
    graph.add_node("human_checkpoint",        human_checkpoint_node)
    graph.add_node("section_problem",         draft_problem_statement_node)
    graph.add_node("section_stories",         draft_user_stories_node)
    graph.add_node("section_requirements",    draft_requirements_node)
    graph.add_node("section_stack",           draft_stack_node)
    graph.add_node("section_components",      draft_components_node)
    graph.add_node("section_merger",          section_merger_node)
    graph.add_node("stress_tester",           stress_tester_spawner_node)
    graph.add_node("test_hypothesis",         test_hypothesis_node)
    graph.add_node("red_team",                red_team_node)
    graph.add_node("assumption_excavator",    assumption_excavator_node)
    graph.add_node("open_question_extractor", open_question_extractor_node)
    graph.add_node("prompt_writer",           claude_code_prompt_writer_node)
    graph.add_node("quality_gate",            quality_gate_node)

    # Entry
    graph.set_entry_point("context_loader")
    graph.add_edge("context_loader", "classifier")

    # Route based on whether we already have a brief
    graph.add_conditional_edges("classifier", route_after_classify, {
        "needs_brief": "brief_generator",
        "has_brief":   "section_problem",
        "low_confidence": "human_checkpoint",
    })

    graph.add_conditional_edges("brief_generator", check_brief_confidence, {
        "high":  "section_problem",
        "low":   "human_checkpoint",
    })

    # Human checkpoint pauses and waits — LangGraph resumes after response
    graph.add_conditional_edges("human_checkpoint", check_checkpoint_response, {
        "responded": "section_problem",
        "waiting":   END,
    })

    # Spawn parallel section drafters using Send API
    graph.add_conditional_edges(
        "section_problem",
        spawn_parallel_sections,
        ["section_stories", "section_requirements", "section_stack", "section_components"]
    )

    # All sections feed into merger
    graph.add_edge("section_stories",      "section_merger")
    graph.add_edge("section_requirements", "section_merger")
    graph.add_edge("section_stack",        "section_merger")
    graph.add_edge("section_components",   "section_merger")

    # Parallel adversarial analysis from merger
    graph.add_conditional_edges(
        "section_merger",
        spawn_adversarial_analysis,
        ["stress_tester", "assumption_excavator"]
    )

    # Stress tester spawns parallel hypothesis tests
    graph.add_conditional_edges(
        "stress_tester",
        lambda s: [Send("test_hypothesis", {**s, "hypothesis_index": i})
                   for i in range(len(s.get("hypotheses", [])))],
        ["test_hypothesis"]
    )
    graph.add_edge("test_hypothesis",       "red_team")
    graph.add_edge("red_team",              "open_question_extractor")
    graph.add_edge("assumption_excavator",  "open_question_extractor")

    graph.add_edge("open_question_extractor", "prompt_writer")
    graph.add_edge("prompt_writer",           "quality_gate")

    # Quality gate loop (max 3 times)
    graph.add_conditional_edges("quality_gate", evaluate_quality, {
        "pass":   END,
        "revise": "section_merger",  # loop back with quality feedback
        "fail":   END,               # exceeded loop_count, graceful exit
    })

    # Compile with postgres checkpointer for human-in-the-loop
    checkpointer = PostgresSaver.from_conn_string(database_url)
    return graph.compile(
        checkpointer=checkpointer,
        interrupt_before=["human_checkpoint"],
    )


def build_conflict_detector_graph(database_url: str):
    """Runs in background on every project state change."""
    graph = StateGraph(KeystoneState)
    graph.add_node("conflict_detector", conflict_detector_node)
    graph.add_node("conflict_persister", conflict_persister_node)
    graph.add_node("conflict_notifier",  conflict_notifier_node)
    graph.set_entry_point("conflict_detector")
    graph.add_edge("conflict_detector", "conflict_persister")
    graph.add_edge("conflict_persister", "conflict_notifier")
    graph.add_edge("conflict_notifier", END)
    return graph.compile()


def build_daily_brief_graph(database_url: str):
    """Runs at 7am per user timezone, scheduled by background scheduler."""
    graph = StateGraph(KeystoneState)
    graph.add_node("data_gatherer",        daily_data_gatherer_node)
    graph.add_node("brief_generator",      daily_brief_generator_node)
    graph.add_node("brief_persister",      daily_brief_persister_node)
    graph.add_node("brief_notifier",       daily_brief_notifier_node)
    graph.set_entry_point("data_gatherer")
    graph.add_edge("data_gatherer",  "brief_generator")
    graph.add_edge("brief_generator", "brief_persister")
    graph.add_edge("brief_persister", "brief_notifier")
    graph.add_edge("brief_notifier", END)
    return graph.compile()
```

## 9.3 Node Implementation Rules

Every node MUST follow these rules. keystone-graph-reviewer will verify.

```python
# CORRECT node implementation pattern
async def example_node(state: KeystoneState) -> dict:
    """
    This node does ONE thing.
    Returns ONLY the fields it modifies.
    Never raises exceptions.
    Never modifies state directly.
    """
    # Check loop guard
    if state.get('loop_count', 0) >= 3:
        return {'status': 'failed', 'errors': [*state.get('errors', []), 'Max loops reached']}

    try:
        # Load prompt from file — NEVER inline
        prompt_path = Path(__file__).parent.parent / 'prompts' / 'example.md'
        system_prompt = prompt_path.read_text()

        # Use appropriate model for task complexity
        model = "claude-sonnet-4-5"   # complex reasoning
        # model = "claude-haiku-4-5-20251001"  # simple extraction / formatting

        llm = anthropic.AsyncAnthropic()
        result = await llm.messages.create(
            model=model,
            max_tokens=2000,
            messages=[
                {"role": "user", "content": state['raw_input']}
            ],
            system=system_prompt,
        )

        # Parse structured output with Pydantic — never regex
        output_text = result.content[0].text
        parsed = ExampleOutputModel.model_validate_json(output_text)

        # Return ONLY the fields this node modifies
        return {
            'brief': parsed.model_dump(),
            'loop_count': state.get('loop_count', 0) + 1,
        }

    except Exception as e:
        # Graceful failure — add to errors, don't raise
        return {
            'errors': [*state.get('errors', []), f'example_node failed: {str(e)}'],
            'status': 'failed',
        }
```

## 9.4 All System Prompts (full content)

Stored in `backend/src/graph/prompts/*.md`. Never inline. Version controlled.

**brief_generator.md:**
```
You are the PRD Architect for Crowe Keystone. Generate a project brief.
The team builds AI tools: Next.js 15, TypeScript, FastAPI, LangGraph, Anthropic API, Vercel, Railway.

Output BriefContent JSON. Fields:
- problem_statement: 2-3 sentences. Specific. Grounded in real work.
- proposed_scope: ≤8 bullets (what it does AND what it does NOT do)
- ai_recommendation: "build" | "configure" | "optimize" | "no_action"
- effort_estimate: "S" <1wk | "M" 1-2wks | "L" 2-4wks | "XL" >1mo
- stack_recommendation: array of specific technologies
- overlaps_with: array of project IDs that may overlap (from context)
- open_questions: ≤5 genuinely blocking questions
- confidence_score: 0.0-1.0

If confidence < 0.6: set human_checkpoint_needed=true,
checkpoint_question=[specific question that would increase confidence]

Return JSON only. No preamble. No markdown code fences.
```

**stress_tester.md:**
```
You are the stress-testing component for Crowe Keystone.
Find how this PRD could fail BEFORE anyone builds it.

Generate exactly 3 hypotheses:
1. Scope: scope is wrong — too large, too small, or targeting wrong user
2. Assumption: a hidden assumption invalidates the whole approach
3. Integration: technical choices create dependencies that break

For each:
- statement: one sentence
- supporting_evidence: what in PRD supports this
- contradicting_evidence: what argues against it
- confidence_score: 0.0-1.0

Identify the 3 most fragile assumptions:
- assumption: what is assumed
- fragility_score: 0.0 (bedrock) to 1.0 (house of cards)
- what_breaks_if_wrong: specific consequences

Return JSON: { hypotheses: [...], assumption_audit: [...] }
No preamble. Do not be encouraging. A weak PRD should score poorly.
```

**conflict_detector.md:**
```
Two projects have high semantic similarity. Determine if a REAL conflict exists.

A real conflict must be:
1. Specific (not just same general topic)
2. Actionable (a decision resolves it)
3. Material (will cost time or create technical debt if unresolved)

Do NOT flag: same domain, sequential versions, minor naming similarity.

If conflict exists:
- type: assumption_mismatch | decision_contradiction | resource_overlap |
        scope_collision | architectural_divergence
- severity: blocking | advisory
- specific_conflict: exactly 2 sentences with specific details
- resolution_options: 2-3 options with implication of each
- decision_required_from: "lead" | "builder" | "team"

If no real conflict: { conflict_exists: false }
Return JSON only. No preamble.
```

**approval_router.md:**
```
Write an approval request summary. Maximum 120 words.
The approver reviews this on their phone. Be concise.

In flowing sentences (no bullets):
1. What approval is being requested (first sentence)
2. What the project is (1-2 sentences)
3. What changed since last review (1-2 sentences)
4. Any unresolved blockers (1 sentence, or omit if none)

Also output:
- approval_chain: [user_id_1, user_id_2] in approval order
- deadline: ISO timestamp 48 hours from now

Return JSON: { summary, approval_chain, deadline }
```

**update_writer.md:**
```
Convert raw build activity into a structured build log entry.
Input: git commits, session notes, raw observations.

Output:
- completed: string[] — what was DONE, past tense, specific
- changed_from_prd: string[] — deviations from approved PRD (empty if none)
- next: string — ONE specific next action, concrete, not vague
- new_questions: string[] — questions opened this session
- build_health: "on_track" | "scope_growing" | "blocked" | "ahead_of_schedule"

Be terse. No padding. Return JSON only.
```

**retro_generator.md:**
```
Generate a project retrospective from the project history.

Sections to populate:
- built_vs_scoped: what was actually built vs. what the approved PRD specified
- decisions_changed: architectural or scope decisions that changed during the build
- learnings: 3-5 specific learnings for future projects (not generic)
- what_would_change: 2-3 specific things to do differently
- quality_signals: { on_time, scope_adherence, estimated_vs_actual_effort }

Be honest. This feeds institutional memory. Vague retrospectives are useless.
Return JSON matching the retrospectives table structure.
```

**memory_indexer.md:**
```
Extract structured memory entries from a retrospective or decision record.

Extract:
1. Decisions made: { title, rationale, alternatives_considered, type, tags }
   type: architectural | process | tool | scope | technology

2. Learnings to index: { learning, category, tags }
   Optimize for: future engineer asking "has this team done X before?"

3. Patterns to watch: { pattern, what_triggered_it, how_to_prevent, tags }

Generate tags: ≤10 specific, searchable terms per entry.
Return JSON: { decisions: [...], learnings: [...], patterns: [...] }
```

## 9.5 Human Checkpoint Flow

```
1. Agent node sets: human_checkpoint_needed=true, checkpoint_question="..."
2. Graph compiled with interrupt_before=["human_checkpoint"]
3. LangGraph PAUSES at that node, saves full state to Postgres checkpointer
4. Backend updates agent_runs: status="awaiting_human"
5. SSE event fires: agent.checkpoint → {run_id, project_id, question}
6. Frontend: AgentPanel shows question + text input (web) or notification+inbox (mobile)
7. Push notification fires to user (if backgrounded): "Agent needs your input"
8. User submits answer via POST /api/v1/agents/run/{id}/respond
9. Backend calls: graph.aupdate_state(config, {"checkpoint_response": answer})
10. Backend calls: graph.astream(None, config=config) to resume
11. SSE event fires: agent.started (resumed) then agent.node_entered etc.
12. Graph continues from where it paused
```

---

*Continue reading: PRD-Part5-AgentDefinitions-CLAUDE.md*
