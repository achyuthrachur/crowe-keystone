'use client';

import { motion } from 'framer-motion';
import { pageVariants } from '@/lib/motion';

export default function MemoryPage() {
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
          marginBottom: 20,
          margin: '0 0 20px',
        }}
      >
        Memory
      </h1>
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
          Institutional memory browser coming in Phase 5.
        </p>
        <span
          style={{
            fontSize: 11,
            color: 'var(--text-tertiary)',
            fontFamily: 'var(--font-geist-mono)',
          }}
        >
          Phase 5 — LangGraph + Memory Indexer
        </span>
      </div>
    </motion.div>
  );
}
