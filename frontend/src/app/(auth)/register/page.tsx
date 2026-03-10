'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';
import { authPageVariants } from '@/lib/motion';
import { apiRequest } from '@/lib/api';

function PasswordStrength({ password }: { password: string }) {
  const strength = password.length === 0 ? 0
    : password.length < 8 ? 1
    : (password.length >= 12 && /[0-9]/.test(password) && /[^a-zA-Z0-9]/.test(password)) ? 3
    : (password.length >= 8 && (/[A-Z]/.test(password) || /[0-9]/.test(password))) ? 2
    : 1;
  const colors = ['transparent', 'var(--coral)', 'var(--amber-core)', 'var(--teal)'];
  return (
    <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
      {[1, 2, 3].map((i) => (
        <div key={i} style={{
          flex: 1, height: 3, borderRadius: 2,
          background: i <= strength ? colors[strength] : 'var(--border-default)',
          transition: 'background 200ms',
        }} />
      ))}
    </div>
  );
}

interface InviteContext { email: string; role: string; team_name: string; invited_by_name: string; }

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get('token');
  const shouldReduce = useReducedMotion();

  const [inviteCtx, setInviteCtx] = useState<InviteContext | null>(null);
  const [inviteError, setInviteError] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!inviteToken) return;
    apiRequest<InviteContext>(`/auth/invite/${inviteToken}`)
      .then((ctx) => { setInviteCtx(ctx); setEmail(ctx.email); })
      .catch(() => setInviteError('This invitation link is invalid or has expired.'));
  }, [inviteToken]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password !== confirm) { setError("Passwords don't match."); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setLoading(true);
    try {
      const data = await apiRequest<{ token: string }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, name, password, invite_token: inviteToken || undefined }),
      });
      if (typeof window !== 'undefined') localStorage.setItem('keystone_token', data.token);
      setSuccess(true);
      setTimeout(() => router.push('/projects'), 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed';
      if (msg.includes('409') || msg.includes('already exists')) {
        setError('An account with this email already exists. Sign in instead?');
      } else if (msg.includes('invitation') || msg.includes('invite')) {
        setError('This invitation link is invalid or has expired.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--surface-base)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--teal)', marginBottom: 8 }}>
            Account created!
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Redirecting to your projects...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex' }}>
      {/* Left panel — always dark */}
      <div className="hidden-mobile" style={{
        flex: '0 0 420px', background: '#011E41', padding: '48px 40px',
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
      }}>
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ width: 32, height: 32, background: '#F5A800', borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, fontWeight: 800, color: '#011E41' }}>K</div>
            <span style={{ fontSize: 22, fontWeight: 700, color: '#f0f4ff',
              fontFamily: 'var(--font-display)' }}>Crowe Keystone</span>
          </div>
          <p style={{ color: 'rgba(240,244,255,0.6)', fontSize: 14 }}>
            Where AI teams build together
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {['AI drafts PRDs and daily updates', 'Conflicts surface before they cost a sprint', 'Push notifications, no email required'].map((text) => (
            <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ color: '#F5A800', fontSize: 16 }}>✓</span>
              <span style={{ color: 'rgba(240,244,255,0.8)', fontSize: 14 }}>{text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--surface-base)', padding: '32px 24px',
      }}>
        <motion.div
          variants={shouldReduce ? undefined : authPageVariants}
          initial={shouldReduce ? undefined : 'initial'}
          animate={shouldReduce ? undefined : 'animate'}
          style={{ width: '100%', maxWidth: 400 }}
        >
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)',
            marginBottom: 8, fontFamily: 'var(--font-display)' }}>
            Create your account
          </h1>

          {inviteCtx && (
            <div style={{ background: 'var(--teal-glow)', border: '1px solid var(--border-teal)',
              borderRadius: 10, padding: '12px 16px', marginBottom: 20 }}>
              <p style={{ color: 'var(--teal)', fontSize: 13, margin: 0 }}>
                <strong>{inviteCtx.invited_by_name}</strong> invited you to join{' '}
                <strong>{inviteCtx.team_name}</strong> as a <strong>{inviteCtx.role}</strong>.
              </p>
            </div>
          )}

          {inviteError && (
            <div style={{ background: 'var(--coral-glow)', border: '1px solid var(--border-coral)',
              borderRadius: 10, padding: '12px 16px', marginBottom: 20,
              color: 'var(--coral)', fontSize: 13 }}>
              {inviteError}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                Full name
              </label>
              <input
                type="text" name="name" value={name} onChange={(e) => setName(e.target.value)}
                required placeholder="Your name"
                style={{ width: '100%', height: 40, background: 'var(--surface-input)',
                  border: '1px solid var(--border-default)', borderRadius: 8,
                  padding: '0 12px', color: 'var(--text-primary)', fontSize: 14,
                  fontFamily: 'var(--font-geist-sans)', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                Email
              </label>
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                required placeholder="you@company.com" disabled={!!inviteCtx}
                style={{ width: '100%', height: 40, background: inviteCtx ? 'var(--surface-hover)' : 'var(--surface-input)',
                  border: '1px solid var(--border-default)', borderRadius: 8,
                  padding: '0 12px', color: 'var(--text-primary)', fontSize: 14,
                  fontFamily: 'var(--font-geist-sans)', outline: 'none', boxSizing: 'border-box',
                  opacity: inviteCtx ? 0.7 : 1 }}
              />
            </div>
            <div>
              <label style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                Password
              </label>
              <input
                type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                required minLength={8} placeholder="At least 8 characters"
                style={{ width: '100%', height: 40, background: 'var(--surface-input)',
                  border: '1px solid var(--border-default)', borderRadius: 8,
                  padding: '0 12px', color: 'var(--text-primary)', fontSize: 14,
                  fontFamily: 'var(--font-geist-sans)', outline: 'none', boxSizing: 'border-box' }}
              />
              <PasswordStrength password={password} />
            </div>
            <div>
              <label style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                Confirm password
              </label>
              <input
                type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
                required placeholder="Repeat password"
                style={{ width: '100%', height: 40, background: 'var(--surface-input)',
                  border: '1px solid var(--border-default)', borderRadius: 8,
                  padding: '0 12px', color: 'var(--text-primary)', fontSize: 14,
                  fontFamily: 'var(--font-geist-sans)', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            {error && (
              <p style={{ color: 'var(--coral)', fontSize: 13, margin: 0 }}>{error}</p>
            )}

            <button
              type="submit" disabled={loading}
              style={{ height: 44, background: 'var(--amber-core)', color: 'var(--indigo-dark)',
                border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
                fontFamily: 'var(--font-geist-sans)' }}
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--text-tertiary)' }}>
            Already have an account?{' '}
            <a href="/auth/login" style={{ color: 'var(--amber-core)', textDecoration: 'none' }}>
              Sign in
            </a>
          </p>
        </motion.div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: 'var(--surface-base)' }} />}>
      <RegisterForm />
    </Suspense>
  );
}
