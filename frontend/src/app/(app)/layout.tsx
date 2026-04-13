'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { useSSE } from '@/hooks/useSSE';
import { getStoredToken } from '@/stores/auth.store';

function SSEInitializer() {
  useSSE(); // Initializes SSE connection
  return null;
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    if (!getStoredToken()) {
      router.replace('/login');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!getStoredToken()) return null;
  return <>{children}</>;
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <SSEInitializer />
      <AppShell>{children}</AppShell>
    </AuthGuard>
  );
}
