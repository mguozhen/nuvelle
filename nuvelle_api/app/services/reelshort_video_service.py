from __future__ import annotations

import json
import urllib.request
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.drama import Drama, DramaEpisode
from app.models.third_party_resource import ThirdPartyDramaResource

BROWSER_USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/126.0.0.0 Safari/537.36"
)


class ReelShortVideoService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.settings = get_settings()

    def refresh_episode_play_url(self, *, drama_id: int | None, episode_id: int | None) -> str | None:
        if drama_id is None or episode_id is None or not self.settings.reelshort_cps_token:
            return None

        drama = self.db.get(Drama, drama_id)
        episode = self.db.get(DramaEpisode, episode_id)
        if drama is None or episode is None or episode.drama_id != drama.id or not drama.rs_book_id:
            return None
        if (drama.platform or "").lower() != "reelshort":
            return None

        detail = self._book_detail(drama.rs_book_id, self._book_type_for(drama))
        chapter = self._match_chapter(detail, episode)
        play_url = self._optional_str(chapter.get("play_url")) if chapter else None
        if not play_url:
            return None

        episode.play_url = play_url
        episode.poster_url = self._optional_str(chapter.get("video_pic")) or episode.poster_url
        episode.iframe_src = self._optional_str(chapter.get("iframe_src")) or episode.iframe_src
        episode.content = self._optional_str(chapter.get("content")) or episode.content
        if episode.episode_no == 1:
            drama.video_url = play_url
        self.db.add_all([drama, episode])
        self.db.commit()
        return play_url

    def _book_detail(self, external_id: str, book_type: str | None) -> dict[str, Any]:
        base_url = self.settings.reelshort_cps_base_url.rstrip("/")
        payload = {
            "app": "reelshort",
            "book_id": external_id,
            "book_type": int(book_type) if str(book_type or "").isdigit() else book_type or 1,
        }
        body = json.dumps(payload).encode()
        request = urllib.request.Request(
            f"{base_url}/api/v1/book/book-detail",
            data=body,
            headers={
                "User-Agent": BROWSER_USER_AGENT,
                "Accept": "application/json, text/plain, */*",
                "Accept-Language": "en-US,en;q=0.9",
                "Authorization": f"Bearer {self.settings.reelshort_cps_token}",
                "Content-Type": "application/json",
                "Origin": "https://cps.reelshort.com",
                "Referer": "https://cps.reelshort.com/",
            },
        )
        with urllib.request.urlopen(request, timeout=60) as response:
            data = json.loads(response.read().decode())
        detail = data.get("data", data) if isinstance(data, dict) else {}
        if not isinstance(detail, dict):
            raise TypeError("Unexpected ReelShort CPS detail response")
        return detail

    def _book_type_for(self, drama: Drama) -> str | None:
        if drama.book_type:
            return drama.book_type
        stmt = (
            select(ThirdPartyDramaResource.book_type)
            .where(
                ThirdPartyDramaResource.internal_drama_id == drama.id,
                ThirdPartyDramaResource.external_id == drama.rs_book_id,
                ThirdPartyDramaResource.source == "reelshort_cps",
            )
            .order_by(ThirdPartyDramaResource.last_seen_at.desc())
            .limit(1)
        )
        return self.db.scalars(stmt).first()

    @classmethod
    def _match_chapter(cls, detail: dict[str, Any], episode: DramaEpisode) -> dict[str, Any] | None:
        chapters = detail.get("chapters")
        if not isinstance(chapters, list):
            return None

        episode_no = str(episode.episode_no)
        padded_episode_no = episode_no.zfill(4)
        for raw in chapters:
            if not isinstance(raw, dict):
                continue
            t_chapter_id = cls._optional_str(raw.get("t_chapter_id"))
            chapter_id = cls._optional_str(raw.get("chapter_id"))
            if episode.t_chapter_id and t_chapter_id == episode.t_chapter_id:
                return raw
            if t_chapter_id in {episode_no, padded_episode_no}:
                return raw
            if episode.chapter_id and chapter_id == episode.chapter_id:
                return raw

        index = episode.episode_no - 1
        if 0 <= index < len(chapters) and isinstance(chapters[index], dict):
            return chapters[index]
        return None

    @staticmethod
    def _optional_str(value: Any) -> str | None:
        if value is None:
            return None
        normalized = str(value).strip()
        return normalized or None
