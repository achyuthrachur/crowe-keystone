'use client';

import { motion } from 'framer-motion';
import { listContainerVariants, listItemVariants } from '@/lib/motion';
import { ProjectCard } from './ProjectCard';
import type { Project } from '@/lib/api';

interface ProjectListProps {
  projects: Project[];
  onConflict?: (projectId: string) => void;
}

export function ProjectList({ projects, onConflict }: ProjectListProps) {
  if (projects.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '64px 0',
          gap: 12,
        }}
      >
        <div
          style={{
            fontSize: 32,
            color: 'var(--text-tertiary)',
          }}
        >
          ✦
        </div>
        <p
          style={{
            fontSize: 16,
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
          Create a new Spark to get started
        </p>
      </div>
    );
  }

  return (
    <motion.div
      variants={listContainerVariants}
      initial="initial"
      animate="animate"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: 16,
      }}
    >
      {projects.map((project) => (
        <motion.div key={project.id} variants={listItemVariants}>
          <ProjectCard project={project} onConflict={onConflict} />
        </motion.div>
      ))}
    </motion.div>
  );
}
