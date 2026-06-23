from __future__ import annotations

from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.drama import Drama, DramaEpisode
from app.storage.object_store import gcs_object_name


class VideoPlayUrlRewriteRequest(BaseModel):
    limit: int = Field(default=500, ge=1, le=5000)
    platform: str | None = None
    language: str | None = None
    drama_id: int | None = None
    start_after_drama_id: int | None = Field(default=None, ge=0)
    public_base_url: str | None = None
    dry_run: bool = True


class VideoPlayUrlRewriteResponse(BaseModel):
    scanned_dramas: int = 0
    updated_dramas: int = 0
    scanned_episodes: int = 0
    updated_episodes: int = 0
    skipped_episodes: int = 0
    last_drama_id: int | None = None


class VideoPlayUrlRewriteService:
    def __init__(self, db: Session, *, settings=None) -> None:
        self.db = db
        self.settings = settings or get_settings()

    def run(self, request: VideoPlayUrlRewriteRequest) -> VideoPlayUrlRewriteResponse:
        public_base_url = self._public_base_url(request)
        response = VideoPlayUrlRewriteResponse()
        dramas = self._candidate_dramas(request)
        episodes_by_drama = self._episodes_for_dramas([drama.id for drama in dramas])

        for drama in dramas:
            response.scanned_dramas += 1
            response.last_drama_id = drama.id
            episodes = episodes_by_drama.get(drama.id, [])
            response.scanned_episodes += len(episodes)

            first_play_url: str | None = None
            drama_changed = False
            for episode in episodes:
                target_url = self._target_url(public_base_url, episode.gcs_uri)
                if target_url is None:
                    response.skipped_episodes += 1
                    continue
                if first_play_url is None:
                    first_play_url = target_url
                if episode.play_url != target_url:
                    response.updated_episodes += 1
                    drama_changed = True
                    if not request.dry_run:
                        episode.play_url = target_url

            if first_play_url is not None and drama.video_url != first_play_url:
                drama_changed = True
                if not request.dry_run:
                    drama.video_url = first_play_url

            if drama_changed:
                response.updated_dramas += 1

        if not request.dry_run:
            self.db.commit()

        return response

    def _candidate_dramas(self, request: VideoPlayUrlRewriteRequest) -> list[Drama]:
        drama_ids_stmt = (
            select(Drama.id)
            .join(DramaEpisode, DramaEpisode.drama_id == Drama.id)
            .where(
                DramaEpisode.gcs_uri.is_not(None),
                DramaEpisode.video_transfer_status == "transferred",
            )
            .group_by(Drama.id)
        )
        if request.drama_id is not None:
            drama_ids_stmt = drama_ids_stmt.where(Drama.id == request.drama_id)
        elif request.start_after_drama_id is not None:
            drama_ids_stmt = drama_ids_stmt.where(Drama.id > request.start_after_drama_id)
        if request.platform:
            drama_ids_stmt = drama_ids_stmt.where(func.lower(Drama.platform) == request.platform.lower())
        if request.language:
            drama_ids_stmt = drama_ids_stmt.where(Drama.language == request.language)
        drama_ids_stmt = drama_ids_stmt.order_by(Drama.id.asc()).limit(request.limit)
        stmt = select(Drama).where(Drama.id.in_(drama_ids_stmt)).order_by(Drama.id.asc())
        return list(self.db.scalars(stmt).all())

    def _episodes_for_dramas(self, drama_ids: list[int]) -> dict[int, list[DramaEpisode]]:
        if not drama_ids:
            return {}
        stmt = (
            select(DramaEpisode)
            .where(
                DramaEpisode.drama_id.in_(drama_ids),
                DramaEpisode.gcs_uri.is_not(None),
                DramaEpisode.video_transfer_status == "transferred",
            )
            .order_by(DramaEpisode.drama_id.asc(), DramaEpisode.episode_no.asc())
        )
        episodes_by_drama: dict[int, list[DramaEpisode]] = {drama_id: [] for drama_id in drama_ids}
        for episode in self.db.scalars(stmt).all():
            episodes_by_drama.setdefault(episode.drama_id, []).append(episode)
        return episodes_by_drama

    def _public_base_url(self, request: VideoPlayUrlRewriteRequest) -> str:
        public_base_url = (request.public_base_url or self.settings.video_public_base_url).strip().rstrip("/")
        if not public_base_url:
            raise RuntimeError("VIDEO_PUBLIC_BASE_URL is required for CDN-only video playback")
        return public_base_url

    @staticmethod
    def _target_url(public_base_url: str, gcs_uri: str | None) -> str | None:
        if not gcs_uri:
            return None
        if not gcs_uri.startswith("gs://"):
            return None
        _, object_name = gcs_object_name(gcs_uri, "")
        object_name = object_name.strip("/")
        if not object_name:
            return None
        return f"{public_base_url}/{object_name}"
