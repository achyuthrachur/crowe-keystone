'use client';

import { useState, useCallback } from 'react';
import useSWR from 'swr';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { listContainerVariants, listItemVariants, cardVariants } from '@/lib/motion';
import { PRDSection } from './PRDSection';
import { OpenQuestionBlock } from './OpenQuestionBlock';
import { StressTestPanel } from './StressTestPanel';
import { VersionDiff } from './VersionDiff';
import type { PRD, PRDContent, OpenQuestion } from '@/types/prd.types';
import { apiRequest } from '@/lib/api';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8000';

// ── Section config ────────────────────────────────────────────────

const PRD_SECTIONS: Array<{ key: keyof PRDContent; label: string }> = [
  { key: 'problem_statement', label: 'Problem Statement' },
  { key: 'user_stories', label: 'User Stories' },
  { key: 'functional_requirements', label: 'Functional Requirements' },
  { key: 'non_functional_requirements', label: 'Non-Functional Requirements' },
  { key: 'out_of_scope', label: 'Out of Scope' },
  { key: 'stack', label: 'Stack & Architecture' },
  { key: 'component_inventory', label: 'Component Inventory' },
  { key: 'data_layer_spec', label: 'Data Layer' },
  { key: 'api_contracts', label: 'API Contracts' },
  { key: 'success_criteria', label: 'Success Criteria' },
];

// ── Status badge ──────────────────────────────────────────────────

const STATUS_STYLES: Record<
  string,
  { bg: string; border: string; color: string; label: string }
> = {
  draft: {
    bg: 'var(--surface-input)',
    border: 'var(--border-default)',
    color: 'var(--text-secondary)',
    label: 'Draft',
  },
  in_review: {
    bg: 'var(--amber-glow)',
    border: 'var(--amber-core)',
    color: 'var(--amber-core)',
    label: 'In Review',
  },
  approved: {
    bg: 'var(--teal-glow)',
    border: 'var(--teal)',
    color: 'var(--teal)',
    label: 'Approved',
  },
  superseded: {
    bg: 'var(--surface-input)',
    border: 'var(--border-subtle)',
    color: 'var(--text-tertiary)',
    label: 'Superseded',
  },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES['draft'];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 600,
        background: s.bg,
        border: `1px solid ${s.border}`,
        color: s.color,
        fontFamily: 'var(--font-geist-sans)',
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
      }}
    >
      {s.label}
    </span>
  );
}

// ── Loading skeleton ──────────────────────────────────────────────

function PRDSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          style={{
            height: 80,
            borderRadius: 10,
            background: 'var(--surface-input)',
            animation: 'pulse 1.5s ease-in-out infinite',
          }}
        />
      ))}
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────

function PRDEmpty({ projectId }: { projectId: string }) {
  const [isCreating, setIsCreating] = useState(false);

  async function handleCreate() {
    setIsCreating(true);
    try {
      const emptyContent: PRDContent = {
        problem_statement: '',
        user_stories: [],
        functional_requirements: [],
        non_functional_requirements: [],
        out_of_scope: [],
        stack: [],
        component_inventory: [],
        data_layer_spec: {},
        api_contracts: [],
        success_criteria: [],
        open_questions: [],
        claude_code_prompt: '',
      };

      await apiRequest(`/projects/${projectId}/prd`, {
        method: 'PUT',
        body: JSON.stringify({ content: emptyContent }),
      });

      // Reload the page to pick up the new PRD
      window.location.reload();
    } catch (err) {
      console.error('[PRDEditor] Failed to create PRD:', err);
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <motion.div
      variants={cardVariants}
      initial="initial"
      animate="animate"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        background: 'var(--surface-elevated)',
        borderRadius: 12,
        border: '1px solid var(--border-subtle)',
        textAlign: 'center',
        gap: 12,
      }}
    >
      <span style={{ fontSize: 32 }}>&#9723;</span>
      <h3
        style={{
          margin: 0,
          fontSize: 16,
          fontWeight: 600,
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-geist-sans)',
        }}
      >
        No PRD yet
      </h3>
      <p
        style={{
          margin: 0,
          fontSize: 13,
          color: 'var(--text-secondary)',
          fontFamily: 'var(--font-geist-sans)',
          maxWidth: 320,
          lineHeight: 1.6,
        }}
      >
        Create a PRD to define the problem, requirements, and architecture for this project.
      </p>
      <button
        onClick={() => void handleCreate()}
        disabled={isCreating}
        style={{
          marginTop: 4,
          height: 36,
          padding: '0 18px',
          borderRadius: 8,
          border: 'none',
          background: isCreating ? 'var(--surface-input)' : 'var(--amber-core)',
          color: isCreating ? 'var(--text-tertiary)' : 'var(--surface-base)',
          fontSize: 13,
          fontWeight: 600,
          fontFamily: 'var(--font-geist-sans)',
          cursor: isCreating ? 'not-allowed' : 'pointer',
          transition: 'all 150ms',
        }}
      >
        {isCreating ? 'Creating...' : 'Generate PRD \u2192'}
      </button>
    </motion.div>
  );
}

// ── Relative time helper ──────────────────────────────────────────

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

// ── SWR fetcher ───────────────────────────────────────────────────

async function fetchPRD(url: string): Promise<PRD | null> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('keystone_token') : null;
  const res = await fetch(url, {
    credentials: 'include',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json() as Promise<PRD>;
}

// ── Main component ────────────────────────────────────────────────

interface PRDEditorProps {
  projectId: string;
  onPRDUpdate?: () => void;
  onRunStressTest?: () => void;
}

export function PRDEditor({ projectId, onPRDUpdate, onRunStressTest }: PRDEditorProps) {
  const shouldReduce = useReducedMotion();
  const [showDiff, setShowDiff] = useState(false);

  const swrKey = `${BACKEND_URL}/api/v1/projects/${projectId}/prd`;
  const { data: prd, error, isLoading, mutate } = useSWR<PRD | null>(swrKey, fetchPRD);

  const handleSaveSection = useCallback(
    async (sectionKey: keyof PRDContent, newValue: unknown) => {
      if (!prd) return;

      const updatedContent: PRDContent = {
        ...prd.content,
        [sectionKey]: newValue,
      };

      // Optimistic update
      const optimistic: PRD = { ...prd, content: updatedContent };
      await mutate(optimistic, false);

      try {
        await apiRequest<PRD>(`/projects/${projectId}/prd`, {
          method: 'PUT',
          body: JSON.stringify({ content: updatedContent }),
        });
        onPRDUpdate?.();
      } catch (err) {
        console.error('[PRDEditor] Save failed:', err);
        // Revert
        await mutate();
      }

      await mutate();
    },
    [prd, projectId, mutate, onPRDUpdate]
  );

  const handleAnswerQuestion = useCallback(
    async (questionId: string, answer: string) => {
      if (!prd) return;

      const updatedQuestions: OpenQuestion[] = prd.open_questions.map((q) =>
        q.id === questionId ? { ...q, answered: true, answer } : q
      );

      const optimistic: PRD = { ...prd, open_questions: updatedQuestions };
      await mutate(optimistic, false);

      try {
        await apiRequest<PRD>(`/projects/${projectId}/prd`, {
          method: 'PUT',
          body: JSON.stringify({ open_questions: updatedQuestions }),
        });
        onPRDUpdate?.();
      } catch (err) {
        console.error('[PRDEditor] Answer failed:', err);
        await mutate();
      }

      await mutate();
    },
    [prd, projectId, mutate, onPRDUpdate]
  );

  function handleCopyPrompt() {
    if (!prd?.claude_code_prompt) return;
    void navigator.clipboard.writeText(prd.claude_code_prompt).then(() => {
      // In a real app, trigger a toast — for now just log
      console.log('[PRDEditor] Copied Claude Code prompt to clipboard');
    });
  }

  if (isLoading) return <PRDSkeleton />;
  if (error) {
    return (
      <div
        style={{
          padding: '20px 16px',
          background: 'var(--coral-glow)',
          borderRadius: 10,
          border: '1px solid var(--coral)',
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: 13,
            color: 'var(--coral)',
            fontFamily: 'var(--font-geist-sans)',
          }}
        >
          Failed to load PRD. Please try again.
        </p>
      </div>
    );
  }
  if (!prd) return <PRDEmpty projectId={projectId} />;

  const blockingQuestions = prd.open_questions.filter((q) => q.blocking && !q.answered);
  const nonBlockingQuestions = prd.open_questions.filter((q) => !q.blocking || q.answered);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* PRD Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 10,
          paddingBottom: 12,
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        {/* Version badge */}
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--text-secondary)',
            fontFamily: 'var(--font-geist-mono)',
            background: 'var(--surface-input)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 4,
            padding: '2px 7px',
          }}
        >
          v{prd.version}
        </span>

        <StatusBadge status={prd.status} />

        <span
          style={{
            fontSize: 12,
            color: 'var(--text-tertiary)',
            fontFamily: 'var(--font-geist-sans)',
          }}
        >
          Updated {relativeTime(prd.updated_at)}
        </span>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Show diff button (only if version > 1 and diff exists) */}
        {prd.version > 1 && prd.diff_from_previous && (
          <button
            onClick={() => setShowDiff((v) => !v)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              fontSize: 12,
              fontFamily: 'var(--font-geist-sans)',
              cursor: 'pointer',
              fontWeight: 500,
              padding: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--text-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-secondary)';
            }}
          >
            {showDiff ? 'Hide diff' : `Show diff from v${prd.version - 1}`} &#8599;
          </button>
        )}

        {/* Copy Claude Code prompt */}
        {prd.claude_code_prompt && (
          <button
            onClick={handleCopyPrompt}
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
              padding: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.textDecoration = 'underline';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.textDecoration = 'none';
            }}
          >
            Copy Claude Code prompt &#8599;
          </button>
        )}
      </div>

      {/* Version diff panel */}
      <AnimatePresence>
        {showDiff && prd.diff_from_previous && (
          <motion.div
            key="diff"
            initial={shouldReduce ? undefined : { opacity: 0, y: -8 }}
            animate={shouldReduce ? undefined : { opacity: 1, y: 0 }}
            exit={shouldReduce ? undefined : { opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <VersionDiff
              diff={prd.diff_from_previous}
              previousVersion={prd.version - 1}
              currentVersion={prd.version}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stress test panel */}
      <StressTestPanel
        data={prd.stress_test_results}
        onRunStressTest={onRunStressTest}
      />

      {/* PRD sections */}
      <motion.div
        variants={shouldReduce ? undefined : listContainerVariants}
        initial={shouldReduce ? undefined : 'initial'}
        animate={shouldReduce ? undefined : 'animate'}
        style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
      >
        {PRD_SECTIONS.map(({ key, label }) => (
          <motion.div
            key={key}
            variants={shouldReduce ? undefined : listItemVariants}
          >
            <PRDSection
              section={key}
              label={label}
              value={prd.content[key]}
              onSave={(val) => handleSaveSection(key, val)}
            />
          </motion.div>
        ))}
      </motion.div>

      {/* Open Questions */}
      {prd.open_questions.length > 0 && (
        <div
          style={{
            background: 'var(--surface-elevated)',
            borderRadius: 10,
            border: '1px solid var(--border-subtle)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid var(--border-subtle)',
            }}
          >
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-geist-sans)',
              }}
            >
              Open Questions
            </span>
          </div>

          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Blocking first */}
            {blockingQuestions.length > 0 && (
              <div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: 'var(--coral)',
                    fontFamily: 'var(--font-geist-sans)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.07em',
                    marginBottom: 8,
                  }}
                >
                  &#x26D4; Blocking ({blockingQuestions.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {blockingQuestions.map((q) => (
                    <OpenQuestionBlock key={q.id} question={q} onAnswer={handleAnswerQuestion} />
                  ))}
                </div>
              </div>
            )}

            {/* Non-blocking */}
            {nonBlockingQuestions.length > 0 && (
              <div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: 'var(--text-tertiary)',
                    fontFamily: 'var(--font-geist-sans)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.07em',
                    marginBottom: 8,
                  }}
                >
                  &#x25CB; Non-Blocking ({nonBlockingQuestions.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {nonBlockingQuestions.map((q) => (
                    <OpenQuestionBlock key={q.id} question={q} onAnswer={handleAnswerQuestion} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
