'use client';

import { motion } from 'framer-motion';
import { pageVariants } from '@/lib/motion';

export default function GraphPage() {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        gap: 16,
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 16,
          background: 'var(--blue-glow)',
          border: '1px solid var(--border-blue)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 28,
        }}
      >
        ⬡
      </div>
      <h1
        style={{
          fontSize: 24,
          fontWeight: 700,
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-display)',
          margin: 0,
        }}
      >
        Graph View
      </h1>
      <p
        style={{
          fontSize: 14,
          color: 'var(--text-secondary)',
          fontFamily: 'var(--font-geist-sans)',
          margin: 0,
          maxWidth: 360,
        }}
      >
        The interactive project graph with conflict detection and stage visualization is coming in Phase 4.
      </p>
      <div
        style={{
          padding: '8px 16px',
          borderRadius: 8,
          background: 'var(--blue-glow)',
          border: '1px solid var(--border-blue)',
          fontSize: 12,
          color: 'var(--blue)',
          fontFamily: 'var(--font-geist-mono)',
        }}
      >
        Phase 4 — React Flow Graph
      </div>
    </motion.div>
  );
}
