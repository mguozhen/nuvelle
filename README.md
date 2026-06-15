# Nuvelle - The Home of AI Shorts

Nuvelle is an AI short-drama distribution platform. The repo now uses a pnpm workspace with a Next.js website, three Vite React apps, a FastAPI business API, and the existing Python promo-generation backend.

| Surface | Directory | Stack | Purpose |
|---|---|---|---|
| Website | `nuvelle_website/` | Next.js + Tailwind + shadcn-style UI | Public catalog, hero carousel, search, detail modal |
| Mobile PWA | `nuvelle_mobile/` | Vite React + Tailwind + shadcn-style UI | Installable consumer app, bottom tabs, My List |
| CPS portal | `nuvelle_web/` | Vite React + Tailwind + shadcn-style UI | Nuvelle Boost distributor links and material packs |
| Admin | `nuvelle_admin/` | Vite React + Tailwind + shadcn-style UI | Scout dashboard, scoring, promo generation workflows |
| Business API | `nuvelle_api/` | FastAPI + PostgreSQL + SQLAlchemy | Versioned backend API, health checks, domain models, migrations |
| Promo backend | `nuvelle_kit/` | Python | `kit.py` and `promo_server.py` for teaser/cover/caption generation |

Brand: Ribbon-N mark, white Nuvelle wordmark, aurora gradient `#b25cff -> #ff5fbf`.

## Setup

```bash
pnpm install
cp .env.example .env
export FLATKEY_API_KEY=sk-...
```

## Dev Commands

```bash
pnpm dev:website
pnpm dev:mobile
pnpm dev:web
pnpm dev:admin
```

Per-app validation commands:

```bash
pnpm --filter nuvelle_website typecheck
pnpm --filter nuvelle_mobile typecheck
pnpm --filter nuvelle_web typecheck
pnpm --filter nuvelle_admin typecheck
```

Build commands:

```bash
pnpm --filter nuvelle_website build   # outputs nuvelle_website/out
pnpm --filter nuvelle_mobile build    # outputs nuvelle_mobile/dist
pnpm --filter nuvelle_web build       # outputs nuvelle_web/dist
pnpm --filter nuvelle_admin build     # outputs nuvelle_admin/dist
```

Admin defaults to `http://localhost:8799` for the promo backend. Override at build time with:

```bash
VITE_NUVELLE_BACKEND_URL=https://your-nuvelle-kit-url pnpm --filter nuvelle_admin build
```

## Promo Backend

```bash
cd nuvelle_kit
pip install pillow
FLATKEY_API_KEY=sk-... python3 promo_server.py
```

The backend listens on `http://localhost:8799` and serves the built Admin app from `nuvelle_admin/dist` when that directory exists.

## FastAPI Backend Dev Environment

The new business API scaffold lives in `nuvelle_api/` and runs with PostgreSQL through Docker Compose:

```bash
cp .env.example .env
docker compose up --build api postgres
```

API health check:

```bash
curl http://localhost:8000/api/v1/health/live
curl http://localhost:8000/api/v1/health/ready
```

Local database connection for GUI tools:

```text
postgresql://nuvelle:nuvelle_dev_password@localhost:5432/nuvelle
```

## Data

`nuvelle_admin/public/seed_dramas.json` contains the competitor drama metadata used by the Admin dashboard. It includes metadata, covers, ReelShort preview URLs, and episode URL maps where available.

## Deployment

Google Cloud deployment lives in `deploy/`. Billing must be enabled on the target GCP project before the deploy script can enable APIs or deploy services.
