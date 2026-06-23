from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.models.drama import Drama, DramaEpisode
from app.services.reelshort_video_transfer_service import (
    ReelShortVideoTransferRequest,
    ReelShortVideoTransferService,
    VideoTransferStatus,
)


class FakeDetailProvider:
    def __init__(self, detail: dict) -> None:
        self.detail = detail
        self.calls: list[int] = []

    def detail_for_drama(self, drama: Drama) -> dict:
        self.calls.append(drama.id)
        return self.detail


class FakeVideoStore:
    def __init__(self, *, fail_sources: set[str] | None = None) -> None:
        self.fail_sources = fail_sources or set()
        self.uploads: list[tuple[str, str]] = []

    def upload_episode(self, *, source_url: str, object_name: str):
        self.uploads.append((source_url, object_name))
        if source_url in self.fail_sources:
            raise RuntimeError("download failed")
        return {
            "gcs_uri": f"gs://video-bucket/videos/{object_name}",
            "public_url": f"https://cdn.nuvelle.ai/videos/{object_name}",
            "content_length": 30_000_000,
        }


def seed_reelshort_drama(
    db: Session,
    *,
    language: str = "English",
    rs_book_id: str = "book-1",
) -> tuple[Drama, list[DramaEpisode]]:
    drama = Drama(
        title="Transfer Me",
        platform="ReelShort",
        language=language,
        rs_book_id=rs_book_id,
        book_type="1",
        video_url="https://expired.example.com/episode-1.mp4",
        episode_count=2,
    )
    db.add(drama)
    db.flush()
    episodes = [
        DramaEpisode(
            drama_id=drama.id,
            episode_no=1,
            t_chapter_id="1",
            play_url="https://expired.example.com/episode-1.mp4",
        ),
        DramaEpisode(
            drama_id=drama.id,
            episode_no=2,
            t_chapter_id="2",
            play_url="https://expired.example.com/episode-2.mp4",
        ),
    ]
    db.add_all(episodes)
    db.commit()
    db.refresh(drama)
    for episode in episodes:
        db.refresh(episode)
    return drama, episodes


def reelshort_detail() -> dict:
    return {
        "chapters": [
            {
                "t_chapter_id": "1",
                "chapter_id": "chapter-1",
                "play_url": "https://fresh.example.com/episode-1.mp4",
                "video_pic": "https://fresh.example.com/episode-1.jpg",
            },
            {
                "t_chapter_id": "2",
                "chapter_id": "chapter-2",
                "play_url": "https://fresh.example.com/episode-2.mp4",
                "video_pic": "https://fresh.example.com/episode-2.jpg",
            },
        ]
    }


def test_transfer_service_refreshes_once_and_uploads_all_episodes(db: Session) -> None:
    drama, episodes = seed_reelshort_drama(db)
    detail_provider = FakeDetailProvider(reelshort_detail())
    video_store = FakeVideoStore()

    summary = ReelShortVideoTransferService(
        db,
        detail_provider=detail_provider,
        video_store=video_store,
    ).run(ReelShortVideoTransferRequest(limit=1, language="English"))

    db.refresh(drama)
    for episode in episodes:
        db.refresh(episode)

    assert summary.scanned_dramas == 1
    assert summary.transferred_dramas == 1
    assert summary.transferred_episodes == 2
    assert summary.failed_episodes == 0
    assert detail_provider.calls == [drama.id]
    assert video_store.uploads == [
        ("https://fresh.example.com/episode-1.mp4", f"reelshort/{drama.id}/episodes/0001.mp4"),
        ("https://fresh.example.com/episode-2.mp4", f"reelshort/{drama.id}/episodes/0002.mp4"),
    ]
    assert drama.video_transfer_status == VideoTransferStatus.transferred.value
    assert drama.video_transfer_total_episodes == 2
    assert drama.video_transfer_done_episodes == 2
    assert drama.video_transfer_failed_episodes == 0
    assert drama.video_transfer_finished_at is not None
    assert drama.video_url == f"https://cdn.nuvelle.ai/videos/reelshort/{drama.id}/episodes/0001.mp4"
    assert episodes[0].source_play_url == "https://fresh.example.com/episode-1.mp4"
    assert episodes[0].play_url == f"https://cdn.nuvelle.ai/videos/reelshort/{drama.id}/episodes/0001.mp4"
    assert episodes[0].gcs_uri == f"gs://video-bucket/videos/reelshort/{drama.id}/episodes/0001.mp4"
    assert episodes[0].video_transfer_status == VideoTransferStatus.transferred.value
    assert episodes[0].video_content_length == 30_000_000
    assert episodes[0].video_transfer_at is not None


def test_transfer_service_marks_drama_partial_failed_when_an_episode_fails(db: Session) -> None:
    drama, episodes = seed_reelshort_drama(db)
    detail_provider = FakeDetailProvider(reelshort_detail())
    video_store = FakeVideoStore(fail_sources={"https://fresh.example.com/episode-2.mp4"})

    summary = ReelShortVideoTransferService(
        db,
        detail_provider=detail_provider,
        video_store=video_store,
    ).run(ReelShortVideoTransferRequest(limit=1, language="English"))

    db.refresh(drama)
    for episode in episodes:
        db.refresh(episode)

    assert summary.scanned_dramas == 1
    assert summary.partial_failed_dramas == 1
    assert summary.transferred_episodes == 1
    assert summary.failed_episodes == 1
    assert drama.video_transfer_status == VideoTransferStatus.partial_failed.value
    assert drama.video_transfer_done_episodes == 1
    assert drama.video_transfer_failed_episodes == 1
    assert "download failed" in (drama.video_transfer_error or "")
    assert episodes[0].video_transfer_status == VideoTransferStatus.transferred.value
    assert episodes[1].source_play_url == "https://fresh.example.com/episode-2.mp4"
    assert episodes[1].video_transfer_status == VideoTransferStatus.failed.value
    assert "download failed" in (episodes[1].video_transfer_error or "")


def test_transfer_service_skips_already_transferred_dramas_unless_forced(db: Session) -> None:
    drama, episodes = seed_reelshort_drama(db)
    drama.video_transfer_status = VideoTransferStatus.transferred.value
    drama.video_transfer_finished_at = datetime(2026, 6, 23, tzinfo=UTC)
    for episode in episodes:
        episode.video_transfer_status = VideoTransferStatus.transferred.value
        episode.gcs_uri = f"gs://video-bucket/reelshort/{drama.id}/episodes/{episode.episode_no:04d}.mp4"
    db.add(drama)
    db.add_all(episodes)
    db.commit()

    summary = ReelShortVideoTransferService(
        db,
        detail_provider=FakeDetailProvider(reelshort_detail()),
        video_store=FakeVideoStore(),
    ).run(ReelShortVideoTransferRequest(limit=1, language="English"))

    assert summary.scanned_dramas == 0
    assert summary.skipped_dramas == 0


def test_transfer_service_summarizes_already_transferred_episodes_without_refreshing_detail(db: Session) -> None:
    drama, episodes = seed_reelshort_drama(db)
    drama.video_transfer_status = VideoTransferStatus.partial_failed.value
    drama.video_transfer_error = "previous retry stopped"
    for episode in episodes:
        object_name = f"reelshort/{drama.id}/episodes/{episode.episode_no:04d}.mp4"
        episode.video_transfer_status = VideoTransferStatus.transferred.value
        episode.gcs_uri = f"gs://video-bucket/videos/{object_name}"
        episode.play_url = f"https://cdn.nuvelle.ai/videos/{object_name}"
    db.add(drama)
    db.add_all(episodes)
    db.commit()

    detail_provider = FakeDetailProvider(reelshort_detail())
    summary = ReelShortVideoTransferService(
        db,
        detail_provider=detail_provider,
        video_store=FakeVideoStore(),
    ).run(ReelShortVideoTransferRequest(limit=1, language="English"))

    db.refresh(drama)

    assert summary.scanned_dramas == 1
    assert summary.transferred_dramas == 1
    assert summary.transferred_episodes == 2
    assert detail_provider.calls == []
    assert drama.video_transfer_status == VideoTransferStatus.transferred.value
    assert drama.video_transfer_done_episodes == 2
    assert drama.video_transfer_failed_episodes == 0
    assert drama.video_transfer_error is None
    assert drama.video_url == f"https://cdn.nuvelle.ai/videos/reelshort/{drama.id}/episodes/0001.mp4"
