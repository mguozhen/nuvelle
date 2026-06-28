from __future__ import annotations

import re
import shutil
import subprocess
import time
import urllib.parse
from dataclasses import dataclass
from pathlib import Path
from time import sleep as default_sleep

from pydantic import BaseModel, Field
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.models.drama import Drama, DramaEpisode
from app.services.reelshort_video_transfer_service import VideoTransferStatus
from app.services.webeye_video_upload_service import (
    WebeyeVideoInput,
    WebeyeVideoUploadRequest,
    WebeyeVideoUploadService,
)

EPISODE_NUMBER_PATTERN = re.compile(r"第\s*(\d+)\s*[集话話]")
TRAILING_EPISODE_NUMBER_PATTERN = re.compile(r"(?:^|[\s_-])(\d+)$")
SUPPORTED_VIDEO_SUFFIXES = {".mp4", ".mov", ".m4v"}


class WebeyeVideoTransferRequest(BaseModel):
    limit: int = Field(default=10, ge=1, le=1000)
    drama_id: int | None = None
    start_after_drama_id: int | None = Field(default=None, ge=0)
    retry_failed: bool = False
    force: bool = False
    dry_run: bool = False
    work_dir: str = "/tmp/nuvelle_webeye_videos"
    bdpan_transfer_root: str = "/apps/bdpan"
    keep_local: bool = False
    cleanup_remote: bool = True
    delay_seconds: float = Field(default=0.0, ge=0)


class WebeyeVideoTransferResponse(BaseModel):
    scanned_dramas: int = 0
    transferred_dramas: int = 0
    failed_dramas: int = 0
    skipped_dramas: int = 0
    transferred_episodes: int = 0
    failed_episodes: int = 0
    skipped_episodes: int = 0
    last_drama_id: int | None = None
    errors: list[str] = Field(default_factory=list)


@dataclass(frozen=True)
class BdpanDownloadResult:
    local_dir: Path
    transfer_dir: str
    stdout: str
    stderr: str


class BdpanShareDownloader:
    def __init__(self, *, executable: str = "bdpan") -> None:
        self.executable = executable

    def mkdir(self, remote_dir: str) -> None:
        self._run([self.executable, "mkdir", remote_dir])

    def download_share(
        self, *, share_url: str, password: str | None, local_dir: Path, transfer_dir: str
    ) -> BdpanDownloadResult:
        local_dir.mkdir(parents=True, exist_ok=True)
        command = [self.executable, "download", share_url, str(local_dir), "-t", transfer_dir]
        if password:
            command.extend(["-p", password])
        completed = self._run(command)
        return BdpanDownloadResult(
            local_dir=local_dir,
            transfer_dir=transfer_dir,
            stdout=completed.stdout,
            stderr=completed.stderr,
        )

    def remove(self, remote_dir: str) -> None:
        self._run([self.executable, "rm", "-f", self._app_scope_relative_path(remote_dir)])

    @staticmethod
    def _run(command: list[str]) -> subprocess.CompletedProcess[str]:
        return subprocess.run(command, check=True, capture_output=True, text=True)

    @staticmethod
    def _app_scope_relative_path(remote_dir: str) -> str:
        normalized = remote_dir.strip()
        app_root = "/apps/bdpan/"
        if normalized.startswith(app_root):
            return normalized.removeprefix(app_root).strip("/") or "."
        return normalized


class WebeyeVideoTransferPipeline:
    def __init__(
        self,
        db: Session,
        *,
        downloader: BdpanShareDownloader | None = None,
        sleep=default_sleep,
    ) -> None:
        self.db = db
        self.downloader = downloader or BdpanShareDownloader()
        self.sleep = sleep

    def run(self, request: WebeyeVideoTransferRequest) -> WebeyeVideoTransferResponse:
        response = WebeyeVideoTransferResponse()
        dramas = self._candidate_dramas(request)
        for index, drama in enumerate(dramas):
            if index and request.delay_seconds:
                self.sleep(request.delay_seconds)
            response.scanned_dramas += 1
            response.last_drama_id = drama.id
            if not request.force and self._drama_is_transferred(drama):
                response.skipped_dramas += 1
                response.skipped_episodes += int(drama.video_transfer_done_episodes or 0)
                continue
            if request.dry_run:
                response.skipped_dramas += 1
                continue

            try:
                self._transfer_drama(drama, request, response)
            except Exception as exc:
                self.db.rollback()
                error = str(exc)
                self._mark_drama_failed(drama, error)
                self.db.commit()
                response.failed_dramas += 1
                response.errors.append(f"drama {drama.id}: {error}")
        return response

    def _transfer_drama(
        self,
        drama: Drama,
        request: WebeyeVideoTransferRequest,
        response: WebeyeVideoTransferResponse,
    ) -> None:
        if not drama.source_url:
            raise ValueError("missing source_url")

        share_url, password = parse_baidu_share_url(drama.source_url)
        work_dir = Path(request.work_dir).expanduser()
        local_dir = work_dir / str(drama.id)
        if local_dir.exists():
            shutil.rmtree(local_dir)
        transfer_dir = self._transfer_dir(request.bdpan_transfer_root, drama.id)

        self.downloader.mkdir(transfer_dir)
        try:
            self.downloader.download_share(
                share_url=share_url,
                password=password,
                local_dir=local_dir,
                transfer_dir=transfer_dir,
            )
            files = sorted(
                file
                for file in local_dir.rglob("*")
                if file.is_file() and file.suffix.lower() in SUPPORTED_VIDEO_SUFFIXES
            )
            if not files:
                raise RuntimeError("bdpan download completed but no supported video files were found")
            inputs = build_video_inputs(drama_id=drama.id, source_url=drama.source_url, files=files)
            upload_inputs = [item for item in inputs if item.path.stat().st_size > 0]
            empty_inputs = [item for item in inputs if item.path.stat().st_size <= 0]
            if empty_inputs:
                response.skipped_episodes += len(empty_inputs)
                response.errors.append(
                    f"drama {drama.id}: skipped empty source files: "
                    f"{', '.join(item.source_file_name or item.path.name for item in empty_inputs)}"
                )
            if not upload_inputs:
                raise RuntimeError("bdpan download completed but no non-empty video files were found")
            inputs = upload_inputs
            self._prepare_episode_placeholders(drama, inputs)
            upload_service = WebeyeVideoUploadService(self.db)
            for item in inputs:
                result = upload_service.run(
                    WebeyeVideoUploadRequest(
                        drama_id=item.drama_id,
                        episode_no=item.episode_no,
                        file_path=str(item.path),
                        source_path=item.source_path,
                        source_file_name=item.source_file_name,
                        force=request.force,
                    )
                )
                response.transferred_episodes += result.uploaded + result.reused
                response.failed_episodes += result.failed
                response.skipped_episodes += result.skipped
                response.errors.extend(result.errors)
            self.db.refresh(drama)
            if drama.video_transfer_status == VideoTransferStatus.transferred.value:
                response.transferred_dramas += 1
            else:
                response.failed_dramas += 1
        finally:
            if request.cleanup_remote:
                try:
                    self.downloader.remove(transfer_dir)
                except Exception as exc:
                    response.errors.append(f"drama {drama.id}: remote cleanup failed: {exc}")
            if not request.keep_local:
                shutil.rmtree(local_dir, ignore_errors=True)

    def _prepare_episode_placeholders(self, drama: Drama, inputs: list[WebeyeVideoInput]) -> None:
        now = time_utc()
        episodes = {
            episode.episode_no: episode
            for episode in self.db.scalars(
                select(DramaEpisode).where(DramaEpisode.drama_id == drama.id)
            ).all()
        }
        done = 0
        failed = 0
        for item in inputs:
            episode = episodes.get(item.episode_no)
            if episode is None:
                episode = DramaEpisode(
                    drama_id=item.drama_id,
                    episode_no=item.episode_no,
                )
                self.db.add(episode)
                episodes[item.episode_no] = episode

            episode.video_transfer_started_at = episode.video_transfer_started_at or now
            if self._episode_is_transferred(episode):
                done += 1
            elif episode.video_transfer_status == VideoTransferStatus.failed.value:
                failed += 1
            else:
                episode.video_transfer_status = VideoTransferStatus.pending.value
                episode.video_transfer_error = None

        drama.video_transfer_status = VideoTransferStatus.transferring.value
        drama.video_transfer_started_at = drama.video_transfer_started_at or now
        drama.video_transfer_finished_at = None
        drama.video_transfer_error = None
        drama.video_transfer_total_episodes = len(inputs)
        drama.video_transfer_done_episodes = done
        drama.video_transfer_failed_episodes = failed
        self.db.commit()

    @staticmethod
    def _episode_is_transferred(episode: DramaEpisode) -> bool:
        return bool(
            episode.video_transfer_status == VideoTransferStatus.transferred.value
            and episode.gcs_uri
            and (episode.video_content_length or 0) > 0
        )

    def _candidate_dramas(self, request: WebeyeVideoTransferRequest) -> list[Drama]:
        stmt = select(Drama).where(Drama.platform == "Webeye", Drama.source_url.is_not(None))
        if request.drama_id is not None:
            stmt = stmt.where(Drama.id == request.drama_id)
        else:
            if request.start_after_drama_id is not None:
                stmt = stmt.where(Drama.id > request.start_after_drama_id)
            if request.force:
                pass
            elif request.retry_failed:
                stmt = stmt.where(
                    Drama.video_transfer_status.in_(
                        [
                            VideoTransferStatus.failed.value,
                            VideoTransferStatus.partial_failed.value,
                            VideoTransferStatus.skipped.value,
                        ]
                    )
                )
            else:
                stmt = stmt.where(
                    or_(
                        Drama.video_transfer_status.is_(None),
                        Drama.video_transfer_status != VideoTransferStatus.transferred.value,
                    )
                )
        stmt = stmt.order_by(Drama.id.asc()).limit(request.limit)
        return list(self.db.scalars(stmt).all())

    @staticmethod
    def _transfer_dir(root: str, drama_id: int) -> str:
        return f"{root.rstrip('/')}/webeye-{drama_id}-{int(time.time())}"

    @staticmethod
    def _drama_is_transferred(drama: Drama) -> bool:
        return bool(
            drama.video_transfer_status == VideoTransferStatus.transferred.value
            and drama.video_transfer_total_episodes
            and drama.video_transfer_done_episodes == drama.video_transfer_total_episodes
        )

    @staticmethod
    def _mark_drama_failed(drama: Drama, error: str) -> None:
        now = time_utc()
        drama.video_transfer_status = VideoTransferStatus.failed.value
        drama.video_transfer_started_at = drama.video_transfer_started_at or now
        drama.video_transfer_finished_at = now
        drama.video_transfer_error = error
        drama.video_transfer_total_episodes = drama.video_transfer_total_episodes or 0
        drama.video_transfer_failed_episodes = drama.video_transfer_failed_episodes or 0


def parse_baidu_share_url(source_url: str) -> tuple[str, str | None]:
    parts = urllib.parse.urlsplit(source_url.strip())
    query_pairs = urllib.parse.parse_qsl(parts.query, keep_blank_values=True)
    password = next((value for key, value in query_pairs if key == "pwd" and value), None)
    clean_query = urllib.parse.urlencode([(key, value) for key, value in query_pairs if key != "pwd"])
    clean_url = urllib.parse.urlunsplit((parts.scheme, parts.netloc, parts.path, clean_query, ""))
    return clean_url, password


def build_video_inputs(*, drama_id: int, source_url: str, files: list[Path]) -> list[WebeyeVideoInput]:
    numbered = [(episode_no_from_filename(file.name), file) for file in files]
    parsed_numbers = [episode_no for episode_no, _ in numbered if episode_no is not None]
    if len(parsed_numbers) == len(files) and len(set(parsed_numbers)) == len(parsed_numbers):
        ordered = sorted(numbered, key=lambda item: int(item[0] or 0))
        return [
            WebeyeVideoInput(
                drama_id=drama_id,
                episode_no=int(episode_no or 1),
                path=file,
                source_path=source_url,
                source_file_name=file.name,
            )
            for episode_no, file in ordered
        ]

    return [
        WebeyeVideoInput(
            drama_id=drama_id,
            episode_no=index,
            path=file,
            source_path=source_url,
            source_file_name=file.name,
        )
        for index, file in enumerate(sorted(files, key=lambda item: item.name), start=1)
    ]


def episode_no_from_filename(filename: str) -> int | None:
    match = EPISODE_NUMBER_PATTERN.search(filename)
    if match:
        return int(match.group(1))
    stem = Path(filename).stem
    if stem.isdigit():
        return int(stem)
    match = TRAILING_EPISODE_NUMBER_PATTERN.search(stem)
    return int(match.group(1)) if match else None


def time_utc():
    from datetime import UTC, datetime

    return datetime.now(UTC)
