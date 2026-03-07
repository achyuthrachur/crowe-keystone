'use client';

import { motion } from 'framer-motion';
import { pageVariants } from '@/lib/motion';

export default function InboxPage() {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 24,
        }}
      >
        <h1
          style={{
            fontSize: 24,
            fontWeight: 700,
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-display)',
            margin: 0,
          }}
        >
          Inbox
        </h1>
        <button
          style={{
            fontSize: 13,
            color: 'var(--text-tertiary)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'var(--font-geist-sans)',
          }}
        >
          Mark all read
        </button>
      </div>

      {/* Approvals section */}
      <section style={{ marginBottom: 28 }}>
        <h2
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--text-tertiary)',
            fontFamily: 'var(--font-geist-sans)',
            marginBottom: 10,
            margin: '0 0 10px',
          }}
        >
          Approvals Waiting for You (0)
        </h2>
        <div
          style={{
            padding: 20,
            background: 'var(--surface-elevated)',
            borderRadius: 10,
            border: '1px solid var(--border-subtle)',
            textAlign: 'center',
          }}
        >
          <p
            style={{
              fontSize: 13,
              color: 'var(--text-tertiary)',
              fontFamily: 'var(--font-geist-sans)',
              margin: 0,
            }}
          >
            No approvals pending ✓
          </p>
        </div>
      </section>

      {/* Conflicts section */}
      <section style={{ marginBottom: 28 }}>
        <h2
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--text-tertiary)',
            fontFamily: 'var(--font-geist-sans)',
            marginBottom: 10,
            margin: '0 0 10px',
          }}
        >
          Conflicts Needing Decision (0)
        </h2>
        <div
          style={{
            padding: 20,
            background: 'var(--surface-elevated)',
            borderRadius: 10,
            border: '1px solid var(--border-subtle)',
            textAlign: 'center',
          }}
        >
          <p
            style={{
              fontSize: 13,
              color: 'var(--text-tertiary)',
              fontFamily: 'var(--font-geist-sans)',
              margin: 0,
            }}
          >
            No conflicts detected ✓
          </p>
        </div>
      </section>

      {/* Checkpoints section */}
      <section>
        <h2
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--text-tertiary)',
            fontFamily: 'var(--font-geist-sans)',
            marginBottom: 10,
            margin: '0 0 10px',
          }}
        >
          Agent Checkpoints Waiting (0)
        </h2>
        <div
          style={{
            padding: 20,
            background: 'var(--surface-elevated)',
            borderRadius: 10,
            border: '1px solid var(--border-subtle)',
            textAlign: 'center',
          }}
        >
          <p
            style={{
              fontSize: 13,
              color: 'var(--text-tertiary)',
              fontFamily: 'var(--font-geist-sans)',
              margin: 0,
            }}
          >
            No checkpoints pending ✓
          </p>
        </div>
      </section>
    </motion.div>
  );
}
