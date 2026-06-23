from __future__ import annotations

import mimetypes
import shutil
import urllib.request
from dataclasses import dataclass
from datetime import UTC, datetime
from enum import Enum
from pathlib import Path
from time import sleep as default_sleep
from typing import Any, Protocol

from pydantic import BaseModel, Field
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.drama import Drama, DramaEpisode
from app.services.reelshort_video_service import BROWSER_USER_AGENT, ReelShortVideoService


class VideoTransferStatus(str, Enum):
    pending = "pending"
    refreshing = "refreshing"
    transferring = "transferring"
    transferred = "transferred"
    failed = "failed"
    partial_failed = "partial_failed"
    skipped = "skipped"


class ReelShortVideoTransferRequest(BaseModel):
    limit: int = Field(default=500, ge=1, le=5000)
    language: str = "English"
    drama_id: int | None = None
    start_after_drama_id: int | None = Field(default=None, ge=0)
    retry_failed: bool = False
    force: bool = False
    dry_run: bool = False
    delay_seconds: float = Field(default=0.0, ge=0)


class ReelShortVideoTransferResponse(BaseModel):
    scanned_dramas: int = 0
    transferred_dramas: int = 0
    partial_failed_dramas: int = 0
    failed_dramas: int = 0
    skipped_dramas: int = 0
    transferred_episodes: int = 0
    failed_episodes: int = 0
    skipped_episodes: int = 0
    last_drama_id: int | None = None


class ReelShortDetailProvider(Protocol):
    def detail_for_drama(self, drama: Drama) -> dict[str, Any]: ...


class VideoEpisodeStore(Protocol):
    def upload_episode(self, *, source_url: str, object_name: str) -> Any: ...


@dataclass(frozen=True)
class VideoUploadResult:
    gcs_uri: str
    public_url: str
    content_length: int | None = None


@dataclass(frozen=True)
class EpisodeTransferResult:
    status: VideoTransferStatus
    error: str | None = None


class ReelShortApiDetailProvider:
    def __init__(self, db: Session) -> None:
        self.video_service = ReelShortVideoService(db)

    def detail_for_drama(self, drama: Drama) -> dict[str, Any]:
        return self.video_service.detail_for_drama(drama)


class GcsVideoEpisodeStore:
    def __init__(self, settings=None) -> None:
        self.settings = settings or get_settings()
        self.bucket_name = (self.settings.video_gcs_bucket or self.settings.promo_gcs_bucket).strip()
        self.prefix = self.settings.video_gcs_prefix.strip("/")
        self.public_base_url = self.settings.video_public_base_url.strip().rstrip("/")
        self.work_dir = Path(self.settings.video_transfer_work_dir)
        if not self.public_base_url:
            raise RuntimeError("VIDEO_PUBLIC_BASE_URL is required for CDN-only video playback")

    def upload_episode(self, *, source_url: str, object_name: str) -> VideoUploadResult:
        if not self.bucket_name:
            raise RuntimeError("VIDEO_GCS_BUCKET or PROMO_GCS_BUCKET is required")

        full_object_name = self._full_object_name(object_name)
        local_path = self._download(source_url, full_object_name)
        try:
            bucket = self._bucket()
            blob = bucket.blob(full_object_name)
            blob.upload_from_filename(
                str(local_path),
                content_type=mimetypes.guess_type(local_path.name)[0] or "video/mp4",
            )
            content_length = local_path.stat().st_size
        finally:
            shutil.rmtree(local_path.parent, ignore_errors=True)

        return VideoUploadResult(
            gcs_uri=f"gs://{self.bucket_name}/{full_object_name}",
            public_url=self._public_url(full_object_name),
            content_length=content_length,
        )

    def _download(self, source_url: str, object_name: str) -> Path:
        target_dir = self.work_dir / object_name.replace("/", "_")
        target_dir.mkdir(parents=True, exist_ok=True)
        target = target_dir / Path(object_name).name
        request = urllib.request.Request(
            source_url,
            headers={
                "User-Agent": BROWSER_USER_AGENT,
                "Accept": "video/mp4,video/*,*/*",
            },
        )
        with urllib.request.urlopen(request, timeout=120) as response, target.open("wb") as handle:
            shutil.copyfileobj(response, handle)
        return target

    def _bucket(self):
        from google.cloud import storage

        return storage.Client().bucket(self.bucket_name)

    def _full_object_name(self, object_name: str) -> str:
        object_name = object_name.strip("/")
        return f"{self.prefix}/{object_name}" if self.prefix else object_name

    def _public_url(self, object_name: str) -> str:
        return f"{self.public_base_url}/{object_name}"


class ReelShortVideoTransferService:
    def __init__(
        self,
        db: Session,
        *,
        detail_provider: ReelShortDetailProvider | None = None,
        video_store: VideoEpisodeStore | None = None,
        sleep=default_sleep,
    ) -> None:
        self.db = db
        self.detail_provider = detail_provider or ReelShortApiDetailProvider(db)
        self.video_store = video_store or GcsVideoEpisodeStore()
        self.sleep = sleep

    def run(self, request: ReelShortVideoTransferRequest) -> ReelShortVideoTransferResponse:
        response = ReelShortVideoTransferResponse()
        dramas = self._candidate_dramas(request)
        for index, drama in enumerate(dramas):
            if index and request.delay_seconds:
                self.sleep(request.delay_seconds)
            response.scanned_dramas += 1
            response.last_drama_id = drama.id
            result = self._transfer_drama(drama, request)
            if result == VideoTransferStatus.transferred:
                response.transferred_dramas += 1
            elif result == VideoTransferStatus.partial_failed:
                response.partial_failed_dramas += 1
            elif result == VideoTransferStatus.failed:
                response.failed_dramas += 1
            elif result == VideoTransferStatus.skipped:
                response.skipped_dramas += 1

            response.transferred_episodes += int(drama.video_transfer_done_episodes or 0)
            response.failed_episodes += int(drama.video_transfer_failed_episodes or 0)
            total = int(drama.video_transfer_total_episodes or 0)
            response.skipped_episodes += max(
                total - int(drama.video_transfer_done_episodes or 0) - int(drama.video_transfer_failed_episodes or 0),
                0,
            )
            if not request.dry_run:
                self.db.commit()
        return response

    def _candidate_dramas(self, request: ReelShortVideoTransferRequest) -> list[Drama]:
        stmt = select(Drama).where(
            func.lower(Drama.platform) == "reelshort",
            Drama.language == request.language,
            Drama.rs_book_id.is_not(None),
        )
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

    def _transfer_drama(self, drama: Drama, request: ReelShortVideoTransferRequest) -> VideoTransferStatus:
        episodes = self._episodes_for(drama.id)
        now = datetime.now(UTC)
        if not episodes:
            self._mark_drama(
                drama,
                status=VideoTransferStatus.skipped,
                total=0,
                done=0,
                failed=0,
                error="no episodes",
                finished_at=now,
            )
            return VideoTransferStatus.skipped

        if not request.force and all(self._episode_is_transferred(episode) for episode in episodes):
            first_playable = next((episode for episode in episodes if episode.play_url), None)
            if first_playable is not None:
                drama.video_url = first_playable.play_url
            self._mark_drama(
                drama,
                status=VideoTransferStatus.transferred,
                total=len(episodes),
                done=len(episodes),
                failed=0,
                error=None,
                finished_at=now,
            )
            return VideoTransferStatus.transferred

        self._mark_drama(
            drama,
            status=VideoTransferStatus.refreshing,
            total=len(episodes),
            done=0,
            failed=0,
            error=None,
            started_at=now,
        )
        if request.dry_run:
            return VideoTransferStatus.skipped

        try:
            detail = self.detail_provider.detail_for_drama(drama)
        except Exception as exc:
            error = str(exc)
            for episode in episodes:
                self._mark_episode_failed(episode, error)
            self._mark_drama(
                drama,
                status=VideoTransferStatus.failed,
                total=len(episodes),
                done=0,
                failed=len(episodes),
                error=error,
                finished_at=datetime.now(UTC),
            )
            return VideoTransferStatus.failed

        done = 0
        failed = 0
        errors: list[str] = []
        for episode in episodes:
            if self._episode_is_transferred(episode) and not request.force:
                done += 1
                continue
            result = self._transfer_episode(drama, episode, detail)
            if result.status == VideoTransferStatus.transferred:
                done += 1
            elif result.status == VideoTransferStatus.failed:
                failed += 1
                if result.error:
                    errors.append(result.error)

        if done and not failed:
            status = VideoTransferStatus.transferred
        elif done and failed:
            status = VideoTransferStatus.partial_failed
        elif failed:
            status = VideoTransferStatus.failed
        else:
            status = VideoTransferStatus.skipped

        first_playable = next((episode for episode in episodes if episode.play_url), None)
        if first_playable is not None:
            drama.video_url = first_playable.play_url
        self._mark_drama(
            drama,
            status=status,
            total=len(episodes),
            done=done,
            failed=failed,
            error="; ".join(errors[:3]) or None,
            finished_at=datetime.now(UTC),
        )
        return status

    def _transfer_episode(
        self,
        drama: Drama,
        episode: DramaEpisode,
        detail: dict[str, Any],
    ) -> EpisodeTransferResult:
        now = datetime.now(UTC)
        episode.video_transfer_status = VideoTransferStatus.transferring.value
        episode.video_transfer_started_at = now
        episode.video_transfer_error = None
        chapter = ReelShortVideoService._match_chapter(detail, episode)
        source_url = self._optional_str(chapter.get("play_url")) if chapter else None
        if not source_url:
            self._mark_episode_failed(episode, "missing refreshed play_url")
            return EpisodeTransferResult(VideoTransferStatus.failed, "missing refreshed play_url")

        episode.source_play_url = source_url
        episode.poster_url = self._optional_str(chapter.get("video_pic")) or episode.poster_url
        episode.iframe_src = self._optional_str(chapter.get("iframe_src")) or episode.iframe_src
        episode.content = self._optional_str(chapter.get("content")) or episode.content

        try:
            upload = self.video_store.upload_episode(
                source_url=source_url,
                object_name=self._object_name(drama, episode),
            )
        except Exception as exc:
            error = str(exc)
            self._mark_episode_failed(episode, error)
            return EpisodeTransferResult(VideoTransferStatus.failed, error)

        episode.gcs_uri = self._upload_value(upload, "gcs_uri")
        episode.play_url = self._upload_value(upload, "public_url")
        episode.video_content_length = self._upload_value(upload, "content_length")
        episode.video_transfer_status = VideoTransferStatus.transferred.value
        episode.video_transfer_at = datetime.now(UTC)
        episode.video_transfer_error = None
        return EpisodeTransferResult(VideoTransferStatus.transferred)

    def _episodes_for(self, drama_id: int) -> list[DramaEpisode]:
        stmt = (
            select(DramaEpisode)
            .where(DramaEpisode.drama_id == drama_id)
            .order_by(DramaEpisode.episode_no.asc())
        )
        return list(self.db.scalars(stmt).all())

    @staticmethod
    def _object_name(drama: Drama, episode: DramaEpisode) -> str:
        return f"reelshort/{drama.id}/episodes/{episode.episode_no:04d}.mp4"

    @staticmethod
    def _episode_is_transferred(episode: DramaEpisode) -> bool:
        return bool(
            episode.video_transfer_status == VideoTransferStatus.transferred.value
            and episode.gcs_uri
            and episode.play_url
        )

    @staticmethod
    def _mark_drama(
        drama: Drama,
        *,
        status: VideoTransferStatus,
        total: int,
        done: int,
        failed: int,
        error: str | None,
        started_at: datetime | None = None,
        finished_at: datetime | None = None,
    ) -> None:
        drama.video_transfer_status = status.value
        if started_at is not None:
            drama.video_transfer_started_at = started_at
        if finished_at is not None:
            drama.video_transfer_finished_at = finished_at
        drama.video_transfer_total_episodes = total
        drama.video_transfer_done_episodes = done
        drama.video_transfer_failed_episodes = failed
        drama.video_transfer_error = error

    @staticmethod
    def _mark_episode_failed(episode: DramaEpisode, error: str) -> None:
        episode.video_transfer_status = VideoTransferStatus.failed.value
        episode.video_transfer_error = error
        episode.video_transfer_at = datetime.now(UTC)

    @staticmethod
    def _upload_value(upload: Any, key: str) -> Any:
        if isinstance(upload, dict):
            return upload.get(key)
        return getattr(upload, key)

    @staticmethod
    def _optional_str(value: Any) -> str | None:
        if value is None:
            return None
        normalized = str(value).strip()
        return normalized or None
