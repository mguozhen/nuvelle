DRAMA_SOURCES: dict[str, dict] = {
    "reelshort_cps": {
        "base_url": "https://cps.reelshort.com",
        "adapter": "reelshort_cps",
        "source_app": "reelshort",
        "book_type": "1",
        "languages": [
            "en",
            "es",
            "pt",
            "th",
            "in",
            "zh",
            "de",
            "fr",
            "hi",
            "tr",
            "fil",
            "ja",
            "ko",
            "ru",
            "vi",
            "bg",
            "cs",
            "ar",
            "zh-TW",
            "pl",
            "it",
            "ro",
        ],
        "sorts": ["time", "money"],
        "queues": {
            "list": "reelshort-list-sync",
            "detail": "reelshort-detail-sync",
        },
    }
}


def get_source_config(source: str) -> dict:
    try:
        return DRAMA_SOURCES[source]
    except KeyError as exc:
        raise ValueError(f"Unsupported drama source: {source}") from exc
