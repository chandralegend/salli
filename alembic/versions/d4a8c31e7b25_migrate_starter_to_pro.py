"""move the retired Starter plan's holders onto Pro

Starter (`plus`) is gone from the registry. `get_plan()` resolves an unknown
key to Free, so any row left carrying it would silently drop to the Free
allowance — which is the whole reason this migration exists rather than being
left to a manual fix someone forgets.

Production had eight such rows when this was written. None were Paddle
customers: all carried `provider='manual'` with no `provider_subscription_id`,
i.e. deliberately comped accounts granted through January 2027. One of them had
hit exactly 500 agent messages in a month — the old Starter ceiling — so they
were actively being throttled by the tier we are retiring.

They move to Pro, which is what a comped paid tier means now that Pro is the
only paid tier. It is more generous than what they had, which is the right
direction to err for someone who was given a comp and is still inside it.

Deliberately scoped to `plan = 'plus'` and nothing else, so a real Paddle
subscriber (there are none today, but there will be) is never touched.

Revision ID: d4a8c31e7b25
Revises: c9f27a4e1b83
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "d4a8c31e7b25"
down_revision: str | None = "c9f27a4e1b83"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    conn = op.get_bind()
    conn.execute(sa.text("update subscriptions set plan = 'pro' where plan = 'plus'"))


def downgrade() -> None:
    # Reversible only approximately. Nothing records which rows were Starter, so
    # this reverses the set the upgrade could plausibly have touched: Pro rows
    # that are not Paddle subscriptions. Every row moved by the upgrade carried
    # provider='manual', and a genuine Pro subscriber has a provider
    # subscription id, so the two do not overlap in practice.
    conn = op.get_bind()
    conn.execute(
        sa.text(
            "update subscriptions set plan = 'plus' "
            "where plan = 'pro' and provider_subscription_id is null"
        )
    )
