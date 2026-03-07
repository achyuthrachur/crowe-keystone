import type { Stage } from '@/lib/stage-colors';

export type { Stage };

export interface UserBasic {
  id: string;
  name: string;
  email?: string;
  avatar_url: string | null;
}

export interface StageHistoryEntry {
  stage: Stage;
  timestamp: string;
  actor_id: string;
  note?: string;
}

export interface BuildLogEntry {
  timestamp: string;
  content: string;
  source: string;
  build_health: 'on_track' | 'scope_growing' | 'blocked' | 'ahead_of_schedule';
}

export interface BriefContent {
  problem_statement: string;
  proposed_scope: string;
  ai_recommendation: 'build' | 'configure' | 'optimize' | 'no_action';
  effort_estimate: 'S' | 'M' | 'L' | 'XL';
  stack_recommendation: string[];
  overlaps_with: string[];
  open_questions: string[];
  confidence_score: number;
}

export interface Project {
  id: string;
  team_id: string;
  created_by: string;
  title: string;
  description: string | null;
  stage: Stage;
  stage_history: StageHistoryEntry[];
  spark_content: string | null;
  brief: BriefContent | null;
  prd_id: string | null;
  stack: string[];
  effort_estimate: 'S' | 'M' | 'L' | 'XL' | null;
  assigned_to: UserBasic | null;
  build_log: BuildLogEntry[];
  metadata: Record<string, unknown>;
  archived: boolean;
  created_at: string;
  updated_at: string;
  has_conflicts?: boolean;
}

export interface ProjectListItem {
  id: string;
  title: string;
  description: string | null;
  stage: Stage;
  stack: string[];
  assigned_to: UserBasic | null;
  updated_at: string;
  effort_estimate: 'S' | 'M' | 'L' | 'XL' | null;
  has_conflicts?: boolean;
}

export interface ProjectCreate {
  title: string;
  spark_content?: string;
  description?: string;
}

export interface ProjectUpdate {
  title?: string;
  description?: string;
  assigned_to?: string;
  stack?: string[];
  effort_estimate?: 'S' | 'M' | 'L' | 'XL';
}
