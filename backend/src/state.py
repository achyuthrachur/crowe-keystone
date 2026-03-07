# backend/src/state.py
# THIS FILE IS SACRED.
# Run keystone-schema-validator before ANY change to this file.
# Nodes return a DICT with only the fields they modify — not the full state.
# Annotated[list, operator.add] fields are automatically merged across parallel branches.

import operator
from typing import Annotated, Optional, TypedDict


class HypothesisResult(TypedDict):
    id: str
    statement: str
    supporting_evidence: list[str]
    contradicting_evidence: list[str]
    confidence_score: float           # 0.0 to 1.0
    killed_by_red_team: bool


class AssumptionAudit(TypedDict):
    assumption: str
    fragility_score: float            # 0.0 = bedrock, 1.0 = house of cards
    what_breaks_if_wrong: str
    evidence_available: bool


class ConflictResult(TypedDict):
    id: str
    type: str
    severity: str
    project_a_id: str
    project_b_id: str
    specific_conflict: str            # exactly 2 sentences
    resolution_options: list[dict]    # [{option, implication}]


class BriefContent(TypedDict):
    problem_statement: str
    proposed_scope: str
    ai_recommendation: str            # build | configure | optimize | no_action
    effort_estimate: str              # S | M | L | XL
    stack_recommendation: list[str]
    overlaps_with: list[str]          # project IDs
    open_questions: list[str]
    confidence_score: float


class PRDContent(TypedDict):
    problem_statement: str
    user_stories: list[dict]
    functional_requirements: list[dict]
    non_functional_requirements: list[dict]
    out_of_scope: list[str]
    stack: list[str]
    component_inventory: list[dict]
    data_layer_spec: dict
    api_contracts: list[dict]
    success_criteria: list[str]
    open_questions: list[dict]        # {id, question, blocking, owner}
    claude_code_prompt: str


class KeystoneState(TypedDict):
    # ── Identity
    run_id: str
    agent_type: str
    project_id: Optional[str]
    team_id: str
    triggered_by: str                 # user_id

    # ── Input
    raw_input: str
    input_type: str                   # spark | notes | prd | data
    context: dict                     # additional context from caller

    # ── Brief
    brief: Optional[BriefContent]

    # ── PRD
    prd_draft: Optional[PRDContent]
    prd_version: int

    # ── Stress test (parallel branches — Annotated[list, operator.add] merges results)
    hypotheses: Annotated[list[HypothesisResult], operator.add]
    adversarial_findings: list[str]
    assumption_audit: Annotated[list[AssumptionAudit], operator.add]
    stress_test_confidence: float

    # ── Conflict detection
    all_project_states: list[dict]
    detected_conflicts: Annotated[list[ConflictResult], operator.add]

    # ── Approvals
    approval_type: Optional[str]
    approval_chain: list[str]
    approval_context_summary: str

    # ── Build updates
    raw_build_notes: Optional[str]
    structured_update: Optional[dict]

    # ── Daily brief
    user_id: Optional[str]
    brief_sections: Optional[dict]

    # ── Memory
    memory_entries: list[dict]
    similar_prior_projects: list[dict]

    # ── Control flow
    human_checkpoint_needed: bool
    checkpoint_question: Optional[str]
    checkpoint_response: Optional[str]
    quality_score: float              # 0.0 to 1.0
    loop_count: int                   # prevents runaway loops (max 3)
    errors: list[str]
    status: str                       # running | complete | failed | awaiting_human
