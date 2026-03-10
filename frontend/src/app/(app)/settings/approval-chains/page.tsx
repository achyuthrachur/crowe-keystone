'use client';

import { motion } from 'framer-motion';
import { pageVariants } from '@/lib/motion';

const APPROVAL_RULES = [
  {
    from: 'Draft PRD',
    to: 'In Review',
    requires: true,
    approvers: 'Team leads and admins',
    description: 'Ensures the PRD is complete and unblocked before external review.',
  },
  {
    from: 'In Review',
    to: 'Approved',
    requires: true,
    approvers: 'Team leads and admins',
    description: 'Final sign-off before the project enters active development.',
  },
];

const NO_APPROVAL_STAGES = [
  { label: 'Spark → Brief', reason: 'Lightweight — starting the brief is immediate' },
  { label: 'Brief → Draft PRD', reason: 'Author can begin drafting without blocking' },
  { label: 'Approved → In Build', reason: 'Already approved — build can begin immediately' },
  { label: 'In Build → Shipped', reason: 'Completion is self-certifying' },
  { label: 'Shipped → Retrospective', reason: 'Retrospectives are always welcome' },
];

export default function ApprovalChainsPage() {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-geist-sans)', margin: '0 0 6px' }}>
        Approval Chains
      </h1>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', fontFamily: 'var(--font-geist-sans)', margin: '0 0 24px', lineHeight: 1.6 }}>
        These transitions require approval before a project advances. Approvals are routed to team leads and admins automatically.
      </p>

      {/* Required approvals */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
        {APPROVAL_RULES.map((rule) => (
          <div
            key={rule.to}
            style={{
              background: 'var(--surface-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 10,
              padding: '16px 20px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-geist-sans)' }}>
                {rule.from}
              </span>
              <span style={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'var(--font-geist-sans)' }}>→</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-geist-sans)' }}>
                {rule.to}
              </span>
              <span style={{
                marginLeft: 'auto',
                fontSize: 11, fontWeight: 600,
                color: 'var(--amber-core)',
                background: 'var(--amber-glow)',
                border: '1px solid var(--border-amber)',
                borderRadius: 999, padding: '2px 8px',
                fontFamily: 'var(--font-geist-sans)',
              }}>
                Approval required
              </span>
            </div>
            <p style={{ margin: '0 0 4px', fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'var(--font-geist-sans)', lineHeight: 1.5 }}>
              {rule.description}
            </p>
            <p style={{ margin: 0, fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'var(--font-geist-sans)' }}>
              Routed to: {rule.approvers}
            </p>
          </div>
        ))}
      </div>

      {/* No-approval stages */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', fontFamily: 'var(--font-geist-sans)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
          Immediate (no approval)
        </div>
        <div style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 10, overflow: 'hidden' }}>
          {NO_APPROVAL_STAGES.map((s, i) => (
            <div
              key={s.label}
              style={{
                padding: '10px 16px',
                borderBottom: i < NO_APPROVAL_STAGES.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                display: 'flex', alignItems: 'center', gap: 12,
              }}
            >
              <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'var(--font-geist-sans)', minWidth: 160 }}>
                {s.label}
              </span>
              <span style={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'var(--font-geist-sans)', lineHeight: 1.4 }}>
                {s.reason}
              </span>
              <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--teal)', fontFamily: 'var(--font-geist-sans)' }}>
                Immediate ✓
              </span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
