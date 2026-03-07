'use client';

import { use, useState } from 'react';
import useSWR from 'swr';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { pageVariants } from '@/lib/motion';
import { apiRequest } from '@/lib/api';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8000';

async function fetchRetro(url: string) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('keystone_token') : null;
  const res = await fetch(url, {
    credentials: 'include',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Retro fetch error ${res.status}`);
  return res.json();
}

interface RetroData {
  id: string;
  project_id: string;
  built_vs_scoped: string;
  decisions_changed: string[];
  learnings: string[];
  what_would_change: string[];
  quality_signals: Record<string, unknown> | null;
  published: boolean;
  published_at: string | null;
}

function ListSection({ title, items, color }: { title: string; items: string[]; color: string }) {
  return (
    <div style={{ background: 'var(--surface-elevated)', borderRadius: 10, border: '1px solid var(--border-subtle)', overflow: 'hidden', marginBottom: 12 }}>
      <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 3, height: 14, background: color, borderRadius: 999 }} />
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-geist-sans)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {title}
        </span>
      </div>
      <div style={{ padding: 14 }}>
        {items.length === 0 ? (
          <p style={{ margin: 0, fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'var(--font-geist-sans)', fontStyle: 'italic' }}>None recorded.</p>
        ) : (
          <ul style={{ margin: 0, padding: '0 0 0 16px' }}>
            {items.map((item, i) => (
              <li key={i} style={{ fontSize: 13, color: 'var(--text-secondary)', fontFamily: 'var(--font-geist-sans)', lineHeight: 1.6, marginBottom: 4 }}>
                {item}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

interface RetroPageProps {
  params: Promise<{ id: string }>;
}

export default function RetroPage({ params }: RetroPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const shouldReduce = useReducedMotion();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishedSuccess, setPublishedSuccess] = useState(false);

  const { data: retro, isLoading, error, mutate } = useSWR<RetroData | null>(
    `${BACKEND_URL}/api/v1/projects/${id}/retrospective`,
    fetchRetro,
    { revalidateOnFocus: false }
  );

  async function handleGenerate() {
    setIsGenerating(true);
    try {
      await apiRequest(`/projects/${id}/retrospective`, { method: 'POST' });
      // Poll for completion after a short delay
      setTimeout(() => void mutate(), 5000);
    } catch (err) {
      console.error('[RetroPage] generate failed:', err);
    } finally {
      setIsGenerating(false);
    }
  }

  async function handlePublish() {
    setIsPublishing(true);
    try {
      await apiRequest(`/projects/${id}/retrospective/publish`, { method: 'POST' });
      setPublishedSuccess(true);
      void mutate();
    } catch (err) {
      console.error('[RetroPage] publish failed:', err);
    } finally {
      setIsPublishing(false);
    }
  }

  return (
    <motion.div
      variants={shouldReduce ? undefined : pageVariants}
      initial={shouldReduce ? undefined : 'initial'}
      animate={shouldReduce ? undefined : 'animate'}
      exit={shouldReduce ? undefined : 'exit'}
      style={{ padding: '0 0 32px' }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button
          onClick={() => router.push(`/projects/${id}`)}
          style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: 13, fontFamily: 'var(--font-geist-sans)' }}
        >
          <ArrowLeft size={14} /> Back
        </button>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
          Retrospective
        </h1>
        {retro?.published && (
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--teal)', background: 'var(--teal-glow)', border: '1px solid var(--teal)', borderRadius: 999, padding: '2px 8px', fontFamily: 'var(--font-geist-sans)' }}>
            Published to institutional memory
          </span>
        )}
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1, 2, 3, 4].map((i) => <div key={i} style={{ height: 100, borderRadius: 10, background: 'var(--surface-input)', animation: 'pulse 1.5s ease-in-out infinite' }} />)}
        </div>
      ) : error ? (
        <p style={{ color: 'var(--coral)', fontSize: 13, fontFamily: 'var(--font-geist-sans)' }}>Failed to load retrospective.</p>
      ) : !retro ? (
        <div style={{ textAlign: 'center', padding: 48, background: 'var(--surface-elevated)', borderRadius: 10, border: '1px solid var(--border-subtle)' }}>
          <p style={{ margin: '0 0 16px', fontSize: 14, color: 'var(--text-secondary)', fontFamily: 'var(--font-geist-sans)' }}>
            No retrospective yet. Generate one to capture learnings from this project.
          </p>
          <button
            onClick={() => void handleGenerate()}
            disabled={isGenerating}
            style={{ height: 38, padding: '0 18px', borderRadius: 8, border: 'none', background: isGenerating ? 'var(--surface-input)' : 'var(--amber-core)', color: isGenerating ? 'var(--text-tertiary)' : 'var(--surface-base)', fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-geist-sans)', cursor: isGenerating ? 'not-allowed' : 'pointer' }}
          >
            {isGenerating ? 'Generating...' : 'Generate Retrospective \u2192'}
          </button>
        </div>
      ) : (
        <>
          {/* Built vs Scoped */}
          <div style={{ background: 'var(--surface-elevated)', borderRadius: 10, border: '1px solid var(--border-subtle)', padding: 16, marginBottom: 12 }}>
            <h3 style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-geist-sans)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Built vs Scoped
            </h3>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', fontFamily: 'var(--font-geist-sans)', lineHeight: 1.6 }}>
              {retro.built_vs_scoped || 'Not yet recorded.'}
            </p>
          </div>

          <ListSection title="Decisions Changed" items={retro.decisions_changed} color="var(--amber-core)" />
          <ListSection title="Learnings" items={retro.learnings} color="var(--teal)" />
          <ListSection title="What We'd Do Differently" items={retro.what_would_change} color="var(--indigo-bright)" />

          {/* Publish button */}
          {!retro.published && (
            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => void handlePublish()}
                disabled={isPublishing}
                style={{ height: 38, padding: '0 18px', borderRadius: 8, border: 'none', background: isPublishing ? 'var(--surface-input)' : 'var(--amber-core)', color: isPublishing ? 'var(--text-tertiary)' : 'var(--surface-base)', fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-geist-sans)', cursor: isPublishing ? 'not-allowed' : 'pointer' }}
              >
                {isPublishing ? 'Publishing...' : 'Publish to Institutional Memory \u2192'}
              </button>
            </div>
          )}
          {publishedSuccess && (
            <p style={{ marginTop: 8, textAlign: 'right', fontSize: 12, color: 'var(--teal)', fontFamily: 'var(--font-geist-sans)' }}>
              ✓ Published successfully
            </p>
          )}
        </>
      )}
    </motion.div>
  );
}
