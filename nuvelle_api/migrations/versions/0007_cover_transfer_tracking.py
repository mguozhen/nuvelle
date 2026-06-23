"""add cover transfer tracking

Revision ID: 0007_cover_transfer_tracking
Revises: 0006_video_transfer_tracking
Create Date: 2026-06-23
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0007_cover_transfer_tracking"
down_revision: str | None = "0006_video_transfer_tracking"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    for column in [
        sa.Column("source_cover_image_url", sa.Text(), nullable=True),
        sa.Column("cover_gcs_uri", sa.Text(), nullable=True),
        sa.Column("cover_transfer_status", sa.String(length=40), nullable=True),
        sa.Column("cover_transfer_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("cover_transfer_error", sa.Text(), nullable=True),
    ]:
        op.add_column("dramas", column)

    op.create_index("ix_dramas_cover_transfer_status", "dramas", ["cover_transfer_status"])
    op.create_index("ix_dramas_cover_transfer_at", "dramas", ["cover_transfer_at"])


def downgrade() -> None:
    op.drop_index("ix_dramas_cover_transfer_at", table_name="dramas")
    op.drop_index("ix_dramas_cover_transfer_status", table_name="dramas")
    for column_name in [
        "cover_transfer_error",
        "cover_transfer_at",
        "cover_transfer_status",
        "cover_gcs_uri",
        "source_cover_image_url",
    ]:
        op.drop_column("dramas", column_name)
