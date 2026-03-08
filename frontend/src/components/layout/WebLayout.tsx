'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { useMediaQuery } from '@/hooks/useMediaQuery';

interface WebLayoutProps {
  children: React.ReactNode;
}

export function WebLayout({ children }: WebLayoutProps) {
  const isMobile = useMediaQuery('(max-width: 767px)');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div
      className="flex flex-col min-h-screen"
      style={{ background: 'var(--surface-base)' }}
    >
      <TopBar
        onMenuToggle={isMobile ? () => setSidebarOpen((o) => !o) : undefined}
        sidebarOpen={sidebarOpen}
      />
      <div className="flex flex-1 overflow-hidden" style={{ position: 'relative' }}>
        {/* Mobile: overlay sidebar drawer */}
        {isMobile ? (
          <AnimatePresence>
            {sidebarOpen && (
              <>
                {/* Backdrop */}
                <motion.div
                  key="sidebar-backdrop"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => setSidebarOpen(false)}
                  style={{
                    position: 'fixed', inset: 0, zIndex: 39,
                    background: 'rgba(1,30,65,0.4)',
                  }}
                />
                {/* Sidebar drawer */}
                <motion.div
                  key="sidebar-drawer"
                  initial={{ x: -240 }}
                  animate={{ x: 0 }}
                  exit={{ x: -240 }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  style={{
                    position: 'fixed', top: '3.5rem', left: 0, bottom: 0,
                    width: 240, zIndex: 40,
                    boxShadow: '4px 0 24px rgba(1,30,65,0.15)',
                  }}
                >
                  <Sidebar onNavigate={() => setSidebarOpen(false)} />
                </motion.div>
              </>
            )}
          </AnimatePresence>
        ) : (
          <Sidebar />
        )}

        <main
          className="flex-1 overflow-y-auto p-8"
          style={{ minHeight: 'calc(100vh - 3.5rem)' }}
          aria-label="Main content"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
