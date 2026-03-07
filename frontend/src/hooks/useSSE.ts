'use client';

import { useEffect, useRef, useState } from 'react';
import { createSSEConnection } from '@/lib/sse';
import { useGraphStore } from '@/stores/graph.store';
import { useNotificationStore } from '@/stores/notifications.store';
import { useAgentStore } from '@/stores/agent.store';
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

  const { updateNodeStage, addConflictEdge, removeConflictEdge, addNode } = useGraphStore();
  const { addApproval, addUrgent } = useNotificationStore();
  const { addRun, updateRunNode, setCheckpoint, completeRun, failRun } = useAgentStore();

  useEffect(() => {
    const url = `${BACKEND_URL}/api/v1/stream`;

    const close = createSSEConnection(url, {
      onConnected: () => {
        setIsConnected(true);
        setIsReconnecting(false);
      },

      onProjectCreated: (event) => {
        // Phase 4: addNode to graph. Stub here.
        void addNode;
        void event;
      },

      onProjectStageChanged: (event) => {
        updateNodeStage(event.data.project_id, event.data.new_stage as Stage);
      },

      onConflictDetected: (event) => {
        addConflictEdge(event.data.conflict_id, event.data.project_a_id, event.data.project_b_id);
        addUrgent({
          id: `conflict-${event.data.conflict_id}`,
          type: 'conflict',
          title: 'Conflict detected',
          body: event.data.specific_conflict,
          created_at: new Date().toISOString(),
          url: `/inbox`,
        });
      },

      onConflictResolved: (event) => {
        removeConflictEdge(event.data.conflict_id);
      },

      onApprovalRequested: (event) => {
        // Build a minimal Approval object for the store
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
      },

      onAgentNodeEntered: (event) => {
        updateRunNode(event.data.run_id, event.data.node_name, event.data.node_index, event.data.total_nodes);
      },

      onAgentCheckpoint: (event) => {
        setCheckpoint(event.data.run_id, event.data.question);
      },

      onAgentCompleted: (event) => {
        completeRun(event.data.run_id, event.data.output_summary, event.data.tokens_used);
      },

      onAgentFailed: (event) => {
        failRun(event.data.run_id, event.data.error);
      },

      // Stubs for Phase 2+
      onProjectBuildLogUpdated: () => {},
      onApprovalDecided: () => {},
      onPrdUpdated: () => {},
      onDailyBriefReady: () => {},
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
  }, [addConflictEdge, addNode, addRun, addUrgent, addApproval, completeRun, failRun, removeConflictEdge, setCheckpoint, updateNodeStage, updateRunNode]);

  return { isConnected, isReconnecting };
}
