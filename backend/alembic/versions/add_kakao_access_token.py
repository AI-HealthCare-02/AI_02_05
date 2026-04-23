"""add kakao_access_token to users

Revision ID: add_kakao_access_token
Revises: 96d4b276cd50
Create Date: 2025-04-08
"""
from alembic import op
import sqlalchemy as sa

revision = 'add_kakao_access_token'
down_revision = '96d4b276cd50'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('users', sa.Column('kakao_access_token', sa.String(512), nullable=True))


def downgrade():
    op.drop_column('users', 'kakao_access_token')
