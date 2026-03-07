'use client';

// Phase 1 stub — full implementation in Phase 6
// AgentPanel will show when an agent is running for a given project

import { AgentThinking } from './AgentThinking';
import type { AgentRun } from '@/types/agent.types';

interface AgentPanelProps {
  run?: AgentRun;
}

export function AgentPanel({ run }: AgentPanelProps) {
  if (!run) return null;

  const agentLabels: Record<string, string> = {
    brief_generator: 'Brief Generator',
    prd_drafter: 'PRD Architect',
    stress_tester: 'Stress Tester',
    conflict_detector: 'Conflict Detector',
    approval_router: 'Approval Router',
    update_writer: 'Update Writer',
    retro_generator: 'Retro Generator',
    memory_indexer: 'Memory Indexer',
    daily_brief_generator: 'Daily Brief',
  };

  const label = agentLabels[run.agent_type] ?? run.agent_type;

  return (
    <div
      style={{
        background: 'var(--amber-glow)',
        border: '1px solid var(--border-amber)',
        borderRadius: 10,
        padding: 12,
        marginBottom: 12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 14 }}>⚡</span>
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--amber-core)',
            fontFamily: 'var(--font-geist-sans)',
          }}
        >
          {label}
        </span>
        {run.status === 'running' && <AgentThinking />}
      </div>

      {run.current_node && (
        <div
          style={{
            fontSize: 11,
            color: 'var(--text-secondary)',
            fontFamily: 'var(--font-geist-mono)',
          }}
        >
          → {run.current_node}
        </div>
      )}

      {run.status === 'awaiting_human' && run.checkpoint_question && (
        <div
          style={{
            marginTop: 8,
            padding: 8,
            background: 'var(--surface-overlay)',
            borderRadius: 8,
            border: '1px solid var(--border-amber)',
          }}
        >
          <p
            style={{
              fontSize: 12,
              color: 'var(--text-secondary)',
              fontFamily: 'var(--font-geist-sans)',
              margin: '0 0 8px',
            }}
          >
            {run.checkpoint_question}
          </p>
          <input
            placeholder="Your answer..."
            style={{
              width: '100%',
              height: 36,
              background: 'var(--surface-input)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 6,
              padding: '0 10px',
              fontSize: 12,
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-geist-sans)',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>
      )}

      {run.status === 'complete' && (
        <div
          style={{
            fontSize: 12,
            color: 'var(--teal)',
            fontFamily: 'var(--font-geist-sans)',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          ✓ Complete
          {run.tokens_used && (
            <span style={{ color: 'var(--text-tertiary)', marginLeft: 4 }}>
              {run.tokens_used.toLocaleString()} tokens
            </span>
          )}
        </div>
      )}
    </div>
  );
}
