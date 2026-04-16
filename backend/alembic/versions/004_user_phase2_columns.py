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
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT false")
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS invite_token TEXT")
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS invite_expires_at TIMESTAMPTZ")
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES users(id)")
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS vercel_access_token TEXT")
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS vercel_user_id TEXT")
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS vercel_user_name TEXT")
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS vercel_team_id TEXT")
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS theme_preference TEXT NOT NULL DEFAULT 'dark'")
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ")


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
