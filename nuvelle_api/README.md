# Nuvelle API

FastAPI backend scaffold for Nuvelle's business API. It is intentionally separate from `nuvelle_kit`, which still owns promo rendering.

## Project Layout

```text
app/
  api/             FastAPI routers and dependencies
  core/            settings, logging, cross-cutting config
  db/              SQLAlchemy engine, session, declarative base
  integrations/    clients for external/internal services
  models/          SQLAlchemy ORM models
  repositories/    persistence adapters
  schemas/         Pydantic request/response schemas
  services/        business logic
migrations/        Alembic migrations
tests/             pytest tests
```

## Local Virtual Environment

Use Python 3.11 for parity with the Docker image.

```bash
cd nuvelle_api
make install
cp .env.example .env
make db-up
make migrate
make dev
```

Equivalent manual commands:

```bash
cd nuvelle_api
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

## Local Docker

From the repo root:

```bash
cp .env.example .env
docker compose up --build api postgres
```

The `api` service runs `alembic upgrade head` before starting Uvicorn, so the local database is initialized automatically.

Health check:

```bash
curl http://localhost:8000/api/v1/health/live
curl http://localhost:8000/api/v1/health/ready
```

PostgreSQL is available to local tools at:

```text
postgresql://nuvelle:nuvelle_dev_password@localhost:5432/nuvelle
```

Inside Docker, the API uses:

```text
postgresql+psycopg://nuvelle:nuvelle_dev_password@postgres:5432/nuvelle
```

## Migrations

```bash
cd nuvelle_api
cp .env.example .env
make revision m="create initial tables"
make migrate
```

## Quality Commands

```bash
cd nuvelle_api
make test
make lint
make typecheck
```
