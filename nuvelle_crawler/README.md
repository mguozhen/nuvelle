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

## Manual ReelShort Backfill

Run a one-page smoke crawl before any broader run:

```bash
DATABASE_URL=sqlite+pysqlite:///./nuvelle_crawler.db \
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
DATABASE_URL=sqlite+pysqlite:///./nuvelle_crawler.db \
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
Progress logs are printed while the command runs. Detail request failures are
counted and skipped by default so one bad content item does not stop the whole
backfill. Add `--fail-fast-detail-errors` when you want the command to stop on
the first detail failure.
