'use client';

export const dynamic = 'force-dynamic';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { useKeystoneStore } from '@/stores/keystone.store';
import { useKeystoneSSE } from '@/hooks/useKeystoneSSE';
import { KanbanBoard } from '@/components/keystone/KanbanBoard';

export default function EngagementsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { fetchEngagements, engagements, engagementsLoading } = useKeystoneStore();
  useKeystoneSSE();

  // next-auth v5 doesn't expose accessToken by default — cast to extended session shape
  const token = (session as unknown as { accessToken?: string })?.accessToken;

  useEffect(() => {
    if (token) {
      void fetchEngagements(token);
    }
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 24 }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--text-primary)', margin: 0, fontFamily: 'var(--font-display)' }}>
            Engagements
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
            {engagements.length} engagement{engagements.length !== 1 ? 's' : ''}
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => router.push('/engagements/new')}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            height: 40, padding: '0 20px', borderRadius: 8,
            background: 'var(--amber-core)', border: 'none',
            color: 'var(--text-inverse)', fontSize: 14, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'var(--font-geist-sans)',
            boxShadow: 'var(--shadow-amber)',
          }}
        >
          <Plus size={16} />
          New Engagement
        </motion.button>
      </div>

      {/* Empty state — shown only when loaded and empty */}
      {!engagementsLoading && engagements.length === 0 && <BoardEmptyState />}

      {/* Kanban board — always rendered (shows skeletons when loading) */}
      {(engagementsLoading || engagements.length > 0) && (
        <KanbanBoard engagements={engagements} loading={engagementsLoading} />
      )}
    </motion.div>
  );
}

function BoardEmptyState() {
  const router = useRouter();
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', flex: 1, gap: 20, paddingBottom: 80,
      }}
    >
      {/* Animated icon — three stacked document cards that float */}
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        style={{ position: 'relative', width: 72, height: 72 }}
      >
        {/* Back card */}
        <div style={{ position: 'absolute', top: 8, left: 8, width: 56, height: 64, borderRadius: 8, background: 'var(--surface-overlay)', border: '1px solid var(--border-subtle)', transform: 'rotate(-6deg)' }} />
        {/* Mid card */}
        <div style={{ position: 'absolute', top: 4, left: 4, width: 56, height: 64, borderRadius: 8, background: 'var(--surface-elevated)', border: '1px solid var(--border-default)', transform: 'rotate(-2deg)' }} />
        {/* Front card */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: 56, height: 64, borderRadius: 8, background: 'var(--surface-overlay)', border: '1px solid var(--border-amber)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 20, height: 2, background: 'var(--amber-core)', borderRadius: 2, marginBottom: 4 }} />
        </div>
      </motion.div>

      <div style={{ textAlign: 'center', gap: 8, display: 'flex', flexDirection: 'column' }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
          No engagements yet
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
          Create your first engagement to start the pipeline
        </p>
      </div>

      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => router.push('/engagements/new')}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          height: 44, padding: '0 24px', borderRadius: 8,
          background: 'var(--amber-core)', border: 'none',
          color: 'var(--text-inverse)', fontSize: 14, fontWeight: 600,
          cursor: 'pointer', fontFamily: 'var(--font-geist-sans)',
          boxShadow: 'var(--shadow-amber)',
        }}
      >
        <Plus size={16} />
        Create First Engagement
      </motion.button>
    </motion.div>
  );
}
