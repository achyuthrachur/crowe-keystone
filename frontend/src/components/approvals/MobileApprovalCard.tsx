'use client';

import { motion, useMotionValue, useTransform } from 'framer-motion';
import { SWIPE_THRESHOLD, tapVariants } from '@/lib/motion';
import type { Approval } from '@/types/approval.types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTimeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatApprovalType(type: string): string {
  return type.replace(/_/g, ' ');
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface MobileApprovalCardProps {
  approval: Approval;
  onApprove: (id: string) => void;
  onRequestChanges: (id: string) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function MobileApprovalCard({
  approval,
  onApprove,
  onRequestChanges,
}: MobileApprovalCardProps) {
  const x = useMotionValue(0);

  // Reveal background opacities driven by drag position
  const leftBgColor = useTransform(
    x,
    [-200, -SWIPE_THRESHOLD, 0],
    ['rgba(245,168,0,0.18)', 'rgba(245,168,0,0.12)', 'rgba(245,168,0,0)']
  );
  const rightBgColor = useTransform(
    x,
    [0, SWIPE_THRESHOLD, 200],
    ['rgba(5,171,140,0)', 'rgba(5,171,140,0.12)', 'rgba(5,171,140,0.18)']
  );

  // Label opacity — fades in as the user swipes far enough
  const leftLabelOpacity = useTransform(x, [-200, -SWIPE_THRESHOLD, 0], [1, 0.8, 0]);
  const rightLabelOpacity = useTransform(x, [0, SWIPE_THRESHOLD, 200], [0, 0.8, 1]);

  return (
    <div
      data-testid="mobile-approval-card"
      style={{ position: 'relative', overflow: 'hidden', borderRadius: 12, marginBottom: 12 }}
    >
      {/* ── Reveal: amber (LEFT / changes direction) ── */}
      <motion.div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          background: leftBgColor,
          display: 'flex',
          alignItems: 'center',
          paddingLeft: 20,
          borderRadius: 12,
          pointerEvents: 'none',
        }}
      >
        <motion.span
          style={{
            opacity: leftLabelOpacity,
            fontSize: 12,
            color: 'var(--amber-core)',
            fontWeight: 700,
            fontFamily: 'var(--font-geist-sans)',
            letterSpacing: '0.03em',
          }}
        >
          &#9678; Changes
        </motion.span>
      </motion.div>

      {/* ── Reveal: teal (RIGHT / approve direction) ── */}
      <motion.div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          background: rightBgColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          paddingRight: 20,
          borderRadius: 12,
          pointerEvents: 'none',
        }}
      >
        <motion.span
          style={{
            opacity: rightLabelOpacity,
            fontSize: 12,
            color: 'var(--teal)',
            fontWeight: 700,
            fontFamily: 'var(--font-geist-sans)',
            letterSpacing: '0.03em',
          }}
        >
          &#10003; Approve
        </motion.span>
      </motion.div>

      {/* ── Draggable card surface ── */}
      <motion.div
        style={{ x, position: 'relative', zIndex: 1 }}
        drag="x"
        dragConstraints={{ left: -220, right: 220 }}
        dragElastic={0.15}
        onDragEnd={(_, info) => {
          if (info.offset.x > SWIPE_THRESHOLD) {
            onApprove(approval.id);
          } else if (info.offset.x < -SWIPE_THRESHOLD) {
            onRequestChanges(approval.id);
          }
        }}
      >
        <div
          style={{
            background: 'var(--surface-elevated)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 12,
            padding: 16,
          }}
        >
          {/* Meta row: type label + time ago */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 6,
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                color: 'var(--text-tertiary)',
                fontFamily: 'var(--font-geist-sans)',
              }}
            >
              {formatApprovalType(approval.type)}
            </span>
            <span
              style={{
                fontSize: 11,
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
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-geist-sans)',
              marginBottom: 8,
              lineHeight: 1.4,
            }}
          >
            {approval.project_title ?? approval.project_id}
          </div>

          {/* Divider */}
          <div
            style={{
              height: 1,
              background: 'var(--border-subtle)',
              marginBottom: 8,
            }}
          />

          {/* Summary — max 4 lines */}
          <div
            style={{
              fontSize: 13,
              color: 'var(--text-secondary)',
              fontFamily: 'var(--font-geist-sans)',
              lineHeight: 1.55,
              display: '-webkit-box',
              WebkitLineClamp: 4,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              marginBottom: 12,
            }}
          >
            {approval.request_summary}
          </div>

          {/* Action buttons — fallback for non-swipers */}
          <div style={{ display: 'flex', gap: 8 }}>
            {/* Approve */}
            <motion.button
              variants={tapVariants}
              whileTap="tap"
              onClick={() => onApprove(approval.id)}
              style={{
                flex: 1,
                height: 44,
                minHeight: 44,
                background: 'var(--teal-glow)',
                border: '1px solid var(--border-teal)',
                borderRadius: 8,
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--teal)',
                fontFamily: 'var(--font-geist-sans)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
              }}
            >
              <span aria-hidden="true">&#10003;</span> Approve
            </motion.button>

            {/* Request Changes */}
            <motion.button
              variants={tapVariants}
              whileTap="tap"
              onClick={() => onRequestChanges(approval.id)}
              style={{
                flex: 1,
                height: 44,
                minHeight: 44,
                background: 'var(--amber-glow)',
                border: '1px solid var(--border-amber)',
                borderRadius: 8,
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--amber-core)',
                fontFamily: 'var(--font-geist-sans)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
              }}
            >
              <span aria-hidden="true">&#9678;</span> Changes
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
