# Nuvelle Crawler

Standalone crawler service for third-party short-drama source data.

Default automated tests use fakes and fixtures only. Do not add tests that call
third-party platforms by default; live checks should be explicit manual commands.

## Local checks

From the repository root:

```bash
nuvelle_api/.venv/bin/pytest tests/test_nuvelle_crawler.py -q
PYTHONPATH=nuvelle_crawler nuvelle_api/.venv/bin/python -m nuvelle_crawler.cli plan-incremental --source reelshort_cps --pages 1 --language en --sort time
```

The CLI command only plans local in-memory tasks. It does not call ReelShort CPS.

By default, the crawler uses the same local Postgres database as `nuvelle_api`:
`postgresql+psycopg://nuvelle:nuvelle_dev_password@localhost:5432/nuvelle`.
Override `DATABASE_URL` only when you intentionally want a different database.

## Manual ReelShort Backfill

Run a one-page smoke crawl before any broader run:

```bash
PYTHONPATH=nuvelle_crawler \
REELSHORT_CPS_TOKEN="$REELSHORT_CPS_TOKEN" \
nuvelle_api/.venv/bin/python -m nuvelle_crawler.cli backfill \
  --source reelshort_cps \
  --language en \
  --sort time \
  --max-pages 1 \
  --delay-seconds 3 \
  --create-tables \
  --confirm-live
```

Full source-cache backfill, after the smoke run is clean:

```bash
PYTHONPATH=nuvelle_crawler \
REELSHORT_CPS_TOKEN="$REELSHORT_CPS_TOKEN" \
nuvelle_api/.venv/bin/python -m nuvelle_crawler.cli backfill \
  --source reelshort_cps \
  --all-languages \
  --sort time \
  --no-page-limit \
  --delay-seconds 5 \
  --with-details \
  --create-tables \
  --confirm-live
```

`backfill` sends live source requests only when `--confirm-live` is present.
`--with-details` roughly doubles the request volume, so keep the delay conservative.
Progress logs are printed while the command runs. List-page and detail request
failures are retried twice by default. List failures that still fail are written
to `third_party_crawl_logs.metadata.failed_list_pages`; detail failures that
still fail are written to `third_party_crawl_logs.metadata.failed_details` so
they can be compensated by a later rerun. Add `--list-retries N` or
`--detail-retries N` to tune retry count. Add `--fail-fast-detail-errors` when
you want the command to stop on the first detail failure. Source protection
signals such as HTTP 401, 403, 429, and 503 stop the run immediately and are
recorded in the crawl log.

Compensate failures recorded by a backfill crawl log:

```bash
PYTHONPATH=nuvelle_crawler \
REELSHORT_CPS_TOKEN="$REELSHORT_CPS_TOKEN" \
nuvelle_api/.venv/bin/python -m nuvelle_crawler.cli compensate-failures \
  --source reelshort_cps \
  --crawl-log-id 8 \
  --delay-seconds 0.2 \
  --confirm-live
```

Omit `--crawl-log-id` only when you intentionally want to retry failures from
all historical local backfill logs for that source.

## Manual DramaCPS Materials Backfill

DramaCPS materials come from the dashboard Material Library. The crawler stores
each drama/material row and saves free episode video URLs under `raw_data.section`.

Smoke crawl:

```bash
PYTHONPATH=nuvelle_crawler \
nuvelle_api/.venv/bin/python -m nuvelle_crawler.cli backfill \
  --source dramacps_materials \
  --max-pages 1 \
  --delay-seconds 1 \
  --with-details \
  --confirm-live
```

Full materials crawl:

```bash
PYTHONPATH=nuvelle_crawler \
nuvelle_api/.venv/bin/python -m nuvelle_crawler.cli backfill \
  --source dramacps_materials \
  --no-page-limit \
  --delay-seconds 1 \
  --with-details \
  --confirm-live
```

Resume from a later page after an interrupted run:

```bash
PYTHONPATH=nuvelle_crawler \
nuvelle_api/.venv/bin/python -m nuvelle_crawler.cli backfill \
  --source dramacps_materials \
  --start-page 139 \
  --no-page-limit \
  --delay-seconds 1 \
  --with-details \
  --confirm-live
```
