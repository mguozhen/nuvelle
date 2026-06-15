# Nuvelle Google Cloud Deployment

This deploys all Nuvelle surfaces to Cloud Run in the `nuvelle` GCP project.

## Services

- `nuvelle-site` serves `site/`
- `nuvelle-app` serves `nuvelle_app/`
- `nuvelle-cps` serves `nuvelle_cps/`
- `nuvelle-dash` serves `nuvelle_dash/`
- `nuvelle-kit` serves `nuvelle_kit/promo_server.py`

## Prerequisites

The project must have billing enabled before APIs can be enabled:

```bash
gcloud billing projects describe nuvelle
```

If `billingEnabled` is false, link a billing account in Google Cloud Console.

For AI promo generation, provide the Flatkey key as an environment variable before the first deploy:

```bash
export FLATKEY_API_KEY=sk-...
```

The deploy script stores it in Secret Manager as `FLATKEY_API_KEY`.

## Deploy

```bash
PROJECT_ID=nuvelle REGION=us-west1 bash deploy/deploy-gcp.sh
```

The static services use a shared Nginx container. The Python promo backend uses the existing `nuvelle_kit/Dockerfile`.
