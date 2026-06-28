"""add webeye episode original video storage fields

Revision ID: 0009_webeye_ep_originals
Revises: 0008_webeye_originals
Create Date: 2026-06-26
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0009_webeye_ep_originals"
down_revision: str | None = "0008_webeye_originals"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("drama_episodes", sa.Column("source_file_name", sa.String(length=512), nullable=True))
    op.add_column("drama_episodes", sa.Column("source_file_size", sa.BigInteger(), nullable=True))
    op.add_column("drama_episodes", sa.Column("video_object_name", sa.Text(), nullable=True))
    op.add_column("drama_episodes", sa.Column("video_sha256", sa.String(length=64), nullable=True))
    op.add_column("drama_episodes", sa.Column("video_uploaded_at", sa.DateTime(timezone=True), nullable=True))
    op.alter_column(
        "drama_episodes",
        "video_content_length",
        existing_type=sa.Integer(),
        type_=sa.BigInteger(),
        existing_nullable=True,
    )
    op.create_index("ix_drama_episodes_video_sha256", "drama_episodes", ["video_sha256"])
    op.create_index("ix_drama_episodes_video_uploaded_at", "drama_episodes", ["video_uploaded_at"])


def downgrade() -> None:
    op.drop_index("ix_drama_episodes_video_uploaded_at", table_name="drama_episodes")
    op.drop_index("ix_drama_episodes_video_sha256", table_name="drama_episodes")
    op.alter_column(
        "drama_episodes",
        "video_content_length",
        existing_type=sa.BigInteger(),
        type_=sa.Integer(),
        existing_nullable=True,
    )
    for column_name in [
        "video_uploaded_at",
        "video_sha256",
        "video_object_name",
        "source_file_size",
        "source_file_name",
    ]:
        op.drop_column("drama_episodes", column_name)
