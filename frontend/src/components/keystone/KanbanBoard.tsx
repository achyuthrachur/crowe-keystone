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
import { useAuthStore } from '@/stores/auth.store';
import { useKeystoneStore } from '@/stores/keystone.store';
import { KanbanColumn } from './KanbanColumn';
import { EngagementCard } from './EngagementCard';
import type { Engagement, EngagementStatus, KanbanColumn as KanbanColumnType } from '@/types/keystone.types';

// ── Column definitions ────────────────────────────────────────────────────────

export const KANBAN_COLUMNS: KanbanColumnType[] = [
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

// ── Component ─────────────────────────────────────────────────────────────────

interface KanbanBoardProps {
  engagements: Engagement[];
  loading: boolean;
}

export function KanbanBoard({ engagements, loading }: KanbanBoardProps) {
  const token = useAuthStore((s) => s.token) ?? '';
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
    if (!over || !token) return;

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
            Authorization: `Bearer ${token}`,
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
