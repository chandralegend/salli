"""add agent_sessions

Revision ID: 2543339f3705
Revises: 19967d395c93
Create Date: 2026-06-21 08:18:24.247826

Hand-authored to include ONLY the agent_sessions table. The LangGraph checkpoint
tables are managed by the checkpointer (not Alembic) and must never be dropped here.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "2543339f3705"
down_revision: Union[str, None] = "19967d395c93"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "agent_sessions",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("thread_id", sa.String(length=36), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_active_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "thread_id", name="uq_agent_sessions_user_thread"),
    )
    op.create_index(
        "ix_agent_sessions_user_active", "agent_sessions", ["user_id", "last_active_at"], unique=False
    )


def downgrade() -> None:
    op.drop_index("ix_agent_sessions_user_active", table_name="agent_sessions")
    op.drop_table("agent_sessions")
