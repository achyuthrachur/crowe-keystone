import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


class LoginRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    email: str
    password: str

    @field_validator("email", mode="before")
    @classmethod
    def normalise_email(cls, v: str) -> str:
        return v.strip().lower()


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    name: str
    avatar_url: Optional[str]
    team_id: Optional[uuid.UUID]
    role: str
    timezone: str
    created_at: datetime


class LoginResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user: UserResponse
    token: str
    token_type: str = "bearer"


class InviteRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    email: str
    role: str = "builder"

    @field_validator("role")
    @classmethod
    def validate_role(cls, v: str) -> str:
        allowed = {"builder", "lead", "admin"}
        if v not in allowed:
            raise ValueError(f"role must be one of {allowed}")
        return v


class InviteResponse(BaseModel):
    invitation_id: str
    email: str
    expires_at: str
    sent: bool


class RegisterRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    email: str
    name: str
    password: str = Field(min_length=8, max_length=128)
    invite_token: Optional[str] = None

    @field_validator("email", mode="before")
    @classmethod
    def normalise_email(cls, v: str) -> str:
        return v.strip().lower()


class InvitePreviewResponse(BaseModel):
    email: str
    role: str
    team_name: str
    invited_by_name: str
