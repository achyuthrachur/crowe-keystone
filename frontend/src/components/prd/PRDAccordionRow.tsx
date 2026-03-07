'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { accordionVariants, tapVariants } from '@/lib/motion';

interface PRDAccordionRowProps {
  label: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  count?: number;
  /** Extra element rendered on the right of the count badge, before the edit button */
  statusBadge?: React.ReactNode;
  onEdit?: () => void;
}

export function PRDAccordionRow({
  label,
  isOpen,
  onToggle,
  children,
  count,
  statusBadge,
  onEdit,
}: PRDAccordionRowProps) {
  return (
    <div
      style={{
        borderRadius: 10,
        border: '1px solid var(--border-subtle)',
        background: 'var(--surface-elevated)',
        overflow: 'hidden',
      }}
    >
      {/* Header button — full-width, 48px minimum touch target */}
      <motion.button
        variants={tapVariants}
        whileTap="tap"
        onClick={onToggle}
        style={{
          width: '100%',
          minHeight: 48,
          paddingLeft: 16,
          paddingRight: 12,
          paddingTop: 0,
          paddingBottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          gap: 8,
          WebkitTapHighlightColor: 'transparent',
        }}
        aria-expanded={isOpen}
      >
        {/* Left: caret + label */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
          {/* Rotating caret */}
          <motion.span
            animate={{ rotate: isOpen ? 90 : 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              color: 'var(--text-tertiary)',
              fontSize: 10,
              flexShrink: 0,
              lineHeight: 1,
            }}
          >
            ▶
          </motion.span>

          {/* Section label */}
          <span
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-geist-sans)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {label}
          </span>
        </div>

        {/* Right: status badge + count + edit button */}
        <div
          style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}
          // Prevent caret clicks when interacting with right-side controls
          onClick={(e) => e.stopPropagation()}
        >
          {/* Optional status badge (e.g. open-question summary) */}
          {statusBadge}

          {/* Count badge — shown for array-type sections */}
          {count !== undefined && (
            <span
              style={{
                minWidth: 20,
                height: 20,
                borderRadius: 10,
                background: 'var(--surface-input)',
                border: '1px solid var(--border-subtle)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--text-secondary)',
                fontFamily: 'var(--font-geist-sans)',
                padding: '0 5px',
              }}
            >
              {count}
            </span>
          )}

          {/* Edit button — 44x44 touch target */}
          {onEdit && (
            <motion.button
              variants={tapVariants}
              whileTap="tap"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              style={{
                width: 44,
                height: 44,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-tertiary)',
                fontSize: 14,
                borderRadius: 8,
                flexShrink: 0,
                WebkitTapHighlightColor: 'transparent',
              }}
              aria-label={`Edit ${label}`}
            >
              ✏
            </motion.button>
          )}
        </div>
      </motion.button>

      {/* Expandable content */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="content"
            variants={accordionVariants}
            initial="collapsed"
            animate="expanded"
            exit="collapsed"
            style={{ overflow: 'hidden' }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
