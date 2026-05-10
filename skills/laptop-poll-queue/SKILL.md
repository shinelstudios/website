---
name: laptop-poll-queue
description: Polls the Shinel Cockpit task queue and executes any pending laptop-side tasks (IG follower fetch, RESEO sweeps, Higgsfield generation, milestone story creation, etc). Runs every 5 minutes on the always-on machine. Heartbeats so the cockpit knows the laptop is online.
---

# laptop-poll-queue

You are running on the **always-on laptop** as a scheduled Cowork task. Your job is to keep the agency platform's automations moving even when the founder's main laptop is off.

## Setup (one-time)

**1. Set the worker URL and laptop ID** in environment:

```
SHINEL_WORKER_URL = https://shinel-auth.shinelstudioofficial.workers.dev
SHINEL_LAPTOP_ID  = shinel-mainframe   # whatever name you want
SHINEL_AUTH_TOKEN = <a long-lived JWT for the team account>
```

The auth token is needed for the worker's admin-gated queue endpoints. Get one from devtools on the cockpit page (`fetch('/auth/refresh', {method:'POST', credentials:'include'}).then(r=>r.json()).then(j=>copy(j.access_token||j.token))`). Tokens expire — when you get 401 errors, the user needs to refresh and re-set this.

**2. Schedule this skill** to run every 5 minutes. Use the `schedule` skill:

```
/schedule create laptop-poll-queue cron='*/5 * * * *'
```

## Each run

### 1. Heartbeat + claim

POST to `{SHINEL_WORKER_URL}/admin/agency/laptop/claim` with header `Authorization: Bearer {SHINEL_AUTH_TOKEN}` and body:

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

### 2. Execute each claimed task

Loop over `tasks`. For each, run the matching handler below. On success, PATCH the task with `{ status: "done", result: {...} }`. On error, PATCH with `{ status: "failed", error: "message" }`.

PATCH URL: `{SHINEL_WORKER_URL}/admin/agency/laptop/tasks/{task.id}`

### Task handlers

#### `ig_followers_fetch`
- Input: `{ client_id }` — look up client's `instagram_handle` from the cockpit (`GET /admin/agency/clients/full`).
- Open a Chrome tab to `https://www.instagram.com/{handle}/`.
- Read the page; the follower count appears in a `<meta name="description">` like "14k Followers, 432 Following, 200 Posts — ...".
- Parse the number (handle K/M suffixes).
- Update D1: `POST /admin/agency/laptop/enqueue` won't help — instead, store result back via the PATCH and have the worker write it. (We'll wire the worker to act on `ig_followers_fetch` results in a follow-up.)
- Result: `{ handle, followers, posts }`.

#### `ig_recent_posts_fetch`
- Same setup as above. Read first 12 grid items (`href`, `alt`, image src).
- Result: `{ posts: [{ url, thumbnail, caption_alt }] }`.

#### `yt_stream_seo_check`
- Input: `{ client_id }` — list scheduled streams from `/admin/agency/projects?clientId=X&status=planned`.
- Open YT Studio for each scheduled stream URL.
- Verify title length, description length, tags, thumbnail. Compare against the SEO playbook.
- Result: `{ checked: N, warnings: [{ video_id, issue }] }`.

#### `yt_video_reseo`
- Input: `{ video_id, new_title?, new_description?, new_tags? }`.
- Open `https://studio.youtube.com/video/{video_id}/edit`.
- Update the fields, save.
- Result: `{ video_id, applied: true, fields_updated: [...] }`.

#### `milestone_check`
- No input — query `/admin/agency/clients/full` and find clients whose `subscribers` is within 1% of round milestones (10K, 50K, 100K, 250K, 500K, 1M).
- Result: `{ candidates: [{ client_id, name, subs, target }] }`.
- Worker side: if any candidates, enqueue `milestone_story_create` for each.

#### `milestone_story_create`
- Input: `{ client_id, target }`.
- Use Higgsfield (mcp__53090553-... generate_image) to render a 1080×1920 portrait celebration card (subscriber milestone, brand-styled).
- Save to client's Drive folder.
- If client has IG with a managed account and you have IG poster credentials, post as story.
- Otherwise, post the image to Discord `#client-uploads` channel as a "ready to post" prompt for the team.
- Result: `{ image_url, posted_to: ["discord", "ig_story?"] }`.

#### `homepage_stats_refresh`
- No input — call `/admin/agency/public/stats` (open endpoint).
- The endpoint already returns live numbers. This task simply pings it to warm Cloudflare's edge cache.
- Result: `{ refreshed: true, stats: {...} }`.

### 3. Self-throttle

If 5 consecutive runs return zero claimed tasks, increase poll interval to 15 min (update `/schedule` cron). When work appears again, return to 5 min. (Optional optimization — for now, just always poll every 5 min.)

### 4. Errors

- **401 Unauthorized**: token expired. Print: "Token expired — please update SHINEL_AUTH_TOKEN env var." Stop loop.
- **Network**: retry once with 30s backoff. If still failing, exit (next cron tick will retry).
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

## When you're done

Report counts only — don't dump full task payloads to chat. The user just wants to know "5 tasks done, 0 failed".
