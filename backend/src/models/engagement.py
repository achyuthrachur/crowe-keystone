import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from src.database import Base


class Engagement(Base):
    __tablename__ = "engagements"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=func.gen_random_uuid(),
        default=uuid.uuid4,
    )
    team_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("teams.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    client_name: Mapped[str] = mapped_column(Text, nullable=False)
    client_industry: Mapped[str] = mapped_column(Text, nullable=False)
    engagement_date: Mapped[date] = mapped_column(Date, nullable=False)
    attendees: Mapped[str] = mapped_column(Text, nullable=False, default="")
    # Status values:
    # draft | uploading | ready | running | awaiting_review_1 | awaiting_review_2
    # | awaiting_review_3 | compiling | complete | failed
    status: Mapped[str] = mapped_column(
        Text, nullable=False, server_default="draft", default="draft"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), default=datetime.utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    def __repr__(self) -> str:
        return f"<Engagement id={self.id} client={self.client_name!r} status={self.status!r}>"
