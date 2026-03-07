from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class ConflictResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    team_id: uuid.UUID
    type: str
    severity: str
    project_a_id: Optional[uuid.UUID] = None
    project_b_id: Optional[uuid.UUID] = None
    description: str
    specific_conflict: str
    resolution_options: list = []
    decision_required_from: Optional[uuid.UUID] = None
    status: str
    resolution: Optional[str] = None
    detected_at: datetime
    resolved_at: Optional[datetime] = None


class ConflictResolve(BaseModel):
    resolution: str
    option_chosen: Optional[str] = None


class ConflictDismiss(BaseModel):
    reason: str
