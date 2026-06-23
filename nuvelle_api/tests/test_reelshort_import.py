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
    import_status: str = "pending",
    last_seen_at: datetime | None = None,
) -> ThirdPartyDramaResource:
    payload = raw_data or fixture_payload()
    now = last_seen_at or datetime(2026, 6, 17, tzinfo=UTC)
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
        import_status=import_status,
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
    episodes = (
        db.query(DramaEpisode)
        .filter(DramaEpisode.drama_id == drama.id)
        .order_by(DramaEpisode.episode_no)
        .all()
    )

    assert response.status_code == 200
    assert response.json()["imported"] == 1
    assert drama.title == "My Father's Billionaire Boss Treasured Me as His Bride"
    assert drama.language == "English"
    assert drama.platform == "ReelShort"
    assert drama.source_cover_image_url == fixture_payload()["pic"]
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


def test_reelshort_import_preserves_transferred_cover_url_when_source_changes(
    client: TestClient,
    db: Session,
) -> None:
    payload = fixture_payload()
    payload["pic"] = "https://fresh.example.com/new-cover.jpg"
    db.add(
        Drama(
            title="Existing",
            platform="ReelShort",
            rs_book_id=payload["id"],
            cover_image_url="https://cdn.nuvelle.ai/videos/reelshort/99/cover.jpg",
            source_cover_image_url="https://expired.example.com/old-cover.jpg",
            cover_gcs_uri="gs://video-bucket/videos/reelshort/99/cover.jpg",
            cover_transfer_status="transferred",
        )
    )
    db.commit()
    seed_resource(db, payload, source="reelshort_cps", source_app="reelshort")

    response = client.post("/api/v1/admin/imports/reelshort/sync", headers=auth_header(client, db))

    drama = db.query(Drama).filter(Drama.rs_book_id == payload["id"]).one()
    assert response.status_code == 200
    assert response.json()["updated"] == 1
    assert drama.source_cover_image_url == "https://fresh.example.com/new-cover.jpg"
    assert drama.cover_image_url == "https://cdn.nuvelle.ai/videos/reelshort/99/cover.jpg"
    assert drama.cover_transfer_status == "pending"


def test_reelshort_import_prioritizes_pending_resources(client: TestClient, db: Session) -> None:
    imported_payload = fixture_payload()
    imported_payload["id"] = "already-imported"
    imported_payload["title"] = "Already Imported"
    seed_resource(
        db,
        imported_payload,
        source="reelshort_cps",
        source_app="reelshort",
        import_status="imported",
        last_seen_at=datetime(2026, 6, 18, tzinfo=UTC),
    )
    pending_payload = fixture_payload()
    pending_payload["id"] = "pending-resource"
    pending_payload["title"] = "Pending Resource"
    seed_resource(
        db,
        pending_payload,
        source="reelshort_cps",
        source_app="reelshort",
        last_seen_at=datetime(2026, 6, 17, tzinfo=UTC),
    )

    response = client.post(
        "/api/v1/admin/imports/reelshort/sync",
        headers=auth_header(client, db),
        json={"limit": 1},
    )

    assert response.status_code == 200
    assert response.json()["imported"] == 1
    assert db.query(Drama).filter(Drama.rs_book_id == "pending-resource").count() == 1
    assert db.query(Drama).filter(Drama.rs_book_id == "already-imported").count() == 0


def test_reelshort_import_can_scan_detail_resources_only(client: TestClient, db: Session) -> None:
    list_payload = fixture_payload()
    list_payload["book_type"] = 0
    list_payload["chapter_count"] = 0
    list_payload["pay_start"] = 0
    list_payload["publish_at"] = 0
    list_payload["chapters"] = []
    list_payload.pop("app_promotion_link")
    list_payload.pop("book_promotion_link")
    seed_resource(db, list_payload, source="reelshort_cps", source_app="reelshort")
    seed_resource(db, source="reelshort_cps", source_app="reelshort")

    response = client.post(
        "/api/v1/admin/imports/reelshort/sync",
        headers=auth_header(client, db),
        json={"limit": 50, "detail_only": True},
    )

    drama = db.query(Drama).filter(Drama.rs_book_id == "6a2787e89a16b83b9c05c631").one()
    assert response.status_code == 200
    assert response.json()["imported"] == 1
    assert response.json()["updated"] == 0
    assert drama.book_type == "1"
    assert drama.platform_publish_at is not None
    assert drama.episode_count == 66


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


def test_reelshort_import_treats_zero_publish_at_as_missing(client: TestClient, db: Session) -> None:
    payload = fixture_payload()
    payload["book_type"] = 0
    payload["chapter_count"] = 0
    payload["pay_start"] = 0
    payload["publish_at"] = 0
    payload["chapters"] = []
    payload.pop("app_promotion_link")
    payload.pop("book_promotion_link")
    seed_resource(db, payload, source="reelshort_cps", source_app="reelshort")

    response = client.post("/api/v1/admin/imports/reelshort/sync", headers=auth_header(client, db))

    drama = db.query(Drama).filter(Drama.rs_book_id == "6a2787e89a16b83b9c05c631").one()
    assert response.status_code == 200
    assert response.json()["failed"] == 0
    assert drama.platform_publish_at is None
    assert drama.episode_count is None
    assert drama.pay_start is None


def test_reelshort_import_does_not_let_list_resource_clear_detail_fields(
    client: TestClient, db: Session
) -> None:
    detail_resource = seed_resource(db, source="reelshort_cps", source_app="reelshort")
    headers = auth_header(client, db)
    client.post(
        "/api/v1/admin/imports/reelshort/sync",
        headers=headers,
        json={"resource_id": detail_resource.id},
    )

    list_payload = fixture_payload()
    list_payload["book_type"] = 0
    list_payload["chapter_count"] = 0
    list_payload["pay_start"] = 0
    list_payload["publish_at"] = 0
    list_payload["chapters"] = []
    list_payload.pop("app_promotion_link")
    list_payload.pop("book_promotion_link")
    list_resource = seed_resource(db, list_payload, source="reelshort_cps", source_app="reelshort")

    response = client.post(
        "/api/v1/admin/imports/reelshort/sync",
        headers=headers,
        json={"resource_id": list_resource.id},
    )

    drama = db.query(Drama).filter(Drama.rs_book_id == "6a2787e89a16b83b9c05c631").one()
    episodes = db.query(DramaEpisode).filter(DramaEpisode.drama_id == drama.id).all()
    assert response.status_code == 200
    assert response.json()["updated"] == 1
    assert drama.book_type == "1"
    assert drama.episode_count == 66
    assert drama.pay_start == 12
    assert drama.platform_publish_at is not None
    assert drama.app_promotion_link == "https://reelslink.com/cps/y2drkZ"
    assert drama.book_promotion_link == "https://reelslink.com/cps/7DYiOR"
    assert len(episodes) == 2


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
    episode = (
        db.query(DramaEpisode)
        .filter(DramaEpisode.drama_id == dramas[0].id, DramaEpisode.episode_no == 1)
        .one()
    )

    assert response.status_code == 200
    assert response.json()["updated"] == 1
    assert len(dramas) == 1
    assert dramas[0].title == "Updated ReelShort Title"
    assert episode.play_url == "https://example.com/refreshed-0001.mp4"


def test_reelshort_sync_requires_admin(client: TestClient, db: Session) -> None:
    seed_resource(db)

    response = client.post(
        "/api/v1/admin/imports/reelshort/sync",
        headers=auth_header(client, db, "promoter"),
    )

    assert response.status_code == 403
    assert response.json()["detail"] == "admin role required"
