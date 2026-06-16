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
| `pnpm deploy:static` | Deploy existing `out/dist` folders without rebuilding frontends |
| `pnpm deploy:verify` | Verify Cloud Run URLs and API health |
| `CF_API_TOKEN=... pnpm deploy:domain` | Sync Cloudflare DNS and Cloud Run domain mappings |
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

## Services

| Cloud Run service | Source |
|---|---|
| `nuvelle-api` | `nuvelle_api/Dockerfile` |
| `nuvelle-website` | `nuvelle_website/out` |
| `nuvelle-mobile` | `nuvelle_mobile/dist` |
| `nuvelle-web` | `nuvelle_web/dist` |
| `nuvelle-admin` | `nuvelle_admin/dist` |

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
CF_API_TOKEN=... pnpm deploy:domain
```

The Cloudflare token must be scoped to the `nuvelle.ai` zone with:

- `Zone -> Zone -> Read`
- `Zone -> DNS -> Edit`

Keep Cloudflare records as DNS-only until Google-managed certificates are ready.
