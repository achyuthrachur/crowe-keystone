'use client';

import { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { accordionVariants, progressFillVariants } from '@/lib/motion';
import type { StressTestResult, HypothesisResult, AssumptionAudit } from '@/types/prd.types';

// ── Confidence bar ────────────────────────────────────────────────

function ConfidenceBar({ score, color }: { score: number; color: string }) {
  const shouldReduce = useReducedMotion();
  return (
    <div
      style={{
        height: 4,
        background: 'var(--border-subtle)',
        borderRadius: 999,
        overflow: 'hidden',
        marginTop: 4,
      }}
    >
      <motion.div
        variants={shouldReduce ? undefined : progressFillVariants}
        initial={shouldReduce ? undefined : 'empty'}
        animate={shouldReduce ? undefined : 'filled'}
        custom={score}
        style={{
          height: '100%',
          width: `${Math.round(score * 100)}%`,
          background: color,
          borderRadius: 999,
        }}
      />
    </div>
  );
}

// ── Single hypothesis card ────────────────────────────────────────

function HypothesisCard({ h }: { h: HypothesisResult }) {
  const [open, setOpen] = useState(false);
  const shouldReduce = useReducedMotion();
  const pct = Math.round(h.confidence_score * 100);

  return (
    <div
      style={{
        background: 'var(--surface-elevated)',
        borderRadius: 10,
        border: h.killed_by_red_team
          ? '1px solid var(--coral)'
          : '1px solid var(--border-subtle)',
        padding: 12,
        cursor: 'pointer',
      }}
      onClick={() => setOpen((v) => !v)}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <p
          style={{
            margin: 0,
            fontSize: 12,
            fontWeight: 600,
            color: h.killed_by_red_team ? 'var(--text-tertiary)' : 'var(--text-primary)',
            fontFamily: 'var(--font-geist-sans)',
            lineHeight: 1.4,
            textDecoration: h.killed_by_red_team ? 'line-through' : 'none',
            flex: 1,
          }}
        >
          {h.statement}
        </p>
        {h.killed_by_red_team && (
          <span
            style={{
              flexShrink: 0,
              fontSize: 10,
              fontWeight: 700,
              color: 'var(--coral)',
              background: 'var(--coral-glow)',
              border: '1px solid var(--coral)',
              borderRadius: 999,
              padding: '2px 6px',
              fontFamily: 'var(--font-geist-sans)',
              whiteSpace: 'nowrap',
            }}
          >
            Killed
          </span>
        )}
      </div>

      <div style={{ marginTop: 6 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 10, color: 'var(--text-tertiary)', fontFamily: 'var(--font-geist-sans)' }}>
            Confidence
          </span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              fontFamily: 'var(--font-geist-mono)',
              color: pct >= 70 ? 'var(--teal)' : pct >= 40 ? 'var(--amber-core)' : 'var(--coral)',
            }}
          >
            {pct}%
          </span>
        </div>
        <ConfidenceBar
          score={h.confidence_score}
          color={pct >= 70 ? 'var(--teal)' : pct >= 40 ? 'var(--amber-core)' : 'var(--coral)'}
        />
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            variants={shouldReduce ? undefined : accordionVariants}
            initial="collapsed"
            animate="open"
            exit="collapsed"
            style={{ overflow: 'hidden' }}
          >
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border-subtle)' }}>
              {h.supporting_evidence.length > 0 && (
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--teal)', fontFamily: 'var(--font-geist-sans)', textTransform: 'uppercase', marginBottom: 4 }}>
                    Supporting
                  </div>
                  {h.supporting_evidence.map((e, i) => (
                    <div key={i} style={{ fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'var(--font-geist-sans)', paddingLeft: 8, borderLeft: '2px solid var(--teal)', marginBottom: 3 }}>
                      {e}
                    </div>
                  ))}
                </div>
              )}
              {h.contradicting_evidence.length > 0 && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--coral)', fontFamily: 'var(--font-geist-sans)', textTransform: 'uppercase', marginBottom: 4 }}>
                    Contradicting
                  </div>
                  {h.contradicting_evidence.map((e, i) => (
                    <div key={i} style={{ fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'var(--font-geist-sans)', paddingLeft: 8, borderLeft: '2px solid var(--coral)', marginBottom: 3 }}>
                      {e}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Assumption card ───────────────────────────────────────────────

function AssumptionCard({ a }: { a: AssumptionAudit }) {
  const fragPct = Math.round(a.fragility_score * 100);
  const fragLabel = fragPct >= 80 ? 'House of cards' : fragPct <= 20 ? 'Bedrock' : `${fragPct}% fragile`;
  const fragColor = fragPct >= 80 ? 'var(--coral)' : fragPct >= 50 ? 'var(--amber-core)' : 'var(--teal)';
  return (
    <div
      style={{
        background: 'var(--surface-elevated)',
        borderRadius: 10,
        border: `1px solid ${fragPct >= 80 ? 'var(--coral)' : 'var(--border-subtle)'}`,
        padding: 12,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-geist-sans)', lineHeight: 1.4, flex: 1 }}>
          {a.assumption}
        </p>
        <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 700, color: fragColor, fontFamily: 'var(--font-geist-mono)' }}>
          {fragLabel}
        </span>
      </div>
      <div style={{ marginTop: 4 }}>
        <div style={{ height: 4, background: 'var(--border-subtle)', borderRadius: 999, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${fragPct}%`, background: fragColor, borderRadius: 999, transition: 'width 600ms ease' }} />
        </div>
      </div>
      {a.what_breaks_if_wrong && (
        <p style={{ margin: '6px 0 0', fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'var(--font-geist-sans)', lineHeight: 1.4 }}>
          If wrong: {a.what_breaks_if_wrong}
        </p>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────

interface StressTestPanelProps {
  data?: StressTestResult | null;
  stressTestConfidence?: number;
  onRunStressTest?: () => void;
}

export function StressTestPanel({ data, stressTestConfidence, onRunStressTest }: StressTestPanelProps) {
  const [isExpanded, setIsExpanded] = useState(!!data);
  const shouldReduce = useReducedMotion();

  const hasData = data && (data.hypotheses?.length > 0 || data.assumption_audit?.length > 0);
  const sortedAssumptions = data?.assumption_audit
    ? [...data.assumption_audit].sort((a, b) => b.fragility_score - a.fragility_score)
    : [];
  const overallConfidencePct = stressTestConfidence != null
    ? Math.round(stressTestConfidence * 100)
    : null;

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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--amber-core)', fontFamily: 'var(--font-geist-sans)' }}>
            &#9889; Stress Test
          </span>
          {overallConfidencePct != null && (
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--amber-core)', fontFamily: 'var(--font-geist-mono)' }}>
              {overallConfidencePct}% concern
            </span>
          )}
        </div>
        <button
          onClick={() => setIsExpanded((v) => !v)}
          style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', color: 'var(--amber-core)', fontSize: 12, fontFamily: 'var(--font-geist-sans)', cursor: 'pointer', fontWeight: 500 }}
        >
          {isExpanded ? 'Collapse' : 'Expand'}
          <span style={{ display: 'inline-block', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 200ms', fontSize: 10 }}>
            &#9660;
          </span>
        </button>
      </div>

      {!hasData && (
        <>
          <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--text-secondary)', fontFamily: 'var(--font-geist-sans)', lineHeight: 1.5 }}>
            Run a stress test to find how this PRD could fail before you build it.
          </p>
          {onRunStressTest && (
            <button
              onClick={onRunStressTest}
              style={{ marginTop: 10, background: 'none', border: 'none', color: 'var(--amber-core)', fontSize: 13, fontFamily: 'var(--font-geist-sans)', cursor: 'pointer', fontWeight: 600, padding: 0 }}
              onMouseEnter={(e) => { e.currentTarget.style.textDecoration = 'underline'; }}
              onMouseLeave={(e) => { e.currentTarget.style.textDecoration = 'none'; }}
            >
              Run stress test &#8594;
            </button>
          )}
        </>
      )}

      {/* Expanded content with real data */}
      <AnimatePresence initial={false}>
        {isExpanded && hasData && (
          <motion.div
            key="stress-test-expanded"
            variants={shouldReduce ? undefined : accordionVariants}
            initial={shouldReduce ? undefined : 'collapsed'}
            animate={shouldReduce ? undefined : 'open'}
            exit={shouldReduce ? undefined : 'collapsed'}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(245,168,0,0.3)', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Hypotheses */}
              {data.hypotheses.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: 'var(--font-geist-sans)', marginBottom: 8 }}>
                    Hypotheses ({data.hypotheses.length})
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
                    {data.hypotheses.map((h) => (
                      <HypothesisCard key={h.id} h={h} />
                    ))}
                  </div>
                </div>
              )}
              {/* Assumption audit */}
              {sortedAssumptions.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: 'var(--font-geist-sans)', marginBottom: 8 }}>
                    Assumptions (by fragility)
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {sortedAssumptions.map((a, i) => (
                      <AssumptionCard key={i} a={a} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
