'use client';

import { motion } from 'framer-motion';
import { pageVariants } from '@/lib/motion';
import { PushPermissionPrompt } from '@/components/notifications/PushPermissionPrompt';

export default function NotificationSettingsPage() {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <h1
        style={{
          fontSize: 24,
          fontWeight: 700,
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-display)',
          margin: '0 0 8px',
        }}
      >
        Notifications
      </h1>
      <p
        style={{
          fontSize: 14,
          color: 'var(--text-secondary)',
          fontFamily: 'var(--font-geist-sans)',
          margin: '0 0 24px',
        }}
      >
        Manage push notifications for approvals, conflicts, and agent checkpoints.
      </p>

      <div style={{ maxWidth: 480 }}>
        <PushPermissionPrompt />
      </div>

      <div
        style={{
          marginTop: 24,
          padding: 16,
          background: 'var(--surface-elevated)',
          borderRadius: 10,
          border: '1px solid var(--border-subtle)',
          maxWidth: 480,
        }}
      >
        <h3
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-geist-sans)',
            margin: '0 0 12px',
          }}
        >
          {"You'll receive notifications for:"}
        </h3>
        {[
          '✓ Approval requests that need your decision',
          '✓ Conflicts detected in your projects',
          '✓ Agent checkpoints requiring your input',
          '✓ Stage advances on projects you own',
          '✓ Daily brief at 7am your local time',
        ].map((item) => (
          <p
            key={item}
            style={{
              fontSize: 13,
              color: 'var(--text-secondary)',
              fontFamily: 'var(--font-geist-sans)',
              margin: '0 0 6px',
            }}
          >
            {item}
          </p>
        ))}
      </div>
    </motion.div>
  );
}
