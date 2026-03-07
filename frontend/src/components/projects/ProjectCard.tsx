'use client';

import { motion } from 'framer-motion';
import { cardVariants, conflictPulseVariants } from '@/lib/motion';
import { STAGE_COLORS, STAGE_LABELS, type Stage } from '@/lib/stage-colors';
import { formatTimeAgo } from '@/lib/utils';
import type { Project } from '@/lib/api';

interface ProjectCardProps {
  project: Project;
  onConflict?: (projectId: string) => void;
}

export function ProjectCard({ project, onConflict }: ProjectCardProps) {
  const stageColor = STAGE_COLORS[project.stage as Stage];
  const maxTags = 3;
  const visibleTags = project.stack.slice(0, maxTags);
  const extraTags = project.stack.length - maxTags;

  return (
    <motion.div
      data-testid="project-card"
      variants={cardVariants}
      initial="initial"
      animate="animate"
      whileHover={{
        translateY: -2,
        boxShadow: '0 8px 24px rgba(0,0,0,0.6), 0 4px 8px rgba(0,0,0,0.4)',
        borderColor: 'var(--border-amber)',
      }}
      style={{
        minHeight: 260,
        borderRadius: 12,
        padding: 16,
        background: 'var(--surface-elevated)',
        border: '1px solid var(--border-subtle)',
        boxShadow: 'var(--shadow-sm)',
        display: 'flex',
        flexDirection: 'column',
        cursor: 'pointer',
        position: 'relative',
        transition: 'border-color 200ms ease-out',
      }}
    >
      {/* Top row: stage badge + conflict dot */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span
          data-testid="stage-badge"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '3px 8px',
            borderRadius: 999,
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            background: stageColor.bg,
            border: `1px solid ${stageColor.border}`,
            color: stageColor.text,
            fontFamily: 'var(--font-geist-sans)',
          }}
        >
          <span>{stageColor.icon}</span>
          {STAGE_LABELS[project.stage as Stage]}
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
              cursor: onConflict ? 'pointer' : 'default',
            }}
            onClick={() => onConflict?.(project.id)}
            title="Has conflicts"
          />
        )}
      </div>

      {/* Body */}
      <div style={{ marginTop: 12 }}>
        <h3
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-geist-sans)',
            lineHeight: 1.4,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            margin: 0,
          }}
        >
          {project.title}
        </h3>
        {project.description && (
          <p
            style={{
              fontSize: 13,
              color: 'var(--text-secondary)',
              fontFamily: 'var(--font-geist-sans)',
              lineHeight: 1.5,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              marginTop: 4,
              marginBottom: 0,
            }}
          >
            {project.description}
          </p>
        )}
      </div>

      {/* Stack tags */}
      {project.stack.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 12 }}>
          {visibleTags.map((tag) => (
            <span
              key={tag}
              style={{
                padding: '2px 6px',
                borderRadius: 4,
                fontSize: 11,
                color: 'var(--text-secondary)',
                background: 'var(--surface-input)',
                border: '1px solid var(--border-subtle)',
                fontFamily: 'var(--font-geist-sans)',
              }}
            >
              {tag}
            </span>
          ))}
          {extraTags > 0 && (
            <span
              style={{
                padding: '2px 6px',
                borderRadius: 4,
                fontSize: 11,
                color: 'var(--text-tertiary)',
                background: 'var(--surface-input)',
                border: '1px solid var(--border-subtle)',
                fontFamily: 'var(--font-geist-sans)',
              }}
            >
              +{extraTags} more
            </span>
          )}
        </div>
      )}

      {/* Footer */}
      <div
        style={{
          marginTop: 'auto',
          paddingTop: 12,
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div
            style={{
              width: 20,
              height: 20,
              borderRadius: '50%',
              background: 'var(--surface-selected)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 9,
              fontWeight: 700,
              color: 'var(--text-primary)',
            }}
          >
            {project.assigned_to?.name?.[0] ?? '?'}
          </div>
          <span
            style={{
              fontSize: 12,
              color: 'var(--text-secondary)',
              fontFamily: 'var(--font-geist-sans)',
            }}
          >
            {project.assigned_to?.name ?? 'Unassigned'}
          </span>
        </div>
        <span
          style={{
            fontSize: 12,
            color: 'var(--text-tertiary)',
            fontFamily: 'var(--font-geist-sans)',
          }}
        >
          {formatTimeAgo(project.updated_at)}
        </span>
      </div>
    </motion.div>
  );
}
