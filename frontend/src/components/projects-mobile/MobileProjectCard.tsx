'use client';

import { motion } from 'framer-motion';
import { navTapVariants, conflictPulseVariants } from '@/lib/motion';
import { STAGE_COLORS, STAGE_LABELS, type Stage } from '@/lib/stage-colors';
import { formatTimeAgo } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import type { Project } from '@/lib/api';

interface MobileProjectCardProps {
  project: Project;
}

export function MobileProjectCard({ project }: MobileProjectCardProps) {
  const router = useRouter();
  const stageColor = STAGE_COLORS[project.stage as Stage];

  return (
    <motion.div
      data-testid="project-card"
      variants={navTapVariants}
      whileTap="tap"
      onClick={() => router.push(`/projects/${project.id}`)}
      style={{
        height: 80,
        borderRadius: 12,
        background: 'var(--surface-elevated)',
        border: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'stretch',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Left accent bar */}
      <div
        style={{
          width: 3,
          background: stageColor.text,
          flexShrink: 0,
          borderRadius: '0',
        }}
      />

      {/* Content */}
      <div
        style={{
          flex: 1,
          padding: '12px 12px 12px 12px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 4,
          overflow: 'hidden',
        }}
      >
        {/* Row 1: stage icon + title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 10, color: stageColor.text, flexShrink: 0 }}>
            {stageColor.icon}
          </span>
          <span
            style={{
              fontSize: 14,
              fontWeight: 500,
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-geist-sans)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {project.title}
          </span>
        </div>

        {/* Row 2: owner · stage · time · conflict dot */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span
            style={{
              fontSize: 11,
              color: 'var(--text-secondary)',
              fontFamily: 'var(--font-geist-sans)',
            }}
          >
            {project.assigned_to?.name ?? 'Unassigned'}
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>·</span>
          <span
            style={{
              fontSize: 11,
              color: stageColor.text,
              fontFamily: 'var(--font-geist-sans)',
              fontWeight: 500,
            }}
          >
            {STAGE_LABELS[project.stage as Stage]}
          </span>
          <span style={{ flex: 1 }} />
          <span
            style={{
              fontSize: 11,
              color: 'var(--text-tertiary)',
              fontFamily: 'var(--font-geist-sans)',
            }}
          >
            {formatTimeAgo(project.updated_at)}
          </span>
          {project.has_conflicts && (
            <motion.div
              variants={conflictPulseVariants}
              animate="animate"
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: 'var(--coral)',
                marginLeft: 4,
                flexShrink: 0,
              }}
              title="Has conflicts"
            />
          )}
        </div>
      </div>
    </motion.div>
  );
}
