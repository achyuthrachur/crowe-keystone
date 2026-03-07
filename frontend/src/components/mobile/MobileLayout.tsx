'use client';

import { MobileTopBar } from './MobileTopBar';
import { BottomNav } from './BottomNav';
import { usePathname } from 'next/navigation';

const ROUTE_TITLES: Record<string, string> = {
  '/projects': 'Projects',
  '/graph': 'Graph',
  '/inbox': 'Inbox',
  '/memory': 'Memory',
  '/daily': 'Today',
  '/settings': 'Settings',
};

function getRouteTitle(pathname: string): string {
  // Try exact match first
  if (ROUTE_TITLES[pathname]) return ROUTE_TITLES[pathname];
  // Try prefix match
  for (const [prefix, title] of Object.entries(ROUTE_TITLES)) {
    if (pathname.startsWith(prefix)) return title;
  }
  return 'Keystone';
}

interface MobileLayoutProps {
  children: React.ReactNode;
}

export function MobileLayout({ children }: MobileLayoutProps) {
  const pathname = usePathname();
  const title = getRouteTitle(pathname);

  return (
    <div
      data-testid="mobile-layout"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: '100svh',
        background: 'var(--surface-base)',
        position: 'relative',
      }}
    >
      <MobileTopBar title={title} />
      <main
        className="scroll-momentum"
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px',
          paddingBottom: 'calc(83px + env(safe-area-inset-bottom))',
          overscrollBehaviorY: 'contain',
        }}
      >
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
