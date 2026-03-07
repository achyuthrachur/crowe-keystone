# CLAUDE.md — Frontend (crowe-keystone/frontend/)
# EXTENDS root CLAUDE.md. Read root first.

---

## DESIGN SYSTEM — NON-NEGOTIABLE

Typography:
  Geist Sans: body/UI text, labels, form fields, buttons
  Plus Jakarta Sans: h1, h2, welcome screen, empty states, onboarding heroes
  Geist Mono: code blocks, version numbers, node IDs, build log timestamps

Colors:
  CSS variables ONLY. Never raw hex in className or style attributes.
  Use Tailwind custom tokens (text-[var(--text-primary)]) or direct var() in style={}
  See globals.css for all variable definitions.

Animations:
  Import ALL variants from src/lib/motion.ts.
  Never create animation objects inline in components.
  Always use AnimatePresence for conditional mount/unmount.
  Always use layoutId for shared element transitions.
  Never exceed 500ms duration for any UI element animation.
  Always respect prefers-reduced-motion:
    import { useReducedMotion } from 'framer-motion';
    const shouldReduce = useReducedMotion();
    // Provide instant alternatives when shouldReduce === true

Stage colors:
  Import STAGE_COLORS from src/lib/stage-colors.ts. Never inline.

---

## COMPONENT HIERARCHY RULES

shadcn:
  Apply Crowe CSS variable overrides in globals.css.
  NEVER use shadcn default colors directly.

React Flow nodes:
  ALWAYS wrap in React.memo().
  Test that minimal rerenders occur.
  Never embed complex business logic in node components.

Mobile vs Web:
  Desktop components: src/components/ (all except mobile/)
  Mobile components: src/components/mobile/
  They share: hooks, stores, types, lib utilities
  They do NOT share: layout components (Sidebar vs BottomNav)
  PhoneFrame: desktop preview only, never renders on actual mobile devices

---

## VIEWPORT SYSTEM

viewport.store.ts: mode = 'web' | 'mobile', isMobileDevice (auto-detected)
AppShell routes: WebLayout | MobileLayout | PhoneFrame+MobileLayout
Auto-detect mobile: window.innerWidth < 768 on initial load
isMobileDevice: true when matchMedia('(pointer: coarse)') matches
NEVER toggle mode automatically — user controls the toggle on desktop.

Every page MUST work correctly in BOTH web and mobile layouts.
Test every new page with the ViewportToggle before marking complete.

---

## PWA REQUIREMENTS

Service worker registration: in root layout.tsx via <Script afterInteractive>
manifest.json: linked via Next.js app/manifest.ts export
PWA meta tags required in layout.tsx:
  <meta name="theme-color" content="#0a0f1a" />
  <meta name="mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  <link rel="apple-touch-icon" href="/keystone-192.png" />

Push notification prompt:
  NEVER call Notification.requestPermission() on page load.
  Only show prompt in settings/notifications/page.tsx OR
  after user has been in-app >= 60 seconds on mobile (banners only).

---

## MOBILE INTERACTION STANDARDS

Minimum touch targets: 44x44px on ALL interactive elements.
Verify with Chrome DevTools → Device Toolbar → inspect element sizes.

Tap feedback: tapVariants from motion.ts (scale 0.97) on all clickable cards.
Swipe detection: minimum 40px travel before triggering action.
Long press: 500ms hold via onPointerDown + setTimeout pattern.
Horizontal scroll: scroll-x CSS class (momentum, snap, no scrollbar).
Safe areas: safe-top, safe-bottom, safe-left, safe-right CSS classes.
