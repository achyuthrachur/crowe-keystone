'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useReducedMotion } from 'framer-motion';
import { useNotificationStore } from '@/stores/notifications.store';
import type { Notification } from '@/stores/notifications.store';
import { formatTimeAgo } from '@/lib/utils';
import { DURATION } from '@/lib/motion';

interface NotificationPanelProps {
  onClose: () => void;
}

// ── Type icon map ─────────────────────────────────────────────────────────────

function NotificationIcon({ type }: { type: Notification['type'] }) {
  const icons: Record<Notification['type'], { symbol: string; color: string }> = {
    approval:         { symbol: '&#9679;', color: 'var(--amber-core)' },
    urgent:           { symbol: '&#9888;', color: 'var(--coral)' },
    info:             { symbol: '&#9432;', color: 'var(--blue)' },
    error:            { symbol: '&#9888;', color: 'var(--coral)' },
    warning:          { symbol: '&#9888;', color: 'var(--orange)' },
    conflict:         { symbol: '&#9888;', color: 'var(--coral)' },
    agent_checkpoint: { symbol: '&#9679;', color: 'var(--teal)' },
  };
  const { symbol, color } = icons[type] ?? { symbol: '&#9679;', color: 'var(--text-tertiary)' };
  return (
    <span
      style={{ color, fontSize: 12, flexShrink: 0, marginTop: 1 }}
      dangerouslySetInnerHTML={{ __html: symbol }}
    />
  );
}

// ── Panel ─────────────────────────────────────────────────────────────────────

export function NotificationPanel({ onClose }: NotificationPanelProps) {
  const { notifications, markRead, clearAll } = useNotificationStore();
  const router = useRouter();
  const shouldReduce = useReducedMotion();

  function handleNotificationClick(n: Notification) {
    markRead(n.id);
    if (n.url) router.push(n.url);
    onClose();
  }

  return (
    <>
      {/* Backdrop — invisible, closes panel on outside click */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 90,
        }}
        onClick={onClose}
      />

      {/* Slide-in panel */}
      <motion.div
        key="notification-panel"
        data-testid="notification-panel"
        initial={shouldReduce ? { opacity: 0 } : { x: 320, opacity: 0 }}
        animate={shouldReduce ? { opacity: 1 } : { x: 0, opacity: 1 }}
        exit={shouldReduce ? { opacity: 0 } : { x: 320, opacity: 0 }}
        transition={{ duration: DURATION.slow, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position: 'fixed',
          top: 56,                         /* below 3.5rem (h-14) topbar */
          right: 0,
          width: 320,
          height: 'calc(100vh - 3.5rem)',
          background: 'var(--surface-elevated)',
          borderLeft: '1px solid var(--border-subtle)',
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
            padding: '14px 16px',
            borderBottom: '1px solid var(--border-subtle)',
            flexShrink: 0,
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
                Mark all read
              </button>
            )}
            <button
              onClick={onClose}
              aria-label="Close notifications"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-tertiary)',
                display: 'flex',
                alignItems: 'center',
                padding: 4,
              }}
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Notification list */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
          }}
        >
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
              No notifications yet &#10003;
            </div>
          ) : (
            notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => handleNotificationClick(n)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  padding: '12px 16px',
                  cursor: n.url ? 'pointer' : 'default',
                  background: n.read
                    ? 'transparent'
                    : 'rgba(245, 168, 0, 0.04)',
                  transition: 'background 150ms',
                  border: 'none',
                  borderBottom: '1px solid var(--border-subtle)',
                  textAlign: 'left',
                  outline: 'none',
                  WebkitAppearance: 'none' as const,
                }}
              >
                <NotificationIcon type={n.type} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: 2,
                      gap: 8,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: n.read ? 400 : 600,
                        color: 'var(--text-primary)',
                        fontFamily: 'var(--font-geist-sans)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {n.title}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        color: 'var(--text-tertiary)',
                        fontFamily: 'var(--font-geist-sans)',
                        flexShrink: 0,
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
              </button>
            ))
          )}
        </div>
      </motion.div>
    </>
  );
}
