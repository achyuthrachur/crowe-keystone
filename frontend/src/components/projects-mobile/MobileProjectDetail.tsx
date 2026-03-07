'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { accordionVariants, agentDotVariants } from '@/lib/motion';
import { STAGE_COLORS, STAGE_ORDER, STAGE_LABELS, type Stage } from '@/lib/stage-colors';
import type { Project } from '@/lib/api';

interface MobileProjectDetailProps {
  project: Project;
}

const ACCORDION_SECTIONS = [
  { id: 'problem', title: 'Problem Statement' },
  { id: 'stories', title: 'User Stories' },
  { id: 'requirements', title: 'Requirements' },
  { id: 'stack', title: 'Stack & Architecture' },
  { id: 'questions', title: 'Open Questions' },
];

export function MobileProjectDetail({ project }: MobileProjectDetailProps) {
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['problem']));
  const currentStageIndex = STAGE_ORDER.indexOf(project.stage as Stage);
  const stageColor = STAGE_COLORS[project.stage as Stage];

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
      {/* Stage progress dots */}
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
            const isCurrent = index === currentStageIndex;
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
                    isCompleted ? 'var(--teal)' : isCurrent ? 'var(--amber-core)' : 'var(--border-default)'
                  }`,
                  flexShrink: 0,
                }}
              />
            );
          })}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'var(--font-geist-sans)' }}>
          <span style={{ color: stageColor.text }}>{STAGE_LABELS[project.stage as Stage]}</span>
          {' · '}Stage {currentStageIndex + 1} of {STAGE_ORDER.length}
        </div>
      </div>

      {/* Quick actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
        <button
          style={{
            height: 44,
            borderRadius: 8,
            border: 'none',
            background: 'var(--amber-core)',
            color: 'var(--text-inverse)',
            fontSize: 14,
            fontWeight: 600,
            fontFamily: 'var(--font-geist-sans)',
            cursor: 'pointer',
          }}
        >
          Advance Stage →
        </button>
        <button
          style={{
            height: 44,
            borderRadius: 8,
            border: '1px solid var(--border-subtle)',
            background: 'var(--surface-input)',
            color: 'var(--text-secondary)',
            fontSize: 14,
            fontFamily: 'var(--font-geist-sans)',
            cursor: 'pointer',
          }}
        >
          Log Update
        </button>
      </div>

      {/* Accordion sections */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {ACCORDION_SECTIONS.map((section) => {
          const isOpen = openSections.has(section.id);
          return (
            <div
              key={section.id}
              style={{
                borderRadius: 10,
                border: '1px solid var(--border-subtle)',
                background: 'var(--surface-elevated)',
                overflow: 'hidden',
              }}
            >
              <button
                onClick={() => toggleSection(section.id)}
                style={{
                  width: '100%',
                  height: 44,
                  padding: '0 12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 500,
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-geist-sans)',
                  }}
                >
                  {isOpen ? '▼' : '▶'}{' '}
                  {section.title}
                </span>
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    variants={accordionVariants}
                    initial="collapsed"
                    animate="expanded"
                    exit="collapsed"
                    style={{ overflow: 'hidden' }}
                  >
                    <div
                      style={{
                        padding: '0 12px 12px',
                        fontSize: 13,
                        color: 'var(--text-secondary)',
                        fontFamily: 'var(--font-geist-sans)',
                        lineHeight: 1.6,
                        borderTop: '1px solid var(--border-subtle)',
                        paddingTop: 12,
                      }}
                    >
                      {project.brief
                        ? section.id === 'problem'
                          ? project.brief.problem_statement
                          : `No ${section.title.toLowerCase()} defined yet.`
                        : `No ${section.title.toLowerCase()} defined yet. Run an agent to populate this section.`}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
