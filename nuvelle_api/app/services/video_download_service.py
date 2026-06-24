from __future__ import annotations

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.admin_user import AdminUser
from app.models.drama import Drama, DramaEpisode
from app.services.admin_drama_service import TRANSFERRED_VIDEO_STATUS
from app.services.promo_asset_store import PromoAssetStore


class VideoDownloadService:
    def __init__(self, db: Session, asset_store: PromoAssetStore | None = None) -> None:
        self.db = db
        self.settings = get_settings()
        self.asset_store = asset_store or PromoAssetStore(self.settings)

    def episode_download_url(self, _user: AdminUser, drama_id: int, episode_id: int) -> str:
        row = self.db.execute(
            select(Drama, DramaEpisode)
            .join(DramaEpisode, DramaEpisode.drama_id == Drama.id)
            .where(
                Drama.id == drama_id,
                Drama.video_transfer_status == TRANSFERRED_VIDEO_STATUS,
                DramaEpisode.id == episode_id,
                DramaEpisode.video_transfer_status == TRANSFERRED_VIDEO_STATUS,
                DramaEpisode.gcs_uri.is_not(None),
                DramaEpisode.play_url.is_not(None),
            )
        ).first()
        if row is None:
            raise HTTPException(status_code=404, detail="episode video not found")

        drama, episode = row
        url = self.asset_store.signed_download_url(
            episode.gcs_uri or "",
            "",
            download_filename=self._episode_filename(drama, episode),
            expires_in=self.settings.signed_download_url_ttl_seconds,
        )
        if not url:
            raise HTTPException(
                status_code=409,
                detail="signed download URL is not available for this episode",
            )
        return url

    @staticmethod
    def _episode_filename(drama: Drama, episode: DramaEpisode) -> str:
        return f"{drama.title}-ep-{episode.episode_no}.mp4"
