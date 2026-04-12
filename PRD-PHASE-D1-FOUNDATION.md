# Keystone — PRD Phase D1: UI Foundation
> Version 1.0 | Status: Draft | Author: Achyuth Rachur
> Prereq: Phase C3 HANDOFF.md — full pipeline runs end-to-end, output files download correctly

---

## Overview

Phase D1 lays the non-visual groundwork the rest of the UI phases depend on.
No full pages yet — just the wiring that all later components share.

Phase D1 deliverables:
1. `frontend/src/types/keystone.types.ts` — all shared TypeScript types
2. `frontend/src/stores/keystone.store.ts` — Zustand store for engagement state
3. `frontend/src/hooks/useKeystoneSSE.ts` — SSE event handler for Keystone events
4. `frontend/src/components/layout/Sidebar.tsx` — replace old nav with Engagements + Settings
5. `frontend/src/app/(app)/engagements/page.tsx` — shell only (renders "Loading..." for now)
6. `frontend/src/app/(app)/engagements/new/page.tsx` — shell only
7. `frontend/src/app/(app)/engagements/[id]/page.tsx` — shell only
8. Install `@dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities`

Exit criteria: `npm run typecheck` passes, `npm run build` passes, sidebar shows
Engagements link, clicking it navigates to /engagements without error.

---

## 1. npm install

```bash
cd frontend
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

---

## 2. TypeScript Types — frontend/src/types/keystone.types.ts

```typescript
// keystone.types.ts
// All shared types for the Keystone pipeline UI.
// Backend API response shapes map 1:1 to these types.

export type EngagementStatus =
  | 'draft'
  | 'uploading'
  | 'ready'
  | 'running'
  | 'awaiting_review_1'
  | 'awaiting_review_2'
  | 'awaiting_review_3'
  | 'compiling'
  | 'complete'
  | 'failed';

export interface Engagement {
  id: string;
  team_id: string;
  created_by: string | null;
  client_name: string;
  client_industry: string;
  engagement_date: string; // ISO date string
  attendees: string;
  status: EngagementStatus;
  created_at: string;
  updated_at: string;
}

export interface UploadedDocument {
  id: string;
  engagement_id: string;
  doc_type: 'transcript' | 'preread' | 'agenda';
  original_filename: string;
  storage_key: string;
  file_size_bytes: number | null;
  created_at: string;
}

export interface KeystoneRun {
  run_id: string;
  engagement_id: string;
  status: EngagementStatus;
  current_node: string | null;
  error: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface RemovedSegment {
  id: string;
  text: string;
  reason: 'off_topic' | 'personal_chatter' | 'other_workstream' | 'admin';
}

export interface AcronymEntry {
  term: string;
  expansion: string;
  confidence?: number;
  source?: string;
}

export interface OutlineItem {
  id: string;
  text: string;
  source_quote: string;
  slide_type_hint: string | null;
}

export interface ContentOutline {
  key_themes: OutlineItem[];
  pain_points: OutlineItem[];
  stated_priorities: OutlineItem[];
  open_questions: OutlineItem[];
  potential_recommendations: OutlineItem[];
  suggested_next_steps: OutlineItem[];
}

export interface OutputFiles {
  engagement_id: string;
  deck_brief_available: boolean;
  deck_handoff_available: boolean;
  deck_brief_download_url: string;
  deck_handoff_download_url: string;
}

// ── SSE event payloads ────────────────────────────────────────────────────────

export interface SSEStatusChanged {
  engagement_id: string;
  old_status: EngagementStatus;
  new_status: EngagementStatus;
}

export interface SSEGateReady {
  engagement_id: string;
  run_id: string;
}

export interface SSEComplete {
  engagement_id: string;
  run_id: string;
}

export interface SSEDocumentUploaded {
  engagement_id: string;
  doc_id: string;
  doc_type: string;
  filename: string;
}

export interface SSEEngagementCreated {
  engagement_id: string;
  client_name: string;
}

// ── Kanban column definitions ─────────────────────────────────────────────────

export interface KanbanColumn {
  id: KanbanColumnId;
  label: string;
  statuses: EngagementStatus[]; // which statuses belong in this column
  accentColor: string;          // CSS variable or hex — used for border glow
  emptyLabel: string;
}

export type KanbanColumnId =
  | 'draft'
  | 'ready'
  | 'running'
  | 'gate1'
  | 'gate2'
  | 'gate3'
  | 'complete'
  | 'failed';
```

---

## 3. Zustand Store — frontend/src/stores/keystone.store.ts

```typescript
// keystone.store.ts
// Zustand store for all Keystone engagement state.
// All API calls go through this store — components never fetch directly.

import { create } from 'zustand';
import type {
  Engagement,
  EngagementStatus,
  UploadedDocument,
  KeystoneRun,
  RemovedSegment,
  AcronymEntry,
  ContentOutline,
} from '@/types/keystone.types';

const API = process.env.NEXT_PUBLIC_BACKEND_URL ?? '';

interface KeystoneState {
  // ── Engagement list ─────────────────────────────────────────────────────────
  engagements: Engagement[];
  engagementsLoading: boolean;
  engagementsError: string | null;

  // ── Active engagement detail ────────────────────────────────────────────────
  activeEngagement: Engagement | null;
  activeDocuments: UploadedDocument[];
  activeRun: KeystoneRun | null;
  detailLoading: boolean;

  // ── Actions: list ──────────────────────────────────────────────────────────
  fetchEngagements: (token: string) => Promise<void>;
  createEngagement: (payload: {
    client_name: string;
    client_industry: string;
    engagement_date: string;
    attendees: string;
  }, token: string) => Promise<Engagement>;
  deleteEngagement: (id: string, token: string) => Promise<void>;

  // ── Actions: detail ────────────────────────────────────────────────────────
  fetchEngagement: (id: string, token: string) => Promise<void>;
  fetchDocuments: (engagementId: string, token: string) => Promise<void>;
  fetchRun: (engagementId: string, token: string) => Promise<void>;
  uploadDocument: (
    engagementId: string,
    file: File,
    docType: 'transcript' | 'preread' | 'agenda',
    token: string
  ) => Promise<UploadedDocument>;
  startRun: (engagementId: string, token: string) => Promise<void>;
  submitGate1: (engagementId: string, restoredIds: string[], token: string) => Promise<void>;
  submitGate2: (engagementId: string, glossary: AcronymEntry[], token: string) => Promise<void>;
  submitGate3: (engagementId: string, outline: ContentOutline, token: string) => Promise<void>;

  // ── SSE handlers (called by useKeystoneSSE) ────────────────────────────────
  handleStatusChanged: (engagementId: string, newStatus: EngagementStatus) => void;
  handleDocumentUploaded: (engagementId: string) => void;
}

export const useKeystoneStore = create<KeystoneState>((set, get) => ({
  engagements: [],
  engagementsLoading: false,
  engagementsError: null,
  activeEngagement: null,
  activeDocuments: [],
  activeRun: null,
  detailLoading: false,

  fetchEngagements: async (token) => {
    set({ engagementsLoading: true, engagementsError: null });
    try {
      const res = await fetch(`${API}/api/v1/engagements`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch engagements');
      const data = await res.json();
      set({ engagements: data.engagements ?? [], engagementsLoading: false });
    } catch (err) {
      set({ engagementsError: String(err), engagementsLoading: false });
    }
  },

  createEngagement: async (payload, token) => {
    const res = await fetch(`${API}/api/v1/engagements`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail ?? 'Failed to create engagement');
    }
    const engagement: Engagement = await res.json();
    set((s) => ({ engagements: [engagement, ...s.engagements] }));
    return engagement;
  },

  deleteEngagement: async (id, token) => {
    await fetch(`${API}/api/v1/engagements/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    set((s) => ({ engagements: s.engagements.filter((e) => e.id !== id) }));
  },

  fetchEngagement: async (id, token) => {
    set({ detailLoading: true });
    try {
      const res = await fetch(`${API}/api/v1/engagements/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Not found');
      const engagement: Engagement = await res.json();
      set({ activeEngagement: engagement, detailLoading: false });
      // Sync into list too
      set((s) => ({
        engagements: s.engagements.map((e) => (e.id === id ? engagement : e)),
      }));
    } catch {
      set({ detailLoading: false });
    }
  },

  fetchDocuments: async (engagementId, token) => {
    const res = await fetch(`${API}/api/v1/engagements/${engagementId}/documents`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const docs: UploadedDocument[] = await res.json();
    set({ activeDocuments: docs });
  },

  fetchRun: async (engagementId, token) => {
    const res = await fetch(`${API}/api/v1/engagements/${engagementId}/runs/latest`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const run: KeystoneRun = await res.json();
    set({ activeRun: run });
  },

  uploadDocument: async (engagementId, file, docType, token) => {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(
      `${API}/api/v1/engagements/${engagementId}/documents?doc_type=${docType}`,
      { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form }
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail ?? 'Upload failed');
    }
    const doc: UploadedDocument = await res.json();
    set((s) => ({ activeDocuments: [...s.activeDocuments, doc] }));
    return doc;
  },

  startRun: async (engagementId, token) => {
    const res = await fetch(`${API}/api/v1/engagements/${engagementId}/runs`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail ?? 'Failed to start run');
    }
  },

  submitGate1: async (engagementId, restoredIds, token) => {
    const res = await fetch(`${API}/api/v1/engagements/${engagementId}/runs/latest/gate1`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ restored_segment_ids: restoredIds }),
    });
    if (!res.ok) throw new Error('Gate 1 submission failed');
  },

  submitGate2: async (engagementId, glossary, token) => {
    const res = await fetch(`${API}/api/v1/engagements/${engagementId}/runs/latest/gate2`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ glossary }),
    });
    if (!res.ok) throw new Error('Gate 2 submission failed');
  },

  submitGate3: async (engagementId, outline, token) => {
    const res = await fetch(`${API}/api/v1/engagements/${engagementId}/runs/latest/gate3`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ outline }),
    });
    if (!res.ok) throw new Error('Gate 3 submission failed');
  },

  handleStatusChanged: (engagementId, newStatus) => {
    set((s) => ({
      engagements: s.engagements.map((e) =>
        e.id === engagementId ? { ...e, status: newStatus } : e
      ),
      activeEngagement:
        s.activeEngagement?.id === engagementId
          ? { ...s.activeEngagement, status: newStatus }
          : s.activeEngagement,
    }));
  },

  handleDocumentUploaded: (_engagementId) => {
    // Triggers a re-fetch of documents — called by useKeystoneSSE
  },
}));
```

---

## 4. SSE Hook — frontend/src/hooks/useKeystoneSSE.ts

Wires Keystone SSE events into the store and toast system.
Import the existing `useSSE` hook pattern and extend it.

```typescript
// useKeystoneSSE.ts
// Listens for Keystone SSE events and dispatches to store + toasts.

'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useKeystoneStore } from '@/stores/keystone.store';
import { useToastStore } from '@/stores/toast.store';
import type { EngagementStatus } from '@/types/keystone.types';

const API = process.env.NEXT_PUBLIC_BACKEND_URL ?? '';

const GATE_LABELS: Record<string, string> = {
  awaiting_review_1: 'Gate 1 ready for review',
  awaiting_review_2: 'Gate 2 ready for review',
  awaiting_review_3: 'Gate 3 ready for review',
  complete: 'Pipeline complete — files ready',
  failed: 'Pipeline failed',
};

export function useKeystoneSSE() {
  const { data: session } = useSession();
  const handleStatusChanged = useKeystoneStore((s) => s.handleStatusChanged);
  const engagements = useKeystoneStore((s) => s.engagements);
  const addToast = useToastStore((s) => s.addToast);

  useEffect(() => {
    if (!session?.accessToken) return;

    const es = new EventSource(
      `${API}/api/v1/stream`,
      // NOTE: EventSource doesn't support custom headers natively.
      // The existing stream.py auth uses the cookie-based session or
      // a token appended as a query param — match whatever the existing
      // useSSE.ts hook uses for auth. Check that file and replicate.
    );

    es.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        const { type, data } = msg;

        if (type === 'keystone.status_changed') {
          const { engagement_id, new_status } = data as {
            engagement_id: string;
            new_status: EngagementStatus;
          };

          handleStatusChanged(engagement_id, new_status);

          // Show toast for gate-ready and terminal statuses
          if (GATE_LABELS[new_status]) {
            const engagement = engagements.find((e) => e.id === engagement_id);
            const clientName = engagement?.client_name ?? 'Engagement';
            addToast({
              id: `${engagement_id}-${new_status}-${Date.now()}`,
              title: clientName,
              message: GATE_LABELS[new_status],
              variant: new_status === 'failed' ? 'error' : 'info',
              action:
                new_status.startsWith('awaiting_review') || new_status === 'complete'
                  ? {
                      label: new_status === 'complete' ? 'Download' : 'Review Now',
                      href: `/engagements/${engagement_id}`,
                    }
                  : undefined,
            });
          }
        }
      } catch {
        // Malformed event — ignore
      }
    };

    return () => es.close();
  }, [session?.accessToken, handleStatusChanged, engagements, addToast]);
}
```

**Important:** Check `frontend/src/hooks/useSSE.ts` before implementing — replicate
its auth pattern exactly (token in query param or cookie). Do not invent a new auth
approach for SSE.

---

## 5. Sidebar — replace NAV_ITEMS

In `frontend/src/components/layout/Sidebar.tsx`, replace the `NAV_ITEMS` array
and remove all imports for old icons (Layers, GitBranch, Inbox, Brain, Sun).

```typescript
import { FolderOpen, Settings } from 'lucide-react';

const NAV_ITEMS: NavItem[] = [
  { href: '/engagements', label: 'Engagements', icon: FolderOpen, symbol: '◈', showBadge: false },
  { href: '/settings',    label: 'Settings',    icon: Settings,    symbol: '⚙', showBadge: false },
];
```

Remove the `PRESENCE_USERS` section and the presence rendering block entirely —
it was leftover from the old codebase and is not part of Keystone.

Keep everything else in Sidebar.tsx unchanged: the active indicator `layoutId`
spring animation, hover handlers, Install App button at the bottom.

---

## 6. Page Shells

Create these three files as minimal shells. They will be fleshed out in D2–D5.

**frontend/src/app/(app)/engagements/page.tsx**:
```tsx
export default function EngagementsPage() {
  return <div style={{ color: 'var(--text-secondary)', padding: 32 }}>Engagements — coming in D2</div>;
}
```

**frontend/src/app/(app)/engagements/new/page.tsx**:
```tsx
export default function NewEngagementPage() {
  return <div style={{ color: 'var(--text-secondary)', padding: 32 }}>New Engagement — coming in D5</div>;
}
```

**frontend/src/app/(app)/engagements/[id]/page.tsx**:
```tsx
export default function EngagementDetailPage() {
  return <div style={{ color: 'var(--text-secondary)', padding: 32 }}>Engagement Detail — coming in D3</div>;
}
```

---

## 7. Toast Store — check and extend

The existing `frontend/src/stores/toast.store.ts` may need an `action` field
on the toast object (for the "Review Now" button). Check the current shape.
If `action: { label: string; href: string }` is not already supported, add it.

---

## 8. Verification Checklist

```bash
cd frontend
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities

npm run typecheck   # must pass with 0 errors
npm run build       # must pass clean

# Manual smoke test:
# 1. npm run dev
# 2. Log in
# 3. Sidebar shows "Engagements" and "Settings" only
# 4. Click Engagements → navigates to /engagements without crash
# 5. Click /engagements/new → renders shell without crash
```
