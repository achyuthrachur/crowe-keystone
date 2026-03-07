'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { pageVariants } from '@/lib/motion';
import { MOCK_PROJECTS } from '@/lib/api';
import { ProjectList } from '@/components/projects/ProjectList';
import { StageFilterBar } from '@/components/projects/StageFilterBar';
import { SparkInput } from '@/components/projects/SparkInput';
import { MobileProjectList } from '@/components/projects-mobile/MobileProjectList';
import { MobileStageFilter } from '@/components/projects-mobile/MobileStageFilter';
import { useViewportStore } from '@/stores/viewport.store';
import type { Stage } from '@/lib/stage-colors';
import { Plus } from 'lucide-react';

export default function ProjectsPage() {
  const [activeStage, setActiveStage] = useState<Stage | 'all'>('all');
  const [sparkOpen, setSparkOpen] = useState(false);
  const { mode, isMobileDevice } = useViewportStore();

  const isMobile = mode === 'mobile' || isMobileDevice;

  const filteredProjects = activeStage === 'all'
    ? MOCK_PROJECTS
    : MOCK_PROJECTS.filter((p) => p.stage === activeStage);

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
            projects={MOCK_PROJECTS}
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

        <MobileProjectList projects={filteredProjects} />
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
          projects={MOCK_PROJECTS}
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

      {/* Projects grid */}
      <ProjectList projects={filteredProjects} />

      {sparkOpen && <SparkInput onClose={() => setSparkOpen(false)} />}
    </motion.div>
  );
}
