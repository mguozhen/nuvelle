from nuvelle_crawler.db.repositories import ThirdPartyDramaResourcePayload
from nuvelle_crawler.sources.dramacps_materials.client import DramaCpsMaterialsClient
from nuvelle_crawler.sources.dramacps_materials.mapper import DramaCpsMaterialsMapper


class DramaCpsMaterialsAdapter:
    def __init__(
        self,
        *,
        base_url: str = "https://files.reelhunter.xyz",
        client: DramaCpsMaterialsClient | None = None,
    ) -> None:
        self.client = client or DramaCpsMaterialsClient(base_url=base_url)
        self.mapper = DramaCpsMaterialsMapper()

    def list_page(self, *, page: int, language: str | None, sort: str) -> list[dict]:
        data = self.client.list_materials(page=page, language=language)
        items = data.get("items", [])
        if not isinstance(items, list):
            raise TypeError("Expected DramaCPS materials list response items to be a list")
        return items

    def get_detail(self, *, external_id: str, book_type: str) -> dict:
        data = self.client.material_detail(base_id=external_id)
        if not isinstance(data, dict):
            raise TypeError("Expected DramaCPS material detail response to be an object")
        return data

    def to_resource_payload(self, raw: dict) -> ThirdPartyDramaResourcePayload:
        return self.mapper.to_resource_payload(raw)
