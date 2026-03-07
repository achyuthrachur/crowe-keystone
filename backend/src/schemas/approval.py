from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict


class ApprovalCreate(BaseModel):
    project_id: uuid.UUID
    type: Literal["stage_advance", "architectural_decision", "scope_change", "deployment"]
    request_summary: str
    assigned_to: list[str]
    deadline: Optional[datetime] = None


class ApprovalDecision(BaseModel):
    decision: Literal["approve", "reject", "changes_requested"]
    note: Optional[str] = None


class DecisionRecord(BaseModel):
    user_id: str
    decision: str
    note: Optional[str] = None
    timestamp: datetime


class ApprovalListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    type: str
    status: str
    request_summary: str
    assigned_to: list[str]
    deadline: Optional[datetime] = None
    created_at: datetime
    resolved_at: Optional[datetime] = None


class ApprovalResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    prd_id: Optional[uuid.UUID] = None
    type: str
    requested_by: uuid.UUID
    assigned_to: list[str]
    status: str
    request_summary: str
    decisions: list = []
    deadline: Optional[datetime] = None
    created_at: datetime
    resolved_at: Optional[datetime] = None
