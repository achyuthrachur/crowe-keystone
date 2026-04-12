from datetime import datetime
from typing import Optional, Any
import uuid

from pydantic import BaseModel


class StartRunResponse(BaseModel):
    run_id: uuid.UUID
    engagement_id: uuid.UUID
    status: str


class RunStatusResponse(BaseModel):
    run_id: uuid.UUID
    engagement_id: uuid.UUID
    status: str
    current_node: Optional[str]
    error: Optional[str]
    created_at: datetime
    completed_at: Optional[datetime]

    model_config = {"from_attributes": True}


# HITL Gate review request bodies

class Gate1ReviewRequest(BaseModel):
    """User submits which removed_segment IDs to restore."""
    restored_segment_ids: list[str] = []  # list of RemovedSegment.id strings


class AcronymEntryInput(BaseModel):
    term: str
    expansion: str


class Gate2ReviewRequest(BaseModel):
    """User submits the approved + edited glossary."""
    glossary: list[AcronymEntryInput]


class OutlineItemInput(BaseModel):
    id: str
    text: str
    source_quote: str
    slide_type_hint: Optional[str] = None


class ContentOutlineInput(BaseModel):
    key_themes: list[OutlineItemInput] = []
    pain_points: list[OutlineItemInput] = []
    stated_priorities: list[OutlineItemInput] = []
    open_questions: list[OutlineItemInput] = []
    potential_recommendations: list[OutlineItemInput] = []
    suggested_next_steps: list[OutlineItemInput] = []


class Gate3ReviewRequest(BaseModel):
    """User submits the finalized content outline."""
    outline: ContentOutlineInput
