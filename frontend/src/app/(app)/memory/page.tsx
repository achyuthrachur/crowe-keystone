'use client';

import { useState, useCallback } from 'react';
import useSWR from 'swr';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { pageVariants, listItemVariants, listContainerVariants } from '@/lib/motion';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8000';

async function fetchMemory(url: string) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('keystone_token') : null;
  const res = await fetch(url, {
    credentials: 'include',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`Memory fetch error ${res.status}`);
  return res.json();
}

const TYPE_FILTERS = [
  { label: 'All', value: '' },
  { label: 'Decisions', value: 'decisions' },
  { label: 'Retrospectives', value: 'retrospectives' },
];

function EntryCard({ entry }: { entry: Record<string, unknown> }) {
  const isDecision = entry.entry_type === 'decision';
  return (
    <motion.div
      variants={listItemVariants}
      style={{
        background: 'var(--surface-elevated)',
        borderRadius: 10,
        border: '1px solid var(--border-subtle)',
        padding: '14px 16px',
        cursor: 'default',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
        <span style={{ fontSize: 12, color: isDecision ? 'var(--amber-core)' : 'var(--teal)', flexShrink: 0, marginTop: 2 }}>
          {isDecision ? '◉' : '◎'}
        </span>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-geist-sans)' }}>
              {isDecision ? String(entry.title ?? '') : `Retrospective — ${String(entry.project_id ?? '').slice(0, 8)}...`}
            </span>
            {isDecision && entry.type != null && (
              <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-tertiary)', background: 'var(--surface-input)', border: '1px solid var(--border-subtle)', borderRadius: 4, padding: '1px 6px', fontFamily: 'var(--font-geist-sans)' }}>
                {String(entry.type)}
              </span>
            )}
          </div>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'var(--font-geist-sans)', lineHeight: 1.4 }}>
            {isDecision
              ? String(entry.rationale ?? '').slice(0, 200)
              : String(entry.built_vs_scoped ?? '').slice(0, 200)}
            {((isDecision ? String(entry.rationale ?? '') : String(entry.built_vs_scoped ?? '')).length > 200) ? '...' : ''}
          </p>
        </div>
      </div>
      {isDecision && Array.isArray(entry.tags) && (entry.tags as string[]).length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {(entry.tags as string[]).map((tag: string) => (
            <span key={tag} style={{ fontSize: 10, color: 'var(--text-tertiary)', background: 'var(--surface-input)', border: '1px solid var(--border-subtle)', borderRadius: 999, padding: '1px 7px', fontFamily: 'var(--font-geist-sans)' }}>
              {tag}
            </span>
          ))}
        </div>
      )}
      <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'var(--font-geist-mono)' }}>
        {String(entry.created_at ?? '').slice(0, 10)}
      </div>
    </motion.div>
  );
}

export default function MemoryPage() {
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const shouldReduce = useReducedMotion();

  const params = new URLSearchParams();
  if (query) params.set('query', query);
  if (typeFilter) params.set('type', typeFilter);
  const url = `${BACKEND_URL}/api/v1/memory?${params.toString()}`;

  const { data, isLoading, error } = useSWR(url, fetchMemory, { revalidateOnFocus: false });
  const results: Record<string, unknown>[] = data?.results ?? [];

  return (
    <motion.div
      variants={shouldReduce ? undefined : pageVariants}
      initial={shouldReduce ? undefined : 'initial'}
      animate={shouldReduce ? undefined : 'animate'}
      exit={shouldReduce ? undefined : 'exit'}
      style={{ padding: '0 0 32px' }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-display)', margin: 0 }}>
          Memory
        </h1>
        <span style={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'var(--font-geist-sans)' }}>
          Institutional decisions &amp; retrospectives
        </span>
      </div>

      {/* Search bar */}
      <div style={{ marginBottom: 16 }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search decisions, retrospectives..."
          style={{
            width: '100%', maxWidth: 480, height: 40,
            background: 'var(--surface-input)', border: '1px solid var(--border-subtle)',
            borderRadius: 8, padding: '0 14px', fontSize: 13, color: 'var(--text-primary)',
            fontFamily: 'var(--font-geist-sans)', outline: 'none', boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Type filter pills */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        {TYPE_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setTypeFilter(f.value)}
            style={{
              height: 30, padding: '0 12px', borderRadius: 999, border: 'none',
              background: typeFilter === f.value ? 'var(--indigo-core)' : 'var(--surface-input)',
              color: typeFilter === f.value ? 'white' : 'var(--text-secondary)',
              fontSize: 12, fontFamily: 'var(--font-geist-sans)', cursor: 'pointer',
              fontWeight: typeFilter === f.value ? 600 : 400,
              transition: 'all 150ms',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Results */}
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ height: 80, borderRadius: 10, background: 'var(--surface-input)', animation: 'pulse 1.5s ease-in-out infinite' }} />
          ))}
        </div>
      ) : error ? (
        <p style={{ color: 'var(--coral)', fontSize: 13, fontFamily: 'var(--font-geist-sans)' }}>Failed to load memory entries.</p>
      ) : results.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48 }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, fontFamily: 'var(--font-geist-sans)', marginBottom: 8 }}>
            No memory entries yet.
          </p>
          <p style={{ color: 'var(--text-tertiary)', fontSize: 12, fontFamily: 'var(--font-geist-sans)', margin: 0 }}>
            Ship a project to get started. Retrospectives and decisions feed institutional memory automatically.
          </p>
        </div>
      ) : (
        <motion.div
          variants={shouldReduce ? undefined : listContainerVariants}
          initial={shouldReduce ? undefined : 'initial'}
          animate={shouldReduce ? undefined : 'animate'}
          style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
        >
          {results.map((entry) => (
            <EntryCard key={String(entry.id)} entry={entry} />
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}
