# Nuvelle Publishing Kit

Drop one episode mp4 → get a TikTok cover + ~30s teaser + caption/hashtags.

## Use
```bash
python3 kit.py EPISODE.mp4 --title "MY WIFE" --ep 1 --sub "The 1 AM Tragedy"
```
A vision model (claude-sonnet via flatkey) samples 12 frames and auto-picks:
the cover frame, 4 escalating teaser beats, the cover hook (3 lines),
a logline, a FOLLOW-driven caption, and 10-12 hashtags.

Outputs land in `out/<slug>/`: `cover.jpg`, `teaser.mp4`, `caption.txt`, `plan.json`.

## Flags
- `--handle @nuvelle`     account handle on the end card
- `--cover-ts 27.6`       override the cover frame (seconds)
- `--beats 24,83,95,107`  override the 4 teaser beat starts (seconds)
- `--plan out/x/plan.json` re-render from a saved plan (skips the AI call)
- `--no-ai`               skip AI entirely, use evenly-spaced defaults
- `--out DIR`             custom output dir

## Branding
Ribbon-N mark + white "Nuvelle" (Didot) wordmark; drama title in pink.
Account-warming mode: teaser CTA = FOLLOW (grow to the Series threshold first).

## Notes
- ffmpeg here has no libass; all text is PIL-rendered overlays.
- Cover text auto-fits the frame width; bottom band is blurred+scrimmed to
  hide any burned-in subtitle. brand.py holds the palette/mark/fonts.
