"""Phase 2 Platform — real auth, Vercel integration, invitations

Revision ID: 005_phase2
Revises: 004_phase7
Create Date: 2026-03-10
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = '005_phase2'
down_revision = '004_phase7'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('users', sa.Column('email_verified',      sa.Boolean(),    nullable=False, server_default='false'))
    op.add_column('users', sa.Column('invite_token',        sa.Text(),       nullable=True))
    op.add_column('users', sa.Column('invite_expires_at',   sa.TIMESTAMP(timezone=True), nullable=True))
    op.add_column('users', sa.Column('invited_by',          UUID(as_uuid=True), nullable=True))
    op.add_column('users', sa.Column('vercel_access_token', sa.Text(),       nullable=True))
    op.add_column('users', sa.Column('vercel_user_id',      sa.Text(),       nullable=True))
    op.add_column('users', sa.Column('vercel_user_name',    sa.Text(),       nullable=True))
    op.add_column('users', sa.Column('vercel_team_id',      sa.Text(),       nullable=True))
    op.add_column('users', sa.Column('theme_preference',    sa.Text(),       nullable=False, server_default='dark'))
    op.add_column('users', sa.Column('last_seen_at',        sa.TIMESTAMP(timezone=True), nullable=True))

    op.add_column('projects', sa.Column('vercel_project_id',  sa.Text(), nullable=True))
    op.add_column('projects', sa.Column('vercel_project_url', sa.Text(), nullable=True))
    op.add_column('projects', sa.Column('vercel_framework',   sa.Text(), nullable=True))
    op.add_column('projects', sa.Column('last_synced_at',     sa.TIMESTAMP(timezone=True), nullable=True))

    op.create_table(
        'invitations',
        sa.Column('id',          UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('team_id',     UUID(as_uuid=True), sa.ForeignKey('teams.id'), nullable=False),
        sa.Column('invited_by',  UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('email',       sa.Text(), nullable=False),
        sa.Column('role',        sa.Text(), nullable=False, server_default='builder'),
        sa.Column('token',       sa.Text(), unique=True, nullable=False),
        sa.Column('expires_at',  sa.TIMESTAMP(timezone=True), nullable=False),
        sa.Column('accepted_at', sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column('created_at',  sa.TIMESTAMP(timezone=True), server_default=sa.text('NOW()')),
    )

    op.create_index('idx_users_invite_token',  'users',       ['invite_token'],      postgresql_where=sa.text("invite_token IS NOT NULL"))
    op.create_index('idx_users_vercel_id',     'users',       ['vercel_user_id'],    postgresql_where=sa.text("vercel_user_id IS NOT NULL"))
    op.create_index('idx_invitations_token',   'invitations', ['token'])
    op.create_index('idx_invitations_email',   'invitations', ['email'])
    op.create_index('idx_projects_vercel_id',  'projects',    ['vercel_project_id'], postgresql_where=sa.text("vercel_project_id IS NOT NULL"))


def downgrade() -> None:
    op.drop_index('idx_projects_vercel_id',  'projects')
    op.drop_index('idx_invitations_email',   'invitations')
    op.drop_index('idx_invitations_token',   'invitations')
    op.drop_index('idx_users_vercel_id',     'users')
    op.drop_index('idx_users_invite_token',  'users')
    op.drop_table('invitations')
    for col in ['vercel_project_id', 'vercel_project_url', 'vercel_framework', 'last_synced_at']:
        op.drop_column('projects', col)
    for col in ['email_verified', 'invite_token', 'invite_expires_at', 'invited_by',
                'vercel_access_token', 'vercel_user_id', 'vercel_user_name',
                'vercel_team_id', 'theme_preference', 'last_seen_at']:
        op.drop_column('users', col)
