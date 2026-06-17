from app.db.base import Base


def test_admin_mvp_tables_are_registered() -> None:
    table_names = set(Base.metadata.tables)

    assert "admin_users" in table_names
    assert "admin_invites" in table_names
    assert "drama_episodes" in table_names
    assert "user_drama_events" in table_names
    assert "platform_publish_at" in Base.metadata.tables["dramas"].columns
    assert "user_id" in Base.metadata.tables["promo_jobs"].columns
