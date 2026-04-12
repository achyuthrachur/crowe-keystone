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
  graph_state?: Record<string, unknown>;
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
