import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from src.database import Base


class KeystoneRun(Base):
    __tablename__ = "keystone_runs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=func.gen_random_uuid(),
        default=uuid.uuid4,
    )
    engagement_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("engagements.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    triggered_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    # Status values:
    # running | awaiting_review_1 | awaiting_review_2 | awaiting_review_3
    # | compiling | complete | failed
    status: Mapped[str] = mapped_column(
        Text, nullable=False, server_default="running", default="running"
    )
    # Full KeystoneState snapshot — updated on every status transition
    graph_state: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    # Storage keys for generated output files
    deck_brief_storage_key: Mapped[str | None] = mapped_column(Text, nullable=True)
    deck_handoff_storage_key: Mapped[str | None] = mapped_column(Text, nullable=True)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), default=datetime.utcnow
    )
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    def __repr__(self) -> str:
        return f"<KeystoneRun id={self.id} engagement={self.engagement_id} status={self.status!r}>"
