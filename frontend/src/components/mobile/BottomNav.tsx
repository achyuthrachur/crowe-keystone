'use client';

import { Layers, GitBranch, Inbox, Sun } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { navTapVariants } from '@/lib/motion';
import { useNotificationStore } from '@/stores/notifications.store';

interface TabItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  showBadge?: boolean;
}

const tabs: TabItem[] = [
  { href: '/projects', label: 'Projects', icon: Layers },
  { href: '/graph',    label: 'Graph',    icon: GitBranch },
  { href: '/inbox',    label: 'Inbox',    icon: Inbox, showBadge: true },
  { href: '/daily',    label: 'Today',    icon: Sun },
];

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const pendingCount = useNotificationStore((s) => s.pendingCount);

  return (
    <nav
      data-testid="bottom-nav"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: 83,
        paddingBottom: 'env(safe-area-inset-bottom)',
        background: 'rgba(15,22,35,0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        zIndex: 50,
      }}
    >
      {tabs.map(({ href, label, icon: Icon, showBadge }) => {
        const isActive = pathname.startsWith(href);
        return (
          <motion.button
            key={href}
            variants={navTapVariants}
            whileTap="tap"
            onClick={() => router.push(href)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              height: 49,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              position: 'relative',
            }}
          >
            {/* Amber indicator bar above active tab */}
            {isActive && (
              <motion.div
                layoutId="bottom-nav-indicator"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: '20%',
                  right: '20%',
                  height: 2,
                  background: 'var(--amber-core)',
                  borderRadius: '0 0 2px 2px',
                }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}

            {/* Badge for Inbox */}
            {showBadge && pendingCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: 4,
                  right: '20%',
                  minWidth: 16,
                  height: 16,
                  borderRadius: 8,
                  background: 'var(--coral)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 10,
                  fontWeight: 600,
                  color: 'white',
                  padding: '0 4px',
                }}
              >
                {pendingCount > 9 ? '9+' : pendingCount}
              </span>
            )}

            <Icon size={22} color={isActive ? 'var(--amber-core)' : 'var(--text-tertiary)'} />
            <span
              style={{
                fontSize: 10,
                fontWeight: isActive ? 600 : 400,
                color: isActive ? 'var(--amber-core)' : 'var(--text-tertiary)',
                fontFamily: 'var(--font-geist-sans)',
              }}
            >
              {label}
            </span>
          </motion.button>
        );
      })}
    </nav>
  );
}
