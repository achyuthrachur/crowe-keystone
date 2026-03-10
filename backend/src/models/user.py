import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Text, TIMESTAMP, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from src.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=func.gen_random_uuid(),
        default=uuid.uuid4,
    )
    email: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    avatar_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    team_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("teams.id", ondelete="SET NULL"),
        nullable=True,
    )
    # Role values: builder | lead | admin
    role: Mapped[str] = mapped_column(Text, nullable=False, server_default="builder", default="builder")
    timezone: Mapped[str] = mapped_column(
        Text, nullable=False, server_default="America/Chicago", default="America/Chicago"
    )
    hashed_password: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        default=datetime.utcnow,
    )
    # Phase 2 additions
    email_verified: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default='false', default=False)
    invite_token: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    invite_expires_at: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True), nullable=True)
    invited_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=True)
    vercel_access_token: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    vercel_user_id: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    vercel_user_name: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    vercel_team_id: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    theme_preference: Mapped[str] = mapped_column(Text, nullable=False, server_default='dark', default='dark')
    last_seen_at: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True), nullable=True)

    def __repr__(self) -> str:
        return f"<User id={self.id} email={self.email!r}>"
