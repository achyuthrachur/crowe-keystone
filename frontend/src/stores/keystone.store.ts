// keystone.store.ts
// Zustand store for all Keystone engagement state.
// All API calls go through this store — components never fetch directly.

import { create } from 'zustand';
import type {
  Engagement,
  EngagementStatus,
  UploadedDocument,
  KeystoneRun,
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

  // ── Pipeline run progress (live, driven by SSE) ────────────────────────────
  currentRunNode: string | null;
  runLog: string[];

  // ── SSE handlers (called by useKeystoneSSE) ────────────────────────────────
  handleStatusChanged: (engagementId: string, newStatus: EngagementStatus) => void;
  handleDocumentUploaded: (engagementId: string) => void;
  setRunCurrentNode: (node: string | null) => void;
  appendRunLog: (message: string) => void;
  clearRunLog: () => void;
}

export const useKeystoneStore = create<KeystoneState>((set) => ({
  engagements: [],
  engagementsLoading: false,
  engagementsError: null,
  activeEngagement: null,
  activeDocuments: [],
  activeRun: null,
  detailLoading: false,
  currentRunNode: null,
  runLog: [],

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
      throw new Error((err as { detail?: string }).detail ?? 'Failed to create engagement');
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
      throw new Error((err as { detail?: string }).detail ?? 'Upload failed');
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
      throw new Error((err as { detail?: string }).detail ?? 'Failed to start run');
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

  setRunCurrentNode: (node) => set({ currentRunNode: node }),

  appendRunLog: (message) =>
    set((s) => ({ runLog: [...s.runLog.slice(-49), message] })), // keep last 50 entries

  clearRunLog: () => set({ currentRunNode: null, runLog: [] }),
}));
