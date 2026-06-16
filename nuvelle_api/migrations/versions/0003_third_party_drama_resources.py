"""third party drama resource cache

Revision ID: 0003_third_party_drama_resources
Revises: 0002_expand_promo_jobs
Create Date: 2026-06-16
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0003_third_party_drama_resources"
down_revision: str | None = "0002_expand_promo_jobs"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "third_party_drama_resources",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("source", sa.String(length=80), nullable=False),
        sa.Column("external_id", sa.String(length=160), nullable=False),
        sa.Column("source_app", sa.String(length=80), nullable=False),
        sa.Column("book_type", sa.String(length=40), nullable=False),
        sa.Column("language", sa.String(length=80), nullable=False),
        sa.Column("title", sa.String(length=500), nullable=False),
        sa.Column("cover_url", sa.Text(), nullable=True),
        sa.Column("synopsis", sa.Text(), nullable=True),
        sa.Column("release_date", sa.String(length=40), nullable=True),
        sa.Column("episode_count", sa.Integer(), nullable=True),
        sa.Column("free_episode_count", sa.Integer(), nullable=True),
        sa.Column("internal_drama_id", sa.Integer(), nullable=True),
        sa.Column("import_status", sa.String(length=40), nullable=False, server_default="pending"),
        sa.Column("raw_data", sa.JSON(), nullable=False),
        sa.Column("raw_hash", sa.String(length=64), nullable=False),
        sa.Column("first_seen_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_changed_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "source",
            "external_id",
            "source_app",
            "book_type",
            "language",
            name="uq_third_party_drama_resource_identity",
        ),
    )
    op.create_index("ix_third_party_drama_resources_source", "third_party_drama_resources", ["source"])
    op.create_index(
        "ix_third_party_drama_resources_external_id",
        "third_party_drama_resources",
        ["external_id"],
    )
    op.create_index(
        "ix_third_party_drama_resources_source_app",
        "third_party_drama_resources",
        ["source_app"],
    )
    op.create_index("ix_third_party_drama_resources_book_type", "third_party_drama_resources", ["book_type"])
    op.create_index("ix_third_party_drama_resources_language", "third_party_drama_resources", ["language"])
    op.create_index("ix_third_party_drama_resources_title", "third_party_drama_resources", ["title"])
    op.create_index(
        "ix_third_party_drama_resources_release_date",
        "third_party_drama_resources",
        ["release_date"],
    )
    op.create_index(
        "ix_third_party_drama_resources_internal_drama_id",
        "third_party_drama_resources",
        ["internal_drama_id"],
    )
    op.create_index(
        "ix_third_party_drama_resources_import_status",
        "third_party_drama_resources",
        ["import_status"],
    )
    op.create_index("ix_third_party_drama_resources_raw_hash", "third_party_drama_resources", ["raw_hash"])
    op.create_index(
        "ix_third_party_drama_resources_first_seen_at",
        "third_party_drama_resources",
        ["first_seen_at"],
    )
    op.create_index(
        "ix_third_party_drama_resources_last_seen_at",
        "third_party_drama_resources",
        ["last_seen_at"],
    )
    op.create_index(
        "ix_third_party_drama_resources_last_changed_at",
        "third_party_drama_resources",
        ["last_changed_at"],
    )

    op.create_table(
        "third_party_crawl_logs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("source", sa.String(length=80), nullable=False),
        sa.Column("run_type", sa.String(length=80), nullable=False),
        sa.Column("status", sa.String(length=40), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("scanned_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("changed_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("error_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("message", sa.Text(), nullable=True),
        sa.Column("metadata", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_third_party_crawl_logs_source", "third_party_crawl_logs", ["source"])
    op.create_index("ix_third_party_crawl_logs_run_type", "third_party_crawl_logs", ["run_type"])
    op.create_index("ix_third_party_crawl_logs_status", "third_party_crawl_logs", ["status"])
    op.create_index("ix_third_party_crawl_logs_started_at", "third_party_crawl_logs", ["started_at"])
    op.create_index("ix_third_party_crawl_logs_finished_at", "third_party_crawl_logs", ["finished_at"])


def downgrade() -> None:
    op.drop_index("ix_third_party_crawl_logs_finished_at", table_name="third_party_crawl_logs")
    op.drop_index("ix_third_party_crawl_logs_started_at", table_name="third_party_crawl_logs")
    op.drop_index("ix_third_party_crawl_logs_status", table_name="third_party_crawl_logs")
    op.drop_index("ix_third_party_crawl_logs_run_type", table_name="third_party_crawl_logs")
    op.drop_index("ix_third_party_crawl_logs_source", table_name="third_party_crawl_logs")
    op.drop_table("third_party_crawl_logs")

    op.drop_index("ix_third_party_drama_resources_last_changed_at", table_name="third_party_drama_resources")
    op.drop_index("ix_third_party_drama_resources_last_seen_at", table_name="third_party_drama_resources")
    op.drop_index("ix_third_party_drama_resources_first_seen_at", table_name="third_party_drama_resources")
    op.drop_index("ix_third_party_drama_resources_raw_hash", table_name="third_party_drama_resources")
    op.drop_index("ix_third_party_drama_resources_import_status", table_name="third_party_drama_resources")
    op.drop_index(
        "ix_third_party_drama_resources_internal_drama_id",
        table_name="third_party_drama_resources",
    )
    op.drop_index("ix_third_party_drama_resources_release_date", table_name="third_party_drama_resources")
    op.drop_index("ix_third_party_drama_resources_title", table_name="third_party_drama_resources")
    op.drop_index("ix_third_party_drama_resources_language", table_name="third_party_drama_resources")
    op.drop_index("ix_third_party_drama_resources_book_type", table_name="third_party_drama_resources")
    op.drop_index("ix_third_party_drama_resources_source_app", table_name="third_party_drama_resources")
    op.drop_index("ix_third_party_drama_resources_external_id", table_name="third_party_drama_resources")
    op.drop_index("ix_third_party_drama_resources_source", table_name="third_party_drama_resources")
    op.drop_table("third_party_drama_resources")
