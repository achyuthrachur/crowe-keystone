'use client';

import { CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FileText, Upload, Play, Eye, CheckCircle2, XCircle } from 'lucide-react';
import { StatusBadge, STATUS_LABELS } from './StatusBadge';
import { PipelineStepIndicator } from './PipelineStepIndicator';
import type { Engagement, EngagementStatus } from '@/types/keystone.types';

// ── Status visual config ──────────────────────────────────────────────────────

const STATUS_COLORS: Record<EngagementStatus, string> = {
  draft:             'var(--text-tertiary)',
  uploading:         'var(--blue)',
  ready:             'var(--blue)',
  running:           'var(--amber-core)',
  awaiting_review_1: 'var(--violet)',
  awaiting_review_2: 'var(--violet)',
  awaiting_review_3: 'var(--violet)',
  compiling:         'var(--amber-core)',
  complete:          'var(--teal)',
  failed:            'var(--coral)',
};

const STATUS_ICONS: Record<EngagementStatus, React.ComponentType<{ size?: number; color?: string }>> = {
  draft:             FileText,
  uploading:         Upload,
  ready:             Upload,
  running:           Play,
  awaiting_review_1: Eye,
  awaiting_review_2: Eye,
  awaiting_review_3: Eye,
  compiling:         Play,
  complete:          CheckCircle2,
  failed:            XCircle,
};

const ACTIVE_STATUSES = new Set<EngagementStatus>([
  'running', 'compiling', 'awaiting_review_1', 'awaiting_review_2', 'awaiting_review_3',
]);

// ── Time helper ───────────────────────────────────────────────────────────────

function timeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── Component ─────────────────────────────────────────────────────────────────

interface EngagementCardProps {
  engagement: Engagement;
  isDragging?: boolean;
  style?: CSSProperties;
}

export function EngagementCard({ engagement, isDragging = false, style }: EngagementCardProps) {
  const router = useRouter();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging: sortableDragging } =
    useSortable({ id: engagement.id });

  const { status } = engagement;
  const color = STATUS_COLORS[status];
  const Icon = STATUS_ICONS[status];
  const isActive = ACTIVE_STATUSES.has(status);
  const isFailed = status === 'failed';

  const dndStyle: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: sortableDragging ? 0 : 1,
    ...style,
  };

  return (
    <div ref={setNodeRef} style={dndStyle} {...attributes} {...listeners}>
      <motion.div
        whileHover={
          isDragging
            ? undefined
            : {
                y: -2,
                boxShadow: `0 8px 24px rgba(0,0,0,0.4), 0 0 0 1px ${color}40`,
              }
        }
        transition={{ duration: 0.15, ease: 'easeOut' }}
        onClick={() => !isDragging && router.push(`/engagements/${engagement.id}`)}
        style={{
          borderRadius: 8,
          padding: '12px 14px',
          background: 'var(--surface-overlay)',
          border: isFailed
            ? '1px solid var(--coral)'
            : '1px solid var(--border-subtle)',
          boxShadow: isFailed ? '0 0 12px rgba(229, 55, 107, 0.2)' : undefined,
          cursor: isDragging ? 'grabbing' : 'pointer',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          userSelect: 'none',
        }}
      >
        {/* Top row: client name + status icon */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <span
            style={{
              fontSize: 14, fontWeight: 600,
              color: 'var(--text-primary)',
              lineHeight: 1.3,
              flex: 1,
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {engagement.client_name}
          </span>

          {/* Status icon with optional pulsing ring */}
          <div style={{ position: 'relative', flexShrink: 0, width: 22, height: 22 }}>
            {isActive && (
              <motion.div
                animate={{ scale: [1, 1.35, 1], opacity: [0.7, 0, 0.7] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                  position: 'absolute',
                  inset: -4,
                  borderRadius: '50%',
                  border: `1.5px solid ${color}`,
                  pointerEvents: 'none',
                }}
              />
            )}
            <Icon size={16} color={color} />
          </div>
        </div>

        {/* Industry + date */}
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
          <span>{engagement.client_industry}</span>
          <span style={{ color: 'var(--text-tertiary)', margin: '0 6px' }}>·</span>
          <span>{new Date(engagement.engagement_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
        </div>

        {/* Pipeline step dots */}
        <PipelineStepIndicator status={status} />

        {/* Status badge */}
        <StatusBadge status={status} />

        {/* Divider */}
        <div style={{ height: 1, background: 'var(--border-subtle)', margin: '0 -2px' }} />

        {/* Footer row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--text-tertiary)' }}>
          {/* Attendees — truncated */}
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {engagement.attendees || '—'}
          </span>

          {/* Time elapsed */}
          <span style={{ flexShrink: 0 }}>
            {timeAgo(engagement.updated_at)}
          </span>
        </div>
      </motion.div>
    </div>
  );
}
