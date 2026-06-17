from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.models.admin_user import AdminUser
from app.models.drama import Drama, DramaEpisode
from app.models.promo_job import PromoJob
from app.models.user_drama_event import UserDramaEvent
from app.schemas.admin import (
    AdminDramaDetail,
    AdminDramaListResponse,
    AdminDramaRead,
    AdminEpisodeRead,
)


class AdminDramaService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_dramas(
        self,
        user: AdminUser,
        *,
        q: str | None,
        platform: str | None,
        language: str | None,
        tag: str | None,
        has_video: bool | None,
        limit: int,
        offset: int,
    ) -> AdminDramaListResponse:
        stmt = select(Drama)
        if q:
            pattern = f"%{q.strip()}%"
            stmt = stmt.where(or_(Drama.title.ilike(pattern), Drama.synopsis_or_hook.ilike(pattern)))
        if platform:
            stmt = stmt.where(Drama.platform == platform)
        if language:
            stmt = stmt.where(Drama.language == language)
        stmt = stmt.order_by(Drama.platform_publish_at.desc().nullslast(), Drama.id.desc())
        dramas = list(self.db.scalars(stmt).all())
        filtered = [drama for drama in dramas if self._matches_python_filters(drama, tag=tag, has_video=has_video)]
        page = filtered[offset : offset + limit]
        return AdminDramaListResponse(items=[self.to_read(drama, user) for drama in page], total=len(filtered))

    def get_drama(self, drama_id: int, user: AdminUser) -> AdminDramaDetail | None:
        drama = self.db.get(Drama, drama_id)
        if drama is None:
            return None
        episodes = self.episodes_for(drama.id)
        return AdminDramaDetail(**self.to_read(drama, user).model_dump(), episodes=[self.to_episode(item) for item in episodes])

    def swipe_next(self, user: AdminUser) -> AdminDramaRead | None:
        handled = select(UserDramaEvent.drama_id).where(
            UserDramaEvent.user_id == user.id,
            UserDramaEvent.event_type.in_(["seen", "vote", "generate"]),
        )
        stmt = (
            select(Drama)
            .where(~Drama.id.in_(handled))
            .order_by(Drama.platform_publish_at.desc().nullslast(), Drama.id.desc())
        )
        for drama in self.db.scalars(stmt).all():
            if self.has_video(drama.id):
                return self.to_read(drama, user)
        return None

    def to_read(self, drama: Drama, user: AdminUser) -> AdminDramaRead:
        return AdminDramaRead(
            id=drama.id,
            title=drama.title,
            platform=drama.platform,
            language=drama.language,
            tags=drama.tags or [],
            show_tags=drama.show_tags or [],
            cover_image_url=drama.cover_image_url,
            synopsis_or_hook=drama.synopsis_or_hook,
            episode_count=drama.episode_count,
            rs_book_id=drama.rs_book_id,
            recent_revenue=drama.recent_revenue,
            promoters_cnt=drama.promoters_cnt,
            pay_start=drama.pay_start,
            promotion_code=drama.promotion_code,
            app_promotion_link=drama.app_promotion_link,
            book_promotion_link=drama.book_promotion_link,
            platform_publish_at=drama.platform_publish_at,
            has_video=self.has_video(drama.id),
            seen=self.seen(drama.id, user.id),
            generated_count=self.generated_count(drama.id, user.id),
        )

    def episodes_for(self, drama_id: int) -> list[DramaEpisode]:
        stmt = select(DramaEpisode).where(DramaEpisode.drama_id == drama_id).order_by(DramaEpisode.episode_no.asc())
        return list(self.db.scalars(stmt).all())

    def has_video(self, drama_id: int) -> bool:
        stmt = select(DramaEpisode.id).where(DramaEpisode.drama_id == drama_id, DramaEpisode.play_url.is_not(None)).limit(1)
        return self.db.scalars(stmt).first() is not None

    def seen(self, drama_id: int, user_id: int) -> bool:
        stmt = (
            select(UserDramaEvent.id)
            .where(UserDramaEvent.user_id == user_id, UserDramaEvent.drama_id == drama_id)
            .limit(1)
        )
        return self.db.scalars(stmt).first() is not None

    def generated_count(self, drama_id: int, user_id: int) -> int:
        stmt = select(PromoJob.id).where(PromoJob.user_id == user_id, PromoJob.drama_id == drama_id)
        return len(list(self.db.scalars(stmt).all()))

    def _matches_python_filters(self, drama: Drama, *, tag: str | None, has_video: bool | None) -> bool:
        if tag and tag not in (drama.tags or []) and tag not in (drama.show_tags or []):
            return False
        if has_video is not None and self.has_video(drama.id) != has_video:
            return False
        return True

    @staticmethod
    def to_episode(episode: DramaEpisode) -> AdminEpisodeRead:
        return AdminEpisodeRead(
            id=episode.id,
            episode_no=episode.episode_no,
            chapter_id=episode.chapter_id,
            t_chapter_id=episode.t_chapter_id,
            play_url=episode.play_url,
            poster_url=episode.poster_url,
            iframe_src=episode.iframe_src,
        )
