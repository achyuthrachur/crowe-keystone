'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { mobileListItemVariants, listContainerVariants } from '@/lib/motion';
import { PRDAccordionRow } from './PRDAccordionRow';

// ── PRD Types ────────────────────────────────────────────────────

export interface OpenQuestion {
  id: string;
  question: string;
  blocking: boolean;
  owner?: string;
}

export interface PRD {
  id: string;
  version: number;
  project_id: string;
  problem_statement: string;
  user_stories: Array<{ id?: string; role: string; action: string; benefit: string }>;
  functional_requirements: Array<{ id?: string; title: string; description: string; priority?: string }>;
  non_functional_requirements: Array<{ id?: string; title: string; description: string }>;
  out_of_scope: string[];
  stack: string[];
  component_inventory: Array<{ name: string; type: string; description?: string }>;
  data_layer_spec: Record<string, string | number | boolean | string[]>;
  api_contracts: Array<{ method: string; path: string; description: string; request?: string; response?: string }>;
  success_criteria: string[];
  open_questions: OpenQuestion[];
  claude_code_prompt?: string;
  created_at: string;
  updated_at: string;
}

// ── Section config ───────────────────────────────────────────────

type SectionId =
  | 'problem_statement'
  | 'user_stories'
  | 'functional_requirements'
  | 'non_functional_requirements'
  | 'out_of_scope'
  | 'stack'
  | 'component_inventory'
  | 'data_layer'
  | 'api_contracts'
  | 'success_criteria'
  | 'open_questions';

interface SectionDef {
  id: SectionId;
  label: string;
  type: 'string' | 'string[]' | 'dict[]';
}

const SECTIONS: SectionDef[] = [
  { id: 'problem_statement',          label: 'Problem Statement',          type: 'string'  },
  { id: 'user_stories',               label: 'User Stories',               type: 'dict[]'  },
  { id: 'functional_requirements',    label: 'Functional Requirements',    type: 'dict[]'  },
  { id: 'non_functional_requirements',label: 'Non-Functional Requirements',type: 'dict[]'  },
  { id: 'out_of_scope',               label: 'Out of Scope',               type: 'string[]'},
  { id: 'stack',                      label: 'Stack & Architecture',       type: 'string[]'},
  { id: 'component_inventory',        label: 'Component Inventory',        type: 'dict[]'  },
  { id: 'data_layer',                 label: 'Data Layer',                 type: 'dict[]'  },
  { id: 'api_contracts',              label: 'API Contracts',              type: 'dict[]'  },
  { id: 'success_criteria',           label: 'Success Criteria',           type: 'string[]'},
];

// ── Helpers ──────────────────────────────────────────────────────

function getSectionData(prd: PRD, id: SectionId): string | string[] | Record<string, unknown>[] | null {
  switch (id) {
    case 'problem_statement':           return prd.problem_statement;
    case 'user_stories':                return prd.user_stories as unknown as Record<string, unknown>[];
    case 'functional_requirements':     return prd.functional_requirements as unknown as Record<string, unknown>[];
    case 'non_functional_requirements': return prd.non_functional_requirements as unknown as Record<string, unknown>[];
    case 'out_of_scope':                return prd.out_of_scope;
    case 'stack':                       return prd.stack;
    case 'component_inventory':         return prd.component_inventory as unknown as Record<string, unknown>[];
    case 'data_layer':                  return Object.entries(prd.data_layer_spec).map(([k, v]) => ({ key: k, value: String(v) }));
    case 'api_contracts':               return prd.api_contracts as unknown as Record<string, unknown>[];
    case 'success_criteria':            return prd.success_criteria;
    default:                            return null;
  }
}

function getCount(prd: PRD, id: SectionId): number | undefined {
  const data = getSectionData(prd, id);
  if (Array.isArray(data)) return data.length;
  return undefined;
}

// ── Content renderers ────────────────────────────────────────────

function StringContent({ value }: { value: string }) {
  return (
    <p
      style={{
        fontSize: 13,
        color: 'var(--text-secondary)',
        fontFamily: 'var(--font-geist-sans)',
        lineHeight: 1.6,
        margin: 0,
      }}
    >
      {value || 'No content yet.'}
    </p>
  );
}

function StringListContent({ items }: { items: string[] }) {
  if (items.length === 0) {
    return (
      <p style={{ fontSize: 13, color: 'var(--text-tertiary)', fontFamily: 'var(--font-geist-sans)', margin: 0 }}>
        None defined yet.
      </p>
    );
  }
  return (
    <motion.ul
      variants={listContainerVariants}
      initial="initial"
      animate="animate"
      style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}
    >
      {items.map((item, i) => (
        <motion.li
          key={i}
          variants={mobileListItemVariants}
          style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: 'var(--amber-core)',
              flexShrink: 0,
              marginTop: 5,
            }}
          />
          <span
            style={{
              fontSize: 13,
              color: 'var(--text-secondary)',
              fontFamily: 'var(--font-geist-sans)',
              lineHeight: 1.5,
            }}
          >
            {item}
          </span>
        </motion.li>
      ))}
    </motion.ul>
  );
}

function DictListContent({ items }: { items: Record<string, unknown>[] }) {
  if (items.length === 0) {
    return (
      <p style={{ fontSize: 13, color: 'var(--text-tertiary)', fontFamily: 'var(--font-geist-sans)', margin: 0 }}>
        None defined yet.
      </p>
    );
  }
  return (
    <motion.div
      variants={listContainerVariants}
      initial="initial"
      animate="animate"
      style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
    >
      {items.map((item, i) => (
        <motion.div
          key={i}
          variants={mobileListItemVariants}
          style={{
            background: 'var(--surface-input)',
            borderRadius: 8,
            padding: '8px 10px',
            display: 'flex',
            flexDirection: 'column',
            gap: 3,
          }}
        >
          {Object.entries(item).map(([k, v]) => (
            <div key={k} style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'var(--text-tertiary)',
                  fontFamily: 'var(--font-geist-sans)',
                  textTransform: 'capitalize',
                  flexShrink: 0,
                  minWidth: 60,
                  paddingTop: 1,
                }}
              >
                {k.replace(/_/g, ' ')}
              </span>
              <span
                style={{
                  fontSize: 12,
                  color: 'var(--text-secondary)',
                  fontFamily: 'var(--font-geist-sans)',
                  lineHeight: 1.5,
                }}
              >
                {String(v ?? '')}
              </span>
            </div>
          ))}
        </motion.div>
      ))}
    </motion.div>
  );
}

function SectionContent({ prd, section }: { prd: PRD; section: SectionDef }) {
  const data = getSectionData(prd, section.id);

  if (section.type === 'string') {
    return <StringContent value={typeof data === 'string' ? data : ''} />;
  }
  if (section.type === 'string[]') {
    return <StringListContent items={Array.isArray(data) ? (data as string[]) : []} />;
  }
  // dict[]
  return <DictListContent items={Array.isArray(data) ? (data as Record<string, unknown>[]) : []} />;
}

// ── Open Questions section ────────────────────────────────────────

function OpenQuestionsContent({ questions }: { questions: OpenQuestion[] }) {
  const blocking    = questions.filter((q) => q.blocking);
  const nonBlocking = questions.filter((q) => !q.blocking);

  if (questions.length === 0) {
    return (
      <p style={{ fontSize: 13, color: 'var(--text-tertiary)', fontFamily: 'var(--font-geist-sans)', margin: 0 }}>
        No open questions.
      </p>
    );
  }

  return (
    <motion.div
      variants={listContainerVariants}
      initial="initial"
      animate="animate"
      style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
    >
      {blocking.map((q) => (
        <motion.div
          key={q.id}
          variants={mobileListItemVariants}
          style={{
            display: 'flex',
            gap: 8,
            alignItems: 'flex-start',
            padding: '8px 10px',
            background: 'rgba(229,55,107,0.06)',
            borderRadius: 8,
            borderLeft: '3px solid var(--coral)',
          }}
        >
          <span style={{ fontSize: 13, flexShrink: 0 }}>&#9940;</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p
              style={{
                margin: 0,
                fontSize: 13,
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-geist-sans)',
                lineHeight: 1.5,
              }}
            >
              {q.question}
            </p>
            {q.owner && (
              <span
                style={{
                  fontSize: 11,
                  color: 'var(--text-tertiary)',
                  fontFamily: 'var(--font-geist-sans)',
                  marginTop: 2,
                  display: 'block',
                }}
              >
                Owner: {q.owner}
              </span>
            )}
          </div>
        </motion.div>
      ))}

      {nonBlocking.map((q) => (
        <motion.div
          key={q.id}
          variants={mobileListItemVariants}
          style={{
            display: 'flex',
            gap: 8,
            alignItems: 'flex-start',
            padding: '8px 10px',
            background: 'var(--surface-input)',
            borderRadius: 8,
          }}
        >
          <span style={{ fontSize: 13, color: 'var(--text-tertiary)', flexShrink: 0 }}>&#9711;</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p
              style={{
                margin: 0,
                fontSize: 13,
                color: 'var(--text-secondary)',
                fontFamily: 'var(--font-geist-sans)',
                lineHeight: 1.5,
              }}
            >
              {q.question}
            </p>
            {q.owner && (
              <span
                style={{
                  fontSize: 11,
                  color: 'var(--text-tertiary)',
                  fontFamily: 'var(--font-geist-sans)',
                  marginTop: 2,
                  display: 'block',
                }}
              >
                Owner: {q.owner}
              </span>
            )}
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}

function OpenQuestionsStatusBadge({ questions }: { questions: OpenQuestion[] }) {
  const blockingCount    = questions.filter((q) => q.blocking).length;
  const nonBlockingCount = questions.filter((q) => !q.blocking).length;

  if (questions.length === 0) return null;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      {blockingCount > 0 && (
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--coral)',
            fontFamily: 'var(--font-geist-sans)',
            background: 'rgba(229,55,107,0.08)',
            borderRadius: 6,
            padding: '2px 6px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 3,
          }}
        >
          &#9940; {blockingCount}
        </span>
      )}
      {nonBlockingCount > 0 && (
        <span
          style={{
            fontSize: 11,
            fontWeight: 500,
            color: 'var(--text-tertiary)',
            fontFamily: 'var(--font-geist-sans)',
            background: 'var(--surface-input)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 6,
            padding: '2px 6px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 3,
          }}
        >
          &#9675; {nonBlockingCount}
        </span>
      )}
    </div>
  );
}

// ── Content padding wrapper ──────────────────────────────────────

function ContentWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        padding: '12px 12px 12px 12px',
        background: 'var(--surface-input)',
        borderTop: '1px solid var(--border-subtle)',
      }}
    >
      {children}
    </div>
  );
}

// ── PRDAccordion ─────────────────────────────────────────────────

interface PRDAccordionProps {
  prd: PRD | null;
  projectId: string;
}

export function PRDAccordion({ prd, projectId: _projectId }: PRDAccordionProps) {
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['problem_statement']));

  const toggle = (id: string) => {
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

  // Edit stub — Phase 5 will wire real editing
  const handleEdit = (_sectionId: string) => {
    // TODO Phase 5: open section edit modal
  };

  if (!prd) {
    return (
      <div
        style={{
          padding: '24px 16px',
          textAlign: 'center',
          color: 'var(--text-tertiary)',
          fontSize: 13,
          fontFamily: 'var(--font-geist-sans)',
        }}
      >
        No PRD yet. Generate one to get started.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {/* 10 standard sections */}
      {SECTIONS.map((section) => {
        const count   = getCount(prd, section.id);
        const isOpen  = openSections.has(section.id);

        return (
          <PRDAccordionRow
            key={section.id}
            label={section.label}
            isOpen={isOpen}
            onToggle={() => toggle(section.id)}
            count={count}
            onEdit={() => handleEdit(section.id)}
          >
            <ContentWrapper>
              <SectionContent prd={prd} section={section} />
            </ContentWrapper>
          </PRDAccordionRow>
        );
      })}

      {/* Open Questions — special row with status badge */}
      <PRDAccordionRow
        label="Open Questions"
        isOpen={openSections.has('open_questions')}
        onToggle={() => toggle('open_questions')}
        count={prd.open_questions.length > 0 ? prd.open_questions.length : undefined}
        statusBadge={<OpenQuestionsStatusBadge questions={prd.open_questions} />}
      >
        <ContentWrapper>
          <OpenQuestionsContent questions={prd.open_questions} />
        </ContentWrapper>
      </PRDAccordionRow>
    </div>
  );
}
