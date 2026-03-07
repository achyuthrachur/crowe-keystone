'use client';

import { motion } from 'framer-motion';
import { pageVariants } from '@/lib/motion';

export default function TeamSettingsPage() {
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
          margin: '0 0 24px',
        }}
      >
        Team Settings
      </h1>

      <div
        style={{
          background: 'var(--surface-elevated)',
          borderRadius: 10,
          border: '1px solid var(--border-subtle)',
          padding: 20,
          marginBottom: 16,
        }}
      >
        <h2
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-geist-sans)',
            margin: '0 0 16px',
          }}
        >
          Team Members
        </h2>
        {[
          { name: 'Achyuth Rachur', email: 'achyuth@crowe.com', role: 'admin', status: 'online' },
          { name: 'Alex', email: 'alex@crowe.com', role: 'builder', status: 'away' },
        ].map((member) => (
          <div
            key={member.email}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '10px 0',
              borderBottom: '1px solid var(--border-subtle)',
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'var(--surface-selected)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 13,
                fontWeight: 700,
                color: 'var(--text-primary)',
                flexShrink: 0,
              }}
            >
              {member.name[0]}
            </div>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-geist-sans)',
                }}
              >
                {member.name}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: 'var(--text-tertiary)',
                  fontFamily: 'var(--font-geist-sans)',
                }}
              >
                {member.email}
              </div>
            </div>
            <span
              style={{
                fontSize: 11,
                padding: '2px 8px',
                borderRadius: 4,
                background: 'var(--surface-input)',
                color: 'var(--text-secondary)',
                fontFamily: 'var(--font-geist-sans)',
                textTransform: 'capitalize',
              }}
            >
              {member.role}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
