'use client';

import { motion } from 'framer-motion';
import { listContainerVariants, mobileListItemVariants } from '@/lib/motion';
import { MobileProjectCard } from './MobileProjectCard';
import type { Project } from '@/lib/api';

interface MobileProjectListProps {
  projects: Project[];
}

export function MobileProjectList({ projects }: MobileProjectListProps) {
  if (projects.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 0',
          gap: 8,
        }}
      >
        <span style={{ fontSize: 24, color: 'var(--text-tertiary)' }}>✦</span>
        <p
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: 'var(--text-secondary)',
            fontFamily: 'var(--font-display)',
            margin: 0,
          }}
        >
          No projects yet
        </p>
        <p
          style={{
            fontSize: 13,
            color: 'var(--text-tertiary)',
            fontFamily: 'var(--font-geist-sans)',
            margin: 0,
          }}
        >
          Tap + to create your first Spark
        </p>
      </div>
    );
  }

  return (
    <motion.div
      variants={listContainerVariants}
      initial="initial"
      animate="animate"
      style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
    >
      {projects.map((project) => (
        <motion.div key={project.id} variants={mobileListItemVariants}>
          <MobileProjectCard project={project} />
        </motion.div>
      ))}
    </motion.div>
  );
}
