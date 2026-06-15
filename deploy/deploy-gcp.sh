#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-nuvelle}"
REGION="${REGION:-us-west1}"
REPOSITORY="${REPOSITORY:-nuvelle}"
TAG="${TAG:-$(git rev-parse --short HEAD 2>/dev/null || date +%Y%m%d%H%M%S)}"
BUILD_DIR=".gcloud-build"

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

require_cmd gcloud
require_cmd python3

rm -rf "$BUILD_DIR"
trap 'rm -rf "$BUILD_DIR"' EXIT

billing_enabled="$(gcloud billing projects describe "$PROJECT_ID" --format='value(billingEnabled)' 2>/dev/null || true)"
if [[ "$billing_enabled" != "True" && "$billing_enabled" != "true" ]]; then
  cat >&2 <<EOF
Project $PROJECT_ID does not have billing enabled.

Open Google Cloud Console -> Billing -> Link a billing account, then rerun:
  PROJECT_ID=$PROJECT_ID REGION=$REGION bash deploy/deploy-gcp.sh
EOF
  exit 2
fi

gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  --project="$PROJECT_ID"

if ! gcloud artifacts repositories describe "$REPOSITORY" \
  --project="$PROJECT_ID" \
  --location="$REGION" >/dev/null 2>&1; then
  gcloud artifacts repositories create "$REPOSITORY" \
    --project="$PROJECT_ID" \
    --location="$REGION" \
    --repository-format=docker \
    --description="Nuvelle Cloud Run images"
fi

deploy_static() {
  local service="$1"
  local site_dir="$2"
  local image="$REGION-docker.pkg.dev/$PROJECT_ID/$REPOSITORY/$service:$TAG"

  echo "Building $service from $site_dir -> $image"
  gcloud builds submit . \
    --project="$PROJECT_ID" \
    --config=deploy/cloudbuild-static.yaml \
    --substitutions="_SITE_DIR=$site_dir,_IMAGE=$image"

  echo "Deploying Cloud Run service $service"
  gcloud run deploy "$service" \
    --project="$PROJECT_ID" \
    --region="$REGION" \
    --image="$image" \
    --allow-unauthenticated \
    --port=8080 \
    --cpu=1 \
    --memory=256Mi \
    --min-instances=0 \
    --max-instances=4
}

deploy_backend() {
  local service="nuvelle-kit"
  local image="$REGION-docker.pkg.dev/$PROJECT_ID/$REPOSITORY/$service:$TAG"
  local secret_args=()

  if gcloud secrets describe FLATKEY_API_KEY --project="$PROJECT_ID" >/dev/null 2>&1; then
    secret_args+=(--set-secrets=FLATKEY_API_KEY=FLATKEY_API_KEY:latest)
  elif [[ -n "${FLATKEY_API_KEY:-}" ]]; then
    printf '%s' "$FLATKEY_API_KEY" | gcloud secrets create FLATKEY_API_KEY \
      --project="$PROJECT_ID" \
      --replication-policy=automatic \
      --data-file=-
    secret_args+=(--set-secrets=FLATKEY_API_KEY=FLATKEY_API_KEY:latest)
  else
    echo "Warning: FLATKEY_API_KEY is not set; nuvelle-kit will deploy, but AI promo generation will fall back or fail." >&2
  fi

  echo "Building $service -> $image" >&2
  gcloud builds submit nuvelle_kit \
    --project="$PROJECT_ID" \
    --tag="$image" >&2

  echo "Deploying Cloud Run service $service" >&2
  gcloud run deploy "$service" \
    --project="$PROJECT_ID" \
    --region="$REGION" \
    --image="$image" \
    --allow-unauthenticated \
    --cpu=2 \
    --memory=2Gi \
    --timeout=900 \
    --min-instances=0 \
    --max-instances=2 \
    "${secret_args[@]}" >&2

  gcloud run services describe "$service" \
    --project="$PROJECT_ID" \
    --region="$REGION" \
    --format='value(status.url)'
}

prepare_dashboard() {
  local backend_url="$1"
  local out_dir="$BUILD_DIR/nuvelle_dash"

  mkdir -p "$BUILD_DIR"
  cp -R nuvelle_dash "$out_dir"

  python3 - "$out_dir/index.html" "$backend_url" <<'PY'
import pathlib
import sys

path = pathlib.Path(sys.argv[1])
backend_url = sys.argv[2].rstrip("/")
text = path.read_text()
old = 'localStorage.getItem(BACKEND_KEY)||"http://localhost:8799"'
new = f'localStorage.getItem(BACKEND_KEY)||"{backend_url}"'
if old not in text:
    raise SystemExit(f"backend default marker not found in {path}")
path.write_text(text.replace(old, new))
PY

  printf '%s\n' "$out_dir"
}

backend_url="$(deploy_backend)"

deploy_static nuvelle-site site
deploy_static nuvelle-app nuvelle_app
deploy_static nuvelle-cps nuvelle_cps
deploy_static nuvelle-dash "$(prepare_dashboard "$backend_url")"

cat <<EOF

Deployment commands finished.

Service URLs:
$(gcloud run services list --project="$PROJECT_ID" --region="$REGION" --format='table(name,url)')
EOF
