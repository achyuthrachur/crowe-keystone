'use client';

import { STAGE_COLORS, STAGE_LABELS, STAGE_ORDER, type Stage } from '@/lib/stage-colors';
import type { Project } from '@/lib/api';

interface StageFilterBarProps {
  projects: Project[];
  activeStage: Stage | 'all';
  onStageChange: (stage: Stage | 'all') => void;
}

export function StageFilterBar({ projects, activeStage, onStageChange }: StageFilterBarProps) {
  const stageCounts = STAGE_ORDER.reduce<Record<string, number>>((acc, stage) => {
    acc[stage] = projects.filter((p) => p.stage === stage).length;
    return acc;
  }, {});

  return (
    <div
      data-testid="stage-filter-bar"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 6,
      }}
    >
      {/* All pill */}
      <button
        onClick={() => onStageChange('all')}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          height: 32,
          padding: '0 12px',
          borderRadius: 999,
          border: activeStage === 'all'
            ? '1px solid var(--border-amber)'
            : '1px solid var(--border-subtle)',
          background: activeStage === 'all' ? 'var(--amber-glow)' : 'transparent',
          color: activeStage === 'all' ? 'var(--amber-core)' : 'var(--text-secondary)',
          fontSize: 13,
          fontWeight: activeStage === 'all' ? 600 : 400,
          fontFamily: 'var(--font-geist-sans)',
          cursor: 'pointer',
          transition: 'all 150ms ease-out',
        }}
      >
        All
        <span
          style={{
            fontSize: 11,
            padding: '1px 5px',
            borderRadius: 4,
            background: 'var(--surface-input)',
            color: 'var(--text-tertiary)',
          }}
        >
          {projects.length}
        </span>
      </button>

      {/* Stage pills */}
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
              gap: 5,
              height: 32,
              padding: '0 12px',
              borderRadius: 999,
              border: isActive
                ? `1px solid ${stageColor.border}`
                : '1px solid var(--border-subtle)',
              background: isActive ? stageColor.bg : 'transparent',
              color: isActive ? stageColor.text : 'var(--text-secondary)',
              fontSize: 13,
              fontWeight: isActive ? 600 : 400,
              fontFamily: 'var(--font-geist-sans)',
              cursor: 'pointer',
              transition: 'all 150ms ease-out',
            }}
          >
            <span style={{ fontSize: 11 }}>{stageColor.icon}</span>
            {STAGE_LABELS[stage]}
            <span
              style={{
                fontSize: 11,
                padding: '1px 5px',
                borderRadius: 4,
                background: 'var(--surface-input)',
                color: 'var(--text-tertiary)',
              }}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
