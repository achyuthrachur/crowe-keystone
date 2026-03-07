import { create } from 'zustand';
import type { Node, Edge } from '@xyflow/react';
import type { Stage } from '@/lib/stage-colors';

interface GraphState {
  nodes: Node[];
  edges: Edge[];
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  updateNodeStage: (projectId: string, newStage: Stage) => void;
  addNode: (node: Node) => void;
  addConflictEdge: (conflictId: string, projectAId: string, projectBId: string) => void;
  removeConflictEdge: (conflictId: string) => void;
}

export const useGraphStore = create<GraphState>((set) => ({
  nodes: [],
  edges: [],

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),

  updateNodeStage: (projectId, newStage) =>
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === projectId
          ? { ...n, data: { ...n.data, stage: newStage } }
          : n
      ),
    })),

  addNode: (node) =>
    set((state) => ({
      nodes: [...state.nodes.filter((n) => n.id !== node.id), node],
    })),

  addConflictEdge: (conflictId, projectAId, projectBId) =>
    set((state) => {
      const edgeId = `conflict-${conflictId}`;
      if (state.edges.find((e) => e.id === edgeId)) return state;
      const newEdge: Edge = {
        id: edgeId,
        source: projectAId,
        target: projectBId,
        type: 'conflict',
        data: { conflict_id: conflictId },
        animated: false,
      };
      return { edges: [...state.edges, newEdge] };
    }),

  removeConflictEdge: (conflictId) =>
    set((state) => ({
      edges: state.edges.filter((e) => e.id !== `conflict-${conflictId}`),
    })),
}));
