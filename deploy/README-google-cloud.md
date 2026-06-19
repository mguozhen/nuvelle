# Nuvelle Google Cloud Deployment

This project deploys to Google Cloud through pnpm scripts:

```bash
pnpm deploy
```

The pnpm scripts delegate to `deploy/google-cloud.sh`, which remains the
single implementation point for Google Cloud operations.

The script uses official Google Cloud primitives rather than a third-party
deployment framework:

- Cloud Run for the five services.
- Cloud Build for Docker image builds.
- Artifact Registry for images.
- Cloud SQL for PostgreSQL.
- Secret Manager for runtime secrets.
- Cloudflare API only for the optional custom-domain stage.

## Modes

| Command | Purpose |
|---|---|
| `pnpm deploy` | Full deploy: infra, API, frontends, static services, verify |
| `pnpm deploy:api` | Rebuild and deploy only FastAPI |
| `pnpm deploy:frontend` | Build all frontends and deploy static services |
| `pnpm deploy:website` | Build and deploy only the public website |
| `pnpm deploy:mobile` | Build and deploy only the mobile PWA |
| `pnpm deploy:web` | Build and deploy only the CPS portal |
| `pnpm deploy:admin` | Build and deploy only the admin dashboard |
| `pnpm deploy:import-reelshort` | Build the API image, deploy a Cloud Run Job, and run ReelShort resource import |
| `pnpm deploy:static` | Deploy existing website `.next` and other frontend `dist` folders without rebuilding frontends |
| `pnpm deploy:verify` | Verify Cloud Run URLs and API health |
| `CF_API_TOKEN=... pnpm deploy:cdn` | Create promo Cloud CDN and sync `cdn.nuvelle.ai` DNS |
| `CF_API_TOKEN=... pnpm deploy:domain` | Sync Cloudflare DNS, Cloud Run domain mappings, and promo CDN DNS |
| `pnpm deploy:help` | Show all supported script options |

## Configuration

Defaults are production-ready for the current project:

```bash
PROJECT_ID=vocai-gemini-prod
REGION=us-west1
REPOSITORY=nuvelle
SQL_INSTANCE=nuvelle-postgres
SQL_DATABASE=nuvelle
SQL_USER=nuvelle
```

Useful overrides:

```bash
SKIP_BACKEND_BUILD=true
USE_CUSTOM_API_DOMAIN=true
TAG=my-release-tag
SQL_TIER=db-custom-1-3840
```

## ReelShort Resource Import

The importer converts crawler rows from `third_party_drama_resources` into
Nuvelle `dramas` and `drama_episodes`. It intentionally reuses the same
`ReelShortImportService` as the admin API endpoint, so local runs, API-triggered
runs, and Cloud Run Job runs share one conversion path.

Local dry-run:

```bash
cd nuvelle_api
DATABASE_URL=postgresql+psycopg://nuvelle:nuvelle_dev_password@localhost:5432/nuvelle \
  ../.venv/bin/python -m app.tasks.import_reelshort --limit 50 --dry-run --pretty
```

Local write run:

```bash
cd nuvelle_api
DATABASE_URL=postgresql+psycopg://nuvelle:nuvelle_dev_password@localhost:5432/nuvelle \
  ../.venv/bin/python -m app.tasks.import_reelshort --limit 500 --pretty
```

Single-resource retry:

```bash
cd nuvelle_api
../.venv/bin/python -m app.tasks.import_reelshort --resource-id 123 --limit 1 --pretty
```

Google Cloud dry-run job:

```bash
IMPORT_REELSHORT_DRY_RUN=true IMPORT_REELSHORT_LIMIT=50 pnpm deploy:import-reelshort
```

Google Cloud write job:

```bash
IMPORT_REELSHORT_LIMIT=500 pnpm deploy:import-reelshort
```

Useful Cloud Run Job overrides:

```bash
IMPORT_REELSHORT_RESOURCE_ID=123
IMPORT_REELSHORT_DETAIL_ONLY=true
IMPORT_REELSHORT_ALL_MATCHING=true
IMPORT_REELSHORT_DRY_RUN=true
IMPORT_REELSHORT_TIMEOUT=3600
SKIP_BACKEND_BUILD=true
```

The job name defaults to `nuvelle-import-reelshort`. The deploy script builds or
reuses the `nuvelle-api` image, attaches the `nuvelle-database-url` Secret
Manager value as `DATABASE_URL`, mounts the configured Cloud SQL instance, and
executes:

```bash
python -m app.tasks.import_reelshort --limit "$IMPORT_REELSHORT_LIMIT"
```

Use `IMPORT_REELSHORT_DRY_RUN=true` before the first production write run, then
remove it when the JSON summary looks correct.

## Services

| Cloud Run service | Source |
|---|---|
| `nuvelle-api` | `nuvelle_api/Dockerfile` |
| `nuvelle-website` | `nuvelle_website/.next` SSR service |
| `nuvelle-mobile` | `nuvelle_mobile/dist` |
| `nuvelle-web` | `nuvelle_web/dist` |
| `nuvelle-admin` | `nuvelle_admin/dist` |

## Website Blog Runtime

The public website runs as a Next.js SSR service on Cloud Run. The deploy script
sets these runtime defaults:

```bash
BLOG_SITE_KEY=nuvelle.ai
NEXT_PUBLIC_SITE_ORIGIN=https://nuvelle.ai
BLOG_SLX_HOST=https://apps.voc.ai
BLOG_PAGE_SIZE=12
```

Optional category filters can be provided when deploying:

```bash
BLOG_CATEGORY_IDS_EN=...
BLOG_CATEGORY_IDS_CN=...
BLOG_CATEGORY_IDS_JP=...
BLOG_CATEGORY_IDS_DE=...
BLOG_CATEGORY_IDS_FR=...
BLOG_CATEGORY_IDS_ES=...
BLOG_CATEGORY_IDS_PT=...
```

## Secrets

The script creates or reuses:

- `nuvelle-db-password`
- `nuvelle-database-url`
- `nuvelle-flatkey-api-key`

Rotate Flatkey without writing the value to git:

```bash
printf '%s' "$FLATKEY_API_KEY" | gcloud secrets versions add nuvelle-flatkey-api-key \
  --project=vocai-gemini-prod \
  --data-file=-
```

## Domain

The optional domain mode targets `nuvelle.ai`:

| Domain | Cloud Run service |
|---|---|
| `nuvelle.ai` | `nuvelle-website` |
| `www.nuvelle.ai` | `nuvelle-website` |
| `app.nuvelle.ai` | `nuvelle-mobile` |
| `cps.nuvelle.ai` | `nuvelle-web` |
| `admin.nuvelle.ai` | `nuvelle-admin` |
| `api.nuvelle.ai` | `nuvelle-api` |

Run:

```bash
CF_API_TOKEN=... pnpm deploy:cdn
CF_API_TOKEN=... pnpm deploy:domain
```

The Cloudflare token must be scoped to the `nuvelle.ai` zone with:

- `Zone -> Zone -> Read`
- `Zone -> DNS -> Edit`

Keep Cloudflare records as DNS-only until Google-managed certificates are ready.

Promo generated assets use a separate Google Cloud external load balancer with a
backend bucket and Cloud CDN:

| Domain | Origin |
|---|---|
| `cdn.nuvelle.ai` | `vocai-gemini-prod-nuvelle-promo-assets` |
