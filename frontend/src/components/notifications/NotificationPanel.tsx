'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { notificationVariants } from '@/lib/motion';
import { useNotificationStore } from '@/stores/notifications.store';
import { formatTimeAgo } from '@/lib/utils';
import { X } from 'lucide-react';

interface NotificationPanelProps {
  onClose: () => void;
}

export function NotificationPanel({ onClose }: NotificationPanelProps) {
  const { notifications, markRead, clearAll } = useNotificationStore();

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 90,
        }}
        onClick={onClose}
      />

      {/* Panel */}
      <motion.div
        key="notification-panel"
        variants={notificationVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        data-testid="notification-panel"
        style={{
          position: 'fixed',
          top: 60,
          right: 16,
          width: 360,
          maxHeight: 480,
          background: 'var(--surface-overlay)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 12,
          boxShadow: 'var(--shadow-lg)',
          zIndex: 91,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <span
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-geist-sans)',
            }}
          >
            Notifications
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            {notifications.length > 0 && (
              <button
                onClick={clearAll}
                style={{
                  fontSize: 12,
                  color: 'var(--text-tertiary)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-geist-sans)',
                }}
              >
                Clear all
              </button>
            )}
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-tertiary)',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Notifications list */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {notifications.length === 0 ? (
            <div
              style={{
                padding: 24,
                textAlign: 'center',
                color: 'var(--text-tertiary)',
                fontSize: 13,
                fontFamily: 'var(--font-geist-sans)',
              }}
            >
              No notifications yet ✓
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => markRead(n.id)}
                style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid var(--border-subtle)',
                  cursor: 'pointer',
                  background: n.read ? 'transparent' : 'rgba(245,168,0,0.04)',
                  transition: 'background 150ms',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      fontFamily: 'var(--font-geist-sans)',
                    }}
                  >
                    {n.title}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      color: 'var(--text-tertiary)',
                      fontFamily: 'var(--font-geist-sans)',
                    }}
                  >
                    {formatTimeAgo(n.created_at)}
                  </span>
                </div>
                <p
                  style={{
                    fontSize: 12,
                    color: 'var(--text-secondary)',
                    fontFamily: 'var(--font-geist-sans)',
                    margin: 0,
                    lineHeight: 1.5,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {n.body}
                </p>
              </div>
            ))
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
