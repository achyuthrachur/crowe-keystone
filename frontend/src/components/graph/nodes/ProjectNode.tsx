'use client';

import React, { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { motion } from 'framer-motion';
import { STAGE_COLORS } from '@/lib/stage-colors';
import { conflictPulseVariants } from '@/lib/motion';
import type { KeystoneNodeData } from '@/types/graph.types';

const agentActiveBorderStyle = `
  @keyframes agentActivePulse {
    0%, 100% { border-color: var(--border-subtle); }
    50%       { border-color: var(--amber-core); }
  }
`;

function ProjectNodeInner({ data: rawData, selected }: NodeProps) {
  const data = rawData as KeystoneNodeData;
  const stage = data.stage;
  const colors = STAGE_COLORS[stage] ?? STAGE_COLORS.spark;

  const borderStyle: React.CSSProperties = selected
    ? { border: '2px solid var(--amber-core)' }
    : data.is_agent_active
    ? {
        border: '2px solid var(--border-subtle)',
        animation: 'agentActivePulse 1.5s ease-in-out infinite',
      }
    : { border: '1px solid var(--border-subtle)' };

  return (
    <>
      <style>{agentActiveBorderStyle}</style>

      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />

      <div
        style={{
          width: 200,
          height: 70,
          background: 'var(--surface-elevated)',
          borderRadius: 10,
          padding: '8px 10px',
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative',
          boxSizing: 'border-box',
          ...borderStyle,
        }}
      >
        {/* Top row: stage badge + conflict dot */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Stage badge */}
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '1px 6px',
              borderRadius: 9999,
              background: colors.bg,
              color: colors.text,
              fontSize: 10,
              fontWeight: 500,
              fontFamily: 'var(--font-geist-sans)',
              letterSpacing: '0.02em',
              lineHeight: 1.4,
            }}
          >
            <span style={{ fontSize: 8 }}>{colors.icon}</span>
            {stage.replace('_', ' ')}
          </span>

          {/* Conflict indicator */}
          {data.has_conflicts && (
            <motion.span
              variants={conflictPulseVariants}
              animate="animate"
              style={{
                display: 'block',
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: 'var(--coral)',
                flexShrink: 0,
              }}
            />
          )}
        </div>

        {/* Project title */}
        <span
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-geist-sans)',
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 1,
            WebkitBoxOrient: 'vertical',
            lineHeight: 1.3,
          }}
        >
          {data.title}
        </span>
      </div>

      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </>
  );
}

export const ProjectNode = memo(ProjectNodeInner);
ProjectNode.displayName = 'ProjectNode';
