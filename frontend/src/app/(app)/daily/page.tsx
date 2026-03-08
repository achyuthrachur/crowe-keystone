'use client';

import useSWR from 'swr';
import { motion, useReducedMotion } from 'framer-motion';
import { pageVariants } from '@/lib/motion';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8000';

async function fetchDaily(url: string) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('keystone_token') : null;
  const res = await fetch(url, {
    credentials: 'include',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`Daily fetch error ${res.status}`);
  return res.json();
}

interface BriefSection {
  title?: string;
  stage?: string;
  description?: string;
  approval_id?: string;
  summary?: string;
  [key: string]: unknown;
}

function SectionBlock({ title, items, emptyLabel, accentColor }: {
  title: string;
  items: BriefSection[];
  emptyLabel: string;
  accentColor: string;
}) {
  return (
    <div
      style={{
        background: 'var(--surface-elevated)',
        borderRadius: 10,
        border: '1px solid var(--border-subtle)',
        overflow: 'hidden',
      }}
    >
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 3, height: 14, background: accentColor, borderRadius: 999 }} />
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-geist-sans)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {title}
        </span>
        <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'var(--font-geist-mono)', marginLeft: 'auto' }}>
          {items.length}
        </span>
      </div>
      <div style={{ padding: '8px 0' }}>
        {items.length === 0 ? (
          <p style={{ margin: 0, padding: '8px 16px', fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'var(--font-geist-sans)', fontStyle: 'italic' }}>
            {emptyLabel}
          </p>
        ) : (
          items.map((item, i) => (
            <div key={i} style={{ padding: '8px 16px', borderBottom: i < items.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-primary)', fontFamily: 'var(--font-geist-sans)', fontWeight: 500 }}>
                {item.title ?? item.summary ?? JSON.stringify(item).slice(0, 60)}
              </p>
              {item.stage && (
                <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'var(--font-geist-sans)' }}>
                  {item.stage}
                </span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function DailyPage() {
  const shouldReduce = useReducedMotion();
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const { data, isLoading, error, mutate } = useSWR(`${BACKEND_URL}/api/v1/daily`, fetchDaily, { revalidateOnFocus: false });

  const brief = data?.brief ?? {};
  const isGenerating = data?.status === 'generating';

  return (
    <motion.div
      variants={shouldReduce ? undefined : pageVariants}
      initial={shouldReduce ? undefined : 'initial'}
      animate={shouldReduce ? undefined : 'animate'}
      exit={shouldReduce ? undefined : 'exit'}
      style={{ padding: '0 0 32px' }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-display)', margin: 0 }}>
          Today
        </h1>
        <span style={{ fontSize: 13, color: 'var(--text-tertiary)', fontFamily: 'var(--font-geist-sans)' }}>
          {today}
        </span>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} style={{ height: 100, borderRadius: 10, background: 'var(--surface-input)', animation: 'pulse 1.5s ease-in-out infinite' }} />
          ))}
        </div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: 48 }}>
          <p style={{ color: 'var(--coral)', fontSize: 13, fontFamily: 'var(--font-geist-sans)', marginBottom: 12 }}>
            Failed to load daily brief.
          </p>
          <button
            onClick={() => void mutate()}
            style={{
              height: 34, padding: '0 16px', borderRadius: 8, border: 'none',
              background: 'var(--amber-core)', color: 'var(--surface-base)',
              fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-geist-sans)', cursor: 'pointer',
            }}
          >
            Retry
          </button>
        </div>
      ) : (
        <>
          {isGenerating && (
            <div style={{ marginBottom: 16, padding: '10px 14px', background: 'var(--amber-glow)', border: '1px solid var(--border-amber)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12 }}>⚡</span>
              <span style={{ fontSize: 12, color: 'var(--amber-core)', fontFamily: 'var(--font-geist-sans)', fontWeight: 600 }}>
                Generating your brief... It will appear here in a moment.
              </span>
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <SectionBlock
              title="Active Work"
              items={Array.isArray(brief.active_work) ? brief.active_work : []}
              emptyLabel="No active projects in your queue."
              accentColor="var(--amber-core)"
            />
            <SectionBlock
              title="Waiting on You"
              items={Array.isArray(brief.waiting_on_you) ? brief.waiting_on_you : []}
              emptyLabel="No approvals or checkpoints waiting."
              accentColor="var(--coral)"
            />
            <SectionBlock
              title="Team Activity"
              items={Array.isArray(brief.team_activity) ? brief.team_activity : []}
              emptyLabel="No recent team activity."
              accentColor="var(--teal)"
            />
            <SectionBlock
              title="Upcoming"
              items={Array.isArray(brief.upcoming) ? brief.upcoming : []}
              emptyLabel="Nothing scheduled upcoming."
              accentColor="var(--indigo-bright)"
            />
          </div>
          {data?.generated_at && (
            <p style={{ marginTop: 16, fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'var(--font-geist-mono)', textAlign: 'right' }}>
              Generated {new Date(data.generated_at).toLocaleTimeString()}
            </p>
          )}
        </>
      )}
    </motion.div>
  );
}
