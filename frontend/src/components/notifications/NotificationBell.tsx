'use client';

import { useState } from 'react';
import { Bell } from 'lucide-react';
import { useNotificationStore } from '@/stores/notifications.store';
import { NotificationPanel } from './NotificationPanel';

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const pendingCount = useNotificationStore((s) => s.pendingCount);

  return (
    <>
      <button
        data-testid="notification-bell"
        onClick={() => setOpen(!open)}
        style={{
          position: 'relative',
          width: 32,
          height: 32,
          borderRadius: 8,
          border: open ? '1px solid var(--border-default)' : '1px solid transparent',
          background: open ? 'var(--surface-hover)' : 'transparent',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 150ms ease-out',
        }}
      >
        <Bell size={16} color="var(--text-secondary)" />
        {pendingCount > 0 && (
          <span
            data-testid="notification-badge"
            style={{
              position: 'absolute',
              top: 3,
              right: 3,
              minWidth: 14,
              height: 14,
              borderRadius: 7,
              background: 'var(--coral)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 9,
              fontWeight: 700,
              color: 'white',
              padding: '0 3px',
              fontFamily: 'var(--font-geist-sans)',
            }}
          >
            {pendingCount > 9 ? '9+' : pendingCount}
          </span>
        )}
      </button>

      {open && <NotificationPanel onClose={() => setOpen(false)} />}
    </>
  );
}
