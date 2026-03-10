'use client';

import { useState, useEffect, Suspense } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { connectedBadgeVariants } from '@/lib/motion';
import { apiRequest } from '@/lib/api';

interface VercelStatus {
  connected: boolean;
  vercel_user_name?: string;
  project_count?: number;
}

function ConnectedAppsContent() {
  const shouldReduce = useReducedMotion();
  const [status, setStatus] = useState<VercelStatus | null>(null);
  const [token, setToken] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncDone, setSyncDone] = useState(false);
  const [tokenError, setTokenError] = useState('');

  useEffect(() => {
    loadStatus();
  }, []);

  async function loadStatus() {
    try {
      const s = await apiRequest<VercelStatus>('/integrations/vercel/status');
      setStatus(s);
    } catch {
      setStatus({ connected: false });
    }
  }

  async function connectWithToken() {
    if (!token.trim()) return;
    setConnecting(true);
    setTokenError('');
    try {
      await apiRequest<{ connected: boolean; vercel_user_name: string; projects_imported: number }>(
        '/integrations/vercel/connect',
        { method: 'POST', body: JSON.stringify({ access_token: token }) }
      );
      setToken('');
      await loadStatus();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Connection failed';
      setTokenError(
        msg.includes('Invalid') || msg.includes('invalid')
          ? 'Invalid token. Check it was copied correctly and has not expired.'
          : msg
      );
    } finally {
      setConnecting(false);
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
      // ignore
    }
  }

  return (
    <div>
      <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 24, fontFamily: 'var(--font-geist-sans)' }}>
        Connected Apps
      </h1>

      <div style={{
        background: 'var(--surface-elevated)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 12,
        padding: '20px 24px',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 18 }}>&#9650;</span>
            <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-geist-sans)' }}>
              Vercel
            </span>
            <AnimatePresence>
              {status?.connected && (
                <motion.span
                  variants={shouldReduce ? undefined : connectedBadgeVariants}
                  initial={shouldReduce ? undefined : 'initial'}
                  animate={shouldReduce ? undefined : 'animate'}
                  style={{
                    fontSize: 11, color: 'var(--teal)',
                    background: 'var(--teal-glow)',
                    border: '1px solid var(--border-teal)',
                    borderRadius: 999, padding: '2px 8px', fontWeight: 600,
                    fontFamily: 'var(--font-geist-sans)',
                  }}
                >
                  Connected
                </motion.span>
              )}
            </AnimatePresence>
          </div>
          {status?.connected && (
            <button
              onClick={disconnect}
              style={{
                fontSize: 12, color: 'var(--text-tertiary)',
                background: 'none', border: '1px solid var(--border-default)',
                borderRadius: 6, padding: '4px 10px', cursor: 'pointer',
                fontFamily: 'var(--font-geist-sans)',
              }}
            >
              Disconnect
            </button>
          )}
        </div>

        {/* Disconnected state */}
        {!status?.connected && (
          <div>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 12, lineHeight: 1.6, fontFamily: 'var(--font-geist-sans)' }}>
              Connect your Vercel account to import projects automatically.
              Your projects sync whenever you click Sync.
            </p>

            {/* Instructions */}
            <div style={{
              background: 'var(--surface-input)', borderRadius: 8,
              padding: '12px 14px', marginBottom: 16,
              border: '1px solid var(--border-subtle)',
            }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, fontFamily: 'var(--font-geist-sans)' }}>
                How to get your token:
              </p>
              <ol style={{ fontSize: 12, color: 'var(--text-secondary)', paddingLeft: 16, margin: 0, lineHeight: 1.8, fontFamily: 'var(--font-geist-sans)' }}>
                <li>Go to <a href="https://vercel.com/account/tokens" target="_blank" rel="noopener" style={{ color: 'var(--amber-core)' }}>vercel.com/account/tokens</a></li>
                <li>Click Create Token → name it &quot;Crowe Keystone&quot;</li>
                <li>Set no expiry → copy the token</li>
                <li>Paste it below</li>
              </ol>
            </div>

            {/* Token input */}
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && connectWithToken()}
                placeholder="Paste your Vercel token..."
                style={{
                  flex: 1, height: 40,
                  background: 'var(--surface-input)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 8, padding: '0 12px',
                  color: 'var(--text-primary)', fontSize: 13,
                  fontFamily: 'var(--font-geist-sans)', outline: 'none',
                }}
              />
              <button
                onClick={connectWithToken}
                disabled={!token.trim() || connecting}
                style={{
                  height: 40, padding: '0 18px',
                  background: 'var(--indigo-dark)',
                  color: 'var(--text-inverse)',
                  border: 'none', borderRadius: 8,
                  fontSize: 13, fontWeight: 600,
                  cursor: !token.trim() || connecting ? 'not-allowed' : 'pointer',
                  opacity: !token.trim() || connecting ? 0.6 : 1,
                  fontFamily: 'var(--font-geist-sans)',
                }}
              >
                {connecting ? 'Connecting...' : 'Connect'}
              </button>
            </div>

            {tokenError && (
              <p style={{ color: 'var(--coral)', fontSize: 12, marginTop: 8, fontFamily: 'var(--font-geist-sans)' }}>
                {tokenError}
              </p>
            )}
          </div>
        )}

        {/* Connected state */}
        {status?.connected && (
          <div>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 4, fontFamily: 'var(--font-geist-sans)' }}>
              Signed in as: @{status.vercel_user_name}
            </p>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 16, fontFamily: 'var(--font-geist-sans)' }}>
              {status.project_count ?? 0} projects imported
            </p>
            <button
              onClick={syncProjects}
              disabled={syncing}
              style={{
                height: 36, padding: '0 16px',
                background: syncDone ? 'var(--teal-glow)' : 'var(--surface-input)',
                color: syncDone ? 'var(--teal)' : 'var(--text-secondary)',
                border: '1px solid var(--border-default)',
                borderRadius: 8, fontSize: 13,
                cursor: syncing ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--font-geist-sans)',
              }}
            >
              {syncing ? 'Syncing...' : syncDone ? '✓ Synced!' : 'Sync Now'}
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
