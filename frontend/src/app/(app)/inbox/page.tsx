'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useCallback, useState } from 'react';
import useSWR, { mutate as globalMutate } from 'swr';
import {
  pageVariants,
  listContainerVariants,
  listItemVariants,
  mobileListItemVariants,
  tapVariants,
} from '@/lib/motion';
import { ApprovalRequest } from '@/components/approvals/ApprovalRequest';
import { MobileApprovalCard } from '@/components/approvals/MobileApprovalCard';
import { useNotificationStore } from '@/stores/notifications.store';
import { useAgentStore } from '@/stores/agent.store';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import type { Approval } from '@/types/approval.types';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8000';

// ── Types ────────────────────────────────────────────────────────────────────

interface Conflict {
  id: string;
  type: string;
  severity: 'blocking' | 'warning' | 'info';
  project_a_title: string;
  project_b_title: string;
  specific_conflict: string;
  resolution_options?: string[];
}

// ── Fetcher ──────────────────────────────────────────────────────────────────

async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json() as Promise<T>;
}

async function decideApproval(id: string, decision: 'approve' | 'reject' | 'changes') {
  await fetch(`${BACKEND_URL}/api/v1/approvals/${id}/decide`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ decision }),
  });
  await globalMutate(`${BACKEND_URL}/api/v1/approvals`);
}

// ── Conflict card (inline) ────────────────────────────────────────────────────

function ConflictCard({ conflict }: { conflict: Conflict }) {
  const severityColor: Record<Conflict['severity'], string> = {
    blocking: 'var(--coral)',
    warning:  'var(--amber-core)',
    info:     'var(--blue)',
  };
  const severityBorder: Record<Conflict['severity'], string> = {
    blocking: 'var(--border-coral)',
    warning:  'var(--border-amber)',
    info:     'var(--border-blue)',
  };
  const severityBg: Record<Conflict['severity'], string> = {
    blocking: 'var(--coral-glow)',
    warning:  'var(--amber-glow)',
    info:     'var(--blue-glow)',
  };

  return (
    <motion.div
      layout
      variants={listItemVariants}
      style={{
        background: 'var(--surface-elevated)',
        borderRadius: 12,
        padding: 20,
        border: '1px solid var(--border-subtle)',
      }}
    >
      {/* Header: type + severity badge */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 10,
        }}
      >
        <span
          style={{
            fontSize: 16,
            color: 'var(--coral)',
          }}
        >
          &#9888;
        </span>
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-geist-sans)',
            flex: 1,
          }}
        >
          {conflict.type}
        </span>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '2px 8px',
            borderRadius: 9999,
            background: severityBg[conflict.severity],
            border: `1px solid ${severityBorder[conflict.severity]}`,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase' as const,
            color: severityColor[conflict.severity],
            fontFamily: 'var(--font-geist-sans)',
          }}
        >
          {conflict.severity}
        </span>
      </div>

      {/* Project names */}
      <div
        style={{
          fontSize: 13,
          color: 'var(--text-secondary)',
          fontFamily: 'var(--font-geist-sans)',
          marginBottom: 8,
        }}
      >
        <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
          {conflict.project_a_title}
        </span>
        <span style={{ margin: '0 6px', color: 'var(--text-tertiary)' }}>&#8596;</span>
        <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
          {conflict.project_b_title}
        </span>
      </div>

      {/* Conflict description */}
      <p
        style={{
          fontSize: 13,
          color: 'var(--text-secondary)',
          fontFamily: 'var(--font-geist-sans)',
          lineHeight: 1.6,
          margin: '0 0 14px',
        }}
      >
        {conflict.specific_conflict}
      </p>

      {/* Resolution options */}
      {conflict.resolution_options && conflict.resolution_options.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          {conflict.resolution_options.map((opt, i) => (
            <div
              key={i}
              style={{
                fontSize: 12,
                color: 'var(--text-secondary)',
                fontFamily: 'var(--font-geist-sans)',
                lineHeight: 1.6,
              }}
            >
              ({i + 1}) {opt}
            </div>
          ))}
        </div>
      )}

      {/* Resolve button */}
      <a
        href={`/inbox?conflict=${conflict.id}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--amber-core)',
          fontFamily: 'var(--font-geist-sans)',
          textDecoration: 'none',
        }}
      >
        Resolve &#8594;
      </a>
    </motion.div>
  );
}

// ── Checkpoint row (inline) ──────────────────────────────────────────────────

function CheckpointRow({ question, runId }: { question: string; runId: string }) {
  return (
    <motion.div
      layout
      variants={listItemVariants}
      style={{
        background: 'var(--amber-glow)',
        borderRadius: 12,
        padding: 16,
        border: '1px solid var(--border-amber)',
      }}
    >
      <div
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--amber-core)',
          fontFamily: 'var(--font-geist-sans)',
          marginBottom: 4,
        }}
      >
        Agent checkpoint
      </div>
      <div
        style={{
          fontSize: 13,
          color: 'var(--text-secondary)',
          fontFamily: 'var(--font-geist-sans)',
          lineHeight: 1.6,
          marginBottom: 10,
        }}
      >
        {question}
      </div>
      <a
        href={`/projects?agent=${runId}`}
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--amber-core)',
          fontFamily: 'var(--font-geist-sans)',
          textDecoration: 'none',
        }}
      >
        Respond &#8594;
      </a>
    </motion.div>
  );
}

// ── Section header ────────────────────────────────────────────────────────────

function SectionHeader({ label, count }: { label: string; count: number }) {
  return (
    <h2
      style={{
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.08em',
        textTransform: 'uppercase' as const,
        color: 'var(--text-tertiary)',
        fontFamily: 'var(--font-geist-sans)',
        margin: '0 0 10px',
      }}
    >
      {label} ({count})
    </h2>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div
      style={{
        padding: 20,
        background: 'var(--surface-elevated)',
        borderRadius: 10,
        border: '1px solid var(--border-subtle)',
        textAlign: 'center',
      }}
    >
      <p
        style={{
          fontSize: 13,
          color: 'var(--text-tertiary)',
          fontFamily: 'var(--font-geist-sans)',
          margin: 0,
        }}
      >
        {text}
      </p>
    </div>
  );
}

// ── Mobile Conflict Card ──────────────────────────────────────────────────────

function MobileConflictCard({ conflict }: { conflict: Conflict }) {
  const severityColor: Record<Conflict['severity'], string> = {
    blocking: 'var(--coral)',
    warning:  'var(--amber-core)',
    info:     'var(--blue)',
  };
  const severityBg: Record<Conflict['severity'], string> = {
    blocking: 'var(--coral-glow)',
    warning:  'var(--amber-glow)',
    info:     'var(--blue-glow)',
  };
  const severityBorder: Record<Conflict['severity'], string> = {
    blocking: 'var(--border-coral)',
    warning:  'var(--border-amber)',
    info:     'var(--border-blue)',
  };

  return (
    <motion.div
      layout
      variants={mobileListItemVariants}
      style={{
        background: 'var(--surface-elevated)',
        borderRadius: 12,
        padding: 14,
        border: '1px solid var(--border-subtle)',
        borderLeft: `3px solid ${severityColor[conflict.severity]}`,
        marginBottom: 10,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <span style={{ fontSize: 13, color: 'var(--coral)' }}>&#9888;</span>
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-geist-sans)',
            flex: 1,
          }}
        >
          {conflict.type}
        </span>
        <span
          style={{
            padding: '2px 6px',
            borderRadius: 9999,
            background: severityBg[conflict.severity],
            border: `1px solid ${severityBorder[conflict.severity]}`,
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase' as const,
            color: severityColor[conflict.severity],
            fontFamily: 'var(--font-geist-sans)',
          }}
        >
          {conflict.severity}
        </span>
      </div>

      {/* Projects */}
      <div
        style={{
          fontSize: 12,
          color: 'var(--text-secondary)',
          fontFamily: 'var(--font-geist-sans)',
          marginBottom: 6,
        }}
      >
        <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
          {conflict.project_a_title}
        </span>
        <span style={{ margin: '0 5px', color: 'var(--text-tertiary)' }}>&#8596;</span>
        <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
          {conflict.project_b_title}
        </span>
      </div>

      {/* Description — compact */}
      <p
        style={{
          fontSize: 12,
          color: 'var(--text-secondary)',
          fontFamily: 'var(--font-geist-sans)',
          lineHeight: 1.55,
          margin: '0 0 10px',
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {conflict.specific_conflict}
      </p>

      {/* Resolve link */}
      <motion.a
        variants={tapVariants}
        whileTap="tap"
        href={`/inbox?conflict=${conflict.id}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          minHeight: 44,
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--amber-core)',
          fontFamily: 'var(--font-geist-sans)',
          textDecoration: 'none',
        }}
      >
        Resolve &#8594;
      </motion.a>
    </motion.div>
  );
}

// ── Mobile Checkpoint Row ─────────────────────────────────────────────────────

function MobileCheckpointRow({ question, runId }: { question: string; runId: string }) {
  const [response, setResponse] = useState('');

  return (
    <motion.div
      layout
      variants={mobileListItemVariants}
      style={{
        background: 'var(--amber-glow)',
        borderRadius: 12,
        padding: 14,
        border: '1px solid var(--border-amber)',
        marginBottom: 10,
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: 'var(--amber-core)',
          fontFamily: 'var(--font-geist-sans)',
          marginBottom: 4,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
        }}
      >
        Agent checkpoint
      </div>
      <div
        style={{
          fontSize: 13,
          color: 'var(--text-secondary)',
          fontFamily: 'var(--font-geist-sans)',
          lineHeight: 1.55,
          marginBottom: 10,
        }}
      >
        {question}
      </div>

      {/* Inline response input */}
      <textarea
        value={response}
        onChange={(e) => setResponse(e.target.value)}
        placeholder="Type your response..."
        rows={3}
        style={{
          width: '100%',
          padding: '10px 12px',
          background: 'var(--surface-input)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 8,
          fontSize: 13,
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-geist-sans)',
          resize: 'none',
          boxSizing: 'border-box',
          marginBottom: 8,
          outline: 'none',
        }}
      />
      <motion.a
        variants={tapVariants}
        whileTap="tap"
        href={`/projects?agent=${runId}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          minHeight: 44,
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--amber-core)',
          fontFamily: 'var(--font-geist-sans)',
          textDecoration: 'none',
        }}
      >
        Respond &#8594;
      </motion.a>
    </motion.div>
  );
}

// ── Mobile Section Header ─────────────────────────────────────────────────────

function MobileSectionHeader({ label, count }: { label: string; count: number }) {
  return (
    <h2
      style={{
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.08em',
        textTransform: 'uppercase' as const,
        color: 'var(--text-tertiary)',
        fontFamily: 'var(--font-geist-sans)',
        margin: '0 0 10px',
      }}
    >
      {label} ({count})
    </h2>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function InboxPage() {
  const { removeApproval, pendingCount, markRead, notifications, clearAll } =
    useNotificationStore();

  const runs = useAgentStore((s) => s.runs);
  const isMobile = useMediaQuery('(max-width: 639px)');

  // Fetch pending approvals from API
  const { data: approvalsData } = useSWR<Approval[]>(
    `${BACKEND_URL}/api/v1/approvals`,
    fetcher,
    { refreshInterval: 30_000 }
  );

  // Fetch conflicts
  const { data: conflictsData } = useSWR<Conflict[]>(
    `${BACKEND_URL}/api/v1/conflicts`,
    fetcher,
    { refreshInterval: 30_000 }
  );

  // Approvals: merge store (SSE-pushed) with API data, deduplicate
  const storeApprovals: Approval[] = notifications
    .filter((n) => n.type === 'approval' && n.approval)
    .map((n) => n.approval as Approval);

  const apiApprovals = (approvalsData ?? []).filter(
    (a) => a.status === 'pending'
  );

  // Merge: store items take priority (they're more recent), API fills the rest
  const storeIds = new Set(storeApprovals.map((a) => a.id));
  const mergedApprovals: Approval[] = [
    ...storeApprovals,
    ...apiApprovals.filter((a) => !storeIds.has(a.id)),
  ];

  const conflicts = conflictsData ?? [];

  // Agent checkpoints waiting
  const checkpointRuns = Object.values(runs).filter(
    (r) => r.status === 'awaiting_human' && r.checkpoint_question
  );

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleApprove = useCallback(
    async (id: string) => {
      removeApproval(id);
      await decideApproval(id, 'approve');
    },
    [removeApproval]
  );

  const handleRequestChanges = useCallback(
    async (id: string) => {
      removeApproval(id);
      await decideApproval(id, 'changes');
    },
    [removeApproval]
  );

  const handleReject = useCallback(
    async (id: string) => {
      removeApproval(id);
      await decideApproval(id, 'reject');
    },
    [removeApproval]
  );

  const handleMarkAllRead = useCallback(() => {
    notifications.forEach((n) => markRead(n.id));
    clearAll();
  }, [notifications, markRead, clearAll]);

  const totalPending =
    mergedApprovals.length + conflicts.length + checkpointRuns.length;

  // ── Mobile layout ──────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <motion.div
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        style={{ padding: '0 0 24px' }}
      >
        {/* ── Section 1: Approvals (mobile) ───────────────────────────────── */}
        <section style={{ marginBottom: 24 }}>
          <MobileSectionHeader label="Approvals" count={mergedApprovals.length} />
          {mergedApprovals.length === 0 ? (
            <EmptyState text="No pending approvals &#10003;" />
          ) : (
            <motion.div
              variants={listContainerVariants}
              initial="initial"
              animate="animate"
            >
              <AnimatePresence mode="popLayout">
                {mergedApprovals.map((approval) => (
                  <motion.div
                    key={approval.id}
                    variants={mobileListItemVariants}
                    layout
                    exit={{ opacity: 0, y: -8, transition: { duration: 0.15 } }}
                  >
                    <MobileApprovalCard
                      approval={approval}
                      onApprove={handleApprove}
                      onRequestChanges={handleRequestChanges}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </section>

        {/* ── Section 2: Conflicts (mobile) ───────────────────────────────── */}
        <section style={{ marginBottom: 24 }}>
          <MobileSectionHeader label="Conflicts" count={conflicts.length} />
          {conflicts.length === 0 ? (
            <EmptyState text="No conflicts detected &#10003;" />
          ) : (
            <motion.div
              variants={listContainerVariants}
              initial="initial"
              animate="animate"
            >
              <AnimatePresence mode="popLayout">
                {conflicts.map((c) => (
                  <MobileConflictCard key={c.id} conflict={c} />
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </section>

        {/* ── Section 3: Agent Checkpoints (mobile) ───────────────────────── */}
        <section>
          <MobileSectionHeader label="Checkpoints" count={checkpointRuns.length} />
          {checkpointRuns.length === 0 ? (
            <div
              style={{
                padding: '14px 16px',
                background: 'var(--surface-elevated)',
                borderRadius: 10,
                border: '1px solid var(--border-subtle)',
                textAlign: 'center',
              }}
            >
              <p
                style={{
                  fontSize: 12,
                  color: 'var(--text-tertiary)',
                  fontFamily: 'var(--font-geist-sans)',
                  margin: 0,
                }}
              >
                No agent checkpoints pending &#10003;
              </p>
            </div>
          ) : (
            <motion.div
              variants={listContainerVariants}
              initial="initial"
              animate="animate"
            >
              {checkpointRuns.map((run) => (
                <MobileCheckpointRow
                  key={run.id}
                  runId={run.id}
                  question={run.checkpoint_question ?? ''}
                />
              ))}
            </motion.div>
          )}
        </section>
      </motion.div>
    );
  }

  // ── Desktop / web layout ────────────────────────────────────────────────────
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      {/* Page header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 28,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-display)',
              margin: 0,
            }}
          >
            Inbox
          </h1>
          {totalPending > 0 && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: 22,
                height: 22,
                borderRadius: 11,
                background: 'var(--coral)',
                fontSize: 11,
                fontWeight: 700,
                color: '#fff',
                fontFamily: 'var(--font-geist-sans)',
                padding: '0 5px',
              }}
            >
              {totalPending > 99 ? '99+' : totalPending}
            </span>
          )}
        </div>
        <button
          onClick={handleMarkAllRead}
          style={{
            fontSize: 13,
            color: 'var(--text-tertiary)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'var(--font-geist-sans)',
          }}
        >
          Mark all read
        </button>
      </div>

      {/* ── Section 1: Approvals ──────────────────────────────────────────── */}
      <section style={{ marginBottom: 32 }}>
        <SectionHeader label="Approvals Waiting for You" count={mergedApprovals.length} />
        {mergedApprovals.length === 0 ? (
          <EmptyState text="No pending approvals &#10003;" />
        ) : (
          <motion.div
            variants={listContainerVariants}
            initial="initial"
            animate="animate"
          >
            <AnimatePresence mode="popLayout">
              {mergedApprovals.map((approval) => (
                <ApprovalRequest
                  key={approval.id}
                  approval={approval}
                  onApprove={handleApprove}
                  onRequestChanges={handleRequestChanges}
                  onReject={handleReject}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </section>

      {/* ── Section 2: Conflicts ─────────────────────────────────────────── */}
      <section style={{ marginBottom: 32 }}>
        <SectionHeader label="Conflicts Needing Decision" count={conflicts.length} />
        {conflicts.length === 0 ? (
          <EmptyState text="No conflicts detected &#10003;" />
        ) : (
          <motion.div
            variants={listContainerVariants}
            initial="initial"
            animate="animate"
            style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
          >
            <AnimatePresence mode="popLayout">
              {conflicts.map((c) => (
                <ConflictCard key={c.id} conflict={c} />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </section>

      {/* ── Section 3: Agent Checkpoints ─────────────────────────────────── */}
      <section>
        <SectionHeader
          label="Agent Checkpoints Waiting"
          count={checkpointRuns.length}
        />
        {checkpointRuns.length === 0 ? (
          <EmptyState text="No agent checkpoints pending &#10003;" />
        ) : (
          <motion.div
            variants={listContainerVariants}
            initial="initial"
            animate="animate"
            style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
          >
            {checkpointRuns.map((run) => (
              <CheckpointRow
                key={run.id}
                runId={run.id}
                question={run.checkpoint_question ?? ''}
              />
            ))}
          </motion.div>
        )}
      </section>
    </motion.div>
  );
}
