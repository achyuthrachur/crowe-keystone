export const STAGE_COLORS = {
  spark:         { bg: 'var(--amber-glow)',   border: 'var(--border-amber)',   text: 'var(--amber-core)',  icon: '✦' },
  brief:         { bg: 'var(--orange-glow)',  border: 'var(--border-orange)',  text: 'var(--orange)',      icon: '◈' },
  draft_prd:     { bg: 'var(--blue-glow)',    border: 'var(--border-blue)',    text: 'var(--blue)',        icon: '◎' },
  review:        { bg: 'var(--violet-glow)',  border: 'var(--border-violet)',  text: 'var(--violet)',      icon: '◇' },
  approved:      { bg: 'var(--teal-glow)',    border: 'var(--border-teal)',    text: 'var(--teal)',        icon: '◉' },
  in_build:      { bg: 'var(--blue-glow)',    border: 'var(--border-blue)',    text: 'var(--blue)',        icon: '⬡' },
  shipped:       { bg: 'var(--teal-glow)',    border: 'var(--border-teal)',    text: 'var(--teal)',        icon: '✓' },
  retrospective: { bg: 'var(--amber-glow)',   border: 'var(--border-amber)',   text: 'var(--amber-core)', icon: '◍' },
} as const;

export type Stage = keyof typeof STAGE_COLORS;

export const STAGE_ORDER: Stage[] = [
  'spark',
  'brief',
  'draft_prd',
  'review',
  'approved',
  'in_build',
  'shipped',
  'retrospective',
];

export const STAGE_LABELS: Record<Stage, string> = {
  spark: 'Spark',
  brief: 'Brief',
  draft_prd: 'Draft PRD',
  review: 'Review',
  approved: 'Approved',
  in_build: 'In Build',
  shipped: 'Shipped',
  retrospective: 'Retro',
};
