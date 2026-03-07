'use client';

import { Monitor, Smartphone } from 'lucide-react';
import { motion } from 'framer-motion';
import { useViewportStore } from '@/stores/viewport.store';
import { viewportIndicatorTransition } from '@/lib/motion';

export function ViewportToggle() {
  const { mode, setMode, isMobileDevice } = useViewportStore();
  if (isMobileDevice) return null;

  return (
    <div
      data-testid="viewport-toggle"
      style={{
        display: 'flex',
        background: 'var(--surface-input)',
        borderRadius: 8,
        padding: 3,
        gap: 2,
        border: '1px solid var(--border-subtle)',
      }}
    >
      {(['web', 'mobile'] as const).map((m) => (
        <motion.button
          key={m}
          onClick={() => setMode(m)}
          whileTap={{ scale: 0.95 }}
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            padding: '4px 10px',
            borderRadius: 6,
            border: 'none',
            cursor: 'pointer',
            background: 'transparent',
            color: mode === m ? 'var(--text-primary)' : 'var(--text-tertiary)',
            fontSize: 12,
            fontWeight: 500,
            fontFamily: 'var(--font-geist-sans)',
            zIndex: 1,
            transition: 'color 150ms',
          }}
        >
          {mode === m && (
            <motion.div
              layoutId="viewport-indicator"
              transition={viewportIndicatorTransition}
              style={{
                position: 'absolute',
                inset: 0,
                background: 'var(--surface-selected)',
                border: '1px solid var(--border-default)',
                borderRadius: 5,
                zIndex: -1,
              }}
            />
          )}
          {m === 'web' ? <Monitor size={12} /> : <Smartphone size={12} />}
          {m === 'web' ? 'Web' : 'Mobile'}
        </motion.button>
      ))}
    </div>
  );
}
