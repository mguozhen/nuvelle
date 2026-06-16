import httpx


class ReelShortCpsClient:
    def __init__(self, *, token: str, base_url: str = "https://cps.reelshort.com") -> None:
        self.token = token
        self.base_url = base_url.rstrip("/")
        self.client = httpx.Client(
            base_url=self.base_url,
            timeout=httpx.Timeout(15.0, connect=5.0),
            limits=httpx.Limits(max_connections=4, max_keepalive_connections=2),
            headers={"Content-Type": "application/json", "Accept-Language": "en"},
        )

    def post(self, path: str, payload: dict) -> dict:
        if not self.token:
            raise RuntimeError("REELSHORT_CPS_TOKEN is required for live ReelShort CPS requests")
        response = self.client.post(path, json=payload, headers={"Authorization": f"Bearer {self.token}"})
        response.raise_for_status()
        data = response.json()
        if not isinstance(data, dict):
            raise TypeError(f"Unexpected ReelShort CPS response type: {type(data).__name__}")
        return data

    def list_books(self, *, page: int, language: str | None, sort: str, limit: int = 20) -> dict:
        payload = {
            "app": "reelshort",
            "sort": sort,
            "page": page,
            "limit": limit,
        }
        if language:
            payload["language"] = language
        return self.post("/api/v1/book/all-book", payload)

    def book_detail(self, *, external_id: str, book_type: str) -> dict:
        book_type_value = int(book_type) if str(book_type).isdigit() else book_type
        return self.post(
            "/api/v1/book/book-detail",
            {"app": "reelshort", "book_id": external_id, "book_type": book_type_value},
        )
