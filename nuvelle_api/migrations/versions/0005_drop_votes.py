"""drop legacy votes table

Revision ID: 0005_drop_votes
Revises: 0004_admin_mvp
Create Date: 2026-06-19
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0005_drop_votes"
down_revision: str | None = "0004_admin_mvp"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.drop_index("ix_votes_verdict", table_name="votes")
    op.drop_index("ix_votes_taster", table_name="votes")
    op.drop_index("ix_votes_drama_id", table_name="votes")
    op.drop_table("votes")


def downgrade() -> None:
    op.create_table(
        "votes",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("drama_id", sa.String(length=120), nullable=False),
        sa.Column("taster", sa.String(length=120), nullable=False),
        sa.Column("verdict", sa.String(length=20), nullable=False),
        sa.Column("score", sa.Integer(), nullable=True),
        sa.Column("tags", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_votes_drama_id", "votes", ["drama_id"])
    op.create_index("ix_votes_taster", "votes", ["taster"])
    op.create_index("ix_votes_verdict", "votes", ["verdict"])
