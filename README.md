# Nuvelle — The Home of AI Shorts

Nuvelle is an **AI short-drama distribution platform** (发行 / 分销 — we don't produce content).
Four surfaces + a promo-generation pipeline, all live.

| Surface | Dir | Live | What it is |
|---|---|---|---|
| Consumer site | `site/` | nuvelle.ai | ReelShort-style catalog: big banner carousel, Top 10, search, detail modal |
| Mobile app (PWA) | `nuvelle_app/` | app.nuvelle.ai | Installable iOS + Android, bottom tabs, My List, offline |
| Distributor portal | `nuvelle_cps/` | cps.nuvelle.ai | "Nuvelle Boost" — distributors grab 13s material packs + their affiliate link |
| Scout dashboard | `nuvelle_dash/` | admin.nuvelle.ai | 选品: swipe-rate competitor dramas (🔥/👍/👎), Nuvelle Score, 选品看板 |
| Promo pipeline | `nuvelle_kit/` | — | `kit.py` — any mp4 → 13s teaser + cover + caption + title + tags |

Brand: **Ribbon-N mark + white "Nuvelle" (Space Grotesk)**, aurora gradient `#b25cff → #ff5fbf`.

## Setup

```bash
cp .env.example .env        # then fill in FLATKEY_API_KEY
export FLATKEY_API_KEY=sk-...   # OpenAI-compatible router key (used by the pipeline's AI calls)
```

The web surfaces (`site/ nuvelle_app/ nuvelle_cps/ nuvelle_dash/`) are **static** — open `index.html`
or deploy each as its own Vercel project (`vercel deploy --prod`). No build step.

## Promo pipeline (`nuvelle_kit/`)

```bash
cd nuvelle_kit
pip install pillow            # + ffmpeg on PATH
python3 kit.py EPISODE.mp4 --title "MY WIFE" --ep 1 --dur 13
# -> out/<slug>/  cover.jpg + teaser.mp4 (13s, COMING SOON end card) + caption.txt
```

A vision model picks the cover frame + dramatic beats and writes the copy.
Flags: `--dur` (length), `--cover-ts`, `--beats t1,t2,...`, `--plan`, `--no-ai`.

### Generator service (for the Scout dashboard "one-click promo")

```bash
cd nuvelle_kit
FLATKEY_API_KEY=sk-... python3 promo_server.py     # http://localhost:8799
```

It also **serves the Scout dashboard locally** at `http://localhost:8799` (login `admin` / `admin`),
where the swipe view's "🎬 One-click promo" button generates a pack from the drama's video URL +
the highlight frames you marked while审片.

## Data

`dashboard_data/seed_dramas.json` — 414 dramas scraped (metadata + covers + ReelShort HLS preview
URLs) from 8 competitor platforms, used as the Scout dashboard's library. Metadata only — no video files.

## Roadmap (phase 2)

- Backend for the distributor portal (auth, click tracking, CPS commission/payout)
- Backend for Scout votes (multi-user, cross-device sync, reviewer calibration)
- Burning-paper transition asset for 100% ReelShort 书改预告 template match
- Real affiliate deep-links (replace placeholders) from the ReelShort CPS portal

---
Built with [Claude Code](https://claude.com/claude-code).
