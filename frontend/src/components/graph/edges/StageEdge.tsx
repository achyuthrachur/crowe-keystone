'use client';

import React, { memo, useState } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type EdgeProps,
} from '@xyflow/react';

function StageEdgeInner({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data: rawData,
  markerEnd,
}: EdgeProps) {
  const data = rawData as { label?: string } | undefined;
  const [hovered, setHovered] = useState(false);

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      {/* Invisible wider hit area for hover detection */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={12}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{ cursor: 'default' }}
      />

      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          strokeWidth: 1.5,
          stroke: 'var(--border-default)',
        }}
      />

      {hovered && data?.label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'none',
              background: 'var(--surface-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 4,
              padding: '2px 6px',
              fontSize: 11,
              color: 'var(--text-secondary)',
              fontFamily: 'var(--font-geist-sans)',
              whiteSpace: 'nowrap',
              zIndex: 10,
            }}
          >
            {data.label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export const StageEdge = memo(StageEdgeInner);
StageEdge.displayName = 'StageEdge';
