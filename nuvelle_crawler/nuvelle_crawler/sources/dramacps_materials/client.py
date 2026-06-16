import httpx


class DramaCpsMaterialsClient:
    def __init__(self, *, base_url: str = "https://files.reelhunter.xyz") -> None:
        self.base_url = base_url.rstrip("/")
        self.client = httpx.Client(
            base_url=self.base_url,
            timeout=httpx.Timeout(20.0, connect=5.0),
            limits=httpx.Limits(max_connections=4, max_keepalive_connections=2),
            headers={"Accept": "application/json"},
        )

    def get(self, path: str, params: dict) -> dict:
        response = self.client.get(path, params=params)
        response.raise_for_status()
        data = response.json()
        if not isinstance(data, dict):
            raise TypeError(f"Unexpected DramaCPS materials response type: {type(data).__name__}")
        return data

    def list_materials(self, *, page: int, language: str | None, limit: int = 12) -> dict:
        params: dict = {"page": page, "limit": limit}
        if language:
            params["lang"] = language
        return self.get("/api/open/dramas", params=params)

    def material_detail(self, *, base_id: str) -> dict:
        return self.get("/api/open/dramas", params={"base_id": base_id})
