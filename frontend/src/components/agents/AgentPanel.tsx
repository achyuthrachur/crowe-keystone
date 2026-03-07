'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { accordionVariants, listItemVariants } from '@/lib/motion';
import { AgentThinking } from './AgentThinking';
import type { AgentRun } from '@/types/agent.types';
import { apiRequest } from '@/lib/api';

const AGENT_LABELS: Record<string, { label: string; emoji: string }> = {
  brief_generator:       { label: 'Brief Generator',     emoji: '⚡' },
  prd_drafter:           { label: 'PRD Architect',       emoji: '◎' },
  stress_tester:         { label: 'Stress Tester',       emoji: '⚡' },
  conflict_detector:     { label: 'Conflict Detector',   emoji: '⬡' },
  approval_router:       { label: 'Approval Router',     emoji: '→' },
  update_writer:         { label: 'Update Writer',       emoji: '◍' },
  retro_generator:       { label: 'Retro Generator',     emoji: '◎' },
  memory_indexer:        { label: 'Memory Indexer',      emoji: '◉' },
  daily_brief_generator: { label: 'Daily Brief',         emoji: '◎' },
};

interface AgentPanelProps {
  run?: AgentRun;
}

export function AgentPanel({ run }: AgentPanelProps) {
  const shouldReduce = useReducedMotion();
  const [checkpointAnswer, setCheckpointAnswer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const collapseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-collapse 3 seconds after completion
  useEffect(() => {
    if (run?.status === 'complete') {
      collapseTimerRef.current = setTimeout(() => setCollapsed(true), 3000);
    } else {
      setCollapsed(false);
      if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current);
    }
    return () => {
      if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current);
    };
  }, [run?.status]);

  if (!run) return null;

  const meta = AGENT_LABELS[run.agent_type] ?? { label: run.agent_type, emoji: '⚡' };
  const completedNodes = run.nodes_completed ?? [];
  const currentNode = run.current_node;

  async function handleCheckpointSubmit() {
    if (!checkpointAnswer.trim() || !run) return;
    setIsSubmitting(true);
    try {
      await apiRequest(`/agents/run/${run.id}/respond`, {
        method: 'POST',
        body: JSON.stringify({ answer: checkpointAnswer }),
      });
      setCheckpointAnswer('');
    } catch (err) {
      console.error('[AgentPanel] checkpoint submit failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AnimatePresence>
      {!collapsed && (
        <motion.div
          key={run.id}
          initial={shouldReduce ? undefined : { opacity: 0, x: 20 }}
          animate={shouldReduce ? undefined : { opacity: 1, x: 0 }}
          exit={shouldReduce ? undefined : { opacity: 0, x: 20 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          style={{
            background: 'var(--amber-glow)',
            border: '1px solid var(--border-amber)',
            borderRadius: 10,
            padding: 12,
            marginBottom: 12,
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 14 }}>{meta.emoji}</span>
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--amber-core)',
                fontFamily: 'var(--font-geist-sans)',
                flex: 1,
              }}
            >
              {meta.label}
            </span>
            {run.status === 'running' && <AgentThinking />}
            {run.status === 'complete' && (
              <span style={{ fontSize: 16, color: 'var(--teal)' }}>✓</span>
            )}
          </div>

          {/* Completion state */}
          {run.status === 'complete' && (
            <motion.div
              initial={shouldReduce ? undefined : { opacity: 0, y: 4 }}
              animate={shouldReduce ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              style={{
                fontSize: 12,
                color: 'var(--teal)',
                fontFamily: 'var(--font-geist-sans)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                marginBottom: completedNodes.length > 0 ? 6 : 0,
              }}
            >
              Complete
              {run.tokens_used != null && run.tokens_used > 0 && (
                <span style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-geist-mono)' }}>
                  · {run.tokens_used.toLocaleString()} tokens
                </span>
              )}
              {run.duration_ms != null && (
                <span style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-geist-mono)' }}>
                  · {(run.duration_ms / 1000).toFixed(1)}s
                </span>
              )}
            </motion.div>
          )}

          {/* Failed state */}
          {run.status === 'failed' && (
            <div
              style={{
                fontSize: 12,
                color: 'var(--coral)',
                fontFamily: 'var(--font-geist-sans)',
                marginBottom: 8,
              }}
            >
              ✗ Failed{run.error ? `: ${run.error.slice(0, 80)}` : ''}
            </div>
          )}

          {/* Node progress list */}
          {(completedNodes.length > 0 || (currentNode && run.status !== 'complete')) && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                marginBottom: run.status === 'awaiting_human' ? 8 : 0,
              }}
            >
              {completedNodes.map((node) => (
                <motion.div
                  key={node}
                  variants={shouldReduce ? undefined : listItemVariants}
                  initial="initial"
                  animate="animate"
                  style={{
                    fontSize: 11,
                    color: 'var(--text-secondary)',
                    fontFamily: 'var(--font-geist-mono)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <span style={{ color: 'var(--teal)', flexShrink: 0 }}>✓</span>
                  {node}
                </motion.div>
              ))}
              {currentNode && run.status !== 'complete' && (
                <motion.div
                  key={currentNode}
                  variants={shouldReduce ? undefined : listItemVariants}
                  initial="initial"
                  animate="animate"
                  style={{
                    fontSize: 11,
                    color: 'var(--amber-core)',
                    fontFamily: 'var(--font-geist-mono)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <span style={{ flexShrink: 0 }}>→</span>
                  {currentNode}
                </motion.div>
              )}
            </div>
          )}

          {/* Human checkpoint UI */}
          {run.status === 'awaiting_human' && run.checkpoint_question && (
            <motion.div
              initial={shouldReduce ? undefined : { opacity: 0, y: 4 }}
              animate={shouldReduce ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              style={{
                padding: 10,
                background: 'var(--surface-elevated)',
                borderRadius: 8,
                border: '1px solid var(--border-amber)',
              }}
            >
              <p
                style={{
                  fontSize: 12,
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-geist-sans)',
                  margin: '0 0 8px',
                  lineHeight: 1.5,
                }}
              >
                {run.checkpoint_question}
              </p>
              <input
                value={checkpointAnswer}
                onChange={(e) => setCheckpointAnswer(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') void handleCheckpointSubmit(); }}
                placeholder="Your answer..."
                style={{
                  width: '100%',
                  height: 44,
                  background: 'var(--surface-input)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 6,
                  padding: '0 10px',
                  fontSize: 12,
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-geist-sans)',
                  outline: 'none',
                  boxSizing: 'border-box',
                  marginBottom: 6,
                  display: 'block',
                }}
              />
              <button
                onClick={() => void handleCheckpointSubmit()}
                disabled={isSubmitting || !checkpointAnswer.trim()}
                style={{
                  width: '100%',
                  height: 36,
                  borderRadius: 6,
                  border: 'none',
                  background: isSubmitting || !checkpointAnswer.trim()
                    ? 'var(--surface-input)'
                    : 'var(--amber-core)',
                  color: isSubmitting || !checkpointAnswer.trim()
                    ? 'var(--text-tertiary)'
                    : 'var(--surface-base)',
                  fontSize: 12,
                  fontWeight: 600,
                  fontFamily: 'var(--font-geist-sans)',
                  cursor: isSubmitting || !checkpointAnswer.trim() ? 'not-allowed' : 'pointer',
                  transition: 'all 150ms',
                }}
              >
                {isSubmitting ? 'Submitting...' : 'Submit \u2192'}
              </button>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
