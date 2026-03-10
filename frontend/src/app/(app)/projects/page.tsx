'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import useSWR from 'swr';
import { pageVariants } from '@/lib/motion';
import { getProjects } from '@/lib/api';
import { ProjectList } from '@/components/projects/ProjectList';
import { StageFilterBar } from '@/components/projects/StageFilterBar';
import { SparkInput } from '@/components/projects/SparkInput';
import { MobileProjectList } from '@/components/projects-mobile/MobileProjectList';
import { MobileStageFilter } from '@/components/projects-mobile/MobileStageFilter';
import { useViewportStore } from '@/stores/viewport.store';
import type { Stage } from '@/lib/stage-colors';
import { Plus, RefreshCw } from 'lucide-react';

function LoadingSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          style={{
            height: 96,
            borderRadius: 12,
            background: 'var(--surface-secondary)',
            animation: 'pulse 1.5s ease-in-out infinite',
            opacity: 0.6,
          }}
        />
      ))}
    </div>
  );
}

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: '64px 24px',
        color: 'var(--text-muted)',
        fontFamily: 'var(--font-geist-sans)',
      }}
    >
      <div style={{ fontSize: 40, marginBottom: 16 }}>✦</div>
      <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
        No projects yet
      </p>
      <p style={{ fontSize: 14, marginBottom: 24 }}>
        Connect Vercel or create your first project
      </p>
      <button
        onClick={onNew}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          height: 36,
          padding: '0 16px',
          borderRadius: 8,
          border: 'none',
          background: 'var(--amber-core)',
          color: 'var(--text-inverse)',
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        <Plus size={14} />
        New Spark
      </button>
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: '48px 24px',
        color: 'var(--text-muted)',
        fontFamily: 'var(--font-geist-sans)',
      }}
    >
      <p style={{ fontSize: 14, color: 'var(--coral)', marginBottom: 16 }}>
        Failed to load projects
      </p>
      <button
        onClick={onRetry}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          height: 32,
          padding: '0 14px',
          borderRadius: 8,
          border: '1px solid var(--border)',
          background: 'none',
          color: 'var(--text-secondary)',
          fontSize: 13,
          cursor: 'pointer',
        }}
      >
        <RefreshCw size={13} />
        Retry
      </button>
    </div>
  );
}

export default function ProjectsPage() {
  const [activeStage, setActiveStage] = useState<Stage | 'all'>('all');
  const [sparkOpen, setSparkOpen] = useState(false);
  const { mode, isMobileDevice } = useViewportStore();

  const isMobile = mode === 'mobile' || isMobileDevice;

  const { data: allProjects = [], isLoading, error, mutate } = useSWR(
    '/api/projects',
    () => getProjects(),
    { revalidateOnFocus: true }
  );

  const filteredProjects = activeStage === 'all'
    ? allProjects
    : allProjects.filter((p) => p.stage === activeStage);

  const openConflicts = filteredProjects.filter((p) => p.has_conflicts);

  if (isMobile) {
    return (
      <motion.div
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
      >
        {/* Mobile stage filter */}
        <div style={{ marginBottom: 12 }}>
          <MobileStageFilter
            projects={allProjects}
            activeStage={activeStage}
            onStageChange={setActiveStage}
          />
        </div>

        {/* Conflict banner */}
        {openConflicts.length > 0 && (
          <div
            style={{
              background: 'var(--coral-glow)',
              border: '1px solid var(--border-coral)',
              borderLeft: '4px solid var(--coral)',
              borderRadius: 8,
              padding: 12,
              marginBottom: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span style={{ fontSize: 13, color: 'var(--coral)', fontFamily: 'var(--font-geist-sans)', fontWeight: 500 }}>
              ⚠ {openConflicts.length} conflicts
            </span>
            <button
              style={{
                fontSize: 12,
                color: 'var(--coral)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'var(--font-geist-sans)',
                fontWeight: 500,
              }}
            >
              Resolve →
            </button>
          </div>
        )}

        {isLoading && <LoadingSkeleton />}
        {error && <ErrorState onRetry={() => mutate()} />}
        {!isLoading && !error && allProjects.length === 0 && (
          <EmptyState onNew={() => setSparkOpen(true)} />
        )}
        {!isLoading && !error && allProjects.length > 0 && (
          <MobileProjectList projects={filteredProjects} />
        )}
        {sparkOpen && <SparkInput onClose={() => setSparkOpen(false)} />}
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      {/* Header row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 20,
        }}
      >
        <h1
          style={{
            fontSize: 24,
            fontWeight: 700,
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-display)',
            margin: 0,
          }}
        >
          Projects
        </h1>
        <button
          onClick={() => setSparkOpen(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            height: 36,
            padding: '0 14px',
            borderRadius: 8,
            border: 'none',
            background: 'var(--amber-core)',
            color: 'var(--text-inverse)',
            fontSize: 13,
            fontWeight: 600,
            fontFamily: 'var(--font-geist-sans)',
            cursor: 'pointer',
          }}
        >
          <Plus size={14} />
          ✦ New Spark
        </button>
      </div>

      {/* Stage filter */}
      <div style={{ marginBottom: 20 }}>
        <StageFilterBar
          projects={allProjects}
          activeStage={activeStage}
          onStageChange={setActiveStage}
        />
      </div>

      {/* Conflict banner */}
      {openConflicts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background: 'var(--coral-glow)',
            border: '1px solid var(--border-coral)',
            borderLeft: '4px solid var(--coral)',
            borderRadius: 8,
            padding: '10px 14px',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14, color: 'var(--coral)' }}>⚠</span>
            <span
              style={{
                fontSize: 14,
                color: 'var(--coral)',
                fontFamily: 'var(--font-geist-sans)',
                fontWeight: 500,
              }}
            >
              {openConflicts.length} conflict{openConflicts.length > 1 ? 's' : ''} need attention
            </span>
          </div>
          <button
            style={{
              fontSize: 13,
              color: 'var(--coral)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'var(--font-geist-sans)',
              fontWeight: 500,
            }}
          >
            View conflicts →
          </button>
        </motion.div>
      )}

      {/* Content */}
      {isLoading && <LoadingSkeleton />}
      {error && <ErrorState onRetry={() => mutate()} />}
      {!isLoading && !error && allProjects.length === 0 && (
        <EmptyState onNew={() => setSparkOpen(true)} />
      )}
      {!isLoading && !error && allProjects.length > 0 && (
        <ProjectList projects={filteredProjects} />
      )}

      {sparkOpen && <SparkInput onClose={() => setSparkOpen(false)} />}
    </motion.div>
  );
}
