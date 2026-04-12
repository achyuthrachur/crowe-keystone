'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useKeystoneStore } from '@/stores/keystone.store';
import { useRunGraphState } from '@/hooks/useRunGraphState';
import type { Engagement } from '@/types/keystone.types';

interface Gate1PanelProps {
  engagement: Engagement;
  token: string;
}

function Spinner() {
  return (
    <motion.span
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      style={{
        display: 'inline-block', width: 14, height: 14,
        borderRadius: '50%', border: '2px solid rgba(0,0,0,0.3)',
        borderTopColor: 'transparent',
      }}
    />
  );
}

export function Gate1Panel({ engagement, token }: Gate1PanelProps) {
  const { submitGate1 } = useKeystoneStore();
  const { filteredTranscript, removedSegments } = useRunGraphState();
  const [restored, setRestored] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleRestore(id: string) {
    setRestored((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      await submitGate1(engagement.id, Array.from(restored), token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      style={{ display: 'flex', flexDirection: 'column', gap: 20 }}
    >
      {/* Header */}
      <div>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
          Gate 1 — Noise Filter Review
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 6, lineHeight: 1.6 }}>
          The pipeline removed these segments from your transcript. Toggle &ldquo;Restore&rdquo; on any segment
          that should be kept, then click Continue.
        </p>
      </div>

      {/* Filtered transcript preview */}
      {filteredTranscript && (
        <div style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
          <div style={{
            padding: '6px 12px', background: 'var(--surface-overlay)',
            borderBottom: '1px solid var(--border-subtle)',
            fontSize: 10, fontWeight: 600, color: 'var(--text-tertiary)',
            textTransform: 'uppercase', letterSpacing: '0.06em',
          }}>
            Filtered Transcript
          </div>
          <pre style={{
            margin: 0, padding: '12px 14px',
            background: 'var(--surface-input)',
            fontSize: 11, lineHeight: 1.7,
            color: 'var(--text-secondary)',
            fontFamily: 'var(--font-geist-mono)',
            maxHeight: 200, overflowY: 'auto',
            whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          }}>
            {filteredTranscript}
          </pre>
        </div>
      )}

      {/* Removed segments */}
      <div>
        <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Removed Segments {removedSegments.length > 0 && `(${removedSegments.length})`}
        </h3>

        {removedSegments.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
            No segments were removed. The transcript is unchanged.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {removedSegments.map((seg, i) => (
              <motion.div
                key={seg.id}
                layout
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12,
                  padding: '10px 14px', borderRadius: 8,
                  background: restored.has(seg.id) ? 'var(--teal-glow)' : 'var(--coral-glow)',
                  border: `1px solid ${restored.has(seg.id) ? 'var(--border-teal)' : 'var(--border-coral)'}`,
                  transition: 'all 200ms ease',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6,
                    textDecoration: restored.has(seg.id) ? 'none' : 'line-through',
                    textDecorationColor: 'var(--coral)',
                    fontFamily: 'var(--font-geist-mono)',
                    margin: 0, wordBreak: 'break-word',
                  }}>
                    {seg.text}
                  </p>
                  <span style={{
                    fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: restored.has(seg.id) ? 'var(--teal)' : 'var(--coral)',
                    marginTop: 4, display: 'block',
                  }}>
                    {seg.reason.replace(/_/g, ' ')}
                  </span>
                </div>

                <button
                  onClick={() => toggleRestore(seg.id)}
                  style={{
                    fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 6,
                    border: `1px solid ${restored.has(seg.id) ? 'var(--border-teal)' : 'var(--border-coral)'}`,
                    background: 'transparent', cursor: 'pointer', flexShrink: 0,
                    color: restored.has(seg.id) ? 'var(--teal)' : 'var(--coral)',
                    transition: 'all 150ms ease',
                  }}
                >
                  {restored.has(seg.id) ? '✓ Restored' : 'Restore'}
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
          style={{ fontSize: 12, color: 'var(--coral)', margin: 0 }}
        >
          {error}
        </motion.p>
      )}

      {/* Submit */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        onClick={handleSubmit}
        disabled={submitting}
        style={{
          alignSelf: 'flex-start',
          height: 44, padding: '0 28px', borderRadius: 8, border: 'none',
          background: 'var(--amber-core)', color: 'var(--text-inverse)',
          fontSize: 14, fontWeight: 600,
          cursor: submitting ? 'not-allowed' : 'pointer',
          opacity: submitting ? 0.7 : 1,
          display: 'flex', alignItems: 'center', gap: 8,
        }}
      >
        {submitting && <Spinner />}
        {restored.size > 0
          ? `Restore ${restored.size} segment${restored.size > 1 ? 's' : ''} & Continue`
          : 'Looks Good — Continue'}
      </motion.button>
    </motion.div>
  );
}
