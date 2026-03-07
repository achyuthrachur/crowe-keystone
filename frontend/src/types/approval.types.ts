export type ApprovalType =
  | 'stage_advance'
  | 'architectural_decision'
  | 'scope_change'
  | 'deployment';

export type ApprovalStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'changes_requested'
  | 'expired';

export type ApprovalDecision = 'approve' | 'reject' | 'changes';

export interface ApprovalDecisionRecord {
  user_id: string;
  decision: ApprovalDecision;
  note: string | null;
  timestamp: string;
}

export interface Approval {
  id: string;
  project_id: string;
  project_title?: string;
  prd_id: string | null;
  type: ApprovalType;
  requested_by: string;
  assigned_to: string[];
  status: ApprovalStatus;
  request_summary: string;
  decisions: ApprovalDecisionRecord[];
  deadline: string | null;
  created_at: string;
  resolved_at: string | null;
}

export interface ApprovalCreate {
  project_id: string;
  type: ApprovalType;
  request_summary: string;
  assigned_to: string[];
  deadline?: string;
}
