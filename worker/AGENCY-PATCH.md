# Agency Platform — manual patch for worker.js

This is the **only manual edit** to the existing `worker.js`. After this, all
new agency code lives in `worker/agency-handlers.js` and never touches the
existing if-chain.

## Step 1 — Add import at the TOP of worker.js

Open `worker/worker.js` and find the existing imports near the top of the file
(should be around line 1-30). Add this line after the existing imports:

```js
import { handleAgencyRoute } from "./agency-handlers.js";
```

## Step 2 — Add dispatch inside the main `fetch()` handler

Search worker.js for the line:

```js
(url.pathname === "/" || url.pathname === "/health") &&
```

(it's the first route in the if-chain — should be around line 1741)

Just **BEFORE** that line, insert these 4 lines:

```js
    // Agency platform routes — namespaced under /admin/agency/* so they
    // never collide with existing /admin/* routes. Returns null if the
    // request isn't for an agency route.
    const agencyRes = await handleAgencyRoute(request, env, secret, url, requireTeamOrThrow);
    if (agencyRes) return agencyRes;

```

(Match the existing 4-space indentation of the other routes around it.)

## Step 3 — Verify

Run worker locally to verify it boots without import errors:

```powershell
cd "C:\Users\ragha\Desktop\Claude Cowork\Shinel Studios\agency-platform\worker"
npx wrangler dev --local --persist-to .wrangler/state/v3
```

You should see: `⎔ Starting local server...` and then `Ready on http://localhost:8787`.

In another terminal (or browser), try (with your team auth cookie/token):

```powershell
# This will return 401 if not authed — that's fine, proves the route is hooked up
curl http://localhost:8787/admin/agency/ops/snapshot
```

If you get `{"error":"unauthorized"}` (status 401), the route is correctly
wired and just needs a logged-in admin user. If you get a 404 or
`Cannot find module`, the import or dispatch isn't right.

## Step 4 — Test with auth (after wrangler dev is running)

The simplest end-to-end test: open `http://localhost:8787` in your browser
where you're already logged in as admin, then visit:

- `http://localhost:8787/admin/agency/clients/full` → should return JSON with
  5 clients + their channels
- `http://localhost:8787/admin/agency/competitors` → 34 competitors
- `http://localhost:8787/admin/agency/seo-history` → 4 SEO entries
- `http://localhost:8787/admin/agency/ops/snapshot` → the consolidated bundle

## What's in agency-handlers.js

13 routes, all under `/admin/agency/*`, all admin-gated:

| Method · Path | Returns |
|---|---|
| GET `/admin/agency/ops/snapshot` | Single bundle for the cockpit dashboard (clients, pending SEO, spikes, competitor overperformers, today's research, recent agent log, project status counts) — one call powers the whole UI |
| GET `/admin/agency/clients/full` | Clients with their channels, niche, soul_id, retainer tier |
| GET `/admin/agency/competitors[?clientId=X]` | All tracked competitors |
| GET `/admin/agency/competitors/history?clientId=X&days=14` | Daily snapshots |
| GET `/admin/agency/seo-history[?clientId=X&limit=50]` | RESEO audit log |
| GET `/admin/agency/research/:clientId[/:date]` | Daily research file (md body) |
| GET `/admin/agency/spikes[?status=active]` | News spikes (patch days, tournaments) |
| GET `/admin/agency/projects[?clientId=X&status=Y]` | Kanban data |
| POST `/admin/agency/projects` | Create project |
| PATCH `/admin/agency/projects/:id` | Update project |
| GET `/admin/agency/agent-log[?level=warn&limit=100]` | Worker activity log |
| POST `/admin/agency/agent-log` | Worker logs an event (used by scheduled tasks) |

## Rollback

If anything breaks, the rollback is one git command:

```powershell
git checkout worker.js  # restore the unmodified version
```

The agency-handlers.js file stays — it's just dead code until worker.js
imports + dispatches it. Production stays safe.
