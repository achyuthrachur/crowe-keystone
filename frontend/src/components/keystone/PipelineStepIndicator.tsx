import type { EngagementStatus } from '@/types/keystone.types';

// Maps status to pipeline progress (0–6)
const STATUS_STEP: Record<EngagementStatus, number> = {
  draft:             0,
  uploading:         0,
  ready:             0,
  running:           1,
  awaiting_review_1: 2,
  awaiting_review_2: 4,
  awaiting_review_3: 5,
  compiling:         6,
  complete:          6,
  failed:            1,
};

const STATUS_COLOR: Record<EngagementStatus, string> = {
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

interface PipelineStepIndicatorProps {
  status: EngagementStatus;
}

export function PipelineStepIndicator({ status }: PipelineStepIndicatorProps) {
  const step = STATUS_STEP[status];
  const color = STATUS_COLOR[status];
  const TOTAL = 6;

  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
      {[...Array(TOTAL)].map((_, i) => (
        <div
          key={i}
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: i < step ? color : 'var(--surface-input)',
            border: i === step - 1 ? `1.5px solid ${color}` : '1px solid transparent',
            transition: 'background 300ms ease',
          }}
        />
      ))}
    </div>
  );
}
