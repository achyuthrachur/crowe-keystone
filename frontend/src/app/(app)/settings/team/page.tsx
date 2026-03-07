'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { motion, useReducedMotion } from 'framer-motion';
import { pageVariants } from '@/lib/motion';
import { apiRequest } from '@/lib/api';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8000';

async function fetchTeam(url: string) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('keystone_token') : null;
  const res = await fetch(url, {
    credentials: 'include',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error('Failed to fetch team');
  return res.json();
}

const ROLE_COLORS: Record<string, string> = {
  admin: 'var(--amber-core)',
  lead: 'var(--indigo-bright)',
  member: 'var(--text-tertiary)',
};

export default function TeamSettingsPage() {
  const shouldReduce = useReducedMotion();
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [isInviting, setIsInviting] = useState(false);

  const { data, isLoading, mutate } = useSWR(`${BACKEND_URL}/api/v1/team`, fetchTeam, { revalidateOnFocus: false });
  const members: Array<{ id: string; name: string; email: string; role: string }> = data?.members ?? [];

  async function handleInvite() {
    if (!inviteEmail.trim()) return;
    setIsInviting(true);
    try {
      const res = await apiRequest<{ invite_link: string }>('/team/invite', {
        method: 'POST',
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      setInviteLink(res.invite_link);
      setInviteEmail('');
    } catch (err) {
      console.error('[TeamSettings] invite failed:', err);
    } finally {
      setIsInviting(false);
    }
  }

  async function handleRoleChange(userId: string, newRole: string) {
    try {
      await apiRequest(`/team/members/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ role: newRole }),
      });
      void mutate();
    } catch (err) {
      console.error('[TeamSettings] role update failed:', err);
    }
  }

  return (
    <motion.div
      variants={shouldReduce ? undefined : pageVariants}
      initial={shouldReduce ? undefined : 'initial'}
      animate={shouldReduce ? undefined : 'animate'}
      exit={shouldReduce ? undefined : 'exit'}
    >
      <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-display)', margin: '0 0 24px' }}>
        Team Settings
      </h1>

      {/* Members list */}
      <div style={{ background: 'var(--surface-elevated)', borderRadius: 10, border: '1px solid var(--border-subtle)', marginBottom: 24, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-geist-sans)' }}>
            Members {data ? `(${data.member_count})` : ''}
          </span>
        </div>
        {isLoading ? (
          <div style={{ padding: 16 }}>
            <p style={{ color: 'var(--text-tertiary)', fontSize: 12, fontFamily: 'var(--font-geist-sans)', margin: 0 }}>Loading...</p>
          </div>
        ) : (
          <div>
            {members.map((m, i) => (
              <div
                key={m.id}
                style={{
                  padding: '12px 16px',
                  display: 'flex', alignItems: 'center', gap: 12,
                  borderBottom: i < members.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                }}
              >
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--surface-selected)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', flexShrink: 0 }}>
                  {m.name[0]?.toUpperCase() ?? '?'}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-geist-sans)' }}>{m.name}</p>
                  <p style={{ margin: 0, fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'var(--font-geist-sans)' }}>{m.email}</p>
                </div>
                <select
                  value={m.role}
                  onChange={(e) => void handleRoleChange(m.id, e.target.value)}
                  style={{
                    height: 28, padding: '0 8px', borderRadius: 6,
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--surface-input)',
                    color: ROLE_COLORS[m.role] ?? 'var(--text-secondary)',
                    fontSize: 11, fontWeight: 600, fontFamily: 'var(--font-geist-sans)',
                    cursor: 'pointer',
                  }}
                >
                  <option value="member">Member</option>
                  <option value="lead">Lead</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Invite form */}
      <div style={{ background: 'var(--surface-elevated)', borderRadius: 10, border: '1px solid var(--border-subtle)', padding: 16 }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-geist-sans)' }}>
          Invite a member
        </h3>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <input
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="Email address"
            type="email"
            style={{ flex: 1, height: 36, background: 'var(--surface-input)', border: '1px solid var(--border-subtle)', borderRadius: 6, padding: '0 10px', fontSize: 12, color: 'var(--text-primary)', fontFamily: 'var(--font-geist-sans)', outline: 'none' }}
          />
          <select
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value)}
            style={{ height: 36, padding: '0 8px', borderRadius: 6, border: '1px solid var(--border-subtle)', background: 'var(--surface-input)', color: 'var(--text-secondary)', fontSize: 12, fontFamily: 'var(--font-geist-sans)', cursor: 'pointer' }}
          >
            <option value="member">Member</option>
            <option value="lead">Lead</option>
            <option value="admin">Admin</option>
          </select>
          <button
            onClick={() => void handleInvite()}
            disabled={isInviting || !inviteEmail.trim()}
            style={{ height: 36, padding: '0 14px', borderRadius: 6, border: 'none', background: isInviting || !inviteEmail.trim() ? 'var(--surface-input)' : 'var(--amber-core)', color: isInviting || !inviteEmail.trim() ? 'var(--text-tertiary)' : 'var(--surface-base)', fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-geist-sans)', cursor: isInviting || !inviteEmail.trim() ? 'not-allowed' : 'pointer' }}
          >
            {isInviting ? '...' : 'Invite'}
          </button>
        </div>
        {inviteLink && (
          <div style={{ marginTop: 8, padding: '8px 12px', background: 'var(--teal-glow)', border: '1px solid var(--teal)', borderRadius: 6 }}>
            <p style={{ margin: 0, fontSize: 11, color: 'var(--teal)', fontFamily: 'var(--font-geist-sans)' }}>
              Invite link: <code style={{ fontFamily: 'var(--font-geist-mono)' }}>{inviteLink}</code>
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
