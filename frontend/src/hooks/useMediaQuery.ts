'use client';

import { useState, useEffect } from 'react';

export function useMediaQuery(query: string): boolean {
  // Always start false to prevent SSR/client hydration mismatch.
  // Correct value is applied in useEffect after mount.
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia(query);
    setMatches(mq.matches);

    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [query]);

  return matches;
}
