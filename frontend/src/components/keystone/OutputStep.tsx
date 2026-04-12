'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { CheckCircle2, Download, FileText, FileJson, Plus } from 'lucide-react';
import { useKeystoneStore } from '@/stores/keystone.store';
import type { Engagement, OutputFiles } from '@/types/keystone.types';

const API = process.env.NEXT_PUBLIC_BACKEND_URL ?? '';

interface OutputStepProps {
  engagement: Engagement;
}

export function OutputStep({ engagement }: OutputStepProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const { activeRun } = useKeystoneStore();
  const [outputFiles, setOutputFiles] = useState<OutputFiles | null>(null);
  const [outputLoading, setOutputLoading] = useState(true);

  // Same cast as detail page — next-auth v5 doesn't expose accessToken by default
  const token = (session as unknown as { accessToken?: string })?.accessToken ?? '';

  useEffect(() => {
    if (!token || !engagement.id) return;
    fetch(`${API}/api/v1/engagements/${engagement.id}/output`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => setOutputFiles(data))
      .catch(() => {})
      .finally(() => setOutputLoading(false));
  }, [engagement.id, token]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 0 }}
    >
      {/* Animated checkmark */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 18, delay: 0.1 }}
        style={{
          width: 56, height: 56, borderRadius: '50%',
          background: 'var(--teal-glow)',
          border: '2px solid var(--teal)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 16,
        }}
      >
        <CheckCircle2 size={28} color="var(--teal)" />
      </motion.div>

      <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 6px' }}>
        Deck brief ready
      </h2>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
        Generated {activeRun?.completed_at
          ? new Date(activeRun.completed_at).toLocaleString()
          : new Date().toLocaleString()}
      </p>

      {/* Download buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 24, width: '100%' }}>
        {outputLoading ? (
          <>
            <SkeletonButton />
            <SkeletonButton />
          </>
        ) : (
          <>
            <DownloadButton
              label="Deck Brief"
              subtitle="Word document · Crowe-branded outline"
              icon={<FileText size={20} color="var(--blue)" />}
              href={outputFiles?.deck_brief_download_url ?? ''}
              available={outputFiles?.deck_brief_available ?? false}
              token={token}
            />
            <DownloadButton
              label="Deck Handoff"
              subtitle="JSON · Machine-readable for Claude Code"
              icon={<FileJson size={20} color="var(--teal)" />}
              href={outputFiles?.deck_handoff_download_url ?? ''}
              available={outputFiles?.deck_handoff_available ?? false}
              token={token}
            />
          </>
        )}
      </div>

      {/* Start new engagement */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => router.push('/engagements/new')}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          height: 40, padding: '0 20px', borderRadius: 8, marginTop: 24,
          background: 'transparent',
          border: '1px solid var(--border-default)',
          color: 'var(--text-secondary)', fontSize: 13, fontWeight: 500,
          cursor: 'pointer', transition: 'all 150ms ease',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--amber-core)'; e.currentTarget.style.color = 'var(--amber-core)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
      >
        <Plus size={14} />
        Start New Engagement
      </motion.button>
    </motion.div>
  );
}

// ── Download button ───────────────────────────────────────────────────────────

interface DownloadButtonProps {
  label: string;
  subtitle: string;
  icon: React.ReactNode;
  href: string;
  available: boolean;
  token: string;
}

function DownloadButton({ label, subtitle, icon, href, available, token }: DownloadButtonProps) {
  // Downloads via programmatic fetch to attach auth header
  async function handleDownload(e: React.MouseEvent) {
    e.preventDefault();
    if (!available || !href) return;
    try {
      const res = await fetch(`${API}${href}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = label === 'Deck Brief' ? 'deck_brief.docx' : 'deck_handoff.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // silently fail
    }
  }

  return (
    <motion.div
      whileHover={available ? { scale: 1.01, y: -1 } : {}}
      whileTap={available ? { scale: 0.98 } : {}}
      onClick={handleDownload}
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '14px 18px', borderRadius: 10,
        background: 'var(--surface-elevated)',
        border: `1px solid ${available ? 'var(--border-default)' : 'var(--border-subtle)'}`,
        cursor: available ? 'pointer' : 'not-allowed',
        opacity: available ? 1 : 0.5,
        boxShadow: available ? 'var(--shadow-sm)' : 'none',
        transition: 'all 150ms ease',
      }}
    >
      <div style={{
        width: 40, height: 40, borderRadius: 8, flexShrink: 0,
        background: 'var(--surface-overlay)',
        border: '1px solid var(--border-default)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
          {label}
        </p>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '2px 0 0' }}>
          {subtitle}
        </p>
      </div>
      {available && <Download size={16} color="var(--text-tertiary)" />}
    </motion.div>
  );
}

function SkeletonButton() {
  return (
    <div style={{
      height: 68, borderRadius: 10, background: 'var(--surface-elevated)',
      border: '1px solid var(--border-subtle)',
      animation: 'shimmer 1.6s infinite linear',
      backgroundSize: '200% 100%',
    }} />
  );
}
