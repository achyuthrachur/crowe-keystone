'use client';

// Phase 1 stub — wired to real API in Phase 2
import { useNotificationStore } from '@/stores/notifications.store';
import type { Approval } from '@/types/approval.types';

export function useApprovals(): { approvals: Approval[]; isLoading: boolean } {
  const notifications = useNotificationStore((s) => s.notifications);

  const approvals = notifications
    .filter((n) => n.type === 'approval' && n.approval)
    .map((n) => n.approval as Approval);

  return { approvals, isLoading: false };
}
