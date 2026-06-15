import re
from pathlib import Path
from typing import Protocol


class HasPromoSlug(Protocol):
    slug: str


def slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", (text or "promo").lower()).strip("_") or "promo"


def promo_slug(title: str, episode: str | int) -> str:
    return f"{slugify(title)}_e{episode}"


def default_output_dir(base_dir: Path, request: HasPromoSlug) -> Path:
    return base_dir / request.slug
