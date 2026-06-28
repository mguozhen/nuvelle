"""drop webeye original video fields

Revision ID: 0010_drop_webeye_originals
Revises: 0009_webeye_ep_originals
Create Date: 2026-06-28
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0010_drop_webeye_originals"
down_revision: str | None = "0009_webeye_ep_originals"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _columns(table_name: str) -> set[str]:
    return {column["name"] for column in sa.inspect(op.get_bind()).get_columns(table_name)}


def _indexes(table_name: str) -> set[str]:
    return {index["name"] for index in sa.inspect(op.get_bind()).get_indexes(table_name)}


def _drop_index_if_exists(table_name: str, index_name: str) -> None:
    if index_name in _indexes(table_name):
        op.drop_index(index_name, table_name=table_name)


def _drop_column_if_exists(table_name: str, column_name: str) -> None:
    if column_name in _columns(table_name):
        op.drop_column(table_name, column_name)


def upgrade() -> None:
    _drop_index_if_exists("dramas", "ix_dramas_original_video_sha256")
    _drop_index_if_exists("dramas", "ix_dramas_original_video_uploaded_at")
    for column_name in [
        "original_video_uploaded_at",
        "original_video_sha256",
        "original_video_content_length",
        "original_video_object_name",
        "original_video_gcs_uri",
    ]:
        _drop_column_if_exists("dramas", column_name)

    _drop_index_if_exists("drama_episodes", "ix_drama_episodes_video_sha256")
    _drop_index_if_exists("drama_episodes", "ix_drama_episodes_video_uploaded_at")
    for column_name in [
        "video_uploaded_at",
        "video_sha256",
        "video_object_name",
        "source_file_size",
        "source_file_name",
    ]:
        _drop_column_if_exists("drama_episodes", column_name)


def downgrade() -> None:
    existing_drama_columns = _columns("dramas")
    for column in [
        sa.Column("original_video_gcs_uri", sa.Text(), nullable=True),
        sa.Column("original_video_object_name", sa.Text(), nullable=True),
        sa.Column("original_video_content_length", sa.BigInteger(), nullable=True),
        sa.Column("original_video_sha256", sa.String(length=64), nullable=True),
        sa.Column("original_video_uploaded_at", sa.DateTime(timezone=True), nullable=True),
    ]:
        if column.name not in existing_drama_columns:
            op.add_column("dramas", column)
    existing_drama_indexes = _indexes("dramas")
    if "ix_dramas_original_video_sha256" not in existing_drama_indexes:
        op.create_index("ix_dramas_original_video_sha256", "dramas", ["original_video_sha256"])
    if "ix_dramas_original_video_uploaded_at" not in existing_drama_indexes:
        op.create_index(
            "ix_dramas_original_video_uploaded_at", "dramas", ["original_video_uploaded_at"]
        )

    existing_episode_columns = _columns("drama_episodes")
    for column in [
        sa.Column("source_file_name", sa.String(length=512), nullable=True),
        sa.Column("source_file_size", sa.BigInteger(), nullable=True),
        sa.Column("video_object_name", sa.Text(), nullable=True),
        sa.Column("video_sha256", sa.String(length=64), nullable=True),
        sa.Column("video_uploaded_at", sa.DateTime(timezone=True), nullable=True),
    ]:
        if column.name not in existing_episode_columns:
            op.add_column("drama_episodes", column)
    existing_episode_indexes = _indexes("drama_episodes")
    if "ix_drama_episodes_video_sha256" not in existing_episode_indexes:
        op.create_index("ix_drama_episodes_video_sha256", "drama_episodes", ["video_sha256"])
    if "ix_drama_episodes_video_uploaded_at" not in existing_episode_indexes:
        op.create_index(
            "ix_drama_episodes_video_uploaded_at", "drama_episodes", ["video_uploaded_at"]
        )
