'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Bell } from 'lucide-react';
import { useNotificationStore } from '@/stores/notifications.store';
import { NotificationPanel } from './NotificationPanel';

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const shouldReduce = useReducedMotion();
  const pendingCount = useNotificationStore((s) => s.pendingCount);

  // Track previous count to detect new notifications and trigger bounce
  const prevCountRef = useRef(pendingCount);
  const [bouncing, setBouncing] = useState(false);

  useEffect(() => {
    if (pendingCount > prevCountRef.current) {
      setBouncing(true);
      const t = setTimeout(() => setBouncing(false), 600);
      prevCountRef.current = pendingCount;
      return () => clearTimeout(t);
    }
    prevCountRef.current = pendingCount;
  }, [pendingCount]);

  return (
    <>
      <motion.button
        data-testid="notification-bell"
        aria-label={pendingCount > 0 ? `Notifications — ${pendingCount} pending` : 'Notifications'}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((o) => !o)}
        animate={
          bouncing && !shouldReduce
            ? { y: [0, -4, 2, -2, 0], transition: { duration: 0.5, ease: 'easeInOut' } }
            : { y: 0 }
        }
        style={{
          position: 'relative',
          width: 32,
          height: 32,
          borderRadius: 8,
          border: open
            ? '1px solid var(--border-default)'
            : '1px solid transparent',
          background: open ? 'var(--surface-hover)' : 'transparent',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'background 150ms ease-out, border-color 150ms ease-out',
        }}
      >
        <Bell size={16} color="var(--text-secondary)" />

        <AnimatePresence>
          {pendingCount > 0 && (
            <motion.span
              key="badge"
              data-testid="notification-badge"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
              style={{
                position: 'absolute',
                top: 3,
                right: 3,
                minWidth: 14,
                height: 14,
                borderRadius: 7,
                background: 'var(--coral)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 9,
                fontWeight: 700,
                color: 'white',
                padding: '0 3px',
                fontFamily: 'var(--font-geist-sans)',
                pointerEvents: 'none',
              }}
            >
              {pendingCount > 9 ? '9+' : pendingCount}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      <AnimatePresence>
        {open && <NotificationPanel onClose={() => setOpen(false)} />}
      </AnimatePresence>
    </>
  );
}
