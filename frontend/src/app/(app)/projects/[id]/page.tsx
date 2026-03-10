'use client';

import { use, useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import useSWR from 'swr';
import { pageVariants } from '@/lib/motion';
import { STAGE_COLORS, STAGE_LABELS, type Stage } from '@/lib/stage-colors';
import { StageProgressBar } from '@/components/projects/StageProgressBar';
import { AgentPanel } from '@/components/agents/AgentPanel';
import { PRDEditor } from '@/components/prd/PRDEditor';
import { useAgentStore } from '@/stores/agent.store';
import { ArrowLeft } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Project } from '@/lib/api';
import { apiRequest } from '@/lib/api';
import { mutate } from 'swr';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8000';

async function fetchProject(url: string): Promise<Project> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('keystone_token') : null;
  const res = await fetch(url, {
    credentials: 'include',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json() as Promise<Project>;
}

interface ProjectDetailPageProps {
  params: Promise<{ id: string }>;
}

// ── Build Log Tab ─────────────────────────────────────────────────────────────

const HEALTH_STYLES: Record<string, { color: string; label: string }> = {
  on_track:          { color: 'var(--teal)',      label: 'On track' },
  ahead_of_schedule: { color: 'var(--teal)',      label: 'Ahead' },
  scope_growing:     { color: 'var(--amber-core)', label: 'Scope growing' },
  blocked:           { color: 'var(--coral)',     label: 'Blocked' },
};

function BuildLogTab({ project, projectId, onLogUpdate }: { project: Project; projectId: string; onLogUpdate: () => void }) {
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submitNotes() {
    if (!notes.trim()) return;
    setSubmitting(true);
    try {
      await apiRequest(`/projects/${projectId}/build-log`, {
        method: 'POST',
        body: JSON.stringify({ raw_notes: notes.trim(), source: 'manual' }),
      });
      setNotes('');
      onLogUpdate();
    } catch (err) {
      console.error('[BuildLog] submit failed:', err);
    } finally {
      setSubmitting(false);
    }
  }

  const log = project.build_log ?? [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Log entry input */}
      <div style={{ background: 'var(--surface-elevated)', borderRadius: 10, border: '1px solid var(--border-subtle)', padding: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', fontFamily: 'var(--font-geist-sans)', marginBottom: 8 }}>
          Log a build update
        </div>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="What shipped? What's blocked? What changed?"
          rows={3}
          style={{
            width: '100%', boxSizing: 'border-box',
            background: 'var(--surface-input)', border: '1px solid var(--border-default)',
            borderRadius: 8, padding: '10px 12px',
            color: 'var(--text-primary)', fontSize: 13,
            fontFamily: 'var(--font-geist-sans)', outline: 'none', resize: 'vertical',
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
          <button
            onClick={() => void submitNotes()}
            disabled={!notes.trim() || submitting}
            style={{
              height: 32, padding: '0 16px', borderRadius: 8, border: 'none',
              background: notes.trim() && !submitting ? 'var(--amber-core)' : 'var(--surface-input)',
              color: notes.trim() && !submitting ? 'var(--surface-base)' : 'var(--text-tertiary)',
              fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-geist-sans)',
              cursor: notes.trim() && !submitting ? 'pointer' : 'not-allowed',
            }}
          >
            {submitting ? 'Logging...' : 'Log Update'}
          </button>
        </div>
      </div>

      {/* Log entries */}
      {log.length === 0 ? (
        <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13, fontFamily: 'var(--font-geist-sans)' }}>
          No build updates yet. Log the first update above.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[...log].reverse().map((entry, i) => {
            const health = entry.build_health ? HEALTH_STYLES[entry.build_health] : null;
            const ts = new Date(entry.timestamp);
            return (
              <div key={i} style={{ background: 'var(--surface-elevated)', borderRadius: 10, border: '1px solid var(--border-subtle)', padding: '12px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'var(--font-geist-mono)' }}>
                    {ts.toLocaleDateString()} {ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span style={{ fontSize: 10, color: 'var(--text-tertiary)', fontFamily: 'var(--font-geist-sans)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {entry.source}
                  </span>
                  {health && (
                    <span style={{ fontSize: 10, fontWeight: 600, color: health.color, fontFamily: 'var(--font-geist-sans)' }}>
                      · {health.label}
                    </span>
                  )}
                </div>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--text-primary)', fontFamily: 'var(--font-geist-sans)', lineHeight: 1.6 }}>
                  {entry.content}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Retro Tab ─────────────────────────────────────────────────────────────────

interface RetroData {
  id: string;
  project_id: string;
  built_vs_scoped: string;
  decisions_changed: string[];
  learnings: string[];
  what_would_change: string[];
  quality_signals: Record<string, unknown> | null;
  published: boolean;
}

async function fetchRetro(url: string): Promise<RetroData | null> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('keystone_token') : null;
  const res = await fetch(url, {
    credentials: 'include',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Retro fetch ${res.status}`);
  return res.json() as Promise<RetroData>;
}

function RetroTab({ project, projectId }: { project: Project; projectId: string }) {
  const retroUrl = `${BACKEND_URL}/api/v1/projects/${projectId}/retrospective`;
  const { data: retro, isLoading } = useSWR<RetroData | null>(retroUrl, fetchRetro);
  const [generating, setGenerating] = useState(false);

  async function generateRetro() {
    setGenerating(true);
    try {
      await apiRequest('/agents/run', {
        method: 'POST',
        body: JSON.stringify({ agent_type: 'retro_generator', project_id: projectId, input_data: {} }),
      });
    } catch (err) {
      console.error('[RetroTab] generate failed:', err);
    } finally {
      setGenerating(false);
    }
  }

  if (isLoading) {
    return <div style={{ padding: 24, color: 'var(--text-secondary)', fontFamily: 'var(--font-geist-sans)', fontSize: 13 }}>Loading...</div>;
  }

  if (!retro) {
    const canGenerate = project.stage === 'shipped' || project.stage === 'retrospective';
    return (
      <div style={{ padding: '40px 16px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 28 }}>◍</span>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-geist-sans)' }}>
          No retrospective yet
        </p>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', fontFamily: 'var(--font-geist-sans)', maxWidth: 300, lineHeight: 1.6 }}>
          {canGenerate ? 'Generate an AI retrospective from the build history and PRD.' : 'Retrospective becomes available after the project ships.'}
        </p>
        {canGenerate && (
          <button
            onClick={() => void generateRetro()}
            disabled={generating}
            style={{
              marginTop: 4, height: 36, padding: '0 18px', borderRadius: 8, border: 'none',
              background: generating ? 'var(--surface-input)' : 'var(--amber-core)',
              color: generating ? 'var(--text-tertiary)' : 'var(--surface-base)',
              fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-geist-sans)',
              cursor: generating ? 'not-allowed' : 'pointer',
            }}
          >
            {generating ? 'Generating...' : 'Generate Retrospective →'}
          </button>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {retro.built_vs_scoped && (
        <div style={{ background: 'var(--surface-elevated)', borderRadius: 10, border: '1px solid var(--border-subtle)', padding: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', fontFamily: 'var(--font-geist-sans)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
            Built vs Scoped
          </div>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-primary)', fontFamily: 'var(--font-geist-sans)', lineHeight: 1.7 }}>
            {retro.built_vs_scoped}
          </p>
        </div>
      )}
      {[
        { title: 'Learnings', items: retro.learnings, color: 'var(--teal)' },
        { title: 'What Changed', items: retro.decisions_changed, color: 'var(--amber-core)' },
        { title: 'Would Do Differently', items: retro.what_would_change, color: 'var(--violet)' },
      ].map(({ title, items, color }) =>
        items?.length > 0 ? (
          <div key={title} style={{ background: 'var(--surface-elevated)', borderRadius: 10, border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
            <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 3, height: 14, background: color, borderRadius: 999 }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-geist-sans)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {title}
              </span>
            </div>
            <ul style={{ margin: 0, padding: '12px 14px 12px 28px' }}>
              {items.map((item, i) => (
                <li key={i} style={{ fontSize: 13, color: 'var(--text-secondary)', fontFamily: 'var(--font-geist-sans)', lineHeight: 1.7, marginBottom: 4 }}>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ) : null
      )}
    </div>
  );
}

// ── Stage Actions ─────────────────────────────────────────────────────────────

const STAGE_ACTIONS: Record<string, Array<{ label: string; icon: string; action: string }>> = {
  spark:     [{ label: 'Generate Brief', icon: '⚡', action: 'trigger_brief_generator' }],
  brief:     [
    { label: 'Draft Full PRD', icon: '◎', action: 'trigger_prd_drafter' },
    { label: 'Advance to Draft PRD →', icon: '→', action: 'stage_advance' },
  ],
  draft_prd: [
    { label: 'Run Stress Test', icon: '⚡', action: 'trigger_stress_tester' },
    { label: 'Send for Review →', icon: '→', action: 'stage_advance' },
  ],
  review:    [
    { label: 'Approve ✓', icon: '✓', action: 'approve' },
    { label: 'Request Changes ◎', icon: '◎', action: 'request_changes' },
  ],
  approved:  [{ label: '⚡ Start Build + Get Kickoff Prompt', icon: '⬡', action: 'start_build' }],
  in_build:  [
    { label: 'Log Update', icon: '◎', action: 'log_update' },
    { label: 'Mark Shipped ✓', icon: '✓', action: 'stage_advance' },
  ],
  shipped:   [{ label: 'Generate Retrospective', icon: '◍', action: 'trigger_retro' }],
};

const TABS = ['prd', 'build', 'retro'] as const;
type Tab = typeof TABS[number];

export default function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const shouldReduce = useReducedMotion();
  const activeRun = useAgentStore((s) => s.activeRunForProject(id));
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [kickoffPrompt, setKickoffPrompt] = useState<string | null>(null);

  async function handleStageAction(action: string) {
    if (actionLoading) return;
    setActionLoading(action);
    try {
      if (action === 'trigger_brief_generator') {
        await apiRequest('/agents/run', {
          method: 'POST',
          body: JSON.stringify({ agent_type: 'brief_generator', project_id: id, input_data: { raw_input: project?.spark_content ?? '' } }),
        });
      } else if (action === 'trigger_prd_drafter') {
        await apiRequest('/agents/run', {
          method: 'POST',
          body: JSON.stringify({ agent_type: 'prd_drafter', project_id: id, input_data: { raw_input: project?.title ?? '' } }),
        });
      } else if (action === 'trigger_stress_tester') {
        await apiRequest('/agents/run', {
          method: 'POST',
          body: JSON.stringify({ agent_type: 'stress_tester', project_id: id, input_data: {} }),
        });
      } else if (action === 'trigger_retro') {
        await apiRequest('/agents/run', {
          method: 'POST',
          body: JSON.stringify({ agent_type: 'retro_generator', project_id: id, input_data: {} }),
        });
      } else if (action === 'stage_advance') {
        const nextStage = getNextStage(project?.stage ?? '');
        if (nextStage) {
          await apiRequest(`/projects/${id}/advance`, {
            method: 'POST',
            body: JSON.stringify({ target_stage: nextStage }),
          });
          void mutate(`${BACKEND_URL}/api/v1/projects/${id}`);
        }
      } else if (action === 'start_build') {
        await apiRequest(`/projects/${id}/advance`, {
          method: 'POST',
          body: JSON.stringify({ target_stage: 'in_build' }),
        });
        const data = await apiRequest<{ prompt: string }>(`/projects/${id}/kickoff-prompt`);
        setKickoffPrompt(data.prompt);
        void mutate(`${BACKEND_URL}/api/v1/projects/${id}`);
      } else if (action === 'log_update') {
        const notes = window.prompt('Enter build notes:');
        if (notes) {
          await apiRequest(`/projects/${id}/build-log`, {
            method: 'POST',
            body: JSON.stringify({ raw_notes: notes, source: 'manual' }),
          });
          void mutate(`${BACKEND_URL}/api/v1/projects/${id}`);
        }
      }
    } catch (err) {
      console.error(`[StageAction] ${action} failed:`, err);
    } finally {
      setActionLoading(null);
    }
  }

  function getNextStage(current: string): string | null {
    const map: Record<string, string> = {
      spark: 'brief', brief: 'draft_prd', draft_prd: 'review',
      approved: 'in_build', in_build: 'shipped', shipped: 'retrospective',
    };
    return map[current] ?? null;
  }

  const { data: project, isLoading, error } = useSWR<Project>(
    `${BACKEND_URL}/api/v1/projects/${id}`,
    fetchProject
  );

  // Tab state — read from ?tab= query param, default to 'prd'
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    const tabParam = searchParams.get('tab');
    return (TABS as readonly string[]).includes(tabParam ?? '') ? (tabParam as Tab) : 'prd';
  });

  // Sync tab state when query param changes externally
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && (TABS as readonly string[]).includes(tabParam)) {
      setActiveTab(tabParam as Tab);
    }
  }, [searchParams]);

  function handleTabChange(tab: Tab) {
    setActiveTab(tab);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);
    router.replace(url.pathname + url.search, { scroll: false });
  }

  if (isLoading) {
    return (
      <div style={{ padding: 24 }}>
        <p style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-geist-sans)' }}>
          Loading...
        </p>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div style={{ padding: 24 }}>
        <p style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-geist-sans)' }}>
          Project not found.
        </p>
      </div>
    );
  }

  const stageColor = STAGE_COLORS[project.stage as Stage];
  const stageActions = STAGE_ACTIONS[project.stage] ?? [];

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      style={{ padding: 0 }}
    >
      {/* Sticky project header */}
      <div
        style={{
          position: 'sticky',
          top: '3.5rem',
          zIndex: 30,
          background: 'var(--surface-base)',
          borderBottom: '1px solid var(--border-subtle)',
          padding: '0 32px',
          height: 56,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <button
          onClick={() => router.push('/projects')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            background: 'none',
            border: 'none',
            color: 'var(--text-tertiary)',
            cursor: 'pointer',
            fontSize: 13,
            fontFamily: 'var(--font-geist-sans)',
          }}
        >
          <ArrowLeft size={14} />
          Projects
        </button>

        <span style={{ color: 'var(--border-default)' }}>/</span>

        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '3px 8px',
            borderRadius: 999,
            fontSize: 11,
            fontWeight: 600,
            background: stageColor.bg,
            border: `1px solid ${stageColor.border}`,
            color: stageColor.text,
            fontFamily: 'var(--font-geist-sans)',
          }}
        >
          {stageColor.icon} {STAGE_LABELS[project.stage as Stage]}
        </span>

        <h2
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-geist-sans)',
            margin: 0,
            flex: 1,
          }}
        >
          {project.title}
        </h2>
      </div>

      {/* Stage progress bar */}
      <StageProgressBar currentStage={project.stage as Stage} />

      {/* 2-column layout */}
      <div style={{ display: 'flex', padding: '0 32px 32px', gap: 24 }}>
        {/* Left panel: tabs */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Tab bar */}
          <div
            style={{
              display: 'flex',
              gap: 0,
              borderBottom: '1px solid var(--border-subtle)',
              marginBottom: 20,
            }}
          >
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => handleTabChange(tab)}
                style={{
                  height: 40,
                  padding: '0 16px',
                  background: 'none',
                  border: 'none',
                  borderBottom:
                    tab === activeTab
                      ? '2px solid var(--amber-core)'
                      : '2px solid transparent',
                  color: tab === activeTab ? 'var(--amber-core)' : 'var(--text-secondary)',
                  fontSize: 14,
                  fontWeight: tab === activeTab ? 600 : 400,
                  fontFamily: 'var(--font-geist-sans)',
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                  transition: 'color 150ms, border-color 150ms',
                }}
              >
                {tab === 'prd' ? 'PRD' : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <AnimatePresence mode="wait">
            {activeTab === 'prd' && (
              <motion.div
                key="tab-prd"
                initial={shouldReduce ? undefined : { opacity: 0, y: 6 }}
                animate={shouldReduce ? undefined : { opacity: 1, y: 0 }}
                exit={shouldReduce ? undefined : { opacity: 0, y: -4 }}
                transition={{ duration: 0.2 }}
              >
                <PRDEditor
                  projectId={id}
                  onRunStressTest={() => void handleStageAction('trigger_stress_tester')}
                />
              </motion.div>
            )}

            {activeTab === 'build' && (
              <motion.div
                key="tab-build"
                initial={shouldReduce ? undefined : { opacity: 0, y: 6 }}
                animate={shouldReduce ? undefined : { opacity: 1, y: 0 }}
                exit={shouldReduce ? undefined : { opacity: 0, y: -4 }}
                transition={{ duration: 0.2 }}
              >
                <BuildLogTab project={project} onLogUpdate={() => void mutate(`${BACKEND_URL}/api/v1/projects/${id}`)} projectId={id} />
              </motion.div>
            )}

            {activeTab === 'retro' && (
              <motion.div
                key="tab-retro"
                initial={shouldReduce ? undefined : { opacity: 0, y: 6 }}
                animate={shouldReduce ? undefined : { opacity: 1, y: 0 }}
                exit={shouldReduce ? undefined : { opacity: 0, y: -4 }}
                transition={{ duration: 0.2 }}
              >
                <RetroTab project={project} projectId={id} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right panel */}
        <div style={{ width: 280, flexShrink: 0 }}>
          {/* Agent Panel */}
          <AgentPanel run={activeRun} />

          {/* Kickoff prompt modal */}
          <AnimatePresence>
            {kickoffPrompt && (
              <motion.div
                initial={shouldReduce ? undefined : { opacity: 0, scale: 0.95 }}
                animate={shouldReduce ? undefined : { opacity: 1, scale: 1 }}
                exit={shouldReduce ? undefined : { opacity: 0, scale: 0.95 }}
                style={{
                  position: 'fixed', inset: 0, zIndex: 50,
                  background: 'rgba(1,30,65,0.5)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: 24,
                }}
                onClick={() => setKickoffPrompt(null)}
              >
                <motion.div
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    background: 'var(--surface-elevated)',
                    borderRadius: 12,
                    padding: 24,
                    maxWidth: 560,
                    width: '100%',
                    boxShadow: '0 24px 48px rgba(1,30,65,0.2)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, fontFamily: 'var(--font-geist-sans)', color: 'var(--text-primary)' }}>
                      Claude Code Kickoff Prompt
                    </h3>
                    <button onClick={() => setKickoffPrompt(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', fontSize: 18 }}>✕</button>
                  </div>
                  <pre style={{ fontSize: 11, fontFamily: 'var(--font-geist-mono)', color: 'var(--text-secondary)', background: 'var(--surface-input)', borderRadius: 8, padding: 12, overflow: 'auto', maxHeight: 320, whiteSpace: 'pre-wrap', margin: '0 0 12px' }}>
                    {kickoffPrompt}
                  </pre>
                  <button
                    onClick={() => { void navigator.clipboard.writeText(kickoffPrompt); }}
                    style={{ height: 36, padding: '0 16px', borderRadius: 8, border: 'none', background: 'var(--amber-core)', color: 'var(--surface-base)', fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-geist-sans)', cursor: 'pointer' }}
                  >
                    Copy to clipboard
                  </button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Stage actions */}
          {stageActions.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: 'var(--text-tertiary)',
                  marginBottom: 8,
                  fontFamily: 'var(--font-geist-sans)',
                }}
              >
                Stage Actions
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {stageActions.map((action) => (
                  <button
                    key={action.action}
                    onClick={() => void handleStageAction(action.action)}
                    disabled={actionLoading !== null}
                    style={{
                      height: 36,
                      padding: '0 12px',
                      borderRadius: 8,
                      border: '1px solid var(--border-subtle)',
                      background: action.action === 'approve' || action.action.includes('advance') || action.action === 'start_build'
                        ? 'var(--amber-glow)'
                        : 'var(--surface-input)',
                      color: action.action === 'approve' || action.action.includes('advance') || action.action === 'start_build'
                        ? 'var(--amber-core)'
                        : 'var(--text-secondary)',
                      fontSize: 12,
                      fontFamily: 'var(--font-geist-sans)',
                      cursor: actionLoading !== null ? 'not-allowed' : 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      transition: 'all 150ms',
                      opacity: actionLoading === action.action ? 0.6 : 1,
                    }}
                  >
                    <span>{actionLoading === action.action ? '...' : action.icon}</span>
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Assigned to */}
          <div style={{ marginBottom: 16 }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'var(--text-tertiary)',
                marginBottom: 8,
                fontFamily: 'var(--font-geist-sans)',
              }}
            >
              Assigned to
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: 'var(--surface-selected)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                }}
              >
                {project.assigned_to?.name?.[0] ?? '?'}
              </div>
              <span
                style={{
                  fontSize: 13,
                  color: 'var(--text-secondary)',
                  fontFamily: 'var(--font-geist-sans)',
                }}
              >
                {project.assigned_to?.name ?? 'Unassigned'}
              </span>
            </div>
          </div>

          {/* Stack */}
          {project.stack.length > 0 && (
            <div>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: 'var(--text-tertiary)',
                  marginBottom: 8,
                  fontFamily: 'var(--font-geist-sans)',
                }}
              >
                Stack
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {project.stack.map((tech) => (
                  <span
                    key={tech}
                    style={{
                      padding: '2px 7px',
                      borderRadius: 4,
                      fontSize: 11,
                      color: 'var(--text-secondary)',
                      background: 'var(--surface-input)',
                      border: '1px solid var(--border-subtle)',
                      fontFamily: 'var(--font-geist-sans)',
                    }}
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
