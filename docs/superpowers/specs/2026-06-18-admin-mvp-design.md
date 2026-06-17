# Nuvelle Admin MVP Design

## Goal

Build the first complete Nuvelle Admin MVP for promotion staff to select short dramas, avoid seeing already-swiped material, generate promo videos from selected episodes, and manage generated assets through real user accounts.

## Confirmed Decisions

- Scope: full Admin MVP, not only one isolated loop.
- Architecture: extend the existing `nuvelle_api` FastAPI backend and `nuvelle_admin` React frontend.
- Auth: invite-code registration plus email/password login.
- Swipe history: record both drama-level and episode-level behavior; Swipe defaults to drama-level de-duplication.
- ReelShort import: automatically convert ReelShort third-party resources into internal drama records.
- Board search: first version supports title, synopsis, platform, language, tags, and whether usable video exists.
- Generated library: persist and query generated resources from the backend database.
- Promo generation: Board and Swipe open a generation dialog where users choose episode, duration, and optional prompt.

## Existing Context

The repository already has the major pieces this MVP should build on:

- `nuvelle_admin`: Vite/React admin app with Board, Swipe, Generated Library, and local login placeholders.
- `nuvelle_api`: FastAPI backend with `dramas`, `votes`, and `promo_jobs` tables.
- `nuvelle_crawler`: crawler service writing third-party resources.
- `third_party_drama_resources`: raw third-party drama cache with `raw_data`, import status, crawl timestamps, and a link slot to internal dramas.
- Existing promo generation endpoints and service code under `nuvelle_api/app/api/v1/routes/promo.py` and `nuvelle_api/app/services/promo_service.py`.

The current admin data path should change from `nuvelle_admin/public/seed_dramas.json` to backend API data.

## Architecture

Use the current FastAPI and React architecture. Do not introduce Supabase, Auth0, or a separate admin backend.

Data flow:

1. `nuvelle_crawler` stores ReelShort crawl results in `third_party_drama_resources.raw_data`.
2. A ReelShort import service in `nuvelle_api` converts eligible resources into internal `dramas` and `drama_episodes`.
3. `nuvelle_admin` calls authenticated `/api/v1/admin/*` endpoints for Board, Swipe, events, and generated assets.
4. Promo generation continues through existing `/api/v1/promo/jobs`, extended with user, drama, episode, and prompt context.
5. Generated Library reads from backend `promo_jobs`, filtered by the logged-in user by default.

First version non-goals:

- Rewriting the crawler.
- Introducing a third-party auth provider.
- Building complex recommendation ranking.
- Building advanced operator filters beyond the agreed Board basics.
- Migrating the public website to this data model.

## Data Model

### `admin_users`

Stores admin users and promotion staff.

Fields:

- `id`
- `email`, unique and normalized to lowercase
- `password_hash`
- `role`, first version values: `admin`, `promoter`
- `status`, first version values: `active`, `disabled`
- `last_login_at`
- `created_at`
- `updated_at`

### `admin_invites`

Stores invite codes for registration. Invite code values must not be stored in plain text.

Fields:

- `id`
- `code_hash`
- `role`, the role assigned to users created with this invite
- `max_uses`
- `used_count`
- `expires_at`
- `created_by_user_id`
- `created_at`
- `updated_at`

Registration rejects expired invites and invites whose `used_count >= max_uses`.

### `dramas`

Extend the existing internal drama table so it can represent ReelShort resources directly.

Existing fields remain in place:

- `id`
- `title`
- `platform`
- `genre`
- `cover_image_url`
- `video_url`
- `source_url`
- `episode_count`
- `synopsis_or_hook`
- `signal`
- `rs_book_id`
- `created_at`
- `updated_at`

Add fields:

- `source_resource_id`: references `third_party_drama_resources.id`
- `language`: ReelShort `lang`
- `tags`: ReelShort `tag`
- `show_tags`: ReelShort `show_tag`
- `book_type`: ReelShort `book_type`
- `is_valid`: ReelShort `is_valid`
- `pay_start`: ReelShort `pay_start`
- `recent_revenue`: ReelShort `recent_revenue`
- `promoters_cnt`: ReelShort `promoters_cnt`
- `promotion_code`: ReelShort `promotion_code`
- `app_promotion_link`: ReelShort `app_promotion_link`
- `book_promotion_link`: ReelShort `book_promotion_link`
- `platform_publish_at`: ReelShort `publish_at`, converted from Unix timestamp to datetime
- `source_first_seen_at`: first crawler observation time
- `source_last_seen_at`: latest crawler observation time
- `source_last_changed_at`: latest crawler content-change time

Time field meanings:

- `platform_publish_at`: third-party platform business time, used for "new on platform" sorting and display.
- `source_first_seen_at`, `source_last_seen_at`, `source_last_changed_at`: crawler observation times, used for import and freshness diagnostics.
- `created_at`, `updated_at`: internal record lifecycle times.

### `drama_episodes`

Stores episode-level video sources.

Fields:

- `id`
- `drama_id`
- `episode_no`
- `chapter_id`
- `t_chapter_id`
- `play_url`
- `poster_url`
- `iframe_src`
- `content`
- `source_payload_hash`
- `created_at`
- `updated_at`

Uniqueness:

- Prefer unique `drama_id + episode_no`.
- Preserve `chapter_id` for traceability and future URL refresh.

`play_url` can be a signed temporary URL, so import must update it on subsequent crawls.

### `user_drama_events`

Stores per-user selection behavior.

Fields:

- `id`
- `user_id`
- `drama_id`
- `episode_id`, nullable
- `event_type`, first version values: `seen`, `vote`, `generate`
- `verdict`, nullable, values matching existing votes: `pass`, `ok`, `fire`
- `score`, nullable
- `metadata`, JSON
- `created_at`

Swipe de-duplication:

- The queue excludes dramas where the current user already has a `seen`, `vote`, or `generate` event for that `drama_id`.
- Episode-level events remain available for future analysis and generated-asset history.

### `votes`

The existing `votes` table remains for compatibility with current code. New Admin MVP voting is recorded in `user_drama_events` with `event_type = "vote"`, `user_id`, `drama_id`, optional `episode_id`, `verdict`, and `score`. The implementation can keep existing `/votes` behavior as a legacy alias, but Board and Swipe must use the authenticated event API as the source of truth.

### `promo_jobs`

Extend existing promo jobs so Generated Library can be database-backed.

Add fields:

- `user_id`
- `drama_id`
- `episode_id`
- `prompt`

Existing fields such as `status`, `title`, `episode`, `duration`, `source_url`, `teaser_url`, `cover_url`, `caption`, `error`, `output_dir`, and `batch_id` remain the source of truth for generated assets.

Do not create a separate `generated_assets` table in the first version. Generated Library should query `promo_jobs`.

## ReelShort Mapping

Given a ReelShort raw JSON object:

- `id` -> `dramas.rs_book_id`
- `pic` -> `dramas.cover_image_url`
- `title` -> `dramas.title`
- `lang` -> `dramas.language`
- `desc` -> `dramas.synopsis_or_hook`
- `tag` -> `dramas.tags`
- `show_tag` -> `dramas.show_tags`
- `chapter_count` -> `dramas.episode_count`
- `publish_at` -> `dramas.platform_publish_at`
- `pay_start` -> `dramas.pay_start`
- `book_type` -> `dramas.book_type`
- `is_valid` -> `dramas.is_valid`
- `recent_revenue` -> `dramas.recent_revenue`
- `promoters_cnt` -> `dramas.promoters_cnt`
- `promotion_code` -> `dramas.promotion_code`
- `app_promotion_link` -> `dramas.app_promotion_link`
- `book_promotion_link` -> `dramas.book_promotion_link`
- `chapters[].chapter_id` -> `drama_episodes.chapter_id`
- `chapters[].t_chapter_id` -> `drama_episodes.t_chapter_id` and `episode_no`
- `chapters[].play_url` -> `drama_episodes.play_url`
- `chapters[].video_pic` -> `drama_episodes.poster_url`
- `chapters[].iframe_src` -> `drama_episodes.iframe_src`
- `chapters[].content` -> `drama_episodes.content`

## API Design

All admin APIs require a logged-in user unless explicitly noted.

### Auth

`POST /api/v1/auth/register`

- Input: `email`, `password`, `invite_code`
- Behavior: validate invite, create user, increment invite usage, return token and user.

`POST /api/v1/auth/login`

- Input: `email`, `password`
- Behavior: validate credentials, update `last_login_at`, return token and user.

`GET /api/v1/auth/me`

- Behavior: return current user.

`POST /api/v1/auth/logout`

- Behavior: first version may be token-clearing on the frontend; keeping the endpoint is acceptable for UI consistency.

### Import

`POST /api/v1/admin/imports/reelshort/sync`

- Admin-only.
- Query/body options: `limit`, `resource_id`, `dry_run`.
- Behavior: convert eligible ReelShort resources from `third_party_drama_resources` into `dramas` and `drama_episodes`.
- Response: counts for imported, updated, skipped, and failed resources.

### Board

`GET /api/v1/admin/dramas`

Query params:

- `q`
- `platform`
- `language`
- `tag`
- `has_video`
- `limit`
- `offset`

Response includes:

- core drama fields
- ReelShort metric fields
- `platform_publish_at`
- `has_video`
- `episode_count`
- current user's `seen` flag
- current user's generated count or generated flag

`GET /api/v1/admin/dramas/{drama_id}`

- Returns drama detail plus `episodes`.

### Swipe

`GET /api/v1/admin/swipe/next`

- Returns the next drama with usable video that the current user has not already handled.
- The first version can order by recent platform publish time, recent crawler discovery time, then id.

`POST /api/v1/admin/drama-events`

- Input: `drama_id`, optional `episode_id`, `event_type`, optional `verdict`, optional `score`, optional `metadata`.
- Records `seen`, `vote`, or `generate` events.

### Promo

Extend `POST /api/v1/promo/jobs`.

Additional input fields:

- `drama_id`
- `episode_id`
- `prompt`

Backend behavior:

- Gets `user_id` from the authenticated request.
- Writes `user_id`, `drama_id`, `episode_id`, and `prompt` to `promo_jobs`.
- Records a `user_drama_events` row with `event_type = "generate"`.

### Generated Library

`GET /api/v1/admin/generated`

Query params:

- `status`
- `q`
- `limit`
- `offset`

Default behavior:

- Returns current user's generated jobs.
- Admin users may later get an `owner_user_id` filter, but that is not required for the first version.

`GET /api/v1/admin/generated/{job_id}`

- Returns one generated job if it belongs to the current user or the current user is admin.

## Frontend Design

### Login and Registration

Replace the hardcoded `admin/admin` gate.

Screens:

- Login: email and password.
- Register: invite code, email, password.

Frontend state:

- Store auth token and user profile locally.
- Clear token on sign out.
- Do not store votes, swipe history, or generated assets as source-of-truth local state.

### Board

Board remains the main searchable material library.

Filters:

- Search title and synopsis.
- Platform.
- Language.
- Tag.
- Has usable video.

Card display:

- Cover.
- Title.
- Platform and language.
- Tags.
- Episode count.
- `platform_publish_at`.
- `recent_revenue`.
- `promoters_cnt`.
- User state badges such as seen or generated.

Actions:

- Open detail.
- Vote or mark.
- Open generation dialog.

Detail dialog:

- Synopsis.
- Promotion links.
- Business metrics.
- Time fields with clear labels for platform publish time and crawler seen time.
- Episodes list.

### Swipe

Swipe is optimized for fast selection.

Behavior:

- Load the next unhandled drama from the backend.
- Show video preview using the first playable episode when available.
- Show poster and no-video state when no playable URL exists.
- Pass, OK, and Fire record a user event and advance to the next drama.
- Generate opens the generation dialog.

Default queue:

- Return only dramas with at least one playable episode for the first version.

### Generation Dialog

Opened from Board or Swipe.

Fields:

- Episode selector.
- Duration selector: 8, 13, 20, 30, 45, 60 seconds.
- Optional prompt.
- Poster and play URL preview.

Submit behavior:

- Creates a promo job.
- Shows a success or error status.
- Generated Library can immediately show queued jobs.

### Generated Library

Database-backed view over `promo_jobs`.

Display:

- Drama title.
- Episode number.
- Prompt.
- Status: `queued`, `downloading`, `rendering`, `done`, `error`.
- Teaser, cover, caption, and download links for completed jobs.
- Error message for failed jobs.

Filters:

- Status.
- Search by drama title or prompt.

## Error Handling

### Import

- Only ReelShort resources are converted in the first version.
- Duplicate `rs_book_id` updates the existing drama.
- Duplicate episodes update the existing episode.
- Missing optional fields do not block import.
- Missing chapters imports the drama with `has_video = false`.
- Import failure marks the source resource as failed and records an error summary.

### Temporary Video URLs

ReelShort `play_url` values may expire. The import service must allow later crawls to overwrite episode URLs. If promo generation fails because the URL expired, the job is marked `error` and remains visible in Generated Library.

### Board and Swipe

- Empty search results show a normal empty state.
- Backend errors show retry states without clearing the current page shell.
- Swipe de-duplication is backend-enforced.
- If duplicate events are submitted from multiple tabs, the frontend can request the next item after the backend accepts or ignores the duplicate.

### Promo Jobs

- A job cannot be marked `done` unless generated file URLs are available.
- Failed jobs keep their error text.
- Generated assets are not deleted on frontend refresh.

### Auth

- Passwords are hashed with a password hashing library such as `passlib`/bcrypt.
- Invite code values are hashed at rest.
- Disabled users cannot log in.
- Promoter users cannot trigger import sync.

## Testing

### Backend

Auth tests:

- Valid invite registration succeeds.
- Expired invite registration fails.
- Exhausted invite registration fails.
- Wrong password login fails.
- `/auth/me` returns the current user.

Import tests:

- The provided ReelShort JSON converts into one drama and matching episodes.
- Re-importing the same `rs_book_id` updates existing records.
- `publish_at` maps to `platform_publish_at`.
- Chapter `play_url`, `video_pic`, and `iframe_src` map to episodes.

Board tests:

- `q` searches title and synopsis.
- `platform`, `language`, `tag`, and `has_video` filters work.
- Response includes platform publish time, business metrics, seen flag, and generated flag.

Swipe tests:

- A handled drama is not returned again for the same user.
- Different users have independent queues.
- Episode-level events are recorded while queue de-duplication remains drama-level.

Promo and Generated tests:

- Creating a promo job stores `user_id`, `drama_id`, `episode_id`, and `prompt`.
- Failed jobs appear in generated results with error text.
- Done jobs appear with teaser, cover, and caption fields.

### Frontend

Auth tests:

- Register with invite code, email, and password.
- Login loads Board.
- Sign out returns to login.

Board tests:

- Board loads from API.
- Search and filters update visible cards.
- Generate opens an episode-selection dialog.

Swipe tests:

- Swipe loads the next unhandled drama.
- Pass, OK, and Fire submit events and advance.
- Generate submits the selected episode, duration, and prompt.

Generated tests:

- Generated Library loads from API.
- Queued, rendering, done, and error states render clearly.
- Completed jobs expose download links.

## Acceptance Criteria

- Users cannot use the old `admin/admin` login.
- A user can register only with a valid invite code.
- Board and Swipe read their primary data from the backend database, not `seed_dramas.json`.
- ReelShort resources are automatically converted to internal dramas and episodes.
- The provided ReelShort JSON shape is supported.
- `platform_publish_at` preserves the third-party platform publish time.
- The same user's handled dramas do not reappear in Swipe.
- Episode-level behavior remains recorded.
- Promo jobs are tied to user, drama, episode, duration, and prompt.
- Generated Library is persisted in the backend and survives page refresh.
- Existing promo generation behavior remains available.
- Backend tests for auth, import, Board, Swipe, and promo pass.
- Frontend tests for auth, Board, Swipe, and Generated Library pass.
- Verification commands include `pytest` for `nuvelle_api`, `pnpm --filter nuvelle_admin test --run`, and `pnpm --filter nuvelle_admin typecheck`.
