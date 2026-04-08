"""add medication_reports and doctor_share_tokens

Revision ID: a3f8b2c1d4e5
Revises: 96d4b276cd50
Create Date: 2026-04-07

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB


# revision identifiers, used by Alembic.
revision: str = 'a3f8b2c1d4e5'
down_revision: Union[str, None] = '96d4b276cd50'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'medication_reports',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('report_type', sa.String(20), nullable=False, server_default='weekly'),
        sa.Column('period_start', sa.Date(), nullable=False),
        sa.Column('period_end', sa.Date(), nullable=False),
        sa.Column('compliance_rate', sa.Float(), nullable=False, server_default='0'),
        sa.Column('total_scheduled', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('total_checked', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('streak_days', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('stats_json', JSONB(), nullable=True),
        sa.Column('summary', sa.Text(), nullable=False),
        sa.Column('detail', sa.Text(), nullable=False),
        sa.Column('recommendations', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
    )
    op.create_index('ix_medication_reports_user_id', 'medication_reports', ['user_id'])

    op.create_table(
        'doctor_share_tokens',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('token', sa.String(64), nullable=False, unique=True),
        sa.Column('doctor_name', sa.String(100), nullable=False, server_default='담당 의사'),
        sa.Column('hospital_name', sa.String(200), nullable=True),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
    )
    op.create_index('ix_doctor_share_tokens_token', 'doctor_share_tokens', ['token'], unique=True)
    op.create_index('ix_doctor_share_tokens_user_id', 'doctor_share_tokens', ['user_id'])


def downgrade() -> None:
    op.drop_table('doctor_share_tokens')
    op.drop_table('medication_reports')
