'use client';

import { motion } from 'framer-motion';
import { pageVariants } from '@/lib/motion';

export default function ApprovalChainsPage() {
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
        Approval Chains
      </h1>
      <p
        style={{
          fontSize: 14,
          color: 'var(--text-secondary)',
          fontFamily: 'var(--font-geist-sans)',
          margin: '0 0 24px',
        }}
      >
        Configure which stage transitions require approval and who approves them.
      </p>

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
          Approval chain configuration coming in Phase 2.
        </p>
        <span
          style={{
            fontSize: 11,
            color: 'var(--text-tertiary)',
            fontFamily: 'var(--font-geist-mono)',
          }}
        >
          Phase 2 — Stage Transitions + Approvals
        </span>
      </div>
    </motion.div>
  );
}
