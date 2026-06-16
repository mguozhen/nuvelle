#!/usr/bin/env bash
set -Eeuo pipefail
shopt -s inherit_errexit 2>/dev/null || true

# Nuvelle Google Cloud deployment entrypoint.
#
# Daily use:
#   bash deploy/google-cloud.sh
#
# Useful scoped runs:
#   ONLY=api bash deploy/google-cloud.sh
#   ONLY=frontend bash deploy/google-cloud.sh
#   ONLY=verify bash deploy/google-cloud.sh
#   ONLY=domain CF_API_TOKEN=... bash deploy/google-cloud.sh
#   SKIP_BACKEND_BUILD=true bash deploy/google-cloud.sh
#
# This script intentionally stays close to official Google Cloud primitives:
# gcloud, Cloud Build, Cloud Run, Cloud SQL, Artifact Registry, and Secret
# Manager. It avoids a Terraform state dependency until the deployment shape is
# stable enough to justify infrastructure-as-code.

PROJECT_ID="${PROJECT_ID:-vocai-gemini-prod}"
REGION="${REGION:-us-west1}"
REPOSITORY="${REPOSITORY:-nuvelle}"
TAG="${TAG:-$(git rev-parse --short HEAD 2>/dev/null || date +%Y%m%d%H%M%S)}"
BUILD_DIR="${BUILD_DIR:-.gcloud-build}"
ONLY="${ONLY:-all}"

SQL_INSTANCE="${SQL_INSTANCE:-nuvelle-postgres}"
SQL_DATABASE="${SQL_DATABASE:-nuvelle}"
SQL_USER="${SQL_USER:-nuvelle}"
SQL_EDITION="${SQL_EDITION:-ENTERPRISE}"
SQL_TIER="${SQL_TIER:-db-f1-micro}"

DB_PASSWORD_SECRET="${DB_PASSWORD_SECRET:-nuvelle-db-password}"
DATABASE_URL_SECRET="${DATABASE_URL_SECRET:-nuvelle-database-url}"
FLATKEY_SECRET="${FLATKEY_SECRET:-nuvelle-flatkey-api-key}"

DOMAIN_ROOT="${DOMAIN_ROOT:-nuvelle.ai}"
GOOGLE_SITE_VERIFICATION_TXT="${GOOGLE_SITE_VERIFICATION_TXT:-google-site-verification=5VahbGzMPJdrTqND3LmWmOpXWhEuuC4ZkYMD4cGfpm8}"
USE_CUSTOM_API_DOMAIN="${USE_CUSTOM_API_DOMAIN:-false}"

API_SERVICE="nuvelle-api"
WEBSITE_SERVICE="nuvelle-website"
MOBILE_SERVICE="nuvelle-mobile"
WEB_SERVICE="nuvelle-web"
ADMIN_SERVICE="nuvelle-admin"

API_URL=""

STATIC_SERVICES=(
  "$WEBSITE_SERVICE:nuvelle_website/out"
  "$MOBILE_SERVICE:nuvelle_mobile/dist"
  "$WEB_SERVICE:nuvelle_web/dist"
  "$ADMIN_SERVICE:nuvelle_admin/dist"
)

DOMAIN_MAPPINGS=(
  "$DOMAIN_ROOT:$WEBSITE_SERVICE"
  "www.$DOMAIN_ROOT:$WEBSITE_SERVICE"
  "app.$DOMAIN_ROOT:$MOBILE_SERVICE"
  "cps.$DOMAIN_ROOT:$WEB_SERVICE"
  "admin.$DOMAIN_ROOT:$ADMIN_SERVICE"
  "api.$DOMAIN_ROOT:$API_SERVICE"
)

rsync_common_excludes=(
  --exclude=.venv/
  --exclude=venv/
  --exclude=__pycache__/
  --exclude=.pytest_cache/
  --exclude=.ruff_cache/
  --exclude=.mypy_cache/
  --exclude='*.pyc'
  --exclude=.env
)

log() {
  printf '\n==> %s\n' "$*" >&2
}

warn() {
  printf 'Warning: %s\n' "$*" >&2
}

die() {
  printf 'Error: %s\n' "$*" >&2
  exit 1
}

usage() {
  cat <<EOF
Usage:
  bash deploy/google-cloud.sh

Environment:
  ONLY=all|api|frontend|static|verify|domain
  PROJECT_ID=$PROJECT_ID
  REGION=$REGION
  REPOSITORY=$REPOSITORY
  TAG=$TAG
  SKIP_BACKEND_BUILD=true|false
  CF_API_TOKEN=<Cloudflare token, only for ONLY=domain>
  USE_CUSTOM_API_DOMAIN=true|false

Examples:
  bash deploy/google-cloud.sh
  ONLY=api bash deploy/google-cloud.sh
  ONLY=frontend SKIP_BACKEND_BUILD=true bash deploy/google-cloud.sh
  ONLY=verify bash deploy/google-cloud.sh
  ONLY=domain CF_API_TOKEN=... bash deploy/google-cloud.sh
EOF
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "Missing required command: $1"
}

run_mode_is() {
  [[ "$ONLY" == "$1" ]]
}

run_mode_in() {
  local mode
  for mode in "$@"; do
    [[ "$ONLY" == "$mode" ]] && return 0
  done
  return 1
}

validate_mode() {
  case "$ONLY" in
    all | api | frontend | static | verify | domain)
      ;;
    help | -h | --help)
      usage
      exit 0
      ;;
    *)
      usage
      die "Unsupported ONLY=$ONLY"
      ;;
  esac
}

preflight() {
  log "Preflight"
  require_cmd gcloud
  require_cmd python3

  if run_mode_in all api frontend static; then
    require_cmd rsync
  fi

  if run_mode_in all api; then
    require_cmd openssl
  fi

  if run_mode_in all frontend; then
    require_cmd pnpm
  fi

  if run_mode_in all verify; then
    require_cmd curl
  fi

  gcloud auth list --filter=status:ACTIVE --format='value(account)' | grep -q . ||
    die "gcloud is not logged in. Run: gcloud auth login"

  gcloud config set project "$PROJECT_ID" >/dev/null

  local billing_enabled
  billing_enabled="$(gcloud billing projects describe "$PROJECT_ID" --format='value(billingEnabled)' 2>/dev/null || true)"
  if [[ "$billing_enabled" != "True" && "$billing_enabled" != "true" ]]; then
    die "Project $PROJECT_ID does not have billing enabled."
  fi

  rm -rf "$BUILD_DIR"
  mkdir -p "$BUILD_DIR"
}

enable_google_cloud_services() {
  log "Enable required Google Cloud APIs"
  gcloud services enable \
    run.googleapis.com \
    cloudbuild.googleapis.com \
    artifactregistry.googleapis.com \
    cloudresourcemanager.googleapis.com \
    iam.googleapis.com \
    sqladmin.googleapis.com \
    secretmanager.googleapis.com \
    --project="$PROJECT_ID"
}

ensure_artifact_repository() {
  log "Ensure Artifact Registry repository"
  if gcloud artifacts repositories describe "$REPOSITORY" \
    --project="$PROJECT_ID" \
    --location="$REGION" >/dev/null 2>&1; then
    return
  fi

  gcloud artifacts repositories create "$REPOSITORY" \
    --project="$PROJECT_ID" \
    --location="$REGION" \
    --repository-format=docker \
    --description="Nuvelle Cloud Run images"
}

secret_exists() {
  gcloud secrets describe "$1" --project="$PROJECT_ID" >/dev/null 2>&1
}

create_secret() {
  local secret="$1"
  local value="$2"

  printf '%s' "$value" | gcloud secrets create "$secret" \
    --project="$PROJECT_ID" \
    --replication-policy=automatic \
    --data-file=- >&2
}

upsert_secret_version() {
  local secret="$1"
  local value="$2"

  if secret_exists "$secret"; then
    printf '%s' "$value" | gcloud secrets versions add "$secret" \
      --project="$PROJECT_ID" \
      --data-file=- >&2
  else
    create_secret "$secret" "$value"
  fi
}

ensure_database() {
  log "Ensure Cloud SQL PostgreSQL"
  local connection_name="$PROJECT_ID:$REGION:$SQL_INSTANCE"
  local runtime_sa
  local project_number
  local db_password

  project_number="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"
  runtime_sa="${RUNTIME_SERVICE_ACCOUNT:-${project_number}-compute@developer.gserviceaccount.com}"

  if secret_exists "$DB_PASSWORD_SECRET"; then
    db_password="$(gcloud secrets versions access latest --secret="$DB_PASSWORD_SECRET" --project="$PROJECT_ID")"
  else
    db_password="$(openssl rand -hex 24)"
    create_secret "$DB_PASSWORD_SECRET" "$db_password"
  fi

  if ! gcloud sql instances describe "$SQL_INSTANCE" --project="$PROJECT_ID" >/dev/null 2>&1; then
    # Cloud SQL creation is the slowest first-time operation. Subsequent runs
    # reuse the instance and finish much faster.
    gcloud sql instances create "$SQL_INSTANCE" \
      --project="$PROJECT_ID" \
      --database-version=POSTGRES_16 \
      --edition="$SQL_EDITION" \
      --region="$REGION" \
      --tier="$SQL_TIER" \
      --storage-type=SSD \
      --storage-size=10 \
      --availability-type=ZONAL \
      --backup-start-time=10:00 \
      --quiet
  fi

  if ! gcloud sql databases describe "$SQL_DATABASE" \
    --project="$PROJECT_ID" \
    --instance="$SQL_INSTANCE" >/dev/null 2>&1; then
    gcloud sql databases create "$SQL_DATABASE" \
      --project="$PROJECT_ID" \
      --instance="$SQL_INSTANCE"
  fi

  if gcloud sql users list \
    --project="$PROJECT_ID" \
    --instance="$SQL_INSTANCE" \
    --filter="name=$SQL_USER" \
    --format='value(name)' | grep -qx "$SQL_USER"; then
    gcloud sql users set-password "$SQL_USER" \
      --project="$PROJECT_ID" \
      --instance="$SQL_INSTANCE" \
      --password="$db_password"
  else
    gcloud sql users create "$SQL_USER" \
      --project="$PROJECT_ID" \
      --instance="$SQL_INSTANCE" \
      --password="$db_password"
  fi

  # Cloud Run uses the default compute service account unless
  # RUNTIME_SERVICE_ACCOUNT is set. It needs Cloud SQL Client to use the
  # Cloud SQL Unix socket mounted by --add-cloudsql-instances.
  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:$runtime_sa" \
    --role="roles/cloudsql.client" \
    --condition=None \
    --quiet >/dev/null

  DATABASE_URL="${DATABASE_URL:-postgresql+psycopg://${SQL_USER}:${db_password}@/${SQL_DATABASE}?host=/cloudsql/${connection_name}}"
  upsert_secret_version "$DATABASE_URL_SECRET" "$DATABASE_URL"
}

ensure_infra() {
  enable_google_cloud_services
  ensure_artifact_repository
  ensure_database
}

prepare_api_context() {
  local context="$1"

  rm -rf "$context"
  mkdir -p "$context"

  # Send Cloud Build only the API and nuvelle_kit package. Uploading the whole
  # monorepo is slow and can accidentally include local caches or node_modules.
  rsync -a "${rsync_common_excludes[@]}" nuvelle_api "$context/"
  rsync -a "${rsync_common_excludes[@]}" \
    --exclude=out/ \
    --exclude=_work/ \
    --exclude=_uploads/ \
    --exclude=_vidcache/ \
    --exclude=fonts/ \
    nuvelle_kit "$context/"
  cp deploy/cloudbuild-api.yaml "$context/cloudbuild-api.yaml"
}

prepare_static_context() {
  local context="$1"
  local site_dir="$2"

  rm -rf "$context"
  mkdir -p "$context/deploy" "$context/$site_dir"

  # Static services all share the same tiny Nginx image. The frontend build
  # output is copied in as /usr/share/nginx/html.
  cp deploy/Dockerfile.static "$context/deploy/Dockerfile.static"
  cp deploy/nginx-static.conf "$context/deploy/nginx-static.conf"
  cp deploy/cloudbuild-static.yaml "$context/cloudbuild-static.yaml"
  rsync -a --delete "$site_dir/" "$context/$site_dir/"
}

submit_cloud_build() {
  local context="$1"
  local config="$2"
  local substitutions="$3"
  local build_id
  local build_status

  build_id="$(gcloud builds submit "$context" \
    --project="$PROJECT_ID" \
    --config="$config" \
    --substitutions="$substitutions" \
    --async \
    --format='value(id)')"
  echo "Cloud Build submitted: $build_id" >&2

  # Poll with builds describe instead of streaming logs. Some accounts can start
  # builds but cannot stream the default Cloud Build log bucket.
  while true; do
    build_status="$(gcloud builds describe "$build_id" \
      --project="$PROJECT_ID" \
      --format='value(status)')"
    case "$build_status" in
      SUCCESS)
        echo "Cloud Build succeeded: $build_id" >&2
        return 0
        ;;
      FAILURE | INTERNAL_ERROR | TIMEOUT | CANCELLED | EXPIRED)
        echo "Cloud Build failed: $build_id status=$build_status" >&2
        return 1
        ;;
      *)
        echo "Cloud Build status: $build_id $build_status" >&2
        sleep 5
        ;;
    esac
  done
}

service_url() {
  gcloud run services describe "$1" \
    --project="$PROJECT_ID" \
    --region="$REGION" \
    --format='value(status.url)' 2>/dev/null || true
}

deploy_api() {
  log "Deploy API"
  local image="$REGION-docker.pkg.dev/$PROJECT_ID/$REPOSITORY/$API_SERVICE:$TAG"
  local context="$BUILD_DIR/api"
  local secret_args=(--set-secrets=DATABASE_URL="$DATABASE_URL_SECRET":latest)

  if secret_exists "$FLATKEY_SECRET"; then
    secret_args+=(--set-secrets=FLATKEY_API_KEY="$FLATKEY_SECRET":latest)
  elif [[ -n "${FLATKEY_API_KEY:-}" ]]; then
    upsert_secret_version "$FLATKEY_SECRET" "$FLATKEY_API_KEY"
    secret_args+=(--set-secrets=FLATKEY_API_KEY="$FLATKEY_SECRET":latest)
  else
    warn "$FLATKEY_SECRET is missing and FLATKEY_API_KEY is not set; promo AI generation will fail until configured."
  fi

  if [[ "${SKIP_BACKEND_BUILD:-false}" == "true" ]]; then
    echo "Skipping $API_SERVICE image build; reusing $image" >&2
  else
    prepare_api_context "$context"
    submit_cloud_build "$context" "$context/cloudbuild-api.yaml" "_IMAGE=$image"
  fi

  gcloud run deploy "$API_SERVICE" \
    --project="$PROJECT_ID" \
    --region="$REGION" \
    --image="$image" \
    --allow-unauthenticated \
    --port=8000 \
    --cpu=2 \
    --memory=2Gi \
    --timeout=900 \
    --min-instances=0 \
    --max-instances=2 \
    --add-cloudsql-instances="$PROJECT_ID:$REGION:$SQL_INSTANCE" \
    --set-env-vars='ENVIRONMENT=production,PROMO_STORAGE_DIR=/workspace/nuvelle_kit/out,PROMO_UPLOAD_DIR=/workspace/nuvelle_kit/_uploads,PROMO_CACHE_DIR=/workspace/nuvelle_kit/_vidcache,CORS_ORIGINS=["*"]' \
    "${secret_args[@]}"

  API_URL="$(service_url "$API_SERVICE")"
  [[ -n "$API_URL" ]] || die "Could not resolve $API_SERVICE URL after deploy."
}

resolve_api_url_for_frontend() {
  if [[ "$USE_CUSTOM_API_DOMAIN" == "true" ]]; then
    API_URL="https://api.$DOMAIN_ROOT"
  else
    API_URL="$(service_url "$API_SERVICE")"
  fi
  [[ -n "$API_URL" ]] || die "Cannot build admin because $API_SERVICE URL is unavailable."
}

build_frontend_package() {
  local package="$1"

  if [[ "$package" == "nuvelle_admin" ]]; then
    VITE_NUVELLE_API_URL="$API_URL/api/v1" pnpm --filter "$package" build
  else
    pnpm --filter "$package" build
  fi
}

build_frontends() {
  log "Build frontends"
  resolve_api_url_for_frontend
  build_frontend_package nuvelle_website
  build_frontend_package nuvelle_mobile
  build_frontend_package nuvelle_web
  build_frontend_package nuvelle_admin
}

deploy_static_service() {
  local service="$1"
  local site_dir="$2"
  local image="$REGION-docker.pkg.dev/$PROJECT_ID/$REPOSITORY/$service:$TAG"
  local context="$BUILD_DIR/static-$service"

  prepare_static_context "$context" "$site_dir"
  submit_cloud_build "$context" "$context/cloudbuild-static.yaml" "_SITE_DIR=$site_dir,_IMAGE=$image"

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

deploy_static_services() {
  log "Deploy static services"
  local entry
  local service
  local site_dir

  for entry in "${STATIC_SERVICES[@]}"; do
    service="${entry%%:*}"
    site_dir="${entry#*:}"
    deploy_static_service "$service" "$site_dir"
  done
}

http_check() {
  local url="$1"
  local label="$2"
  local code

  code="$(curl -sS -o /dev/null -w '%{http_code}' "$url" || true)"
  [[ "$code" == "200" ]] || die "$label returned HTTP $code for $url"
  echo "$label OK $url"
}

verify_deploy() {
  log "Verify deploy"
  local api_url
  local service
  local url

  api_url="$(service_url "$API_SERVICE")"
  [[ -n "$api_url" ]] || die "$API_SERVICE is missing."

  http_check "$api_url/api/v1/health/ready" "$API_SERVICE ready"
  http_check "$api_url/api/v1/votes" "$API_SERVICE votes"

  for service in "$WEBSITE_SERVICE" "$MOBILE_SERVICE" "$WEB_SERVICE" "$ADMIN_SERVICE"; do
    url="$(service_url "$service")"
    [[ -n "$url" ]] || die "$service is missing."
    http_check "$url" "$service"
  done
}

cloudflare_api() {
  local method="$1"
  local path="$2"
  local body="${3:-}"

  [[ -n "${CF_API_TOKEN:-}" ]] || die "CF_API_TOKEN is required for ONLY=domain."

  if [[ -n "$body" ]]; then
    curl -fsS -X "$method" "https://api.cloudflare.com/client/v4$path" \
      -H "Authorization: Bearer $CF_API_TOKEN" \
      -H "Content-Type: application/json" \
      --data "$body"
  else
    curl -fsS -X "$method" "https://api.cloudflare.com/client/v4$path" \
      -H "Authorization: Bearer $CF_API_TOKEN" \
      -H "Content-Type: application/json"
  fi
}

json_field() {
  python3 - "$1" <<'PY'
import json
import sys

path = sys.argv[1].split(".")
data = json.load(sys.stdin)
for part in path:
    if part == "":
        continue
    if isinstance(data, list):
        data = data[int(part)]
    else:
        data = data[part]
print(data)
PY
}

cloudflare_zone_id() {
  cloudflare_api GET "/zones?name=$DOMAIN_ROOT" |
    python3 -c 'import json,sys; data=json.load(sys.stdin); print(data["result"][0]["id"] if data.get("result") else "")'
}

cloudflare_upsert_dns() {
  local zone_id="$1"
  local type="$2"
  local name="$3"
  local content="$4"
  local ttl="${5:-1}"
  local proxied="${6:-false}"
  local record_id
  local payload

  record_id="$(cloudflare_api GET "/zones/$zone_id/dns_records?type=$type&name=$name" |
    python3 -c 'import json,sys; data=json.load(sys.stdin); print(data["result"][0]["id"] if data.get("result") else "")')"

  payload="$(python3 - "$type" "$name" "$content" "$ttl" "$proxied" <<'PY'
import json
import sys

type_, name, content, ttl, proxied = sys.argv[1:6]
payload = {
    "type": type_,
    "name": name,
    "content": content,
    "ttl": int(ttl),
}
if type_ in {"A", "AAAA", "CNAME"}:
    payload["proxied"] = proxied.lower() == "true"
print(json.dumps(payload))
PY
)"

  if [[ -n "$record_id" ]]; then
    cloudflare_api PUT "/zones/$zone_id/dns_records/$record_id" "$payload" >/dev/null
  else
    cloudflare_api POST "/zones/$zone_id/dns_records" "$payload" >/dev/null
  fi
}

google_site_verification_access_token() {
  gcloud auth application-default print-access-token 2>/dev/null ||
    die "Run: gcloud auth application-default login --scopes=https://www.googleapis.com/auth/cloud-platform,https://www.googleapis.com/auth/sqlservice.login,https://www.googleapis.com/auth/siteverification"
}

verify_google_domain() {
  log "Verify Google ownership for $DOMAIN_ROOT"
  local token
  local response

  gcloud services enable siteverification.googleapis.com --project="$PROJECT_ID" >/dev/null
  token="$(google_site_verification_access_token)"

  response="$(curl -sS -X POST 'https://www.googleapis.com/siteVerification/v1/webResource?verificationMethod=DNS_TXT' \
    -H "Authorization: Bearer $token" \
    -H 'Content-Type: application/json' \
    -H "X-Goog-User-Project: $PROJECT_ID" \
    -d "{\"site\":{\"identifier\":\"$DOMAIN_ROOT\",\"type\":\"INET_DOMAIN\"}}")"

  if python3 -c 'import json,sys; data=json.load(sys.stdin); sys.exit(0 if "id" in data else 1)' <<<"$response"; then
    echo "Google domain verified: $DOMAIN_ROOT"
  else
    echo "$response" >&2
    die "Google domain verification failed."
  fi
}

create_domain_mapping() {
  local domain="$1"
  local service="$2"

  if gcloud beta run domain-mappings describe \
    --domain="$domain" \
    --project="$PROJECT_ID" \
    --region="$REGION" >/dev/null 2>&1; then
    return
  fi

  gcloud beta run domain-mappings create \
    --domain="$domain" \
    --service="$service" \
    --project="$PROJECT_ID" \
    --region="$REGION" \
    --quiet
}

sync_domain_dns_record() {
  local zone_id="$1"
  local domain="$2"
  local records_json

  records_json="$(gcloud beta run domain-mappings describe \
    --domain="$domain" \
    --project="$PROJECT_ID" \
    --region="$REGION" \
    --format='json(status.resourceRecords)')"

  python3 - "$records_json" <<'PY' | while IFS=$'\t' read -r type name content; do
import json
import sys

payload = json.loads(sys.argv[1])
for record in payload.get("status", {}).get("resourceRecords", []):
    print(f"{record['type']}\t{record['name'].rstrip('.')}\t{record['rrdata'].rstrip('.')}")
PY
    cloudflare_upsert_dns "$zone_id" "$type" "$name" "$content" 1 false
  done
}

setup_domain() {
  log "Setup custom domain"
  require_cmd curl
  require_cmd gcloud
  [[ -n "${CF_API_TOKEN:-}" ]] || die "CF_API_TOKEN is required for ONLY=domain."

  local zone_id
  local entry
  local domain
  local service

  zone_id="$(cloudflare_zone_id)"
  [[ -n "$zone_id" ]] || die "Cloudflare zone not found: $DOMAIN_ROOT"

  # Google Search Console/Cloud Run requires ownership verification before
  # domain mappings can be created. TXT records must remain DNS-only.
  cloudflare_upsert_dns "$zone_id" TXT "$DOMAIN_ROOT" "$GOOGLE_SITE_VERIFICATION_TXT" 1 false
  verify_google_domain

  for entry in "${DOMAIN_MAPPINGS[@]}"; do
    domain="${entry%%:*}"
    service="${entry#*:}"
    create_domain_mapping "$domain" "$service"
    sync_domain_dns_record "$zone_id" "$domain"
  done

  echo "Custom domain DNS records synced. Keep Cloudflare records DNS-only until Google-managed certificates are ready."
}

print_summary() {
  log "Summary"
  gcloud run services list \
    --project="$PROJECT_ID" \
    --region="$REGION" \
    --filter='metadata.name~nuvelle' \
    --format='table(metadata.name,status.url)'
}

main() {
  validate_mode
  trap 'rm -rf "$BUILD_DIR"' EXIT

  preflight

  if run_mode_is verify; then
    verify_deploy
    print_summary
    return
  fi

  if run_mode_is domain; then
    setup_domain
    print_summary
    return
  fi

  if run_mode_in all api; then
    ensure_infra
    deploy_api
  fi

  if run_mode_in all frontend static; then
    if run_mode_in all frontend; then
      build_frontends
    fi
    deploy_static_services
  fi

  verify_deploy
  print_summary
}

main "$@"
