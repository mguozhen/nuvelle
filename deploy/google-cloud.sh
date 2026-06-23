#!/usr/bin/env bash
set -Eeuo pipefail
shopt -s inherit_errexit 2>/dev/null || true

# Nuvelle 的 Google Cloud 部署总入口。
#
# 日常使用：
#   pnpm deploy
#
# 常用分段执行：
#   pnpm deploy:api
#   pnpm deploy:frontend
#   pnpm deploy:website
#   pnpm deploy:mobile
#   pnpm deploy:web
#   pnpm deploy:admin
#   pnpm deploy:import-reelshort
#   pnpm deploy:transfer-reelshort-videos
#   pnpm deploy:verify
#   CF_API_TOKEN=... pnpm deploy:domain
#   SKIP_BACKEND_BUILD=true pnpm deploy
#
# 这里刻意只封装 Google Cloud 官方能力：gcloud、Cloud Build、Cloud Run、
# Cloud SQL、Artifact Registry 和 Secret Manager。等部署形态稳定后，再考虑
# 是否引入 Terraform/OpenTofu 这类基础设施即代码工具。

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
PROMO_GCS_BUCKET="${PROMO_GCS_BUCKET:-$PROJECT_ID-nuvelle-promo-assets}"
PROMO_GCS_PREFIX="${PROMO_GCS_PREFIX:-promo}"
PROMO_WORK_DIR="${PROMO_WORK_DIR:-/tmp/nuvelle_promo}"
VIDEO_GCS_BUCKET="${VIDEO_GCS_BUCKET:-$PROMO_GCS_BUCKET}"
VIDEO_GCS_PREFIX="${VIDEO_GCS_PREFIX:-videos}"
VIDEO_PUBLIC_BASE_URL="${VIDEO_PUBLIC_BASE_URL:-}"
VIDEO_TRANSFER_WORK_DIR="${VIDEO_TRANSFER_WORK_DIR:-/tmp/nuvelle_video_transfer}"

DB_PASSWORD_SECRET="${DB_PASSWORD_SECRET:-nuvelle-db-password}"
DATABASE_URL_SECRET="${DATABASE_URL_SECRET:-nuvelle-database-url}"
FLATKEY_SECRET="${FLATKEY_SECRET:-nuvelle-flatkey-api-key}"
REELSHORT_CPS_SECRET="${REELSHORT_CPS_SECRET:-nuvelle-reelshort-cps-token}"
BLOGGER_ACCESS_KEY_SECRET="${BLOGGER_ACCESS_KEY_SECRET:-nuvelle-blogger-access-key}"

DOMAIN_ROOT="${DOMAIN_ROOT:-nuvelle.ai}"
CDN_DOMAIN="${CDN_DOMAIN:-cdn.$DOMAIN_ROOT}"
GOOGLE_SITE_VERIFICATION_TXT="${GOOGLE_SITE_VERIFICATION_TXT:-google-site-verification=5VahbGzMPJdrTqND3LmWmOpXWhEuuC4ZkYMD4cGfpm8}"
USE_CUSTOM_API_DOMAIN="${USE_CUSTOM_API_DOMAIN:-false}"
PROMO_CDN_PUBLIC_READ="${PROMO_CDN_PUBLIC_READ:-true}"
PROMO_CDN_BACKEND_BUCKET="${PROMO_CDN_BACKEND_BUCKET:-nuvelle-promo-assets-backend}"
PROMO_CDN_IP_NAME="${PROMO_CDN_IP_NAME:-nuvelle-promo-cdn-ip}"
PROMO_CDN_CERT_NAME="${PROMO_CDN_CERT_NAME:-nuvelle-promo-cdn-cert}"
PROMO_CDN_URL_MAP="${PROMO_CDN_URL_MAP:-nuvelle-promo-cdn-urlmap}"
PROMO_CDN_HTTP_PROXY="${PROMO_CDN_HTTP_PROXY:-nuvelle-promo-cdn-http-proxy}"
PROMO_CDN_HTTPS_PROXY="${PROMO_CDN_HTTPS_PROXY:-nuvelle-promo-cdn-https-proxy}"
PROMO_CDN_HTTP_FORWARDING_RULE="${PROMO_CDN_HTTP_FORWARDING_RULE:-nuvelle-promo-cdn-http-fwd}"
PROMO_CDN_HTTPS_FORWARDING_RULE="${PROMO_CDN_HTTPS_FORWARDING_RULE:-nuvelle-promo-cdn-https-fwd}"

API_SERVICE="nuvelle-api"
WEBSITE_SERVICE="nuvelle-website"
MOBILE_SERVICE="nuvelle-mobile"
WEB_SERVICE="nuvelle-web"
ADMIN_SERVICE="nuvelle-admin"
IMPORT_REELSHORT_JOB="${IMPORT_REELSHORT_JOB:-nuvelle-import-reelshort}"
IMPORT_REELSHORT_LIMIT="${IMPORT_REELSHORT_LIMIT:-500}"
IMPORT_REELSHORT_RESOURCE_ID="${IMPORT_REELSHORT_RESOURCE_ID:-}"
IMPORT_REELSHORT_DETAIL_ONLY="${IMPORT_REELSHORT_DETAIL_ONLY:-false}"
IMPORT_REELSHORT_ALL_MATCHING="${IMPORT_REELSHORT_ALL_MATCHING:-false}"
IMPORT_REELSHORT_DRY_RUN="${IMPORT_REELSHORT_DRY_RUN:-false}"
IMPORT_REELSHORT_TIMEOUT="${IMPORT_REELSHORT_TIMEOUT:-3600}"
TRANSFER_REELSHORT_JOB="${TRANSFER_REELSHORT_JOB:-nuvelle-transfer-reelshort-videos}"
TRANSFER_REELSHORT_LIMIT="${TRANSFER_REELSHORT_LIMIT:-500}"
TRANSFER_REELSHORT_LANGUAGE="${TRANSFER_REELSHORT_LANGUAGE:-English}"
TRANSFER_REELSHORT_DRAMA_ID="${TRANSFER_REELSHORT_DRAMA_ID:-}"
TRANSFER_REELSHORT_START_AFTER_DRAMA_ID="${TRANSFER_REELSHORT_START_AFTER_DRAMA_ID:-}"
TRANSFER_REELSHORT_RETRY_FAILED="${TRANSFER_REELSHORT_RETRY_FAILED:-false}"
TRANSFER_REELSHORT_FORCE="${TRANSFER_REELSHORT_FORCE:-false}"
TRANSFER_REELSHORT_DRY_RUN="${TRANSFER_REELSHORT_DRY_RUN:-false}"
TRANSFER_REELSHORT_DELAY_SECONDS="${TRANSFER_REELSHORT_DELAY_SECONDS:-0.2}"
TRANSFER_REELSHORT_TIMEOUT="${TRANSFER_REELSHORT_TIMEOUT:-86400}"

API_URL=""

# 前端应用映射格式：部署模式:Cloud Run 服务名:pnpm 包名:部署产物目录或类型。
FRONTEND_APPS=(
  "website:$WEBSITE_SERVICE:nuvelle_website:ssr"
  "mobile:$MOBILE_SERVICE:nuvelle_mobile:nuvelle_mobile/dist"
  "web:$WEB_SERVICE:nuvelle_web:nuvelle_web/dist"
  "admin:$ADMIN_SERVICE:nuvelle_admin:nuvelle_admin/dist"
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
  pnpm deploy

Environment:
  ONLY=all|api|frontend|static|website|mobile|web|admin|import-reelshort|verify|domain|cdn
  PROJECT_ID=$PROJECT_ID
  REGION=$REGION
  REPOSITORY=$REPOSITORY
  TAG=$TAG
  SKIP_BACKEND_BUILD=true|false
  IMPORT_REELSHORT_LIMIT=$IMPORT_REELSHORT_LIMIT
  IMPORT_REELSHORT_RESOURCE_ID=<optional third_party_drama_resources.id>
  IMPORT_REELSHORT_DRY_RUN=true|false
  TRANSFER_REELSHORT_LIMIT=$TRANSFER_REELSHORT_LIMIT
  TRANSFER_REELSHORT_LANGUAGE=$TRANSFER_REELSHORT_LANGUAGE
  TRANSFER_REELSHORT_DRAMA_ID=<optional dramas.id>
  TRANSFER_REELSHORT_START_AFTER_DRAMA_ID=<optional dramas.id cursor>
  TRANSFER_REELSHORT_RETRY_FAILED=true|false
  TRANSFER_REELSHORT_FORCE=true|false
  TRANSFER_REELSHORT_DRY_RUN=true|false
  TRANSFER_REELSHORT_DELAY_SECONDS=$TRANSFER_REELSHORT_DELAY_SECONDS
  TRANSFER_REELSHORT_TIMEOUT=$TRANSFER_REELSHORT_TIMEOUT
  CF_API_TOKEN=<Cloudflare token, only for ONLY=domain|cdn>
  CDN_DOMAIN=$CDN_DOMAIN
  USE_CUSTOM_API_DOMAIN=true|false

Examples:
  pnpm deploy
  pnpm deploy:api
  pnpm deploy:frontend
  pnpm deploy:website
  pnpm deploy:mobile
  pnpm deploy:web
  pnpm deploy:admin
  IMPORT_REELSHORT_DRY_RUN=true pnpm deploy:import-reelshort
  TRANSFER_REELSHORT_DRY_RUN=true pnpm deploy:transfer-reelshort-videos
  pnpm deploy:verify
  CF_API_TOKEN=... pnpm deploy:domain
  CF_API_TOKEN=... pnpm deploy:cdn
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
    all | api | frontend | static | website | mobile | web | admin | import-reelshort | transfer-reelshort-videos | verify | domain | cdn)
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

  if run_mode_in all api frontend static website mobile web admin import-reelshort transfer-reelshort-videos; then
    require_cmd rsync
  fi

  if run_mode_in all api import-reelshort transfer-reelshort-videos; then
    require_cmd openssl
  fi

  if run_mode_in all frontend website mobile web admin; then
    require_cmd pnpm
  fi

  if run_mode_in all frontend static verify website mobile web admin domain; then
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
    storage.googleapis.com \
    compute.googleapis.com \
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
    # 首次创建 Cloud SQL 最慢；后续执行会复用已有实例，速度会快很多。
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

  # Cloud Run 默认使用 Compute Engine 默认服务账号，除非显式设置
  # RUNTIME_SERVICE_ACCOUNT。该服务账号需要 Cloud SQL Client 权限，才能使用
  # --add-cloudsql-instances 挂载出来的 Cloud SQL Unix socket。
  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:$runtime_sa" \
    --role="roles/cloudsql.client" \
    --condition=None \
    --quiet >/dev/null

  DATABASE_URL="${CLOUD_SQL_DATABASE_URL:-postgresql+psycopg://${SQL_USER}:${db_password}@/${SQL_DATABASE}?host=/cloudsql/${connection_name}}"
  upsert_secret_version "$DATABASE_URL_SECRET" "$DATABASE_URL"
}

ensure_infra() {
  enable_google_cloud_services
  ensure_artifact_repository
  ensure_database
  ensure_promo_bucket
}

ensure_container_infra() {
  enable_google_cloud_services
  ensure_artifact_repository
}

runtime_service_account() {
  local project_number
  project_number="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"
  printf '%s' "${RUNTIME_SERVICE_ACCOUNT:-${project_number}-compute@developer.gserviceaccount.com}"
}

ensure_promo_bucket() {
  log "Ensure promo GCS bucket"
  local bucket="gs://$PROMO_GCS_BUCKET"
  local runtime_sa

  runtime_sa="$(runtime_service_account)"
  if ! gcloud storage buckets describe "$bucket" --project="$PROJECT_ID" >/dev/null 2>&1; then
    gcloud storage buckets create "$bucket" \
      --project="$PROJECT_ID" \
      --location="$REGION" \
      --uniform-bucket-level-access
  fi

  if ! gcloud storage buckets add-iam-policy-binding "$bucket" \
    --member="serviceAccount:$runtime_sa" \
    --role="roles/storage.objectAdmin" \
    --quiet >/dev/null; then
    warn "Could not update IAM on $bucket directly; granting project-level Storage Object Admin to $runtime_sa."
    gcloud projects add-iam-policy-binding "$PROJECT_ID" \
      --member="serviceAccount:$runtime_sa" \
      --role="roles/storage.objectAdmin" \
      --condition=None \
      --quiet >/dev/null
  fi
}

cdn_ip_address() {
  gcloud compute addresses describe "$PROMO_CDN_IP_NAME" \
    --global \
    --project="$PROJECT_ID" \
    --format='value(address)'
}

ensure_promo_cdn() {
  log "Ensure promo Cloud CDN: $CDN_DOMAIN"
  local bucket="gs://$PROMO_GCS_BUCKET"

  if [[ "$PROMO_CDN_PUBLIC_READ" == "true" ]]; then
    if ! gcloud storage buckets add-iam-policy-binding "$bucket" \
      --member=allUsers \
      --role=roles/storage.objectViewer \
      --quiet >/dev/null; then
      warn "Could not grant public read on $bucket. CDN provisioning will continue, but objects may return 403 until bucket IAM allows reads."
    fi
  else
    warn "PROMO_CDN_PUBLIC_READ=false; Cloud CDN may return 403 for private GCS objects."
  fi

  if ! gcloud compute addresses describe "$PROMO_CDN_IP_NAME" \
    --global \
    --project="$PROJECT_ID" >/dev/null 2>&1; then
    gcloud compute addresses create "$PROMO_CDN_IP_NAME" \
      --global \
      --ip-version=IPV4 \
      --project="$PROJECT_ID"
  fi

  if gcloud compute backend-buckets describe "$PROMO_CDN_BACKEND_BUCKET" \
    --project="$PROJECT_ID" >/dev/null 2>&1; then
    gcloud compute backend-buckets update "$PROMO_CDN_BACKEND_BUCKET" \
      --gcs-bucket-name="$PROMO_GCS_BUCKET" \
      --enable-cdn \
      --cache-mode=CACHE_ALL_STATIC \
      --default-ttl=3600 \
      --client-ttl=3600 \
      --max-ttl=86400 \
      --project="$PROJECT_ID"
  else
    gcloud compute backend-buckets create "$PROMO_CDN_BACKEND_BUCKET" \
      --gcs-bucket-name="$PROMO_GCS_BUCKET" \
      --enable-cdn \
      --cache-mode=CACHE_ALL_STATIC \
      --default-ttl=3600 \
      --client-ttl=3600 \
      --max-ttl=86400 \
      --project="$PROJECT_ID"
  fi

  if ! gcloud compute ssl-certificates describe "$PROMO_CDN_CERT_NAME" \
    --global \
    --project="$PROJECT_ID" >/dev/null 2>&1; then
    gcloud compute ssl-certificates create "$PROMO_CDN_CERT_NAME" \
      --domains="$CDN_DOMAIN" \
      --global \
      --project="$PROJECT_ID"
  fi

  if gcloud compute url-maps describe "$PROMO_CDN_URL_MAP" \
    --project="$PROJECT_ID" >/dev/null 2>&1; then
    gcloud compute url-maps set-default-service "$PROMO_CDN_URL_MAP" \
      --default-backend-bucket="$PROMO_CDN_BACKEND_BUCKET" \
      --project="$PROJECT_ID"
  else
    gcloud compute url-maps create "$PROMO_CDN_URL_MAP" \
      --default-backend-bucket="$PROMO_CDN_BACKEND_BUCKET" \
      --project="$PROJECT_ID"
  fi

  if gcloud compute target-http-proxies describe "$PROMO_CDN_HTTP_PROXY" \
    --project="$PROJECT_ID" >/dev/null 2>&1; then
    gcloud compute target-http-proxies update "$PROMO_CDN_HTTP_PROXY" \
      --url-map="$PROMO_CDN_URL_MAP" \
      --project="$PROJECT_ID"
  else
    gcloud compute target-http-proxies create "$PROMO_CDN_HTTP_PROXY" \
      --url-map="$PROMO_CDN_URL_MAP" \
      --project="$PROJECT_ID"
  fi

  if gcloud compute target-https-proxies describe "$PROMO_CDN_HTTPS_PROXY" \
    --project="$PROJECT_ID" >/dev/null 2>&1; then
    gcloud compute target-https-proxies update "$PROMO_CDN_HTTPS_PROXY" \
      --url-map="$PROMO_CDN_URL_MAP" \
      --ssl-certificates="$PROMO_CDN_CERT_NAME" \
      --global-ssl-certificates \
      --project="$PROJECT_ID"
  else
    gcloud compute target-https-proxies create "$PROMO_CDN_HTTPS_PROXY" \
      --url-map="$PROMO_CDN_URL_MAP" \
      --ssl-certificates="$PROMO_CDN_CERT_NAME" \
      --global-ssl-certificates \
      --project="$PROJECT_ID"
  fi

  if ! gcloud compute forwarding-rules describe "$PROMO_CDN_HTTP_FORWARDING_RULE" \
    --global \
    --project="$PROJECT_ID" >/dev/null 2>&1; then
    gcloud compute forwarding-rules create "$PROMO_CDN_HTTP_FORWARDING_RULE" \
      --global \
      --address="$PROMO_CDN_IP_NAME" \
      --target-http-proxy="$PROMO_CDN_HTTP_PROXY" \
      --ports=80 \
      --project="$PROJECT_ID"
  fi

  if ! gcloud compute forwarding-rules describe "$PROMO_CDN_HTTPS_FORWARDING_RULE" \
    --global \
    --project="$PROJECT_ID" >/dev/null 2>&1; then
    gcloud compute forwarding-rules create "$PROMO_CDN_HTTPS_FORWARDING_RULE" \
      --global \
      --address="$PROMO_CDN_IP_NAME" \
      --target-https-proxy="$PROMO_CDN_HTTPS_PROXY" \
      --ports=443 \
      --project="$PROJECT_ID"
  fi
}

ensure_cdn_infra() {
  enable_google_cloud_services
  ensure_promo_bucket
  ensure_promo_cdn
}

prepare_api_context() {
  local context="$1"

  rm -rf "$context"
  mkdir -p "$context"

  # 只把 API 和 nuvelle_kit 发给 Cloud Build。上传整个 monorepo 会更慢，也容易
  # 误带本地缓存或 node_modules。
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

  # 静态前端服务共用同一个轻量 Nginx 镜像，构建产物最终会放到
  # Nginx 的 /usr/share/nginx/html 目录。
  cp deploy/Dockerfile.static "$context/deploy/Dockerfile.static"
  cp deploy/nginx-static.conf "$context/deploy/nginx-static.conf"
  cp deploy/cloudbuild-static.yaml "$context/cloudbuild-static.yaml"
  rsync -a --delete "$site_dir/" "$context/$site_dir/"
}

prepare_website_context() {
  local context="$1"

  [[ -f nuvelle_website/.next/BUILD_ID ]] || die "Run pnpm --filter nuvelle_website build first"

  rm -rf "$context"
  mkdir -p "$context/deploy" "$context/nuvelle_website"

  cp package.json pnpm-lock.yaml pnpm-workspace.yaml "$context/"
  cp deploy/Dockerfile.website "$context/deploy/Dockerfile.website"
  cp deploy/cloudbuild-website.yaml "$context/cloudbuild-website.yaml"
  cp nuvelle_website/package.json "$context/nuvelle_website/package.json"
  cp nuvelle_website/next.config.mjs "$context/nuvelle_website/next.config.mjs"
  rsync -aL --delete \
    --exclude=cache/ \
    --exclude=dev/ \
    nuvelle_website/.next "$context/nuvelle_website/"
  rsync -a --delete nuvelle_website/public "$context/nuvelle_website/"
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

  # 用 builds describe 轮询状态，而不直接流式读取日志。部分账号可以启动构建，
  # 但没有默认 Cloud Build 日志桶的读取权限。
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
  local env_vars

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

  if secret_exists "$REELSHORT_CPS_SECRET"; then
    secret_args+=(--set-secrets=REELSHORT_CPS_TOKEN="$REELSHORT_CPS_SECRET":latest)
  elif [[ -n "${REELSHORT_CPS_TOKEN:-}" ]]; then
    upsert_secret_version "$REELSHORT_CPS_SECRET" "$REELSHORT_CPS_TOKEN"
    secret_args+=(--set-secrets=REELSHORT_CPS_TOKEN="$REELSHORT_CPS_SECRET":latest)
  else
    warn "$REELSHORT_CPS_SECRET is missing and REELSHORT_CPS_TOKEN is not set; ReelShort promo generation cannot refresh expired video URLs."
  fi

  env_vars="ENVIRONMENT=production,WEB_CONCURRENCY=2,PROMO_STORAGE_DIR=/workspace/nuvelle_kit/out,PROMO_WORK_DIR=$PROMO_WORK_DIR,PROMO_GCS_BUCKET=$PROMO_GCS_BUCKET,PROMO_GCS_PREFIX=$PROMO_GCS_PREFIX,VIDEO_GCS_BUCKET=$VIDEO_GCS_BUCKET,VIDEO_GCS_PREFIX=$VIDEO_GCS_PREFIX,VIDEO_PUBLIC_BASE_URL=$VIDEO_PUBLIC_BASE_URL,VIDEO_TRANSFER_WORK_DIR=$VIDEO_TRANSFER_WORK_DIR,PROMO_UPLOAD_DIR=/workspace/nuvelle_kit/_uploads,PROMO_CACHE_DIR=/workspace/nuvelle_kit/_vidcache,CORS_ORIGINS=[\"*\"]"

  gcloud run deploy "$API_SERVICE" \
    --project="$PROJECT_ID" \
    --region="$REGION" \
    --image="$image" \
    --allow-unauthenticated \
    --port=8000 \
    --cpu=4 \
    --memory=4Gi \
    --timeout=900 \
    --concurrency=10 \
    --min-instances=1 \
    --max-instances=1 \
    --no-cpu-throttling \
    --add-cloudsql-instances="$PROJECT_ID:$REGION:$SQL_INSTANCE" \
    --set-env-vars="$env_vars" \
    "${secret_args[@]}"

  API_URL="$(service_url "$API_SERVICE")"
  [[ -n "$API_URL" ]] || die "Could not resolve $API_SERVICE URL after deploy."
}

reelshort_import_args() {
  local args="-m,app.tasks.import_reelshort,--limit,$IMPORT_REELSHORT_LIMIT"

  if [[ -n "$IMPORT_REELSHORT_RESOURCE_ID" ]]; then
    args="$args,--resource-id,$IMPORT_REELSHORT_RESOURCE_ID"
  fi

  if [[ "$IMPORT_REELSHORT_DETAIL_ONLY" == "true" ]]; then
    args="$args,--detail-only"
  fi

  if [[ "$IMPORT_REELSHORT_ALL_MATCHING" == "true" ]]; then
    args="$args,--all-matching"
  fi

  if [[ "$IMPORT_REELSHORT_DRY_RUN" == "true" ]]; then
    args="$args,--dry-run"
  fi

  printf '%s' "$args"
}

run_reelshort_import_job() {
  log "Run ReelShort import Cloud Run Job"
  local image="$REGION-docker.pkg.dev/$PROJECT_ID/$REPOSITORY/$API_SERVICE:$TAG"
  local context="$BUILD_DIR/import-reelshort"

  if [[ "${SKIP_BACKEND_BUILD:-false}" == "true" ]]; then
    echo "Skipping $API_SERVICE image build; reusing $image" >&2
  else
    prepare_api_context "$context"
    submit_cloud_build "$context" "$context/cloudbuild-api.yaml" "_IMAGE=$image"
  fi

  gcloud run jobs deploy "$IMPORT_REELSHORT_JOB" \
    --project="$PROJECT_ID" \
    --region="$REGION" \
    --image="$image" \
    --command=python \
    --args="$(reelshort_import_args)" \
    --cpu=1 \
    --memory=1Gi \
    --tasks=1 \
    --max-retries=0 \
    --task-timeout="$IMPORT_REELSHORT_TIMEOUT" \
    --set-cloudsql-instances="$PROJECT_ID:$REGION:$SQL_INSTANCE" \
    --set-env-vars=ENVIRONMENT=production \
    --set-secrets=DATABASE_URL="$DATABASE_URL_SECRET":latest \
    --execute-now \
    --wait
}

reelshort_video_transfer_args() {
  local args="-m,app.tasks.transfer_reelshort_videos,--limit,$TRANSFER_REELSHORT_LIMIT,--language,$TRANSFER_REELSHORT_LANGUAGE,--delay-seconds,$TRANSFER_REELSHORT_DELAY_SECONDS"

  if [[ -n "$TRANSFER_REELSHORT_DRAMA_ID" ]]; then
    args="$args,--drama-id,$TRANSFER_REELSHORT_DRAMA_ID"
  fi

  if [[ -n "$TRANSFER_REELSHORT_START_AFTER_DRAMA_ID" ]]; then
    args="$args,--start-after-drama-id,$TRANSFER_REELSHORT_START_AFTER_DRAMA_ID"
  fi

  if [[ "$TRANSFER_REELSHORT_RETRY_FAILED" == "true" ]]; then
    args="$args,--retry-failed"
  fi

  if [[ "$TRANSFER_REELSHORT_FORCE" == "true" ]]; then
    args="$args,--force"
  fi

  if [[ "$TRANSFER_REELSHORT_DRY_RUN" == "true" ]]; then
    args="$args,--dry-run"
  fi

  printf '%s' "$args"
}

run_reelshort_video_transfer_job() {
  log "Run ReelShort video transfer Cloud Run Job"
  local image="$REGION-docker.pkg.dev/$PROJECT_ID/$REPOSITORY/$API_SERVICE:$TAG"
  local context="$BUILD_DIR/transfer-reelshort-videos"

  if [[ "${SKIP_BACKEND_BUILD:-false}" == "true" ]]; then
    echo "Skipping $API_SERVICE image build; reusing $image" >&2
  else
    prepare_api_context "$context"
    submit_cloud_build "$context" "$context/cloudbuild-api.yaml" "_IMAGE=$image"
  fi

  local secret_args=(--set-secrets=DATABASE_URL="$DATABASE_URL_SECRET":latest)
  if secret_exists "$REELSHORT_CPS_SECRET"; then
    secret_args+=(--set-secrets=REELSHORT_CPS_TOKEN="$REELSHORT_CPS_SECRET":latest)
  elif [[ -n "${REELSHORT_CPS_TOKEN:-}" ]]; then
    upsert_secret_version "$REELSHORT_CPS_SECRET" "$REELSHORT_CPS_TOKEN"
    secret_args+=(--set-secrets=REELSHORT_CPS_TOKEN="$REELSHORT_CPS_SECRET":latest)
  else
    die "$REELSHORT_CPS_SECRET is missing and REELSHORT_CPS_TOKEN is not set; video transfer cannot refresh expired ReelShort URLs."
  fi

  local video_public_base_url="$VIDEO_PUBLIC_BASE_URL"
  if [[ -z "$video_public_base_url" ]]; then
    local resolved_api_url
    resolved_api_url="$(service_url "$API_SERVICE")"
    [[ -n "$resolved_api_url" ]] || die "Cannot build video playback URLs because $API_SERVICE URL is unavailable. Deploy API first or set VIDEO_PUBLIC_BASE_URL."
    video_public_base_url="$resolved_api_url/api/v1/video-assets"
  fi
  local env_vars="ENVIRONMENT=production,VIDEO_GCS_BUCKET=$VIDEO_GCS_BUCKET,VIDEO_GCS_PREFIX=$VIDEO_GCS_PREFIX,VIDEO_PUBLIC_BASE_URL=$video_public_base_url,VIDEO_TRANSFER_WORK_DIR=$VIDEO_TRANSFER_WORK_DIR"

  gcloud run jobs deploy "$TRANSFER_REELSHORT_JOB" \
    --project="$PROJECT_ID" \
    --region="$REGION" \
    --image="$image" \
    --command=python \
    --args="$(reelshort_video_transfer_args)" \
    --cpu=1 \
    --memory=1Gi \
    --tasks=1 \
    --max-retries=0 \
    --task-timeout="$TRANSFER_REELSHORT_TIMEOUT" \
    --set-cloudsql-instances="$PROJECT_ID:$REGION:$SQL_INSTANCE" \
    --set-env-vars="$env_vars" \
    "${secret_args[@]}" \
    --execute-now \
    --wait
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
    resolve_api_url_for_frontend
    VITE_NUVELLE_API_URL="$API_URL/api/v1" pnpm --filter "$package" build
  else
    pnpm --filter "$package" build
  fi
}

build_frontends() {
  log "Build frontends"
  local entry
  local mode
  local service
  local package
  local site_dir

  for entry in "${FRONTEND_APPS[@]}"; do
    IFS=: read -r mode service package site_dir <<<"$entry"
    build_frontend_package "$package"
  done
}

frontend_mode_is() {
  case "$ONLY" in
    website | mobile | web | admin)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

frontend_entry_for_mode() {
  local target="$1"
  local entry
  local mode

  for entry in "${FRONTEND_APPS[@]}"; do
    mode="${entry%%:*}"
    if [[ "$mode" == "$target" ]]; then
      printf '%s\n' "$entry"
      return 0
    fi
  done

  return 1
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

join_by() {
  local IFS="$1"
  shift
  printf '%s' "$*"
}

deploy_website_service() {
  local service="$1"
  local image="$REGION-docker.pkg.dev/$PROJECT_ID/$REPOSITORY/$service:$TAG"
  local context="$BUILD_DIR/website-$service"
  local secret_args=()
  local website_api_url="${NUVELLE_API_URL:-}"
  if [[ -z "$website_api_url" ]]; then
    local resolved_api_url
    resolved_api_url="$(service_url "$API_SERVICE")"
    [[ -n "$resolved_api_url" ]] || die "Cannot deploy website playback pages because $API_SERVICE URL is unavailable. Deploy API first or set NUVELLE_API_URL."
    website_api_url="$resolved_api_url/api/v1"
  fi
  local env_vars=(
    "BLOGGER_API_URL=${BLOGGER_API_URL:-https://blogger-api-5qjldqffdq-uc.a.run.app}"
    "BLOGGER_SITE_SLUG=${BLOGGER_SITE_SLUG:-nuvelle}"
    "BLOGGER_LANGUAGE=${BLOGGER_LANGUAGE:-en}"
    "NUVELLE_API_URL=$website_api_url"
    "NEXT_PUBLIC_SITE_ORIGIN=https://$DOMAIN_ROOT"
    "BLOG_PAGE_SIZE=${BLOG_PAGE_SIZE:-12}"
  )
  local language_env
  local env_arg

  if secret_exists "$BLOGGER_ACCESS_KEY_SECRET"; then
    secret_args+=(--set-secrets=BLOGGER_ACCESS_KEY="$BLOGGER_ACCESS_KEY_SECRET":latest)
  elif [[ -n "${BLOGGER_ACCESS_KEY:-}" ]]; then
    upsert_secret_version "$BLOGGER_ACCESS_KEY_SECRET" "$BLOGGER_ACCESS_KEY"
    secret_args+=(--set-secrets=BLOGGER_ACCESS_KEY="$BLOGGER_ACCESS_KEY_SECRET":latest)
  else
    die "$BLOGGER_ACCESS_KEY_SECRET is missing and BLOGGER_ACCESS_KEY is not set; website blog cannot fetch Blogger content."
  fi

  for language_env in \
    BLOGGER_LANGUAGE_EN \
    BLOGGER_LANGUAGE_CN \
    BLOGGER_LANGUAGE_JP \
    BLOGGER_LANGUAGE_DE \
    BLOGGER_LANGUAGE_FR \
    BLOGGER_LANGUAGE_ES \
    BLOGGER_LANGUAGE_PT; do
    if [[ -n "${!language_env:-}" ]]; then
      env_vars+=("$language_env=${!language_env}")
    fi
  done

  env_arg="^~^$(join_by '~' "${env_vars[@]}")"

  prepare_website_context "$context"
  submit_cloud_build "$context" "$context/cloudbuild-website.yaml" "_IMAGE=$image"

  gcloud run deploy "$service" \
    --project="$PROJECT_ID" \
    --region="$REGION" \
    --image="$image" \
    --allow-unauthenticated \
    --port=8080 \
    --cpu=1 \
    --memory=512Mi \
    --min-instances=0 \
    --max-instances=4 \
    "${secret_args[@]}" \
    --set-env-vars="$env_arg"
}

deploy_static_services() {
  log "Deploy frontend services"
  local entry
  local mode
  local service
  local package
  local site_dir

  for entry in "${FRONTEND_APPS[@]}"; do
    IFS=: read -r mode service package site_dir <<<"$entry"
    if [[ "$mode" == "website" ]]; then
      deploy_website_service "$service"
    else
      deploy_static_service "$service" "$site_dir"
    fi
  done
}

deploy_frontend_app() {
  local mode="$1"
  local entry
  local service
  local package
  local site_dir

  entry="$(frontend_entry_for_mode "$mode")" || die "Unknown frontend mode: $mode"
  IFS=: read -r mode service package site_dir <<<"$entry"

  log "Build and deploy frontend: $mode"
  build_frontend_package "$package"
  if [[ "$mode" == "website" ]]; then
    deploy_website_service "$service"
  else
    deploy_static_service "$service" "$site_dir"
  fi
}

http_check() {
  local url="$1"
  local label="$2"
  local code

  code="$(curl -sS -o /dev/null -w '%{http_code}' "$url" || true)"
  [[ "$code" == "200" ]] || die "$label returned HTTP $code for $url"
  echo "$label OK $url"
}

verify_cloud_run_service() {
  local service="$1"
  local url

  url="$(service_url "$service")"
  [[ -n "$url" ]] || die "$service is missing."
  http_check "$url" "$service"
}

verify_deploy() {
  log "Verify deploy"
  local api_url
  local service

  api_url="$(service_url "$API_SERVICE")"
  [[ -n "$api_url" ]] || die "$API_SERVICE is missing."

  http_check "$api_url/api/v1/health/ready" "$API_SERVICE ready"

  for service in "$WEBSITE_SERVICE" "$MOBILE_SERVICE" "$WEB_SERVICE" "$ADMIN_SERVICE"; do
    verify_cloud_run_service "$service"
  done
}

verify_frontend_app() {
  local target="$1"
  local entry
  local mode
  local service
  local package
  local site_dir

  log "Verify frontend: $target"
  entry="$(frontend_entry_for_mode "$target")" || die "Unknown frontend mode: $target"
  IFS=: read -r mode service package site_dir <<<"$entry"
  verify_cloud_run_service "$service"
}

normalize_cloudflare_token() {
  if [[ -z "${CF_API_TOKEN:-}" && -n "${CLOUDFLARE_API_TOKEN:-}" ]]; then
    export CF_API_TOKEN="$CLOUDFLARE_API_TOKEN"
  fi
}

require_cloudflare_dns_cli() {
  require_cmd flarectl
  normalize_cloudflare_token
  [[ -n "${CF_API_TOKEN:-}" ]] || die "CF_API_TOKEN or CLOUDFLARE_API_TOKEN is required for Cloudflare DNS updates."
  flarectl --json zone info --zone "$DOMAIN_ROOT" >/dev/null
}

cloudflare_upsert_dns() {
  local type="$1"
  local name="$2"
  local content="$3"
  local ttl="${4:-1}"
  local proxied="${5:-false}"
  local args

  args=(
    dns create-or-update
    --zone "$DOMAIN_ROOT"
    --type "$type"
    --name "$name"
    --content "$content"
    --ttl "$ttl"
  )
  if [[ "$proxied" == "true" ]]; then
    args+=(--proxy)
  fi

  flarectl "${args[@]}" >/dev/null
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
  local domain="$1"
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
    cloudflare_upsert_dns "$type" "$name" "$content" 1 false
  done
}

sync_cdn_dns_record() {
  local ip

  ip="$(cdn_ip_address)"
  [[ -n "$ip" ]] || die "Could not resolve CDN load balancer IP."
  cloudflare_upsert_dns A "$CDN_DOMAIN" "$ip" 1 false
  echo "Promo CDN DNS synced: $CDN_DOMAIN -> $ip"
}

setup_cdn() {
  log "Setup promo CDN"
  require_cloudflare_dns_cli
  ensure_cdn_infra
  sync_cdn_dns_record
}

setup_domain() {
  log "Setup custom domain"
  require_cmd curl
  require_cmd gcloud
  require_cloudflare_dns_cli

  local entry
  local domain
  local service

  # Cloud Run 创建域名映射前，需要先完成 Google 站点所有权验证。
  # 验证 TXT 记录必须保持 DNS only，不能开启 Cloudflare 代理。
  cloudflare_upsert_dns TXT "$DOMAIN_ROOT" "$GOOGLE_SITE_VERIFICATION_TXT" 1 false
  verify_google_domain

  for entry in "${DOMAIN_MAPPINGS[@]}"; do
    domain="${entry%%:*}"
    service="${entry#*:}"
    create_domain_mapping "$domain" "$service"
    sync_domain_dns_record "$domain"
  done
  ensure_cdn_infra
  sync_cdn_dns_record

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

  if run_mode_is cdn; then
    setup_cdn
    print_summary
    return
  fi

  if run_mode_is import-reelshort; then
    ensure_infra
    run_reelshort_import_job
    print_summary
    return
  fi

  if run_mode_is transfer-reelshort-videos; then
    ensure_infra
    run_reelshort_video_transfer_job
    print_summary
    return
  fi

  if run_mode_in all api; then
    ensure_infra
    deploy_api
  fi

  if run_mode_in frontend static || frontend_mode_is; then
    ensure_container_infra
  fi

  if frontend_mode_is; then
    deploy_frontend_app "$ONLY"
    verify_frontend_app "$ONLY"
    print_summary
    return
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
