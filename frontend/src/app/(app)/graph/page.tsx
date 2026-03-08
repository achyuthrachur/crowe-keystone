'use client';

import dynamic from 'next/dynamic';

const GraphView = dynamic(
  () => import('@/components/graph/GraphView').then((m) => ({ default: m.GraphView })),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          height: 'calc(100vh - 3.5rem)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--surface-primary)',
          color: 'var(--text-muted)',
          fontSize: '0.875rem',
        }}
      >
        Loading graph…
      </div>
    ),
  }
);

export default function GraphPage() {
  return (
    <div style={{ height: 'calc(100vh - 3.5rem)', overflow: 'hidden' }}>
      <GraphView />
    </div>
  );
}
