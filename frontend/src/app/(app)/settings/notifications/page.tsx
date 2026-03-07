'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { pageVariants, cardVariants } from '@/lib/motion';
import {
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  checkExistingSubscription,
} from '@/lib/push-notifications';

type PushStatus = 'checking' | 'unsupported' | 'enabled' | 'disabled';

const NOTIFICATION_TYPES = [
  {
    label: 'Approval requests',
    description: 'When someone needs your review on a stage advance',
  },
  {
    label: 'Conflict alerts',
    description: 'When blocking conflicts are detected between projects',
  },
  {
    label: 'Agent checkpoints',
    description: 'When an AI agent pauses and needs your input to continue',
  },
  {
    label: 'Daily brief',
    description: 'Your morning summary of what needs attention today',
  },
];

function StatusIndicator({ status }: { status: PushStatus }) {
  if (status === 'checking') {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 13,
          color: 'var(--text-secondary)',
          fontFamily: 'var(--font-geist-sans)',
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: 'var(--surface-input)',
            border: '1px solid var(--border-subtle)',
            display: 'inline-block',
          }}
        />
        Checking...
      </span>
    );
  }

  if (status === 'unsupported') {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 13,
          color: 'var(--text-tertiary)',
          fontFamily: 'var(--font-geist-sans)',
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: 'var(--text-tertiary)',
            display: 'inline-block',
            opacity: 0.4,
          }}
        />
        Not supported in this browser
      </span>
    );
  }

  if (status === 'enabled') {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 13,
          color: 'var(--teal)',
          fontFamily: 'var(--font-geist-sans)',
          fontWeight: 500,
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: 'var(--teal)',
            display: 'inline-block',
          }}
        />
        Enabled
      </span>
    );
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 13,
        color: 'var(--text-secondary)',
        fontFamily: 'var(--font-geist-sans)',
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: 'var(--border-default)',
          display: 'inline-block',
        }}
      />
      Disabled
    </span>
  );
}

export default function NotificationSettingsPage() {
  const [pushStatus, setPushStatus] = useState<PushStatus>('checking');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [testSent, setTestSent] = useState(false);

  const isDev =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1');

  useEffect(() => {
    async function init() {
      if (typeof window === 'undefined') return;
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        setPushStatus('unsupported');
        return;
      }
      const has = await checkExistingSubscription();
      setPushStatus(has ? 'enabled' : 'disabled');
    }
    init();
  }, []);

  async function handleEnable() {
    setActionLoading(true);
    setActionError(null);
    try {
      const ok = await subscribeToPushNotifications();
      if (ok) {
        setPushStatus('enabled');
      } else {
        setActionError(
          'Could not enable notifications. Check that notifications are allowed in your browser settings.'
        );
      }
    } catch {
      setActionError('An unexpected error occurred. Please try again.');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDisable() {
    setActionLoading(true);
    setActionError(null);
    try {
      await unsubscribeFromPushNotifications();
      setPushStatus('disabled');
    } catch {
      setActionError('Could not disable notifications. Please try again.');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleTestNotification() {
    setTestSent(false);
    try {
      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8000';
      await fetch(`${BACKEND_URL}/api/v1/push/test`, {
        method: 'POST',
        credentials: 'include',
      });
      setTestSent(true);
      setTimeout(() => setTestSent(false), 3000);
    } catch {
      // Silently ignore test errors in dev
    }
  }

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      style={{ maxWidth: 520 }}
    >
      {/* Page header */}
      <h1
        style={{
          fontSize: 24,
          fontWeight: 700,
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-display)',
          margin: '0 0 6px',
        }}
      >
        Push Notifications
      </h1>
      <p
        style={{
          fontSize: 14,
          color: 'var(--text-secondary)',
          fontFamily: 'var(--font-geist-sans)',
          margin: '0 0 24px',
          lineHeight: 1.5,
        }}
      >
        Receive alerts on your device even when Keystone is in the background.
      </p>

      {/* Status card */}
      <motion.div
        variants={cardVariants}
        initial="initial"
        animate="animate"
        style={{
          background: 'var(--surface-elevated)',
          borderRadius: 12,
          padding: 20,
          marginBottom: 16,
          boxShadow:
            '0 1px 3px rgba(1,30,65,0.04), 0 6px 16px rgba(1,30,65,0.04)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: pushStatus === 'unsupported' ? 0 : 16,
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
            Current status
          </span>
          <StatusIndicator status={pushStatus} />
        </div>

        {/* Enable button */}
        {pushStatus === 'disabled' && (
          <button
            onClick={handleEnable}
            disabled={actionLoading}
            style={{
              width: '100%',
              height: 40,
              borderRadius: 8,
              border: 'none',
              background: actionLoading ? 'var(--surface-input)' : 'var(--amber-core)',
              color: actionLoading ? 'var(--text-tertiary)' : 'var(--text-inverse)',
              fontSize: 14,
              fontWeight: 600,
              fontFamily: 'var(--font-geist-sans)',
              cursor: actionLoading ? 'not-allowed' : 'pointer',
              transition: 'background 150ms, color 150ms',
            }}
          >
            {actionLoading ? 'Enabling...' : 'Enable push notifications'}
          </button>
        )}

        {/* Enabled state: show disable option */}
        {pushStatus === 'enabled' && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <p
              style={{
                fontSize: 13,
                color: 'var(--text-secondary)',
                fontFamily: 'var(--font-geist-sans)',
                margin: 0,
                lineHeight: 1.4,
              }}
            >
              You will receive notifications for approvals, conflicts, and agent
              checkpoints.
            </p>
            <button
              onClick={handleDisable}
              disabled={actionLoading}
              style={{
                flexShrink: 0,
                height: 36,
                padding: '0 14px',
                borderRadius: 8,
                border: '1px solid var(--border-subtle)',
                background: 'transparent',
                color: actionLoading ? 'var(--text-tertiary)' : 'var(--text-secondary)',
                fontSize: 13,
                fontFamily: 'var(--font-geist-sans)',
                cursor: actionLoading ? 'not-allowed' : 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {actionLoading ? 'Disabling...' : 'Disable'}
            </button>
          </div>
        )}

        {/* Error message */}
        {actionError && (
          <p
            style={{
              fontSize: 12,
              color: 'var(--coral)',
              fontFamily: 'var(--font-geist-sans)',
              margin: '12px 0 0',
              lineHeight: 1.4,
            }}
          >
            {actionError}
          </p>
        )}
      </motion.div>

      {/* What you will receive */}
      <motion.div
        variants={cardVariants}
        initial="initial"
        animate="animate"
        style={{
          background: 'var(--surface-elevated)',
          borderRadius: 12,
          padding: 20,
          marginBottom: isDev ? 16 : 0,
          boxShadow:
            '0 1px 3px rgba(1,30,65,0.04), 0 6px 16px rgba(1,30,65,0.04)',
        }}
      >
        <h3
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-geist-sans)',
            margin: '0 0 14px',
          }}
        >
          {"What you'll receive"}
        </h3>
        <ul
          style={{
            listStyle: 'none',
            margin: 0,
            padding: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          {NOTIFICATION_TYPES.map((item) => (
            <li
              key={item.label}
              style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}
            >
              <span
                style={{
                  marginTop: 3,
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: 'var(--amber-core)',
                  display: 'inline-block',
                  flexShrink: 0,
                }}
              />
              <div>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-geist-sans)',
                    display: 'block',
                  }}
                >
                  {item.label}
                </span>
                <span
                  style={{
                    fontSize: 12,
                    color: 'var(--text-secondary)',
                    fontFamily: 'var(--font-geist-sans)',
                    lineHeight: 1.4,
                  }}
                >
                  {item.description}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </motion.div>

      {/* Dev-only: send test notification */}
      {isDev && pushStatus === 'enabled' && (
        <motion.div
          variants={cardVariants}
          initial="initial"
          animate="animate"
          style={{
            background: 'var(--surface-elevated)',
            borderRadius: 12,
            padding: 20,
            boxShadow:
              '0 1px 3px rgba(1,30,65,0.04), 0 6px 16px rgba(1,30,65,0.04)',
          }}
        >
          <h3
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-geist-sans)',
              margin: '0 0 8px',
            }}
          >
            Development
          </h3>
          <p
            style={{
              fontSize: 13,
              color: 'var(--text-secondary)',
              fontFamily: 'var(--font-geist-sans)',
              margin: '0 0 14px',
              lineHeight: 1.4,
            }}
          >
            Send a test notification to verify push delivery end-to-end.
          </p>
          <button
            onClick={handleTestNotification}
            style={{
              height: 36,
              padding: '0 16px',
              borderRadius: 8,
              border: '1px solid var(--border-subtle)',
              background: 'transparent',
              color: testSent ? 'var(--teal)' : 'var(--text-secondary)',
              fontSize: 13,
              fontWeight: 500,
              fontFamily: 'var(--font-geist-sans)',
              cursor: 'pointer',
              transition: 'color 200ms',
            }}
          >
            {testSent ? '✓ Test notification sent' : 'Send test notification'}
          </button>
        </motion.div>
      )}
    </motion.div>
  );
}
