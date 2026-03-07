'use client';

// Phase 1 stub — full implementation in Phase 4
import { useGraphStore } from '@/stores/graph.store';

export function useProjectGraph() {
  const { nodes, edges, setNodes, setEdges } = useGraphStore();

  return {
    nodes,
    edges,
    setNodes,
    setEdges,
    isLoading: false,
  };
}
