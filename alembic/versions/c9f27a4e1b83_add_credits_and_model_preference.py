"""add credit_purchases and user_profiles.preferred_model

Two additive changes for the credit system:

- `credit_purchases` holds non-expiring top-ups. It cannot live in
  `usage_counters` because that table is keyed by a `YYYY-MM` period and
  purchased credits have no period — they outlive every reset.
- `user_profiles.preferred_model` records which model a user's conversations
  run on. Nullable, and NULL means "use the default", so the column can be
  cleared rather than only ever set.

Nothing is dropped or rewritten. The retired `agent_messages`,
`statement_uploads`, and `advisor_runs` rows in `usage_counters` are left
exactly as they are: they are the record of a period that was billed under
different rules, and deleting them would destroy history to save nothing. The
new code simply never reads them.

Revision ID: c9f27a4e1b83
Revises: b6d1e37f04a9
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "c9f27a4e1b83"
down_revision: str | None = "b6d1e37f04a9"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "credit_purchases",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=64), nullable=False),
        sa.Column("credits", sa.Integer(), nullable=False),
        sa.Column("credits_remaining", sa.Integer(), nullable=False),
        sa.Column("provider_transaction_id", sa.String(length=100), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        # The idempotency key. Paddle retries webhooks, so without this a
        # redelivery would grant the same pack a second time.
        sa.UniqueConstraint("provider_transaction_id", name="uq_credit_purchase_txn"),
    )
    op.create_index("ix_credit_purchase_user", "credit_purchases", ["user_id"])

    op.add_column(
        "user_profiles",
        sa.Column("preferred_model", sa.String(length=40), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("user_profiles", "preferred_model")
    op.drop_index("ix_credit_purchase_user", table_name="credit_purchases")
    op.drop_table("credit_purchases")
