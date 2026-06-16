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
        "default_sorts": ["time"],
        "queues": {
            "list": "reelshort-list-sync",
            "detail": "reelshort-detail-sync",
        },
    },
    "dramacps_materials": {
        "base_url": "https://files.reelhunter.xyz",
        "adapter": "dramacps_materials",
        "source_app": "multi_platform",
        "book_type": "material",
        "default_languages": [None],
        "languages": [
            "en",
            "es",
            "pt",
            "fr",
            "de",
            "it",
            "ja",
            "ko",
            "th",
            "vi",
            "id",
            "ru",
            "ar",
            "tr",
            "pl",
            "tc",
        ],
        "sorts": ["all"],
        "default_sorts": ["all"],
        "queues": {
            "list": "dramacps-material-list-sync",
            "detail": "dramacps-material-detail-sync",
        },
    }
}


def get_source_config(source: str) -> dict:
    try:
        return DRAMA_SOURCES[source]
    except KeyError as exc:
        raise ValueError(f"Unsupported drama source: {source}") from exc
