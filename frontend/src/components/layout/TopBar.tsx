'use client';

import { ViewportToggle } from './ViewportToggle';
import { NotificationBell } from '../notifications/NotificationBell';

export function TopBar() {
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

      {/* Search bar (center) */}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
        <div
          style={{
            width: 320,
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
        <ViewportToggle />
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
