# Keystone — PRD Phase D2: Kanban Board
> Version 1.0 | Status: Draft | Author: Achyuth Rachur
> Prereq: Phase D1 complete — typecheck pass, build pass, sidebar updated

---

## Overview

Phase D2 builds the Engagements Kanban board at `/engagements`. This is the
primary landing page of the tool — it shows all engagements across 8 columns,
supports real-time card movement via SSE, full drag-and-drop between columns,
staggered entrance animations, and skeleton loading.

Phase D2 deliverables:
1. `frontend/src/app/(app)/engagements/page.tsx` — full Kanban board page
2. `frontend/src/components/keystone/KanbanBoard.tsx` — board container + column layout
3. `frontend/src/components/keystone/KanbanColumn.tsx` — single column with header + card list
4. `frontend/src/components/keystone/EngagementCard.tsx` — individual card with all status signals
5. `frontend/src/components/keystone/EngagementCardSkeleton.tsx` — loading skeleton
6. `frontend/src/components/keystone/StatusBadge.tsx` — reusable colored status pill
7. `frontend/src/components/keystone/PipelineStepIndicator.tsx` — mini step progress bar on card

Exit criteria: board renders with skeleton on load, cards populate from API,
drag-and-drop moves cards between columns, SSE status changes animate cards
to new columns in real time.

---

## 1. Kanban Column Definitions

Define this constant in `KanbanBoard.tsx`. These are the 8 columns in order.
`accentColor` is used for the column header accent line and card border glow on hover.

```typescript
import type { KanbanColumn } from '@/types/keystone.types';

export const KANBAN_COLUMNS: KanbanColumn[] = [
  {
    id: 'draft',
    label: 'Draft',
    statuses: ['draft', 'uploading'],
    accentColor: 'var(--text-tertiary)',
    emptyLabel: 'No drafts yet',
  },
  {
    id: 'ready',
    label: 'Ready',
    statuses: ['ready'],
    accentColor: 'var(--blue)',
    emptyLabel: 'No engagements ready',
  },
  {
    id: 'running',
    label: 'Running',
    statuses: ['running', 'compiling'],
    accentColor: 'var(--amber-core)',
    emptyLabel: 'Nothing running',
  },
  {
    id: 'gate1',
    label: 'Gate 1 Review',
    statuses: ['awaiting_review_1'],
    accentColor: 'var(--violet)',
    emptyLabel: 'No reviews pending',
  },
  {
    id: 'gate2',
    label: 'Gate 2 Review',
    statuses: ['awaiting_review_2'],
    accentColor: 'var(--violet)',
    emptyLabel: 'No reviews pending',
  },
  {
    id: 'gate3',
    label: 'Gate 3 Review',
    statuses: ['awaiting_review_3'],
    accentColor: 'var(--violet)',
    emptyLabel: 'No reviews pending',
  },
  {
    id: 'complete',
    label: 'Complete',
    statuses: ['complete'],
    accentColor: 'var(--teal)',
    emptyLabel: 'No completed engagements',
  },
  {
    id: 'failed',
    label: 'Failed',
    statuses: ['failed'],
    accentColor: 'var(--coral)',
    emptyLabel: 'No failures',
  },
];
```

---

## 2. Page — frontend/src/app/(app)/engagements/page.tsx

```tsx
'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { useKeystoneStore } from '@/stores/keystone.store';
import { useKeystoneSSE } from '@/hooks/useKeystoneSSE';
import { KanbanBoard } from '@/components/keystone/KanbanBoard';

export default function EngagementsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { fetchEngagements, engagements, engagementsLoading } = useKeystoneStore();
  useKeystoneSSE();

  useEffect(() => {
    if (session?.accessToken) {
      fetchEngagements(session.accessToken as string);
    }
  }, [session?.accessToken]);

  return (
    // Page fade-in transition
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 24 }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--text-primary)', margin: 0, fontFamily: 'var(--font-display)' }}>
            Engagements
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
            {engagements.length} engagement{engagements.length !== 1 ? 's' : ''}
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => router.push('/engagements/new')}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            height: 40, padding: '0 20px', borderRadius: 8,
            background: 'var(--amber-core)', border: 'none',
            color: 'var(--text-inverse)', fontSize: 14, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'var(--font-geist-sans)',
            boxShadow: 'var(--shadow-amber)',
          }}
        >
          <Plus size={16} />
          New Engagement
        </motion.button>
      </div>

      {/* Kanban board */}
      <KanbanBoard engagements={engagements} loading={engagementsLoading} />
    </motion.div>
  );
}
```

---

## 3. KanbanBoard.tsx

Wraps the 8 columns in a horizontal scroll container. Uses `@dnd-kit/core`
`DndContext` with `PointerSensor` and `KeyboardSensor`. When a drag ends, calls
`PATCH /engagements/{id}` to update status — but only if the target column
maps to a valid status transition. On optimistic update, immediately move the
card in the store via `handleStatusChanged`.

```tsx
'use client';

import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useKeystoneStore } from '@/stores/keystone.store';
import { KANBAN_COLUMNS } from './KanbanBoard'; // re-export or import from constants
import { KanbanColumn } from './KanbanColumn';
import { EngagementCard } from './EngagementCard';
import type { Engagement, EngagementStatus } from '@/types/keystone.types';

// Maps column id → the status to assign when a card is dropped there
const COLUMN_TARGET_STATUS: Record<string, EngagementStatus> = {
  draft:    'draft',
  ready:    'ready',
  running:  'running',
  gate1:    'awaiting_review_1',
  gate2:    'awaiting_review_2',
  gate3:    'awaiting_review_3',
  complete: 'complete',
  failed:   'failed',
};

interface KanbanBoardProps {
  engagements: Engagement[];
  loading: boolean;
}

export function KanbanBoard({ engagements, loading }: KanbanBoardProps) {
  const { data: session } = useSession();
  const { handleStatusChanged } = useKeystoneStore();
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const draggingEngagement = engagements.find((e) => e.id === draggingId) ?? null;

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setDraggingId(null);
    if (!over || !session?.accessToken) return;

    const engagementId = active.id as string;
    const targetColumnId = over.id as string;
    const newStatus = COLUMN_TARGET_STATUS[targetColumnId];
    if (!newStatus) return;

    const current = engagements.find((e) => e.id === engagementId);
    if (!current || current.status === newStatus) return;

    // Optimistic update
    handleStatusChanged(engagementId, newStatus);

    // Persist to backend
    try {
      await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/engagements/${engagementId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.accessToken}`,
          },
          body: JSON.stringify({ status: newStatus }),
        }
      );
    } catch {
      // On failure, revert
      handleStatusChanged(engagementId, current.status);
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={(e) => setDraggingId(e.active.id as string)}
      onDragEnd={handleDragEnd}
    >
      {/* Horizontal scroll container */}
      <div
        style={{
          display: 'flex',
          gap: 12,
          overflowX: 'auto',
          paddingBottom: 16,
          flex: 1,
          alignItems: 'flex-start',
          // Hide scrollbar but keep scrollable
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {KANBAN_COLUMNS.map((column) => {
          const columnCards = engagements.filter((e) =>
            (column.statuses as string[]).includes(e.status)
          );
          return (
            <KanbanColumn
              key={column.id}
              column={column}
              cards={columnCards}
              loading={loading}
            />
          );
        })}
      </div>

      {/* DragOverlay — renders a ghost card while dragging */}
      <DragOverlay>
        {draggingEngagement && (
          <EngagementCard
            engagement={draggingEngagement}
            isDragging
            style={{ opacity: 0.85, transform: 'rotate(2deg)', cursor: 'grabbing' }}
          />
        )}
      </DragOverlay>
    </DndContext>
  );
}
```

---

## 4. KanbanColumn.tsx

Each column is a fixed-width, fixed-height container with its own vertical scroll.
Cards enter with a staggered slide-down animation on mount.
The column header has a 2px accent line at the top in `column.accentColor`.
The column body is a droppable target via `@dnd-kit`.

```tsx
'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { motion, AnimatePresence } from 'framer-motion';
import { EngagementCard } from './EngagementCard';
import { EngagementCardSkeleton } from './EngagementCardSkeleton';
import type { Engagement, KanbanColumn as KanbanColumnType } from '@/types/keystone.types';

const COLUMN_WIDTH = 260;
const COLUMN_HEIGHT = 'calc(100vh - 220px)'; // viewport minus header and page header

interface KanbanColumnProps {
  column: KanbanColumnType;
  cards: Engagement[];
  loading: boolean;
}

export function KanbanColumn({ column, cards, loading }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  return (
    <div
      style={{
        width: COLUMN_WIDTH,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 10,
        background: 'var(--surface-elevated)',
        border: `1px solid ${isOver ? column.accentColor : 'var(--border-subtle)'}`,
        transition: 'border-color 150ms ease',
        overflow: 'hidden',
      }}
    >
      {/* Column header */}
      <div style={{ position: 'relative', padding: '12px 14px 10px' }}>
        {/* Top accent line */}
        <div
          style={{
            position: 'absolute',
            top: 0, left: 0, right: 0,
            height: 2,
            background: column.accentColor,
            borderRadius: '10px 10px 0 0',
          }}
        />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            {column.label}
          </span>
          <span
            style={{
              fontSize: 11, fontWeight: 600,
              color: cards.length > 0 ? column.accentColor : 'var(--text-tertiary)',
              background: cards.length > 0 ? `${column.accentColor}18` : 'transparent',
              padding: '1px 7px', borderRadius: 10,
            }}
          >
            {cards.length}
          </span>
        </div>
      </div>

      {/* Scrollable card list */}
      <div
        ref={setNodeRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          height: COLUMN_HEIGHT,
          padding: '4px 8px 8px',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          scrollbarWidth: 'thin',
          scrollbarColor: 'var(--border-subtle) transparent',
        }}
      >
        {loading ? (
          // Skeleton cards
          <>
            <EngagementCardSkeleton />
            <EngagementCardSkeleton opacity={0.6} />
          </>
        ) : cards.length === 0 ? (
          // Empty state
          <EmptyColumnState label={column.emptyLabel} accentColor={column.accentColor} />
        ) : (
          <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
            <AnimatePresence initial={false}>
              {cards.map((card, index) => (
                <motion.div
                  key={card.id}
                  layout
                  layoutId={`card-${card.id}`}
                  initial={{ opacity: 0, y: -16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{
                    layout: { type: 'spring', stiffness: 350, damping: 30 },
                    opacity: { duration: 0.18 },
                    y: { delay: index * 0.05, duration: 0.25, ease: [0.16, 1, 0.3, 1] },
                  }}
                >
                  <EngagementCard engagement={card} />
                </motion.div>
              ))}
            </AnimatePresence>
          </SortableContext>
        )}
      </div>
    </div>
  );
}

function EmptyColumnState({ label, accentColor }: { label: string; accentColor: string }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        minHeight: 120,
        gap: 8,
        opacity: 0.5,
      }}
    >
      {/* Small decorative dot */}
      <div
        style={{
          width: 28, height: 28, borderRadius: '50%',
          border: `1.5px dashed ${accentColor}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: accentColor }} />
      </div>
      <span style={{ fontSize: 11, color: 'var(--text-tertiary)', textAlign: 'center', lineHeight: 1.4 }}>
        {label}
      </span>
    </div>
  );
}
```

---

## 5. EngagementCard.tsx

The card is a draggable item via `@dnd-kit/sortable`. Clicking it navigates to
`/engagements/[id]`. Contains all 7 data points plus all 4 visual status signals.

**Status color map** (used for badge, glow, and pulsing ring):
```typescript
const STATUS_COLORS: Record<EngagementStatus, string> = {
  draft:              'var(--text-tertiary)',
  uploading:          'var(--blue)',
  ready:              'var(--blue)',
  running:            'var(--amber-core)',
  awaiting_review_1:  'var(--violet)',
  awaiting_review_2:  'var(--violet)',
  awaiting_review_3:  'var(--violet)',
  compiling:          'var(--amber-core)',
  complete:           'var(--teal)',
  failed:             'var(--coral)',
};

const STATUS_LABELS: Record<EngagementStatus, string> = {
  draft:              'Draft',
  uploading:          'Uploading',
  ready:              'Ready',
  running:            'Running',
  awaiting_review_1:  'Gate 1',
  awaiting_review_2:  'Gate 2',
  awaiting_review_3:  'Gate 3',
  compiling:          'Compiling',
  complete:           'Complete',
  failed:             'Failed',
};

// Status → icon (lucide)
// Upload, Clock, Play, Eye, Eye, Eye, CheckCircle2, XCircle
```

**Status icon map** — import these from lucide-react:
`Upload` → uploading/ready, `Play` → running/compiling, `Eye` → awaiting_review_*,
`CheckCircle2` → complete, `XCircle` → failed, `FileText` → draft

**Pipeline step indicator** — a mini horizontal progress bar showing which of
the 6 pipeline nodes has been reached. Map status to step number:
draft=0, uploading=0, ready=0, running=1–6 (use current_node from run),
awaiting_review_1=2, awaiting_review_2=4, awaiting_review_3=5, compiling=6,
complete=6, failed=current node at time of failure.

Since the card doesn't have run data, show a simplified 6-dot row where dots
to the left of the current status are filled in the status color, the rest empty.

**Pulsing ring animation** — when status is `running`, `compiling`, or any
`awaiting_review_*`, wrap the status icon in a pulsing ring using framer-motion:
```typescript
// Pulse keyframes for the ring
animate={{ scale: [1, 1.35, 1], opacity: [0.7, 0, 0.7] }}
transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
```

**Card hover** — lift + shadow + border glow in the column's accent color:
```typescript
whileHover={{
  y: -2,
  boxShadow: `0 8px 24px rgba(0,0,0,0.4), 0 0 0 1px ${accentColor}40`,
}}
transition={{ duration: 0.15, ease: 'easeOut' }}
```

**Failed card** — when `status === 'failed'`, add a persistent red glow border:
```typescript
border: `1px solid var(--coral)`,
boxShadow: `0 0 12px rgba(229, 55, 107, 0.2)`,
```

**Full component structure:**
```
Card container (useSortable, motion.div, whileHover)
  ├── Top row: client name (14px, 600) + status icon (right)
  ├── Industry + date row (12px, text-secondary)
  ├── Pipeline step dots (6 dots, small, colored by progress)
  ├── Status badge pill (colored, with pulsing ring if active)
  ├── Divider line
  └── Footer row:
        ├── Attendees (truncated, 11px)
        ├── Doc count badge (e.g. "2 docs")
        └── Time elapsed (e.g. "3h ago", only if run exists)
```

**Time elapsed** — compute from `engagement.updated_at` using a simple
`formatDistanceToNow` equivalent. Do not import date-fns — write a minimal
inline helper:
```typescript
function timeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
```

---

## 6. EngagementCardSkeleton.tsx

A shimmer-animated placeholder card shown while the board is loading.
Use a CSS keyframe animation for the shimmer gradient sweep — do not use
any external library for this.

```tsx
'use client';

interface SkeletonProps { opacity?: number; }

export function EngagementCardSkeleton({ opacity = 1 }: SkeletonProps) {
  return (
    <div
      style={{
        borderRadius: 8, padding: '12px 14px', opacity,
        background: 'var(--surface-overlay)',
        border: '1px solid var(--border-subtle)',
        overflow: 'hidden', position: 'relative',
      }}
    >
      {/* Shimmer overlay */}
      <div
        style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 50%, transparent 100%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.6s infinite linear',
        }}
      />
      {/* Skeleton lines */}
      <div style={{ height: 14, width: '65%', borderRadius: 6, background: 'var(--surface-input)', marginBottom: 10 }} />
      <div style={{ height: 10, width: '40%', borderRadius: 6, background: 'var(--surface-input)', marginBottom: 14 }} />
      <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
        {[...Array(6)].map((_, i) => (
          <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--surface-input)' }} />
        ))}
      </div>
      <div style={{ height: 10, width: '30%', borderRadius: 6, background: 'var(--surface-input)' }} />
    </div>
  );
}
```

Add to `globals.css`:
```css
@keyframes shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position:  200% 0; }
}
```

---

## 7. StatusBadge.tsx

Reusable across Kanban cards and the detail page.

```tsx
import type { EngagementStatus } from '@/types/keystone.types';

const COLORS: Record<EngagementStatus, { bg: string; text: string; border: string }> = {
  draft:              { bg: 'transparent',      text: 'var(--text-tertiary)', border: 'var(--border-default)' },
  uploading:          { bg: 'var(--blue-glow)',  text: 'var(--blue)',          border: 'var(--border-blue)' },
  ready:              { bg: 'var(--blue-glow)',  text: 'var(--blue)',          border: 'var(--border-blue)' },
  running:            { bg: 'var(--amber-glow)', text: 'var(--amber-core)',    border: 'var(--border-amber)' },
  awaiting_review_1:  { bg: 'var(--violet-glow)', text: 'var(--violet)',       border: 'var(--border-violet)' },
  awaiting_review_2:  { bg: 'var(--violet-glow)', text: 'var(--violet)',       border: 'var(--border-violet)' },
  awaiting_review_3:  { bg: 'var(--violet-glow)', text: 'var(--violet)',       border: 'var(--border-violet)' },
  compiling:          { bg: 'var(--amber-glow)', text: 'var(--amber-core)',    border: 'var(--border-amber)' },
  complete:           { bg: 'var(--teal-glow)',  text: 'var(--teal)',          border: 'var(--border-teal)' },
  failed:             { bg: 'var(--coral-glow)', text: 'var(--coral)',         border: 'var(--border-coral)' },
};

export function StatusBadge({ status }: { status: EngagementStatus }) {
  const c = COLORS[status];
  const label = STATUS_LABELS[status]; // import from shared constants
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: '2px 9px', borderRadius: 20, fontSize: 11, fontWeight: 600,
        background: c.bg, color: c.text,
        border: `1px solid ${c.border}`,
      }}
    >
      {label}
    </span>
  );
}
```

---

## 8. Illustrated Empty State (whole board)

Only shown when `engagements.length === 0` and `!loading`.
Rendered inside the page, replacing the board entirely.

```tsx
// In page.tsx, before rendering KanbanBoard:
{!loading && engagements.length === 0 && <BoardEmptyState />}
```

```tsx
function BoardEmptyState() {
  const router = useRouter();
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', flex: 1, gap: 20, paddingBottom: 80,
      }}
    >
      {/* Animated icon — three stacked document cards that float */}
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        style={{ position: 'relative', width: 72, height: 72 }}
      >
        {/* Back card */}
        <div style={{ position: 'absolute', top: 8, left: 8, width: 56, height: 64, borderRadius: 8, background: 'var(--surface-overlay)', border: '1px solid var(--border-subtle)', transform: 'rotate(-6deg)' }} />
        {/* Mid card */}
        <div style={{ position: 'absolute', top: 4, left: 4, width: 56, height: 64, borderRadius: 8, background: 'var(--surface-elevated)', border: '1px solid var(--border-default)', transform: 'rotate(-2deg)' }} />
        {/* Front card */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: 56, height: 64, borderRadius: 8, background: 'var(--surface-overlay)', border: '1px solid var(--border-amber)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 20, height: 2, background: 'var(--amber-core)', borderRadius: 2, marginBottom: 4 }} />
        </div>
      </motion.div>

      <div style={{ textAlign: 'center', gap: 8, display: 'flex', flexDirection: 'column' }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
          No engagements yet
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
          Create your first engagement to start the pipeline
        </p>
      </div>

      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => router.push('/engagements/new')}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          height: 44, padding: '0 24px', borderRadius: 8,
          background: 'var(--amber-core)', border: 'none',
          color: 'var(--text-inverse)', fontSize: 14, fontWeight: 600,
          cursor: 'pointer', fontFamily: 'var(--font-geist-sans)',
          boxShadow: 'var(--shadow-amber)',
        }}
      >
        <Plus size={16} />
        Create First Engagement
      </motion.button>
    </motion.div>
  );
}
```

---

## 9. Verification Checklist

```bash
cd frontend
npm run typecheck   # 0 errors
npm run build       # clean

# Manual:
# 1. Board loads with skeleton cards in each column
# 2. Skeleton fades out, cards appear staggered (slide down, 50ms delay per card)
# 3. Hover a card → lifts 2px, border glows in column accent color
# 4. Drag a card to another column → card moves, PATCH fires
# 5. Failed engagement card has persistent red glow border
# 6. Running engagement shows pulsing ring on status icon
# 7. SSE: manually trigger a status_changed event → card animates to new column
# 8. 0 engagements → illustrated empty state with floating cards animation
```
