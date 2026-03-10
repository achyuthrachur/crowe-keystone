'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

const ONBOARDING_KEY = 'keystone-onboarding-dismissed';

export function OnboardingBanner() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!localStorage.getItem(ONBOARDING_KEY)) setShow(true);
  }, []);

  function dismiss() {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    setShow(false);
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.3 }}
          style={{ background: 'var(--amber-glow)', border: '1px solid var(--border-amber)',
            borderRadius: 10, padding: '14px 16px', marginBottom: 16,
            display: 'flex', flexDirection: 'column', gap: 10 }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <div style={{ color: 'var(--amber-core)', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
                Welcome to Crowe Keystone
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                You are the first user — you have admin access. Here is how to get started:
              </div>
            </div>
            <button onClick={dismiss}
              style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: 16, padding: 4 }}
              aria-label="Dismiss">x</button>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[
              { href: '/settings/connected-apps', label: '1. Connect Vercel' },
              { href: '/settings/team', label: '2. Invite team members' },
              { href: '/install', label: '3. Install on your phone' },
            ].map(({ href, label }) => (
              <Link key={href} href={href} style={{
                fontSize: 12, fontWeight: 600, color: 'var(--amber-core)', textDecoration: 'none',
                background: 'rgba(245,168,0,0.15)', padding: '6px 12px', borderRadius: 6,
                border: '1px solid var(--border-amber)',
              }}>{label}</Link>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
