from typing import Protocol

from nuvelle_crawler.db.repositories import ThirdPartyDramaResourcePayload


class DramaSourceAdapter(Protocol):
    def list_page(self, *, page: int, language: str | None, sort: str) -> list[dict]:
        ...

    def get_detail(self, *, external_id: str, book_type: str) -> dict:
        ...

    def to_resource_payload(self, raw: dict) -> ThirdPartyDramaResourcePayload:
        ...

