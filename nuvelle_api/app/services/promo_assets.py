from __future__ import annotations

import json
from pathlib import Path
from typing import cast

PROMO_TEASER_FILE = "teaser.mp4"
PROMO_COVER_FILE = "cover.jpg"
PROMO_CAPTION_FILE = "caption.txt"
PROMO_PLAN_FILE = "plan.json"
PROMO_ASSET_NAMES = frozenset({PROMO_TEASER_FILE, PROMO_COVER_FILE, PROMO_CAPTION_FILE, PROMO_PLAN_FILE})


def promo_file_url(job_id: str, filename: str) -> str:
    return f"/promo/jobs/{job_id}/files/{filename}"


def read_plan_file(path: Path) -> dict[str, object]:
    if not path.exists():
        return {}
    return read_plan_text(path.read_text(encoding="utf-8"))


def read_plan_text(value: str) -> dict[str, object]:
    try:
        data = json.loads(value)
    except json.JSONDecodeError:
        return {}
    return cast(dict[str, object], data) if isinstance(data, dict) else {}
