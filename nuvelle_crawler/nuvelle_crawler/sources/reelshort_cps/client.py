import httpx

BROWSER_USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/126.0.0.0 Safari/537.36"
)
REQUEST_TIMEOUT = httpx.Timeout(60.0, connect=10.0)

REELSHORT_BROWSER_HEADERS = {
    "User-Agent": BROWSER_USER_AGENT,
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Content-Type": "application/json",
    "Origin": "https://cps.reelshort.com",
    "Referer": "https://cps.reelshort.com/",
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-origin",
}


class ReelShortCpsClient:
    def __init__(self, *, token: str, base_url: str = "https://cps.reelshort.com") -> None:
        self.token = token
        self.base_url = base_url.rstrip("/")
        self.client = httpx.Client(
            base_url=self.base_url,
            timeout=REQUEST_TIMEOUT,
            limits=httpx.Limits(max_connections=4, max_keepalive_connections=2),
            headers=REELSHORT_BROWSER_HEADERS,
        )

    def post(self, path: str, payload: dict) -> dict:
        if not self.token:
            raise RuntimeError("REELSHORT_CPS_TOKEN is required for live ReelShort CPS requests")
        headers = {**REELSHORT_BROWSER_HEADERS, "Authorization": f"Bearer {self.token}"}
        response = self.client.post(path, json=payload, headers=headers)
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
