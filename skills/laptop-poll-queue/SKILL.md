---
name: laptop-poll-queue
description: Polls the Shinel Cockpit task queue and executes any pending laptop-side tasks (IG follower fetch, RESEO sweeps, Higgsfield generation, milestone story creation, etc). Runs every 5 minutes on the always-on machine. Heartbeats so the cockpit knows the laptop is online. Authenticates with a simple X-Laptop-Token header — no user JWT needed.
---

# laptop-poll-queue

You are running on the **always-on laptop** as a scheduled Cowork task. Your job is to keep the agency platform's automations moving even when the founder's main laptop is off.

## Setup (one-time)

**1. The user generates a `LAPTOP_API_TOKEN`** — any long random string. They set it on the worker with:
```
npx wrangler secret put LAPTOP_API_TOKEN
```
And paste it on the laptop side as the env var below.

**2. Set the env vars** in your memory at the start of every run:

```
SHINEL_WORKER_URL = https://shinel-auth.shinelstudioofficial.workers.dev
SHINEL_LAPTOP_ID  = shinel-mainframe
SHINEL_LAPTOP_TOKEN = <the LAPTOP_API_TOKEN>
```

**3. Schedule this skill** to run every 5 minutes. Use the `schedule` skill:

```
/schedule create laptop-poll-queue cron='*/5 * * * *'
```

## Auth header

All requests to `/admin/agency/laptop/*` endpoints must include:
```
X-Laptop-Token: {SHINEL_LAPTOP_TOKEN}
```

(No user JWT needed — the X-Laptop-Token is enough for laptop endpoints.)

## Each run

### 1. Heartbeat + claim

POST to `{SHINEL_WORKER_URL}/admin/agency/laptop/claim` with:
- Headers: `X-Laptop-Token: {SHINEL_LAPTOP_TOKEN}`, `Content-Type: application/json`
- Body:
```json
{
  "laptop_id": "{SHINEL_LAPTOP_ID}",
  "version": "1.0",
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

Response: `{ claimed_count: N, tasks: [...] }`. Each task has `id`, `type`, `client_id`, `payload_json`.

If `claimed_count === 0`, log "no work" and exit. The heartbeat alone tells the cockpit you're online.

### 2. Get client context (if needed)

For tasks that reference a `client_id`, look up the handle/details by calling:
```
GET {SHINEL_WORKER_URL}/admin/agency/laptop/context
Headers: X-Laptop-Token: {SHINEL_LAPTOP_TOKEN}
```

Returns `{ count, clients: [{ id, name, instagram_handle, instagram_followers, youtube_id, subscribers, instagram_accounts: [...] }] }`. Cache this result in memory for the rest of the run.

### 3. Execute each claimed task

Loop over `tasks`. For each, run the matching handler below. On success, PATCH with `{ status: "done", result: {...} }`. On error, PATCH with `{ status: "failed", error: "message" }`.

PATCH URL: `{SHINEL_WORKER_URL}/admin/agency/laptop/tasks/{task.id}`
Headers: `X-Laptop-Token: {SHINEL_LAPTOP_TOKEN}`, `Content-Type: application/json`

### Task handlers

#### `ig_followers_fetch`
- Input: `task.client_id` — find the client in your context map → get `instagram_handle`.
- Open Chrome to `https://www.instagram.com/{handle}/`.
- Read the page; the follower count appears in:
  - A `<meta name="description">` tag like "14k Followers, 432 Following, 200 Posts — ..."
  - Or a JSON-LD `<script type="application/ld+json">` block
- Parse the number, handling K/M suffixes (e.g. "14k" → 14000, "1.2M" → 1200000).
- Result: `{ handle, followers, raw }` — worker auto-writes followers back to `clients.instagram_followers`.
- If you hit a 429 or login wall, fail with `error: "ig_rate_limited"` and the worker won't auto-retry until next cron tick.

#### `ig_recent_posts_fetch`
- Same setup. Read first 12 grid items (`href`, `alt`, image src).
- Result: `{ posts: [{ url, thumbnail, caption_alt }] }`.

#### `yt_stream_seo_check`
- Input: `task.client_id` (or null = all managed clients).
- For each client's scheduled streams (planned status), open YT Studio.
- Check: title length 50-70 chars, description length 200+, has tags, has thumbnail.
- Result: `{ checked: N, warnings: [{ video_id, issue }] }`.

#### `yt_video_reseo`
- Input: `task.payload_json` parsed as `{ video_id, new_title?, new_description?, new_tags? }`.
- Open `https://studio.youtube.com/video/{video_id}/edit`.
- Update fields, save.
- Result: `{ video_id, applied: true, fields_updated: [...] }`.

#### `milestone_check`
- No input — call `/admin/agency/laptop/context` for clients.
- Find any whose `subscribers` is within 3% of: 10000, 50000, 100000, 250000, 500000, 1000000.
- Result: `{ candidates: [{ client_id, name, subs, target }] }`.
- **Worker auto-enqueues `milestone_story_create` for each candidate** when this task completes — you don't need to do it.

#### `milestone_story_create`
- Input: `task.client_id` + `task.payload_json` parsed as `{ target, current_subs }`.
- Use Higgsfield (`mcp__53090553-...__generate_image`) to render a 1080×1920 portrait celebration card. Prompt:
  > "Cinematic celebration card for [client name] reaching [target] subscribers on YouTube. Brand colors: orange (#E85002) and black. Bold typography. 1080x1920 portrait."
- Save to client's Drive folder (if you have Drive access set up, otherwise just keep the URL).
- Post the image URL to Discord `#client-uploads` webhook (env var `DISCORD_CLIENT_UPLOADS_WEBHOOK_URL` if you have it; otherwise call the worker which has it).
- Result: `{ image_url, target, posted_to: ["discord"] }`.

#### `homepage_stats_refresh`
- No input — GET `/admin/agency/public/stats` (no auth needed, it's open).
- Just pings to warm Cloudflare's edge cache so the homepage loads fresh numbers fast.
- Result: `{ refreshed: true, stats: {...} }`.

### 4. Errors

- **401 with "X-Laptop-Token"**: token is wrong. Print: "LAPTOP_API_TOKEN mismatch — please verify the env var matches the wrangler secret." Stop loop.
- **Network**: retry once with 30s backoff. If still failing, exit (next tick retries).
- **Per-task error**: catch, PATCH the task with `status='failed'` and the error message. Don't fail the whole run.

### 5. Logging

Log each run as a single line:
```
[laptop-poll] heartbeat ok · claimed=2 · pending_in_queue=5 · run_time=12s
```

If tasks were processed, also log:
```
[laptop-poll] task=ig_followers_fetch client=Kiaraa Gaming → done · followers=14200
[laptop-poll] task=milestone_check → done · candidates=1 (Kiaraa@10K)
```

## Why this design

- **Cloudflare can't run browsers.** Anything needing Instagram session, YouTube Studio, or image generation has to live on a machine.
- **D1 is the source of truth.** The laptop is a worker (in the queue-worker sense), not the brain. State stays on Cloudflare.
- **Idempotent.** Tasks claim atomically (only one laptop wins per task). Re-runs are safe because completed tasks don't get re-claimed.
- **Heartbeat-aware.** The cockpit knows whether to enqueue user-blocking tasks based on whether the laptop is online.
- **Simple auth.** A single shared secret in the worker + on the laptop. No user JWT to refresh.

## When you're done

Report counts only — don't dump full task payloads to chat. The user just wants to know "5 tasks done, 0 failed".
