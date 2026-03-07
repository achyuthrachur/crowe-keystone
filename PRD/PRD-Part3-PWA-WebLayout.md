# Crowe Keystone — PRD Part 3 of 7
## PWA Specification + Web Layout Screens
### Version 2.0 | March 2026

---

# SECTION 6 — PWA SPECIFICATION

Keystone ships as a Progressive Web App from day one.
Not added later — built into the foundation in Phase 1.
PWA enables phone installation and push notifications without the App Store.

## 6.1 What PWA Delivers

| Feature | How |
|---------|-----|
| Install on iPhone home screen | Safari → Share → Add to Home Screen |
| Install on Android home screen | Chrome shows automatic install banner |
| Full-screen app (no browser chrome) | manifest.json `display: standalone` |
| App icon on home screen | manifest icons (192px, 512px) |
| Push notifications | Web Push API via VAPID keys + service worker |
| Notification buzz on phone | Service worker shows system notification |
| Tap notification → specific page | Service worker notificationclick handler |
| Works on slow connections | Service worker caches app shell |
| Offline shell (instant load) | Cache-first for static, network-first for API |

## 6.2 manifest.json

```json
{
  "name": "Crowe Keystone",
  "short_name": "Keystone",
  "description": "AI-native operating system for AI building teams",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0a0f1a",
  "theme_color": "#0a0f1a",
  "orientation": "portrait",
  "icons": [
    {
      "src": "/keystone-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/keystone-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/keystone-96.png",
      "sizes": "96x96",
      "type": "image/png",
      "purpose": "monochrome"
    }
  ],
  "screenshots": [
    {
      "src": "/screenshot-mobile.png",
      "sizes": "390x844",
      "type": "image/png",
      "form_factor": "narrow"
    },
    {
      "src": "/screenshot-desktop.png",
      "sizes": "1280x720",
      "type": "image/png",
      "form_factor": "wide"
    }
  ],
  "categories": ["productivity", "business"]
}
```

**Next.js 15 exports manifest via `app/manifest.ts`:**
```typescript
import type { MetadataRoute } from 'next';
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Crowe Keystone',
    short_name: 'Keystone',
    description: 'AI-native operating system for AI building teams',
    start_url: '/',
    display: 'standalone',
    background_color: '#0a0f1a',
    theme_color: '#0a0f1a',
    icons: [
      { src: '/keystone-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/keystone-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
```

## 6.3 Service Worker (public/sw.js)

```javascript
const CACHE_NAME = 'keystone-v1';
const SHELL_ASSETS = ['/', '/projects', '/inbox', '/daily', '/graph', '/memory'];

// INSTALL: cache the app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ACTIVATE: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// FETCH: network-first for API, cache-first for static assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API calls: network only, never cache
  if (url.pathname.startsWith('/api/') || url.hostname !== self.location.hostname) {
    return;
  }

  // Static assets: cache-first with network fallback + cache update
  event.respondWith(
    caches.open(CACHE_NAME).then(cache =>
      cache.match(request).then(cached => {
        const networkFetch = fetch(request).then(response => {
          if (response.ok) {
            cache.put(request, response.clone());
          }
          return response;
        });
        return cached || networkFetch;
      })
    )
  );
});

// PUSH: receive notification from server
self.addEventListener('push', (event) => {
  if (!event.data) return;
  const data = event.data.json();

  const options = {
    body:               data.body || '',
    icon:               data.icon || '/keystone-192.png',
    badge:              data.badge || '/keystone-96.png',
    tag:                data.tag || 'keystone',
    data:               { url: data.url || '/' },
    requireInteraction: !!(data.tag?.startsWith('approval-')),
    actions: data.tag?.startsWith('approval-') ? [
      { action: 'approve', title: '✓ Approve' },
      { action: 'view',    title: 'View →' },
    ] : undefined,
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Keystone', options)
  );
});

// NOTIFICATION CLICK: navigate to the relevant URL
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const notifData = event.notification.data || {};
  const action = event.action;

  let url = notifData.url || '/';
  if (action === 'approve') {
    // Quick approve via API before navigating
    const approvalId = event.notification.tag.replace('approval-', '');
    url = `/inbox?approve=${approvalId}`;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        // Focus existing window if open
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.focus();
            client.postMessage({ type: 'navigate', url });
            return;
          }
        }
        // Open new window
        return clients.openWindow(self.location.origin + url);
      })
  );
});
```

**Register service worker in layout.tsx:**
```tsx
// frontend/src/app/layout.tsx — in the root layout
// Add script to register service worker
<Script
  id="sw-register"
  strategy="afterInteractive"
  dangerouslySetInnerHTML={{
    __html: `
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
          .then(reg => console.log('[SW] registered', reg.scope))
          .catch(err => console.warn('[SW] registration failed', err));
      }
    `,
  }}
/>
```

## 6.4 Push Notification Client Library

```typescript
// frontend/src/lib/push-notifications.ts

export async function getVapidPublicKey(): Promise<string> {
  const res = await fetch('/api/v1/push/vapid-public-key', { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch VAPID key');
  const { key } = await res.json();
  return key;
}

export async function checkExistingSubscription(): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  return !!sub;
}

export async function subscribeToPushNotifications(): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('[Push] Not supported in this browser');
    return false;
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    console.warn('[Push] Permission denied');
    return false;
  }

  try {
    const vapidKey = await getVapidPublicKey();
    const reg = await navigator.serviceWorker.ready;
    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    });

    const subJson = subscription.toJSON();
    const res = await fetch('/api/v1/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        endpoint: subJson.endpoint,
        keys: {
          p256dh: subJson.keys?.p256dh,
          auth:   subJson.keys?.auth,
        },
      }),
    });

    return res.ok;
  } catch (err) {
    console.error('[Push] Subscription failed:', err);
    return false;
  }
}

export async function unsubscribeFromPushNotifications(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) return false;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return true;

  await fetch('/api/v1/push/subscribe', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ endpoint: sub.endpoint }),
  });

  return sub.unsubscribe();
}

export function isPWAInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}
```

## 6.5 Push Service (Backend)

Generate VAPID keys once:
```bash
npx web-push generate-vapid-keys
# Add output to .env: VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=...
# Also: NEXT_PUBLIC_VAPID_PUBLIC_KEY=... (same public key, frontend-safe)
```

```python
# backend/src/services/push_service.py
from pywebpush import webpush, WebPushException
import json, os, logging

logger = logging.getLogger(__name__)

VAPID_PRIVATE_KEY = os.environ['VAPID_PRIVATE_KEY']
VAPID_CLAIMS = {"sub": f"mailto:{os.environ.get('VAPID_CONTACT', 'admin@crowe-keystone.app')}"}

async def send_web_push(subscription_data: dict, payload: dict) -> bool:
    """Send one push notification. Returns True on success."""
    try:
        webpush(
            subscription_info=subscription_data,
            data=json.dumps(payload),
            vapid_private_key=VAPID_PRIVATE_KEY,
            vapid_claims=VAPID_CLAIMS,
            content_encoding="aes128gcm",
        )
        return True
    except WebPushException as e:
        if e.response and e.response.status_code == 410:
            # Subscription expired — deactivate
            await deactivate_subscription(subscription_data['endpoint'])
        else:
            logger.error(f"[Push] Failed: {e}")
        return False

async def notify_approval_requested(user_id: str, project_title: str, approval_id: str):
    subs = await get_active_subscriptions(user_id)
    payload = {
        "title": "Approval needed",
        "body":  f"{project_title} is waiting for your review",
        "icon":  "/keystone-192.png",
        "badge": "/keystone-96.png",
        "url":   f"/inbox?approval={approval_id}",
        "tag":   f"approval-{approval_id}",
    }
    for sub in subs:
        await send_web_push({"endpoint": sub.endpoint,
                              "keys": {"p256dh": sub.p256dh, "auth": sub.auth}},
                             payload)

async def notify_conflict_detected(team_id: str, conflict: dict):
    from ..services.approval_service import get_team_leads
    leads = await get_team_leads(team_id)
    payload = {
        "title": "⚠ Conflict detected",
        "body":  conflict['specific_conflict'][:80],
        "icon":  "/keystone-conflict-192.png",
        "badge": "/keystone-96.png",
        "url":   f"/graph?conflict={conflict['id']}",
        "tag":   f"conflict-{conflict['id']}",
    }
    for lead in leads:
        for sub in await get_active_subscriptions(lead['id']):
            await send_web_push({"endpoint": sub.endpoint,
                                  "keys": {"p256dh": sub.p256dh, "auth": sub.auth}},
                                 payload)

async def notify_agent_checkpoint(user_id: str, project_title: str,
                                   question: str, run_id: str):
    subs = await get_active_subscriptions(user_id)
    payload = {
        "title": "Agent needs your input",
        "body":  f"{project_title}: {question[:60]}...",
        "url":   f"/projects?agent={run_id}",
        "tag":   f"checkpoint-{run_id}",
    }
    for sub in subs:
        await send_web_push({"endpoint": sub.endpoint,
                              "keys": {"p256dh": sub.p256dh, "auth": sub.auth}},
                             payload)
```

---

# SECTION 7 — WEB LAYOUT SPECIFICATIONS

## 7.1 App Shell — Viewport Router

```
AppShell reads: viewport.store (mode: 'web' | 'mobile') + isMobileDevice

If mode === 'mobile' AND actual device is desktop:
  → PhoneFrame wrapping MobileLayout (preview mode)

If mode === 'mobile' OR actual device is mobile:
  → MobileLayout (real mobile)

Default (mode === 'web', desktop):
  → WebLayout (sidebar + topbar)
```

```tsx
// frontend/src/components/layout/AppShell.tsx
'use client';
import { useViewportStore } from '@/stores/viewport.store';
import { WebLayout } from './WebLayout';
import { MobileLayout } from '../mobile/MobileLayout';
import { PhoneFrame } from '../mobile/PhoneFrame';
import { AnimatePresence, motion } from 'framer-motion';
import { phoneFrameVariants } from '@/lib/motion';

export function AppShell({ children }: { children: React.ReactNode }) {
  const { mode, isMobileDevice } = useViewportStore();
  const showPhoneFrame = mode === 'mobile' && !isMobileDevice;

  if (showPhoneFrame) {
    return (
      <div className="min-h-screen flex items-center justify-center p-10"
           style={{ background: 'var(--surface-base)' }}>
        <AnimatePresence mode="wait">
          <motion.div key="phone-frame" variants={phoneFrameVariants}
                      initial="initial" animate="animate" exit="exit">
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
```

## 7.2 Web Layout Structure

```
┌──────────────────────────────────────────────────────────────────┐
│  TOP BAR  h-14                                                    │
│  bg: --surface-base  border-b: 1px solid var(--border-subtle)    │
│                                                                   │
│  Left: [Keystone mark 20px] [Keystone — Geist 600 14px]          │
│  Center: [⌘K Search placeholder — 320px wide — surface-input]    │
│  Right: [Viewport Toggle] [Notifications Bell] [User Avatar 32px]│
│                                                                   │
├─────────────────────────┬────────────────────────────────────────┤
│  SIDEBAR  w-60          │                                         │
│  bg: --surface-base     │  MAIN CONTENT  flex-1                  │
│  border-r: subtle       │  overflow-y-auto                       │
│  h-[calc(100vh-3.5rem)] │  p-8                                   │
│  sticky top-14          │                                         │
│                         │  Routes render here with               │
│  NAV (top section):     │  <motion.div variants={pageVariants}>  │
│  Each item h-11 (44px)  │                                         │
│  px-3 rounded-lg        │                                         │
│  Hover: surface-hover   │                                         │
│  Active: surface-selected │                                       │
│  + 2px amber left border │                                        │
│                         │                                         │
│  • ✦ Projects  /projects │                                        │
│  • ⬡ Graph     /graph   │                                         │
│  • ⬤ Inbox [3] /inbox   │                                         │
│  • ◎ Memory    /memory  │                                         │
│  • ◍ Today     /daily   │                                         │
│                         │                                         │
│  DIVIDER                │                                         │
│                         │                                         │
│  [+ New Spark] button   │                                         │
│  amber, full width      │                                         │
│  h-9, rounded-lg        │                                         │
│                         │                                         │
│  PRESENCE (bottom):     │                                         │
│  "Online" label         │                                         │
│  Avatar bubbles (20px)  │                                         │
│  Teal dot = online      │                                         │
│  Amber dot = away (>5m) │                                         │
└─────────────────────────┴────────────────────────────────────────┘
```

**Sidebar active nav indicator:** Framer Motion `layoutId="active-nav-indicator"`
on the 2px left border element. Spring transition between nav items.

**Inbox badge:** `<span>` overlay on Inbox nav item. Coral background, white text,
10px × 10px minimum (expands for 2-digit numbers). Shows `pending approvals + open conflicts`.
Updates in real time via SSE (useSSE hook pipes into notifications.store, sidebar reads store).

## 7.3 ViewportToggle Component

```tsx
// frontend/src/components/layout/ViewportToggle.tsx
'use client';
import { Monitor, Smartphone } from 'lucide-react';
import { motion } from 'framer-motion';
import { useViewportStore } from '@/stores/viewport.store';
import { viewportIndicatorTransition } from '@/lib/motion';

export function ViewportToggle() {
  const { mode, setMode, isMobileDevice } = useViewportStore();
  if (isMobileDevice) return null; // hidden on actual mobile devices

  return (
    <div style={{
      display: 'flex',
      background: 'var(--surface-input)',
      borderRadius: 8,
      padding: 3,
      gap: 2,
      border: '1px solid var(--border-subtle)',
    }}>
      {(['web', 'mobile'] as const).map((m) => (
        <motion.button
          key={m}
          onClick={() => setMode(m)}
          whileTap={{ scale: 0.95 }}
          style={{
            position: 'relative',
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '4px 10px',
            borderRadius: 6,
            border: 'none', cursor: 'pointer',
            background: 'transparent',
            color: mode === m ? 'var(--text-primary)' : 'var(--text-tertiary)',
            fontSize: 12, fontWeight: 500,
            fontFamily: 'var(--font-geist-sans)',
            zIndex: 1,
            transition: 'color 150ms',
          }}
        >
          {mode === m && (
            <motion.div
              layoutId="viewport-indicator"
              transition={viewportIndicatorTransition}
              style={{
                position: 'absolute', inset: 0,
                background: 'var(--surface-selected)',
                border: '1px solid var(--border-default)',
                borderRadius: 5,
                zIndex: -1,
              }}
            />
          )}
          {m === 'web' ? <Monitor size={12} /> : <Smartphone size={12} />}
          {m === 'web' ? 'Web' : 'Mobile'}
        </motion.button>
      ))}
    </div>
  );
}
```

## 7.4 Login Page

```
URL: /login (auth group, no sidebar/topbar)

Layout: full-screen, surface-base background
        centered column, max-w-sm, mx-auto

Content (entrance staggered: logo 100ms, form 250ms):
  [keystone-mark.svg — 32px]
  [Keystone — Plus Jakarta Sans 800 32px — text-primary]
  [Where AI teams build together — Geist 400 14px — text-secondary]
  [32px gap]
  [Form card — surface-elevated, rounded-2xl, p-6, shadow-md, border-subtle]
    Email label + input (surface-input, 44px height)
    Password label + input + show/hide icon
    [Sign in →] button — amber background, text-inverse, full width, 44px, rounded-lg
    Framer: press animation via tapVariants
  [32px gap]
  [Don't have a team? Contact Achyuth to get started — text-tertiary 13px]

Background:
  bg-dots class (see Part 1 CSS) at 5% opacity
  Very slow drift animation: translateX(4px) over 20 seconds, infinite, alternating
```

## 7.5 Web Dashboard — /projects

```
┌──────────────────────────────────────────────────────────────────┐
│  HEADER ROW                                                       │
│  "Projects" — Plus Jakarta Sans 700 24px                         │
│  "✦ New Spark" amber button (top-right) — h-9 px-3 rounded-lg   │
├──────────────────────────────────────────────────────────────────┤
│  STAGE FILTER BAR (gap-2, mt-5)                                   │
│  [All 8] [✦ Spark 2] [◈ Brief 1] [◎ Draft 1] [◇ Review 1]      │
│  [◉ Approved 0] [⬡ In Build 2] [✓ Shipped 1]                    │
│                                                                   │
│  Active pill: bg-amber-glow, border-amber, amber text            │
│  Default pill: transparent bg, border-subtle, text-secondary     │
│  Count badge on each: inline after label, muted background        │
│  Height: 32px, px-3, rounded-full                                 │
├──────────────────────────────────────────────────────────────────┤
│  CONFLICT BANNER (only when open conflicts > 0)                   │
│  bg: coral-glow  border: border-coral  border-l-4  rounded-lg    │
│  mt-4 p-3                                                         │
│  Left: ⚠ icon (conflictPulseVariants)  "2 conflicts need attention" │
│  Right: "View conflicts →" text link                              │
│  Animation: slides down from above when conflicts appear          │
├──────────────────────────────────────────────────────────────────┤
│  PROJECT GRID (mt-6)                                              │
│  grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4           │
│  Stagger entrance: listContainerVariants + listItemVariants      │
└──────────────────────────────────────────────────────────────────┘
```

**ProjectCard specifications:**
```
Size: min-h-[260px], rounded-xl, p-4
Background: surface-elevated
Border: 1px solid border-subtle (default) → border-amber (hover)
Shadow: shadow-sm (default) → shadow-md (hover)
Transform: none (default) → translateY(-2px) (hover)
Transition: all 200ms ease-out

TOP ROW:
  [Stage badge — pill, stage color, 10px text, uppercase, letter-spacing]
  [Conflict dot — 8px coral circle, conflictPulseVariants, top-right, only if conflicts]

BODY (mt-3):
  Title — Geist 600 16px, 2-line clamp
  Description — Geist 400 13px, text-secondary, 2-line clamp, mt-1

STACK TAGS (mt-3):
  Flex wrap. Each tag: surface-input, border-subtle, rounded, 11px, max 3 shown
  "+N more" pill if overflow

FOOTER (mt-auto, pt-3, border-t: border-subtle):
  Left: Avatar 20px + Owner name 12px text-secondary
  Right: "X days ago" 12px text-tertiary
```

**SparkInput sheet (triggered by "New Spark" button):**
```
Mobile: bottom sheet sliding up (phoneFrameVariants)
Desktop: centered modal (cardVariants)
Backdrop: blur(12px) + rgba(10,15,26,0.7)

Content:
  "What do you want to build?" — Plus Jakarta 700 20px
  Large textarea — surface-input, rounded-xl, p-4, min-h-[120px]
  Placeholder: "Describe the problem or idea in plain language..."
  Submit hint: "⌘ Enter to submit"
  [Submit] amber button

After submit:
  Sheet closes with exit animation
  New card appears in grid with stageTransitionVariants
  Amber border pulses on the new card for 1.5 seconds
  Project Intelligence Agent begins running in background (silent)
```

## 7.6 Web Project Detail — /projects/[id]

```
┌──────────────────────────────────────────────────────────────────┐
│  PROJECT HEADER (sticky top-0, surface-base, border-b: subtle)   │
│  h-14                                                             │
│  [← Projects] [Stage badge] "Project Title" [⋯ menu]            │
├──────────────────────────────────────────────────────────────────┤
│  STAGE PROGRESS BAR (p-4 px-8)                                   │
│  Track: h-1 bg-border-subtle rounded-full                        │
│  Filled: h-1 bg-amber-core, width = (stage_index/7)*100%        │
│  Advance animation: progressFillVariants 600ms ease-out          │
│  Stage dots: 12px circles above track                            │
│    Completed: teal fill  Current: amber + conflictPulseVariants  │
│    Future: border-subtle, no fill                                 │
│  Stage labels: 11px below dots, current = amber, others = muted  │
├───────────────────────────┬──────────────────────────────────────┤
│  LEFT PANEL  flex-1       │  RIGHT PANEL  w-72                   │
│  p-6                      │  p-4                                 │
│                           │                                       │
│  TABS:                    │  ┌─ AGENT PANEL (conditional) ────┐  │
│  [PRD] [Build] [Retro]    │  │ Shows when agent is running   │  │
│  Amber underline on active│  │ [agent name + icon]            │  │
│  AnimatePresence for tab  │  │ [thinking animation]           │  │
│  content transitions      │  │ [node progress list]           │  │
│                           │  │ [checkpoint UI if needed]      │  │
│  PRD tab → PRDEditor      │  └────────────────────────────────┘  │
│  Build tab → BuildLog     │                                       │
│  Retro tab → RetroView    │  ─ OPEN QUESTIONS ─────────────────  │
│                           │  ⛔ Blocking (2) / ○ Non-blocking    │
│                           │                                       │
│                           │  ─ STAGE ACTIONS ──────────────────  │
│                           │  Context-aware buttons for stage     │
│                           │                                       │
│                           │  ─ ASSIGNED TO ────────────────────  │
│                           │  Avatar + name + [Reassign]          │
│                           │                                       │
│                           │  ─ STACK ──────────────────────────  │
│                           │  Tech tags                           │
│                           │                                       │
│                           │  ─ FROM MEMORY ────────────────────  │
│                           │  Related past decisions               │
└───────────────────────────┴──────────────────────────────────────┘
```

**AgentPanel — right panel, conditional display:**
```
Appears when: agent_runs table has a 'running' record for this project
Disappears: when run completes (with completion animation)

Structure:
  Header: [emoji] "PRD Architect" + "Generating brief..." — amber text
  Thinking: three amber dots using agentDotVariants (0ms, 150ms, 300ms delay)
  Node list (as nodes complete):
    [✓] context_loader  — Geist mono 12px, text-secondary, fade in
    [✓] classifier
    [→] brief_generator — amber, currently running
    [○] stress_tester   — muted, not yet run
  Checkpoint (if agent paused):
    Amber box with question text
    Text input for answer + [Submit] button
  Completion: teal checkmark + "Complete" + expandable output section

Animation: AgentPanel slides in from right (x: 20 → 0) when agent starts
           Collapses after 3 seconds after completion
```

**Stage Actions — right panel, always visible:**
```typescript
// Stage-specific actions rendered in right panel
const STAGE_ACTIONS: Record<string, { label: string; icon: string; action: string; role?: string }[]> = {
  spark:     [
    { label: 'Generate Brief', icon: '⚡', action: 'trigger_brief_generator' }
  ],
  brief:     [
    { label: 'Draft Full PRD', icon: '◎', action: 'trigger_prd_drafter' },
    { label: 'Advance to Draft PRD →', icon: '→', action: 'stage_advance' }
  ],
  draft_prd: [
    { label: 'Run Stress Test', icon: '⚡', action: 'trigger_stress_tester' },
    { label: 'Send for Review →', icon: '→', action: 'stage_advance' }
  ],
  review:    [
    { label: 'Approve ✓', icon: '✓', action: 'approve', role: 'reviewer' },
    { label: 'Request Changes ◎', icon: '◎', action: 'request_changes', role: 'reviewer' }
  ],
  approved:  [
    { label: '⚡ Start Build + Get Kickoff Prompt', icon: '⬡', action: 'start_build' }
  ],
  in_build:  [
    { label: 'Log Update', icon: '◎', action: 'log_update' },
    { label: 'Mark Shipped ✓', icon: '✓', action: 'stage_advance' }
  ],
  shipped:   [
    { label: 'Generate Retrospective', icon: '◍', action: 'trigger_retro' }
  ],
};
```

## 7.7 Living PRD View

```
┌──────────────────────────────────────────────────────────────────┐
│  PRD HEADER                                                       │
│  [v3 badge — Geist Mono] [In Review badge] [Updated 2 days ago]  │
│  [Show diff from v2 ↗] [Copy Claude Code prompt ↗]              │
├──────────────────────────────────────────────────────────────────┤
│  STRESS TEST PANEL (collapsible, amber-glow bg, prominent)       │
│  ⚡ Stress Test Results — 3 hypotheses — Leading failure: Scope  │
│  [Expand ▼]                                                       │
│                                                                   │
│  EXPANDED (accordionVariants):                                    │
│  Hypothesis cards in 3-col grid:                                  │
│    Scope hypothesis (confidence bar, supporting/contradicting)    │
│    Assumption hypothesis                                          │
│    Integration hypothesis                                         │
│  Adversarial findings: coral bg, coral left border               │
│  Fragile assumptions: orange bg, sorted by fragility score       │
├──────────────────────────────────────────────────────────────────┤
│  PRD SECTIONS (each has same structure):                          │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ Problem Statement          [Edit ✏] [AI Regenerate ⚡]    │  │
│  │ ─────────────────────────────────────────────────────────  │  │
│  │ Content renders here in Geist 14px text-primary           │  │
│  │                                                            │  │
│  │ EDIT MODE (AnimatePresence, fades in over view mode):     │  │
│  │   Textarea or structured fields for this section type     │  │
│  │   [Cancel] [Save]                                         │  │
│  └────────────────────────────────────────────────────────────┘  │
│  [User Stories section]                                           │
│  [Functional Requirements section]                                │
│  [Non-Functional Requirements section]                            │
│  [Out of Scope section]                                           │
│  [Stack & Architecture section]                                   │
│  [Component Inventory section]                                    │
│  [Data Layer section]                                             │
│  [API Contracts section]                                          │
│  [Success Criteria section]                                       │
├──────────────────────────────────────────────────────────────────┤
│  OPEN QUESTIONS                                                   │
│  ⛔ BLOCKING (2) — red left border on each                        │
│  Q1: Authentication model — owner: Achyuth [Answer]              │
│  Q2: Shared database — needs team decision [Answer]              │
│                                                                   │
│  ○ NON-BLOCKING (3) — subtle styling                              │
│  Q3: ...                                                          │
└──────────────────────────────────────────────────────────────────┘
```

**VersionDiff View:**
```
Triggered: "Show diff from v2 ↗" button
Layout: split-pane (left = previous, right = current)
Added lines: bg teal-glow, teal left border, green "+" indicator
Removed lines: bg coral-glow, coral left border, red "-" indicator, strikethrough
Changed sections: bg amber-glow, amber left border
```

## 7.8 React Flow Graph — /graph

```tsx
// Full configuration
<ReactFlow
  nodes={nodes}
  edges={edges}
  nodeTypes={{
    project:  ProjectNode,
    conflict: ConflictNode,
    decision: DecisionNode,
    agent:    AgentNode,
  }}
  edgeTypes={{
    stage:    StageEdge,
    conflict: ConflictEdge,
  }}
  fitView
  fitViewOptions={{ padding: 0.2 }}
  defaultEdgeOptions={{
    style: { strokeWidth: 1.5, stroke: 'var(--border-default)' },
    animated: false,
  }}
  proOptions={{ hideAttribution: true }}
  style={{ background: 'var(--surface-base)' }}
  onNodeClick={(_, node) => openProjectDrawer(node.data.id)}
>
  <Background
    variant={BackgroundVariant.Dots}
    gap={24}
    size={1}
    color="rgba(255,255,255,0.04)"
  />
  <Controls
    style={{
      background: 'var(--surface-elevated)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 8,
    }}
  />
  <MiniMap
    nodeColor={(n) => STAGE_COLORS[n.data?.stage as Stage]?.text || '#666'}
    maskColor="rgba(10,15,26,0.7)"
    style={{ background: 'var(--surface-elevated)', borderRadius: 8 }}
  />
</ReactFlow>
```

**dagre layout configuration:**
```typescript
import dagre from '@dagrejs/dagre';

const NODE_W = 200, NODE_H = 70;

export function layoutWithDagre(nodes: Node[], edges: Edge[]) {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'TB', ranksep: 120, nodesep: 40 });

  nodes.forEach(n => g.setNode(n.id, { width: NODE_W, height: NODE_H }));
  edges.forEach(e => g.setEdge(e.source, e.target));
  dagre.layout(g);

  return {
    nodes: nodes.map(n => {
      const { x, y } = g.node(n.id);
      return { ...n, position: { x: x - NODE_W / 2, y: y - NODE_H / 2 } };
    }),
    edges,
  };
}
```

**ConflictEdge animation:**
```tsx
// Dashes move from project A toward project B — visually shows direction
<path
  d={edgePath}
  stroke="var(--coral)"
  strokeWidth={1.5}
  strokeDasharray="8 4"
  fill="none"
  style={{
    animation: 'conflictFlow 1.5s linear infinite',
  }}
/>
// CSS:
// @keyframes conflictFlow { to { stroke-dashoffset: -36; } }
```

**SSE → Graph live updates:**
```typescript
// graph.store.ts handles these SSE events:
// project.stage_changed → updateNodeStage → node color/badge changes
//   with stageTransitionVariants (scale + blur + color)
// conflict.detected → addConflictEdge → ConflictEdge appears
//   new edge animates in with opacity 0 → 1
// conflict.resolved → removeConflictEdge → edge fades out
// project.created → addProjectNode → node slides in from bottom
```

## 7.9 Inbox — /inbox

```
┌──────────────────────────────────────────────────────────────────┐
│  "Inbox" — Plus Jakarta 700 24px   [Mark all read]               │
├──────────────────────────────────────────────────────────────────┤
│  APPROVALS WAITING FOR YOU (2)                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ [Stage advance: Draft PRD → Review]     2 hours ago       │   │
│  │ Project: crowe-ai-onboarding                              │   │
│  │                                                            │   │
│  │ AI Summary: PRD updated with pgvector schema. 3 of 4     │   │
│  │ open questions resolved. Remaining blocker: auth model   │   │
│  │ for multi-user sessions needs decision before proceeding. │   │
│  │                                                            │   │
│  │ [Show diff ↗]                                             │   │
│  │                                                            │   │
│  │ [✓ Approve]  [◎ Request Changes]  [✗ Reject]            │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  CONFLICTS NEEDING DECISION (1)                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ ⚠ Resource overlap — BLOCKING                            │   │
│  │ crowe-onboarding ↔ crowe-mcp-server                      │   │
│  │ Both projects claim Vercel Postgres as sole database.    │   │
│  │ Resolution options: (1) Separate DB instances            │   │
│  │  (2) Shared DB with schema prefixing                     │   │
│  │  (3) Coordinate deployment sequence                      │   │
│  │ [Resolve →]                                               │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  AGENT CHECKPOINTS WAITING (0)                                    │
│  Empty state: "No checkpoints pending ✓"                         │
└──────────────────────────────────────────────────────────────────┘
```

**ApprovalRequest card interactions:**
- Approve: card flashes teal (200ms), then AnimatePresence exit → slide right + shrink
- Request Changes: card flashes amber, exit → slide up + fade
- Reject: card flashes coral, exit → slide left + shrink
- All use `mode="popLayout"` on the AnimatePresence container

## 7.10 Command Palette (⌘K)

```
Trigger: ⌘K (Mac) / Ctrl+K (Windows) / Click search bar in TopBar
Component: shadcn Command component wrapped in Dialog
Modal: w-[600px], rounded-2xl, surface-overlay, shadow-lg
Backdrop: blur(12px) + rgba(10,15,26,0.8)
Entrance: cardVariants (scale + fade)

Commands:
  ✦ Create new spark
  Projects: [fuzzy search by project title]
  ⬡ Graph view
  ⬤ Inbox
  ◎ Memory browser
  ◍ Today's brief
  ⚡ Run conflict scan now
  ✓ Approve pending... [search approval by project name]
  ◎ Search all PRDs
  ⚙ Settings

Keyboard: ↑↓ navigate, Enter select, Esc close
Each result: icon (16px) + label + keyboard shortcut hint (right-aligned, muted)
```

---

*Continue reading: PRD-Part4-MobileLayout-LangGraph.md*
