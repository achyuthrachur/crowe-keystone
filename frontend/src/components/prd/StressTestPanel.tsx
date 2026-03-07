'use client';

import { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { accordionVariants } from '@/lib/motion';

export function StressTestPanel() {
  const [isExpanded, setIsExpanded] = useState(false);
  const shouldReduce = useReducedMotion();

  return (
    <div
      style={{
        borderRadius: 12,
        border: '1px solid var(--amber-core)',
        background: 'var(--amber-glow)',
        padding: 16,
        boxShadow: '0 4px 16px rgba(245,168,0,0.20)',
      }}
    >
      {/* Header row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: 'var(--amber-core)',
              fontFamily: 'var(--font-geist-sans)',
            }}
          >
            &#9889; Stress Test
          </span>
        </div>

        <button
          onClick={() => setIsExpanded((v) => !v)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            background: 'none',
            border: 'none',
            color: 'var(--amber-core)',
            fontSize: 12,
            fontFamily: 'var(--font-geist-sans)',
            cursor: 'pointer',
            fontWeight: 500,
          }}
        >
          {isExpanded ? 'Collapse' : 'Expand'}
          <span
            style={{
              display: 'inline-block',
              transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 200ms',
              fontSize: 10,
            }}
          >
            &#9660;
          </span>
        </button>
      </div>

      {/* Body — always visible */}
      <p
        style={{
          margin: '8px 0 0',
          fontSize: 13,
          color: 'var(--text-secondary)',
          fontFamily: 'var(--font-geist-sans)',
          lineHeight: 1.5,
        }}
      >
        Run a stress test to find how this PRD could fail before you build it.
      </p>

      {/* CTA */}
      <button
        onClick={() => {
          // Phase 5 wires this — no-op for now
        }}
        style={{
          marginTop: 10,
          background: 'none',
          border: 'none',
          color: 'var(--amber-core)',
          fontSize: 13,
          fontFamily: 'var(--font-geist-sans)',
          cursor: 'pointer',
          fontWeight: 600,
          padding: 0,
          textDecoration: 'none',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.textDecoration = 'underline';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.textDecoration = 'none';
        }}
      >
        Run stress test &#8594;
      </button>

      {/* Expandable content */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            key="stress-test-expanded"
            variants={shouldReduce ? undefined : accordionVariants}
            initial={shouldReduce ? undefined : 'collapsed'}
            animate={shouldReduce ? undefined : 'expanded'}
            exit={shouldReduce ? undefined : 'collapsed'}
            style={{ overflow: 'hidden' }}
          >
            <div
              style={{
                marginTop: 16,
                paddingTop: 16,
                borderTop: '1px solid rgba(245,168,0,0.3)',
              }}
            >
              <p
                style={{
                  fontSize: 13,
                  color: 'var(--text-tertiary)',
                  fontFamily: 'var(--font-geist-sans)',
                  margin: 0,
                  fontStyle: 'italic',
                }}
              >
                No stress test results yet. Run a stress test to see hypotheses, adversarial
                findings, and fragile assumptions.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
