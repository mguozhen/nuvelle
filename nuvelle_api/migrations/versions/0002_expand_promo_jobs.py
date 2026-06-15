"""expand promo job records for FastAPI promo workflows

Revision ID: 0002_expand_promo_jobs
Revises: 0001_initial_schema
Create Date: 2026-06-16 03:30:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0002_expand_promo_jobs"
down_revision: str | None = "0001_initial_schema"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("promo_jobs", sa.Column("batch_id", sa.String(length=64), nullable=True))
    op.add_column("promo_jobs", sa.Column("output_dir", sa.Text(), nullable=True))
    op.add_column("promo_jobs", sa.Column("log", sa.Text(), nullable=True))
    op.add_column("promo_jobs", sa.Column("tt_safe", sa.Boolean(), nullable=False, server_default=sa.true()))
    op.add_column("promo_jobs", sa.Column("tt_notes", sa.Text(), nullable=True))
    op.add_column("promo_jobs", sa.Column("cover_warn", sa.Text(), nullable=True))
    op.create_index("ix_promo_jobs_batch_id", "promo_jobs", ["batch_id"])
    op.alter_column("promo_jobs", "tt_safe", server_default=None)


def downgrade() -> None:
    op.drop_index("ix_promo_jobs_batch_id", table_name="promo_jobs")
    op.drop_column("promo_jobs", "cover_warn")
    op.drop_column("promo_jobs", "tt_notes")
    op.drop_column("promo_jobs", "tt_safe")
    op.drop_column("promo_jobs", "log")
    op.drop_column("promo_jobs", "output_dir")
    op.drop_column("promo_jobs", "batch_id")
