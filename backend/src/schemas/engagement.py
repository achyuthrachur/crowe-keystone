from datetime import date, datetime
from typing import Optional
import uuid

from pydantic import BaseModel, Field


class EngagementCreate(BaseModel):
    client_name: str = Field(..., min_length=1, max_length=200)
    client_industry: str = Field(..., min_length=1, max_length=200)
    engagement_date: date
    attendees: str = Field(default="", max_length=2000)


class EngagementUpdate(BaseModel):
    client_name: Optional[str] = Field(None, min_length=1, max_length=200)
    client_industry: Optional[str] = Field(None, min_length=1, max_length=200)
    engagement_date: Optional[date] = None
    attendees: Optional[str] = Field(None, max_length=2000)


class EngagementResponse(BaseModel):
    id: uuid.UUID
    team_id: uuid.UUID
    created_by: Optional[uuid.UUID]
    client_name: str
    client_industry: str
    engagement_date: date
    attendees: str
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class EngagementListResponse(BaseModel):
    engagements: list[EngagementResponse]
    total: int
