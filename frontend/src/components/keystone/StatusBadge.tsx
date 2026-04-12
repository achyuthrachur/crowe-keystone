import type { EngagementStatus } from '@/types/keystone.types';

export const STATUS_LABELS: Record<EngagementStatus, string> = {
  draft:             'Draft',
  uploading:         'Uploading',
  ready:             'Ready',
  running:           'Running',
  awaiting_review_1: 'Gate 1',
  awaiting_review_2: 'Gate 2',
  awaiting_review_3: 'Gate 3',
  compiling:         'Compiling',
  complete:          'Complete',
  failed:            'Failed',
};

const COLORS: Record<EngagementStatus, { bg: string; text: string; border: string }> = {
  draft:             { bg: 'transparent',         text: 'var(--text-tertiary)',  border: 'var(--border-default)' },
  uploading:         { bg: 'var(--blue-glow)',     text: 'var(--blue)',           border: 'var(--border-blue)' },
  ready:             { bg: 'var(--blue-glow)',     text: 'var(--blue)',           border: 'var(--border-blue)' },
  running:           { bg: 'var(--amber-glow)',    text: 'var(--amber-core)',     border: 'var(--border-amber)' },
  awaiting_review_1: { bg: 'var(--violet-glow)',   text: 'var(--violet)',         border: 'var(--border-violet)' },
  awaiting_review_2: { bg: 'var(--violet-glow)',   text: 'var(--violet)',         border: 'var(--border-violet)' },
  awaiting_review_3: { bg: 'var(--violet-glow)',   text: 'var(--violet)',         border: 'var(--border-violet)' },
  compiling:         { bg: 'var(--amber-glow)',    text: 'var(--amber-core)',     border: 'var(--border-amber)' },
  complete:          { bg: 'var(--teal-glow)',     text: 'var(--teal)',           border: 'var(--border-teal)' },
  failed:            { bg: 'var(--coral-glow)',    text: 'var(--coral)',          border: 'var(--border-coral)' },
};

export function StatusBadge({ status }: { status: EngagementStatus }) {
  const c = COLORS[status];
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: '2px 9px', borderRadius: 20, fontSize: 11, fontWeight: 600,
        background: c.bg, color: c.text,
        border: `1px solid ${c.border}`,
      }}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
