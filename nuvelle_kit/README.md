# Nuvelle Publishing Kit

Drop one episode mp4 → get a TikTok cover + ~30s teaser + caption/hashtags.

## Use

Recommended module entry from the repo root:

```bash
python3 -m nuvelle_kit.cli EPISODE.mp4 --title "MY WIFE" --ep 1 --sub "The 1 AM Tragedy"
```

A vision model (claude-sonnet via flatkey) samples 12 frames and auto-picks:
the cover frame, 4 escalating teaser beats, the cover hook (3 lines),
a logline, a FOLLOW-driven caption, and 10-12 hashtags.

Outputs land in `out/<slug>/`: `cover.jpg`, `teaser.mp4`, `caption.txt`, `plan.json`.

## Python API

```python
from pathlib import Path

from nuvelle_kit import PromoGenerationRequest, generate_promo

result = generate_promo(
    PromoGenerationRequest(
        mp4=Path("EPISODE.mp4"),
        title="MY WIFE",
        episode="1",
        subtitle="The 1 AM Tragedy",
    )
)
print(result.teaser_path)
```

FastAPI imports this package directly for backend promo generation. New command-line usage should call
`python3 -m nuvelle_kit.cli`.

## Flags
- `--handle @nuvelle`     account handle on the end card
- `--cover-ts 27.6`       override the cover frame (seconds)
- `--beats 24,83,95,107`  override the 4 teaser beat starts (seconds)
- `--plan out/x/plan.json` re-render from a saved plan (skips the AI call)
- `--no-ai`               skip AI entirely, use evenly-spaced defaults
- `--out DIR`             custom output dir
- `--dur 13`              teaser duration in seconds
- `--prompt "..."`        reviewer creative direction for regeneration
- `--cover-image URL`     use an existing cover image URL

## Branding
Ribbon-N mark + white "Nuvelle" (Didot) wordmark; drama title in pink.
Account-warming mode: teaser CTA = FOLLOW (grow to the Series threshold first).

## Notes
- ffmpeg here has no libass; all text is PIL-rendered overlays.
- Cover text auto-fits the frame width; bottom band is blurred+scrimmed to
  hide any burned-in subtitle. brand.py holds the palette/mark/fonts.
