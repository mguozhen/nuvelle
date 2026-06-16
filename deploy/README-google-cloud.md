# Nuvelle Google Cloud Deployment

This project deploys to Google Cloud with one local entrypoint:

```bash
bash deploy/google-cloud.sh
```

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
| `bash deploy/google-cloud.sh` | Full deploy: infra, API, frontends, static services, verify |
| `ONLY=api bash deploy/google-cloud.sh` | Rebuild and deploy only FastAPI |
| `ONLY=frontend bash deploy/google-cloud.sh` | Build all frontends and deploy static services |
| `ONLY=static bash deploy/google-cloud.sh` | Deploy existing `out/dist` folders without rebuilding frontends |
| `ONLY=verify bash deploy/google-cloud.sh` | Verify Cloud Run URLs and API health |
| `ONLY=domain CF_API_TOKEN=... bash deploy/google-cloud.sh` | Sync Cloudflare DNS and Cloud Run domain mappings |

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
ONLY=domain CF_API_TOKEN=... bash deploy/google-cloud.sh
```

The Cloudflare token must be scoped to the `nuvelle.ai` zone with:

- `Zone -> Zone -> Read`
- `Zone -> DNS -> Edit`

Keep Cloudflare records as DNS-only until Google-managed certificates are ready.
