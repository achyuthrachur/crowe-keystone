import type { Variants, Transition } from 'framer-motion';

export const EASING = {
  out:          [0.16, 1, 0.3, 1] as const,
  in:           [0.7, 0, 0.84, 0] as const,
  inOut:        [0.65, 0, 0.35, 1] as const,
  spring:       { type: 'spring', stiffness: 400, damping: 30 } as Transition,
  springGentle: { type: 'spring', stiffness: 200, damping: 25 } as Transition,
  springBouncy: { type: 'spring', stiffness: 500, damping: 20 } as Transition,
};

export const DURATION = {
  instant:  0.075,
  fast:     0.15,
  normal:   0.25,
  slow:     0.35,
  slower:   0.5,
};

// Page-level entrance (used in every route's root motion.div)
export const pageVariants: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: DURATION.slow, ease: EASING.out } },
  exit:    { opacity: 0, y: -4, transition: { duration: DURATION.fast, ease: EASING.in } },
};

// Card and panel entrance
export const cardVariants: Variants = {
  initial: { opacity: 0, scale: 0.97, y: 12 },
  animate: { opacity: 1, scale: 1, y: 0, transition: { duration: DURATION.normal, ease: EASING.out } },
};

// Staggered list — put on the container
export const listContainerVariants: Variants = {
  animate: { transition: { staggerChildren: 0.06 } },
};

// Staggered list item — web (slides from left)
export const listItemVariants: Variants = {
  initial: { opacity: 0, x: -8 },
  animate: { opacity: 1, x: 0, transition: { duration: DURATION.normal, ease: EASING.out } },
};

// Staggered list item — mobile (fades up)
export const mobileListItemVariants: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: DURATION.normal, ease: EASING.out } },
};

// Toast / notification slides in from right
export const notificationVariants: Variants = {
  initial: { opacity: 0, x: 48, scale: 0.95 },
  animate: { opacity: 1, x: 0, scale: 1, transition: EASING.spring },
  exit:    { opacity: 0, x: 48, scale: 0.95, transition: { duration: DURATION.fast } },
};

// Node changes stage — used on React Flow nodes
export const stageTransitionVariants: Variants = {
  initial: { opacity: 0, scale: 0.9, filter: 'blur(4px)' },
  animate: { opacity: 1, scale: 1, filter: 'blur(0px)', transition: { duration: DURATION.slow, ease: EASING.out } },
  exit:    { opacity: 0, scale: 1.05, filter: 'blur(2px)', transition: { duration: DURATION.normal, ease: EASING.in } },
};

// Conflict badge pulsing (infinite, on coral elements)
export const conflictPulseVariants: Variants = {
  animate: {
    scale: [1, 1.05, 1],
    boxShadow: [
      '0 0 0 0 rgba(229,55,107,0)',
      '0 0 0 6px rgba(229,55,107,0.2)',
      '0 0 0 0 rgba(229,55,107,0)',
    ],
    transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
  },
};

// Agent thinking dots (use with index * 0.15 delay per dot)
export const agentDotVariants: Variants = {
  animate: {
    y: [0, -6, 0],
    transition: { duration: 0.6, repeat: Infinity, ease: 'easeInOut' },
  },
};

// Phone frame reveal on desktop preview mode
export const phoneFrameVariants: Variants = {
  initial: { opacity: 0, scale: 0.9, y: 20 },
  animate: { opacity: 1, scale: 1, y: 0, transition: { duration: DURATION.slower, ease: EASING.out } },
  exit:    { opacity: 0, scale: 0.95, y: 10, transition: { duration: DURATION.normal } },
};

// PRD section accordion expand/collapse
export const accordionVariants: Variants = {
  collapsed: { height: 0, opacity: 0, transition: { duration: DURATION.normal } },
  expanded:  { height: 'auto', opacity: 1, transition: { duration: DURATION.normal, ease: EASING.out } },
};

// Stage progress bar fill (on advance)
export const progressFillVariants: Variants = {
  initial: { width: '0%' },
  animate: { width: '100%', transition: { duration: 0.6, ease: EASING.out } },
};

// ViewportToggle indicator — use with layoutId="viewport-indicator"
export const viewportIndicatorTransition: Transition = {
  type: 'spring', stiffness: 400, damping: 30,
};

// Swipe card threshold for mobile approve/reject
export const SWIPE_THRESHOLD = 120; // px

// Mobile tap feedback for interactive elements
export const tapVariants = {
  tap: { scale: 0.97, transition: { duration: DURATION.instant } },
};

// Bottom nav item tap
export const navTapVariants = {
  tap: { scale: 0.92, transition: { duration: DURATION.instant } },
};
