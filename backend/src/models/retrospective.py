from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Text, func, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from src.database import Base


class Retrospective(Base):
    __tablename__ = "retrospectives"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True,
        server_default=text("gen_random_uuid()"), default=uuid.uuid4,
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, unique=True,
    )
    team_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("teams.id", ondelete="CASCADE"), nullable=False,
    )
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True,
    )
    built_vs_scoped: Mapped[str] = mapped_column(Text, nullable=False, server_default="", default="")
    decisions_changed: Mapped[list] = mapped_column(JSONB(astext_type=Text()), nullable=False, server_default=text("'[]'"), default=list)
    learnings: Mapped[list] = mapped_column(JSONB(astext_type=Text()), nullable=False, server_default=text("'[]'"), default=list)
    what_would_change: Mapped[list] = mapped_column(JSONB(astext_type=Text()), nullable=False, server_default=text("'[]'"), default=list)
    quality_signals: Mapped[Optional[dict]] = mapped_column(JSONB(astext_type=Text()), nullable=True)
    agent_run_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    published: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("false"), default=False)
    published_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now(), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now(), default=datetime.utcnow, onupdate=datetime.utcnow)
