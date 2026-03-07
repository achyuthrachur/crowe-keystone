'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { MobileGraphList } from './MobileGraphList';

function GraphSkeleton() {
  return (
    <div
      style={{
        height: '100%',
        background: 'var(--surface-base)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <span
        style={{
          color: 'var(--text-tertiary)',
          fontSize: 14,
          fontFamily: 'var(--font-geist-sans)',
        }}
      >
        Loading graph...
      </span>
    </div>
  );
}

const KeystoneGraph = dynamic(() => import('./KeystoneGraph'), {
  ssr: false,
  loading: () => <GraphSkeleton />,
});

export function GraphView() {
  const isSmall = useMediaQuery('(max-width: 639px)');

  if (isSmall) {
    return <MobileGraphList />;
  }

  return <KeystoneGraph />;
}
