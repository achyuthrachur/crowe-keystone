'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { connectedBadgeVariants } from '@/lib/motion';
import { apiRequest } from '@/lib/api';

interface VercelStatus {
  connected: boolean;
  vercel_user_name?: string;
  project_count?: number;
}

function ConnectedAppsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const shouldReduce = useReducedMotion();
  const [status, setStatus] = useState<VercelStatus | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncDone, setSyncDone] = useState(false);
  const [error, setError] = useState('');

  const vercelCode = searchParams.get('vercel_code');
  const vercelState = searchParams.get('vercel_state');
  const vercelError = searchParams.get('vercel_error');

  useEffect(() => {
    loadStatus();
  }, []);

  useEffect(() => {
    if (vercelCode && vercelState) {
      handleCallback(vercelCode, vercelState);
    }
    if (vercelError) {
      setError(`Vercel connection failed: ${vercelError}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vercelCode, vercelState, vercelError]);

  async function loadStatus() {
    try {
      const s = await apiRequest<VercelStatus>('/integrations/vercel/status');
      setStatus(s);
    } catch {
      setStatus({ connected: false });
    }
  }

  async function handleCallback(code: string, state: string) {
    setConnecting(true);
    try {
      await apiRequest('/integrations/vercel/callback', {
        method: 'POST',
        body: JSON.stringify({ code, state }),
      });
      await loadStatus();
      router.replace('/settings/connected-apps');
    } catch {
      setError('Failed to connect Vercel. Please try again.');
    } finally {
      setConnecting(false);
    }
  }

  async function connectVercel() {
    try {
      const { url } = await apiRequest<{ url: string }>('/integrations/vercel/auth-url');
      window.location.href = url;
    } catch {
      setError('Vercel integration is not configured yet. See manual setup instructions.');
    }
  }

  async function syncProjects() {
    setSyncing(true);
    setSyncDone(false);
    try {
      await apiRequest('/integrations/vercel/sync', { method: 'POST' });
      setTimeout(async () => {
        await loadStatus();
        setSyncing(false);
        setSyncDone(true);
        setTimeout(() => setSyncDone(false), 3000);
      }, 2000);
    } catch {
      setSyncing(false);
    }
  }

  async function disconnect() {
    try {
      await apiRequest('/integrations/vercel/disconnect', { method: 'DELETE' });
      await loadStatus();
    } catch {
      setError('Failed to disconnect.');
    }
  }

  return (
    <div>
      <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 24 }}>
        Connected Apps
      </h1>

      {error && (
        <div style={{ background: 'var(--coral-glow)', border: '1px solid var(--border-coral)',
          borderRadius: 10, padding: '12px 16px', marginBottom: 20, color: 'var(--coral)', fontSize: 13 }}>
          {error}
        </div>
      )}

      {connecting && (
        <div style={{ background: 'var(--amber-glow)', border: '1px solid var(--border-amber)',
          borderRadius: 12, padding: '24px', textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>...</div>
          <p style={{ color: 'var(--amber-core)', fontSize: 14, fontWeight: 600 }}>
            Connecting to Vercel...
          </p>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>
            Importing your projects...
          </p>
        </div>
      )}

      <div style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border-subtle)',
        borderRadius: 12, padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 18 }}>&#9650;</span>
            <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>Vercel</span>
            <AnimatePresence>
              {status?.connected && (
                <motion.span
                  variants={shouldReduce ? undefined : connectedBadgeVariants}
                  initial={shouldReduce ? undefined : 'initial'}
                  animate={shouldReduce ? undefined : 'animate'}
                  style={{ fontSize: 11, color: 'var(--teal)', background: 'var(--teal-glow)',
                    border: '1px solid var(--border-teal)', borderRadius: 999,
                    padding: '2px 8px', fontWeight: 600 }}>
                  Connected
                </motion.span>
              )}
            </AnimatePresence>
          </div>
          {status?.connected && (
            <button onClick={disconnect} style={{ fontSize: 12, color: 'var(--text-tertiary)',
              background: 'none', border: '1px solid var(--border-default)', borderRadius: 6,
              padding: '4px 10px', cursor: 'pointer' }}>
              Disconnect
            </button>
          )}
        </div>

        {!status?.connected ? (
          <div>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 16, lineHeight: 1.6 }}>
              Connect your Vercel account to import your projects automatically.
            </p>
            <button onClick={connectVercel} style={{ height: 40, padding: '0 20px',
              background: 'var(--indigo-dark)', color: 'var(--text-inverse)',
              border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              Connect Vercel
            </button>
          </div>
        ) : (
          <div>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 4 }}>
              Signed in as: @{status.vercel_user_name}
            </p>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 16 }}>
              {status.project_count ?? 0} projects imported
            </p>
            <button onClick={syncProjects} disabled={syncing}
              style={{ height: 36, padding: '0 16px',
                background: syncDone ? 'var(--teal-glow)' : 'var(--surface-input)',
                color: syncDone ? 'var(--teal)' : 'var(--text-secondary)',
                border: '1px solid var(--border-default)', borderRadius: 8,
                fontSize: 13, cursor: syncing ? 'not-allowed' : 'pointer' }}>
              {syncing ? 'Syncing...' : syncDone ? 'Synced!' : 'Sync Now'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ConnectedAppsPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24 }}>Loading...</div>}>
      <ConnectedAppsContent />
    </Suspense>
  );
}
