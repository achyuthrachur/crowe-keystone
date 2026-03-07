'use client';

import { AppShell } from '@/components/layout/AppShell';
import { useSSE } from '@/hooks/useSSE';

function SSEInitializer() {
  useSSE(); // Initializes SSE connection
  return null;
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SSEInitializer />
      <AppShell>{children}</AppShell>
    </>
  );
}
