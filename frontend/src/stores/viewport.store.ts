import { create } from 'zustand';

export type ViewportMode = 'web' | 'mobile';

interface ViewportState {
  mode: ViewportMode;
  isMobileDevice: boolean;
  setMode: (mode: ViewportMode) => void;
}

function detectMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  // Use viewport width (reliable across headless browsers) combined with pointer check.
  // pointer: coarse alone can return true in headless environments at desktop widths.
  return window.innerWidth < 768 && window.matchMedia('(pointer: coarse)').matches;
}

export const useViewportStore = create<ViewportState>((set) => ({
  mode: 'web',
  // Always start false to match SSR. AppShell.tsx updates this via useEffect after hydration.
  isMobileDevice: false,
  setMode: (mode) => set({ mode }),
}));

// Export detectMobileDevice so AppShell can call it in useEffect
export { detectMobileDevice };
