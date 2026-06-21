"""add financial-independence tables (goals, scores, advisory reports)

Revision ID: b1f2a3c4d5e6
Revises: 7c5e28f749e7
Create Date: 2026-06-21

Hand-authored (autogenerate would also try to drop the LangGraph checkpoint
tables, which are managed by the checkpointer — never drop them here).
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "b1f2a3c4d5e6"
down_revision: Union[str, None] = "7c5e28f749e7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "fi_goals",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=64), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("kind", sa.String(length=40), nullable=False),
        sa.Column("target_amount_minor", sa.BigInteger(), nullable=False),
        sa.Column("current_amount_minor", sa.BigInteger(), nullable=False),
        sa.Column("target_date", sa.String(length=10), nullable=True),
        sa.Column("priority", sa.Integer(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("extra", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_fi_goals_user_active", "fi_goals", ["user_id", "is_active"], unique=False)

    op.create_table(
        "fi_scores",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=64), nullable=False),
        sa.Column("score", sa.Numeric(precision=5, scale=2), nullable=False),
        sa.Column("pack_version", sa.String(length=20), nullable=False),
        sa.Column("inputs_hash", sa.String(length=64), nullable=False),
        sa.Column("result_json", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_fi_scores_user_date", "fi_scores", ["user_id", "created_at"], unique=False)

    op.create_table(
        "advisory_reports",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=64), nullable=False),
        sa.Column("trigger", sa.String(length=20), nullable=False),
        sa.Column("fi_score_id", sa.String(length=36), nullable=True),
        sa.Column("summary", sa.Text(), nullable=False),
        sa.Column("recommendations", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_advisory_reports_user_date", "advisory_reports", ["user_id", "created_at"], unique=False
    )


def downgrade() -> None:
    op.drop_table("advisory_reports")
    op.drop_index("ix_fi_scores_user_date", table_name="fi_scores")
    op.drop_table("fi_scores")
    op.drop_index("ix_fi_goals_user_active", table_name="fi_goals")
    op.drop_table("fi_goals")
