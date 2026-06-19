from __future__ import annotations

import json
from datetime import UTC, datetime
from hashlib import sha256
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.drama import Drama, DramaEpisode
from app.models.third_party_resource import ThirdPartyDramaResource
from app.repositories.third_party_resource_repository import ThirdPartyResourceRepository
from app.schemas.admin import ReelShortSyncRequest, ReelShortSyncResponse

DRAMA_GENRE_LIMIT = 255


class ReelShortImportService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.resources = ThirdPartyResourceRepository(db)

    def sync(self, payload: ReelShortSyncRequest) -> ReelShortSyncResponse:
        response = ReelShortSyncResponse()
        resources = self.resources.list_reelshort(
            limit=payload.limit,
            resource_id=payload.resource_id,
            detail_only=payload.detail_only,
        )
        for resource in resources:
            try:
                existed = self._find_drama(str(resource.raw_data.get("id"))) is not None
                if not payload.dry_run:
                    self._import_resource(resource)
                    self.db.commit()
                if existed:
                    response.updated += 1
                else:
                    response.imported += 1
            except Exception as exc:
                self.db.rollback()
                resource.import_status = "failed"
                resource.raw_data = {**resource.raw_data, "_import_error": str(exc)}
                self.db.add(resource)
                self.db.commit()
                response.failed += 1
        return response

    def _import_resource(self, resource: ThirdPartyDramaResource) -> Drama:
        raw = resource.raw_data
        rs_book_id = str(raw["id"])
        drama = self._find_drama(rs_book_id)
        if drama is None:
            drama = Drama(title=str(raw.get("title") or resource.title), rs_book_id=rs_book_id)
            self.db.add(drama)

        chapters = self._chapters(raw)
        is_detail_resource = self._is_detail_resource(raw, chapters)
        drama.title = str(raw.get("title") or resource.title)
        drama.platform = "ReelShort"
        drama.genre = self._genre(raw)
        drama.cover_image_url = self._optional_str(raw.get("pic") or resource.cover_url)
        self._set_detail_field(
            drama,
            "video_url",
            self._optional_str(chapters[0].get("play_url")) if chapters else None,
            overwrite=is_detail_resource,
        )
        self._set_detail_field(
            drama,
            "source_url",
            self._optional_str(raw.get("book_promotion_link") or raw.get("app_promotion_link")),
            overwrite=is_detail_resource,
        )
        self._set_detail_field(
            drama,
            "episode_count",
            self._positive_int(raw.get("chapter_count") or resource.episode_count),
            overwrite=is_detail_resource,
        )
        drama.synopsis_or_hook = self._optional_str(raw.get("desc") or resource.synopsis)
        drama.signal = self._signal(raw)
        if is_detail_resource or drama.source_resource_id is None:
            drama.source_resource_id = resource.id
        drama.language = self._optional_str(raw.get("lang") or resource.language)
        drama.tags = self._string_list(raw.get("tag"))
        drama.show_tags = self._string_list(raw.get("show_tag"))
        self._set_detail_field(
            drama,
            "book_type",
            self._optional_str(raw.get("book_type")),
            overwrite=is_detail_resource,
        )
        drama.is_valid = self._optional_bool(raw.get("is_valid"))
        self._set_detail_field(
            drama,
            "pay_start",
            self._positive_int(raw.get("pay_start")),
            overwrite=is_detail_resource,
        )
        drama.recent_revenue = self._optional_int(raw.get("recent_revenue"))
        drama.promoters_cnt = self._optional_int(raw.get("promoters_cnt"))
        self._set_detail_field(
            drama,
            "promotion_code",
            self._optional_str(raw.get("promotion_code")),
            overwrite=is_detail_resource,
        )
        self._set_detail_field(
            drama,
            "app_promotion_link",
            self._optional_str(raw.get("app_promotion_link")),
            overwrite=is_detail_resource,
        )
        self._set_detail_field(
            drama,
            "book_promotion_link",
            self._optional_str(raw.get("book_promotion_link")),
            overwrite=is_detail_resource,
        )
        publish_at = self._timestamp(raw.get("publish_at"))
        if publish_at is not None:
            self._set_detail_field(drama, "platform_publish_at", publish_at, overwrite=is_detail_resource)
        elif self._is_epoch_placeholder(drama.platform_publish_at):
            drama.platform_publish_at = None
        drama.source_first_seen_at = resource.first_seen_at
        drama.source_last_seen_at = resource.last_seen_at
        drama.source_last_changed_at = resource.last_changed_at
        self.db.flush()

        for index, chapter in enumerate(chapters, start=1):
            episode_no = self._episode_no(chapter, index)
            episode = self._find_episode(drama.id, episode_no)
            if episode is None:
                episode = DramaEpisode(drama_id=drama.id, episode_no=episode_no)
                self.db.add(episode)
            episode.chapter_id = self._optional_str(chapter.get("chapter_id"))
            episode.t_chapter_id = self._optional_str(chapter.get("t_chapter_id"))
            episode.play_url = self._optional_str(chapter.get("play_url"))
            episode.poster_url = self._optional_str(chapter.get("video_pic"))
            episode.iframe_src = self._optional_str(chapter.get("iframe_src"))
            episode.content = self._optional_str(chapter.get("content"))
            episode.source_payload_hash = self._hash(chapter)

        resource.internal_drama_id = drama.id
        resource.import_status = "imported"
        self.db.add(resource)
        return drama

    def _find_drama(self, rs_book_id: str) -> Drama | None:
        stmt = select(Drama).where(Drama.rs_book_id == rs_book_id)
        return self.db.scalars(stmt).first()

    def _find_episode(self, drama_id: int, episode_no: int) -> DramaEpisode | None:
        stmt = select(DramaEpisode).where(
            DramaEpisode.drama_id == drama_id,
            DramaEpisode.episode_no == episode_no,
        )
        return self.db.scalars(stmt).first()

    @staticmethod
    def _chapters(raw: dict[str, Any]) -> list[dict[str, Any]]:
        chapters = raw.get("chapters")
        return [item for item in chapters if isinstance(item, dict)] if isinstance(chapters, list) else []

    @staticmethod
    def _episode_no(chapter: dict[str, Any], fallback: int) -> int:
        raw_value = chapter.get("t_chapter_id") or fallback
        try:
            return int(str(raw_value))
        except ValueError:
            return fallback

    @staticmethod
    def _optional_str(value: Any) -> str | None:
        if value is None:
            return None
        normalized = str(value).strip()
        return normalized or None

    @staticmethod
    def _optional_int(value: Any) -> int | None:
        if value is None or value == "":
            return None
        return int(value)

    @classmethod
    def _positive_int(cls, value: Any) -> int | None:
        normalized = cls._optional_int(value)
        return normalized if normalized is not None and normalized > 0 else None

    @staticmethod
    def _optional_bool(value: Any) -> bool | None:
        return value if isinstance(value, bool) else None

    @staticmethod
    def _string_list(value: Any) -> list[str]:
        if isinstance(value, list):
            return [str(item) for item in value if str(item).strip()]
        if isinstance(value, str) and value.strip():
            return [value.strip()]
        return []

    @staticmethod
    def _timestamp(value: Any) -> datetime | None:
        if value is None or value == "":
            return None
        timestamp = int(value)
        if timestamp <= 0:
            return None
        if timestamp > 10_000_000_000:
            timestamp = timestamp // 1000
        return datetime.fromtimestamp(timestamp, tz=UTC)

    @classmethod
    def _is_detail_resource(cls, raw: dict[str, Any], chapters: list[dict[str, Any]]) -> bool:
        return bool(
            chapters
            or cls._positive_int(raw.get("chapter_count"))
            or cls._positive_int(raw.get("pay_start"))
            or cls._optional_str(raw.get("book_promotion_link"))
            or cls._optional_str(raw.get("app_promotion_link"))
        )

    @staticmethod
    def _set_detail_field(drama: Drama, field: str, value: Any, *, overwrite: bool) -> None:
        if value is None:
            return
        current = getattr(drama, field)
        if overwrite or current is None or current == "":
            setattr(drama, field, value)

    @staticmethod
    def _is_epoch_placeholder(value: datetime | None) -> bool:
        if value is None:
            return False
        normalized = value if value.tzinfo else value.replace(tzinfo=UTC)
        return normalized < datetime(1970, 1, 2, tzinfo=UTC)

    @staticmethod
    def _hash(value: dict[str, Any]) -> str:
        return sha256(json.dumps(value, sort_keys=True, ensure_ascii=True).encode("utf-8")).hexdigest()

    @staticmethod
    def _signal(raw: dict[str, Any]) -> str | None:
        parts = []
        if raw.get("recent_revenue") is not None:
            parts.append(f"recent revenue {raw['recent_revenue']}")
        if raw.get("promoters_cnt") is not None:
            parts.append(f"{raw['promoters_cnt']} promoters")
        return " | ".join(parts) or None

    @classmethod
    def _genre(cls, raw: dict[str, Any]) -> str | None:
        tags = cls._string_list(raw.get("show_tag")) or cls._string_list(raw.get("tag"))
        return cls._join_with_limit(tags, DRAMA_GENRE_LIMIT)

    @staticmethod
    def _join_with_limit(values: list[str], limit: int) -> str | None:
        parts: list[str] = []
        current_length = 0
        for value in values:
            separator_length = 2 if parts else 0
            next_length = current_length + separator_length + len(value)
            if next_length <= limit:
                parts.append(value)
                current_length = next_length
                continue
            if not parts:
                return value[:limit].rstrip(" ,") or None
            break
        return ", ".join(parts) or None
