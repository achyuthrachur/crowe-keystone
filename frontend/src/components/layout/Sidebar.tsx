'use client';

import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { FolderOpen, Settings, Smartphone } from 'lucide-react';
import { useNotificationStore } from '@/stores/notifications.store';


interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  symbol: string;
  showBadge?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/engagements', label: 'Engagements', icon: FolderOpen, symbol: '◈', showBadge: false },
  { href: '/settings',    label: 'Settings',    icon: Settings,    symbol: '⚙', showBadge: false },
];

interface SidebarProps {
  onNavigate?: () => void;
}

export function Sidebar({ onNavigate }: SidebarProps = {}) {
  const pathname = usePathname();
  const router = useRouter();
  const pendingCount = useNotificationStore((s) => s.pendingCount);
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
                onClick={() => { router.push(href); onNavigate?.(); }}
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

        {/* Install App link */}
        <button
          onClick={() => { router.push('/install'); onNavigate?.(); }}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            height: 36, padding: '0 12px', borderRadius: 8, border: 'none',
            cursor: 'pointer', background: 'transparent',
            color: 'var(--text-tertiary)', fontSize: 13,
            fontWeight: 400, fontFamily: 'var(--font-geist-sans)',
            transition: 'all 150ms ease-out', marginTop: 8,
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-hover)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
        >
          <Smartphone size={14} color="var(--text-tertiary)" />
          Install App
        </button>

      </aside>

    </>
  );
}
