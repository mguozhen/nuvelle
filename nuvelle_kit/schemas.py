from dataclasses import dataclass
from pathlib import Path

from .storage import promo_slug


@dataclass(frozen=True)
class PromoGenerationRequest:
    mp4: Path
    title: str
    episode: str = "1"
    subtitle: str = ""
    handle: str = "@nuvelle"
    genre: str = "Short Drama"
    output_dir: Path | None = None
    cover_ts: float | None = None
    beats: list[float] | None = None
    no_ai: bool = False
    plan_path: Path | None = None
    duration: int = 13
    music_path: Path | None = None
    prompt: str = ""
    cover_image_url: str = ""

    @property
    def slug(self) -> str:
        return promo_slug(self.title, self.episode)


@dataclass(frozen=True)
class PromoGenerationResult:
    output_dir: Path
    cover_path: Path
    teaser_path: Path
    caption_path: Path
    plan_path: Path
    caption_text: str
