"""add billing tables

Revision ID: 7c5e28f749e7
Revises: 2543339f3705
Create Date: 2026-06-21 12:17:15.572775

Hand-authored to include ONLY the new billing tables. Autogenerate also wanted to
drop the LangGraph checkpoint tables (checkpoints, checkpoint_blobs, checkpoint_writes,
checkpoint_migrations) — those are managed by the checkpointer, not Alembic, and must
never be dropped here.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "7c5e28f749e7"
down_revision: Union[str, None] = "2543339f3705"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "subscriptions",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=64), nullable=False),
        sa.Column("plan", sa.String(length=20), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("provider", sa.String(length=20), nullable=False),
        sa.Column("provider_customer_id", sa.String(length=100), nullable=True),
        sa.Column("provider_subscription_id", sa.String(length=100), nullable=True),
        sa.Column("current_period_start", sa.DateTime(timezone=True), nullable=True),
        sa.Column("current_period_end", sa.DateTime(timezone=True), nullable=True),
        sa.Column("cancel_at_period_end", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", name="uq_subscriptions_user"),
    )
    op.create_table(
        "usage_counters",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=64), nullable=False),
        sa.Column("period", sa.String(length=7), nullable=False),
        sa.Column("metric", sa.String(length=40), nullable=False),
        sa.Column("count", sa.Integer(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "period", "metric", name="uq_usage_user_period_metric"),
    )
    op.create_index("ix_usage_user", "usage_counters", ["user_id"], unique=False)
    op.create_table(
        "user_profiles",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("email", sa.String(length=320), nullable=True),
        sa.Column("display_name", sa.String(length=200), nullable=True),
        sa.Column("paddle_customer_id", sa.String(length=100), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("user_profiles")
    op.drop_index("ix_usage_user", table_name="usage_counters")
    op.drop_table("usage_counters")
    op.drop_table("subscriptions")
