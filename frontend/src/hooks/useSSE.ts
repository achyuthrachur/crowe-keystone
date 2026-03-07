'use client';

import { useEffect, useRef, useState } from 'react';
import { createSSEConnection } from '@/lib/sse';
import { useGraphStore } from '@/stores/graph.store';
import { useNotificationStore } from '@/stores/notifications.store';
import { useAgentStore } from '@/stores/agent.store';
import { useToastStore } from '@/stores/toast.store';
import { mutate } from 'swr';
import type { Stage } from '@/lib/stage-colors';
import type { AgentRun } from '@/types/agent.types';
import type { Approval } from '@/types/approval.types';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8000';

interface UseSSEResult {
  isConnected: boolean;
  isReconnecting: boolean;
}

export function useSSE(): UseSSEResult {
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const closeRef = useRef<(() => void) | null>(null);

  const {
    updateNodeStage,
    updateNodeData,
    addConflictEdge,
    removeConflictEdge,
    addNode,
  } = useGraphStore();
  const { addApproval, addUrgent, removeApproval } = useNotificationStore();
  const { addRun, updateRunNode, setCheckpoint, completeRun, failRun } = useAgentStore();
  const addToast = useToastStore((s) => s.addToast);

  useEffect(() => {
    const url = `${BACKEND_URL}/api/v1/stream`;

    const close = createSSEConnection(url, {
      onConnected: (_data) => {
        void _data;
        setIsConnected(true);
        setIsReconnecting(false);
      },

      onProjectCreated: (event) => {
        addNode({
          id: event.data.project_id,
          type: 'project',
          position: { x: 0, y: 0 }, // dagre will re-layout on next render
          data: {
            id: event.data.project_id,
            title: event.data.title,
            stage: event.data.stage as Stage,
            has_conflicts: false,
            is_agent_active: false,
            stack: [],
            effort_estimate: null,
            updated_at: new Date().toISOString(),
          },
        });
      },

      onProjectStageChanged: (event) => {
        updateNodeStage(event.data.project_id, event.data.new_stage as Stage);
        // Notify inbox and revalidate project data so UI reflects new stage
        useNotificationStore.getState().add({
          id: `stage-${event.data.project_id}-${event.data.new_stage}-${Date.now()}`,
          type: 'info',
          title: `${event.data.title} → ${event.data.new_stage}`,
          created_at: new Date().toISOString(),
        });
        void mutate(`${BACKEND_URL}/api/v1/projects/${event.data.project_id}`);
      },

      onConflictDetected: (event) => {
        addConflictEdge(
          event.data.conflict_id,
          event.data.project_a_id,
          event.data.project_b_id
        );
        // Optimistically mark both nodes as conflicted so the graph reflects it immediately
        updateNodeData(event.data.project_a_id, { has_conflicts: true });
        updateNodeData(event.data.project_b_id, { has_conflicts: true });
        addUrgent({
          id: `conflict-${event.data.conflict_id}`,
          type: 'error',
          title: '⚠ Conflict detected',
          body: event.data.specific_conflict,
          created_at: new Date().toISOString(),
          url: `/inbox`,
        });
        addToast({
          title: '⚠ Conflict detected',
          body: event.data.specific_conflict,
          type: 'error',
        });
      },

      onConflictResolved: (event) => {
        removeConflictEdge(event.data.conflict_id);
        // Optimistically clear has_conflicts on both affected nodes.
        // We can't know at the SSE level whether either project still has other open
        // conflicts — the next SWR graph fetch will reconcile the true state.
        // The conflict edge carries the project IDs in its data; we look them up from
        // the current store snapshot so we avoid closing over stale references.
        const { edges } = useGraphStore.getState();
        const resolvedEdge = edges.find((e) => e.id === `conflict-${event.data.conflict_id}`);
        if (resolvedEdge) {
          updateNodeData(resolvedEdge.source, { has_conflicts: false });
          updateNodeData(resolvedEdge.target, { has_conflicts: false });
        }
        addToast({
          title: 'Conflict resolved',
          body: 'The conflict has been resolved.',
          type: 'success',
        });
      },

      onApprovalRequested: (event) => {
        const approval: Approval = {
          id: event.data.approval_id,
          project_id: event.data.project_id,
          project_title: event.data.project_title,
          prd_id: null,
          type: 'stage_advance',
          requested_by: '',
          assigned_to: [],
          status: 'pending',
          request_summary: event.data.summary,
          decisions: [],
          deadline: event.data.deadline,
          created_at: new Date().toISOString(),
          resolved_at: null,
        };
        addApproval(approval);
        addToast({
          title: 'Approval requested',
          body: event.data.project_title
            ? `${event.data.project_title} is waiting for your review`
            : 'A project is waiting for your review',
          type: 'warning',
        });
      },

      onApprovalDecided: (event) => {
        // Remove from store and revalidate approvals list
        removeApproval(event.data.approval_id);
        if (event.data.decision === 'approve') {
          addToast({
            title: `✓ ${event.data.project_id} approved`,
            body: '',
            type: 'success',
          });
        }
        void mutate(`${BACKEND_URL}/api/v1/approvals`);
      },

      onAgentStarted: (event) => {
        const run: AgentRun = {
          id: event.data.run_id,
          team_id: '',
          agent_type: event.data.agent_type as AgentRun['agent_type'],
          project_id: event.data.project_id ?? null,
          triggered_by: '',
          trigger_event: 'sse',
          input_summary: '',
          output_summary: null,
          graph_state: null,
          tokens_used: null,
          duration_ms: null,
          status: 'running',
          error: null,
          created_at: new Date().toISOString(),
          completed_at: null,
        };
        addRun(run);
        // Reflect active agent state on the graph node immediately
        if (event.data.project_id) {
          updateNodeData(event.data.project_id, { is_agent_active: true });
        }
      },

      onAgentNodeEntered: (event) => {
        updateRunNode(
          event.data.run_id,
          event.data.node_name,
          event.data.node_index,
          event.data.total_nodes
        );
      },

      onAgentCheckpoint: (event) => {
        setCheckpoint(event.data.run_id, event.data.question);
        addToast({
          title: 'Agent needs input',
          body: event.data.question,
          type: 'warning',
        });
      },

      onAgentCompleted: (event) => {
        completeRun(event.data.run_id, event.data.output_summary, event.data.tokens_used);
        // Clear agent-active indicator on the graph node.
        // Resolve the project_id from the run record stored in agent.store.
        const completedRun = useAgentStore.getState().runs[event.data.run_id];
        if (completedRun?.project_id) {
          updateNodeData(completedRun.project_id, { is_agent_active: false });
        }
      },

      onAgentFailed: (event) => {
        failRun(event.data.run_id, event.data.error);
        addToast({
          title: 'Agent failed',
          body: event.data.error,
          type: 'error',
        });
      },

      onProjectBuildLogUpdated: () => {},
      onPrdUpdated: (event) => {
        void mutate(`${BACKEND_URL}/api/v1/projects/${event.data.project_id}/prd`);
      },
      onDailyBriefReady: (_event) => {
        useNotificationStore.getState().add({
          id: `daily-brief-${new Date().toISOString().slice(0, 10)}`,
          type: 'info',
          title: 'Your daily brief is ready',
          created_at: new Date().toISOString(),
          url: '/daily',
        });
      },
      onMemoryEntryAdded: () => {},

      onError: () => {
        setIsConnected(false);
      },

      onReconnect: () => {
        setIsConnected(false);
        setIsReconnecting(true);
      },
    });

    closeRef.current = close;
    return () => {
      close();
      closeRef.current = null;
    };
  }, [
    addConflictEdge,
    addNode,
    addRun,
    addToast,
    addUrgent,
    addApproval,
    removeApproval,
    completeRun,
    failRun,
    removeConflictEdge,
    setCheckpoint,
    updateNodeData,
    updateNodeStage,
    updateRunNode,
  ]);

  return { isConnected, isReconnecting };
}
