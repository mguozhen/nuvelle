from sqlalchemy.orm import Session

from app.models.drama import Drama, DramaEpisode
from app.services.video_play_url_rewrite_service import (
    VideoPlayUrlRewriteRequest,
    VideoPlayUrlRewriteService,
)


def seed_transferred_drama(db: Session) -> tuple[Drama, list[DramaEpisode]]:
    drama = Drama(
        title="CDN Rewrite",
        platform="ReelShort",
        language="English",
        rs_book_id="book-1",
        video_transfer_status="transferred",
        video_url="https://nuvelle-api.example.com/api/v1/video-assets/videos/reelshort/1/episodes/0001.mp4",
    )
    db.add(drama)
    db.flush()
    episodes = [
        DramaEpisode(
            drama_id=drama.id,
            episode_no=1,
            play_url="https://nuvelle-api.example.com/api/v1/video-assets/videos/reelshort/1/episodes/0001.mp4",
            source_play_url="https://third-party.example.com/ep1.mp4",
            gcs_uri=f"gs://video-bucket/videos/reelshort/{drama.id}/episodes/0001.mp4",
            video_transfer_status="transferred",
        ),
        DramaEpisode(
            drama_id=drama.id,
            episode_no=2,
            play_url="https://nuvelle-api.example.com/api/v1/video-assets/videos/reelshort/1/episodes/0002.mp4",
            source_play_url="https://third-party.example.com/ep2.mp4",
            gcs_uri=f"gs://video-bucket/videos/reelshort/{drama.id}/episodes/0002.mp4",
            video_transfer_status="transferred",
        ),
    ]
    db.add_all(episodes)
    db.commit()
    db.refresh(drama)
    for episode in episodes:
        db.refresh(episode)
    return drama, episodes


def test_rewrite_video_play_urls_uses_gcs_uri_and_cdn_base(db: Session) -> None:
    drama, episodes = seed_transferred_drama(db)

    summary = VideoPlayUrlRewriteService(db).run(
        VideoPlayUrlRewriteRequest(
            platform="reelshort",
            language="English",
            public_base_url="https://cdn.nuvelle.ai",
            dry_run=False,
        )
    )

    db.refresh(drama)
    for episode in episodes:
        db.refresh(episode)

    assert summary.scanned_dramas == 1
    assert summary.updated_dramas == 1
    assert summary.scanned_episodes == 2
    assert summary.updated_episodes == 2
    assert drama.video_url == f"https://cdn.nuvelle.ai/videos/reelshort/{drama.id}/episodes/0001.mp4"
    assert episodes[0].play_url == f"https://cdn.nuvelle.ai/videos/reelshort/{drama.id}/episodes/0001.mp4"
    assert episodes[1].play_url == f"https://cdn.nuvelle.ai/videos/reelshort/{drama.id}/episodes/0002.mp4"
    assert episodes[0].source_play_url == "https://third-party.example.com/ep1.mp4"


def test_rewrite_video_play_urls_dry_run_reports_without_mutating(db: Session) -> None:
    drama, episodes = seed_transferred_drama(db)
    original_video_url = drama.video_url
    original_episode_url = episodes[0].play_url

    summary = VideoPlayUrlRewriteService(db).run(
        VideoPlayUrlRewriteRequest(
            platform="reelshort",
            language="English",
            public_base_url="https://cdn.nuvelle.ai",
            dry_run=True,
        )
    )

    db.refresh(drama)
    db.refresh(episodes[0])

    assert summary.updated_dramas == 1
    assert summary.updated_episodes == 2
    assert drama.video_url == original_video_url
    assert episodes[0].play_url == original_episode_url
