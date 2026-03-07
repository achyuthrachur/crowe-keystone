import { create } from 'zustand';
import type { AgentRun } from '@/types/agent.types';

interface AgentState {
  runs: Record<string, AgentRun>;
  addRun: (run: AgentRun) => void;
  updateRunNode: (runId: string, nodeName: string, nodeIndex: number, totalNodes: number) => void;
  setCheckpoint: (runId: string, question: string) => void;
  completeRun: (runId: string, summary: string, tokens: number) => void;
  failRun: (runId: string, error: string) => void;
  clearRun: (runId: string) => void;
  activeRunForProject: (projectId: string) => AgentRun | undefined;
}

export const useAgentStore = create<AgentState>((set, get) => ({
  runs: {},

  addRun: (run) =>
    set((state) => ({
      runs: { ...state.runs, [run.id]: run },
    })),

  updateRunNode: (runId, nodeName, nodeIndex, totalNodes) =>
    set((state) => {
      const run = state.runs[runId];
      if (!run) return state;
      const prevNode = run.current_node;
      const nodes_completed = [
        ...(run.nodes_completed ?? []),
        ...(prevNode && prevNode !== nodeName ? [prevNode] : []),
      ];
      return {
        runs: {
          ...state.runs,
          [runId]: {
            ...run,
            current_node: nodeName,
            node_index: nodeIndex,
            total_nodes: totalNodes,
            nodes_completed,
          },
        },
      };
    }),

  setCheckpoint: (runId, question) =>
    set((state) => {
      const run = state.runs[runId];
      if (!run) return state;
      return {
        runs: {
          ...state.runs,
          [runId]: { ...run, status: 'awaiting_human', checkpoint_question: question },
        },
      };
    }),

  completeRun: (runId, summary, tokens) =>
    set((state) => {
      const run = state.runs[runId];
      if (!run) return state;
      return {
        runs: {
          ...state.runs,
          [runId]: {
            ...run,
            status: 'complete',
            output_summary: summary,
            tokens_used: tokens,
            completed_at: new Date().toISOString(),
          },
        },
      };
    }),

  failRun: (runId, error) =>
    set((state) => {
      const run = state.runs[runId];
      if (!run) return state;
      return {
        runs: {
          ...state.runs,
          [runId]: { ...run, status: 'failed', error, completed_at: new Date().toISOString() },
        },
      };
    }),

  clearRun: (runId) =>
    set((state) => {
      const { [runId]: _removed, ...rest } = state.runs;
      return { runs: rest };
    }),

  activeRunForProject: (projectId) => {
    const runs = get().runs;
    return Object.values(runs).find(
      (r) => r.project_id === projectId && (r.status === 'running' || r.status === 'awaiting_human')
    );
  },
}));
