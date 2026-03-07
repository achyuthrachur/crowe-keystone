'use client';

import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

interface WebLayoutProps {
  children: React.ReactNode;
}

export function WebLayout({ children }: WebLayoutProps) {
  return (
    <div
      className="flex flex-col min-h-screen"
      style={{ background: 'var(--surface-base)' }}
    >
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main
          className="flex-1 overflow-y-auto p-8"
          style={{ minHeight: 'calc(100vh - 3.5rem)' }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
