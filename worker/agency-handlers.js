/**
 * agency-handlers.js — Phase 1A worker routes for the agency platform
 * 2026-05-09
 *
 * All routes here are NEW (no overlap with existing worker.js routes).
 * Each is admin-gated via the existing requireTeamOrThrow helper.
 *
 * INTEGRATION (3-line edit in worker.js):
 *
 *   import { handleAgencyRoute } from "./agency-handlers.js";
 *
 *   // ...inside the main fetch() handler, FIRST thing inside the routing block,
 *   // BEFORE any existing if-chain handlers:
 *   const agencyRes = await handleAgencyRoute(request, env, secret, url, requireTeamOrThrow);
 *   if (agencyRes) return agencyRes;
 *
 * The handler returns null if the URL doesn't match an agency route, so the
 * existing if-chain continues unmodified. It returns a Response object when
 * it handles a route.
 */

const BASE_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
};

// Merge CORS headers (echoed from request Origin) into every response so
// browser fetches from localhost:5173 + shinelstudios.in succeed. The worker's
// global OPTIONS handler already covers preflight; this is for actual responses.
function corsHeaders(request, env) {
  const origin = request.headers.get("origin") || "";
  const allowed = (env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const isAllowed = origin && allowed.some((a) => {
    if (!a || a === "*") return false;
    try { return new URL(a).hostname === new URL(origin).hostname && new URL(a).protocol === new URL(origin).protocol; }
    catch { return a === origin; }
  });
  const h = {
    "Access-Control-Allow-Headers": "content-type, authorization",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,PATCH,OPTIONS",
    "Access-Control-Allow-Credentials": "true",
    "Vary": "Origin",
  };
  if (isAllowed) h["Access-Control-Allow-Origin"] = origin;
  return h;
}

function makeOk(request, env) {
  const cors = corsHeaders(request, env);
  return (data, status = 200) =>
    new Response(JSON.stringify(data, null, 2), {
      status,
      headers: { ...BASE_HEADERS, ...cors },
    });
}
function makeErr(request, env) {
  const cors = corsHeaders(request, env);
  return (msg, status = 400) =>
    new Response(JSON.stringify({ error: msg }), {
      status,
      headers: { ...BASE_HEADERS, ...cors },
    });
}

// ---------------------------------------------------------------------------
// Project status ladder (kept in lockstep with PipelineKanban.jsx COLUMNS)
// ---------------------------------------------------------------------------
export const PROJECT_STATUSES = [
  "planned",
  "started",
  "in-progress",
  "completed",
  "paid",
  "posted",
  "added-to-website",
  "archive",
];

// ---------------------------------------------------------------------------
// Discord webhooks — fire-and-forget alerts. Multi-channel routing:
//
//   channel "finance" → DISCORD_FINANCE_WEBHOOK_URL  (paid events, payouts)
//   channel "ops"     → DISCORD_OPS_WEBHOOK_URL      (posted, on-website, spikes)
//   channel "default" → DISCORD_WEBHOOK_URL          (catch-all, test pings)
//
// Each channel falls back to DISCORD_WEBHOOK_URL when its dedicated URL is
// not configured, so a single-webhook setup keeps working unchanged. Never
// throws — failures get logged. Call from inside ctx.waitUntil for hot paths.
// ---------------------------------------------------------------------------
function pickWebhookUrl(env, channel) {
  if (channel === "finance"          && env.DISCORD_FINANCE_WEBHOOK_URL)         return env.DISCORD_FINANCE_WEBHOOK_URL;
  if (channel === "ops"              && env.DISCORD_OPS_WEBHOOK_URL)             return env.DISCORD_OPS_WEBHOOK_URL;
  if (channel === "client-uploads"   && env.DISCORD_CLIENT_UPLOADS_WEBHOOK_URL)  return env.DISCORD_CLIENT_UPLOADS_WEBHOOK_URL;
  if (channel === "shinel-uploads"   && env.DISCORD_SHINEL_UPLOADS_WEBHOOK_URL)  return env.DISCORD_SHINEL_UPLOADS_WEBHOOK_URL;
  return env.DISCORD_WEBHOOK_URL || "";
}

export async function postToDiscord(env, payload, channel = "default") {
  const url = pickWebhookUrl(env, channel);
  if (!url) return { ok: false, skipped: true, reason: `no webhook configured for channel=${channel}` };
  try {
    const body = typeof payload === "string"
      ? { content: payload, username: "Shinel Cockpit" }
      : { username: "Shinel Cockpit", ...payload };
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return { ok: res.ok, status: res.status, channel };
  } catch (e) {
    console.error(`[discord:${channel}] post failed:`, e);
    return { ok: false, error: String(e), channel };
  }
}

/**
 * Main dispatcher. Returns a Response if it handled the URL, otherwise null.
 */
export async function handleAgencyRoute(request, env, secret, url, requireTeamOrThrow, requireAuthOrThrow) {
  const path = url.pathname;
  const method = request.method;

  // Per-request CORS-aware response helpers. Reach into makeOk/makeErr each
  // call so each Response carries Access-Control-Allow-Origin echoed from
  // the request's Origin (worker.js handles OPTIONS preflight globally).
  const ok = makeOk(request, env);
  const err = makeErr(request, env);

  // Only handle /admin/agency/* (cleanly namespaced — no risk of colliding with
  // existing /admin/* routes that the original worker.js already serves).
  if (!path.startsWith("/admin/agency/")) return null;

  // ---- Public-ish: Google Sheets CSV export — gated by URL token, NOT JWT ----
  // Must run BEFORE the JWT auth gate so Sheets's IMPORTDATA() can fetch it.
  // Token comes from env.SHEETS_EXPORT_TOKEN.
  const sheetsExportEarly = path.match(/^\/admin\/agency\/sheets-export\/([a-z]+)\.csv$/);
  if (sheetsExportEarly && method === "GET") {
    const expectedToken = env.SHEETS_EXPORT_TOKEN || "";
    const providedToken = url.searchParams.get("token") || "";
    if (!expectedToken || providedToken !== expectedToken) {
      return new Response("Unauthorized — pass ?token=<SHEETS_EXPORT_TOKEN>", {
        status: 401,
        headers: { "Content-Type": "text/plain" },
      });
    }
    const kind = sheetsExportEarly[1];
    let csvRows = [];
    if (kind === "clients") {
      const { results } = await env.DB.prepare(
        `SELECT id, name, niche_tag, secondary_niche_tag, retainer_tier, status, COALESCE(managed_by_us, 1) AS managed_by_us, subscribers, instagram_handle, drive_folder_url, onboarded_at FROM clients ORDER BY name`
      ).all();
      csvRows.push(["id", "name", "niche_tag", "secondary_niche_tag", "retainer_tier", "status", "managed_by_us", "subscribers", "instagram_handle", "drive_folder_url", "onboarded_at"]);
      for (const r of results || []) csvRows.push(Object.values(r).map(v => v == null ? "" : v));
    } else if (kind === "editors") {
      const { results } = await env.DB.prepare(
        `SELECT id, name, email, phone, role, compensation_type, monthly_salary_inr, payment_rate_inr, payment_per, active FROM editors ORDER BY active DESC, name`
      ).all();
      csvRows.push(["id", "name", "email", "phone", "role", "compensation_type", "monthly_salary_inr", "payment_rate_inr", "payment_per", "active"]);
      for (const r of results || []) csvRows.push(Object.values(r).map(v => v == null ? "" : v));
    } else if (kind === "projects") {
      const { results } = await env.DB.prepare(
        `SELECT p.id, c.name AS client_name, p.title, p.asset_type, p.status, e.name AS editor_name, p.editor_payment_inr, p.due_date, p.scheduled_publish_at, p.completed_at, p.created_at
         FROM projects p
         LEFT JOIN clients c ON p.client_id = c.id
         LEFT JOIN editors e ON p.assigned_editor_id = e.id
         WHERE p.archived_at IS NULL
         ORDER BY p.updated_at DESC LIMIT 1000`
      ).all();
      csvRows.push(["id", "client_name", "title", "asset_type", "status", "editor_name", "editor_payment_inr", "due_date", "scheduled_publish_at", "completed_at", "created_at"]);
      for (const r of results || []) csvRows.push(Object.values(r).map(v => v == null ? "" : v));
    } else if (kind === "payments") {
      const { results } = await env.DB.prepare(
        `SELECT p.title AS project_title, c.name AS client_name, e.name AS editor_name, e.compensation_type, p.editor_payment_inr, p.status, p.completed_at
         FROM projects p
         LEFT JOIN clients c ON p.client_id = c.id
         LEFT JOIN editors e ON p.assigned_editor_id = e.id
         WHERE p.assigned_editor_id IS NOT NULL AND p.editor_payment_inr > 0
         ORDER BY p.completed_at DESC LIMIT 1000`
      ).all();
      csvRows.push(["project_title", "client_name", "editor_name", "compensation_type", "amount_inr", "project_status", "completed_at"]);
      for (const r of results || []) csvRows.push(Object.values(r).map(v => v == null ? "" : v));
    } else {
      return new Response(`Unknown export "${kind}". Available: clients, editors, projects, payments`, {
        status: 404,
        headers: { "Content-Type": "text/plain" },
      });
    }
    const csv = csvRows.map(row =>
      row.map(cell => {
        const s = String(cell);
        return (s.includes(",") || s.includes('"') || s.includes("\n")) ? `"${s.replace(/"/g, '""')}"` : s;
      }).join(",")
    ).join("\n");
    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Cache-Control": "max-age=600",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  // ---- GET /admin/agency/public/stats — homepage hero numbers (no auth) ----
  // Aggregated reach across all managed clients. Cached 5 min at the edge.
  if (path === "/admin/agency/public/stats" && method === "GET") {
    const corsOpen = { ...corsHeaders(request, env), "Access-Control-Allow-Origin": "*" };
    try {
      const [agg, postedThisMonth] = await Promise.all([
        env.DB.prepare(
          `SELECT
             COUNT(*) AS active_clients,
             COALESCE(SUM(subscribers), 0) AS total_subs,
             COALESCE(SUM(instagram_followers), 0) AS total_ig_followers
           FROM clients
           WHERE (status = 'active' OR status IS NULL)
             AND COALESCE(managed_by_us, 1) = 1`
        ).first(),
        env.DB.prepare(
          `SELECT COUNT(*) AS n FROM projects
           WHERE posted_at >= ?1 AND archived_at IS NULL`
        ).bind(Math.floor(Date.now() / 1000) - 30 * 86400).first(),
      ]);
      const totalReach = (agg?.total_subs || 0) + (agg?.total_ig_followers || 0);
      return new Response(JSON.stringify({
        active_clients: agg?.active_clients || 0,
        total_yt_subscribers: agg?.total_subs || 0,
        total_ig_followers: agg?.total_ig_followers || 0,
        total_reach: totalReach,
        posted_last_30d: postedThisMonth?.n || 0,
        generated_at: new Date().toISOString(),
      }), {
        status: 200,
        headers: { ...BASE_HEADERS, ...corsOpen, "Cache-Control": "public, max-age=300, s-maxage=300" },
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...BASE_HEADERS, ...corsOpen } });
    }
  }

  // ---- /admin/agency/editor-me — read-only view for the logged-in editor ----
  // Runs BEFORE the team-only auth gate so freelance editors (role='editor')
  // can hit it. Match by JWT email → editors.email.
  if (path === "/admin/agency/editor-me" && method === "GET") {
    let me;
    try { me = await requireAuthOrThrow(request, secret, env); }
    catch (e) { return err(e?.message || "unauthorized", e?.status || 401); }
    const email = String(me.email || "").trim().toLowerCase();
    if (!email) return err("token has no email", 401);

    const editor = await env.DB.prepare(
      "SELECT * FROM editors WHERE LOWER(email) = ?1 AND active = 1"
    ).bind(email).first();
    if (!editor) {
      return ok({
        editor: null,
        projects: [],
        finance: { paid_total: 0, pending_total: 0, paid_count: 0, pending_count: 0 },
        message: "No editor record found for this email. Ask the admin to add you.",
      });
    }

    const [{ results: projects }, finance] = await Promise.all([
      env.DB.prepare(
        `SELECT p.*, c.name AS client_name
         FROM projects p LEFT JOIN clients c ON p.client_id = c.id
         WHERE p.assigned_editor_id = ?1 AND p.archived_at IS NULL
         ORDER BY p.updated_at DESC LIMIT 200`
      ).bind(editor.id).all(),
      env.DB.prepare(
        `SELECT
           COUNT(CASE WHEN status='paid' THEN 1 END) AS paid_count,
           COALESCE(SUM(CASE WHEN status='paid' THEN editor_payment_inr ELSE 0 END), 0) AS paid_total,
           COUNT(CASE WHEN status IN ('completed','posted','added-to-website') AND editor_payment_inr > 0 THEN 1 END) AS pending_count,
           COALESCE(SUM(CASE WHEN status IN ('completed','posted','added-to-website') AND editor_payment_inr > 0 THEN editor_payment_inr ELSE 0 END), 0) AS pending_total
         FROM projects WHERE assigned_editor_id = ?1 AND archived_at IS NULL`
      ).bind(editor.id).first(),
    ]);

    // Strip sensitive editor-internal fields from the response
    const safeEditor = {
      id: editor.id,
      name: editor.name,
      email: editor.email,
      role: editor.role,
      compensation_type: editor.compensation_type,
      monthly_salary_inr: editor.monthly_salary_inr,
      payment_rate_inr: editor.payment_rate_inr,
      payment_per: editor.payment_per,
    };

    return ok({ editor: safeEditor, projects, finance });
  }

  // ========================================================================
  // LAPTOP-TOKEN ENDPOINTS — dual-auth: either X-Laptop-Token header (the
  // simple shared secret stored on the always-on laptop) OR team JWT.
  // The laptop never needs a user JWT; it just needs LAPTOP_API_TOKEN.
  // ========================================================================
  if (path.startsWith("/admin/agency/laptop/")) {
    // Quick auth check
    const laptopToken = request.headers.get("x-laptop-token") || "";
    const expectedToken = env.LAPTOP_API_TOKEN || "";
    let authed = false;
    let authKind = null;
    if (expectedToken && laptopToken && laptopToken === expectedToken) {
      authed = true;
      authKind = "laptop";
    } else {
      try { await requireTeamOrThrow(request, secret); authed = true; authKind = "team"; }
      catch (e) { /* fall through; both auth paths failed */ }
    }
    if (!authed) {
      return err("unauthorized — provide X-Laptop-Token header or team JWT", 401);
    }

    // ---- POST /admin/agency/laptop/claim — atomically claim N pending tasks
    if (path === "/admin/agency/laptop/claim" && method === "POST") {
      const body = await request.json().catch(() => ({}));
      const laptopId = String(body.laptop_id || "unknown");
      const count = Math.min(parseInt(body.count || 1, 10), 10);
      const nowSec = Math.floor(Date.now() / 1000);

      const types = Array.isArray(body.types) && body.types.length > 0 ? body.types : null;
      let q = `SELECT * FROM laptop_tasks
               WHERE status = 'pending'
                 AND (scheduled_for IS NULL OR scheduled_for <= ?1)`;
      const binds = [nowSec];
      if (types) {
        q += ` AND type IN (${types.map((_, i) => `?${i + 2}`).join(",")})`;
        binds.push(...types);
      }
      q += ` ORDER BY priority DESC, created_at LIMIT ${count}`;
      const { results: candidates } = await env.DB.prepare(q).bind(...binds).all();

      const claimed = [];
      for (const t of (candidates || [])) {
        const r = await env.DB.prepare(
          `UPDATE laptop_tasks
           SET status='claimed', claimed_at=?1, attempts=attempts+1, updated_at=CURRENT_TIMESTAMP
           WHERE id=?2 AND status='pending'`
        ).bind(nowSec, t.id).run();
        if (r?.meta?.changes > 0) claimed.push({ ...t, status: "claimed", claimed_at: nowSec, attempts: (t.attempts || 0) + 1 });
      }

      await env.DB.prepare(
        `INSERT INTO laptop_heartbeats (laptop_id, version, last_seen, pending_count, payload_json)
         VALUES (?1, ?2, ?3, ?4, ?5)
         ON CONFLICT(laptop_id) DO UPDATE SET
           version=excluded.version,
           last_seen=excluded.last_seen,
           pending_count=excluded.pending_count,
           payload_json=excluded.payload_json`
      ).bind(
        laptopId,
        body.version || null,
        nowSec,
        (candidates || []).length,
        body.heartbeat ? JSON.stringify(body.heartbeat) : null
      ).run();

      return ok({ claimed_count: claimed.length, tasks: claimed, auth_kind: authKind });
    }

    // ---- PATCH /admin/agency/laptop/tasks/:id — mark task done/failed
    const laptopTaskMatch = path.match(/^\/admin\/agency\/laptop\/tasks\/([^\/]+)$/);
    if (laptopTaskMatch && method === "PATCH") {
      const id = laptopTaskMatch[1];
      const body = await request.json().catch(() => ({}));
      const newStatus = body.status;
      if (!["done", "failed", "pending", "cancelled"].includes(newStatus)) {
        return err("status must be one of: done, failed, pending, cancelled");
      }
      const nowSec = Math.floor(Date.now() / 1000);

      // Pre-read the task to apply side-effects on success (e.g. ig_followers_fetch
      // result writes back to clients.instagram_followers).
      const task = await env.DB.prepare("SELECT * FROM laptop_tasks WHERE id = ?1").bind(id).first();
      if (!task) return err("task not found", 404);

      await env.DB.prepare(
        `UPDATE laptop_tasks
         SET status=?1, result_json=?2, error=?3, completed_at=?4, updated_at=CURRENT_TIMESTAMP
         WHERE id=?5`
      ).bind(
        newStatus,
        body.result ? JSON.stringify(body.result) : null,
        body.error || null,
        ["done", "failed", "cancelled"].includes(newStatus) ? nowSec : null,
        id
      ).run();

      // Side-effects on successful task completion
      if (newStatus === "done" && body.result) {
        try {
          if (task.type === "ig_followers_fetch" && task.client_id && body.result.followers != null) {
            await env.DB.prepare(
              "UPDATE clients SET instagram_followers = ?1 WHERE id = ?2"
            ).bind(parseInt(body.result.followers, 10), task.client_id).run();
          }
          // milestone_check: enqueue follow-up milestone_story_create tasks
          if (task.type === "milestone_check" && Array.isArray(body.result.candidates)) {
            for (const cand of body.result.candidates) {
              if (!cand.client_id || !cand.target) continue;
              const followupId = crypto.randomUUID();
              await env.DB.prepare(
                `INSERT INTO laptop_tasks (id, type, client_id, payload_json, priority, created_by)
                 VALUES (?1, 'milestone_story_create', ?2, ?3, 5, 'milestone_check')`
              ).bind(followupId, cand.client_id, JSON.stringify({ target: cand.target, current_subs: cand.subs })).run();
            }
          }
        } catch (e) { console.error("post-complete side-effect failed:", e.message); }
      }

      return ok({ id, status: newStatus, auth_kind: authKind });
    }

    // ---- POST /admin/agency/laptop/enqueue — let the laptop self-enqueue
    if (path === "/admin/agency/laptop/enqueue" && method === "POST") {
      const body = await request.json().catch(() => ({}));
      if (!body.type) return err("type required");
      const id = body.id || crypto.randomUUID();
      await env.DB.prepare(
        `INSERT INTO laptop_tasks (id, type, client_id, payload_json, priority, max_attempts, scheduled_for, created_by)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`
      ).bind(
        id,
        body.type,
        body.client_id || null,
        body.payload ? JSON.stringify(body.payload) : null,
        parseInt(body.priority || 0, 10),
        parseInt(body.max_attempts || 3, 10),
        body.scheduled_for || null,
        body.created_by || authKind
      ).run();
      return ok({ id, enqueued: true }, 201);
    }

    // ---- GET /admin/agency/laptop/queue?status=pending&limit=50
    if (path === "/admin/agency/laptop/queue" && method === "GET") {
      const status = url.searchParams.get("status") || "pending";
      const limit = Math.min(parseInt(url.searchParams.get("limit") || "50", 10), 200);
      const stmt = status === "all"
        ? env.DB.prepare(`SELECT * FROM laptop_tasks ORDER BY priority DESC, created_at LIMIT ${limit}`)
        : env.DB.prepare(`SELECT * FROM laptop_tasks WHERE status = ?1 ORDER BY priority DESC, created_at LIMIT ${limit}`).bind(status);
      const { results } = await stmt.all();
      return ok({ count: results.length, tasks: results });
    }

    // ---- GET /admin/agency/laptop/heartbeat — show all laptops + last seen
    if (path === "/admin/agency/laptop/heartbeat" && method === "GET") {
      const { results } = await env.DB.prepare(
        `SELECT * FROM laptop_heartbeats ORDER BY last_seen DESC`
      ).all();
      const nowSec = Math.floor(Date.now() / 1000);
      const enriched = (results || []).map((r) => ({
        ...r,
        seconds_ago: nowSec - (r.last_seen || 0),
        online: (nowSec - (r.last_seen || 0)) < 600,
      }));
      return ok({ laptops: enriched });
    }

    // ---- GET /admin/agency/laptop/context — everything the laptop needs to do work
    // Bundles in one call: clients, IG accounts, YT channels, competitors,
    // scheduled streams (planned projects), recent uploads, active news spikes,
    // brand kit (for Higgsfield image gen). Cached client-side; refresh per run.
    if (path === "/admin/agency/laptop/context" && method === "GET") {
      const clientId = url.searchParams.get("clientId"); // optional: scope to one client
      const clientFilter = clientId ? "AND id = ?1" : "";
      const binds = clientId ? [clientId] : [];

      const [clients, channels, igAccounts, competitors, scheduledStreams, recentUploads, activeSpikes] = await Promise.all([
        env.DB.prepare(
          `SELECT id, name, slug, status, COALESCE(managed_by_us, 1) AS managed_by_us,
                  youtube_id, subscribers, instagram_handle, instagram_followers,
                  niche_tag, secondary_niche_tag, retainer_tier, soul_id, brand_kit_json,
                  drive_folder_url, drive_folder_id, discord_webhook_url
           FROM clients
           WHERE (status = 'active' OR status IS NULL) ${clientFilter}
           ORDER BY managed_by_us DESC, name`
        ).bind(...binds).all(),

        env.DB.prepare(
          `SELECT client_id, channel_id, handle, role, language, niche_tag_override, studio_url
           FROM client_channels WHERE active = 1`
        ).all(),

        env.DB.prepare(
          `SELECT client_id, handle, url, role, managed_by_us, followers
           FROM instagram_accounts WHERE active = 1`
        ).all(),

        env.DB.prepare(
          `SELECT client_id, name, channel_id, url, niche_tag, notes
           FROM competitors WHERE active = 1`
        ).all().catch(() => ({ results: [] })),

        env.DB.prepare(
          `SELECT id, client_id, title, asset_type, status, due_date, scheduled_publish_at, youtube_video_id, brief_md
           FROM projects
           WHERE status IN ('planned', 'started', 'in-progress')
             AND archived_at IS NULL
           ORDER BY scheduled_publish_at NULLS LAST, due_date NULLS LAST LIMIT 200`
        ).all(),

        env.DB.prepare(
          `SELECT client_id, youtube_video_id, title, thumbnail, url, published_at, timestamp
           FROM pulse_activities
           WHERE timestamp >= ?1
           ORDER BY timestamp DESC LIMIT 200`
        ).bind(Date.now() - 14 * 86400_000).all(),

        env.DB.prepare(
          `SELECT id, niche_tag, title, spike_score, trend_window_end, detected_at
           FROM news_spikes WHERE status = 'active' ORDER BY detected_at DESC LIMIT 50`
        ).all().catch(() => ({ results: [] })),
      ]);

      // Group child rows by client_id for O(1) lookup
      const byClient = (rows, key = "client_id") => {
        const m = {};
        for (const r of (rows.results || rows || [])) (m[r[key]] ||= []).push(r);
        return m;
      };
      const channelsByClient   = byClient(channels);
      const igByClient         = byClient(igAccounts);
      const competitorsByClient = byClient(competitors);
      const recentByYtChannel  = byClient(recentUploads, "client_id"); // pulse uses YT channel id

      // For each client, attach: their channels, IGs, competitors, recent uploads (matched via youtube_id), scheduled streams (matched via clients.id)
      const enriched = (clients.results || []).map((c) => {
        let brandKit = null;
        try { brandKit = c.brand_kit_json ? JSON.parse(c.brand_kit_json) : null; } catch {}
        return {
          ...c,
          brand_kit: brandKit,
          brand_kit_json: undefined, // hide raw, expose parsed
          channels: channelsByClient[c.id] || [],
          instagram_accounts: igByClient[c.id] || [],
          competitors: competitorsByClient[c.id] || [],
          recent_uploads: c.youtube_id ? (recentByYtChannel[c.youtube_id] || []) : [],
          scheduled_projects: ((scheduledStreams.results || []).filter((p) => p.client_id === c.id)),
        };
      });

      return ok({
        count: enriched.length,
        clients: enriched,
        active_spikes: activeSpikes.results || [],
        generated_at: new Date().toISOString(),
      });
    }

    return err("laptop endpoint not found", 404);
  }

  // Auth gate (everything below requires admin/team JWT)
  try { await requireTeamOrThrow(request, secret); }
  catch (e) { return err(e?.message || "unauthorized", e?.status || 401); }

  try {
    // ---- /admin/agency/ops/snapshot — single call powering the cockpit dashboard
    // Default filters to ACTIVE clients only; pass ?show_inactive=true to include
    // archived/old clients we no longer work with.
    if (path === "/admin/agency/ops/snapshot" && method === "GET") {
      const showInactive = url.searchParams.get("show_inactive") === "true";
      return ok(await opsSnapshot(env, { showInactive }));
    }

    // ---- /admin/agency/competitors  (list all)
    if (path === "/admin/agency/competitors" && method === "GET") {
      const clientId = url.searchParams.get("clientId");
      const stmt = clientId
        ? env.DB.prepare("SELECT * FROM competitors WHERE client_id = ?1 AND active = 1 ORDER BY name").bind(clientId)
        : env.DB.prepare("SELECT * FROM competitors WHERE active = 1 ORDER BY client_id, name");
      const { results } = await stmt.all();
      return ok({ count: results.length, competitors: results });
    }

    // ---- /admin/agency/competitors/history?clientId=X&days=14
    if (path === "/admin/agency/competitors/history" && method === "GET") {
      const clientId = url.searchParams.get("clientId");
      const days = parseInt(url.searchParams.get("days") || "14", 10);
      if (!clientId) return err("clientId required");
      const cutoff = new Date(Date.now() - days * 86400_000).toISOString().slice(0, 10);
      const { results } = await env.DB.prepare(
        "SELECT * FROM competitor_history WHERE client_id = ?1 AND captured_date >= ?2 ORDER BY captured_date DESC, channel_id"
      ).bind(clientId, cutoff).all();
      return ok({ count: results.length, history: results });
    }

    // ---- /admin/agency/seo-history?clientId=X&limit=50
    if (path === "/admin/agency/seo-history" && method === "GET") {
      const clientId = url.searchParams.get("clientId");
      const limit = Math.min(parseInt(url.searchParams.get("limit") || "50", 10), 500);
      const stmt = clientId
        ? env.DB.prepare("SELECT * FROM seo_history WHERE client_id = ?1 ORDER BY created_at DESC LIMIT ?2").bind(clientId, limit)
        : env.DB.prepare("SELECT * FROM seo_history ORDER BY created_at DESC LIMIT ?1").bind(limit);
      const { results } = await stmt.all();
      return ok({ count: results.length, history: results });
    }

    // ---- /admin/agency/research/:clientId   (latest)
    // ---- /admin/agency/research/:clientId/:date  (specific date)
    const researchMatch = path.match(/^\/admin\/agency\/research\/([^\/]+)(?:\/(\d{4}-\d{2}-\d{2}))?$/);
    if (researchMatch && method === "GET") {
      const [, clientId, date] = researchMatch;
      const stmt = date
        ? env.DB.prepare("SELECT * FROM daily_research WHERE client_id = ?1 AND research_date = ?2").bind(clientId, date)
        : env.DB.prepare("SELECT * FROM daily_research WHERE client_id = ?1 ORDER BY research_date DESC LIMIT 1").bind(clientId);
      const r = await stmt.first();
      return r ? ok(r) : err("not found", 404);
    }

    // ---- /admin/agency/spikes?status=active
    if (path === "/admin/agency/spikes" && method === "GET") {
      const status = url.searchParams.get("status") || "active";
      const { results } = await env.DB.prepare(
        "SELECT * FROM news_spikes WHERE status = ?1 ORDER BY detected_at DESC LIMIT 100"
      ).bind(status).all();
      return ok({ count: results.length, spikes: results });
    }

    // ---- GET /admin/agency/projects/by-status (grouped for kanban)
    if (path === "/admin/agency/projects/by-status" && method === "GET") {
      const clientId = url.searchParams.get("clientId");
      const where = clientId ? "WHERE p.client_id = ?1 AND p.archived_at IS NULL" : "WHERE p.archived_at IS NULL";
      const q = `SELECT p.*, c.name AS client_name
                 FROM projects p LEFT JOIN clients c ON p.client_id = c.id
                 ${where} ORDER BY p.updated_at DESC LIMIT 500`;
      const stmt = clientId ? env.DB.prepare(q).bind(clientId) : env.DB.prepare(q);
      const { results } = await stmt.all();
      const grouped = {};
      for (const p of (results || [])) {
        const s = p.status || "idea";
        (grouped[s] = grouped[s] || []).push(p);
      }
      return ok({ count: (results || []).length, grouped });
    }

    // ---- POST /admin/agency/projects/auto-import-pulse
    // Imports pulse_activities (recent uploads) as projects with status='live'.
    // Idempotent: skips pulses whose youtube_video_id already has a project.
    //
    // NOTE: pulse_activities.client_id stores the YOUTUBE channel ID (UCxxx),
    // not clients.id — confirmed by the existing pulse-feed JOIN at
    // worker.js:2473 (JOIN clients c ON p.client_id = c.youtube_id). We join
    // through clients.youtube_id to get the proper clients.id for the FK.
    if (path === "/admin/agency/projects/auto-import-pulse" && method === "POST") {
      const body = await request.json().catch(() => ({}));
      const days = parseInt(body.days || url.searchParams.get("days") || "30", 10);
      const cutoffTs = Date.now() - days * 86400_000;
      const { results: pulses } = await env.DB.prepare(
        `SELECT pa.id, c.id AS client_id, pa.youtube_video_id, pa.title, pa.published_at, pa.url, pa.timestamp
         FROM pulse_activities pa
         LEFT JOIN clients c ON pa.client_id = c.youtube_id
         WHERE pa.timestamp >= ?1 AND c.id IS NOT NULL
         ORDER BY pa.timestamp DESC LIMIT 500`
      ).bind(cutoffTs).all();

      const { results: existing } = await env.DB.prepare(
        `SELECT youtube_video_id FROM projects WHERE youtube_video_id IS NOT NULL`
      ).all();
      const existingSet = new Set((existing || []).map(r => r.youtube_video_id));

      const stmts = [];
      let imported = 0;
      let skipped_existing = 0;
      for (const p of (pulses || [])) {
        if (!p.youtube_video_id) continue;
        if (existingSet.has(p.youtube_video_id)) { skipped_existing++; continue; }
        const title = p.title || "(no title)";
        const isShort = /shorts?\b|#shorts/i.test(title);
        const isLive = /\bLIVE\b/i.test(title);
        const assetType = isLive ? "live" : isShort ? "short" : "long-form";
        const id = crypto.randomUUID();
        const postedTs = p.published_at ? Math.floor(new Date(p.published_at).getTime() / 1000) : Math.floor(Date.now() / 1000);
        stmts.push(env.DB.prepare(
          `INSERT INTO projects (id, client_id, title, asset_type, status, youtube_video_id, scheduled_publish_at, completed_at, posted_at, created_at, updated_at)
           VALUES (?1, ?2, ?3, ?4, 'posted', ?5, ?6, ?6, ?7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
        ).bind(id, p.client_id, title.slice(0, 250), assetType, p.youtube_video_id, p.published_at || null, postedTs));
        imported++;
      }
      if (stmts.length > 0) await env.DB.batch(stmts);

      await env.DB.prepare(
        `INSERT INTO agent_log (action, level, message, payload_json) VALUES (?1, ?2, ?3, ?4)`
      ).bind(
        "projects.auto_import",
        "info",
        `Auto-imported ${imported} projects from pulse_activities (last ${days}d)`,
        JSON.stringify({ days, imported, skipped_existing, total_pulses: (pulses || []).length })
      ).run();

      return ok({ imported, skipped_existing, total_pulses: (pulses || []).length, days });
    }

    // ---- /admin/agency/projects?clientId=X&status=Y
    if (path === "/admin/agency/projects" && method === "GET") {
      const clientId = url.searchParams.get("clientId");
      const status = url.searchParams.get("status");
      let q = "SELECT * FROM projects WHERE 1=1";
      const binds = [];
      if (clientId) { q += " AND client_id = ?"; binds.push(clientId); }
      if (status)   { q += " AND status = ?";    binds.push(status); }
      q += " ORDER BY updated_at DESC LIMIT 200";
      const { results } = await env.DB.prepare(q).bind(...binds).all();
      return ok({ count: results.length, projects: results });
    }

    // ---- POST /admin/agency/projects  (create)
    if (path === "/admin/agency/projects" && method === "POST") {
      const body = await request.json().catch(() => ({}));
      if (!body.client_id || !body.title) return err("client_id and title required");
      const id = crypto.randomUUID();
      await env.DB.prepare(
        `INSERT INTO projects (id, client_id, title, asset_type, status, brief_md, due_date, scheduled_publish_at, tags_json, metadata_json)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)`
      ).bind(
        id,
        body.client_id,
        body.title,
        body.asset_type || null,
        body.status || "planned",
        body.brief_md || null,
        body.due_date || null,
        body.scheduled_publish_at || null,
        body.tags ? JSON.stringify(body.tags) : null,
        body.metadata ? JSON.stringify(body.metadata) : null
      ).run();
      return ok({ id, created: true }, 201);
    }

    // ---- PATCH /admin/agency/projects/:id  (update status / fields)
    //
    // Status changes also stamp the relevant *_at timestamp columns and fire a
    // Discord webhook on the user-visible transitions (paid, posted,
    // added-to-website). Old project pre-fetched so we can diff status.
    const projectMatch = path.match(/^\/admin\/agency\/projects\/([^\/]+)$/);
    if (projectMatch && method === "PATCH") {
      const id = projectMatch[1];
      const body = await request.json().catch(() => ({}));
      const allowed = ["title", "asset_type", "status", "assigned_editor_id", "brief_md", "due_date", "scheduled_publish_at", "youtube_video_id", "instagram_post_id", "editor_payment_inr"];

      // Validate status if provided
      if (body.status !== undefined && !PROJECT_STATUSES.includes(body.status)) {
        return err(`status must be one of: ${PROJECT_STATUSES.join(", ")}`);
      }

      // Pre-fetch old project for status diff + Discord context
      const old = await env.DB.prepare(
        `SELECT p.*, c.name AS client_name, c.discord_webhook_url AS client_discord_webhook,
                e.name AS editor_name
         FROM projects p
         LEFT JOIN clients c ON p.client_id = c.id
         LEFT JOIN editors e ON p.assigned_editor_id = e.id
         WHERE p.id = ?1`
      ).bind(id).first();
      if (!old) return err("project not found", 404);

      const sets = [];
      const binds = [];
      let i = 1;
      for (const k of allowed) if (body[k] !== undefined) { sets.push(`${k} = ?${i++}`); binds.push(body[k]); }
      if (!sets.length) return err("no valid fields to update");

      // Timestamp columns when status changes to one of our checkpoints
      const nowSec = Math.floor(Date.now() / 1000);
      const statusChanged = body.status !== undefined && body.status !== old.status;
      if (statusChanged) {
        if (body.status === "paid"             && !old.paid_at)             { sets.push(`paid_at = ?${i++}`);             binds.push(nowSec); }
        if (body.status === "posted"           && !old.posted_at)           { sets.push(`posted_at = ?${i++}`);           binds.push(nowSec); }
        if (body.status === "added-to-website" && !old.added_to_website_at) { sets.push(`added_to_website_at = ?${i++}`); binds.push(nowSec); }
      }

      sets.push(`updated_at = CURRENT_TIMESTAMP`);
      binds.push(id);
      await env.DB.prepare(`UPDATE projects SET ${sets.join(", ")} WHERE id = ?${i}`).bind(...binds).run();

      // Fire Discord webhook for user-visible transitions (paid/posted/added-to-website)
      // Route by event type: paid → finance channel; posted/added-to-website → ops.
      if (statusChanged && ["paid", "posted", "added-to-website"].includes(body.status)) {
        const emoji = body.status === "paid" ? "💰" : body.status === "posted" ? "🎬" : "🌐";
        const labels = { paid: "Paid", posted: "Posted", "added-to-website": "Added to website" };
        const channel = body.status === "paid" ? "finance" : "ops";
        const lines = [
          `${emoji} **${labels[body.status]}** — ${old.title}`,
          `· Client: ${old.client_name || old.client_id}`,
        ];
        if (old.editor_name) lines.push(`· Editor: ${old.editor_name}`);
        if (body.status === "paid" && old.editor_payment_inr) {
          lines.push(`· Amount: ₹${old.editor_payment_inr.toLocaleString("en-IN")}`);
        }
        if (body.status === "posted" && old.youtube_video_id) {
          lines.push(`· https://youtu.be/${old.youtube_video_id}`);
        }
        const payload = { content: lines.join("\n") };
        // fire-and-forget — don't await on hot path
        postToDiscord(env, payload, channel).catch(() => {});

        // ALSO fire to the per-client webhook if the client has one configured.
        // Lets you have a #aish-is-live channel that gets pinged for AiSH only,
        // in addition to the global ops/finance feeds.
        if (old.client_discord_webhook) {
          fetch(old.client_discord_webhook, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              username: `Shinel · ${old.client_name || "Client"}`,
              ...payload,
            }),
          }).catch(() => {});
        }
      }

      return ok({ id, updated: true, status_changed: statusChanged });
    }

    // ---- GET /admin/agency/agent-log?level=warn&limit=100
    if (path === "/admin/agency/agent-log" && method === "GET") {
      const level = url.searchParams.get("level");
      const clientId = url.searchParams.get("clientId");
      const limit = Math.min(parseInt(url.searchParams.get("limit") || "100", 10), 500);
      let q = "SELECT * FROM agent_log WHERE 1=1";
      const binds = [];
      if (level) { q += " AND level = ?"; binds.push(level); }
      if (clientId) { q += " AND client_id = ?"; binds.push(clientId); }
      q += " ORDER BY created_at DESC LIMIT ?";
      binds.push(limit);
      const { results } = await env.DB.prepare(q).bind(...binds).all();
      return ok({ count: results.length, log: results });
    }

    // ---- POST /admin/agency/agent-log  (worker-side scheduled tasks call this)
    if (path === "/admin/agency/agent-log" && method === "POST") {
      const body = await request.json().catch(() => ({}));
      if (!body.action) return err("action required");
      await env.DB.prepare(
        `INSERT INTO agent_log (action, client_id, level, message, payload_json) VALUES (?1, ?2, ?3, ?4, ?5)`
      ).bind(
        body.action,
        body.client_id || null,
        body.level || "info",
        body.message || null,
        body.payload ? JSON.stringify(body.payload) : null
      ).run();
      return ok({ logged: true }, 201);
    }

    // ---- POST /admin/agency/clients/:id/status   (mark active/inactive/paused)
    const clientStatusMatch = path.match(/^\/admin\/agency\/clients\/([^\/]+)\/status$/);
    if (clientStatusMatch && method === "POST") {
      const id = clientStatusMatch[1];
      const body = await request.json().catch(() => ({}));
      const newStatus = String(body.status || "").toLowerCase();
      if (!["active", "inactive", "paused"].includes(newStatus)) {
        return err("status must be active|inactive|paused");
      }
      await env.DB.prepare("UPDATE clients SET status = ?1 WHERE id = ?2").bind(newStatus, id).run();
      // Audit
      await env.DB.prepare(
        `INSERT INTO agent_log (action, client_id, level, message, payload_json) VALUES (?1, ?2, ?3, ?4, ?5)`
      ).bind("client.status", id, "info", `Status → ${newStatus}`, JSON.stringify(body)).run();
      return ok({ id, status: newStatus, updated: true });
    }

    // ---- Google Sheets export (CSV) for IMPORTDATA() in a Sheet -------------
    // Public endpoint protected by a URL token (long random string in env).
    // Client sets up their Sheet with:
    //   =IMPORTDATA("https://shinel-auth.shinelstudioofficial.workers.dev/admin/agency/sheets-export/clients.csv?token=XYZ")
    // Sheets auto-refreshes IMPORTDATA every hour.
    const sheetsExportMatch = path.match(/^\/admin\/agency\/sheets-export\/([a-z]+)\.csv$/);
    if (sheetsExportMatch && method === "GET") {
      const expectedToken = env.SHEETS_EXPORT_TOKEN || "";
      const providedToken = url.searchParams.get("token") || "";
      if (!expectedToken || providedToken !== expectedToken) {
        return new Response("Unauthorized — set SHEETS_EXPORT_TOKEN secret + pass ?token=...", {
          status: 401,
          headers: { "Content-Type": "text/plain" },
        });
      }
      const kind = sheetsExportMatch[1];
      let csvRows = [];
      if (kind === "clients") {
        const { results } = await env.DB.prepare(
          `SELECT id, name, niche_tag, secondary_niche_tag, retainer_tier, status, COALESCE(managed_by_us, 1) AS managed_by_us, subscribers, instagram_handle, drive_folder_url, onboarded_at FROM clients ORDER BY name`
        ).all();
        csvRows.push(["id", "name", "niche_tag", "secondary_niche_tag", "retainer_tier", "status", "managed_by_us", "subscribers", "instagram_handle", "drive_folder_url", "onboarded_at"]);
        for (const r of results || []) csvRows.push(Object.values(r).map(v => v == null ? "" : v));
      } else if (kind === "editors") {
        const { results } = await env.DB.prepare(
          `SELECT id, name, email, phone, role, compensation_type, monthly_salary_inr, payment_rate_inr, payment_per, active FROM editors ORDER BY active DESC, name`
        ).all();
        csvRows.push(["id", "name", "email", "phone", "role", "compensation_type", "monthly_salary_inr", "payment_rate_inr", "payment_per", "active"]);
        for (const r of results || []) csvRows.push(Object.values(r).map(v => v == null ? "" : v));
      } else if (kind === "projects") {
        const { results } = await env.DB.prepare(
          `SELECT p.id, c.name AS client_name, p.title, p.asset_type, p.status, e.name AS editor_name, p.editor_payment_inr, p.due_date, p.scheduled_publish_at, p.completed_at, p.created_at
           FROM projects p
           LEFT JOIN clients c ON p.client_id = c.id
           LEFT JOIN editors e ON p.assigned_editor_id = e.id
           WHERE p.archived_at IS NULL
           ORDER BY p.updated_at DESC LIMIT 1000`
        ).all();
        csvRows.push(["id", "client_name", "title", "asset_type", "status", "editor_name", "editor_payment_inr", "due_date", "scheduled_publish_at", "completed_at", "created_at"]);
        for (const r of results || []) csvRows.push(Object.values(r).map(v => v == null ? "" : v));
      } else if (kind === "payments") {
        // All editor payments — for monthly P&L tracking in the sheet
        const { results } = await env.DB.prepare(
          `SELECT p.title AS project_title, c.name AS client_name, e.name AS editor_name, e.compensation_type, p.editor_payment_inr, p.status, p.completed_at
           FROM projects p
           LEFT JOIN clients c ON p.client_id = c.id
           LEFT JOIN editors e ON p.assigned_editor_id = e.id
           WHERE p.assigned_editor_id IS NOT NULL AND p.editor_payment_inr > 0
           ORDER BY p.completed_at DESC LIMIT 1000`
        ).all();
        csvRows.push(["project_title", "client_name", "editor_name", "compensation_type", "amount_inr", "project_status", "completed_at"]);
        for (const r of results || []) csvRows.push(Object.values(r).map(v => v == null ? "" : v));
      } else {
        return new Response(`Unknown export "${kind}". Available: clients, editors, projects, payments`, {
          status: 404,
          headers: { "Content-Type": "text/plain" },
        });
      }
      // Build CSV (RFC 4180-ish)
      const csv = csvRows.map(row =>
        row.map(cell => {
          const s = String(cell);
          if (s.includes(",") || s.includes('"') || s.includes("\n")) {
            return `"${s.replace(/"/g, '""')}"`;
          }
          return s;
        }).join(",")
      ).join("\n");
      return new Response(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Cache-Control": "max-age=600",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    // ---- Set per-client Discord webhook URL ---------------------------------
    // POST /admin/agency/clients/:id/discord  body: { discord_webhook_url: "..." }
    // When set, status-change pings (paid/posted/on-website) AND new YouTube
    // upload notifications fire to this URL too. Pass null to clear.
    const discordMatch = path.match(/^\/admin\/agency\/clients\/([^\/]+)\/discord$/);
    if (discordMatch && method === "POST") {
      const id = discordMatch[1];
      const body = await request.json().catch(() => ({}));
      const webhookUrl = body.discord_webhook_url || null;
      if (webhookUrl && !/^https:\/\/discord\.com\/api\/webhooks\/\d+\/[\w-]+$/.test(webhookUrl)) {
        return err("discord_webhook_url must be a valid Discord webhook URL (https://discord.com/api/webhooks/...)");
      }
      await env.DB.prepare(
        "UPDATE clients SET discord_webhook_url = ?1 WHERE id = ?2"
      ).bind(webhookUrl, id).run();
      await env.DB.prepare(
        "INSERT INTO agent_log (action, client_id, level, message, payload_json) VALUES (?1, ?2, ?3, ?4, ?5)"
      ).bind("client.discord_webhook", id, "info", webhookUrl ? "Discord webhook set" : "Discord webhook cleared", JSON.stringify({ has_url: !!webhookUrl })).run();
      return ok({ id, discord_webhook_url: webhookUrl, updated: true });
    }

    // ---- Set per-client Drive folder URL ------------------------------------
    const driveMatch = path.match(/^\/admin\/agency\/clients\/([^\/]+)\/drive$/);
    if (driveMatch && method === "POST") {
      const id = driveMatch[1];
      const body = await request.json().catch(() => ({}));
      const driveUrl = body.drive_folder_url || null;
      // Try to extract folder ID from URL
      const m = driveUrl ? driveUrl.match(/\/folders\/([a-zA-Z0-9_-]+)/) : null;
      const driveId = m ? m[1] : null;
      await env.DB.prepare(
        "UPDATE clients SET drive_folder_url = ?1, drive_folder_id = ?2 WHERE id = ?3"
      ).bind(driveUrl, driveId, id).run();
      await env.DB.prepare(
        "INSERT INTO agent_log (action, client_id, level, message, payload_json) VALUES (?1, ?2, ?3, ?4, ?5)"
      ).bind("client.drive_folder", id, "info", `Drive folder set: ${driveUrl}`, JSON.stringify({ drive_folder_id: driveId })).run();
      return ok({ id, drive_folder_url: driveUrl, drive_folder_id: driveId, updated: true });
    }

    // ---- Editor roster CRUD --------------------------------------------------
    // GET /admin/agency/editors  — list (active by default; ?include_inactive=true for all)
    if (path === "/admin/agency/editors" && method === "GET") {
      const includeInactive = url.searchParams.get("include_inactive") === "true";
      const where = includeInactive ? "" : "WHERE active = 1";
      const { results } = await env.DB.prepare(
        `SELECT id, name, email, phone, role, skills_json, payment_rate_inr, payment_per, compensation_type, monthly_salary_inr, discord_user_id, active, joined_at, notes FROM editors ${where} ORDER BY active DESC, name`
      ).all();
      return ok({ count: (results || []).length, editors: results });
    }

    // POST /admin/agency/editors  — create
    if (path === "/admin/agency/editors" && method === "POST") {
      const body = await request.json().catch(() => ({}));
      if (!body.name) return err("name required");
      const id = body.id || crypto.randomUUID();
      try {
        await env.DB.prepare(
          `INSERT INTO editors (id, name, email, phone, role, skills_json, payment_rate_inr, payment_per, compensation_type, monthly_salary_inr, discord_user_id, notes, active)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, 1)`
        ).bind(
          id,
          body.name,
          body.email || null,
          body.phone || null,
          body.role || "editor",
          body.skills ? JSON.stringify(body.skills) : null,
          parseInt(body.payment_rate_inr || 0, 10),
          body.payment_per || "video",
          body.compensation_type === "salary" ? "salary" : "freelance",
          parseInt(body.monthly_salary_inr || 0, 10),
          body.discord_user_id ? String(body.discord_user_id).replace(/\D/g, "") : null,
          body.notes || null
        ).run();
        return ok({ id, created: true }, 201);
      } catch (e) {
        if (String(e.message || "").includes("UNIQUE")) return err(`Email "${body.email}" already exists`, 409);
        throw e;
      }
    }

    // PATCH /admin/agency/editors/:id  — update
    const editorMatch = path.match(/^\/admin\/agency\/editors\/([^\/]+)$/);
    if (editorMatch && method === "PATCH") {
      const id = editorMatch[1];
      const body = await request.json().catch(() => ({}));
      const allowed = ["name", "email", "phone", "role", "payment_rate_inr", "payment_per", "compensation_type", "monthly_salary_inr", "discord_user_id", "active", "notes"];
      const sets = [];
      const binds = [];
      let i = 1;
      for (const k of allowed) if (body[k] !== undefined) {
        sets.push(`${k} = ?${i++}`);
        binds.push(typeof body[k] === "boolean" ? (body[k] ? 1 : 0) : body[k]);
      }
      if (body.skills !== undefined) {
        sets.push(`skills_json = ?${i++}`);
        binds.push(JSON.stringify(body.skills));
      }
      if (!sets.length) return err("no valid fields");
      binds.push(id);
      await env.DB.prepare(`UPDATE editors SET ${sets.join(", ")} WHERE id = ?${i}`).bind(...binds).run();
      return ok({ id, updated: true });
    }

    // DELETE /admin/agency/editors/:id  — soft-delete (active=0)
    if (editorMatch && method === "DELETE") {
      const id = editorMatch[1];
      await env.DB.prepare("UPDATE editors SET active = 0 WHERE id = ?1").bind(id).run();
      return ok({ id, deleted: true });
    }

    // ---- Instagram accounts CRUD --------------------------------------------
    // GET /admin/agency/instagram[?clientId=X]  — list
    if (path === "/admin/agency/instagram" && method === "GET") {
      const clientId = url.searchParams.get("clientId");
      const stmt = clientId
        ? env.DB.prepare("SELECT * FROM instagram_accounts WHERE client_id = ?1 AND active = 1 ORDER BY managed_by_us DESC, role, handle").bind(clientId)
        : env.DB.prepare("SELECT * FROM instagram_accounts WHERE active = 1 ORDER BY client_id, managed_by_us DESC, handle");
      const { results } = await stmt.all();
      return ok({ count: (results || []).length, accounts: results });
    }

    // POST /admin/agency/instagram — create
    if (path === "/admin/agency/instagram" && method === "POST") {
      const body = await request.json().catch(() => ({}));
      if (!body.client_id || !body.handle) return err("client_id and handle required");
      const cleanHandle = String(body.handle).trim();
      const id = body.id || crypto.randomUUID();
      const url2 = body.url || `https://instagram.com/${cleanHandle.replace(/^@/, "")}`;
      try {
        await env.DB.prepare(
          `INSERT INTO instagram_accounts (id, client_id, handle, url, role, managed_by_us, followers, notes, active)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 1)`
        ).bind(
          id,
          body.client_id,
          cleanHandle,
          url2,
          body.role || "main",
          body.managed_by_us ? 1 : 0,
          body.followers || 0,
          body.notes || null
        ).run();
        return ok({ id, created: true }, 201);
      } catch (e) {
        if (String(e.message || "").includes("UNIQUE")) return err(`Handle "${cleanHandle}" already exists`, 409);
        throw e;
      }
    }

    // PATCH /admin/agency/instagram/:id — update
    const igMatch = path.match(/^\/admin\/agency\/instagram\/([^\/]+)$/);
    if (igMatch && method === "PATCH") {
      const id = igMatch[1];
      const body = await request.json().catch(() => ({}));
      const allowed = ["handle", "url", "role", "managed_by_us", "followers", "fb_page_id", "business_account_linked", "notes", "active"];
      const sets = [];
      const binds = [];
      let i = 1;
      for (const k of allowed) if (body[k] !== undefined) {
        sets.push(`${k} = ?${i++}`);
        binds.push(typeof body[k] === "boolean" ? (body[k] ? 1 : 0) : body[k]);
      }
      if (!sets.length) return err("no valid fields");
      sets.push("updated_at = CURRENT_TIMESTAMP");
      binds.push(id);
      await env.DB.prepare(`UPDATE instagram_accounts SET ${sets.join(", ")} WHERE id = ?${i}`).bind(...binds).run();
      return ok({ id, updated: true });
    }

    // DELETE /admin/agency/instagram/:id — soft-delete (set active=0)
    if (igMatch && method === "DELETE") {
      const id = igMatch[1];
      await env.DB.prepare("UPDATE instagram_accounts SET active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?1").bind(id).run();
      return ok({ id, deleted: true });
    }

    // ---- POST /admin/agency/weekly-digest/run  — manual trigger (force=true)
    if (path === "/admin/agency/weekly-digest/run" && method === "POST") {
      const body = await request.json().catch(() => ({}));
      const result = await runWeeklyDigest(env, { force: !!body.force });
      return ok(result);
    }

    // ---- POST /admin/agency/editor-summary/run  — manual trigger
    if (path === "/admin/agency/editor-summary/run" && method === "POST") {
      const body = await request.json().catch(() => ({}));
      const result = await runEditorSummary(env, { force: !!body.force });
      return ok(result);
    }

    // ---- POST /admin/agency/projects/auto-promote-website
    //
    // Promotes projects from status='posted' to 'added-to-website' when their
    // youtube_video_id has been curated into media_library (i.e. category is
    // anything OTHER than the auto-pulse default — the user's portfolio
    // workflow tags videos with curated categories like 'WORK', 'PORTFOLIO',
    // etc.). Idempotent: only flips projects that aren't already there.
    //
    // Returns the list of promoted project IDs so the cron can fire Discord.
    if (path === "/admin/agency/projects/auto-promote-website" && method === "POST") {
      const result = await runAutoPromoteToWebsite(env);
      return ok(result);
    }

    // ---- POST /admin/agency/discord/test  — manual webhook ping
    // Body: { channel?: "default"|"ops"|"finance", message?: string }
    if (path === "/admin/agency/discord/test" && method === "POST") {
      const body = await request.json().catch(() => ({}));
      const allowed = ["default", "ops", "finance", "client-uploads", "shinel-uploads"];
      const channel = allowed.includes(body.channel) ? body.channel : "default";
      const msg = body.message || `🔔 Test ping (${channel}) from Shinel Cockpit · ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST`;
      const result = await postToDiscord(env, msg, channel);
      return ok({
        result,
        configured_channels: {
          default: !!env.DISCORD_WEBHOOK_URL,
          ops: !!env.DISCORD_OPS_WEBHOOK_URL,
          finance: !!env.DISCORD_FINANCE_WEBHOOK_URL,
          "client-uploads": !!env.DISCORD_CLIENT_UPLOADS_WEBHOOK_URL,
          "shinel-uploads": !!env.DISCORD_SHINEL_UPLOADS_WEBHOOK_URL,
        },
      });
    }

    // ---- GET /admin/agency/finance/summary  — monthly P&L view
    //
    // Returns: this month's freelance outflow (paid projects), salary commitments,
    // pending freelance (assigned but not yet 'paid'), per-client cost breakdown,
    // per-editor payouts. Drives the cockpit Finance section.
    if (path === "/admin/agency/finance/summary" && method === "GET") {
      const monthStart = new Date();
      monthStart.setUTCDate(1); monthStart.setUTCHours(0, 0, 0, 0);
      const monthStartSec = Math.floor(monthStart.getTime() / 1000);

      // Freelance paid this month: projects where status='paid' AND paid_at >= monthStart
      const { results: paidThisMonth } = await env.DB.prepare(
        `SELECT p.id, p.title, p.editor_payment_inr, p.paid_at,
                c.id AS client_id, c.name AS client_name,
                e.id AS editor_id, e.name AS editor_name, e.compensation_type
         FROM projects p
         LEFT JOIN clients c ON p.client_id = c.id
         LEFT JOIN editors e ON p.assigned_editor_id = e.id
         WHERE p.status = 'paid' AND p.paid_at >= ?1 AND p.editor_payment_inr > 0`
      ).bind(monthStartSec).all();

      // Pending freelance: completed but not yet paid (assigned to a freelance editor)
      const { results: pending } = await env.DB.prepare(
        `SELECT p.id, p.title, p.editor_payment_inr, p.status,
                c.name AS client_name, e.name AS editor_name
         FROM projects p
         LEFT JOIN clients c ON p.client_id = c.id
         LEFT JOIN editors e ON p.assigned_editor_id = e.id
         WHERE p.status IN ('completed', 'posted', 'added-to-website')
           AND p.editor_payment_inr > 0
           AND e.compensation_type = 'freelance'
           AND p.archived_at IS NULL`
      ).all();

      // Salary commitments: sum monthly_salary_inr for active salary editors
      const { results: salaryEditors } = await env.DB.prepare(
        `SELECT id, name, monthly_salary_inr FROM editors
         WHERE active = 1 AND compensation_type = 'salary' AND monthly_salary_inr > 0`
      ).all();

      // Aggregate by client + editor for paid this month
      const byClient = {};
      const byEditor = {};
      let totalFreelancePaid = 0;
      for (const r of paidThisMonth || []) {
        const amt = r.editor_payment_inr || 0;
        totalFreelancePaid += amt;
        if (r.client_id) {
          byClient[r.client_id] = byClient[r.client_id] || { client_id: r.client_id, client_name: r.client_name, total: 0, count: 0 };
          byClient[r.client_id].total += amt;
          byClient[r.client_id].count += 1;
        }
        if (r.editor_id) {
          byEditor[r.editor_id] = byEditor[r.editor_id] || { editor_id: r.editor_id, editor_name: r.editor_name, total: 0, count: 0 };
          byEditor[r.editor_id].total += amt;
          byEditor[r.editor_id].count += 1;
        }
      }

      const totalSalary = (salaryEditors || []).reduce((s, e) => s + (e.monthly_salary_inr || 0), 0);
      const totalPending = (pending || []).reduce((s, p) => s + (p.editor_payment_inr || 0), 0);

      return ok({
        month: monthStart.toISOString().slice(0, 7),
        totals: {
          freelance_paid_this_month: totalFreelancePaid,
          salary_monthly: totalSalary,
          total_outflow_this_month: totalFreelancePaid + totalSalary,
          freelance_pending: totalPending,
        },
        by_client: Object.values(byClient).sort((a, b) => b.total - a.total),
        by_editor: Object.values(byEditor).sort((a, b) => b.total - a.total),
        salary_editors: salaryEditors || [],
        pending_payments: pending || [],
        paid_this_month_count: (paidThisMonth || []).length,
      });
    }

    // ---- GET /admin/agency/clients/:id/full  — per-client deep-dive bundle
    //
    // Returns everything needed for the /dashboard/clients/:id page in one
    // round trip: client row, channels, IGs, recent projects (all statuses),
    // latest research, RESEO history, competitor delta, finance summary.
    const clientFullMatch = path.match(/^\/admin\/agency\/clients\/([^\/]+)\/full$/);
    if (clientFullMatch && method === "GET") {
      const clientId = clientFullMatch[1];
      const today = new Date().toISOString().slice(0, 10);

      const [
        client,
        channels,
        igAccounts,
        projects,
        latestResearch,
        recentSeo,
        competitorHistory,
        agentLog,
      ] = await Promise.all([
        env.DB.prepare("SELECT * FROM clients WHERE id = ?1").bind(clientId).first(),
        env.DB.prepare("SELECT * FROM client_channels WHERE client_id = ?1 AND active = 1 ORDER BY role, handle").bind(clientId).all(),
        env.DB.prepare("SELECT * FROM instagram_accounts WHERE client_id = ?1 AND active = 1 ORDER BY managed_by_us DESC, role, handle").bind(clientId).all(),
        env.DB.prepare(
          `SELECT p.*, e.name AS editor_name, e.compensation_type AS editor_comp
           FROM projects p
           LEFT JOIN editors e ON p.assigned_editor_id = e.id
           WHERE p.client_id = ?1 AND p.archived_at IS NULL
           ORDER BY p.updated_at DESC LIMIT 100`
        ).bind(clientId).all(),
        env.DB.prepare("SELECT * FROM daily_research WHERE client_id = ?1 ORDER BY research_date DESC LIMIT 7").bind(clientId).all(),
        env.DB.prepare("SELECT * FROM seo_history WHERE client_id = ?1 ORDER BY created_at DESC LIMIT 50").bind(clientId).all(),
        env.DB.prepare(
          `SELECT * FROM competitor_history WHERE client_id = ?1
           ORDER BY captured_date DESC LIMIT 30`
        ).bind(clientId).all(),
        env.DB.prepare(
          `SELECT id, action, level, message, created_at FROM agent_log
           WHERE client_id = ?1 ORDER BY created_at DESC LIMIT 50`
        ).bind(clientId).all(),
      ]);

      if (!client) return err("client not found", 404);

      // Lifetime finance for this client
      const finance = await env.DB.prepare(
        `SELECT
           COUNT(CASE WHEN status='paid' THEN 1 END) AS paid_count,
           COALESCE(SUM(CASE WHEN status='paid' THEN editor_payment_inr ELSE 0 END), 0) AS paid_total,
           COALESCE(SUM(CASE WHEN status IN ('completed','posted','added-to-website') AND editor_payment_inr > 0 THEN editor_payment_inr ELSE 0 END), 0) AS pending_total,
           COUNT(CASE WHEN status='posted' OR status='added-to-website' THEN 1 END) AS posted_count
         FROM projects WHERE client_id = ?1 AND archived_at IS NULL`
      ).bind(clientId).first();

      // Project status breakdown (for mini-kanban)
      const { results: statusCounts } = await env.DB.prepare(
        `SELECT status, COUNT(*) AS n FROM projects
         WHERE client_id = ?1 AND archived_at IS NULL GROUP BY status`
      ).bind(clientId).all();

      return ok({
        client,
        channels: channels.results || [],
        instagram_accounts: igAccounts.results || [],
        projects: projects.results || [],
        latest_research: latestResearch.results || [],
        recent_seo: recentSeo.results || [],
        competitor_history: competitorHistory.results || [],
        agent_log: agentLog.results || [],
        finance,
        status_counts: Object.fromEntries((statusCounts || []).map(r => [r.status, r.n])),
        today,
      });
    }

    // ---- GET /admin/agency/diag/pulse  — pulse cron diagnostics
    //
    // Surfaces why pulse_activities might be empty: row counts, last sync
    // timestamps, registered cron triggers, recent agent_log entries from
    // the cron, available YT API keys, and which clients have a youtube_id
    // mapped (since pulse uses clients.youtube_id as the join column).
    if (path === "/admin/agency/diag/pulse" && method === "GET") {
      const [
        pulseCount,
        pulseRecent,
        pulseByClient,
        clientsWithYtId,
        clientsWithoutYtId,
        recentCronLogs,
      ] = await Promise.all([
        env.DB.prepare("SELECT COUNT(*) AS n, MAX(timestamp) AS latest_ts, MIN(timestamp) AS earliest_ts FROM pulse_activities").first(),
        env.DB.prepare(
          `SELECT id, client_id, title, youtube_video_id, published_at, timestamp
           FROM pulse_activities ORDER BY timestamp DESC LIMIT 10`
        ).all(),
        env.DB.prepare(
          `SELECT client_id, COUNT(*) AS n, MAX(timestamp) AS latest_ts FROM pulse_activities
           GROUP BY client_id ORDER BY latest_ts DESC LIMIT 50`
        ).all(),
        env.DB.prepare("SELECT id, name, youtube_id FROM clients WHERE youtube_id IS NOT NULL AND youtube_id != '' AND (status = 'active' OR status IS NULL) ORDER BY name").all(),
        env.DB.prepare("SELECT id, name FROM clients WHERE (youtube_id IS NULL OR youtube_id = '') AND (status = 'active' OR status IS NULL) ORDER BY name").all(),
        env.DB.prepare(
          `SELECT id, action, level, message, payload_json, created_at FROM agent_log
           WHERE action LIKE 'pulse%' OR action LIKE 'cron%' OR action LIKE 'sync%'
           ORDER BY created_at DESC LIMIT 30`
        ).all(),
      ]);

      // Count YT API keys configured (don't return values)
      const ytKeyCount = ["YT_API_KEY", "YT_API_KEY_2", "YT_API_KEY_3", "YT_API_KEY_4", "YT_API_KEY_5", "YT_API_KEY_6", "YT_API_KEY_7", "YT_API_KEY_8"]
        .filter(k => env[k]).length;

      return ok({
        pulse_total: pulseCount.n,
        pulse_latest_ts: pulseCount.latest_ts,
        pulse_earliest_ts: pulseCount.earliest_ts,
        pulse_recent: pulseRecent.results || [],
        pulse_by_client: pulseByClient.results || [],
        clients_with_youtube_id: (clientsWithYtId.results || []).length,
        clients_with_youtube_id_list: clientsWithYtId.results || [],
        clients_missing_youtube_id: (clientsWithoutYtId.results || []).length,
        clients_missing_youtube_id_list: clientsWithoutYtId.results || [],
        yt_api_keys_configured: ytKeyCount,
        recent_cron_logs: recentCronLogs.results || [],
        diagnostics_generated_at: new Date().toISOString(),
      });
    }

    // (Laptop queue endpoints + public stats are handled BEFORE the team auth
    // gate higher up in this file — they have their own dual-auth path.)

    // ---- GET /admin/agency/clients/full
    // Returns clients with their channels. ?show_inactive=true includes archived.
    if (path === "/admin/agency/clients/full" && method === "GET") {
      const showInactive = url.searchParams.get("show_inactive") === "true";
      const where = showInactive ? "" : "WHERE status = 'active' OR status IS NULL";
      const { results: clients } = await env.DB.prepare(
        `SELECT id, name, youtube_id, instagram_handle, status, niche_tag, secondary_niche_tag, retainer_tier, soul_id, onboarded_at, subscribers FROM clients ${where} ORDER BY name`
      ).all();
      const { results: channels } = await env.DB.prepare(
        "SELECT client_id, channel_id, handle, role, language, niche_tag_override, studio_url FROM client_channels WHERE active = 1"
      ).all();
      const { results: igAccounts } = await env.DB.prepare(
        "SELECT client_id, id, handle, url, role, managed_by_us, followers FROM instagram_accounts WHERE active = 1 ORDER BY managed_by_us DESC, handle"
      ).all();
      const channelsByClient = {};
      const igByClient = {};
      for (const ch of channels) {
        (channelsByClient[ch.client_id] = channelsByClient[ch.client_id] || []).push(ch);
      }
      for (const ig of igAccounts) {
        (igByClient[ig.client_id] = igByClient[ig.client_id] || []).push(ig);
      }
      return ok({
        count: clients.length,
        clients: clients.map(c => ({
          ...c,
          channels: channelsByClient[c.id] || [],
          instagram_accounts: igByClient[c.id] || [],
        })),
      });
    }

  } catch (e) {
    console.error("[agency-handlers] error:", e);
    return err(e?.message || "internal error", 500);
  }

  // No route matched within /admin/agency/
  return null;
}

/**
 * opsSnapshot — single bundle for the React /dashboard/ops cockpit. One round
 * trip per dashboard refresh (every 30s). Polls all the slow stuff in
 * parallel via Promise.all.
 */
async function opsSnapshot(env, opts = {}) {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400_000).toISOString().slice(0, 10);
  const showInactive = !!opts.showInactive;

  // Active filter: by default only return clients we still work with.
  // status = 'active' OR NULL (legacy rows pre-status column) → active.
  const clientWhere = showInactive ? "" : "WHERE status = 'active' OR status IS NULL";

  // Run all reads in parallel
  const [
    clients,
    pendingSeo,
    recentSeo,
    activeSpikes,
    competitorOverperformers,
    todayResearch,
    recentAgentLog,
    projectsByStatus,
    clientCounts,
    ytChannelCounts,
    igAccountCounts,
  ] = await Promise.all([
    env.DB.prepare(
      `SELECT id, name, niche_tag, secondary_niche_tag, retainer_tier, subscribers, status,
              COALESCE(managed_by_us, 1) AS managed_by_us, instagram_handle, youtube_id,
              drive_folder_url
       FROM clients ${clientWhere} ORDER BY managed_by_us DESC, name`
    ).all(),

    // SEO entries with applied=0 (queued, awaiting writeback)
    env.DB.prepare(
      "SELECT id, client_id, asset_type, video_id, new_title, action, created_at FROM seo_history WHERE applied = 0 ORDER BY created_at DESC LIMIT 20"
    ).all(),

    // last 10 applied SEO actions (audit trail)
    env.DB.prepare(
      "SELECT id, client_id, asset_type, video_id, new_title, action, applied_at FROM seo_history WHERE applied = 1 ORDER BY applied_at DESC LIMIT 10"
    ).all(),

    env.DB.prepare(
      "SELECT id, niche_tag, title, spike_score, trend_window_end, detected_at FROM news_spikes WHERE status = 'active' ORDER BY detected_at DESC LIMIT 20"
    ).all(),

    // competitors whose latest snapshot has overperformers (>2× recent median)
    env.DB.prepare(
      `SELECT client_id, channel_id, captured_date, overperformers_json, subs
       FROM competitor_history
       WHERE captured_date = ?1 AND overperformers_json IS NOT NULL AND overperformers_json != '[]'
       ORDER BY client_id`
    ).bind(today).all(),

    env.DB.prepare(
      "SELECT client_id, research_date, health_score, content_menu_json FROM daily_research WHERE research_date = ?1"
    ).bind(today).all(),

    env.DB.prepare(
      "SELECT id, action, client_id, level, message, created_at FROM agent_log ORDER BY created_at DESC LIMIT 50"
    ).all(),

    env.DB.prepare(
      "SELECT status, COUNT(*) AS n FROM projects WHERE archived_at IS NULL GROUP BY status"
    ).all(),

    // Counts by client status — so the cockpit can show "13 active · 1 inactive"
    env.DB.prepare(
      "SELECT COALESCE(status, 'active') AS status, COUNT(*) AS n FROM clients GROUP BY COALESCE(status, 'active')"
    ).all(),

    // YT channel counts per client (for the per-row "3 YT" badge)
    env.DB.prepare(
      "SELECT client_id, COUNT(*) AS n, SUM(CASE WHEN role = 'main' THEN 0 ELSE 1 END) AS extras FROM client_channels WHERE active = 1 GROUP BY client_id"
    ).all(),

    // IG account counts per client (for the per-row "2 IG" badge)
    env.DB.prepare(
      "SELECT client_id, COUNT(*) AS n, SUM(managed_by_us) AS managed FROM instagram_accounts WHERE active = 1 GROUP BY client_id"
    ).all(),
  ]);

  // Map channel counts and ig counts onto each client row.
  // (note: variable names below come from destructuring above)
  const ytCountsByClient = {};
  for (const r of (typeof ytChannelCounts !== "undefined" && ytChannelCounts?.results) || []) {
    ytCountsByClient[r.client_id] = { n: r.n, extras: r.extras };
  }
  const igCountsByClient = {};
  for (const r of (typeof igAccountCounts !== "undefined" && igAccountCounts?.results) || []) {
    igCountsByClient[r.client_id] = { n: r.n, managed: r.managed };
  }
  const enrichedClients = (clients.results || []).map((c) => ({
    ...c,
    yt_channel_count: ytCountsByClient[c.id]?.n || 0,
    ig_account_count: igCountsByClient[c.id]?.n || 0,
    ig_managed_count: igCountsByClient[c.id]?.managed || 0,
  }));

  return {
    generated_at: now.toISOString(),
    today,
    yesterday,
    show_inactive: showInactive,
    clients: enrichedClients,
    client_counts: Object.fromEntries(
      (clientCounts.results || []).map(r => [r.status, r.n])
    ),
    pending_seo: pendingSeo.results,
    recent_seo: recentSeo.results,
    active_spikes: activeSpikes.results,
    competitor_overperformers: competitorOverperformers.results.map(r => ({
      ...r,
      overperformers: safeJsonParse(r.overperformers_json),
    })),
    today_research: todayResearch.results,
    recent_agent_log: recentAgentLog.results,
    projects_by_status: Object.fromEntries(
      projectsByStatus.results.map(r => [r.status, r.n])
    ),
  };
}

function safeJsonParse(s) {
  if (!s) return null;
  try { return JSON.parse(s); } catch { return null; }
}

// ---------------------------------------------------------------------------
// runAutoPromoteToWebsite — find projects (status='posted') whose video has
// been curated into media_library, and flip them to 'added-to-website'.
//
// "Curated" = the media_library row exists with a non-AUTO_PULSE category.
// AUTO_PULSE rows are the cron's automatic mirror of every YouTube upload —
// presence of a curated category is the user's signal that the asset is
// portfolio-ready / on the public site.
// ---------------------------------------------------------------------------
export async function runAutoPromoteToWebsite(env) {
  if (!env.DB) return { ok: false, reason: "no DB binding" };
  // Find candidate projects (posted, has video_id, not yet on website)
  const { results: candidates } = await env.DB.prepare(
    `SELECT p.id, p.title, p.youtube_video_id, p.client_id, c.name AS client_name, e.name AS editor_name
     FROM projects p
     LEFT JOIN clients c ON p.client_id = c.id
     LEFT JOIN editors e ON p.assigned_editor_id = e.id
     WHERE p.status = 'posted'
       AND p.youtube_video_id IS NOT NULL
       AND p.archived_at IS NULL`
  ).all();

  if (!candidates || candidates.length === 0) {
    return { ok: true, candidates: 0, promoted: 0 };
  }

  // Bulk-check media_library for matching curated entries. We pull all rows
  // with a non-AUTO_PULSE category once and intersect in JS — single round trip.
  const { results: curated } = await env.DB.prepare(
    `SELECT source_url FROM media_library
     WHERE source_url IS NOT NULL
       AND (category IS NULL OR category != 'AUTO_PULSE')`
  ).all();
  const curatedVideoIds = new Set();
  for (const row of (curated || [])) {
    const m = String(row.source_url || "").match(/[?&]v=([\w-]{11})|youtu\.be\/([\w-]{11})|\/embed\/([\w-]{11})|\/shorts\/([\w-]{11})/);
    const id = m && (m[1] || m[2] || m[3] || m[4]);
    if (id) curatedVideoIds.add(id);
  }

  const promoted = [];
  const nowSec = Math.floor(Date.now() / 1000);
  for (const p of candidates) {
    if (!curatedVideoIds.has(p.youtube_video_id)) continue;
    try {
      await env.DB.prepare(
        `UPDATE projects SET status = 'added-to-website', added_to_website_at = ?1, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?2 AND status = 'posted'`
      ).bind(nowSec, p.id).run();
      promoted.push(p);
    } catch (e) { console.error("auto-promote failed for", p.id, e.message); }
  }

  // Audit + Discord (best-effort, only if anything moved)
  if (promoted.length > 0) {
    try {
      await env.DB.prepare(
        `INSERT INTO agent_log (action, level, message, payload_json) VALUES (?1, ?2, ?3, ?4)`
      ).bind(
        "projects.auto_promote_website",
        "info",
        `Auto-promoted ${promoted.length} projects to added-to-website`,
        JSON.stringify({ count: promoted.length, ids: promoted.map(p => p.id) })
      ).run();
    } catch {}
    try {
      const lines = [`🌐 **Auto-promoted to website** (${promoted.length})`];
      for (const p of promoted.slice(0, 10)) {
        lines.push(`· ${p.title} — ${p.client_name || "—"}`);
      }
      if (promoted.length > 10) lines.push(`… and ${promoted.length - 10} more`);
      await postToDiscord(env, { content: lines.join("\n") }, "ops");
    } catch {}
  }

  return { ok: true, candidates: candidates.length, promoted: promoted.length, promoted_ids: promoted.map(p => p.id) };
}

// ---------------------------------------------------------------------------
// runWeeklyDigest — Sunday morning Discord recap. Posts "this week shipped"
// summary: projects per status this week, ₹ paid, pending payouts,
// posted-count per client.
//
// Gated by KV "app:weekly_digest:last_run_ts" so only one digest fires per
// week even though the pulse cron ticks every 30 min.
// ---------------------------------------------------------------------------
export async function runWeeklyDigest(env, opts = {}) {
  if (!env.DB) return { ok: false, reason: "no DB binding" };

  // KV gate — fires at most once every 6.5 days. Day-of-week is intentionally
  // NOT checked: UTC Sunday vs IST Sunday creates a 5.5-hour gap where the
  // digest would either miss or double-fire. The KV gate alone keeps it
  // ~weekly. Use opts.force=true to bypass.
  const lastRunKey = "app:weekly_digest:last_run_ts";
  const last = Number((env.SHINEL_AUDIT && await env.SHINEL_AUDIT.get(lastRunKey)) || "0");
  const now = Date.now();
  const minIntervalMs = 6.5 * 24 * 60 * 60 * 1000;
  const force = !!opts.force;
  if (!force && (now - last) < minIntervalMs) {
    return { ok: true, skipped: true, reason: "ran less than 6.5 days ago", last_run_ts: last };
  }
  const today = new Date();

  const weekStart = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const weekStartSec = Math.floor(weekStart.getTime() / 1000);
  const weekStartIso = weekStart.toISOString();

  const [postedThisWeek, paidThisWeek, pendingPayouts, postedByClient] = await Promise.all([
    env.DB.prepare(
      `SELECT COUNT(*) AS n FROM projects WHERE posted_at >= ?1 AND archived_at IS NULL`
    ).bind(weekStartSec).first(),
    env.DB.prepare(
      `SELECT COUNT(*) AS n, COALESCE(SUM(editor_payment_inr), 0) AS total
       FROM projects WHERE paid_at >= ?1 AND status IN ('paid','posted','added-to-website')`
    ).bind(weekStartSec).first(),
    env.DB.prepare(
      `SELECT COUNT(*) AS n, COALESCE(SUM(p.editor_payment_inr), 0) AS total
       FROM projects p LEFT JOIN editors e ON p.assigned_editor_id = e.id
       WHERE p.status IN ('completed', 'posted', 'added-to-website')
         AND p.editor_payment_inr > 0
         AND e.compensation_type = 'freelance'
         AND p.archived_at IS NULL`
    ).first(),
    env.DB.prepare(
      `SELECT c.name AS client_name, COUNT(*) AS n
       FROM projects p LEFT JOIN clients c ON p.client_id = c.id
       WHERE p.posted_at >= ?1 AND p.archived_at IS NULL
       GROUP BY c.name ORDER BY n DESC LIMIT 10`
    ).bind(weekStartSec).all(),
  ]);

  // Build a digest message
  const lines = [
    `📊 **Weekly digest — ${weekStart.toISOString().slice(0, 10)} → ${today.toISOString().slice(0, 10)}**`,
    `· Shipped this week: **${postedThisWeek.n}** projects`,
    `· Paid out this week: **₹${(paidThisWeek.total || 0).toLocaleString("en-IN")}** across ${paidThisWeek.n} payments`,
    `· Pending payouts: **₹${(pendingPayouts.total || 0).toLocaleString("en-IN")}** across ${pendingPayouts.n} freelancers`,
  ];
  if ((postedByClient.results || []).length > 0) {
    lines.push("");
    lines.push("**By client (posted this week):**");
    for (const r of postedByClient.results) {
      lines.push(`· ${r.client_name || "—"}: ${r.n}`);
    }
  }

  const result = await postToDiscord(env, { content: lines.join("\n") }, "default");

  // Save run timestamp + audit log entry
  try {
    if (env.SHINEL_AUDIT) await env.SHINEL_AUDIT.put(lastRunKey, String(now));
  } catch {}
  try {
    await env.DB.prepare(
      `INSERT INTO agent_log (action, level, message, payload_json) VALUES (?1, ?2, ?3, ?4)`
    ).bind(
      "weekly_digest.posted",
      "info",
      "Weekly Discord digest posted",
      JSON.stringify({
        posted_count: postedThisWeek.n,
        paid_total: paidThisWeek.total,
        paid_count: paidThisWeek.n,
        pending_total: pendingPayouts.total,
        pending_count: pendingPayouts.n,
        week_start: weekStartIso,
      })
    ).run();
  } catch {}

  return { ok: true, posted: result.ok, totals: {
    posted_count: postedThisWeek.n,
    paid_total: paidThisWeek.total,
    paid_count: paidThisWeek.n,
    pending_total: pendingPayouts.total,
    pending_count: pendingPayouts.n,
  } };
}

// ---------------------------------------------------------------------------
// runEditorSummary — per-editor weekly summary, posted to Discord.
//
// One message goes to #freelancers-only (with each freelancer's section);
// another to #salaried-only (with each salaried/intern's section). Each
// section lists: active queue, shipped this week, pending payouts.
//
// Both posts use the per-channel webhooks (DISCORD_FREELANCERS_WEBHOOK_URL
// and DISCORD_SALARIED_WEBHOOK_URL). Falls back to default if not set.
//
// KV-gated to fire at most every 6 days. Recommended to manually trigger
// with force=true on Friday morning, then let the cron keep it ~weekly.
// ---------------------------------------------------------------------------
export async function runEditorSummary(env, opts = {}) {
  if (!env.DB) return { ok: false, reason: "no DB binding" };

  const lastRunKey = "app:editor_summary:last_run_ts";
  const last = Number((env.SHINEL_AUDIT && await env.SHINEL_AUDIT.get(lastRunKey)) || "0");
  const now = Date.now();
  const minIntervalMs = 6 * 24 * 60 * 60 * 1000;
  const force = !!opts.force;
  if (!force && (now - last) < minIntervalMs) {
    return { ok: true, skipped: true, reason: "ran less than 6 days ago", last_run_ts: last };
  }

  const weekStart = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const weekStartSec = Math.floor(weekStart.getTime() / 1000);

  // Active editors with their compensation type
  const { results: editors } = await env.DB.prepare(
    `SELECT id, name, email, role, compensation_type, monthly_salary_inr, payment_rate_inr, discord_user_id
     FROM editors WHERE active = 1 ORDER BY compensation_type, name`
  ).all();

  if (!editors || editors.length === 0) {
    return { ok: true, skipped: true, reason: "no active editors" };
  }

  // For each editor: active projects, shipped this week, pending payouts
  const editorBlocks = await Promise.all(editors.map(async (e) => {
    const [active, shippedThisWeek, pending] = await Promise.all([
      env.DB.prepare(
        `SELECT p.title, p.status, p.due_date, p.editor_payment_inr, c.name AS client_name
         FROM projects p LEFT JOIN clients c ON p.client_id = c.id
         WHERE p.assigned_editor_id = ?1 AND p.status IN ('planned','started','in-progress','completed')
           AND p.archived_at IS NULL ORDER BY p.due_date NULLS LAST, p.updated_at DESC LIMIT 20`
      ).bind(e.id).all(),
      env.DB.prepare(
        `SELECT COUNT(*) AS n FROM projects
         WHERE assigned_editor_id = ?1 AND posted_at >= ?2`
      ).bind(e.id, weekStartSec).first(),
      env.DB.prepare(
        `SELECT COUNT(*) AS n, COALESCE(SUM(editor_payment_inr), 0) AS total
         FROM projects WHERE assigned_editor_id = ?1
           AND status IN ('completed','posted','added-to-website')
           AND editor_payment_inr > 0 AND archived_at IS NULL`
      ).bind(e.id).first(),
    ]);

    return { editor: e, active: active.results || [], shipped: shippedThisWeek.n || 0, pending };
  }));

  // Group by compensation type
  const freelance = editorBlocks.filter((b) => b.editor.compensation_type === "freelance");
  const salaried = editorBlocks.filter((b) => b.editor.compensation_type === "salary" || b.editor.compensation_type === "intern" || !b.editor.compensation_type);

  const fmtINR = (n) => `₹${(n || 0).toLocaleString("en-IN")}`;
  const buildBlock = (b) => {
    const lines = [];
    const mention = b.editor.discord_user_id ? `<@${b.editor.discord_user_id}>` : `**${b.editor.name}**`;
    const salaryNote = b.editor.compensation_type === "salary" ? ` · ${fmtINR(b.editor.monthly_salary_inr)}/mo salary` : "";
    lines.push(`\n**${mention}**${salaryNote}`);
    lines.push(`📦 ${b.active.length} active · 🎬 ${b.shipped} shipped this week${b.pending.total > 0 ? ` · 💰 ${fmtINR(b.pending.total)} pending` : ""}`);
    if (b.active.length > 0) {
      const topActive = b.active.slice(0, 5);
      for (const p of topActive) {
        const due = p.due_date ? ` · due ${new Date(p.due_date).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}` : "";
        lines.push(`  · ${p.title} *(${p.status}, ${p.client_name || "—"})*${due}`);
      }
      if (b.active.length > 5) lines.push(`  … and ${b.active.length - 5} more`);
    }
    return lines.join("\n");
  };

  const headerLine = `📊 **Weekly editor summary — week of ${weekStart.toISOString().slice(0, 10)}**`;

  // Post to freelancers channel
  let freelanceResult = { ok: true, skipped: true };
  if (freelance.length > 0) {
    const freelanceMsg = [headerLine, ...freelance.map(buildBlock)].join("\n");
    const url = env.DISCORD_FREELANCERS_WEBHOOK_URL || env.DISCORD_WEBHOOK_URL;
    if (url) {
      try {
        const r = await fetch(url, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: "Shinel · Freelancers", content: freelanceMsg.slice(0, 1990) }),
        });
        freelanceResult = { ok: r.ok, status: r.status };
      } catch (e) { freelanceResult = { ok: false, error: String(e) }; }
    } else {
      freelanceResult = { ok: false, skipped: true, reason: "no webhook URL configured" };
    }
  }

  // Post to salaried channel
  let salariedResult = { ok: true, skipped: true };
  if (salaried.length > 0) {
    const salariedMsg = [headerLine, ...salaried.map(buildBlock)].join("\n");
    const url = env.DISCORD_SALARIED_WEBHOOK_URL || env.DISCORD_WEBHOOK_URL;
    if (url) {
      try {
        const r = await fetch(url, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: "Shinel · Salaried Team", content: salariedMsg.slice(0, 1990) }),
        });
        salariedResult = { ok: r.ok, status: r.status };
      } catch (e) { salariedResult = { ok: false, error: String(e) }; }
    } else {
      salariedResult = { ok: false, skipped: true, reason: "no webhook URL configured" };
    }
  }

  // Save run timestamp + audit
  try {
    if (env.SHINEL_AUDIT) await env.SHINEL_AUDIT.put(lastRunKey, String(now));
  } catch {}
  try {
    await env.DB.prepare(
      `INSERT INTO agent_log (action, level, message, payload_json) VALUES (?1, ?2, ?3, ?4)`
    ).bind(
      "editor_summary.posted", "info",
      `Editor summary: ${freelance.length} freelance + ${salaried.length} salaried`,
      JSON.stringify({ freelance_count: freelance.length, salaried_count: salaried.length, freelanceResult, salariedResult })
    ).run();
  } catch {}

  return {
    ok: true,
    counts: { freelance: freelance.length, salaried: salaried.length, total: editors.length },
    freelance_post: freelanceResult,
    salaried_post: salariedResult,
  };
}
