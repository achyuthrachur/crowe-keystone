'use client';

import React, { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';

function ConflictNodeInner({ data: _data }: NodeProps) {
  return (
    <>
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />

      {/* Outer rotated container — creates diamond shape */}
      <div
        style={{
          width: 80,
          height: 80,
          transform: 'rotate(45deg)',
          background: 'var(--coral-glow)',
          border: '2px solid var(--coral)',
          borderRadius: 6,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
        }}
      >
        {/* Counter-rotate content so it stays upright */}
        <span
          style={{
            transform: 'rotate(-45deg)',
            fontSize: 20,
            lineHeight: 1,
            color: 'var(--coral)',
          }}
        >
          ⚠
        </span>
      </div>

      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </>
  );
}

export const ConflictNode = memo(ConflictNodeInner);
ConflictNode.displayName = 'ConflictNode';
