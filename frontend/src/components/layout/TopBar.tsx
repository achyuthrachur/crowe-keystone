'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { ViewportToggle } from './ViewportToggle';
import { NotificationBell } from '../notifications/NotificationBell';
import { useNotificationStore } from '@/stores/notifications.store';
import { useMediaQuery } from '@/hooks/useMediaQuery';

interface TopBarProps {
  onMenuToggle?: () => void;
  sidebarOpen?: boolean;
}

export function TopBar({ onMenuToggle, sidebarOpen }: TopBarProps) {
  const lastPrdUpdate = useNotificationStore((s) => s.lastPrdUpdate);
  const isNarrow = useMediaQuery('(max-width: 600px)');

  return (
    <header
      data-testid="top-bar"
      style={{
        height: '3.5rem',
        background: 'var(--surface-base)',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        gap: 16,
        position: 'sticky',
        top: 0,
        zIndex: 40,
        flexShrink: 0,
      }}
    >
      {/* Hamburger (mobile only — shown when onMenuToggle is provided) */}
      {onMenuToggle && (
        <button
          onClick={onMenuToggle}
          aria-label={sidebarOpen ? 'Close navigation' : 'Open navigation'}
          aria-expanded={sidebarOpen}
          style={{
            width: 32, height: 32, borderRadius: 8, border: 'none',
            background: 'transparent', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-secondary)', flexShrink: 0,
          }}
        >
          {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      )}

      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <div
          style={{
            width: 20,
            height: 20,
            background: 'var(--amber-core)',
            borderRadius: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
            fontWeight: 800,
            color: 'var(--text-inverse)',
            fontFamily: 'var(--font-geist-sans)',
          }}
        >
          K
        </div>
        <span
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-geist-sans)',
          }}
        >
          Keystone
        </span>
      </div>

      {/* Search bar (center) — hidden on narrow viewports */}
      <div style={{ flex: 1, display: isNarrow ? 'none' : 'flex', justifyContent: 'center', minWidth: 0 }}>
        <div
          style={{
            width: '100%',
            maxWidth: 320,
            height: 32,
            background: 'var(--surface-input)',
            borderRadius: 8,
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            padding: '0 12px',
            gap: 8,
            cursor: 'text',
          }}
        >
          <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>🔍</span>
          <span
            style={{
              fontSize: 13,
              color: 'var(--text-tertiary)',
              fontFamily: 'var(--font-geist-sans)',
              flex: 1,
            }}
          >
            Search projects, PRDs...
          </span>
          <kbd
            style={{
              fontSize: 10,
              color: 'var(--text-tertiary)',
              background: 'var(--surface-overlay)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 4,
              padding: '1px 5px',
              fontFamily: 'var(--font-geist-mono)',
            }}
          >
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right side controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        {/* PRD version badge — appears briefly after prd.updated SSE fires, hidden on narrow */}
        {!isNarrow && (
          <AnimatePresence>
            {lastPrdUpdate && (
              <motion.span
                key={`prd-${lastPrdUpdate.project_id}-${lastPrdUpdate.version}`}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.15 }}
                data-testid="prd-version-badge"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '2px 8px',
                  borderRadius: 999,
                  fontSize: 11,
                  fontWeight: 600,
                  background: 'var(--amber-glow)',
                  border: '1px solid var(--amber-core)',
                  color: 'var(--amber-core)',
                  fontFamily: 'var(--font-geist-mono)',
                }}
              >
                PRD v{lastPrdUpdate.version}
              </motion.span>
            )}
          </AnimatePresence>
        )}
        {!isNarrow && <ViewportToggle />}
        <NotificationBell />

        {/* User avatar */}
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: 'var(--surface-selected)',
            border: '1px solid var(--border-default)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--text-primary)',
            cursor: 'pointer',
          }}
        >
          A
        </div>
      </div>
    </header>
  );
}
