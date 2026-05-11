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

**Schedule** — time-aware cadence (saves Claude tokens during quiet hours):

Run it every 20 min during the day, every 90 min late night. Cron uses LOCAL time (IST on this machine):

```
/schedule create laptop-poll-queue cron='*/20 8-23 * * *'     # every 20 min, 8 AM-11 PM IST
/schedule create laptop-poll-queue-night cron='0 */2 0-7 * * *'  # every 2 hours, midnight-7 AM IST
```

That's two schedules of the same skill. Wakes 51 times/day total (47 day + 4 night) vs 288 if running every 5 min — **~83% reduction in token spend**.

If only one cron slot is available in the schedule tool, use `*/20 * * * *` (every 20 min, always) — still 5× cheaper than the old `*/5 * * * *`.

## Each run (high-level loop) — optimized for token efficiency

1. **Claim** up to 3 pending tasks
2. **If claimed_count === 0** → log heartbeat + exit immediately. **DO NOT FETCH CONTEXT.**
3. **If claimed_count > 0** → load context from local cache (or refresh if stale/missing)
4. **Execute** each claimed task using the handler below
5. **Patch** each task with `done` + result, or `failed` + error
6. **Log** a single-line summary
7. **Exit**

The cache makes most runs (the "no work" ones) zero-context — heartbeat call only, ~200 bytes in/out, no JSON parsing.

## WebSocket push (real-time mode) — optional, runs alongside polling

The worker exposes a WebSocket endpoint that pushes a `task_available` message the instant a new `laptop_tasks` row is inserted (manual cockpit "▶ Sync IG" clicks, scheduled-task fires, milestone follow-ups). When you're listening, latency drops from "up to 20 min" to ~2 sec.

**Endpoint:**
```
wss://shinel-auth.shinelstudioofficial.workers.dev/admin/agency/laptop/ws
  ?laptop_id={LAPTOP_ID}&token={SHINEL_LAPTOP_TOKEN}&version=1.3
```

**Message shapes** (server → client):
```json
{ "type": "hello", "ts": 1715300000000, "laptop_id": "shinel-mainframe", "buffered": 0 }
{ "type": "task_available", "task_id": "uuid", "task_type": "ig_followers_fetch",
  "client_id": 7, "priority": 5, "source": "cockpit:user", "ts": 1715300000000 }
{ "type": "pong", "ts": 1715300010000 }
```

Send `{ "type": "ping" }` once every 30 s to keep the connection warm.

### Two ways to use the push channel

**Mode A — Listen-tail (recommended, no daemon needed):**
After running the polling loop above, if any tasks were claimed, open a WS connection and listen for up to 4 minutes for more `task_available` pushes. On each push, claim + execute + patch. Then close + exit. This means the laptop is responsive for ~4 minutes after every wake-up, giving most user-triggered tasks effectively-instant execution.

**Mode B — Always-on bridge daemon (advanced, requires a separate process):**
Run a tiny standalone bridge (Node.js or Python `websocket-client`) at Windows logon. The bridge keeps a WS open 24/7. When a push arrives, it writes a `trigger.txt` file in the Cowork workspace folder; a separate `*/1 * * * *` scheduled task checks for the file and, if present, runs the full claim/execute loop and deletes the marker.

For Mode A, append this step to the end of the polling loop:

```
## Step 8 — Listen-tail (optional but cheap)

If `claimed_count > 0` (you were already going to be alive for a few seconds anyway):
  1. Open `WSS(/admin/agency/laptop/ws?laptop_id={LAPTOP_ID}&token={TOKEN}&version=1.3)`.
  2. Set a 4-minute hard deadline. Also a 30 s ping interval.
  3. On `task_available` message → claim 1 task by ID-or-priority, execute it, patch result.
     (Use the same handler dispatch from earlier steps.)
  4. On deadline reached OR 2 minutes of silence → close + exit.

If `claimed_count === 0` (idle wake): skip listen-tail entirely. Save tokens.
```

The listen-tail makes ~80% of cockpit-clicks land within 2 seconds, without any extra daemon. Polling fills the gaps.

### Diagnostic
- `GET /admin/agency/laptop/ws/status?laptop_id=shinel-mainframe` → `{ ok, connections, conns: [...] }`
- Use this from the cockpit (or curl) to verify your laptop is actually connected when you expect it to be.

## Step 1 — Claim

POST `{WORKER}/admin/agency/laptop/claim` with body:
```json
{
  "laptop_id": "{LAPTOP_ID}",
  "version": "1.2",
  "count": 3
}
```

(Don't filter by `types` — claim anything pending. The handler dispatch below figures out what to do for each type; unknown types just fail-and-skip without crashing the run. This avoids the type-list-vs-scheduler-seeds drift problem.)

Response: `{ claimed_count: N, tasks: [...] }`. Each task: `{ id, type, client_id, payload_json, attempts }`.

If `claimed_count === 0`, log `[laptop-poll] heartbeat ok · no work` and exit.

## Step 2 — Get context (cached)

**Skip this entire step if `claimed_count === 0` from step 1.** Log "[laptop-poll] heartbeat ok · no work" and exit. Save tokens.

### Cache layout

In your Cowork workspace folder, maintain:
- `cache/context.json` — last successful context response
- `cache/context.etag` — the ETag returned with that response

### Loading order — scoped by the tasks claimed

For each claimed task, decide what context you actually need:

**Group A — single-client tasks** (`ig_followers_fetch`, `ig_recent_posts_fetch`, `milestone_story_create`, `yt_video_reseo` if payload has video_id):
- Only need data for `task.client_id`.
- Use scoped endpoint: `GET {WORKER}/admin/agency/laptop/context?clientId={task.client_id}`
- Cache per-client: `cache/context-{client_id}.json` + `cache/context-{client_id}.etag`
- Payload is ~5KB instead of ~50KB for full context.

**Group B — multi-client tasks** (`milestone_check`, `yt_stream_seo_check` when no client_id, `homepage_stats_refresh`):
- Need all clients.
- Use full endpoint: `GET {WORKER}/admin/agency/laptop/context` (no params)
- Cache: `cache/context.json` + `cache/context.etag`

### Loading procedure (apply per task)

1. Decide group A or B. Pick cache file paths accordingly.
2. **Read the saved ETag** (if file exists).
3. **GET** the appropriate URL with headers:
   ```
   X-Laptop-Token: {TOKEN}
   If-None-Match: <saved etag, if any>
   ```
4. **Response handling:**
   - `304 Not Modified` → use cached `cache/context*.json`
   - `200 OK` → save body to `cache/context*.json` and `ETag` header to `cache/context*.etag`, then use it
   - `401` → token wrong, stop loop
   - Network error → fall back to cached file if it exists; else fail this run

### Smart batching

If multiple claimed tasks share the same client_id, only fetch that client's context once per run, then reuse it for all those tasks.

If you have BOTH group-A tasks (specific clients) AND group-B tasks (all clients) claimed in the same run, you can skip the per-client fetches — the all-clients response already contains them. Use full context.

### Context shape (cache it as-is)

```json
{
  "count": 9,
  "clients": [
    {
      "id": "c-...",
      "name": "Kiaraa Gaming",
      "youtube_id": "UC...",
      "subscribers": 14200,
      "instagram_handle": "kiaraa.gaming",
      "instagram_followers": 8400,
      "instagram_accounts": [...],
      "channels": [...],
      "competitors": [...],
      "recent_uploads": [...],
      "scheduled_projects": [...],
      "brand_kit": {...},
      "drive_folder_url": "...",
      "discord_webhook_url": "..."
    }
  ],
  "active_spikes": [...]
}
```

### When NOT to use the cache

- If a task explicitly says `"force_refresh": true` in its payload_json
- If the cached context is >24 hours old (sanity check — read its mtime)

### Why this matters

- ~90% of runs have 0 claimed tasks → no context fetch at all → ~200 bytes per heartbeat
- The other ~10% with tasks usually hit ETag-304 → still no JSON parsing
- Only when the cockpit team makes real changes (new client, new competitor) does the laptop actually re-parse the full context

Net result: each cron tick costs roughly one HTTP round trip + a few hundred bytes of LLM context, instead of fetching + parsing 50KB of JSON every 5 minutes forever.

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
Input: `task.client_id` (and optionally `task.payload_json.handle`). Look up the IG handle from context if not in payload.

1. Open Chrome to `https://www.instagram.com/{handle}/` using **Claude in Chrome** (`mcp__Claude_in_Chrome__navigate`).
2. `read_page` (depth 5) to get the meta description + JSON-LD.
3. **Follower count** — appears in `<meta name="description" content="14k Followers, 432 Following, 200 Posts — ...">`. Parse digits, handle suffixes (`12.5k` → 12500, `1.2M` → 1_200_000).
4. **Avatar URL** — also capture the profile picture. Look in `<meta property="og:image">` first (most reliable), otherwise the header `<img>` element with the round 150×150 picture. Get the full HTTPS URL.

PATCH `done` with `{ handle, followers, raw, avatar_url }`. Worker auto-writes:
- `clients.instagram_followers` ← the count
- `instagram_accounts.followers` ← the count (matched by handle)
- `instagram_accounts.avatar_url` ← the profile pic URL (preserves existing if scraper missed it)

Errors:
- Login wall / CAPTCHA → PATCH `failed` with `"ig_login_wall"`. Don't retry this run.
- HTTP 429 → PATCH `failed` with `"ig_rate_limited"`. **Stop further IG fetches this run** to avoid burning the IP. Other task types are fine.

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

### `custom_prompt` AND any cockpit-scheduled task type

This is the catch-all for **any task whose `payload_json.prompt` field is set**. That includes:
- `custom_prompt` itself
- Cockpit-scheduled types like `daily_research_run`, `news_spike_scan`, `content_pipeline_review`, `weekly_client_report`, etc — these all carry their prompt in the payload

**Dispatch rule:** If `task.type` doesn't match one of the hard-coded handlers above (ig_followers_fetch, milestone_check, etc.) **AND** `task.payload_json.prompt` is a non-empty string, treat it as a prompt-driven task.

**Input:** `task.payload_json` parsed as `{ prompt, scheduled_task_id?, scheduled_task_name?, source?, ...extra_args }`

**Execution:**
1. Read the `prompt` field — that's the human-language description of what to do.
2. Look up additional context via `/admin/agency/laptop/context` (or `?clientId=` if scoped) if the prompt needs client data.
3. Execute the prompt — could be:
   - Browser automation (open YT Studio, IG, Drive, etc.)
   - Higgsfield image generation
   - File writes / Discord posts
   - Multi-step workflow
4. Capture results as a brief summary

**Result shape:** `{ scheduled_task_id, summary, artifacts: [...], ran_at: <iso> }`

The `summary` field shows in the cockpit's Schedule panel under "last run". Keep it under 200 chars.

**Trust the prompt.** Don't over-interpret. If it says "post to Discord #ops-pipeline", do exactly that. If it says "save to client Drive folder", use the client's `drive_folder_url` from context.

**If both prompt is missing AND the type doesn't match a known handler:** PATCH `failed` with `"handler not implemented yet — no prompt in payload"`.

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
