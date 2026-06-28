from pathlib import Path
from typing import Any

from sqlalchemy import select

from app.models.drama import Drama, DramaEpisode
from app.services.reelshort_video_transfer_service import VideoTransferStatus
from app.services.webeye_video_transfer_pipeline import (
    BdpanDownloadResult,
    BdpanShareDownloader,
    WebeyeVideoTransferPipeline,
    WebeyeVideoTransferRequest,
    build_video_inputs,
    parse_baidu_share_url,
)
from app.services.webeye_video_upload_service import WebeyeVideoUploadResponse


def test_parse_baidu_share_url_strips_pwd_query() -> None:
    share_url, password = parse_baidu_share_url(
        "https://pan.baidu.com/s/1AYi-blaevpQQg-LOLUWyvg?pwd=yddh#list/path=%2F"
    )

    assert share_url == "https://pan.baidu.com/s/1AYi-blaevpQQg-LOLUWyvg"
    assert password == "yddh"


def test_build_video_inputs_orders_files_by_episode_number(tmp_path) -> None:
    files = [
        tmp_path / "准婆婆要动我妈养老钱-第3集.mp4",
        tmp_path / "准婆婆要动我妈养老钱-第1集.mp4",
        tmp_path / "准婆婆要动我妈养老钱-第2集.mp4",
    ]
    for file in files:
        file.write_bytes(b"video")

    inputs = build_video_inputs(
        drama_id=24451,
        source_url="https://pan.baidu.com/s/1AYi-blaevpQQg-LOLUWyvg?pwd=yddh",
        files=[Path(file) for file in files],
    )

    assert [(item.episode_no, item.source_file_name) for item in inputs] == [
        (1, "准婆婆要动我妈养老钱-第1集.mp4"),
        (2, "准婆婆要动我妈养老钱-第2集.mp4"),
        (3, "准婆婆要动我妈养老钱-第3集.mp4"),
    ]
    assert all(
        item.source_path == "https://pan.baidu.com/s/1AYi-blaevpQQg-LOLUWyvg?pwd=yddh" for item in inputs
    )


def test_build_video_inputs_orders_bare_numeric_filenames_numerically(tmp_path) -> None:
    files = [
        tmp_path / "10.mp4",
        tmp_path / "1.mp4",
        tmp_path / "2.mp4",
    ]
    for file in files:
        file.write_bytes(b"video")

    inputs = build_video_inputs(
        drama_id=24874,
        source_url="https://pan.baidu.com/s/1CXd5_VjPTdmhs60ErpabzQ?pwd=4kbj",
        files=[Path(file) for file in files],
    )

    assert [(item.episode_no, item.source_file_name) for item in inputs] == [
        (1, "1.mp4"),
        (2, "2.mp4"),
        (10, "10.mp4"),
    ]


def test_bdpan_remove_uses_app_scope_relative_path(monkeypatch) -> None:
    commands: list[list[str]] = []

    def fake_run(command: list[str]) -> Any:
        commands.append(command)

    monkeypatch.setattr(BdpanShareDownloader, "_run", staticmethod(fake_run))

    BdpanShareDownloader().remove("/apps/bdpan/webeye-123")

    assert commands == [["bdpan", "rm", "-f", "webeye-123"]]


class CleanupFailureDownloader:
    def __init__(self, tmp_path: Path) -> None:
        self.tmp_path = tmp_path

    def mkdir(self, remote_dir: str) -> None:
        pass

    def download_share(
        self, *, share_url: str, password: str | None, local_dir: Path, transfer_dir: str
    ) -> BdpanDownloadResult:
        local_dir.mkdir(parents=True, exist_ok=True)
        (local_dir / "第1集.mp4").write_bytes(b"video")
        return BdpanDownloadResult(local_dir=local_dir, transfer_dir=transfer_dir, stdout="", stderr="")

    def remove(self, remote_dir: str) -> None:
        raise RuntimeError("bdpan cleanup failed")


class MultiFileDownloader:
    def mkdir(self, remote_dir: str) -> None:
        pass

    def download_share(
        self, *, share_url: str, password: str | None, local_dir: Path, transfer_dir: str
    ) -> BdpanDownloadResult:
        local_dir.mkdir(parents=True, exist_ok=True)
        for episode_no in range(1, 4):
            (local_dir / f"占位剧-第{episode_no}集.mp4").write_bytes(f"video-{episode_no}".encode())
        return BdpanDownloadResult(local_dir=local_dir, transfer_dir=transfer_dir, stdout="", stderr="")

    def remove(self, remote_dir: str) -> None:
        pass


class MovFileDownloader:
    def mkdir(self, remote_dir: str) -> None:
        pass

    def download_share(
        self, *, share_url: str, password: str | None, local_dir: Path, transfer_dir: str
    ) -> BdpanDownloadResult:
        local_dir.mkdir(parents=True, exist_ok=True)
        (local_dir / "海岛军嫂的彪悍人生-第1集.mov").write_bytes(b"video")
        return BdpanDownloadResult(local_dir=local_dir, transfer_dir=transfer_dir, stdout="", stderr="")

    def remove(self, remote_dir: str) -> None:
        pass


class MixedEmptyFileDownloader:
    def mkdir(self, remote_dir: str) -> None:
        pass

    def download_share(
        self, *, share_url: str, password: str | None, local_dir: Path, transfer_dir: str
    ) -> BdpanDownloadResult:
        local_dir.mkdir(parents=True, exist_ok=True)
        (local_dir / "1.mp4").write_bytes(b"video-1")
        (local_dir / "2.mp4").write_bytes(b"")
        (local_dir / "3.mp4").write_bytes(b"video-3")
        return BdpanDownloadResult(local_dir=local_dir, transfer_dir=transfer_dir, stdout="", stderr="")

    def remove(self, remote_dir: str) -> None:
        pass


class SuccessfulUploadService:
    def __init__(self, db) -> None:
        self.db = db

    def run(self, request) -> WebeyeVideoUploadResponse:
        drama = self.db.scalar(select(Drama).where(Drama.id == request.drama_id))
        assert drama is not None
        drama.video_transfer_status = VideoTransferStatus.transferred.value
        drama.video_transfer_total_episodes = 1
        drama.video_transfer_done_episodes = 1
        drama.video_transfer_failed_episodes = 0
        drama.video_transfer_error = None
        self.db.commit()
        return WebeyeVideoUploadResponse(scanned=1, uploaded=1, updated=1)


class RecordsUploadedFilesService:
    uploaded_source_file_names: list[str] = []

    def __init__(self, db) -> None:
        self.db = db

    def run(self, request) -> WebeyeVideoUploadResponse:
        self.uploaded_source_file_names.append(request.source_file_name)
        drama = self.db.scalar(select(Drama).where(Drama.id == request.drama_id))
        assert drama is not None
        episode = self.db.scalar(
            select(DramaEpisode).where(
                DramaEpisode.drama_id == request.drama_id,
                DramaEpisode.episode_no == request.episode_no,
            )
        )
        assert episode is not None
        episode.gcs_uri = f"gs://bucket/{request.source_file_name}"
        episode.video_content_length = Path(request.file_path).stat().st_size
        episode.video_transfer_status = VideoTransferStatus.transferred.value
        episodes = list(
            self.db.scalars(select(DramaEpisode).where(DramaEpisode.drama_id == request.drama_id)).all()
        )
        done = sum(1 for item in episodes if item.video_transfer_status == VideoTransferStatus.transferred.value)
        drama.video_transfer_done_episodes = done
        drama.video_transfer_total_episodes = 2
        drama.video_transfer_failed_episodes = 0
        drama.video_transfer_status = (
            VideoTransferStatus.transferred.value if done == 2 else VideoTransferStatus.transferring.value
        )
        self.db.commit()
        return WebeyeVideoUploadResponse(scanned=1, uploaded=1, updated=1)


class PlaceholderAwareUploadService:
    def __init__(self, db) -> None:
        self.db = db

    def run(self, request) -> WebeyeVideoUploadResponse:
        drama = self.db.scalar(select(Drama).where(Drama.id == request.drama_id))
        episodes = list(
            self.db.scalars(
                select(DramaEpisode)
                .where(DramaEpisode.drama_id == request.drama_id)
                .order_by(DramaEpisode.episode_no)
            ).all()
        )
        assert drama is not None
        assert len(episodes) == 3
        assert drama.video_transfer_status == VideoTransferStatus.transferring.value
        assert drama.video_transfer_total_episodes == 3

        episode = next(item for item in episodes if item.episode_no == request.episode_no)
        episode.video_transfer_status = VideoTransferStatus.transferred.value
        episode.gcs_uri = f"gs://bucket/{request.episode_no}.mp4"
        episode.video_content_length = Path(request.file_path).stat().st_size
        done = sum(1 for item in episodes if item.video_transfer_status == VideoTransferStatus.transferred.value)
        drama.video_transfer_done_episodes = done
        drama.video_transfer_failed_episodes = 0
        drama.video_transfer_status = (
            VideoTransferStatus.transferred.value
            if done == len(episodes)
            else VideoTransferStatus.transferring.value
        )
        self.db.commit()
        return WebeyeVideoUploadResponse(scanned=1, uploaded=1, updated=1)


def test_transfer_prepares_all_episode_rows_before_first_upload(db, tmp_path, monkeypatch) -> None:
    import app.services.webeye_video_transfer_pipeline as pipeline_module

    drama = Drama(
        id=124,
        title="占位剧",
        platform="Webeye",
        source_url="https://pan.baidu.com/s/abc?pwd=1234",
        video_transfer_status=VideoTransferStatus.pending.value,
    )
    db.add(drama)
    db.commit()
    monkeypatch.setattr(pipeline_module, "WebeyeVideoUploadService", PlaceholderAwareUploadService)

    response = WebeyeVideoTransferPipeline(
        db,
        downloader=MultiFileDownloader(),
    ).run(WebeyeVideoTransferRequest(drama_id=124, work_dir=str(tmp_path)))

    db.refresh(drama)
    assert response.errors == []
    assert response.transferred_dramas == 1
    assert drama.video_transfer_status == VideoTransferStatus.transferred.value
    assert drama.video_transfer_total_episodes == 3
    assert drama.video_transfer_done_episodes == 3


def test_transfer_accepts_mov_video_files(db, tmp_path, monkeypatch) -> None:
    import app.services.webeye_video_transfer_pipeline as pipeline_module

    drama = Drama(
        id=125,
        title="MOV source",
        platform="Webeye",
        source_url="https://pan.baidu.com/s/mov?pwd=1234",
        video_transfer_status=VideoTransferStatus.pending.value,
    )
    db.add(drama)
    db.commit()
    monkeypatch.setattr(pipeline_module, "WebeyeVideoUploadService", SuccessfulUploadService)

    response = WebeyeVideoTransferPipeline(
        db,
        downloader=MovFileDownloader(),
    ).run(WebeyeVideoTransferRequest(drama_id=125, work_dir=str(tmp_path)))

    episode = db.scalar(select(DramaEpisode).where(DramaEpisode.drama_id == 125))
    db.refresh(drama)
    assert response.errors == []
    assert response.transferred_dramas == 1
    assert episode is not None
    assert not hasattr(episode, "source_file_name")
    assert drama.video_transfer_status == VideoTransferStatus.transferred.value


def test_transfer_skips_empty_downloaded_video_files(db, tmp_path, monkeypatch) -> None:
    import app.services.webeye_video_transfer_pipeline as pipeline_module

    RecordsUploadedFilesService.uploaded_source_file_names = []
    drama = Drama(
        id=126,
        title="Empty source",
        platform="Webeye",
        source_url="https://pan.baidu.com/s/empty?pwd=1234",
        video_transfer_status=VideoTransferStatus.pending.value,
    )
    db.add(drama)
    db.commit()
    monkeypatch.setattr(pipeline_module, "WebeyeVideoUploadService", RecordsUploadedFilesService)

    response = WebeyeVideoTransferPipeline(
        db,
        downloader=MixedEmptyFileDownloader(),
    ).run(WebeyeVideoTransferRequest(drama_id=126, work_dir=str(tmp_path)))

    db.refresh(drama)
    assert response.failed_dramas == 0
    assert response.transferred_dramas == 1
    assert response.skipped_episodes == 1
    assert response.errors == ["drama 126: skipped empty source files: 2.mp4"]
    assert RecordsUploadedFilesService.uploaded_source_file_names == ["1.mp4", "3.mp4"]
    assert drama.video_transfer_status == VideoTransferStatus.transferred.value
    assert drama.video_transfer_total_episodes == 2
    assert drama.video_transfer_done_episodes == 2


def test_remote_cleanup_failure_does_not_mark_successful_transfer_failed(
    db, tmp_path, monkeypatch
) -> None:
    import app.services.webeye_video_transfer_pipeline as pipeline_module

    drama = Drama(
        id=123,
        title="Cleanup",
        platform="Webeye",
        source_url="https://pan.baidu.com/s/abc?pwd=1234",
        video_transfer_status=VideoTransferStatus.pending.value,
    )
    db.add(drama)
    db.commit()
    monkeypatch.setattr(pipeline_module, "WebeyeVideoUploadService", SuccessfulUploadService)

    response = WebeyeVideoTransferPipeline(
        db,
        downloader=CleanupFailureDownloader(tmp_path),
    ).run(WebeyeVideoTransferRequest(drama_id=123, work_dir=str(tmp_path)))

    db.refresh(drama)
    assert response.transferred_dramas == 1
    assert response.failed_dramas == 0
    assert response.errors == ["drama 123: remote cleanup failed: bdpan cleanup failed"]
    assert drama.video_transfer_status == VideoTransferStatus.transferred.value
