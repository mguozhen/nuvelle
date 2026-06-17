import httpx

BROWSER_USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/126.0.0.0 Safari/537.36"
)
REQUEST_TIMEOUT = httpx.Timeout(60.0, connect=10.0)

DRAMACPS_BROWSER_HEADERS = {
    "User-Agent": BROWSER_USER_AGENT,
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Origin": "https://dramacps.com",
    "Referer": "https://dramacps.com/dashboard",
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "cross-site",
}


class DramaCpsMaterialsClient:
    def __init__(self, *, base_url: str = "https://files.reelhunter.xyz") -> None:
        self.base_url = base_url.rstrip("/")
        self.client = httpx.Client(
            base_url=self.base_url,
            timeout=REQUEST_TIMEOUT,
            limits=httpx.Limits(max_connections=4, max_keepalive_connections=2),
            headers=DRAMACPS_BROWSER_HEADERS,
        )

    def get(self, path: str, params: dict) -> dict:
        response = self.client.get(path, params=params, headers=DRAMACPS_BROWSER_HEADERS)
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
