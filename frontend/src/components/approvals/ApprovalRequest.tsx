'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { tapVariants, DURATION } from '@/lib/motion';
import { formatTimeAgo } from '@/lib/utils';
import type { Approval, ApprovalType } from '@/types/approval.types';

interface ApprovalRequestProps {
  approval: Approval;
  onApprove: (id: string) => void;
  onRequestChanges: (id: string) => void;
  onReject: (id: string) => void;
}

const TYPE_LABELS: Record<ApprovalType, string> = {
  stage_advance:          'Stage advance',
  architectural_decision: 'Architecture',
  scope_change:           'Scope change',
  deployment:             'Deployment',
};

type ExitDir = 'approve' | 'changes' | 'reject';

const EXIT_VARIANTS: Record<ExitDir, { x?: number; y?: number; opacity: number; scale?: number }> = {
  approve: { x: 100, opacity: 0, scale: 0.95 },
  changes: { x: 0, y: -40, opacity: 0 },
  reject:  { x: -100, opacity: 0, scale: 0.95 },
};

const FLASH_BG: Record<ExitDir, string> = {
  approve: 'rgba(5, 171, 140, 0.18)',
  changes: 'rgba(245, 168, 0, 0.18)',
  reject:  'rgba(229, 55, 107, 0.18)',
};

export function ApprovalRequest({
  approval,
  onApprove,
  onRequestChanges,
  onReject,
}: ApprovalRequestProps) {
  const [visible, setVisible] = useState(true);
  const [flashing, setFlashing] = useState<ExitDir | null>(null);
  const exitDirRef = useRef<ExitDir>('approve');
  const shouldReduce = useReducedMotion();

  function handleAction(dir: ExitDir) {
    if (flashing !== null) return;
    exitDirRef.current = dir;
    setFlashing(dir);

    const delay = shouldReduce ? 0 : 200;
    setTimeout(() => {
      setVisible(false);
      if (dir === 'approve') onApprove(approval.id);
      else if (dir === 'changes') onRequestChanges(approval.id);
      else onReject(approval.id);
    }, delay);
  }

  return (
    <AnimatePresence mode="popLayout">
      {visible && (
        <motion.div
          layout
          key={approval.id}
          initial={{ opacity: 0, y: 12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={
            shouldReduce
              ? { opacity: 0 }
              : EXIT_VARIANTS[exitDirRef.current]
          }
          transition={{ duration: DURATION.normal, ease: [0.16, 1, 0.3, 1] }}
          style={{
            background: flashing ? FLASH_BG[flashing] : 'var(--surface-elevated)',
            borderRadius: 12,
            padding: 20,
            border: '1px solid var(--border-subtle)',
            transition: 'background 200ms ease',
          }}
        >
          {/* Header row: type badge + time ago */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 10,
            }}
          >
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '2px 8px',
                borderRadius: 9999,
                background: 'var(--surface-input)',
                border: '1px solid var(--border-subtle)',
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase' as const,
                color: 'var(--text-secondary)',
                fontFamily: 'var(--font-geist-sans)',
              }}
            >
              {TYPE_LABELS[approval.type] ?? approval.type}
            </span>
            <span
              style={{
                fontSize: 12,
                color: 'var(--text-tertiary)',
                fontFamily: 'var(--font-geist-sans)',
              }}
            >
              {formatTimeAgo(approval.created_at)}
            </span>
          </div>

          {/* Project title */}
          <div
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-geist-sans)',
              marginBottom: 10,
            }}
          >
            {approval.project_title ?? approval.project_id}
          </div>

          {/* Separator */}
          <div
            style={{
              height: 1,
              background: 'var(--border-subtle)',
              marginBottom: 10,
            }}
          />

          {/* AI summary — max 4 lines */}
          <p
            style={{
              fontSize: 14,
              fontWeight: 400,
              color: 'var(--text-secondary)',
              fontFamily: 'var(--font-geist-sans)',
              lineHeight: 1.6,
              margin: '0 0 10px',
              display: '-webkit-box',
              WebkitLineClamp: 4,
              WebkitBoxOrient: 'vertical' as const,
              overflow: 'hidden',
            }}
          >
            {approval.request_summary}
          </p>

          {/* Show diff link — only when a PRD is attached */}
          {approval.prd_id && (
            <a
              href={`/projects/${approval.project_id}/prd?diff=true`}
              style={{
                display: 'inline-block',
                fontSize: 13,
                color: 'var(--amber-core)',
                fontFamily: 'var(--font-geist-sans)',
                textDecoration: 'none',
                marginBottom: 14,
              }}
            >
              Show diff &#8599;
            </a>
          )}

          {/* Action buttons */}
          <div
            style={{
              display: 'flex',
              gap: 8,
              marginTop: approval.prd_id ? 0 : 4,
            }}
          >
            <motion.button
              whileTap={shouldReduce ? undefined : tapVariants.tap}
              onClick={() => handleAction('approve')}
              disabled={flashing !== null}
              style={{
                flex: 1,
                height: 36,
                borderRadius: 8,
                border: '1px solid var(--border-teal)',
                background: 'var(--teal-glow)',
                color: 'var(--teal)',
                fontSize: 13,
                fontWeight: 600,
                fontFamily: 'var(--font-geist-sans)',
                cursor: flashing !== null ? 'not-allowed' : 'pointer',
                opacity: flashing !== null ? 0.6 : 1,
                transition: 'opacity 150ms',
              }}
            >
              &#10003; Approve
            </motion.button>

            <motion.button
              whileTap={shouldReduce ? undefined : tapVariants.tap}
              onClick={() => handleAction('changes')}
              disabled={flashing !== null}
              style={{
                flex: 1,
                height: 36,
                borderRadius: 8,
                border: '1px solid var(--border-amber)',
                background: 'var(--amber-glow)',
                color: 'var(--amber-core)',
                fontSize: 13,
                fontWeight: 600,
                fontFamily: 'var(--font-geist-sans)',
                cursor: flashing !== null ? 'not-allowed' : 'pointer',
                opacity: flashing !== null ? 0.6 : 1,
                transition: 'opacity 150ms',
              }}
            >
              &#9678; Request Changes
            </motion.button>

            <motion.button
              whileTap={shouldReduce ? undefined : tapVariants.tap}
              onClick={() => handleAction('reject')}
              disabled={flashing !== null}
              style={{
                flex: 1,
                height: 36,
                borderRadius: 8,
                border: '1px solid var(--border-coral)',
                background: 'var(--coral-glow)',
                color: 'var(--coral)',
                fontSize: 13,
                fontWeight: 600,
                fontFamily: 'var(--font-geist-sans)',
                cursor: flashing !== null ? 'not-allowed' : 'pointer',
                opacity: flashing !== null ? 0.6 : 1,
                transition: 'opacity 150ms',
              }}
            >
              &#10007; Reject
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
