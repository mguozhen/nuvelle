from pathlib import Path

from sqlalchemy import select

from app.models.drama import Drama, DramaEpisode
from app.services.reelshort_video_transfer_service import VideoTransferStatus
from app.services.webeye_video_upload_service import (
    GcsWebeyeVideoStore,
    WebeyeVideoObject,
    WebeyeVideoUploadRequest,
    WebeyeVideoUploadService,
)


class FakeWebeyeVideoStore:
    def __init__(self) -> None:
        self.persisted_paths: list[Path] = []

    def persist(self, path: Path) -> WebeyeVideoObject:
        self.persisted_paths.append(path)
        return WebeyeVideoObject(
            gcs_uri="gs://bucket/videos/webeye/sha256/video.mp4",
            object_name="videos/webeye/sha256/video.mp4",
            content_length=123,
            sha256="a" * 64,
            uploaded=True,
        )


class TransactionReleasedStore(FakeWebeyeVideoStore):
    def __init__(self, db) -> None:
        super().__init__()
        self.db = db
        self.checked = False

    def persist(self, path: Path) -> WebeyeVideoObject:
        self.checked = True
        if self.db.in_transaction():
            raise RuntimeError("database transaction stayed open during upload")
        return super().persist(path)


class FakeUploadBlob:
    def __init__(self) -> None:
        self.upload_kwargs = None

    def exists(self) -> bool:
        return False

    def upload_from_filename(self, filename, **kwargs) -> None:
        self.upload_kwargs = kwargs


class FakeUploadBucket:
    def __init__(self, blob: FakeUploadBlob) -> None:
        self.blob_instance = blob
        self.object_name = None

    def blob(self, object_name):
        self.object_name = object_name
        return self.blob_instance


class FakeGcsSettings:
    video_gcs_bucket = "video-bucket"
    promo_gcs_bucket = ""
    video_gcs_prefix = "videos"
    video_gcs_upload_timeout_seconds = 321
    video_gcs_upload_retry_timeout_seconds = 654


def test_gcs_webeye_video_store_uses_video_bucket_and_large_file_retry_policy(tmp_path, monkeypatch) -> None:
    local_file = tmp_path / "episode.mp4"
    local_file.write_bytes(b"original")
    blob = FakeUploadBlob()
    bucket = FakeUploadBucket(blob)
    store = GcsWebeyeVideoStore(settings=FakeGcsSettings())
    monkeypatch.setattr(store, "_bucket", lambda: bucket)

    store.persist(local_file)

    assert blob.upload_kwargs is not None
    assert blob.upload_kwargs["timeout"] == 321
    assert blob.upload_kwargs["retry"].timeout == 654
    assert blob.upload_kwargs["if_generation_match"] == 0
    assert bucket.object_name.startswith("videos/webeye/sha256/")


def test_gcs_webeye_video_store_rejects_empty_files(tmp_path, monkeypatch) -> None:
    local_file = tmp_path / "empty.mp4"
    local_file.write_bytes(b"")
    store = GcsWebeyeVideoStore(settings=FakeGcsSettings())
    monkeypatch.setattr(
        store,
        "_bucket",
        lambda: (_ for _ in ()).throw(AssertionError("empty file should not reach GCS")),
    )

    try:
        store.persist(local_file)
    except ValueError as exc:
        assert str(exc) == "empty video file: empty.mp4"
    else:
        raise AssertionError("empty video file was accepted")


def test_webeye_video_upload_updates_episode_and_drama_rollup_without_original_fields(db, tmp_path) -> None:
    local_file = tmp_path / "准婆婆要动我妈养老钱-第3集.mp4"
    local_file.write_bytes(b"original")
    drama = Drama(
        id=42,
        title="准婆婆要动我妈养老钱",
        platform="Webeye",
        video_transfer_status=VideoTransferStatus.pending.value,
    )
    db.add(drama)
    db.commit()
    store = FakeWebeyeVideoStore()

    result = WebeyeVideoUploadService(db, store=store).run(
        WebeyeVideoUploadRequest(
            drama_id=42,
            episode_no=3,
            file_path=str(local_file),
            source_path="/apps/bdpan/准婆婆要动我妈养老钱-第3集.mp4",
            source_file_name="准婆婆要动我妈养老钱-第3集.mp4",
        )
    )

    episode = db.scalar(select(DramaEpisode).where(DramaEpisode.drama_id == 42, DramaEpisode.episode_no == 3))
    assert result.uploaded == 1
    assert result.updated == 1
    assert store.persisted_paths == [local_file]
    assert episode is not None
    assert episode.gcs_uri == "gs://bucket/videos/webeye/sha256/video.mp4"
    assert episode.video_content_length == 123
    assert episode.source_play_url is None
    assert episode.video_transfer_status == VideoTransferStatus.transferred.value
    assert not hasattr(episode, "source_file_name")
    assert not hasattr(episode, "source_file_size")
    assert not hasattr(episode, "video_object_name")
    assert not hasattr(episode, "video_sha256")
    assert not hasattr(episode, "video_uploaded_at")
    assert drama.video_transfer_status == VideoTransferStatus.transferred.value
    assert drama.video_transfer_total_episodes == 1
    assert drama.video_transfer_done_episodes == 1
    assert drama.video_transfer_failed_episodes == 0
    assert not hasattr(drama, "original_video_gcs_uri")
    assert not hasattr(drama, "original_video_object_name")
    assert not hasattr(drama, "original_video_content_length")
    assert not hasattr(drama, "original_video_sha256")
    assert not hasattr(drama, "original_video_uploaded_at")


def test_webeye_video_upload_releases_db_transaction_before_persisting_file(db, tmp_path) -> None:
    local_file = tmp_path / "episode.mp4"
    local_file.write_bytes(b"original")
    drama = Drama(
        id=43,
        title="Release connection",
        platform="Webeye",
        video_transfer_status=VideoTransferStatus.transferring.value,
    )
    episode = DramaEpisode(
        drama_id=43,
        episode_no=1,
        video_transfer_status=VideoTransferStatus.pending.value,
    )
    db.add_all([drama, episode])
    db.commit()
    store = TransactionReleasedStore(db)

    result = WebeyeVideoUploadService(db, store=store).run(
        WebeyeVideoUploadRequest(
            drama_id=43,
            episode_no=1,
            file_path=str(local_file),
            source_path="/apps/bdpan/episode.mp4",
            source_file_name="episode.mp4",
        )
    )

    db.refresh(drama)
    db.refresh(episode)
    assert store.checked is True
    assert result.errors == []
    assert result.updated == 1
    assert episode.video_transfer_status == VideoTransferStatus.transferred.value
    assert drama.video_transfer_status == VideoTransferStatus.transferred.value
