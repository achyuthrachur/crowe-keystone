'use client';

import { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Play } from 'lucide-react';
import { useKeystoneStore } from '@/stores/keystone.store';
import { RunConfirmModal } from './RunConfirmModal';
import { PipelineNodeProgress } from './PipelineNodeProgress';
import type { Engagement } from '@/types/keystone.types';

interface RunStepProps {
  engagement: Engagement;
  token: string;
}

export function RunStep({ engagement, token }: RunStepProps) {
  const { activeRun, activeDocuments, currentRunNode, runLog } = useKeystoneStore();
  const [modalOpen, setModalOpen] = useState(false);
  const logRef = useRef<HTMLPreElement>(null);

  const { status } = engagement;
  const isRunning = status === 'running' || status === 'compiling';
  const isFailed = status === 'failed';
  const isReady = status === 'ready';

  // Auto-scroll live log
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [runLog]);

  // ── Failed state ────────────────────────────────────────────────────────────
  if (isFailed) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          padding: '14px 16px', borderRadius: 8,
          background: 'var(--coral-glow)', border: '1px solid var(--border-coral)',
        }}
      >
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--coral)', marginBottom: 4 }}>
          Pipeline failed
        </p>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
          {activeRun?.error ?? 'An unexpected error occurred. Check the server logs.'}
        </p>
      </motion.div>
    );
  }

  // ── Running / Compiling state ───────────────────────────────────────────────
  if (isRunning) {
    const displayNode = currentRunNode ?? activeRun?.current_node ?? null;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '14px 16px', borderRadius: 10,
          background: 'var(--surface-elevated)',
          border: '1px solid var(--border-amber)',
        }}>
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              width: 10, height: 10, borderRadius: '50%',
              background: 'var(--amber-core)', flexShrink: 0,
            }}
          />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--amber-core)' }}>
            Running pipeline…
          </span>
        </div>

        {/* Node progress */}
        <div style={{
          padding: '14px 16px', borderRadius: 10,
          background: 'var(--surface-elevated)',
          border: '1px solid var(--border-subtle)',
        }}>
          <h4 style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
            Node Progress
          </h4>
          <PipelineNodeProgress currentNode={displayNode} />
        </div>

        {/* Live log */}
        {runLog.length > 0 && (
          <div style={{
            borderRadius: 8, overflow: 'hidden',
            border: '1px solid var(--border-subtle)',
          }}>
            <div style={{
              padding: '6px 10px', background: 'var(--surface-overlay)',
              borderBottom: '1px solid var(--border-subtle)',
              fontSize: 10, fontWeight: 600, color: 'var(--text-tertiary)',
              textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
              Live Log
            </div>
            <pre
              ref={logRef}
              style={{
                margin: 0, padding: '10px 12px',
                background: 'var(--surface-input)',
                fontSize: 11, lineHeight: 1.6,
                color: 'var(--text-secondary)',
                fontFamily: 'var(--font-geist-mono)',
                maxHeight: 120, overflowY: 'auto',
              }}
            >
              {runLog.map((line, i) => (
                <div key={i}>{'> '}{line}</div>
              ))}
            </pre>
          </div>
        )}
      </div>
    );
  }

  // ── Ready state (default) ───────────────────────────────────────────────────
  const hasTranscript = activeDocuments.some((d) => d.doc_type === 'transcript');

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{
          padding: '16px 20px', borderRadius: 10,
          background: 'var(--surface-elevated)', border: '1px solid var(--border-default)',
        }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>
            {isReady ? 'Ready to Run' : 'Upload a Transcript First'}
          </h3>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            {isReady
              ? 'The transcript has been uploaded and parsed. Starting the pipeline will run all 6 nodes sequentially, pausing for your review at Gates 1, 2, and 3.'
              : 'Upload at least one transcript document to enable the pipeline run.'}
          </p>
        </div>

        <motion.button
          whileHover={hasTranscript ? { scale: 1.02 } : {}}
          whileTap={hasTranscript ? { scale: 0.97 } : {}}
          onClick={() => hasTranscript && setModalOpen(true)}
          disabled={!hasTranscript}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            height: 48, borderRadius: 10, border: 'none',
            background: hasTranscript
              ? 'linear-gradient(135deg, var(--amber-core), var(--amber-dark))'
              : 'var(--surface-input)',
            color: hasTranscript ? 'var(--text-inverse)' : 'var(--text-tertiary)',
            fontSize: 15, fontWeight: 600,
            cursor: hasTranscript ? 'pointer' : 'not-allowed',
            boxShadow: hasTranscript ? 'var(--shadow-amber)' : 'none',
          }}
        >
          <Play size={18} />
          Run Pipeline
        </motion.button>
      </div>

      <RunConfirmModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        engagement={engagement}
        documents={activeDocuments}
        token={token}
      />
    </>
  );
}
