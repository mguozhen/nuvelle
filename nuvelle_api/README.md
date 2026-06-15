# Nuvelle API

FastAPI backend scaffold for the future Nuvelle business API.

## Local Docker

From the repo root:

```bash
cp .env.example .env
docker compose up --build api postgres
```

Health check:

```bash
curl http://localhost:8000/health
```

PostgreSQL is available to local tools at:

```text
postgresql://nuvelle:nuvelle_dev_password@localhost:5432/nuvelle
```

Inside Docker, the API uses:

```text
postgresql+psycopg://nuvelle:nuvelle_dev_password@postgres:5432/nuvelle
```
