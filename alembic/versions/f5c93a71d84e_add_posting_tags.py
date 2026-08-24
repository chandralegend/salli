"""add tags and posting_tags — a second classification axis

The chart of accounts was the only way to classify spending, and onboarding
seeds exactly one personal expense account ("5000 General Expenses"). Budget
lines key on `account_id` with the "category" being literally the account's
display name, so a default user's budget was a single line covering everything
and the Freedom screen's expense breakdown was one bar.

An account tree cannot answer "was this essential" as well as "which account
did this hit" without duplicating the whole tree beneath every answer, so this
adds an orthogonal dimension instead.

`posting_tags.kind` is denormalised from the tag into the primary key. That is
what enforces at most one tag per axis per posting — without it a posting could
carry both "essential" and "discretionary" and its amount would be counted
twice in any needs-vs-wants breakdown.

The `need` tags are seeded for every existing user here, and for new users by
`/onboarding/complete`. Category tags are created on demand as people use them.

Revision ID: f5c93a71d84e
Revises: d2a71f4b8c36
"""

import uuid
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "f5c93a71d84e"
down_revision: str | None = "d2a71f4b8c36"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


# Mirrors SYSTEM_NEED_TAGS in interfaces/api/routers/onboarding.py. Duplicated
# rather than imported: a migration must keep working even after the
# application constant changes.
_NEED_TAGS = [
    ("essential", "Needs", "#2E7D6B"),
    ("discretionary", "Wants", "#C77D3A"),
    ("savings", "Savings & Debt", "#3A5FC7"),
]


def upgrade() -> None:
    op.create_table(
        "tags",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(64), nullable=False),
        sa.Column("slug", sa.String(60), nullable=False),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("kind", sa.String(20), nullable=False),
        sa.Column("color", sa.String(20), nullable=False, server_default=""),
        sa.Column("is_system", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.UniqueConstraint("user_id", "kind", "slug", name="uq_tags_user_kind_slug"),
        sa.CheckConstraint("kind IN ('category','need')", name="ck_tags_kind"),
    )
    op.create_index("ix_tags_user_id", "tags", ["user_id"])

    op.create_table(
        "posting_tags",
        sa.Column(
            "posting_id",
            sa.String(36),
            sa.ForeignKey("postings.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column("kind", sa.String(20), primary_key=True),
        sa.Column(
            "tag_id", sa.String(36), sa.ForeignKey("tags.id", ondelete="CASCADE"), nullable=False
        ),
    )
    op.create_index("ix_posting_tags_tag", "posting_tags", ["tag_id"])

    # Seed the need axis for everyone who already has a ledger. Accounts is the
    # right source: every onboarded user has some, and users without one have
    # nothing to categorise yet and will be seeded at onboarding.
    conn = op.get_bind()
    user_ids = [r[0] for r in conn.execute(sa.text("SELECT DISTINCT user_id FROM accounts"))]
    if user_ids:
        conn.execute(
            sa.text(
                "INSERT INTO tags (id, user_id, slug, name, kind, color, is_system) "
                "VALUES (:id, :user_id, :slug, :name, 'need', :color, true)"
            ),
            [
                {
                    "id": str(uuid.uuid4()),
                    "user_id": user_id,
                    "slug": slug,
                    "name": name,
                    "color": color,
                }
                for user_id in user_ids
                for slug, name, color in _NEED_TAGS
            ],
        )


def downgrade() -> None:
    op.drop_index("ix_posting_tags_tag", table_name="posting_tags")
    op.drop_table("posting_tags")
    op.drop_index("ix_tags_user_id", table_name="tags")
    op.drop_table("tags")
