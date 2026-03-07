import type { KeystoneSSEEvent } from '@/types/sse.types';

export interface SSEHandlers {
  onConnected?: (data: { user_id: string }) => void;
  onProjectCreated?: (data: KeystoneSSEEvent & { type: 'project.created' }) => void;
  onProjectStageChanged?: (data: KeystoneSSEEvent & { type: 'project.stage_changed' }) => void;
  onProjectBuildLogUpdated?: (data: KeystoneSSEEvent & { type: 'project.build_log_updated' }) => void;
  onConflictDetected?: (data: KeystoneSSEEvent & { type: 'conflict.detected' }) => void;
  onConflictResolved?: (data: KeystoneSSEEvent & { type: 'conflict.resolved' }) => void;
  onApprovalRequested?: (data: KeystoneSSEEvent & { type: 'approval.requested' }) => void;
  onApprovalDecided?: (data: KeystoneSSEEvent & { type: 'approval.decided' }) => void;
  onAgentStarted?: (data: KeystoneSSEEvent & { type: 'agent.started' }) => void;
  onAgentNodeEntered?: (data: KeystoneSSEEvent & { type: 'agent.node_entered' }) => void;
  onAgentCheckpoint?: (data: KeystoneSSEEvent & { type: 'agent.checkpoint' }) => void;
  onAgentCompleted?: (data: KeystoneSSEEvent & { type: 'agent.completed' }) => void;
  onAgentFailed?: (data: KeystoneSSEEvent & { type: 'agent.failed' }) => void;
  onPrdUpdated?: (data: KeystoneSSEEvent & { type: 'prd.updated' }) => void;
  onDailyBriefReady?: (data: KeystoneSSEEvent & { type: 'daily_brief.ready' }) => void;
  onMemoryEntryAdded?: (data: KeystoneSSEEvent & { type: 'memory.entry_added' }) => void;
  onError?: (err: Event) => void;
  onReconnect?: () => void;
}

export interface SSEConnection {
  close: () => void;
}

export type SSEConnectionState = 'connecting' | 'connected' | 'reconnecting' | 'closed';

export function createSSEConnection(url: string, handlers: SSEHandlers): () => void {
  let eventSource: EventSource | null = null;
  let closed = false;
  let backoffMs = 1000;

  function connect() {
    if (closed) return;
    eventSource = new EventSource(url, { withCredentials: true });

    eventSource.onopen = () => {
      backoffMs = 1000; // reset backoff on successful connection
    };

    eventSource.onmessage = (event: MessageEvent) => {
      try {
        const parsed = JSON.parse(event.data as string) as KeystoneSSEEvent;
        routeEvent(parsed);
      } catch {
        // ignore malformed events
      }
    };

    eventSource.onerror = (err) => {
      handlers.onError?.(err);
      eventSource?.close();
      eventSource = null;
      if (!closed) {
        handlers.onReconnect?.();
        setTimeout(() => {
          backoffMs = Math.min(backoffMs * 2, 30000);
          connect();
        }, backoffMs);
      }
    };
  }

  function routeEvent(event: KeystoneSSEEvent) {
    switch (event.type) {
      case 'connected':
        handlers.onConnected?.(event.data);
        break;
      case 'project.created':
        handlers.onProjectCreated?.(event);
        break;
      case 'project.stage_changed':
        handlers.onProjectStageChanged?.(event);
        break;
      case 'project.build_log_updated':
        handlers.onProjectBuildLogUpdated?.(event);
        break;
      case 'conflict.detected':
        handlers.onConflictDetected?.(event);
        break;
      case 'conflict.resolved':
        handlers.onConflictResolved?.(event);
        break;
      case 'approval.requested':
        handlers.onApprovalRequested?.(event);
        break;
      case 'approval.decided':
        handlers.onApprovalDecided?.(event);
        break;
      case 'agent.started':
        handlers.onAgentStarted?.(event);
        break;
      case 'agent.node_entered':
        handlers.onAgentNodeEntered?.(event);
        break;
      case 'agent.checkpoint':
        handlers.onAgentCheckpoint?.(event);
        break;
      case 'agent.completed':
        handlers.onAgentCompleted?.(event);
        break;
      case 'agent.failed':
        handlers.onAgentFailed?.(event);
        break;
      case 'prd.updated':
        handlers.onPrdUpdated?.(event);
        break;
      case 'daily_brief.ready':
        handlers.onDailyBriefReady?.(event);
        break;
      case 'memory.entry_added':
        handlers.onMemoryEntryAdded?.(event);
        break;
    }
  }

  connect();

  return () => {
    closed = true;
    eventSource?.close();
    eventSource = null;
  };
}
