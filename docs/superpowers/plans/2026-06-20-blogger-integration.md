# Blogger Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reconnect the Nuvelle public website blog to the shared Blogger integration API.

**Architecture:** Keep the existing Next.js blog routes and UI as the website-owned presentation layer. Replace only the blog config/API adapter so it calls Blogger `/api/integration/*` endpoints with AccessKey auth and maps Blogger post fields into the current frontend article types.

**Tech Stack:** Next.js App Router, TypeScript, Vitest, Blogger integration API.

---

### Task 1: Blogger Config And Adapter

**Files:**
- Modify: `nuvelle_website/src/lib/blog/config.ts`
- Modify: `nuvelle_website/src/lib/blog/api.ts`
- Modify: `nuvelle_website/src/lib/blog/types.ts`
- Test: `nuvelle_website/src/__tests__/blog-config.test.ts`
- Test: `nuvelle_website/src/__tests__/blog-api.test.ts`

- [ ] Write failing tests for `BLOGGER_API_URL`, `BLOGGER_ACCESS_KEY`, `BLOGGER_SITE_SLUG`, AccessKey headers, list/category/detail URLs, and Blogger field mapping.
- [ ] Run the focused tests and confirm they fail against the old SLX adapter.
- [ ] Implement the minimal Blogger config and adapter code.
- [ ] Run the focused tests and confirm they pass.

### Task 2: Deployment And Local Env Wiring

**Files:**
- Modify: `.env.example`
- Modify: `.env` without committing it
- Modify: `deploy/README-google-cloud.md`
- Modify: `deploy/google-cloud.sh`

- [ ] Update public docs to describe Blogger runtime variables without including secrets.
- [ ] Update Cloud Run website env injection to use Blogger variables.
- [ ] Write the provided runtime values to local `.env` if the file is ignored.
- [ ] Verify the git diff contains no AccessKey.

### Task 3: Verification

**Files:**
- No additional files.

- [ ] Run `pnpm --filter nuvelle_website test --run`.
- [ ] Run `pnpm --filter nuvelle_website typecheck`.
- [ ] Inspect `git diff --check`.
