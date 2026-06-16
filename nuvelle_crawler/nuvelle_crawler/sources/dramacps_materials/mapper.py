import hashlib
import json

from nuvelle_crawler.db.repositories import ThirdPartyDramaResourcePayload


class DramaCpsMaterialsMapper:
    source = "dramacps_materials"
    book_type = "material"

    def to_resource_payload(self, raw: dict) -> ThirdPartyDramaResourcePayload:
        sections = raw.get("section")
        section_count = len(sections) if isinstance(sections, list) else None
        return ThirdPartyDramaResourcePayload(
            source=self.source,
            external_id=str(raw.get("base_id", "")),
            source_app=str(raw.get("source", "")),
            book_type=self.book_type,
            language=str(raw.get("lang_other") or raw.get("lang") or ""),
            title=str(raw.get("name_cn") or raw.get("name") or ""),
            cover_url=raw.get("cover_url"),
            synopsis=raw.get("description"),
            release_date=None,
            episode_count=section_count,
            free_episode_count=section_count,
            raw_data=raw,
            raw_hash=self.hash_raw(raw),
        )

    @staticmethod
    def hash_raw(raw: dict) -> str:
        encoded = json.dumps(raw, sort_keys=True, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
        return hashlib.sha256(encoded).hexdigest()
