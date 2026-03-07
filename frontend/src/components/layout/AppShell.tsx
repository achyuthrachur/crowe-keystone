'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useViewportStore } from '@/stores/viewport.store';
import { WebLayout } from './WebLayout';
import { MobileLayout } from '../mobile/MobileLayout';
import { PhoneFrame } from '../mobile/PhoneFrame';
import { ViewportToggle } from './ViewportToggle';
import { phoneFrameVariants } from '@/lib/motion';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { mode, isMobileDevice } = useViewportStore();
  const showPhoneFrame = mode === 'mobile' && !isMobileDevice;

  if (showPhoneFrame) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-10"
        style={{ background: 'var(--surface-base)' }}
      >
        {/* Viewport toggle stays accessible outside the phone frame */}
        <div style={{ marginBottom: 16 }}>
          <ViewportToggle />
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key="phone-frame"
            variants={phoneFrameVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <PhoneFrame>
              <MobileLayout>{children}</MobileLayout>
            </PhoneFrame>
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  if (mode === 'mobile' || isMobileDevice) {
    return <MobileLayout>{children}</MobileLayout>;
  }

  return <WebLayout>{children}</WebLayout>;
}
