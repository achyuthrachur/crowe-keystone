'use client';

import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Layers, GitBranch, Inbox, Brain, Sun, Plus } from 'lucide-react';
import { useNotificationStore } from '@/stores/notifications.store';
import { useState } from 'react';
import { SparkInput } from '../projects/SparkInput';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  symbol: string;
  showBadge?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/projects', label: 'Projects', icon: Layers, symbol: '✦' },
  { href: '/graph',    label: 'Graph',    icon: GitBranch, symbol: '⬡' },
  { href: '/inbox',    label: 'Inbox',    icon: Inbox, symbol: '⬤', showBadge: true },
  { href: '/memory',   label: 'Memory',   icon: Brain, symbol: '◎' },
  { href: '/daily',    label: 'Today',    icon: Sun, symbol: '◍' },
];

const PRESENCE_USERS = [
  { id: '1', name: 'Achyuth', color: 'var(--teal)', status: 'online' },
  { id: '2', name: 'Alex', color: 'var(--amber-core)', status: 'away' },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const pendingCount = useNotificationStore((s) => s.pendingCount);
  const [sparkOpen, setSparkOpen] = useState(false);

  return (
    <>
      <aside
        data-testid="sidebar"
        style={{
          width: 240,
          height: 'calc(100vh - 3.5rem)',
          position: 'sticky',
          top: '3.5rem',
          background: 'var(--surface-base)',
          borderRight: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          padding: '12px 12px 16px',
          flexShrink: 0,
        }}
      >
        {/* Nav items */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {NAV_ITEMS.map(({ href, label, icon: Icon, symbol, showBadge }) => {
            const isActive = pathname.startsWith(href);
            return (
              <button
                key={href}
                onClick={() => router.push(href)}
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  height: 44,
                  padding: '0 12px',
                  borderRadius: 8,
                  border: 'none',
                  cursor: 'pointer',
                  background: isActive ? 'var(--surface-selected)' : 'transparent',
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontSize: 14,
                  fontWeight: isActive ? 500 : 400,
                  fontFamily: 'var(--font-geist-sans)',
                  transition: 'all 150ms ease-out',
                  textAlign: 'left',
                  overflow: 'hidden',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-hover)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                  }
                }}
              >
                {/* Amber active indicator */}
                <AnimatePresence>
                  {isActive && (
                    <motion.div
                      layoutId="active-nav-indicator"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: 6,
                        bottom: 6,
                        width: 2,
                        background: 'var(--amber-core)',
                        borderRadius: '0 2px 2px 0',
                      }}
                    />
                  )}
                </AnimatePresence>

                <Icon
                  size={16}
                  color={isActive ? 'var(--amber-core)' : 'var(--text-secondary)'}
                />
                <span style={{ flex: 1 }}>{label}</span>

                {/* Badge */}
                {showBadge && pendingCount > 0 && (
                  <span
                    style={{
                      minWidth: 18,
                      height: 18,
                      borderRadius: 9,
                      background: 'var(--coral)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 10,
                      fontWeight: 700,
                      color: 'white',
                      padding: '0 4px',
                    }}
                  >
                    {pendingCount > 9 ? '9+' : pendingCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Divider */}
        <div style={{ height: 1, background: 'var(--border-subtle)', margin: '12px 0' }} />

        {/* New Spark button */}
        <button
          onClick={() => setSparkOpen(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            height: 36,
            borderRadius: 8,
            border: 'none',
            cursor: 'pointer',
            background: 'var(--amber-core)',
            color: 'var(--text-inverse)',
            fontSize: 13,
            fontWeight: 600,
            fontFamily: 'var(--font-geist-sans)',
            transition: 'opacity 150ms',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.9'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
        >
          <Plus size={14} />
          New Spark
        </button>

        {/* Presence section */}
        <div style={{ marginTop: 'auto', paddingTop: 16 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--text-tertiary)',
              marginBottom: 8,
            }}
          >
            Online
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {PRESENCE_USERS.map((user) => (
              <div
                key={user.id}
                title={user.name}
                style={{
                  position: 'relative',
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  background: 'var(--surface-input)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 10,
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                }}
              >
                {user.name[0]}
                <span
                  style={{
                    position: 'absolute',
                    bottom: -1,
                    right: -1,
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: user.color,
                    border: '1px solid var(--surface-base)',
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </aside>

      {sparkOpen && <SparkInput onClose={() => setSparkOpen(false)} />}
    </>
  );
}
