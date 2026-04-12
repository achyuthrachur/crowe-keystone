'use client';

import { WebLayout } from './WebLayout';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return <WebLayout>{children}</WebLayout>;
}
