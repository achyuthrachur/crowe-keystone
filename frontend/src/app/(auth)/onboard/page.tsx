'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { cardVariants } from '@/lib/motion';

export default function OnboardPage() {
  const [teamName, setTeamName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      window.location.href = '/projects';
    }, 800);
  };

  return (
    <div
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
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ textAlign: 'center', marginBottom: 32 }}
        >
          <h1
            style={{
              fontSize: 28,
              fontWeight: 800,
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-display)',
              margin: '0 0 8px',
            }}
          >
            Create your team
          </h1>
          <p
            style={{
              fontSize: 14,
              color: 'var(--text-secondary)',
              fontFamily: 'var(--font-geist-sans)',
              margin: 0,
            }}
          >
            {"Set up your workspace. You'll be the team admin."}
          </p>
        </motion.div>

        <motion.div
          variants={cardVariants}
          initial="initial"
          animate="animate"
          style={{
            background: 'var(--surface-elevated)',
            borderRadius: 16,
            padding: 24,
            border: '1px solid var(--border-subtle)',
          }}
        >
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
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
                Team name
              </label>
              <input
                type="text"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="e.g. Crowe Innovation Lab"
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
                }}
              />
            </div>
            <button
              type="submit"
              disabled={!teamName.trim() || submitting}
              style={{
                width: '100%',
                height: 44,
                borderRadius: 8,
                border: 'none',
                background: teamName.trim() && !submitting ? 'var(--amber-core)' : 'var(--surface-input)',
                color: teamName.trim() && !submitting ? 'var(--text-inverse)' : 'var(--text-tertiary)',
                fontSize: 14,
                fontWeight: 600,
                fontFamily: 'var(--font-geist-sans)',
                cursor: teamName.trim() && !submitting ? 'pointer' : 'not-allowed',
              }}
            >
              {submitting ? 'Creating...' : 'Create team →'}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
