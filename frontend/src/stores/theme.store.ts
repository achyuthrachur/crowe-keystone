import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemePreference = 'dark' | 'light' | 'system';
export type ResolvedTheme = 'dark' | 'light';

function resolveTheme(preference: ThemePreference): ResolvedTheme {
  if (preference === 'system') {
    if (typeof window === 'undefined') return 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return preference;
}

function applyTheme(resolved: ResolvedTheme) {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', resolved);
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (meta) meta.content = resolved === 'dark' ? '#0a0f1a' : '#f8f9fc';
}

interface ThemeStore {
  preference: ThemePreference;
  resolved: ResolvedTheme;
  setTheme: (pref: ThemePreference) => void;
  initTheme: () => void;
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      preference: 'dark',
      resolved: 'dark',
      setTheme: (preference) => {
        const resolved = resolveTheme(preference);
        applyTheme(resolved);
        set({ preference, resolved });
      },
      initTheme: () => {
        const { preference } = get();
        const resolved = resolveTheme(preference);
        applyTheme(resolved);
        set({ resolved });
        if (preference === 'system' && typeof window !== 'undefined') {
          window.matchMedia('(prefers-color-scheme: dark)')
            .addEventListener('change', (e) => {
              const r: ResolvedTheme = e.matches ? 'dark' : 'light';
              applyTheme(r);
              set({ resolved: r });
            });
        }
      },
    }),
    { name: 'keystone-theme', partialize: (s) => ({ preference: s.preference }) }
  )
);
