"""create initial service tables

Revision ID: 0001_initial_schema
Revises:
Create Date: 2026-06-16 00:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0001_initial_schema"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "dramas",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("platform", sa.String(length=80), nullable=True),
        sa.Column("genre", sa.String(length=255), nullable=True),
        sa.Column("cover_image_url", sa.Text(), nullable=True),
        sa.Column("video_url", sa.Text(), nullable=True),
        sa.Column("source_url", sa.Text(), nullable=True),
        sa.Column("episode_count", sa.Integer(), nullable=True),
        sa.Column("synopsis_or_hook", sa.Text(), nullable=True),
        sa.Column("signal", sa.Text(), nullable=True),
        sa.Column("rs_book_id", sa.String(length=120), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_dramas_genre", "dramas", ["genre"])
    op.create_index("ix_dramas_id", "dramas", ["id"])
    op.create_index("ix_dramas_platform", "dramas", ["platform"])
    op.create_index("ix_dramas_rs_book_id", "dramas", ["rs_book_id"])
    op.create_index("ix_dramas_title", "dramas", ["title"])

    op.create_table(
        "promo_jobs",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("episode", sa.Integer(), nullable=False),
        sa.Column("duration", sa.Integer(), nullable=False),
        sa.Column("source_url", sa.Text(), nullable=True),
        sa.Column("teaser_url", sa.Text(), nullable=True),
        sa.Column("cover_url", sa.Text(), nullable=True),
        sa.Column("caption", sa.Text(), nullable=True),
        sa.Column("error", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_promo_jobs_status", "promo_jobs", ["status"])

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


def downgrade() -> None:
    op.drop_index("ix_votes_verdict", table_name="votes")
    op.drop_index("ix_votes_taster", table_name="votes")
    op.drop_index("ix_votes_drama_id", table_name="votes")
    op.drop_table("votes")

    op.drop_index("ix_promo_jobs_status", table_name="promo_jobs")
    op.drop_table("promo_jobs")

    op.drop_index("ix_dramas_title", table_name="dramas")
    op.drop_index("ix_dramas_rs_book_id", table_name="dramas")
    op.drop_index("ix_dramas_platform", table_name="dramas")
    op.drop_index("ix_dramas_id", table_name="dramas")
    op.drop_index("ix_dramas_genre", table_name="dramas")
    op.drop_table("dramas")
