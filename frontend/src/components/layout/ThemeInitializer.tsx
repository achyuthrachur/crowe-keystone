'use client';
import { useEffect } from 'react';
import { useThemeStore } from '@/stores/theme.store';

export function ThemeInitializer() {
  const initTheme = useThemeStore((s) => s.initTheme);
  useEffect(() => { initTheme(); }, [initTheme]);
  return null;
}
