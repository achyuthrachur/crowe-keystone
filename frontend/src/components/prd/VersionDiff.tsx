'use client';

import type { PRDDiff } from '@/types/prd.types';

interface VersionDiffProps {
  diff: PRDDiff[];
  previousVersion: number;
  currentVersion: number;
}

const SECTION_LABELS: Record<string, string> = {
  problem_statement: 'Problem Statement',
  user_stories: 'User Stories',
  functional_requirements: 'Functional Requirements',
  non_functional_requirements: 'Non-Functional Requirements',
  out_of_scope: 'Out of Scope',
  stack: 'Stack & Architecture',
  component_inventory: 'Component Inventory',
  data_layer_spec: 'Data Layer',
  api_contracts: 'API Contracts',
  success_criteria: 'Success Criteria',
  open_questions: 'Open Questions',
  claude_code_prompt: 'Claude Code Prompt',
};

function DiffRow({ item }: { item: PRDDiff }) {
  const label = SECTION_LABELS[item.section] ?? item.section;
  const hasOld = item.old && item.old.trim() !== '';
  const hasNew = item.new && item.new.trim() !== '';

  return (
    <div
      style={{
        marginBottom: 16,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: 'var(--text-tertiary)',
          fontFamily: 'var(--font-geist-sans)',
          textTransform: 'uppercase',
          letterSpacing: '0.07em',
          marginBottom: 6,
        }}
      >
        {label}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {/* Left: old version */}
        <div
          style={{
            borderRadius: 6,
            borderLeft: '2px solid var(--coral)',
            background: 'var(--coral-glow)',
            padding: '8px 10px',
            minHeight: 40,
          }}
        >
          {hasOld ? (
            <p
              style={{
                margin: 0,
                fontSize: 13,
                color: 'var(--text-secondary)',
                fontFamily: 'var(--font-geist-sans)',
                lineHeight: 1.5,
                textDecoration: 'line-through',
                textDecorationColor: 'var(--coral)',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {item.old}
            </p>
          ) : (
            <p
              style={{
                margin: 0,
                fontSize: 12,
                color: 'var(--text-tertiary)',
                fontFamily: 'var(--font-geist-sans)',
                fontStyle: 'italic',
              }}
            >
              No changes
            </p>
          )}
        </div>

        {/* Right: new version */}
        <div
          style={{
            borderRadius: 6,
            borderLeft: '2px solid var(--teal)',
            background: 'var(--teal-glow)',
            padding: '8px 10px',
            minHeight: 40,
          }}
        >
          {hasNew ? (
            <p
              style={{
                margin: 0,
                fontSize: 13,
                color: 'var(--text-secondary)',
                fontFamily: 'var(--font-geist-sans)',
                lineHeight: 1.5,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {item.new}
            </p>
          ) : (
            <p
              style={{
                margin: 0,
                fontSize: 12,
                color: 'var(--text-tertiary)',
                fontFamily: 'var(--font-geist-sans)',
                fontStyle: 'italic',
              }}
            >
              No changes
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function VersionDiff({ diff, previousVersion, currentVersion }: VersionDiffProps) {
  return (
    <div
      style={{
        background: 'var(--surface-elevated)',
        borderRadius: 10,
        border: '1px solid var(--border-subtle)',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 8,
          padding: '10px 16px',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'var(--surface-base)',
        }}
      >
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--coral)',
            fontFamily: 'var(--font-geist-sans)',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <span style={{ fontSize: 14 }}>&#8592;</span>
          v{previousVersion}
        </div>
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--teal)',
            fontFamily: 'var(--font-geist-sans)',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          v{currentVersion}
          <span style={{ fontSize: 14 }}>&#8594;</span>
        </div>
      </div>

      {/* Diff rows */}
      <div style={{ padding: 16 }}>
        {diff.length === 0 ? (
          <p
            style={{
              margin: 0,
              fontSize: 13,
              color: 'var(--text-tertiary)',
              fontFamily: 'var(--font-geist-sans)',
              fontStyle: 'italic',
              textAlign: 'center',
              padding: '16px 0',
            }}
          >
            No differences between versions
          </p>
        ) : (
          diff.map((item) => <DiffRow key={item.section} item={item} />)
        )}
      </div>
    </div>
  );
}
