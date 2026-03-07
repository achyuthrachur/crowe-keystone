import type { BuildLogEntry } from './project.types';

export type KeystoneSSEEvent =
  | { type: 'connected';
      data: { user_id: string } }

  | { type: 'project.created';
      data: { project_id: string; title: string; stage: string; created_by: string } }

  | { type: 'project.stage_changed';
      data: { project_id: string; title: string; new_stage: string;
              old_stage: string; actor_name: string } }

  | { type: 'project.build_log_updated';
      data: { project_id: string; entry: BuildLogEntry } }

  | { type: 'conflict.detected';
      data: { conflict_id: string; type: string; severity: string;
              project_a_id: string; project_a_title: string;
              project_b_id: string; project_b_title: string;
              specific_conflict: string } }

  | { type: 'conflict.resolved';
      data: { conflict_id: string; resolution: string } }

  | { type: 'approval.requested';
      data: { approval_id: string; project_id: string; project_title: string;
              type: string; summary: string; deadline: string } }

  | { type: 'approval.decided';
      data: { approval_id: string; project_id: string;
              decision: string; decided_by: string } }

  | { type: 'agent.started';
      data: { run_id: string; agent_type: string; project_id?: string } }

  | { type: 'agent.node_entered';
      data: { run_id: string; node_name: string;
              node_index: number; total_nodes: number } }

  | { type: 'agent.checkpoint';
      data: { run_id: string; project_id?: string; question: string } }

  | { type: 'agent.completed';
      data: { run_id: string; output_summary: string; tokens_used: number } }

  | { type: 'agent.failed';
      data: { run_id: string; error: string } }

  | { type: 'prd.updated';
      data: { project_id: string; version: number; updated_by: string } }

  | { type: 'daily_brief.ready';
      data: { user_id: string; date: string } }

  | { type: 'memory.entry_added';
      data: { entry_id: string; type: string; project_id?: string } };
