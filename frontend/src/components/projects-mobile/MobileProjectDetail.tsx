'use client';

import { useState, useEffect, useCallback } from 'react';
import useSWR from 'swr';
import { motion, AnimatePresence } from 'framer-motion';
import { accordionVariants, agentDotVariants, tapVariants } from '@/lib/motion';
import { STAGE_COLORS, STAGE_ORDER, STAGE_LABELS, type Stage } from '@/lib/stage-colors';
import type { Project } from '@/lib/api';
import { PRDAccordion, type PRD } from '@/components/prd/PRDAccordion';
import { useAgentStore } from '@/stores/agent.store';
import { AgentThinking } from '@/components/agents/AgentThinking';
import { apiRequest } from '@/lib/api';

// ── SWR fetcher ──────────────────────────────────────────────────

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8000';

async function prdFetcher(url: string): Promise<PRD | null> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('keystone_token') : null;
  const res = await fetch(url, {
    credentials: 'include',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`PRD fetch error ${res.status}`);
  return res.json() as Promise<PRD>;
}

// ── Props ────────────────────────────────────────────────────────

interface MobileProjectDetailProps {
  project: Project;
}

// ── Component ────────────────────────────────────────────────────

function MobileGeneratePRDButton({ projectId, sparkContent }: { projectId: string; sparkContent: string | null }) {
  const [running, setRunning] = useState(false);

  const handleTap = useCallback(async () => {
    if (running) return;
    setRunning(true);
    try {
      await apiRequest('/agents/run', {
        method: 'POST',
        body: JSON.stringify({
          agent_type: 'prd_drafter',
          project_id: projectId,
          input_data: { raw_input: sparkContent ?? '' },
        }),
      });
    } catch (err) {
      console.error('[MobileGeneratePRD] failed:', err);
    } finally {
      setRunning(false);
    }
  }, [running, projectId, sparkContent]);

  return (
    <motion.button
      variants={tapVariants}
      whileTap="tap"
      style={{
        height: 44,
        width: '100%',
        borderRadius: 8,
        border: 'none',
        background: running ? 'var(--surface-input)' : 'var(--amber-core)',
        color: running ? 'var(--text-tertiary)' : 'var(--text-inverse)',
        fontSize: 14,
        fontWeight: 600,
        fontFamily: 'var(--font-geist-sans)',
        cursor: running ? 'not-allowed' : 'pointer',
        WebkitTapHighlightColor: 'transparent',
        boxShadow: running ? 'none' : '0 4px 16px rgba(245,168,0,0.20)',
      }}
      onClick={() => void handleTap()}
    >
      {running ? 'Starting...' : 'Generate Full PRD'}
    </motion.button>
  );
}

export function MobileProjectDetail({ project }: MobileProjectDetailProps) {
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['prd']));
  const [agentStatusVisible, setAgentStatusVisible] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [logNote, setLogNote] = useState('');
  const [showLogInput, setShowLogInput] = useState(false);
  const [submittingLog, setSubmittingLog] = useState(false);
  const currentStageIndex = STAGE_ORDER.indexOf(project.stage as Stage);
  const stageColor = STAGE_COLORS[project.stage as Stage];
  const activeRun = useAgentStore((s) => s.activeRunForProject(project.id));

  // Show agent status bar when agent is running; auto-hide 3s after completion
  useEffect(() => {
    if (activeRun && (activeRun.status === 'running' || activeRun.status === 'awaiting_human')) {
      setAgentStatusVisible(true);
    } else if (activeRun?.status === 'complete') {
      setAgentStatusVisible(true);
      const t = setTimeout(() => setAgentStatusVisible(false), 3000);
      return () => clearTimeout(t);
    } else {
      setAgentStatusVisible(false);
    }
  }, [activeRun?.status]);

  // SWR fetch for PRD data — null when project has no PRD yet
  const { data: prd, isLoading: prdLoading } = useSWR<PRD | null>(
    `${BACKEND_URL}/api/v1/projects/${project.id}/prd`,
    prdFetcher,
    {
      revalidateOnFocus: false,
      // Treat 404 (null response) as valid — no retry needed
      shouldRetryOnError: false,
    }
  );

  const toggleSection = (id: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div style={{ paddingBottom: 24 }}>

      {/* ── Stage progress dots ──────────────────────────────── */}
      <div
        style={{
          padding: '12px 0',
          borderBottom: '1px solid var(--border-subtle)',
          marginBottom: 12,
        }}
      >
        <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
          {STAGE_ORDER.map((stage, index) => {
            const isCompleted = index < currentStageIndex;
            const isCurrent   = index === currentStageIndex;
            return (
              <div
                key={stage}
                title={STAGE_LABELS[stage]}
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: isCompleted
                    ? 'var(--teal)'
                    : isCurrent
                    ? 'var(--amber-core)'
                    : 'transparent',
                  border: `2px solid ${
                    isCompleted
                      ? 'var(--teal)'
                      : isCurrent
                      ? 'var(--amber-core)'
                      : 'var(--border-default)'
                  }`,
                  flexShrink: 0,
                }}
              />
            );
          })}
        </div>
        <div
          style={{
            fontSize: 12,
            color: 'var(--text-secondary)',
            fontFamily: 'var(--font-geist-sans)',
          }}
        >
          <span style={{ color: stageColor.text }}>{STAGE_LABELS[project.stage as Stage]}</span>
          {' · '}Stage {currentStageIndex + 1} of {STAGE_ORDER.length}
        </div>
      </div>

      {/* ── Agent status bar ────────────────────────────────── */}
      <AnimatePresence>
        {agentStatusVisible && activeRun && (
          <motion.div
            key="agent-status"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              background: activeRun.status === 'complete' ? 'var(--teal-glow)' : 'var(--amber-glow)',
              border: `1px solid ${activeRun.status === 'complete' ? 'var(--teal)' : 'var(--border-amber)'}`,
              borderRadius: 8,
              padding: '8px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 12,
            }}
          >
            <span style={{ fontSize: 12 }}>⚡</span>
            <span
              style={{
                flex: 1,
                fontSize: 12,
                fontFamily: 'var(--font-geist-sans)',
                fontWeight: 600,
                color: activeRun.status === 'complete' ? 'var(--teal)' : 'var(--amber-core)',
              }}
            >
              {activeRun.agent_type.replace('_', ' ')}
              {activeRun.current_node ? ` · ${activeRun.current_node}` : ''}
              {activeRun.status === 'complete' ? ' · Done ✓' : ''}
            </span>
            {activeRun.status === 'running' && <AgentThinking />}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Quick actions ────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
        {currentStageIndex < STAGE_ORDER.length - 1 && (
        <motion.button
          variants={tapVariants}
          whileTap="tap"
          onClick={() => {
            if (advancing) return;
            const nextStage = STAGE_ORDER[currentStageIndex + 1];
            if (!nextStage) return;
            setAdvancing(true);
            void apiRequest(`/projects/${project.id}/advance`, {
              method: 'POST',
              body: JSON.stringify({ target_stage: nextStage }),
            })
              .catch((e) => console.error('[MobileDetail] advance failed:', e))
              .finally(() => setAdvancing(false));
          }}
          style={{
            height: 44,
            borderRadius: 8,
            border: 'none',
            background: advancing ? 'var(--surface-input)' : 'var(--amber-core)',
            color: advancing ? 'var(--text-tertiary)' : 'var(--text-inverse)',
            fontSize: 14,
            fontWeight: 600,
            fontFamily: 'var(--font-geist-sans)',
            cursor: advancing ? 'not-allowed' : 'pointer',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          {advancing ? 'Advancing...' : 'Advance Stage →'}
        </motion.button>
        )}

        {showLogInput ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <textarea
              value={logNote}
              onChange={(e) => setLogNote(e.target.value)}
              placeholder="What did you build or ship?"
              rows={3}
              style={{
                width: '100%',
                borderRadius: 8,
                border: '1px solid var(--border-default)',
                background: 'var(--surface-input)',
                color: 'var(--text-primary)',
                fontSize: 13,
                fontFamily: 'var(--font-geist-sans)',
                padding: '10px 12px',
                resize: 'none',
                boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', gap: 6 }}>
              <motion.button
                variants={tapVariants}
                whileTap="tap"
                onClick={() => {
                  if (submittingLog || !logNote.trim()) return;
                  setSubmittingLog(true);
                  void apiRequest(`/projects/${project.id}/build-log`, {
                    method: 'POST',
                    body: JSON.stringify({ raw_build_notes: logNote.trim() }),
                  })
                    .then(() => { setLogNote(''); setShowLogInput(false); })
                    .catch((e) => console.error('[MobileDetail] log failed:', e))
                    .finally(() => setSubmittingLog(false));
                }}
                style={{
                  flex: 1, height: 40, borderRadius: 8, border: 'none',
                  background: 'var(--teal)', color: 'var(--text-inverse)',
                  fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-geist-sans)',
                  cursor: submittingLog ? 'not-allowed' : 'pointer',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                {submittingLog ? 'Saving...' : 'Save'}
              </motion.button>
              <motion.button
                variants={tapVariants}
                whileTap="tap"
                onClick={() => { setShowLogInput(false); setLogNote(''); }}
                style={{
                  height: 40, padding: '0 14px', borderRadius: 8,
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--surface-input)',
                  color: 'var(--text-secondary)',
                  fontSize: 13, fontFamily: 'var(--font-geist-sans)',
                  cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
                }}
              >
                Cancel
              </motion.button>
            </div>
          </div>
        ) : (
          <motion.button
            variants={tapVariants}
            whileTap="tap"
            onClick={() => setShowLogInput(true)}
            style={{
              height: 44,
              borderRadius: 8,
              border: '1px solid var(--border-subtle)',
              background: 'var(--surface-input)',
              color: 'var(--text-secondary)',
              fontSize: 14,
              fontFamily: 'var(--font-geist-sans)',
              cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            Log Update
          </motion.button>
        )}
      </div>

      {/* ── PRD Accordion section ────────────────────────────── */}
      <div
        style={{
          borderRadius: 10,
          border: '1px solid var(--border-subtle)',
          background: 'var(--surface-elevated)',
          overflow: 'hidden',
          marginBottom: 4,
        }}
      >
        {/* PRD section header */}
        <motion.button
          variants={tapVariants}
          whileTap="tap"
          onClick={() => toggleSection('prd')}
          style={{
            width: '100%',
            minHeight: 48,
            paddingLeft: 16,
            paddingRight: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            gap: 8,
            WebkitTapHighlightColor: 'transparent',
          }}
          aria-expanded={openSections.has('prd')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <motion.span
              animate={{ rotate: openSections.has('prd') ? 90 : 0 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              style={{ fontSize: 10, color: 'var(--text-tertiary)', lineHeight: 1 }}
            >
              ▶
            </motion.span>
            <span
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-geist-sans)',
              }}
            >
              PRD
            </span>
            {prd && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'var(--text-tertiary)',
                  fontFamily: 'var(--font-geist-mono)',
                  background: 'var(--surface-input)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 5,
                  padding: '1px 5px',
                }}
              >
                v{prd.version}
              </span>
            )}
          </div>

          {prdLoading && (
            <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  variants={agentDotVariants}
                  animate="animate"
                  style={{
                    width: 4,
                    height: 4,
                    borderRadius: '50%',
                    background: 'var(--amber-core)',
                    display: 'block',
                    transition: `animation-delay ${i * 0.15}s`,
                  }}
                  custom={i}
                  transition={{ delay: i * 0.15 }}
                />
              ))}
            </div>
          )}
        </motion.button>

        {/* PRD expandable content */}
        {openSections.has('prd') && (
          <motion.div
            key="prd-content"
            variants={accordionVariants}
            initial="collapsed"
            animate="expanded"
            exit="collapsed"
            style={{ overflow: 'hidden' }}
          >
            <div
              style={{
                borderTop: '1px solid var(--border-subtle)',
                padding: '12px 12px',
              }}
            >
              {prdLoading ? (
                // Skeleton placeholder while loading
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[80, 60, 70].map((w, i) => (
                    <div
                      key={i}
                      style={{
                        height: 44,
                        borderRadius: 8,
                        background: 'var(--surface-input)',
                        width: `${w}%`,
                        opacity: 0.6,
                      }}
                    />
                  ))}
                </div>
              ) : prd ? (
                <PRDAccordion prd={prd} projectId={project.id} />
              ) : (
                // No PRD yet — show Generate CTA
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 12,
                    paddingTop: 8,
                    paddingBottom: 8,
                  }}
                >
                  <p
                    style={{
                      fontSize: 13,
                      color: 'var(--text-tertiary)',
                      fontFamily: 'var(--font-geist-sans)',
                      textAlign: 'center',
                      margin: 0,
                      lineHeight: 1.5,
                    }}
                  >
                    No PRD exists for this project yet.
                    <br />
                    Generate one to unlock full planning.
                  </p>

                  <MobileGeneratePRDButton projectId={project.id} sparkContent={project.spark_content} />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>

    </div>
  );
}
