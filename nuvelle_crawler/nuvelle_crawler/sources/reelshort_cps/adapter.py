from nuvelle_crawler.db.repositories import ThirdPartyDramaResourcePayload
from nuvelle_crawler.sources.reelshort_cps.client import ReelShortCpsClient
from nuvelle_crawler.sources.reelshort_cps.mapper import ReelShortCpsMapper


class ReelShortCpsAdapter:
    def __init__(self, *, token: str, client: ReelShortCpsClient | None = None) -> None:
        self.client = client or ReelShortCpsClient(token=token)
        self.mapper = ReelShortCpsMapper()

    def list_page(self, *, page: int, language: str | None, sort: str) -> list[dict]:
        data = self.client.list_books(page=page, language=language, sort=sort)
        books = data.get("data", {}).get("books", [])
        if not isinstance(books, list):
            raise TypeError("Expected ReelShort CPS list response data.books to be a list")
        return books

    def get_detail(self, *, external_id: str, book_type: str) -> dict:
        data = self.client.book_detail(external_id=external_id, book_type=book_type)
        detail = data.get("data", data)
        if not isinstance(detail, dict):
            raise TypeError("Expected ReelShort CPS detail response data to be an object")
        return detail

    def to_resource_payload(self, raw: dict) -> ThirdPartyDramaResourcePayload:
        return self.mapper.to_resource_payload(raw)

