'use client';

import { STAGE_COLORS, STAGE_LABELS, STAGE_ORDER, type Stage } from '@/lib/stage-colors';
import type { Project } from '@/lib/api';

interface MobileStageFilterProps {
  projects: Project[];
  activeStage: Stage | 'all';
  onStageChange: (stage: Stage | 'all') => void;
}

export function MobileStageFilter({ projects, activeStage, onStageChange }: MobileStageFilterProps) {
  const stageCounts = STAGE_ORDER.reduce<Record<string, number>>((acc, stage) => {
    acc[stage] = projects.filter((p) => p.stage === stage).length;
    return acc;
  }, {});

  return (
    <div
      data-testid="mobile-stage-filter"
      className="scroll-x"
      style={{
        display: 'flex',
        gap: 6,
        paddingBottom: 4,
      }}
    >
      {/* All pill */}
      <button
        onClick={() => onStageChange('all')}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          height: 30,
          padding: '0 10px',
          borderRadius: 999,
          border: activeStage === 'all'
            ? '1px solid var(--border-amber)'
            : '1px solid var(--border-subtle)',
          background: activeStage === 'all' ? 'var(--amber-glow)' : 'transparent',
          color: activeStage === 'all' ? 'var(--amber-core)' : 'var(--text-secondary)',
          fontSize: 12,
          fontWeight: activeStage === 'all' ? 600 : 400,
          fontFamily: 'var(--font-geist-sans)',
          cursor: 'pointer',
          flexShrink: 0,
          scrollSnapAlign: 'start',
        }}
      >
        All
        <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
          {projects.length}
        </span>
      </button>

      {STAGE_ORDER.map((stage) => {
        const isActive = activeStage === stage;
        const stageColor = STAGE_COLORS[stage];
        const count = stageCounts[stage] ?? 0;

        return (
          <button
            key={stage}
            onClick={() => onStageChange(stage)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              height: 30,
              padding: '0 10px',
              borderRadius: 999,
              border: isActive
                ? `1px solid ${stageColor.border}`
                : '1px solid var(--border-subtle)',
              background: isActive ? stageColor.bg : 'transparent',
              color: isActive ? stageColor.text : 'var(--text-secondary)',
              fontSize: 12,
              fontWeight: isActive ? 600 : 400,
              fontFamily: 'var(--font-geist-sans)',
              cursor: 'pointer',
              flexShrink: 0,
              scrollSnapAlign: 'start',
            }}
          >
            <span style={{ fontSize: 10 }}>{stageColor.icon}</span>
            {STAGE_LABELS[stage]}
            <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{count}</span>
          </button>
        );
      })}
    </div>
  );
}
