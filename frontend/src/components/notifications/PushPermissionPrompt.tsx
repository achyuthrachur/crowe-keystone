'use client';

// Phase 1: Component exists but is not wired into any page yet.
// Phase 2: Will be shown in settings/notifications/page.tsx and
//           as a dismissable banner after 60s of engagement on mobile web.

import { useState } from 'react';
import { subscribeToPushNotifications, isPWAInstalled } from '@/lib/push-notifications';

interface PushPermissionPromptProps {
  onDismiss?: () => void;
  onEnabled?: () => void;
}

export function PushPermissionPrompt({ onDismiss, onEnabled }: PushPermissionPromptProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'enabled' | 'denied'>('idle');

  const handleEnable = async () => {
    setStatus('loading');
    const success = await subscribeToPushNotifications();
    if (success) {
      setStatus('enabled');
      onEnabled?.();
    } else {
      setStatus('denied');
    }
  };

  if (status === 'enabled') {
    return (
      <div
        style={{
          padding: 16,
          background: 'var(--teal-glow)',
          border: '1px solid var(--border-teal)',
          borderRadius: 10,
        }}
      >
        <p
          style={{
            fontSize: 14,
            color: 'var(--teal)',
            fontFamily: 'var(--font-geist-sans)',
            margin: 0,
          }}
        >
          ✓ Push notifications enabled
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: 16,
        background: 'var(--surface-elevated)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 10,
      }}
    >
      <h3
        style={{
          fontSize: 15,
          fontWeight: 600,
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-geist-sans)',
          marginBottom: 8,
          margin: '0 0 8px',
        }}
      >
        Enable push notifications
      </h3>
      <p
        style={{
          fontSize: 13,
          color: 'var(--text-secondary)',
          fontFamily: 'var(--font-geist-sans)',
          lineHeight: 1.5,
          marginBottom: 12,
          margin: '0 0 12px',
        }}
      >
        Get notified when approvals need your decision, conflicts are detected, or
        agents need your input — even when the app is in the background.
      </p>

      {status === 'denied' && (
        <p
          style={{
            fontSize: 12,
            color: 'var(--coral)',
            fontFamily: 'var(--font-geist-sans)',
            marginBottom: 10,
            margin: '0 0 10px',
          }}
        >
          Permission denied. Please enable notifications in your browser settings.
        </p>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={handleEnable}
          disabled={status === 'loading'}
          style={{
            flex: 1,
            height: 40,
            borderRadius: 8,
            border: 'none',
            background: status === 'loading' ? 'var(--surface-input)' : 'var(--amber-core)',
            color: status === 'loading' ? 'var(--text-tertiary)' : 'var(--text-inverse)',
            fontSize: 13,
            fontWeight: 600,
            fontFamily: 'var(--font-geist-sans)',
            cursor: status === 'loading' ? 'not-allowed' : 'pointer',
          }}
        >
          {status === 'loading' ? 'Enabling...' : 'Enable push notifications'}
        </button>
        {onDismiss && (
          <button
            onClick={onDismiss}
            style={{
              height: 40,
              padding: '0 14px',
              borderRadius: 8,
              border: '1px solid var(--border-subtle)',
              background: 'transparent',
              color: 'var(--text-secondary)',
              fontSize: 13,
              fontFamily: 'var(--font-geist-sans)',
              cursor: 'pointer',
            }}
          >
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
}
