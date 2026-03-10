'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';
import { authPageVariants } from '@/lib/motion';
import { apiRequest } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const shouldReduce = useReducedMotion();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await apiRequest<{ token: string; user: { id: string } }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      if (typeof window !== 'undefined') localStorage.setItem('keystone_token', data.token);
      router.push('/projects');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sign in failed';
      if (msg.includes('401') || msg.includes('Invalid')) {
        setError('Invalid email or password. Please try again.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

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
          {/* Logo (mobile only — shown on narrow viewport when left panel is hidden) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 32 }}>
            <div style={{ width: 32, height: 32, background: 'var(--amber-core)', borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, fontWeight: 800, color: 'var(--indigo-dark)' }}>K</div>
            <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)',
              fontFamily: 'var(--font-display)' }}>Keystone</span>
          </div>

          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)',
            marginBottom: 8, fontFamily: 'var(--font-display)' }}>
            Sign in to Keystone
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 24 }}>
            Enter your credentials to continue
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                style={{
                  width: '100%', height: 40, background: 'var(--surface-input)',
                  border: '1px solid var(--border-default)', borderRadius: 8,
                  padding: '0 12px', color: 'var(--text-primary)', fontSize: 14,
                  fontFamily: 'var(--font-geist-sans)', outline: 'none', boxSizing: 'border-box',
                  transition: 'border-color 150ms',
                }}
                onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = 'var(--border-amber)'; }}
                onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = 'var(--border-default)'; }}
              />
            </div>

            <div>
              <label style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your password"
                  required
                  style={{
                    width: '100%', height: 40, background: 'var(--surface-input)',
                    border: '1px solid var(--border-default)', borderRadius: 8,
                    padding: '0 40px 0 12px', color: 'var(--text-primary)', fontSize: 14,
                    fontFamily: 'var(--font-geist-sans)', outline: 'none', boxSizing: 'border-box',
                    transition: 'border-color 150ms',
                  }}
                  onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = 'var(--border-amber)'; }}
                  onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = 'var(--border-default)'; }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', color: 'var(--text-tertiary)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center',
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <p style={{ color: 'var(--coral)', fontSize: 13, margin: 0 }}>{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                height: 44, background: 'var(--amber-core)', color: 'var(--indigo-dark)',
                border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
                fontFamily: 'var(--font-geist-sans)',
              }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--text-tertiary)' }}>
            {"Don't have an account? "}
            <a href="/auth/register" style={{ color: 'var(--amber-core)', textDecoration: 'none' }}>
              Create account
            </a>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
