# Third-Party Drama Crawler Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone `nuvelle_crawler` Python package that syncs third-party short-drama resource data into lightweight PostgreSQL cache tables using Google Cloud Tasks.

**Architecture:** The crawler is separate from `nuvelle_api`. Source adapters fetch and map external platform data, services plan and execute Cloud Tasks, and repositories write minimal current-state rows plus crawl logs.

**Tech Stack:** FastAPI, HTTPX, Pydantic Settings, SQLAlchemy, Alembic migration, Google Cloud Tasks.

---

### Task 1: Package Skeleton And Models

**Files:**
- Create: `nuvelle_crawler/pyproject.toml`
- Create: `nuvelle_crawler/requirements.txt`
- Create: `nuvelle_crawler/Dockerfile`
- Create: `nuvelle_crawler/nuvelle_crawler/**`
- Create: `nuvelle_api/migrations/versions/0003_third_party_drama_resources.py`
- Test: `tests/test_nuvelle_crawler.py`

- [ ] Write failing tests for source mapping, repository upsert, and planner payload generation.
- [ ] Run `pytest tests/test_nuvelle_crawler.py -q` and confirm imports fail before implementation.
- [ ] Implement minimal crawler package, SQLAlchemy models, repository, source config, mapper, planner, and fake-friendly task enqueuer interface.
- [ ] Add Alembic migration for `third_party_drama_resources` and `third_party_crawl_logs`.
- [ ] Re-run `pytest tests/test_nuvelle_crawler.py -q`.

### Task 2: ReelShort CPS Adapter

**Files:**
- Create: `nuvelle_crawler/nuvelle_crawler/sources/reelshort_cps/client.py`
- Create: `nuvelle_crawler/nuvelle_crawler/sources/reelshort_cps/adapter.py`

- [ ] Add HTTPX client with bearer token, timeout, and list/detail methods.
- [ ] Keep external platform calls behind adapter methods; tests use fake adapters only.
- [ ] Add CLI commands for local mock-safe plan/list/detail execution.

### Task 3: Cloud Run Entrypoints

**Files:**
- Create: `nuvelle_crawler/nuvelle_crawler/main.py`
- Create: `nuvelle_crawler/nuvelle_crawler/routes/internal.py`

- [ ] Expose planner endpoints for incremental/full planning.
- [ ] Expose worker endpoints for list-page and detail tasks.
- [ ] Route handlers call services and return small JSON summaries.

