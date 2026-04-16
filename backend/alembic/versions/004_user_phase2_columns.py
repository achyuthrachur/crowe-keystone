"""004 — add Phase 2 columns to users table

These columns exist in the User SQLAlchemy model but were never added to any
migration: email_verified, invite_token, invite_expires_at, invited_by,
vercel_access_token/user_id/user_name/team_id, theme_preference, last_seen_at.

Without this migration the register endpoint raises
  sqlalchemy.exc.ProgrammingError: column "email_verified" does not exist
which surfaces as a 500 Internal Server Error.

Revision ID: 004_user_phase2_columns
Revises: 003_keystone
Create Date: 2026-04-16
"""

from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from alembic import op

revision: str = "004_user_phase2_columns"
down_revision: Union[str, None] = "003_keystone"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column(
        "email_verified",
        sa.Boolean(),
        nullable=False,
        server_default=sa.text("false"),
    ))
    op.add_column("users", sa.Column(
        "invite_token", sa.Text(), nullable=True,
    ))
    op.add_column("users", sa.Column(
        "invite_expires_at",
        sa.TIMESTAMP(timezone=True),
        nullable=True,
    ))
    op.add_column("users", sa.Column(
        "invited_by",
        postgresql.UUID(as_uuid=True),
        sa.ForeignKey("users.id"),
        nullable=True,
    ))
    op.add_column("users", sa.Column(
        "vercel_access_token", sa.Text(), nullable=True,
    ))
    op.add_column("users", sa.Column(
        "vercel_user_id", sa.Text(), nullable=True,
    ))
    op.add_column("users", sa.Column(
        "vercel_user_name", sa.Text(), nullable=True,
    ))
    op.add_column("users", sa.Column(
        "vercel_team_id", sa.Text(), nullable=True,
    ))
    op.add_column("users", sa.Column(
        "theme_preference",
        sa.Text(),
        nullable=False,
        server_default=sa.text("'dark'"),
    ))
    op.add_column("users", sa.Column(
        "last_seen_at",
        sa.TIMESTAMP(timezone=True),
        nullable=True,
    ))


def downgrade() -> None:
    op.drop_column("users", "last_seen_at")
    op.drop_column("users", "theme_preference")
    op.drop_column("users", "vercel_team_id")
    op.drop_column("users", "vercel_user_name")
    op.drop_column("users", "vercel_user_id")
    op.drop_column("users", "vercel_access_token")
    op.drop_column("users", "invited_by")
    op.drop_column("users", "invite_expires_at")
    op.drop_column("users", "invite_token")
    op.drop_column("users", "email_verified")
