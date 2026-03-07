import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Text, func
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from src.database import Base


class Project(Base):
    __tablename__ = "projects"

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
    )
    created_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=False,
    )
    title: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Stage values: spark | brief | draft_prd | review | approved | in_build | shipped | retrospective
    stage: Mapped[str] = mapped_column(
        Text, nullable=False, server_default="spark", default="spark"
    )

    # stage_history: [{stage, timestamp, actor_id, note}]
    stage_history: Mapped[list] = mapped_column(
        JSONB, nullable=False, server_default="[]", default=list
    )

    spark_content: Mapped[str | None] = mapped_column(Text, nullable=True)

    # brief: BriefContent object
    brief: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    # prd_id: FK to prds table — set after PRD is created in Phase 3
    prd_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), nullable=True
    )

    # stack: array of technology strings
    stack: Mapped[list[str] | None] = mapped_column(ARRAY(Text), nullable=True)

    # effort_estimate: S | M | L | XL
    effort_estimate: Mapped[str | None] = mapped_column(Text, nullable=True)

    assigned_to: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    # build_log: [{timestamp, content, source, build_health}]
    build_log: Mapped[list] = mapped_column(
        JSONB, nullable=False, server_default="[]", default=list
    )

    # metadata: arbitrary JSON for extensibility (e.g., github_repo)
    metadata_: Mapped[dict] = mapped_column(
        "metadata", JSONB, nullable=False, server_default="{}", default=dict
    )

    archived: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="false", default=False
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
        return f"<Project id={self.id} title={self.title!r} stage={self.stage!r}>"
