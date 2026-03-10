'use client';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useThemeStore } from '@/stores/theme.store';
import { themeIconVariants } from '@/lib/motion';

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { resolved, setTheme } = useThemeStore();
  const shouldReduce = useReducedMotion();
  const isDark = resolved === 'dark';

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      data-testid="theme-toggle"
      style={{
        width: compact ? 32 : 36,
        height: compact ? 32 : 36,
        borderRadius: 8,
        border: '1px solid var(--border-subtle)',
        background: 'var(--surface-input)',
        color: 'var(--text-secondary)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: compact ? 14 : 16,
        flexShrink: 0,
        transition: 'transform 75ms ease',
      }}
      onMouseDown={(e) => { if (!shouldReduce) (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.88)'; }}
      onMouseUp={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = ''; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = ''; }}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={resolved}
          variants={shouldReduce ? undefined : themeIconVariants}
          initial={shouldReduce ? undefined : 'initial'}
          animate={shouldReduce ? undefined : 'animate'}
          exit={shouldReduce ? undefined : 'exit'}
          style={{ display: 'flex', alignItems: 'center' }}
        >
          {isDark ? '☀️' : '🌙'}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}
