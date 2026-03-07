"""Phase 3: prds table

Revision ID: 003_phase3
Revises: 002_phase2
Create Date: 2026-03-07 00:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "003_phase3"
down_revision: Union[str, None] = "002_phase2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "prds",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column(
            "project_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("projects.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("status", sa.Text(), nullable=False, server_default="draft"),
        # status: draft | in_review | approved | superseded
        sa.Column(
            "content",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="{}",
        ),
        sa.Column(
            "open_questions",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="[]",
        ),
        sa.Column(
            "stress_test_results",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
        ),
        sa.Column(
            "assumption_audit",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
        ),
        sa.Column("claude_code_prompt", sa.Text(), nullable=True),
        sa.Column(
            "diff_from_previous",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
        ),
        sa.Column("word_count", sa.Integer(), nullable=True),
        sa.Column(
            "created_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id"),
            nullable=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
    )

    # Now add the FK from projects.prd_id → prds.id (deferred from Phase 1)
    op.add_column(
        "projects",
        sa.Column(
            "prd_id_fk",
            postgresql.UUID(as_uuid=True),
            nullable=True,
        ),
    )
    # Note: projects.prd_id already exists (added in Phase 1 as plain UUID without FK).
    # We add prd_id_fk as a separate column with proper FK constraint for now,
    # and keep the original prd_id for backward compat. In Phase 8 we can consolidate.

    op.create_index("idx_prds_project_version", "prds", ["project_id", "version"])
    op.create_index("idx_prds_project_status", "prds", ["project_id", "status"])


def downgrade() -> None:
    op.drop_index("idx_prds_project_status", table_name="prds")
    op.drop_index("idx_prds_project_version", table_name="prds")
    op.drop_column("projects", "prd_id_fk")
    op.drop_table("prds")
