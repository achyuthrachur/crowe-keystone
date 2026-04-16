'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { motion, AnimatePresence } from 'framer-motion';
import { EngagementCard } from './EngagementCard';
import { EngagementCardSkeleton } from './EngagementCardSkeleton';
import type { Engagement, KanbanColumn as KanbanColumnType } from '@/types/keystone.types';

const COLUMN_MIN_WIDTH = 200;

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
        flex: '1 1 220px',
        minWidth: COLUMN_MIN_WIDTH,
        maxWidth: 320,
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
          minHeight: 0,
          overflowY: 'auto',
          padding: '4px 8px 8px',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          scrollbarWidth: 'thin',
          scrollbarColor: 'var(--border-subtle) transparent',
        }}
      >
        {loading ? (
          <>
            <EngagementCardSkeleton />
            <EngagementCardSkeleton opacity={0.6} />
          </>
        ) : cards.length === 0 ? (
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
