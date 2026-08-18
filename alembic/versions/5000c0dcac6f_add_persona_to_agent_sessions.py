"""add persona to agent sessions

Revision ID: 5000c0dcac6f
Revises: d902dbeff7d5
Create Date: 2026-08-18 18:41:35.046196

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "5000c0dcac6f"
down_revision: Union[str, None] = "d902dbeff7d5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "agent_sessions",
        sa.Column("persona", sa.String(length=20), nullable=False, server_default="scrooge"),
    )


def downgrade() -> None:
    op.drop_column("agent_sessions", "persona")
