'use client';

import { motion } from 'framer-motion';
import { pageVariants } from '@/lib/motion';

export default function DailyPage() {
  const today = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1
          style={{
            fontSize: 24,
            fontWeight: 700,
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-display)',
            margin: 0,
          }}
        >
          Today
        </h1>
        <span
          style={{
            fontSize: 13,
            color: 'var(--text-tertiary)',
            fontFamily: 'var(--font-geist-sans)',
          }}
        >
          {today}
        </span>
      </div>
      <div
        style={{
          padding: 24,
          background: 'var(--surface-elevated)',
          borderRadius: 10,
          border: '1px solid var(--border-subtle)',
          textAlign: 'center',
        }}
      >
        <p
          style={{
            color: 'var(--text-secondary)',
            fontSize: 14,
            fontFamily: 'var(--font-geist-sans)',
            margin: '0 0 8px',
          }}
        >
          Daily brief generator coming in Phase 5.
        </p>
        <span
          style={{
            fontSize: 11,
            color: 'var(--text-tertiary)',
            fontFamily: 'var(--font-geist-mono)',
          }}
        >
          Phase 5 — Daily Brief Generator Agent
        </span>
      </div>
    </motion.div>
  );
}
