import { create } from 'zustand';
import type { Approval } from '@/types/approval.types';

export interface Notification {
  id: string;
  type: 'approval' | 'urgent' | 'info' | 'conflict' | 'agent_checkpoint';
  title: string;
  body: string;
  read: boolean;
  created_at: string;
  url?: string;
  approval?: Approval;
}

interface NotificationsState {
  notifications: Notification[];
  pendingCount: number;
  addApproval: (approval: Approval) => void;
  removeApproval: (id: string) => void;
  addUrgent: (notification: Omit<Notification, 'read'>) => void;
  add: (notification: Omit<Notification, 'read'>) => void;
  markRead: (id: string) => void;
  clearAll: () => void;
}

function computePendingCount(notifications: Notification[]): number {
  return notifications.filter(
    (n) => !n.read && (n.type === 'approval' || n.type === 'urgent' || n.type === 'conflict')
  ).length;
}

export const useNotificationStore = create<NotificationsState>((set) => ({
  notifications: [],
  pendingCount: 0,

  addApproval: (approval) =>
    set((state) => {
      const notification: Notification = {
        id: `approval-${approval.id}`,
        type: 'approval',
        title: 'Approval requested',
        body: approval.request_summary,
        read: false,
        created_at: approval.created_at,
        url: `/inbox`,
        approval,
      };
      const notifications = [notification, ...state.notifications.filter((n) => n.id !== notification.id)];
      return { notifications, pendingCount: computePendingCount(notifications) };
    }),

  removeApproval: (id) =>
    set((state) => {
      const notifications = state.notifications.filter((n) => n.id !== `approval-${id}`);
      return { notifications, pendingCount: computePendingCount(notifications) };
    }),

  addUrgent: (notification) =>
    set((state) => {
      const n: Notification = { ...notification, read: false };
      const notifications = [n, ...state.notifications.filter((x) => x.id !== n.id)];
      return { notifications, pendingCount: computePendingCount(notifications) };
    }),

  add: (notification) =>
    set((state) => {
      const n: Notification = { ...notification, read: false };
      const notifications = [n, ...state.notifications.filter((x) => x.id !== n.id)];
      return { notifications, pendingCount: computePendingCount(notifications) };
    }),

  markRead: (id) =>
    set((state) => {
      const notifications = state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      );
      return { notifications, pendingCount: computePendingCount(notifications) };
    }),

  clearAll: () => set({ notifications: [], pendingCount: 0 }),
}));
