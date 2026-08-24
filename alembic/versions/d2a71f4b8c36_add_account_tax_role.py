"""add accounts.tax_role and backfill the seeded credit accounts

The tax engine used to classify accounts by substring-matching their *name*
and required the credit accounts to be typed `liability`. Onboarding seeds
them as assets ("4110 APIT Receivable"), which is the correct accounting for
tax you may reclaim — so the two disagreed and `apit_withheld`, `ait_withheld`
and `foreign_tax_paid` were zero for every user who onboarded through the
product. Their tax payable was overstated by the whole amount already withheld.

`tax_role` makes the tax treatment explicit and independent of both the display
name and the accounting type.

The backfill below reproduces what the seeder would have set, matching on the
account codes the seeder itself uses. It deliberately does *not* fall back to
name matching for user-created accounts: guessing on a tax figure is how the
original bug happened, and a user who hand-rolled their own APIT account is
better served by setting the role explicitly than by a silent guess.

Revision ID: d2a71f4b8c36
Revises: e7b204c8a915
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "d2a71f4b8c36"
down_revision: str | None = "e7b204c8a915"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


# code → tax_role, mirroring _BASE_ACCOUNTS / _SOURCE_ACCOUNTS in
# interfaces/api/routers/onboarding.py.
_SEEDED_ROLES = {
    "4110": "apit_credit",
    "4410": "ait_credit",
    "4510": "foreign_tax_credit",
    "4500": "fsi_income",
}


def upgrade() -> None:
    op.add_column("accounts", sa.Column("tax_role", sa.String(30), nullable=True))
    op.create_check_constraint(
        "ck_accounts_tax_role",
        "accounts",
        "tax_role IS NULL OR tax_role IN "
        "('apit_credit','ait_credit','foreign_tax_credit',"
        "'qualifying_payment','fsi_income')",
    )

    accounts = sa.table(
        "accounts",
        sa.column("code", sa.String),
        sa.column("name", sa.String),
        sa.column("tax_role", sa.String),
    )
    for code, role in _SEEDED_ROLES.items():
        op.execute(accounts.update().where(accounts.c.code == code).values(tax_role=role))

    # The qualifying-payment account is new — no existing user has one, and
    # nothing can be posted to a role that has no account, so there is nothing
    # to backfill here. Existing users pick it up the next time onboarding runs;
    # they can also create it themselves from the ledger.


def downgrade() -> None:
    op.drop_constraint("ck_accounts_tax_role", "accounts", type_="check")
    op.drop_column("accounts", "tax_role")
