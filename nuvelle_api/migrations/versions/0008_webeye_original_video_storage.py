"""add webeye original video storage fields

Revision ID: 0008_webeye_originals
Revises: 0007_cover_transfer_tracking
Create Date: 2026-06-26
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0008_webeye_originals"
down_revision: str | None = "0007_cover_transfer_tracking"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    for column in [
        sa.Column("original_video_gcs_uri", sa.Text(), nullable=True),
        sa.Column("original_video_object_name", sa.Text(), nullable=True),
        sa.Column("original_video_content_length", sa.BigInteger(), nullable=True),
        sa.Column("original_video_sha256", sa.String(length=64), nullable=True),
        sa.Column("original_video_uploaded_at", sa.DateTime(timezone=True), nullable=True),
    ]:
        op.add_column("dramas", column)

    op.create_index("ix_dramas_original_video_uploaded_at", "dramas", ["original_video_uploaded_at"])
    op.create_index("ix_dramas_original_video_sha256", "dramas", ["original_video_sha256"])


def downgrade() -> None:
    op.drop_index("ix_dramas_original_video_sha256", table_name="dramas")
    op.drop_index("ix_dramas_original_video_uploaded_at", table_name="dramas")
    for column_name in [
        "original_video_uploaded_at",
        "original_video_sha256",
        "original_video_content_length",
        "original_video_object_name",
        "original_video_gcs_uri",
    ]:
        op.drop_column("dramas", column_name)
