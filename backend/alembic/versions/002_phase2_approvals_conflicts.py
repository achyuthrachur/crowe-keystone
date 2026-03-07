"""Phase 2: approvals and conflicts tables

Revision ID: 002_phase2
Revises: 001_phase1
Create Date: 2026-03-07 00:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "002_phase2"
down_revision: Union[str, None] = "001_phase1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # -------------------------------------------------------------------------
    # approvals
    # -------------------------------------------------------------------------
    op.create_table(
        "approvals",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("prd_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("type", sa.Text(), nullable=False),
        sa.Column("requested_by", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "assigned_to",
            postgresql.ARRAY(sa.Text()),
            nullable=False,
            server_default="{}",
        ),
        sa.Column("status", sa.Text(), nullable=False, server_default="pending"),
        sa.Column("request_summary", sa.Text(), nullable=False, server_default=""),
        sa.Column(
            "decisions",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="[]",
        ),
        sa.Column("deadline", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["requested_by"], ["users.id"]),
    )

    op.create_index(
        "idx_approvals_assigned",
        "approvals",
        ["assigned_to"],
        postgresql_using="gin",
    )
    op.create_index(
        "idx_approvals_pending",
        "approvals",
        ["status"],
        postgresql_where=sa.text("status = 'pending'"),
    )

    # -------------------------------------------------------------------------
    # conflicts
    # -------------------------------------------------------------------------
    op.create_table(
        "conflicts",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("team_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("type", sa.Text(), nullable=False),
        sa.Column("severity", sa.Text(), nullable=False, server_default="advisory"),
        sa.Column("project_a_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("project_b_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
        sa.Column("specific_conflict", sa.Text(), nullable=False, server_default=""),
        sa.Column(
            "resolution_options",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="[]",
        ),
        sa.Column(
            "decision_required_from", postgresql.UUID(as_uuid=True), nullable=True
        ),
        sa.Column("status", sa.Text(), nullable=False, server_default="open"),
        sa.Column("resolution", sa.Text(), nullable=True),
        sa.Column(
            "detected_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["team_id"], ["teams.id"]),
        sa.ForeignKeyConstraint(["project_a_id"], ["projects.id"]),
        sa.ForeignKeyConstraint(["project_b_id"], ["projects.id"]),
        sa.ForeignKeyConstraint(["decision_required_from"], ["users.id"]),
    )

    op.create_index(
        "idx_conflicts_team_open",
        "conflicts",
        ["team_id"],
        postgresql_where=sa.text("status = 'open'"),
    )


def downgrade() -> None:
    op.drop_index("idx_conflicts_team_open", table_name="conflicts")
    op.drop_table("conflicts")
    op.drop_index("idx_approvals_pending", table_name="approvals")
    op.drop_index("idx_approvals_assigned", table_name="approvals")
    op.drop_table("approvals")
