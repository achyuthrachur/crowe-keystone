import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, field_validator


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
    avatar_url: str | None
    team_id: uuid.UUID | None
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
    invite_url: str
