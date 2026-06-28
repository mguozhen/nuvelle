from __future__ import annotations

import csv
import hashlib
import mimetypes
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import TextIO

from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.drama import Drama, DramaEpisode
from app.services.reelshort_video_transfer_service import VideoTransferStatus


class WebeyeVideoUploadRequest(BaseModel):
    manifest_path: str | None = None
    drama_id: int | None = None
    episode_no: int = Field(default=1, ge=1)
    file_path: str | None = None
    source_path: str | None = None
    source_file_name: str | None = None
    limit: int = Field(default=500, ge=1, le=5000)
    force: bool = False
    dry_run: bool = False


class WebeyeVideoUploadResponse(BaseModel):
    scanned: int = 0
    uploaded: int = 0
    reused: int = 0
    updated: int = 0
    skipped: int = 0
    failed: int = 0
    last_drama_id: int | None = None
    errors: list[str] = Field(default_factory=list)


@dataclass(frozen=True)
class WebeyeVideoInput:
    drama_id: int
    episode_no: int
    path: Path
    source_path: str | None = None
    source_file_name: str | None = None


@dataclass(frozen=True)
class WebeyeVideoObject:
    gcs_uri: str
    object_name: str
    content_length: int
    sha256: str
    uploaded: bool


class GcsWebeyeVideoStore:
    def __init__(self, settings=None) -> None:
        self.settings = settings or get_settings()
        self.bucket_name = (self.settings.video_gcs_bucket or self.settings.promo_gcs_bucket).strip()
        self.prefix = self.settings.video_gcs_prefix.strip("/")
        self.upload_timeout_seconds = self.settings.video_gcs_upload_timeout_seconds
        self.upload_retry_timeout_seconds = self.settings.video_gcs_upload_retry_timeout_seconds
        if not self.bucket_name:
            raise RuntimeError("VIDEO_GCS_BUCKET or PROMO_GCS_BUCKET is required")

    def persist(self, path: Path) -> WebeyeVideoObject:
        if not path.is_file():
            raise FileNotFoundError(path)
        content_length = path.stat().st_size
        if content_length <= 0:
            raise ValueError(f"empty video file: {path.name}")
        sha256 = self._sha256(path)
        suffix = path.suffix.lower() or ".mp4"
        object_name = self._full_object_name(f"webeye/sha256/{sha256}{suffix}")
        bucket = self._bucket()
        blob = bucket.blob(object_name)
        uploaded = False
        if not blob.exists():
            from google.cloud.storage.retry import DEFAULT_RETRY

            blob.upload_from_filename(
                str(path),
                content_type=mimetypes.guess_type(path.name)[0] or "video/mp4",
                timeout=self.upload_timeout_seconds,
                retry=DEFAULT_RETRY.with_timeout(self.upload_retry_timeout_seconds),
                if_generation_match=0,
            )
            uploaded = True
        return WebeyeVideoObject(
            gcs_uri=f"gs://{self.bucket_name}/{object_name}",
            object_name=object_name,
            content_length=content_length,
            sha256=sha256,
            uploaded=uploaded,
        )

    def _bucket(self):
        from google.cloud import storage

        return storage.Client().bucket(self.bucket_name)

    def _full_object_name(self, object_name: str) -> str:
        object_name = object_name.strip("/")
        return f"{self.prefix}/{object_name}" if self.prefix else object_name

    @staticmethod
    def _sha256(path: Path) -> str:
        digest = hashlib.sha256()
        with path.open("rb") as handle:
            for chunk in iter(lambda: handle.read(1024 * 1024), b""):
                digest.update(chunk)
        return digest.hexdigest()


class WebeyeVideoUploadService:
    def __init__(
        self,
        db: Session,
        *,
        store: GcsWebeyeVideoStore | None = None,
    ) -> None:
        self.db = db
        self.store = store or GcsWebeyeVideoStore()

    def run(self, request: WebeyeVideoUploadRequest) -> WebeyeVideoUploadResponse:
        response = WebeyeVideoUploadResponse()
        inputs = list(self._inputs(request))
        for item in inputs[: request.limit]:
            response.scanned += 1
            response.last_drama_id = item.drama_id
            drama = self._drama(item.drama_id)
            if drama is None:
                response.failed += 1
                response.errors.append(f"drama {item.drama_id}: not found")
                continue
            episode = self._episode(item.drama_id, item.episode_no)
            if not request.force and episode is not None and self._episode_is_transferred(episode):
                response.skipped += 1
                continue
            try:
                if request.dry_run:
                    response.updated += 1
                    continue
                episode = episode or self._create_episode(item)
                self.db.commit()
                obj = self.store.persist(item.path)
                if obj.uploaded:
                    response.uploaded += 1
                else:
                    response.reused += 1
                self._mark_episode_transferred(drama, episode, obj, item)
                self._refresh_drama_rollup(drama)
                self.db.commit()
                response.updated += 1
            except Exception as exc:
                self.db.rollback()
                response.failed += 1
                failed_drama = self._drama(item.drama_id)
                if failed_drama is not None:
                    failed_episode = self._episode(item.drama_id, item.episode_no) or self._create_episode(
                        item
                    )
                    self._mark_episode_failed(failed_episode, item, str(exc))
                    self._refresh_drama_rollup(failed_drama)
                    self.db.commit()
                response.errors.append(f"drama {item.drama_id}: {exc}")
        return response

    def _inputs(self, request: WebeyeVideoUploadRequest) -> list[WebeyeVideoInput]:
        if request.drama_id is not None or request.file_path is not None:
            if request.drama_id is None or request.file_path is None:
                raise ValueError("--drama-id and --file must be provided together")
            return [
                WebeyeVideoInput(
                    drama_id=request.drama_id,
                    episode_no=request.episode_no,
                    path=Path(request.file_path).expanduser(),
                    source_path=request.source_path,
                    source_file_name=request.source_file_name,
                )
            ]
        if not request.manifest_path:
            raise ValueError("--manifest or --drama-id/--file is required")
        return self._read_manifest(Path(request.manifest_path).expanduser())

    @staticmethod
    def _read_manifest(path: Path) -> list[WebeyeVideoInput]:
        with path.open(newline="") as handle:
            reader = csv.DictReader(handle)
            if "drama_id" not in (reader.fieldnames or []) or "path" not in (reader.fieldnames or []):
                raise ValueError("manifest must include drama_id,path columns")
            return [
                WebeyeVideoInput(
                    drama_id=int(row["drama_id"]),
                    episode_no=int(row.get("episode_no") or 1),
                    path=Path(row["path"]).expanduser(),
                    source_path=row.get("source_path") or None,
                    source_file_name=row.get("source_file_name") or None,
                )
                for row in reader
                if row.get("drama_id") and row.get("path")
            ]

    def _drama(self, drama_id: int) -> Drama | None:
        return self.db.scalar(
            select(Drama).where(
                Drama.id == drama_id,
                Drama.platform == "Webeye",
            )
        )

    def _episode(self, drama_id: int, episode_no: int) -> DramaEpisode | None:
        return self.db.scalar(
            select(DramaEpisode).where(
                DramaEpisode.drama_id == drama_id,
                DramaEpisode.episode_no == episode_no,
            )
        )

    def _create_episode(self, item: WebeyeVideoInput) -> DramaEpisode:
        episode = DramaEpisode(
            drama_id=item.drama_id,
            episode_no=item.episode_no,
            video_transfer_status=VideoTransferStatus.pending.value,
        )
        self.db.add(episode)
        self.db.flush()
        return episode

    @staticmethod
    def _episode_is_transferred(episode: DramaEpisode) -> bool:
        return bool(
            episode.video_transfer_status == VideoTransferStatus.transferred.value
            and episode.gcs_uri
            and (episode.video_content_length or 0) > 0
        )

    def _mark_episode_transferred(
        self,
        drama: Drama,
        episode: DramaEpisode,
        obj: WebeyeVideoObject,
        item: WebeyeVideoInput,
    ) -> None:
        now = datetime.now(UTC)
        episode.gcs_uri = obj.gcs_uri
        episode.video_content_length = obj.content_length
        episode.video_transfer_status = VideoTransferStatus.transferred.value
        episode.video_transfer_started_at = episode.video_transfer_started_at or now
        episode.video_transfer_at = now
        episode.video_transfer_error = None
        drama.video_transfer_status = VideoTransferStatus.transferred.value
        drama.video_transfer_started_at = drama.video_transfer_started_at or now
        drama.video_transfer_finished_at = now
        drama.video_transfer_error = None

    def _mark_episode_failed(self, episode: DramaEpisode, item: WebeyeVideoInput, error: str) -> None:
        now = datetime.now(UTC)
        episode.video_transfer_status = VideoTransferStatus.failed.value
        episode.video_transfer_started_at = episode.video_transfer_started_at or now
        episode.video_transfer_at = now
        episode.video_transfer_error = error

    def _refresh_drama_rollup(self, drama: Drama) -> None:
        episodes = list(
            self.db.scalars(
                select(DramaEpisode)
                .where(DramaEpisode.drama_id == drama.id)
                .order_by(DramaEpisode.episode_no.asc())
            ).all()
        )
        total = len(episodes)
        done = sum(1 for episode in episodes if self._episode_is_transferred(episode))
        failed = sum(
            1 for episode in episodes if episode.video_transfer_status == VideoTransferStatus.failed.value
        )
        now = datetime.now(UTC)
        drama.video_transfer_total_episodes = total
        drama.video_transfer_done_episodes = done
        drama.video_transfer_failed_episodes = failed
        drama.video_transfer_started_at = drama.video_transfer_started_at or now

        if done and done == total:
            drama.video_transfer_status = VideoTransferStatus.transferred.value
            drama.video_transfer_finished_at = now
            drama.video_transfer_error = None
        elif done and failed:
            drama.video_transfer_status = VideoTransferStatus.partial_failed.value
            drama.video_transfer_finished_at = now
            drama.video_transfer_error = self._rollup_error(episodes)
        elif failed:
            drama.video_transfer_status = VideoTransferStatus.failed.value
            drama.video_transfer_finished_at = now
            drama.video_transfer_error = self._rollup_error(episodes)
        else:
            drama.video_transfer_status = VideoTransferStatus.transferring.value
            drama.video_transfer_error = None

    @staticmethod
    def _rollup_error(episodes: list[DramaEpisode]) -> str | None:
        errors = [episode.video_transfer_error for episode in episodes if episode.video_transfer_error]
        return "; ".join(errors[:3]) or None


def write_manifest(rows: list[WebeyeVideoInput], output: TextIO) -> None:
    writer = csv.DictWriter(
        output, fieldnames=["drama_id", "episode_no", "path", "source_path", "source_file_name"]
    )
    writer.writeheader()
    for row in rows:
        writer.writerow(
            {
                "drama_id": row.drama_id,
                "episode_no": row.episode_no,
                "path": str(row.path),
                "source_path": row.source_path,
                "source_file_name": row.source_file_name,
            }
        )
