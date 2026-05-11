---
name: laptop-poll-queue
description: Polls the Shinel Cockpit task queue every 5 minutes and executes pending laptop-side tasks (IG follower fetch, RESEO sweeps, Higgsfield generation, milestone story creation, scheduled stream SEO audits, etc). Authenticates with X-Laptop-Token. Self-contained — no source code sync needed.
---

# laptop-poll-queue

You are running on the **always-on laptop** as a scheduled Cowork task. Your job is to keep the agency platform's automations moving even when the founder's main laptop is off.

## Setup (one-time)

**Set these env vars** at the start of every run:

```
SHINEL_WORKER_URL = https://shinel-auth.shinelstudioofficial.workers.dev
SHINEL_LAPTOP_ID = shinel-mainframe
SHINEL_LAPTOP_TOKEN = <the LAPTOP_API_TOKEN secret value>
```

**Auth:** every request to `/admin/agency/laptop/*` must include header:
```
X-Laptop-Token: {SHINEL_LAPTOP_TOKEN}
```

**Schedule:** `/schedule create laptop-poll-queue cron='*/5 * * * *'`

## Each run (high-level loop)

1. **Claim** up to 3 pending tasks
2. **Fetch context** (clients + handles + competitors + scheduled streams + spikes) — single call, cache for the rest of the run
3. **Execute** each claimed task using the handler below
4. **Patch** each task with `done` + result, or `failed` + error
5. **Log** a single-line summary
6. **Exit** — next cron tick handles new work

## Step 1 — Claim

POST `{WORKER}/admin/agency/laptop/claim` with body:
```json
{
  "laptop_id": "{LAPTOP_ID}",
  "version": "1.1",
  "count": 3,
  "types": [
    "ig_followers_fetch",
    "ig_recent_posts_fetch",
    "yt_stream_seo_check",
    "yt_video_reseo",
    "milestone_check",
    "milestone_story_create",
    "homepage_stats_refresh"
  ]
}
```

Response: `{ claimed_count: N, tasks: [...] }`. Each task: `{ id, type, client_id, payload_json, attempts }`.

If `claimed_count === 0`, log `[laptop-poll] heartbeat ok · no work` and exit.

## Step 2 — Fetch context

GET `{WORKER}/admin/agency/laptop/context` (with X-Laptop-Token header).

Returns one bundle:
- `clients[]` — each with: `id`, `name`, `youtube_id`, `subscribers`, `instagram_handle`, `instagram_followers`, `instagram_accounts[]`, `channels[]`, `competitors[]`, `recent_uploads[]`, `scheduled_projects[]`, `brand_kit`, `drive_folder_url`, `discord_webhook_url`
- `active_spikes[]` — niche-level news spikes the cockpit detected

Cache the response in working memory; reuse for all tasks this run.

## Step 3 — Handlers

### `homepage_stats_refresh`
GET `{WORKER}/admin/agency/public/stats` (no auth header needed — it's open).
Result: `{ refreshed: true, stats: <response> }`.

### `milestone_check`
Pure math, no external calls. From the cached context:
- For each managed client (`managed_by_us === 1`), look at `subscribers`
- Targets: 5000, 10000, 25000, 50000, 100000, 250000, 500000, 1000000
- A client is a "candidate" if their subs is within 3% **below** any target (e.g. 9700-10000 for 10K)

Result: `{ candidates: [{ client_id, name, subs, target, gap_to_target }] }`

The worker auto-spawns `milestone_story_create` tasks for each candidate when this PATCH lands. Don't enqueue them yourself.

### `ig_followers_fetch`
Input: `task.client_id` → look up in context → get `instagram_handle` (or first `instagram_accounts[].handle`).

1. Open Chrome to `https://www.instagram.com/{handle}/` using the **Claude in Chrome** MCP (`mcp__Claude_in_Chrome__navigate`).
2. Read the page — use `read_page` with depth 5 to get the meta description.
3. The follower count is in:
   - `<meta name="description" content="14k Followers, 432 Following, 200 Posts — ...">`
   - Or in a `window.__additionalData` script block (less reliable)
4. Parse the number. Handle suffixes: `12.5k` → 12500, `1.2M` → 1_200_000, `500` → 500.

If you hit a login wall or CAPTCHA: PATCH `failed` with error `"ig_login_wall"` — don't try to scrape further this run.

If you get the count: PATCH `done` with `{ handle, followers, raw }`. Worker auto-writes followers to `clients.instagram_followers`.

### `ig_recent_posts_fetch`
Same setup. After the page loads:
1. `find` element matching "post grid" or "first post in profile"
2. Read the first 12 grid items: `href` (post URL), `alt` (post caption preview), thumbnail src
3. Result: `{ posts: [{ url, thumbnail, caption_alt }] }`

### `yt_stream_seo_check`
Input: `task.client_id` (or null = sweep all managed clients).

For each scheduled stream in context's `scheduled_projects` filtered by `asset_type='live'` or `status='planned'`:
1. If it has a `youtube_video_id`, open `https://studio.youtube.com/video/{video_id}/edit`
2. Read the page — title, description, tags, thumbnail
3. Score against the playbook:
   - Title length 50-70 chars
   - Description 200+ chars, has timestamps if it's a long stream
   - Has at least 8 tags
   - Has custom thumbnail (not auto-generated)
4. For each issue, log to result.

Result: `{ checked: N, warnings: [{ video_id, project_id, issues: ["title_too_short", "no_tags"] }] }`.

Don't write — this is read-only audit. The cockpit team reviews warnings and decides whether to enqueue `yt_video_reseo`.

### `yt_video_reseo`
Input: `task.payload_json` parsed as `{ video_id, new_title?, new_description?, new_tags? }`.

⚠ **This writes to YouTube — be careful.** Only run if all three fields are non-null in the payload.

1. Open `https://studio.youtube.com/video/{video_id}/edit`
2. For title: clear field, type new_title
3. For description: clear field, type new_description
4. For tags: clear, add each tag
5. Click "Save" button (top-right)
6. Wait for "Saved" confirmation toast

Result: `{ video_id, applied: true, fields_updated: [...] }` or PATCH failed if save didn't confirm.

### `milestone_story_create`
Input: `task.client_id` + `task.payload_json` parsed as `{ target, current_subs }`.

1. Look up client in context for `name` and `brand_kit`. If `brand_kit.colors` exists use those, else default `["#E85002", "#0F0F0F"]`.
2. Use Higgsfield (`mcp__53090553-...__generate_image`) with prompt:
   > "Cinematic celebration milestone card. Bold typography reading '{name} hits {target_human}!' (e.g. '50K SUBSCRIBERS!'). Brand colors: {colors}. Vertical 1080x1920 portrait. Modern gaming/creator aesthetic. Confetti, lights, sub count badge. Premium quality."
3. Wait for the image, capture URL.
4. Post to Discord using the worker's per-client webhook (from `client.discord_webhook_url`) **OR** `DISCORD_CLIENT_UPLOADS_WEBHOOK_URL` if no per-client. Embed:
   - Title: "🎉 {name} hit {target_human}!"
   - Image: the Higgsfield URL
   - Footer: "Generated milestone card — review + post to IG Story"
5. (Future) If team has IG poster credentials: auto-post as IG Story.

Result: `{ image_url, target, posted_to: ["discord"] }`.

### Unknown / not-yet-implemented type
PATCH `failed` with error `"handler not implemented yet"`. Move on — don't crash the run.

## Step 4 — PATCH each task

```
PATCH {WORKER}/admin/agency/laptop/tasks/{task.id}
Headers: X-Laptop-Token: {TOKEN}, Content-Type: application/json
Body: { "status": "done"|"failed", "result": {...}, "error": "..." }
```

The worker has post-completion side-effects:
- `ig_followers_fetch` done → writes `clients.instagram_followers` automatically
- `milestone_check` done → enqueues a `milestone_story_create` for each candidate

You don't need to do those side-effects yourself.

## Step 5 — Log + exit

Single-line summary:
```
[laptop-poll] heartbeat ok · claimed=2 · processed=2 · failed=0 · run_time=14s
```

If anything failed, also log the per-task line:
```
[laptop-poll] task=ig_followers_fetch client=Kiaraa → done · followers=14200
[laptop-poll] task=yt_stream_seo_check → done · warnings=3
```

## Errors

- **401 with X-Laptop-Token**: token wrong. Stop loop. Print: "LAPTOP_API_TOKEN mismatch — verify the env var matches the wrangler secret on the worker."
- **Network**: retry once with 30s backoff. If still failing, exit. Next cron tick retries.
- **Per-task error**: catch, PATCH the task `failed`, continue with the next task. Don't crash the run.
- **Higgsfield credit exhausted**: PATCH the milestone_story_create task `failed` with that error. The team will be alerted via the cockpit's failed-task list.

## Important constraints

- **Never write to YouTube without explicit `yt_video_reseo` payload.** SEO audits are read-only.
- **Don't enqueue follow-up tasks yourself** — let the worker's post-complete side-effects handle that.
- **Don't dump full task results to chat** — just log the summary line. Full results are in D1.
- **Respect rate limits.** If IG returns 429, PATCH the task failed with `"ig_rate_limited"` and do NOT retry on the same run.
