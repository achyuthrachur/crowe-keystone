export type AgentType =
  | 'brief_generator'
  | 'prd_drafter'
  | 'stress_tester'
  | 'conflict_detector'
  | 'approval_router'
  | 'update_writer'
  | 'retro_generator'
  | 'memory_indexer'
  | 'daily_brief_generator';

export type AgentStatus = 'running' | 'complete' | 'failed' | 'awaiting_human';

export interface AgentRun {
  id: string;
  team_id: string;
  agent_type: AgentType;
  project_id: string | null;
  triggered_by: string;
  trigger_event: string;
  input_summary: string;
  output_summary: string | null;
  graph_state: Record<string, unknown> | null;
  tokens_used: number | null;
  duration_ms: number | null;
  status: AgentStatus;
  error: string | null;
  created_at: string;
  completed_at: string | null;
  // Frontend-only fields
  current_node?: string;
  node_index?: number;
  total_nodes?: number;
  nodes_completed?: string[];
  checkpoint_question?: string;
}
