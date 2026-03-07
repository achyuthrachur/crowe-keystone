import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

# Valid stage values in progression order
VALID_STAGES = [
    "spark",
    "brief",
    "draft_prd",
    "review",
    "approved",
    "in_build",
    "shipped",
    "retrospective",
]

# Valid effort estimate values
VALID_EFFORT = {"S", "M", "L", "XL"}


class StageHistoryEntry(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    stage: str
    timestamp: datetime
    actor_id: str | None = None
    note: str | None = None


class BuildLogEntry(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    timestamp: datetime
    content: str
    source: str  # e.g. "manual" | "github" | "agent"
    build_health: str | None = None  # on_track | scope_growing | blocked | ahead_of_schedule


class ProjectCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    title: str = Field(..., min_length=1, max_length=500)
    spark_content: str | None = None
    description: str | None = None


class ProjectUpdate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    title: str | None = Field(default=None, min_length=1, max_length=500)
    description: str | None = None
    assigned_to: uuid.UUID | None = None
    stack: list[str] | None = None
    effort_estimate: str | None = None

    @field_validator("effort_estimate")
    @classmethod
    def validate_effort(cls, v: str | None) -> str | None:
        if v is not None and v not in VALID_EFFORT:
            raise ValueError(f"effort_estimate must be one of {VALID_EFFORT}")
        return v


class ProjectListItem(BaseModel):
    """Lightweight project representation for list endpoints."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    team_id: uuid.UUID
    created_by: uuid.UUID
    title: str
    description: str | None
    stage: str
    stack: list[str] | None
    effort_estimate: str | None
    assigned_to: uuid.UUID | None
    archived: bool
    created_at: datetime
    updated_at: datetime


class ProjectResponse(BaseModel):
    """Full project detail representation."""
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: uuid.UUID
    team_id: uuid.UUID
    created_by: uuid.UUID
    title: str
    description: str | None
    stage: str
    stage_history: list[dict]
    spark_content: str | None
    brief: dict | None
    prd_id: uuid.UUID | None
    stack: list[str] | None
    effort_estimate: str | None
    assigned_to: uuid.UUID | None
    build_log: list[dict]
    metadata: dict = Field(alias="metadata_", default_factory=dict)
    archived: bool
    created_at: datetime
    updated_at: datetime
