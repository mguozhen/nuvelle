"""add video transfer tracking

Revision ID: 0006_video_transfer_tracking
Revises: 0005_drop_votes
Create Date: 2026-06-23
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0006_video_transfer_tracking"
down_revision: str | None = "0005_drop_votes"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    for column in [
        sa.Column("video_transfer_status", sa.String(length=40), nullable=True),
        sa.Column("video_transfer_started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("video_transfer_finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("video_transfer_error", sa.Text(), nullable=True),
        sa.Column("video_transfer_total_episodes", sa.Integer(), nullable=True),
        sa.Column("video_transfer_done_episodes", sa.Integer(), nullable=True),
        sa.Column("video_transfer_failed_episodes", sa.Integer(), nullable=True),
    ]:
        op.add_column("dramas", column)

    op.create_index("ix_dramas_video_transfer_status", "dramas", ["video_transfer_status"])
    op.create_index("ix_dramas_video_transfer_started_at", "dramas", ["video_transfer_started_at"])
    op.create_index("ix_dramas_video_transfer_finished_at", "dramas", ["video_transfer_finished_at"])

    for column in [
        sa.Column("source_play_url", sa.Text(), nullable=True),
        sa.Column("gcs_uri", sa.Text(), nullable=True),
        sa.Column("video_transfer_status", sa.String(length=40), nullable=True),
        sa.Column("video_transfer_started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("video_transfer_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("video_transfer_error", sa.Text(), nullable=True),
        sa.Column("video_content_length", sa.Integer(), nullable=True),
    ]:
        op.add_column("drama_episodes", column)

    op.create_index("ix_drama_episodes_video_transfer_status", "drama_episodes", ["video_transfer_status"])
    op.create_index("ix_drama_episodes_video_transfer_started_at", "drama_episodes", ["video_transfer_started_at"])
    op.create_index("ix_drama_episodes_video_transfer_at", "drama_episodes", ["video_transfer_at"])


def downgrade() -> None:
    for index_name in [
        "ix_drama_episodes_video_transfer_at",
        "ix_drama_episodes_video_transfer_started_at",
        "ix_drama_episodes_video_transfer_status",
    ]:
        op.drop_index(index_name, table_name="drama_episodes")
    for column_name in [
        "video_content_length",
        "video_transfer_error",
        "video_transfer_at",
        "video_transfer_started_at",
        "video_transfer_status",
        "gcs_uri",
        "source_play_url",
    ]:
        op.drop_column("drama_episodes", column_name)

    for index_name in [
        "ix_dramas_video_transfer_finished_at",
        "ix_dramas_video_transfer_started_at",
        "ix_dramas_video_transfer_status",
    ]:
        op.drop_index(index_name, table_name="dramas")
    for column_name in [
        "video_transfer_failed_episodes",
        "video_transfer_done_episodes",
        "video_transfer_total_episodes",
        "video_transfer_error",
        "video_transfer_finished_at",
        "video_transfer_started_at",
        "video_transfer_status",
    ]:
        op.drop_column("dramas", column_name)
