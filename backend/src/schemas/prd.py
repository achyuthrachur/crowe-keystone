"""
Pydantic v2 schemas for the Living PRD System.

PRDContent  — structured content matching PRDContent TypedDict from state.py
PRDCreate   — body for first-time PRD creation (rarely used directly; PUT handles upsert)
PRDUpdate   — body for PUT /projects/{id}/prd
PRDResponse — full PRD record returned to clients
PRDVersionResponse — lightweight version list item
OpenQuestion — single open question entry
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# PRD content structure — mirrors PRDContent TypedDict from state.py
# ---------------------------------------------------------------------------

class PRDContent(BaseModel):
    """Structured content for a PRD. All fields optional so partial saves work."""

    problem_statement: str = ""
    user_stories: list[dict[str, Any]] = Field(default_factory=list)
    functional_requirements: list[dict[str, Any]] = Field(default_factory=list)
    non_functional_requirements: list[dict[str, Any]] = Field(default_factory=list)
    out_of_scope: list[str] = Field(default_factory=list)
    stack: list[str] = Field(default_factory=list)
    component_inventory: list[dict[str, Any]] = Field(default_factory=list)
    data_layer_spec: dict[str, Any] = Field(default_factory=dict)
    api_contracts: list[dict[str, Any]] = Field(default_factory=list)
    success_criteria: list[str] = Field(default_factory=list)
    # open_questions duplicated inside content for LangGraph compatibility;
    # the canonical store is the top-level open_questions column on the Prd row.
    open_questions: list[dict[str, Any]] = Field(default_factory=list)
    claude_code_prompt: str = ""

    model_config = {"extra": "allow"}


# ---------------------------------------------------------------------------
# Single open question
# ---------------------------------------------------------------------------

class OpenQuestion(BaseModel):
    id: str
    question: str
    blocking: bool = False
    owner: Optional[str] = None
    answered: bool = False
    answer: Optional[str] = None

    model_config = {"extra": "allow"}


# ---------------------------------------------------------------------------
# Request bodies
# ---------------------------------------------------------------------------

class PRDCreate(BaseModel):
    content: PRDContent
    open_questions: list[dict[str, Any]] = Field(default_factory=list)


class PRDUpdate(BaseModel):
    """PUT body — content and/or open_questions may be omitted for partial saves."""
    content: Optional[PRDContent] = None
    open_questions: list[dict[str, Any]] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------

class PRDResponse(BaseModel):
    """Full PRD record — returned by GET and PUT /projects/{id}/prd."""

    id: uuid.UUID
    project_id: uuid.UUID
    version: int
    status: str
    content: dict[str, Any]
    open_questions: list[Any]
    stress_test_results: Optional[dict[str, Any]] = None
    assumption_audit: Optional[dict[str, Any]] = None
    claude_code_prompt: Optional[str] = None
    diff_from_previous: Optional[list[Any]] = None
    word_count: Optional[int] = None
    created_by: Optional[uuid.UUID] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PRDVersionResponse(BaseModel):
    """Lightweight version list item — returned by GET /projects/{id}/prd/versions."""

    id: uuid.UUID
    version: int
    status: str
    word_count: Optional[int] = None
    created_at: datetime

    model_config = {"from_attributes": True}
