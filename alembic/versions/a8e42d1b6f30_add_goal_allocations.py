"""add goal_allocations — link goals to real money

`fi_goals.current_amount_minor` was written only from user input and nothing
ever derived it from the ledger, so goal progress was a number you typed and
had to maintain by hand. Neither client exposed the field on create *or* edit,
which meant every goal made in the app sat at 0% forever — while both UIs said
progress was tracked from your ledger.

An allocation is a claim on a *live* balance instead: "600,000 of my savings
account is for the house deposit". Progress is derived from what the account
actually holds, so it moves when money moves and only when money moves. One
account can back several goals; when their claims exceed the balance the
shortfall is surfaced and the balance apportioned by the goal's `priority`.

`current_amount_minor` is left in place and no longer written. It is not
dropped here: the values are the only record of what users had entered by hand,
and a migration that destroys them cannot be undone by a downgrade.

Revision ID: a8e42d1b6f30
Revises: f5c93a71d84e
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "a8e42d1b6f30"
down_revision: str | None = "f5c93a71d84e"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "goal_allocations",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(64), nullable=False),
        sa.Column(
            "goal_id",
            sa.String(36),
            sa.ForeignKey("fi_goals.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "account_id",
            sa.String(36),
            sa.ForeignKey("accounts.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("allocated_minor", sa.BigInteger(), nullable=False, server_default="0"),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.UniqueConstraint("goal_id", "account_id", name="uq_goal_allocations_goal_account"),
        sa.CheckConstraint("allocated_minor >= 0", name="ck_goal_allocations_non_negative"),
    )
    op.create_index("ix_goal_allocations_user_id", "goal_allocations", ["user_id"])
    op.create_index("ix_goal_allocations_goal", "goal_allocations", ["goal_id"])


def downgrade() -> None:
    op.drop_index("ix_goal_allocations_goal", table_name="goal_allocations")
    op.drop_index("ix_goal_allocations_user_id", table_name="goal_allocations")
    op.drop_table("goal_allocations")
