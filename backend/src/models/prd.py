from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Integer, Text, func, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from src.database import Base


class Prd(Base):
    __tablename__ = "prds"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
        default=uuid.uuid4,
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
    )
    version: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default="1", default=1
    )
    # status: draft | in_review | approved | superseded
    status: Mapped[str] = mapped_column(
        Text, nullable=False, server_default="draft", default="draft"
    )
    # content: PRDContent object — all structured PRD sections
    content: Mapped[dict] = mapped_column(
        JSONB(astext_type=Text()),
        nullable=False,
        server_default=text("'{}'"),
        default=dict,
    )
    # open_questions: [{id, question, blocking, owner, answered, answer}]
    open_questions: Mapped[list] = mapped_column(
        JSONB(astext_type=Text()),
        nullable=False,
        server_default=text("'[]'"),
        default=list,
    )
    # stress_test_results: {hypotheses, assumption_audit}
    stress_test_results: Mapped[Optional[dict]] = mapped_column(
        JSONB(astext_type=Text()), nullable=True
    )
    # assumption_audit: list of AssumptionAudit objects
    assumption_audit: Mapped[Optional[dict]] = mapped_column(
        JSONB(astext_type=Text()), nullable=True
    )
    claude_code_prompt: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    # diff_from_previous: [{section, old, new}]
    diff_from_previous: Mapped[Optional[list]] = mapped_column(
        JSONB(astext_type=Text()), nullable=True
    )
    word_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        default=datetime.utcnow,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    def __repr__(self) -> str:
        return (
            f"<Prd id={self.id} project_id={self.project_id} "
            f"version={self.version} status={self.status!r}>"
        )
