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
