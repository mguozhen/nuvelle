import json
from datetime import UTC, datetime
from pathlib import Path

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import hash_invite_code
from app.models.admin_user import AdminInvite
from app.models.drama import Drama, DramaEpisode
from app.models.third_party_resource import ThirdPartyDramaResource

FIXTURE_PATH = Path(__file__).parent / "fixtures" / "reelshort_resource.json"


def fixture_payload() -> dict:
    return json.loads(FIXTURE_PATH.read_text(encoding="utf-8"))


def create_invite(db: Session, code: str, role: str) -> None:
    db.add(
        AdminInvite(
            code_hash=hash_invite_code(code),
            role=role,
            max_uses=1,
            used_count=0,
            expires_at=datetime(2099, 1, 1, tzinfo=UTC),
        )
    )
    db.commit()


def auth_header(client: TestClient, db: Session, role: str = "admin") -> dict[str, str]:
    code = f"JOIN-{role}"
    create_invite(db, code, role)
    registered = client.post(
        "/api/v1/auth/register",
        json={"email": f"{role}@example.com", "password": "secret123", "invite_code": code},
    )
    return {"Authorization": f"Bearer {registered.json()['access_token']}"}


def seed_resource(
    db: Session,
    raw_data: dict | None = None,
    *,
    source: str = "reelshort",
    source_app: str = "reelshort",
) -> ThirdPartyDramaResource:
    payload = raw_data or fixture_payload()
    now = datetime(2026, 6, 17, tzinfo=UTC)
    resource = ThirdPartyDramaResource(
        source=source,
        external_id=payload.get("id", "material-1"),
        source_app=source_app,
        book_type=str(payload["book_type"]),
        language=payload["lang"],
        title=payload["title"],
        cover_url=payload["pic"],
        synopsis=payload["desc"],
        release_date=None,
        episode_count=payload["chapter_count"],
        free_episode_count=payload["pay_start"],
        import_status="pending",
        raw_data=payload,
        raw_hash="hash-1",
        first_seen_at=now,
        last_seen_at=now,
        last_changed_at=now,
    )
    db.add(resource)
    db.commit()
    db.refresh(resource)
    return resource


def test_reelshort_resource_imports_drama_and_episodes(client: TestClient, db: Session) -> None:
    seed_resource(db)

    response = client.post("/api/v1/admin/imports/reelshort/sync", headers=auth_header(client, db))

    drama = db.query(Drama).filter(Drama.rs_book_id == "6a2787e89a16b83b9c05c631").one()
    episodes = db.query(DramaEpisode).filter(DramaEpisode.drama_id == drama.id).order_by(DramaEpisode.episode_no).all()

    assert response.status_code == 200
    assert response.json()["imported"] == 1
    assert drama.title == "My Father's Billionaire Boss Treasured Me as His Bride"
    assert drama.language == "English"
    assert drama.platform == "ReelShort"
    assert drama.recent_revenue == 2000
    assert drama.promoters_cnt == 1000
    assert drama.platform_publish_at is not None
    assert episodes[0].episode_no == 1
    assert episodes[0].chapter_id == "g9917szqen"
    assert episodes[0].play_url == "https://example.com/episode-0001.mp4"
    assert episodes[0].poster_url.endswith("81aadc099f54584f.jpg")
    assert episodes[0].iframe_src is not None
    assert not episodes[0].iframe_src.endswith("\n")


def test_reelshort_import_accepts_crawler_source_app_shape(client: TestClient, db: Session) -> None:
    seed_resource(db, source="reelshort_cps", source_app="reelshort")

    response = client.post("/api/v1/admin/imports/reelshort/sync", headers=auth_header(client, db))

    assert response.status_code == 200
    assert response.json()["imported"] == 1
    assert db.query(Drama).filter(Drama.rs_book_id == "6a2787e89a16b83b9c05c631").count() == 1


def test_reelshort_import_skips_non_cps_material_shape(client: TestClient, db: Session) -> None:
    material_payload = fixture_payload()
    material_payload.pop("id")
    seed_resource(db, material_payload, source="dramacps_materials", source_app="reelshort")
    seed_resource(db, source="reelshort_cps", source_app="reelshort")

    response = client.post("/api/v1/admin/imports/reelshort/sync", headers=auth_header(client, db))

    assert response.status_code == 200
    assert response.json()["imported"] == 1
    assert response.json()["failed"] == 0
    assert db.query(Drama).filter(Drama.platform == "ReelShort").count() == 1


def test_reelshort_import_keeps_genre_within_indexed_column_limit(client: TestClient, db: Session) -> None:
    payload = fixture_payload()
    long_tags = [f"Long Tag {index:02d}" for index in range(40)]
    payload["show_tag"] = long_tags
    payload["tag"] = long_tags
    seed_resource(db, payload, source="reelshort_cps", source_app="reelshort")

    response = client.post("/api/v1/admin/imports/reelshort/sync", headers=auth_header(client, db))

    drama = db.query(Drama).filter(Drama.rs_book_id == "6a2787e89a16b83b9c05c631").one()
    assert response.status_code == 200
    assert response.json()["failed"] == 0
    assert drama.genre is not None
    assert len(drama.genre) <= 255
    assert drama.genre.startswith("Long Tag 00, Long Tag 01")
    assert not drama.genre.endswith(",")
    assert drama.show_tags == long_tags


def test_reelshort_import_updates_existing_drama(client: TestClient, db: Session) -> None:
    resource = seed_resource(db)
    headers = auth_header(client, db)
    client.post("/api/v1/admin/imports/reelshort/sync", headers=headers)
    payload = fixture_payload()
    payload["title"] = "Updated ReelShort Title"
    payload["chapters"][0]["play_url"] = "https://example.com/refreshed-0001.mp4"
    resource.raw_data = payload
    resource.raw_hash = "hash-2"
    resource.import_status = "pending"
    db.add(resource)
    db.commit()

    response = client.post(
        "/api/v1/admin/imports/reelshort/sync",
        headers=headers,
        json={"resource_id": resource.id},
    )

    dramas = db.query(Drama).filter(Drama.rs_book_id == "6a2787e89a16b83b9c05c631").all()
    episode = db.query(DramaEpisode).filter(DramaEpisode.drama_id == dramas[0].id, DramaEpisode.episode_no == 1).one()

    assert response.status_code == 200
    assert response.json()["updated"] == 1
    assert len(dramas) == 1
    assert dramas[0].title == "Updated ReelShort Title"
    assert episode.play_url == "https://example.com/refreshed-0001.mp4"


def test_reelshort_sync_requires_admin(client: TestClient, db: Session) -> None:
    seed_resource(db)

    response = client.post("/api/v1/admin/imports/reelshort/sync", headers=auth_header(client, db, "promoter"))

    assert response.status_code == 403
    assert response.json()["detail"] == "admin role required"
