"""admin mvp tables and resource metadata

Revision ID: 0004_admin_mvp
Revises: 0003_third_party_drama_resources
Create Date: 2026-06-18
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0004_admin_mvp"
down_revision: str | None = "0003_third_party_drama_resources"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "admin_users",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("role", sa.String(length=40), nullable=False),
        sa.Column("status", sa.String(length=40), nullable=False),
        sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email", name="uq_admin_users_email"),
    )
    op.create_index("ix_admin_users_id", "admin_users", ["id"])
    op.create_index("ix_admin_users_email", "admin_users", ["email"])
    op.create_index("ix_admin_users_role", "admin_users", ["role"])
    op.create_index("ix_admin_users_status", "admin_users", ["status"])

    op.create_table(
        "admin_invites",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("code_hash", sa.String(length=128), nullable=False),
        sa.Column("role", sa.String(length=40), nullable=False),
        sa.Column("max_uses", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("used_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by_user_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["admin_users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("code_hash", name="uq_admin_invites_code_hash"),
    )
    op.create_index("ix_admin_invites_id", "admin_invites", ["id"])
    op.create_index("ix_admin_invites_code_hash", "admin_invites", ["code_hash"])
    op.create_index("ix_admin_invites_role", "admin_invites", ["role"])
    op.create_index("ix_admin_invites_expires_at", "admin_invites", ["expires_at"])

    for column in [
        sa.Column("source_resource_id", sa.Integer(), nullable=True),
        sa.Column("language", sa.String(length=80), nullable=True),
        sa.Column("tags", sa.JSON(), nullable=True),
        sa.Column("show_tags", sa.JSON(), nullable=True),
        sa.Column("book_type", sa.String(length=40), nullable=True),
        sa.Column("is_valid", sa.Boolean(), nullable=True),
        sa.Column("pay_start", sa.Integer(), nullable=True),
        sa.Column("recent_revenue", sa.Integer(), nullable=True),
        sa.Column("promoters_cnt", sa.Integer(), nullable=True),
        sa.Column("promotion_code", sa.String(length=80), nullable=True),
        sa.Column("app_promotion_link", sa.Text(), nullable=True),
        sa.Column("book_promotion_link", sa.Text(), nullable=True),
        sa.Column("platform_publish_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("source_first_seen_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("source_last_seen_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("source_last_changed_at", sa.DateTime(timezone=True), nullable=True),
    ]:
        op.add_column("dramas", column)

    op.create_index("ix_dramas_source_resource_id", "dramas", ["source_resource_id"])
    op.create_index("ix_dramas_language", "dramas", ["language"])
    op.create_index("ix_dramas_book_type", "dramas", ["book_type"])
    op.create_index("ix_dramas_recent_revenue", "dramas", ["recent_revenue"])
    op.create_index("ix_dramas_promoters_cnt", "dramas", ["promoters_cnt"])
    op.create_index("ix_dramas_promotion_code", "dramas", ["promotion_code"])
    op.create_index("ix_dramas_platform_publish_at", "dramas", ["platform_publish_at"])
    op.create_index("ix_dramas_source_first_seen_at", "dramas", ["source_first_seen_at"])
    op.create_index("ix_dramas_source_last_seen_at", "dramas", ["source_last_seen_at"])
    op.create_index("ix_dramas_source_last_changed_at", "dramas", ["source_last_changed_at"])

    op.create_table(
        "drama_episodes",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("drama_id", sa.Integer(), nullable=False),
        sa.Column("episode_no", sa.Integer(), nullable=False),
        sa.Column("chapter_id", sa.String(length=160), nullable=True),
        sa.Column("t_chapter_id", sa.String(length=80), nullable=True),
        sa.Column("play_url", sa.Text(), nullable=True),
        sa.Column("poster_url", sa.Text(), nullable=True),
        sa.Column("iframe_src", sa.Text(), nullable=True),
        sa.Column("content", sa.Text(), nullable=True),
        sa.Column("source_payload_hash", sa.String(length=64), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["drama_id"], ["dramas.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("drama_id", "episode_no", name="uq_drama_episodes_drama_episode"),
    )
    op.create_index("ix_drama_episodes_id", "drama_episodes", ["id"])
    op.create_index("ix_drama_episodes_drama_id", "drama_episodes", ["drama_id"])
    op.create_index("ix_drama_episodes_episode_no", "drama_episodes", ["episode_no"])
    op.create_index("ix_drama_episodes_chapter_id", "drama_episodes", ["chapter_id"])
    op.create_index("ix_drama_episodes_t_chapter_id", "drama_episodes", ["t_chapter_id"])
    op.create_index("ix_drama_episodes_source_payload_hash", "drama_episodes", ["source_payload_hash"])

    op.create_table(
        "user_drama_events",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("drama_id", sa.Integer(), nullable=False),
        sa.Column("episode_id", sa.Integer(), nullable=True),
        sa.Column("event_type", sa.String(length=40), nullable=False),
        sa.Column("verdict", sa.String(length=20), nullable=True),
        sa.Column("score", sa.Integer(), nullable=True),
        sa.Column("metadata", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["drama_id"], ["dramas.id"]),
        sa.ForeignKeyConstraint(["episode_id"], ["drama_episodes.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["admin_users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "drama_id", "event_type", name="uq_user_drama_events_user_drama_type"),
    )
    op.create_index("ix_user_drama_events_id", "user_drama_events", ["id"])
    op.create_index("ix_user_drama_events_user_id", "user_drama_events", ["user_id"])
    op.create_index("ix_user_drama_events_drama_id", "user_drama_events", ["drama_id"])
    op.create_index("ix_user_drama_events_episode_id", "user_drama_events", ["episode_id"])
    op.create_index("ix_user_drama_events_event_type", "user_drama_events", ["event_type"])
    op.create_index("ix_user_drama_events_verdict", "user_drama_events", ["verdict"])

    for column in [
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("drama_id", sa.Integer(), nullable=True),
        sa.Column("episode_id", sa.Integer(), nullable=True),
        sa.Column("prompt", sa.Text(), nullable=True),
    ]:
        op.add_column("promo_jobs", column)
    op.create_foreign_key("fk_promo_jobs_user_id_admin_users", "promo_jobs", "admin_users", ["user_id"], ["id"])
    op.create_foreign_key("fk_promo_jobs_drama_id_dramas", "promo_jobs", "dramas", ["drama_id"], ["id"])
    op.create_foreign_key(
        "fk_promo_jobs_episode_id_drama_episodes",
        "promo_jobs",
        "drama_episodes",
        ["episode_id"],
        ["id"],
    )
    op.create_index("ix_promo_jobs_user_id", "promo_jobs", ["user_id"])
    op.create_index("ix_promo_jobs_drama_id", "promo_jobs", ["drama_id"])
    op.create_index("ix_promo_jobs_episode_id", "promo_jobs", ["episode_id"])


def downgrade() -> None:
    op.drop_index("ix_promo_jobs_episode_id", table_name="promo_jobs")
    op.drop_index("ix_promo_jobs_drama_id", table_name="promo_jobs")
    op.drop_index("ix_promo_jobs_user_id", table_name="promo_jobs")
    op.drop_constraint("fk_promo_jobs_episode_id_drama_episodes", "promo_jobs", type_="foreignkey")
    op.drop_constraint("fk_promo_jobs_drama_id_dramas", "promo_jobs", type_="foreignkey")
    op.drop_constraint("fk_promo_jobs_user_id_admin_users", "promo_jobs", type_="foreignkey")
    op.drop_column("promo_jobs", "prompt")
    op.drop_column("promo_jobs", "episode_id")
    op.drop_column("promo_jobs", "drama_id")
    op.drop_column("promo_jobs", "user_id")

    op.drop_index("ix_user_drama_events_verdict", table_name="user_drama_events")
    op.drop_index("ix_user_drama_events_event_type", table_name="user_drama_events")
    op.drop_index("ix_user_drama_events_episode_id", table_name="user_drama_events")
    op.drop_index("ix_user_drama_events_drama_id", table_name="user_drama_events")
    op.drop_index("ix_user_drama_events_user_id", table_name="user_drama_events")
    op.drop_index("ix_user_drama_events_id", table_name="user_drama_events")
    op.drop_table("user_drama_events")

    op.drop_index("ix_drama_episodes_source_payload_hash", table_name="drama_episodes")
    op.drop_index("ix_drama_episodes_t_chapter_id", table_name="drama_episodes")
    op.drop_index("ix_drama_episodes_chapter_id", table_name="drama_episodes")
    op.drop_index("ix_drama_episodes_episode_no", table_name="drama_episodes")
    op.drop_index("ix_drama_episodes_drama_id", table_name="drama_episodes")
    op.drop_index("ix_drama_episodes_id", table_name="drama_episodes")
    op.drop_table("drama_episodes")

    for index_name in [
        "ix_dramas_source_last_changed_at",
        "ix_dramas_source_last_seen_at",
        "ix_dramas_source_first_seen_at",
        "ix_dramas_platform_publish_at",
        "ix_dramas_promotion_code",
        "ix_dramas_promoters_cnt",
        "ix_dramas_recent_revenue",
        "ix_dramas_book_type",
        "ix_dramas_language",
        "ix_dramas_source_resource_id",
    ]:
        op.drop_index(index_name, table_name="dramas")
    for column_name in [
        "source_last_changed_at",
        "source_last_seen_at",
        "source_first_seen_at",
        "platform_publish_at",
        "book_promotion_link",
        "app_promotion_link",
        "promotion_code",
        "promoters_cnt",
        "recent_revenue",
        "pay_start",
        "is_valid",
        "book_type",
        "show_tags",
        "tags",
        "language",
        "source_resource_id",
    ]:
        op.drop_column("dramas", column_name)

    op.drop_index("ix_admin_invites_expires_at", table_name="admin_invites")
    op.drop_index("ix_admin_invites_role", table_name="admin_invites")
    op.drop_index("ix_admin_invites_code_hash", table_name="admin_invites")
    op.drop_index("ix_admin_invites_id", table_name="admin_invites")
    op.drop_table("admin_invites")

    op.drop_index("ix_admin_users_status", table_name="admin_users")
    op.drop_index("ix_admin_users_role", table_name="admin_users")
    op.drop_index("ix_admin_users_email", table_name="admin_users")
    op.drop_index("ix_admin_users_id", table_name="admin_users")
    op.drop_table("admin_users")
