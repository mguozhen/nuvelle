# Nuvelle - The Home of AI Shorts

Nuvelle is an AI short-drama distribution platform. The repo now uses a pnpm workspace with a Next.js website, three Vite React apps, a FastAPI business API, and the existing Python promo-generation backend.

| Surface | Directory | Stack | Purpose |
|---|---|---|---|
| Website | `nuvelle_website/` | Next.js + Tailwind + shadcn-style UI | Public catalog, hero carousel, search, detail modal |
| Mobile PWA | `nuvelle_mobile/` | Vite React + Tailwind + shadcn-style UI | Installable consumer app, bottom tabs, My List |
| CPS portal | `nuvelle_web/` | Vite React + Tailwind + shadcn-style UI | Nuvelle Boost distributor links and material packs |
| Admin | `nuvelle_admin/` | Vite React + Tailwind + shadcn-style UI | Scout dashboard, scoring, promo generation workflows |
| Business API | `nuvelle_api/` | FastAPI + PostgreSQL + SQLAlchemy | Versioned backend API, health checks, votes, promo generation workflows |
| Promo kit | `nuvelle_kit/` | Python package | Importable teaser/cover/caption generation package used by FastAPI and CLI |

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

Admin defaults to `http://localhost:8000/api/v1` for the FastAPI backend. Override at build time with:

```bash
VITE_NUVELLE_API_URL=https://your-api-url/api/v1 pnpm --filter nuvelle_admin build
```

## Promo Generation CLI

```bash
pip install -r nuvelle_api/requirements-dev.txt
FLATKEY_API_KEY=sk-... python3 -m nuvelle_kit.cli EPISODE.mp4 --title "MY WIFE" --ep 1
```

FastAPI calls the same `nuvelle_kit` package behind `/api/v1/promo/jobs` and `/api/v1/promo/batches`.


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

Google Cloud deployment lives in `deploy/`. Production currently runs in the
`vocai-gemini-prod` project, region `us-west1`.

Cloud Run services:

| Service | Purpose |
|---|---|
| `nuvelle-website` | Public website from `nuvelle_website/out` |
| `nuvelle-mobile` | Mobile PWA from `nuvelle_mobile/dist` |
| `nuvelle-web` | CPS portal from `nuvelle_web/dist` |
| `nuvelle-admin` | Admin dashboard from `nuvelle_admin/dist` |
| `nuvelle-api` | FastAPI backend on port `8000` |

Managed resources:

- Artifact Registry repository: `us-west1/nuvelle`
- Cloud SQL instance: `nuvelle-postgres`
- PostgreSQL database/user: `nuvelle`
- Secret Manager:
  - `nuvelle-database-url`
  - `nuvelle-db-password`
  - `nuvelle-flatkey-api-key`

### One-Time Setup

Authenticate with Google Cloud and select the production project:

```bash
gcloud auth login
gcloud auth application-default login
gcloud config set project vocai-gemini-prod
```

Install dependencies:

```bash
pnpm install
```

If the Flatkey key changes, rotate the Secret Manager value without writing it
to the repo:

```bash
printf '%s' "$FLATKEY_API_KEY" | gcloud secrets versions add nuvelle-flatkey-api-key \
  --project=vocai-gemini-prod \
  --data-file=-
```

### Normal Deploy

Use the pnpm deployment entrypoint:

```bash
pnpm deploy
```

The pnpm command delegates to `deploy/google-cloud.sh`. The script:

1. Enables required Google Cloud APIs.
2. Creates or reuses Artifact Registry and Cloud SQL resources.
3. Builds and deploys `nuvelle-api`.
4. Builds frontend apps.
5. Builds static Nginx images for frontend surfaces.
6. Deploys all five Cloud Run services.
7. Verifies the API and static services.

Scoped runs:

```bash
pnpm deploy:api
pnpm deploy:frontend
pnpm deploy:website
pnpm deploy:mobile
pnpm deploy:web
pnpm deploy:admin
pnpm deploy:static
pnpm deploy:verify
CF_API_TOKEN=... pnpm deploy:cdn
CF_API_TOKEN=... pnpm deploy:domain
SKIP_BACKEND_BUILD=true pnpm deploy
```

`pnpm deploy:frontend` builds and deploys all frontend apps. Use
`deploy:website`, `deploy:mobile`, `deploy:web`, or `deploy:admin` when only
one frontend needs to be released.

See `deploy/README-google-cloud.md` for the detailed deployment flow.

### Verify Deploy

```bash
pnpm deploy:verify
```

Expected responses include:

```json
{"status":"ok","database":"ok"}
{"rated":[],"votes":{},"count":0}
```

### Custom Domain

The target domain is `nuvelle.ai`, managed in Cloudflare. Domain setup is also
handled by the deployment entrypoint:

```bash
CF_API_TOKEN=... pnpm deploy:domain
```

The Cloudflare token needs zone read and DNS edit permissions for `nuvelle.ai`.
The script verifies Google ownership, creates Cloud Run domain mappings, creates
the promo Cloud CDN entrypoint, and syncs DNS-only Cloudflare records with
`flarectl`.

Mapping:

| Domain | Cloud Run service |
|---|---|
| `nuvelle.ai` | `nuvelle-website` |
| `www.nuvelle.ai` | `nuvelle-website` |
| `app.nuvelle.ai` | `nuvelle-mobile` |
| `cps.nuvelle.ai` | `nuvelle-web` |
| `admin.nuvelle.ai` | `nuvelle-admin` |
| `api.nuvelle.ai` | `nuvelle-api` |

Promo generated assets are stored in GCS and fronted by a Google Cloud external
load balancer + backend bucket + Cloud CDN:

| Domain | Origin |
|---|---|
| `cdn.nuvelle.ai` | `vocai-gemini-prod-nuvelle-promo-assets` |
