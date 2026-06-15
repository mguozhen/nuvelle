# Nuvelle Google Cloud Deployment

This deploys Nuvelle to Cloud Run in the `nuvelle` GCP project.

## Services

- `nuvelle-website` serves `nuvelle_website/out`
- `nuvelle-mobile` serves `nuvelle_mobile/dist`
- `nuvelle-web` serves `nuvelle_web/dist`
- `nuvelle-admin` serves `nuvelle_admin/dist`
- `nuvelle-kit` serves `nuvelle_kit/promo_server.py`

The deploy script deploys `nuvelle-kit` first, reads its Cloud Run URL, then builds `nuvelle_admin` with:

```bash
VITE_NUVELLE_BACKEND_URL=<nuvelle-kit Cloud Run URL>
```

That makes Admin use the deployed backend by default while still allowing local override through the `nuvelle_promo_backend` localStorage setting.

## Prerequisites

Billing must be enabled before APIs can be enabled:

```bash
gcloud billing projects describe nuvelle
```

If `billingEnabled` is false, link a billing account in Google Cloud Console first. The current deployment remains blocked until billing is enabled.

For AI promo generation, provide the Flatkey key before the first deploy:

```bash
export FLATKEY_API_KEY=sk-...
```

The deploy script stores it in Secret Manager as `FLATKEY_API_KEY`.

## Deploy

```bash
PROJECT_ID=nuvelle REGION=us-west1 bash deploy/deploy-gcp.sh
```

The script builds:

```bash
pnpm --filter nuvelle_website build
pnpm --filter nuvelle_mobile build
pnpm --filter nuvelle_web build
VITE_NUVELLE_BACKEND_URL=<backend-url> pnpm --filter nuvelle_admin build
```

Then it packages the generated static output directories into shared Nginx containers. The Python promo backend uses `nuvelle_kit/Dockerfile`.
