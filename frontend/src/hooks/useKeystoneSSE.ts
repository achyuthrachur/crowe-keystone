'use client';

// useKeystoneSSE.ts
// Listens for Keystone SSE events and dispatches to store + toasts.

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useKeystoneStore } from '@/stores/keystone.store';
import { useToastStore } from '@/stores/toast.store';
import type { EngagementStatus } from '@/types/keystone.types';

const API = process.env.NEXT_PUBLIC_BACKEND_URL ?? '';

const GATE_LABELS: Record<string, string> = {
  awaiting_review_1: 'Gate 1 ready for review',
  awaiting_review_2: 'Gate 2 ready for review',
  awaiting_review_3: 'Gate 3 ready for review',
  complete: 'Pipeline complete — files ready',
  failed: 'Pipeline failed',
};

export function useKeystoneSSE() {
  const { data: session } = useSession();
  const handleStatusChanged = useKeystoneStore((s) => s.handleStatusChanged);
  const setRunCurrentNode = useKeystoneStore((s) => s.setRunCurrentNode);
  const appendRunLog = useKeystoneStore((s) => s.appendRunLog);
  const clearRunLog = useKeystoneStore((s) => s.clearRunLog);
  const engagements = useKeystoneStore((s) => s.engagements);
  const addToast = useToastStore((s) => s.addToast);

  useEffect(() => {
    if (!session?.user) return;

    // Use same auth pattern as useSSE.ts — withCredentials (cookie-based session)
    const es = new EventSource(`${API}/api/v1/stream`, { withCredentials: true });

    es.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data as string) as { type: string; data: Record<string, unknown> };
        const { type, data } = msg;

        if (type === 'agent.node_entered') {
          const { node } = data as { run_id: string; node: string };
          setRunCurrentNode(node);
          appendRunLog(`Running ${node.replace(/_/g, ' ')}...`);
          return;
        }

        if (type === 'keystone.status_changed') {
          const { engagement_id, new_status } = data as {
            engagement_id: string;
            new_status: EngagementStatus;
          };

          handleStatusChanged(engagement_id, new_status);

          // Clear node progress when pipeline reaches a terminal/gate state
          if (new_status === 'complete' || new_status === 'failed' ||
              new_status.startsWith('awaiting_review')) {
            clearRunLog();
          }

          // Show toast for gate-ready and terminal statuses
          if (GATE_LABELS[new_status]) {
            const engagement = engagements.find((e) => e.id === engagement_id);
            const clientName = engagement?.client_name ?? 'Engagement';
            addToast({
              title: clientName,
              body: GATE_LABELS[new_status],
              type: new_status === 'failed' ? 'error' : 'info',
              action:
                new_status.startsWith('awaiting_review') || new_status === 'complete'
                  ? {
                      label: new_status === 'complete' ? 'Download' : 'Review Now',
                      href: `/engagements/${engagement_id}`,
                    }
                  : undefined,
            });
          }
        }
      } catch {
        // Malformed event — ignore
      }
    };

    return () => es.close();
  }, [session?.user, handleStatusChanged, setRunCurrentNode, appendRunLog, clearRunLog, engagements, addToast]);
}
