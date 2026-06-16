# Third-Party Drama Crawler Design

## Scope

Build a standalone crawler package for third-party short-drama source data. The first source is ReelShort CPS. The crawler stores third-party content as a lightweight source cache, not as Nuvelle's business drama model.

The crawler does not collect earnings, orders, wallet, withdrawal, payment, sub-account, or safelist data.

## Architecture

`nuvelle_crawler` is a separate Python package and Cloud Run service. It owns third-party API calls, source adapters, Cloud Tasks planning, and writes to shared PostgreSQL tables.

`nuvelle_api` remains the business API. It can read crawler tables later for admin review and import workflows, but it does not call third-party platforms.

## Storage

Use two tables:

- `third_party_drama_resources`: latest source cache row per external short drama.
- `third_party_crawl_logs`: lightweight run and task execution logs.

Only fields needed for search, dedupe, import, and update checks are first-class columns. Noncritical source fields stay in `raw_data`.

## Scheduling

Use Google Cloud native task management:

- Cloud Scheduler calls planner endpoints.
- Planner enqueues Cloud Tasks.
- Cloud Tasks calls crawler worker endpoints.
- Workers upsert rows and insert crawl logs.

There is no task queue table in PostgreSQL.

## Safety

Default tests must not call target platform APIs. ReelShort smoke tests are manual only. HTTP clients use explicit timeout, conservative rate settings, and source credentials from environment or Secret Manager.

