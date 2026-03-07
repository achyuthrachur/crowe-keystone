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
                <PRDEditor projectId={id} />
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
                <div
                  style={{
                    padding: 20,
                    background: 'var(--surface-elevated)',
                    borderRadius: 10,
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <p
                    style={{
                      color: 'var(--text-secondary)',
                      fontSize: 14,
                      fontFamily: 'var(--font-geist-sans)',
                      margin: 0,
                    }}
                  >
                    Build log coming in Phase 5.
                  </p>
                </div>
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
                <div
                  style={{
                    padding: 20,
                    background: 'var(--surface-elevated)',
                    borderRadius: 10,
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <p
                    style={{
                      color: 'var(--text-secondary)',
                      fontSize: 14,
                      fontFamily: 'var(--font-geist-sans)',
                      margin: 0,
                    }}
                  >
                    Retrospective view coming in Phase 5.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right panel */}
        <div style={{ width: 280, flexShrink: 0 }}>
          {/* Agent Panel */}
          {activeRun && <AgentPanel run={activeRun} />}

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
                    style={{
                      height: 36,
                      padding: '0 12px',
                      borderRadius: 8,
                      border: '1px solid var(--border-subtle)',
                      background: action.action === 'approve' || action.action.includes('advance')
                        ? 'var(--amber-glow)'
                        : 'var(--surface-input)',
                      color: action.action === 'approve' || action.action.includes('advance')
                        ? 'var(--amber-core)'
                        : 'var(--text-secondary)',
                      fontSize: 12,
                      fontFamily: 'var(--font-geist-sans)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      transition: 'all 150ms',
                    }}
                  >
                    <span>{action.icon}</span>
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
