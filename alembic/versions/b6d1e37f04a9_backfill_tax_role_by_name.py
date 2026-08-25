"""backfill accounts.tax_role for hand-made credit and FSI accounts

The d2a71f4b8c36 backfill only tagged the codes onboarding seeds (4110, 4410,
4510, 4500). Users who built their own chart of accounts — "2000 APIT Payable",
"2010 AIT Withheld", "4020 Foreign Service Income" — got nothing, so the new
engine saw no credits and no foreign-service income for them.

That is a regression, not a no-op: the *old* engine matched those accounts by
name, so switching to `tax_role` silently stopped crediting tax they had already
paid and moved their FSI from the 15% flat rate onto the progressive bands. One
real user's payable went from 3,481,996 to 5,690,184 — worse by 2.2M, in the
opposite direction from the bug this was all meant to fix.

This reproduces the old engine's name matching once, as data, so nobody's number
moves. Ongoing classification stays explicit via `tax_role`; the fragile
substring matching does not come back into the engine.

Two deliberate narrowings versus the old rules:

- `apit`/`ait` match on word boundaries (`\\mapit\\M`), not bare substrings, so an
  account called "Waiting Clearing" is not read as AIT withheld. The old engine
  had exactly that hazard.
- Credit accounts may be `asset` *or* `liability`. "APIT Receivable" is an asset
  and "APIT Payable" is a liability; both conventions are in real data, and
  insisting on one is what caused the original defect.

Only rows where `tax_role` is still NULL are touched, so the seeded tagging and
anything set by hand wins.

Revision ID: b6d1e37f04a9
Revises: a8e42d1b6f30
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "b6d1e37f04a9"
down_revision: str | None = "a8e42d1b6f30"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


# Ordered: the multi-word phrases run before the short tokens so a name like
# "Foreign Tax Credit" can never be claimed by a looser rule first.
_RULES = [
    (
        "foreign_tax_credit",
        "type in ('asset','liability') and name ilike '%foreign tax%'",
    ),
    (
        "apit_credit",
        r"type in ('asset','liability') and name ~* '\mapit\M'",
    ),
    (
        "ait_credit",
        r"type in ('asset','liability') and name ~* '\mait\M'",
    ),
    (
        "qualifying_payment",
        "type = 'expense' and (name ilike '%qualifying%' or name ilike '%donation%')",
    ),
    (
        "fsi_income",
        "type = 'income' and (name ilike '%foreign service%' or code ilike 'FSI%')",
    ),
]


def upgrade() -> None:
    conn = op.get_bind()
    for role, predicate in _RULES:
        conn.execute(
            sa.text(f"update accounts set tax_role = :role where tax_role is null and {predicate}"),
            {"role": role},
        )


def downgrade() -> None:
    # Only clears what this migration could have set. Accounts tagged by the
    # seeded-code backfill keep their role, because that migration owns them.
    conn = op.get_bind()
    predicates = " or ".join(f"({p})" for _, p in _RULES)
    conn.execute(
        sa.text(
            "update accounts set tax_role = null "
            "where code not in ('4110','4410','4510','4500') "
            f"and ({predicates})"
        )
    )
