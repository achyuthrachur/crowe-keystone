'use client';

export const dynamic = 'force-dynamic';

import { use, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { useKeystoneStore } from '@/stores/keystone.store';
import { useKeystoneSSE } from '@/hooks/useKeystoneSSE';
import { PipelineStepper } from '@/components/keystone/PipelineStepper';

interface Props { params: Promise<{ id: string }> }

export default function EngagementDetailPage({ params }: Props) {
  const { id } = use(params);
  const { data: session } = useSession();
  const router = useRouter();
  const { fetchEngagement, fetchDocuments, fetchRun, activeEngagement, detailLoading } = useKeystoneStore();
  useKeystoneSSE();

  // Same cast as kanban page — next-auth v5 doesn't expose accessToken by default
  const token = (session as unknown as { accessToken?: string })?.accessToken ?? '';

  useEffect(() => {
    if (!token || !id) return;
    void fetchEngagement(id, token);
    void fetchDocuments(id, token);
    void fetchRun(id, token);
  }, [token, id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (detailLoading || !activeEngagement) {
    return <DetailSkeleton />;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 0 }}
    >
      {/* Back button + title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
        <button
          onClick={() => router.push('/engagements')}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border-default)',
            background: 'transparent', cursor: 'pointer', color: 'var(--text-secondary)',
            transition: 'all 150ms ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-hover)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)', margin: 0, fontFamily: 'var(--font-display)' }}>
            {activeEngagement.client_name}
          </h1>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '2px 0 0' }}>
            {activeEngagement.client_industry} · {new Date(activeEngagement.engagement_date).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Stepper + content */}
      <PipelineStepper engagement={activeEngagement} token={token} />
    </motion.div>
  );
}

function DetailSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: 4 }}>
      <div style={{ height: 24, width: 200, borderRadius: 6, background: 'var(--surface-input)', animation: 'shimmer 1.6s infinite linear', backgroundSize: '200% 100%' }} />
      <div style={{ height: 12, width: 140, borderRadius: 6, background: 'var(--surface-input)' }} />
    </div>
  );
}
