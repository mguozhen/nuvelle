import hashlib
import json

from nuvelle_crawler.db.repositories import ThirdPartyDramaResourcePayload


class ReelShortCpsMapper:
    source = "reelshort_cps"
    source_app = "reelshort"

    def to_resource_payload(self, raw: dict) -> ThirdPartyDramaResourcePayload:
        external_id = str(self._first(raw, "id", "book_id", "bookId"))
        book_type = str(self._first(raw, "book_type", "bookType", default="1"))
        pay_start = self._first(raw, "pay_start", "payStart")
        free_episode_count = int(pay_start) - 1 if pay_start is not None else None
        return ThirdPartyDramaResourcePayload(
            source=self.source,
            external_id=external_id,
            source_app=str(self._first(raw, "app", default=self.source_app)),
            book_type=book_type,
            language=str(self._first(raw, "lang", "language", default="")),
            title=str(self._first(raw, "title", "name", default="")),
            cover_url=self._first(raw, "pic", "cover", "cover_url", "coverUrl"),
            synopsis=self._first(raw, "introduction", "summary", "synopsis", "desc", "description"),
            release_date=self._first(raw, "release_date", "releaseDate", "release_time", "releaseTime"),
            episode_count=self._int_or_none(
                self._first(raw, "chapter_count", "chapterCount", "episode_count")
            ),
            free_episode_count=free_episode_count,
            raw_data=raw,
            raw_hash=self.hash_raw(raw),
        )

    @staticmethod
    def hash_raw(raw: dict) -> str:
        encoded = json.dumps(raw, sort_keys=True, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
        return hashlib.sha256(encoded).hexdigest()

    @staticmethod
    def _first(raw: dict, *keys: str, default=None):
        for key in keys:
            value = raw.get(key)
            if value is not None:
                return value
        return default

    @staticmethod
    def _int_or_none(value) -> int | None:
        if value is None or value == "":
            return None
        return int(value)
