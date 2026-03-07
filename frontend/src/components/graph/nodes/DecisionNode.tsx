'use client';

import React, { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';

function DecisionNodeInner({ data: rawData }: NodeProps) {
  const data = rawData as { label?: string };
  return (
    <>
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />

      <div
        style={{
          minWidth: 140,
          padding: '10px 16px',
          background: 'var(--amber-glow)',
          border: '2px solid var(--amber-core)',
          borderRadius: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          cursor: 'pointer',
        }}
      >
        <span
          style={{
            color: 'var(--amber-core)',
            fontSize: 14,
            lineHeight: 1,
          }}
        >
          ◆
        </span>
        <span
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-geist-sans)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {data.label ?? 'Decision'}
        </span>
      </div>

      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </>
  );
}

export const DecisionNode = memo(DecisionNodeInner);
DecisionNode.displayName = 'DecisionNode';
