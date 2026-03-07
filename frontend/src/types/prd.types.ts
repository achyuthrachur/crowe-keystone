export interface OpenQuestion {
  id: string;
  question: string;
  blocking: boolean;
  owner: string | null;
  answered: boolean;
  answer: string | null;
}

export interface StressTestResult {
  hypotheses: HypothesisResult[];
  assumption_audit: AssumptionAudit[];
}

export interface HypothesisResult {
  id: string;
  statement: string;
  supporting_evidence: string[];
  contradicting_evidence: string[];
  confidence_score: number;
  killed_by_red_team: boolean;
}

export interface AssumptionAudit {
  assumption: string;
  fragility_score: number;
  what_breaks_if_wrong: string;
  evidence_available: boolean;
}

export interface PRDContent {
  problem_statement: string;
  user_stories: Array<{
    id: string;
    role: string;
    action: string;
    benefit: string;
  }>;
  functional_requirements: Array<{
    id: string;
    requirement: string;
    priority: 'must' | 'should' | 'could';
  }>;
  non_functional_requirements: Array<{
    id: string;
    requirement: string;
    category: string;
  }>;
  out_of_scope: string[];
  stack: string[];
  component_inventory: Array<{
    name: string;
    purpose: string;
    technology: string;
  }>;
  data_layer_spec: Record<string, unknown>;
  api_contracts: Array<{
    endpoint: string;
    method: string;
    description: string;
    request?: Record<string, unknown>;
    response?: Record<string, unknown>;
  }>;
  success_criteria: string[];
  open_questions: OpenQuestion[];
  claude_code_prompt: string;
}

export interface PRD {
  id: string;
  project_id: string;
  version: number;
  status: 'draft' | 'in_review' | 'approved' | 'superseded';
  content: PRDContent;
  open_questions: OpenQuestion[];
  stress_test_results: StressTestResult | null;
  claude_code_prompt: string | null;
  diff_from_previous: PRDDiff[] | null;
  word_count: number | null;
  created_at: string;
  updated_at: string;
}

// Keep PRDVersion as alias for backward compatibility
export type PRDVersion = PRD & {
  assumption_audit: AssumptionAudit[] | null;
  created_by: string | null;
};

export interface PRDDiff {
  section: string;
  old: string;
  new: string;
}

// Kept for legacy use — single section shape used in older code
export interface PRDSection {
  id: string;
  title: string;
  content: string;
}
