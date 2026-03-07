import { create } from 'zustand';

export type ViewportMode = 'web' | 'mobile';

interface ViewportState {
  mode: ViewportMode;
  isMobileDevice: boolean;
  setMode: (mode: ViewportMode) => void;
}

function detectMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(pointer: coarse)').matches;
}

export const useViewportStore = create<ViewportState>((set) => ({
  mode: 'web',
  isMobileDevice: detectMobileDevice(),
  setMode: (mode) => set({ mode }),
}));

// Re-detect on client
if (typeof window !== 'undefined') {
  const mq = window.matchMedia('(pointer: coarse)');
  mq.addEventListener('change', (e) => {
    useViewportStore.setState({ isMobileDevice: e.matches });
  });
}
