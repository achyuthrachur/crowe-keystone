'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { cardVariants, tapVariants } from '@/lib/motion';
import { Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Phase 1: stub login — Phase 2 wires real NextAuth
    setTimeout(() => {
      setLoading(false);
      window.location.href = '/projects';
    }, 800);
  };

  return (
    <div
      className="bg-dots"
      style={{
        minHeight: '100vh',
        background: 'var(--surface-base)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div style={{ width: '100%', maxWidth: 360 }}>
        {/* Logo + title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          style={{ textAlign: 'center', marginBottom: 32 }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              background: 'var(--amber-core)',
              borderRadius: 12,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 24,
              fontWeight: 800,
              color: 'var(--text-inverse)',
              fontFamily: 'var(--font-geist-sans)',
              marginBottom: 16,
            }}
          >
            K
          </div>
          <h1
            style={{
              fontSize: 32,
              fontWeight: 800,
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-display)',
              margin: '0 0 8px',
            }}
          >
            Keystone
          </h1>
          <p
            style={{
              fontSize: 14,
              color: 'var(--text-secondary)',
              fontFamily: 'var(--font-geist-sans)',
              margin: 0,
            }}
          >
            Where AI teams build together
          </p>
        </motion.div>

        {/* Form card */}
        <motion.div
          variants={cardVariants}
          initial="initial"
          animate="animate"
          transition={{ delay: 0.15 }}
          style={{
            background: 'var(--surface-elevated)',
            borderRadius: 20,
            padding: 24,
            border: '1px solid var(--border-subtle)',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          <form onSubmit={handleSubmit}>
            {/* Email */}
            <div style={{ marginBottom: 14 }}>
              <label
                style={{
                  display: 'block',
                  fontSize: 13,
                  fontWeight: 500,
                  color: 'var(--text-secondary)',
                  fontFamily: 'var(--font-geist-sans)',
                  marginBottom: 6,
                }}
              >
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@crowe.com"
                required
                style={{
                  width: '100%',
                  height: 44,
                  background: 'var(--surface-input)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 8,
                  padding: '0 14px',
                  fontSize: 14,
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-geist-sans)',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 150ms',
                }}
                onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = 'var(--border-amber)'; }}
                onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = 'var(--border-subtle)'; }}
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom: 20 }}>
              <label
                style={{
                  display: 'block',
                  fontSize: 13,
                  fontWeight: 500,
                  color: 'var(--text-secondary)',
                  fontFamily: 'var(--font-geist-sans)',
                  marginBottom: 6,
                }}
              >
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  style={{
                    width: '100%',
                    height: 44,
                    background: 'var(--surface-input)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 8,
                    padding: '0 40px 0 14px',
                    fontSize: 14,
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-geist-sans)',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'border-color 150ms',
                  }}
                  onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = 'var(--border-amber)'; }}
                  onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = 'var(--border-subtle)'; }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-tertiary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <motion.button
              variants={tapVariants}
              whileTap="tap"
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                height: 44,
                borderRadius: 8,
                border: 'none',
                background: loading ? 'var(--surface-input)' : 'var(--amber-core)',
                color: loading ? 'var(--text-tertiary)' : 'var(--text-inverse)',
                fontSize: 14,
                fontWeight: 600,
                fontFamily: 'var(--font-geist-sans)',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background 150ms',
              }}
            >
              {loading ? 'Signing in...' : 'Sign in →'}
            </motion.button>
          </form>
        </motion.div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          style={{
            textAlign: 'center',
            marginTop: 24,
            fontSize: 13,
            color: 'var(--text-tertiary)',
            fontFamily: 'var(--font-geist-sans)',
          }}
        >
          {"Don't have a team? Contact Achyuth to get started."}
        </motion.p>
      </div>
    </div>
  );
}
