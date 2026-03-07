'use client';

import React, { memo } from 'react';
import { BaseEdge, getStraightPath, type EdgeProps } from '@xyflow/react';

const conflictFlowStyles = `
  @keyframes conflictFlow {
    to { stroke-dashoffset: -36; }
  }
`;

function ConflictEdgeInner({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  markerEnd,
}: EdgeProps) {
  const [edgePath] = getStraightPath({ sourceX, sourceY, targetX, targetY });

  return (
    <>
      <style>{conflictFlowStyles}</style>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          strokeWidth: 1.5,
          stroke: 'var(--coral)',
          strokeDasharray: '8 4',
          animation: 'conflictFlow 1.5s linear infinite',
          fill: 'none',
        }}
      />
    </>
  );
}

export const ConflictEdge = memo(ConflictEdgeInner);
ConflictEdge.displayName = 'ConflictEdge';
