import math
import re
from dataclasses import dataclass

from sqlalchemy import String, cast, exists, func, or_, select
from sqlalchemy.orm import Session

from app.models.admin_user import AdminUser
from app.models.drama import Drama, DramaEpisode
from app.models.promo_job import PromoJob, PromoJobStatus
from app.models.user_drama_event import UserDramaEvent
from app.schemas.admin import (
    AdminDramaDetail,
    AdminDramaFilterOptions,
    AdminDramaListResponse,
    AdminDramaRead,
    AdminEpisodeRead,
)

TASTE_PATTERNS = (
    re.compile(r"\b(hidden identity|secret identity|disguise|heiress)\b", re.IGNORECASE),
    re.compile(r"\b(revenge|vengeance|betray|betrayed)\b", re.IGNORECASE),
    re.compile(r"\b(billionaire|ceo|tycoon|empire)\b", re.IGNORECASE),
    re.compile(r"\b(mafia|don|mob|bodyguard)\b", re.IGNORECASE),
    re.compile(r"\b(werewolf|alpha|luna|omega|pack)\b", re.IGNORECASE),
    re.compile(r"\b(reborn|reincarnat|restart)\b", re.IGNORECASE),
    re.compile(r"\b(second chance|again|one day before)\b", re.IGNORECASE),
)
REVENUE_PATTERN = re.compile(r"(?:revenue\s*)?\$\s*([\d,.]+)\s*([kmb])?", re.IGNORECASE)
PROMOTERS_PATTERN = re.compile(r"([\d,.]+)\s*([kmb])?\s*promoters", re.IGNORECASE)


@dataclass(frozen=True)
class DramaReadStats:
    has_video_ids: set[int]
    seen_ids: set[int]
    generated_counts: dict[int, int]
    generation_statuses: dict[int, str]
    generation_progresses: dict[int, int]


GENERATION_PROGRESS = {
    PromoJobStatus.queued.value: 5,
    PromoJobStatus.downloading.value: 25,
    PromoJobStatus.rendering.value: 70,
    PromoJobStatus.done.value: 100,
}
GENERATION_STATUS_RANK = {
    PromoJobStatus.rendering.value: 4,
    PromoJobStatus.downloading.value: 3,
    PromoJobStatus.queued.value: 2,
    PromoJobStatus.done.value: 1,
}
VISIBLE_GENERATION_STATUSES = tuple(GENERATION_STATUS_RANK)
SWIPE_LANGUAGE = "English"
TRANSFERRED_VIDEO_STATUS = "transferred"


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
        min_score: int | None,
        limit: int,
        offset: int,
    ) -> AdminDramaListResponse:
        has_video_expr = self._has_video_exists()
        stmt = select(Drama).where(
            Drama.video_transfer_status == TRANSFERRED_VIDEO_STATUS,
            has_video_expr,
        )
        if q:
            pattern = f"%{q.strip()}%"
            stmt = stmt.where(or_(Drama.title.ilike(pattern), Drama.synopsis_or_hook.ilike(pattern)))
        if platform:
            stmt = stmt.where(Drama.platform == platform)
        if language:
            stmt = stmt.where(Drama.language == language)
        if tag:
            pattern = f'%"{tag}"%'
            stmt = stmt.where(
                or_(
                    cast(Drama.tags, String).ilike(pattern),
                    cast(Drama.show_tags, String).ilike(pattern),
                )
            )
        if has_video is not None:
            stmt = stmt.where(has_video_expr if has_video else ~has_video_expr)

        ordered = stmt.order_by(Drama.platform_publish_at.desc().nullslast(), Drama.id.desc())
        if min_score is None:
            total = self.db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
            page = list(self.db.scalars(ordered.limit(limit).offset(offset)).all())
        else:
            dramas = list(self.db.scalars(ordered).all())
            filtered = [drama for drama in dramas if self.nuvelle_score(drama) >= min_score]
            total = len(filtered)
            page = filtered[offset : offset + limit]

        stats = self.read_stats_for([drama.id for drama in page], user.id)
        return AdminDramaListResponse(
            items=[self.to_read(drama, user, stats=stats) for drama in page],
            total=total,
        )

    def filter_options(self) -> AdminDramaFilterOptions:
        platforms: set[str] = set()
        languages: set[str] = set()
        tags: set[str] = set()

        for platform, language, drama_tags, show_tags in self.db.execute(
            select(Drama.platform, Drama.language, Drama.tags, Drama.show_tags).where(
                Drama.video_transfer_status == TRANSFERRED_VIDEO_STATUS,
                self._has_video_exists(),
            )
        ):
            self._add_string_value(platforms, platform)
            self._add_string_value(languages, language)
            self._add_string_values(tags, drama_tags)
            self._add_string_values(tags, show_tags)

        return AdminDramaFilterOptions(
            platforms=sorted(platforms, key=str.casefold),
            languages=sorted(languages, key=str.casefold),
            tags=sorted(tags, key=str.casefold),
        )

    def get_drama(self, drama_id: int, user: AdminUser) -> AdminDramaDetail | None:
        drama = self.db.scalars(
            select(Drama).where(
                Drama.id == drama_id,
                Drama.video_transfer_status == TRANSFERRED_VIDEO_STATUS,
                self._has_video_exists(),
            )
        ).first()
        if drama is None:
            return None
        episodes = self.episodes_for(drama.id)
        stats = self.read_stats_for([drama.id], user.id)
        episode_generation = self.episode_generation_statuses([episode.id for episode in episodes], user.id)
        return AdminDramaDetail(
            **self.to_read(drama, user, stats=stats).model_dump(),
            episodes=[
                self.to_episode(item, generation_status=episode_generation.get(item.id))
                for item in episodes
            ],
        )

    def swipe_next(self, user: AdminUser) -> AdminDramaRead | None:
        handled = select(UserDramaEvent.drama_id).where(
            UserDramaEvent.user_id == user.id,
            UserDramaEvent.event_type.in_(["seen", "vote", "generate"]),
        )
        stmt = (
            select(Drama)
            .where(~Drama.id.in_(handled))
            .where(Drama.language == SWIPE_LANGUAGE)
            .where(Drama.video_transfer_status == TRANSFERRED_VIDEO_STATUS)
            .where(self._has_video_exists())
            .order_by(Drama.platform_publish_at.desc().nullslast(), Drama.id.desc())
            .limit(1)
        )
        drama = self.db.scalars(stmt).first()
        if drama is None:
            return None
        stats = self.read_stats_for([drama.id], user.id)
        return self.to_read(drama, user, stats=stats)

    def to_read(
        self,
        drama: Drama,
        user: AdminUser,
        *,
        stats: DramaReadStats | None = None,
    ) -> AdminDramaRead:
        return AdminDramaRead(
            id=drama.id,
            title=drama.title,
            platform=drama.platform,
            genre=drama.genre,
            language=drama.language,
            tags=drama.tags or [],
            show_tags=drama.show_tags or [],
            cover_image_url=drama.cover_image_url,
            video_url=drama.video_url,
            synopsis_or_hook=drama.synopsis_or_hook,
            signal=drama.signal,
            episode_count=drama.episode_count,
            rs_book_id=drama.rs_book_id,
            recent_revenue=drama.recent_revenue,
            promoters_cnt=drama.promoters_cnt,
            pay_start=drama.pay_start,
            promotion_code=drama.promotion_code,
            app_promotion_link=drama.app_promotion_link,
            book_promotion_link=drama.book_promotion_link,
            platform_publish_at=drama.platform_publish_at,
            has_video=(drama.id in stats.has_video_ids) if stats else self.has_video(drama.id),
            seen=(drama.id in stats.seen_ids) if stats else self.seen(drama.id, user.id),
            generated_count=(
                stats.generated_counts.get(drama.id, 0) if stats else self.generated_count(drama.id, user.id)
            ),
            generation_status=(stats.generation_statuses.get(drama.id) if stats else None),
            generation_progress=(stats.generation_progresses.get(drama.id, 0) if stats else 0),
        )

    def episodes_for(self, drama_id: int) -> list[DramaEpisode]:
        stmt = (
            select(DramaEpisode)
            .where(DramaEpisode.drama_id == drama_id)
            .where(*self._transferred_episode_filters())
            .order_by(DramaEpisode.episode_no.asc())
        )
        return list(self.db.scalars(stmt).all())

    def has_video(self, drama_id: int) -> bool:
        stmt = (
            select(DramaEpisode.id)
            .where(DramaEpisode.drama_id == drama_id, *self._transferred_episode_filters())
            .limit(1)
        )
        return self.db.scalars(stmt).first() is not None

    def seen(self, drama_id: int, user_id: int) -> bool:
        stmt = (
            select(UserDramaEvent.id)
            .where(UserDramaEvent.user_id == user_id, UserDramaEvent.drama_id == drama_id)
            .limit(1)
        )
        return self.db.scalars(stmt).first() is not None

    def generated_count(self, drama_id: int, user_id: int) -> int:
        stmt = select(PromoJob.id).where(
            PromoJob.user_id == user_id,
            PromoJob.drama_id == drama_id,
            PromoJob.status.in_(VISIBLE_GENERATION_STATUSES),
        )
        return len(list(self.db.scalars(stmt).all()))

    def read_stats_for(self, drama_ids: list[int], user_id: int) -> DramaReadStats:
        if not drama_ids:
            return DramaReadStats(
                has_video_ids=set(),
                seen_ids=set(),
                generated_counts={},
                generation_statuses={},
                generation_progresses={},
            )

        has_video_ids = set(
            self.db.scalars(
                select(DramaEpisode.drama_id)
                .where(DramaEpisode.drama_id.in_(drama_ids), *self._transferred_episode_filters())
                .group_by(DramaEpisode.drama_id)
            ).all()
        )
        seen_ids = set(
            self.db.scalars(
                select(UserDramaEvent.drama_id)
                .where(UserDramaEvent.user_id == user_id, UserDramaEvent.drama_id.in_(drama_ids))
                .group_by(UserDramaEvent.drama_id)
            ).all()
        )
        generated_counts: dict[int, int] = {}
        generation_statuses: dict[int, str] = {}
        for drama_id, status in self.db.execute(
            select(PromoJob.drama_id, PromoJob.status).where(
                PromoJob.user_id == user_id,
                PromoJob.drama_id.in_(drama_ids),
                PromoJob.status.in_(VISIBLE_GENERATION_STATUSES),
            )
        ):
            if drama_id is None:
                continue
            generated_counts[int(drama_id)] = generated_counts.get(int(drama_id), 0) + 1
            generation_statuses[int(drama_id)] = self.preferred_generation_status(
                generation_statuses.get(int(drama_id)),
                status,
            )
        generation_progresses = {
            drama_id: self.generation_progress(status)
            for drama_id, status in generation_statuses.items()
        }
        return DramaReadStats(
            has_video_ids=has_video_ids,
            seen_ids=seen_ids,
            generated_counts=generated_counts,
            generation_statuses=generation_statuses,
            generation_progresses=generation_progresses,
        )

    def episode_generation_statuses(self, episode_ids: list[int], user_id: int) -> dict[int, str]:
        if not episode_ids:
            return {}
        statuses: dict[int, str] = {}
        for episode_id, status in self.db.execute(
            select(PromoJob.episode_id, PromoJob.status).where(
                PromoJob.user_id == user_id,
                PromoJob.episode_id.in_(episode_ids),
                PromoJob.status.in_(VISIBLE_GENERATION_STATUSES),
            )
        ):
            if episode_id is None:
                continue
            statuses[int(episode_id)] = self.preferred_generation_status(
                statuses.get(int(episode_id)),
                status,
            )
        return statuses

    @staticmethod
    def _has_video_exists():
        return exists(
            select(DramaEpisode.id).where(
                DramaEpisode.drama_id == Drama.id,
                *AdminDramaService._transferred_episode_filters(),
            )
        )

    @staticmethod
    def _transferred_episode_filters():
        return (
            DramaEpisode.video_transfer_status == TRANSFERRED_VIDEO_STATUS,
            DramaEpisode.gcs_uri.is_not(None),
        )

    @staticmethod
    def _add_string_value(target: set[str], value: object) -> None:
        if not isinstance(value, str):
            return
        normalized = value.strip()
        if normalized:
            target.add(normalized)

    @classmethod
    def _add_string_values(cls, target: set[str], values: object) -> None:
        if not isinstance(values, list):
            return
        for value in values:
            cls._add_string_value(target, value)

    def _matches_python_filters(
        self,
        drama: Drama,
        *,
        tag: str | None,
        has_video: bool | None,
        min_score: int | None,
    ) -> bool:
        if tag and tag not in (drama.tags or []) and tag not in (drama.show_tags or []):
            return False
        if has_video is not None and self.has_video(drama.id) != has_video:
            return False
        if min_score is not None and self.nuvelle_score(drama) < min_score:
            return False
        return True

    @classmethod
    def to_episode(cls, episode: DramaEpisode, generation_status: str | None = None) -> AdminEpisodeRead:
        return AdminEpisodeRead(
            id=episode.id,
            episode_no=episode.episode_no,
            chapter_id=episode.chapter_id,
            t_chapter_id=episode.t_chapter_id,
            play_url=episode.play_url,
            poster_url=episode.poster_url,
            iframe_src=episode.iframe_src,
            has_video=bool(
                episode.video_transfer_status == TRANSFERRED_VIDEO_STATUS
                and episode.gcs_uri
            ),
            generation_status=generation_status,
            generation_progress=cls.generation_progress(generation_status),
        )

    @staticmethod
    def preferred_generation_status(current: str | None, candidate: str) -> str:
        if current is None:
            return candidate
        return (
            candidate
            if GENERATION_STATUS_RANK.get(candidate, 0) > GENERATION_STATUS_RANK.get(current, 0)
            else current
        )

    @staticmethod
    def generation_progress(status: str | None) -> int:
        return GENERATION_PROGRESS.get(status or "", 0)

    @classmethod
    def nuvelle_score(cls, drama: Drama) -> int:
        text = " ".join(
            value
            for value in [
                drama.title,
                drama.platform,
                drama.genre,
                drama.signal,
                drama.synopsis_or_hook,
            ]
            if value
        )
        tags = sum(1 for pattern in TASTE_PATTERNS if pattern.search(text))
        if re.search(r"\brevenue\b|\$", text):
            tags += 1

        taste_score = min(32, tags * 8)
        revenue = cls._magnitude_from(REVENUE_PATTERN.search(drama.signal or ""))
        promoters = cls._magnitude_from(PROMOTERS_PATTERN.search(drama.signal or ""))
        revenue_score = min(30, math.log10(max(revenue, 1)) * 5)
        promoter_score = min(14, promoters / 1_000)
        video_score = 8 if drama.video_url else 0
        episode_score = min(6, (drama.episode_count or 0) / 8)
        score = 20 + taste_score + revenue_score + promoter_score + video_score + episode_score
        return max(0, min(100, round(score)))

    @staticmethod
    def _magnitude_from(match: re.Match[str] | None) -> float:
        if match is None:
            return 0

        value = float(match.group(1).replace(",", ""))
        suffix = (match.group(2) or "").lower()
        if suffix == "b":
            return value * 1_000_000_000
        if suffix == "m":
            return value * 1_000_000
        if suffix == "k":
            return value * 1_000
        return value
