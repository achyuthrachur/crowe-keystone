'use client';

import { GraphView } from '@/components/graph/GraphView';

export default function GraphPage() {
  return (
    <div style={{ height: 'calc(100vh - 3.5rem)', overflow: 'hidden' }}>
      <GraphView />
    </div>
  );
}
