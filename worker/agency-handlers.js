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

import { notifyLaptopPush } from "./task-push-hub.js";
import {
  verifyConnection as sheetVerifyConnection,
  appendRow as sheetAppendRow,
  updateRow as sheetUpdateRow,
  currentMonthTabName,
  projectToRow,
  readDropdownRules,
  readRange as sheetReadRange,
} from "./google-sheets.js";
import { generateAndStoreSeoProposal } from "./seo-generator.js";

// In-memory cache of dropdown rules per tab. Refreshed every 10 min so the
// founder's edits to the sheet's data validation flow into the cockpit
// without a deploy. Per-isolate cache; warm starts only.
const _dropdownCache = new Map();
async function getDropdownRulesCached(env, spreadsheetId, tabName) {
  const key = `${spreadsheetId}:${tabName}`;
  const entry = _dropdownCache.get(key);
  if (entry && Date.now() - entry.ts < 10 * 60_000) return entry.rules;
  try {
    const rules = await readDropdownRules(env, spreadsheetId, tabName);
    _dropdownCache.set(key, { rules, ts: Date.now() });
    return rules;
  } catch (e) {
    console.error("[sheets] readDropdownRules failed:", e.message);
    // Use whatever cached version we have, even if stale, rather than nothing
    return entry?.rules || null;
  }
}

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

// ---------------------------------------------------------------------------
// syncProjectToSheet — append or update a project's row in the Monthly Tracker.
//
// IDEMPOTENCY:
//   - First call appends a NEW row, stores the row index on the project.
//   - Subsequent calls UPDATE that specific row (never touching others).
//   - Founder's manual rows have NULL sheet_row_index and are never touched.
//
// Returns { ok, action: "appended"|"updated"|"skipped", row, tab }.
// Never throws — failures are stamped on the project's sheet_sync_error field
// so the cockpit can surface them.
// ---------------------------------------------------------------------------
export async function syncProjectToSheet(env, projectId) {
  if (!env.MONTHLY_TRACKER_SHEET_ID) {
    return { ok: false, skipped: "MONTHLY_TRACKER_SHEET_ID not configured" };
  }
  if (!env.GOOGLE_SA_JSON) {
    return { ok: false, skipped: "GOOGLE_SA_JSON not configured" };
  }

  const project = await env.DB.prepare("SELECT * FROM projects WHERE id = ?1").bind(projectId).first();
  if (!project) return { ok: false, error: "project not found" };

  // Resolve human names — sheet expects readable strings, not D1 IDs
  const [client, editor] = await Promise.all([
    project.client_id
      ? env.DB.prepare("SELECT name FROM clients WHERE id = ?1").bind(project.client_id).first()
      : Promise.resolve(null),
    project.assigned_editor_id
      ? env.DB.prepare("SELECT name FROM editors WHERE id = ?1").bind(project.assigned_editor_id).first()
      : Promise.resolve(null),
  ]);

  const tabName = env.SHEET_TAB_OVERRIDE || currentMonthTabName();
  // Read the sheet's dropdown rules (cached 10 min) and let projectToRow
  // snap our values to the canonical dropdown form. This prevents
  // red-triangle data-validation warnings on every synced row.
  const dropdowns = await getDropdownRulesCached(env, env.MONTHLY_TRACKER_SHEET_ID, project.sheet_tab_name || tabName);
  const row = projectToRow(project, client?.name, editor?.name, dropdowns);

  try {
    let action, rowIndex;
    if (project.sheet_row_index && project.sheet_tab_name) {
      // Update the row we previously wrote (safe — we own it)
      await sheetUpdateRow(env, env.MONTHLY_TRACKER_SHEET_ID, project.sheet_tab_name, project.sheet_row_index, row);
      action = "updated";
      rowIndex = project.sheet_row_index;
    } else {
      // First sync — append a new row, stamp the index back onto the project
      rowIndex = await sheetAppendRow(env, env.MONTHLY_TRACKER_SHEET_ID, tabName, row);
      action = "appended";
    }
    await env.DB.prepare(
      "UPDATE projects SET sheet_row_index = ?1, sheet_tab_name = ?2, sheet_synced_at = CURRENT_TIMESTAMP, sheet_sync_error = NULL WHERE id = ?3"
    ).bind(rowIndex, project.sheet_tab_name || tabName, projectId).run();
    return { ok: true, action, row: rowIndex, tab: project.sheet_tab_name || tabName };
  } catch (e) {
    const msg = String(e.message || e).slice(0, 500);
    await env.DB.prepare(
      "UPDATE projects SET sheet_sync_error = ?1 WHERE id = ?2"
    ).bind(msg, projectId).run();
    return { ok: false, error: msg };
  }
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
 * postToDiscordWithClient — unified helper that fans out a Discord ping to
 * BOTH a global channel (ops/finance/etc.) AND the per-client webhook if the
 * client has one configured on clients.discord_webhook_url.
 *
 * Replaces the ~12 copy-pasted blocks of "fetch ops channel + then fetch
 * client webhook" sprinkled across worker.js + agency-handlers.js.
 *
 * Never throws. Fire-and-forget by default (don't await on hot paths).
 */
export async function postToDiscordWithClient(env, clientId, payload, channel = "ops") {
  // 1. Global channel ping
  postToDiscord(env, payload, channel).catch(() => {});
  // 2. Per-client webhook
  if (!clientId || !env.DB) return;
  try {
    const c = await env.DB.prepare(
      "SELECT name, discord_webhook_url FROM clients WHERE id = ?1"
    ).bind(clientId).first();
    if (!c?.discord_webhook_url) return;
    const body = typeof payload === "string"
      ? { content: payload, username: `Shinel · ${c.name || "Client"}` }
      : { username: `Shinel · ${c.name || "Client"}`, ...payload };
    fetch(c.discord_webhook_url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => {});
  } catch (e) {
    console.error("[discord-per-client] lookup failed:", e.message);
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

  // ---- GET /admin/agency/public/creators — flattened public marquee list ----
  //
  // Returns every YT channel and every IG account as a separate row, so the
  // homepage marquee can show each one individually (Kamz's 3 YTs as 3 cards,
  // Anchit's 2 YTs as 2 cards, etc). Public endpoint, 5-min edge cache.
  if (path === "/admin/agency/public/creators" && method === "GET") {
    const corsOpen = { ...corsHeaders(request, env), "Access-Control-Allow-Origin": "*" };
    try {
      // Defensive dedup at SQL level: GROUP BY the natural key
      // (channel_id for YT, lowercase handle for IG). If a seeding bug or a
      // duplicate sync ever inserted two rows for the same channel/handle,
      // the marquee won't surface both. We pick MAX(subscribers/followers)
      // and MAX(avatar_url) so we keep the most-recent data we have.
      const [channels, igAccounts] = await Promise.all([
        env.DB.prepare(
          `SELECT MIN(cc.id) AS id, cc.channel_id, MIN(cc.handle) AS handle,
                  MIN(cc.role) AS role, MAX(cc.subscribers) AS subscribers,
                  MIN(cc.studio_url) AS studio_url, MAX(cc.avatar_url) AS avatar_url,
                  c.id AS client_id, c.name AS client_name, c.niche_tag,
                  COALESCE(c.managed_by_us, 1) AS managed_by_us
           FROM client_channels cc
           JOIN clients c ON cc.client_id = c.id
           WHERE cc.active = 1
             AND (c.status = 'active' OR c.status IS NULL)
           GROUP BY cc.channel_id, c.id
           ORDER BY MAX(cc.subscribers) DESC`
        ).all(),
        env.DB.prepare(
          `SELECT MIN(ia.id) AS id, LOWER(ia.handle) AS handle, MIN(ia.url) AS url,
                  MIN(ia.role) AS role, MAX(ia.followers) AS followers,
                  MAX(ia.managed_by_us) AS ig_managed, MAX(ia.avatar_url) AS avatar_url,
                  c.id AS client_id, c.name AS client_name, c.niche_tag,
                  COALESCE(c.managed_by_us, 1) AS managed_by_us
           FROM instagram_accounts ia
           JOIN clients c ON ia.client_id = c.id
           WHERE ia.active = 1
             AND (c.status = 'active' OR c.status IS NULL)
           GROUP BY LOWER(ia.handle), c.id
           ORDER BY MAX(ia.followers) DESC`
        ).all(),
      ]);

      const ytItems = (channels.results || []).map((c) => ({
        type: "youtube",
        client_id: c.client_id,
        client_name: c.client_name,
        // Display name: brand + channel handle/role if not the main channel
        name: c.role === "main" ? c.client_name : `${c.client_name} · ${c.handle || c.role}`,
        handle: c.handle || c.channel_id,
        channel_id: c.channel_id,
        subscribers: c.subscribers || 0,
        url: c.studio_url || (c.channel_id?.startsWith("UC") ? `https://youtube.com/channel/${c.channel_id}` : null),
        avatar_url: c.avatar_url || null,
        category: c.niche_tag || "Creator",
        managed: !!c.managed_by_us,
      }));

      const igItems = (igAccounts.results || []).map((ig) => ({
        type: "instagram",
        client_id: ig.client_id,
        client_name: ig.client_name,
        name: ig.role === "main" ? ig.client_name : `${ig.client_name} · @${String(ig.handle).replace(/^@/, "")}`,
        handle: `@${String(ig.handle).replace(/^@/, "")}`,
        followers: ig.followers || 0,
        url: ig.url || `https://instagram.com/${String(ig.handle).replace(/^@/, "")}`,
        avatar_url: ig.avatar_url || null,
        category: ig.niche_tag || "Creator",
        managed: !!ig.managed_by_us && !!ig.ig_managed,
      }));

      // Sort so the highest-reach items appear first
      const all = [...ytItems, ...igItems].sort((a, b) => (b.subscribers || b.followers || 0) - (a.subscribers || a.followers || 0));

      return new Response(JSON.stringify({
        count: all.length,
        yt_count: ytItems.length,
        ig_count: igItems.length,
        creators: all,
        generated_at: new Date().toISOString(),
      }), {
        status: 200,
        headers: { ...BASE_HEADERS, ...corsOpen, "Cache-Control": "public, max-age=30, s-maxage=30" },
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...BASE_HEADERS, ...corsOpen } });
    }
  }

  // ---- GET /admin/agency/public/stats — CANONICAL source of truth ----
  //
  // EVERY surface that displays "Total Reach" reads this endpoint:
  //   - Homepage marquee (SiteHeader)
  //   - Cockpit Total Reach tile
  //   - Footer
  //   - Public per-client pages
  //
  // Formula (managed clients only):
  //   total_yt_subscribers = SUM(client_channels.subscribers)
  //                          where client.managed_by_us = 1 AND client_channels.active = 1
  //   total_ig_followers   = SUM(instagram_accounts.followers)
  //                          where client.managed_by_us = 1 AND instagram_accounts.active = 1
  //                          AND instagram_accounts.managed_by_us = 1
  //   total_reach          = total_yt_subscribers + total_ig_followers
  //
  // Cached 5 min at the CF edge. No auth required.
  if (path === "/admin/agency/public/stats" && method === "GET") {
    const corsOpen = { ...corsHeaders(request, env), "Access-Control-Allow-Origin": "*" };
    try {
      const nowSec = Math.floor(Date.now() / 1000);
      const monthAgoSec = nowSec - 30 * 86400;

      const [activeCount, ytAgg, igAgg, postedThisMonth] = await Promise.all([
        // Count of active MANAGED clients (excludes tracked-only)
        env.DB.prepare(
          `SELECT COUNT(*) AS n FROM clients
           WHERE (status = 'active' OR status IS NULL)
             AND COALESCE(managed_by_us, 1) = 1`
        ).first(),
        // YT: sum across ALL channels of managed clients (multi-channel safe)
        env.DB.prepare(
          `SELECT COALESCE(SUM(cc.subscribers), 0) AS total
           FROM client_channels cc
           JOIN clients c ON cc.client_id = c.id
           WHERE cc.active = 1
             AND (c.status = 'active' OR c.status IS NULL)
             AND COALESCE(c.managed_by_us, 1) = 1`
        ).first(),
        // IG: sum across ALL active accounts of active managed clients.
        // Previously gated by ia.managed_by_us=1 which excluded "tracked-only"
        // accounts (e.g. Kamz's @kamzinkzoneclothing). Per founder policy
        // (May 2026): track follower count for every client surface in our
        // DB; the managed_by_us flag only governs whether WE do SEO/posting
        // work on it, not whether we count its reach.
        env.DB.prepare(
          `SELECT COALESCE(SUM(ia.followers), 0) AS total
           FROM instagram_accounts ia
           JOIN clients c ON ia.client_id = c.id
           WHERE ia.active = 1
             AND (c.status = 'active' OR c.status IS NULL)
             AND COALESCE(c.managed_by_us, 1) = 1`
        ).first(),
        env.DB.prepare(
          `SELECT COUNT(*) AS n FROM projects
           WHERE posted_at >= ?1 AND archived_at IS NULL`
        ).bind(monthAgoSec).first(),
      ]);

      const totalYt = ytAgg?.total || 0;
      const totalIg = igAgg?.total || 0;
      const totalReach = totalYt + totalIg;

      return new Response(JSON.stringify({
        active_clients: activeCount?.n || 0,
        total_yt_subscribers: totalYt,
        total_ig_followers: totalIg,
        total_reach: totalReach,
        posted_last_30d: postedThisMonth?.n || 0,
        generated_at: new Date().toISOString(),
        // Document the formula so anyone consuming this endpoint knows what it
        // includes/excludes — prevents future numbers drifting again.
        formula: {
          yt: "SUM(client_channels.subscribers) where client.managed_by_us = 1 AND cc.active = 1",
          ig: "SUM(instagram_accounts.followers) where client.managed_by_us = 1 AND ia.managed_by_us = 1 AND ia.active = 1",
          reach: "yt + ig",
        },
      }), {
        status: 200,
        headers: { ...BASE_HEADERS, ...corsOpen, "Cache-Control": "public, max-age=30, s-maxage=30" },
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
      // Portfolio fields (added by editor-portfolio migration) so the
      // /editor/me page can render the "View public page" link and the
      // portfolio self-edit panel.
      slug: editor.slug || null,
      public_enabled: editor.public_enabled ? 1 : 0,
      bio: editor.bio || "",
      avatar_url: editor.avatar_url || null,
      cover_url: editor.cover_url || null,
      portfolio_color: editor.portfolio_color || "#E85002",
      socials_json: editor.socials_json || "{}",
    };

    return ok({ editor: safeEditor, projects, finance });
  }

  // ========================================================================
  // LAPTOP-TOKEN ENDPOINTS — dual-auth: either X-Laptop-Token header (the
  // simple shared secret stored on the always-on laptop) OR team JWT.
  // The laptop never needs a user JWT; it just needs LAPTOP_API_TOKEN.
  // ========================================================================
  if (path.startsWith("/admin/agency/laptop/")) {
    // Quick auth check. WS upgrade accepts the token via ?token= query because
    // browser WebSocket clients can't set custom headers; native clients can
    // still send the header. Either works for either endpoint.
    const laptopToken = request.headers.get("x-laptop-token") || url.searchParams.get("token") || "";
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

    // ---- GET /admin/agency/laptop/ws — WebSocket upgrade to TaskPushHub DO
    // Auth already validated above. Forward the request to the per-laptop DO
    // instance and let it own the connection. Pushes from the worker reach
    // this socket whenever a new laptop_tasks row is inserted.
    if (path === "/admin/agency/laptop/ws" && method === "GET") {
      if (!env.TASK_PUSH_HUB) {
        return err("WebSocket push not configured on this worker (TASK_PUSH_HUB binding missing)", 501);
      }
      const upgrade = request.headers.get("Upgrade") || "";
      if (upgrade.toLowerCase() !== "websocket") {
        return err("Expected WebSocket upgrade. Connect with wss://", 426);
      }
      const laptopId = url.searchParams.get("laptop_id") || "shinel-mainframe";
      const id = env.TASK_PUSH_HUB.idFromName(laptopId);
      const stub = env.TASK_PUSH_HUB.get(id);
      const doUrl = new URL("https://do/ws");
      doUrl.searchParams.set("laptop_id", laptopId);
      doUrl.searchParams.set("version", url.searchParams.get("version") || "1.3");
      return stub.fetch(new Request(doUrl, {
        method: "GET",
        headers: request.headers,
      }));
    }

    // ---- GET /admin/agency/laptop/ws/status — show current connections for a laptop
    if (path === "/admin/agency/laptop/ws/status" && method === "GET") {
      if (!env.TASK_PUSH_HUB) return ok({ ok: false, configured: false });
      const laptopId = url.searchParams.get("laptop_id") || "shinel-mainframe";
      const id = env.TASK_PUSH_HUB.idFromName(laptopId);
      const stub = env.TASK_PUSH_HUB.get(id);
      const r = await stub.fetch("https://do/status");
      return new Response(r.body, { status: r.status, headers: { "Content-Type": "application/json", ...corsHeaders(request, env) } });
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
          // Reject 0 results outright. The scraper sometimes can't parse the
          // followers count (login wall, layout change, private account) and
          // returns 0 in body.result.followers. The OLD code accepted that
          // and overwrote a perfectly good 1.8M with 0. Now we require a
          // strictly positive integer to do any write. If the scraper truly
          // wanted to report "no followers", we'd accept a PATCH `failed`
          // status with a clear reason instead.
          if (task.type === "ig_followers_fetch" && task.client_id && Number(body.result.followers) > 0) {
            const followers = parseInt(body.result.followers, 10);
            // Update the legacy clients.instagram_followers (primary handle)
            await env.DB.prepare(
              "UPDATE clients SET instagram_followers = ?1 WHERE id = ?2"
            ).bind(followers, task.client_id).run();
            // Update the matching instagram_accounts row (per-handle) — also
            // captures avatar URL if the scraper returned one.
            //
            // Robust handle matching: the DB might store handles as "@xyz" or
            // "xyz", and the scraper might return either form too. We strip
            // any leading @ on BOTH sides of the comparison and lowercase
            // before matching. Previous code only stripped from the input
            // side, so DB rows stored with @ never matched and stayed at 0.
            if (body.result.handle) {
              const cleanHandle = String(body.result.handle).replace(/^@/, "").trim().toLowerCase();
              const updateRes = await env.DB.prepare(
                `UPDATE instagram_accounts
                 SET followers = ?1, avatar_url = COALESCE(?2, avatar_url),
                     last_synced_at = strftime('%s', 'now')
                 WHERE client_id = ?3
                   AND LOWER(REPLACE(handle, '@', '')) = ?4`
              ).bind(followers, body.result.avatar_url || null, task.client_id, cleanHandle).run();

              // If no row was updated, the handle exists in clients.instagram_handle
              // but not in instagram_accounts. INSERT it so the per-handle SUM
              // in opsSnapshot/public-stats includes this client going forward.
              if (!updateRes?.meta?.changes) {
                try {
                  await env.DB.prepare(
                    `INSERT INTO instagram_accounts
                       (id, client_id, handle, url, role, followers, avatar_url, managed_by_us, active)
                     VALUES (?1, ?2, ?3, ?4, 'main', ?5, ?6, 1, 1)`
                  ).bind(
                    crypto.randomUUID(),
                    task.client_id,
                    cleanHandle,
                    `https://instagram.com/${cleanHandle}`,
                    followers,
                    body.result.avatar_url || null
                  ).run();
                  console.log(`[ig-fetch] inserted new instagram_accounts row for ${task.client_id} / @${cleanHandle}`);
                } catch (insErr) {
                  console.error("[ig-fetch] auto-insert failed:", insErr.message);
                }
              }
            }
          }
          // Log a warning when the laptop reports a 0-follower result, so the
          // founder can see in the Completion Log which handles consistently
          // return 0 (probably login wall / private account / parse miss).
          if (task.type === "ig_followers_fetch" && task.client_id
              && (body.result.followers === 0 || body.result.followers === "0")) {
            try {
              await env.DB.prepare(
                `INSERT INTO agent_log (action, level, message, client_id, payload_json) VALUES (?1, ?2, ?3, ?4, ?5)`
              ).bind(
                "ig.fetched_zero",
                "warn",
                `Scraper returned 0 followers for ${body.result.handle || "(unknown handle)"} — likely login wall or parse miss. Existing value preserved.`,
                task.client_id,
                JSON.stringify({ handle: body.result.handle, raw: body.result.raw || null, task_id: task.id })
              ).run();
            } catch {}
          }

          // yt_video_reseo: close the loop on the SEO proposal.
          // The dispatched payload carried seo_id; on a successful laptop
          // apply we flip seo_history.applied=1 + applied_method='laptop',
          // append a note, write an audit log, and fire a Discord ping
          // (per-client webhook if available, else ops channel).
          if (task.type === "yt_video_reseo") {
            const taskPayload = safeJsonParse(task.payload_json) || {};
            const seoId = taskPayload.seo_id;
            if (seoId) {
              await env.DB.prepare(
                `UPDATE seo_history
                 SET applied = 1, applied_at = CURRENT_TIMESTAMP,
                     applied_method = 'laptop',
                     verified_via = ?1,
                     notes = COALESCE(notes, '') || ?2
                 WHERE id = ?3`
              ).bind(
                body.result?.verified_via || "studio_dom",
                `\n[${new Date().toISOString()}] Applied by laptop (task ${task.id}); changes: ${JSON.stringify(body.result?.changes || {}).slice(0, 400)}`,
                seoId
              ).run();
              // Audit log so the Recently Applied feed has a real entry
              try {
                await env.DB.prepare(
                  `INSERT INTO agent_log (action, level, message, client_id, payload_json) VALUES (?1, ?2, ?3, ?4, ?5)`
                ).bind(
                  "seo.applied",
                  "info",
                  `RESEO applied on video ${taskPayload.video_id}`,
                  task.client_id,
                  JSON.stringify({ seo_id: seoId, task_id: task.id, result: body.result || {} })
                ).run();
              } catch {}
              // Discord notification (per-client webhook + ops fallback)
              const client = task.client_id
                ? await env.DB.prepare(
                    "SELECT name, discord_webhook_url FROM clients WHERE id = ?1"
                  ).bind(task.client_id).first()
                : null;
              const embed = {
                content: `✏ **RESEO applied** — ${taskPayload.new_title?.slice(0, 80) || `video ${taskPayload.video_id}`}\n· Client: ${client?.name || task.client_id}\n· https://youtu.be/${taskPayload.video_id}`,
              };
              postToDiscord(env, embed, "ops").catch(() => {});
              if (client?.discord_webhook_url) {
                fetch(client.discord_webhook_url, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ username: `Shinel · ${client.name}`, ...embed }),
                }).catch(() => {});
              }
            }
          }

          // unlisted_video_audit: laptop browsed a managed channel's Studio
          // page and returned a list of unlisted videos. For each new one
          // we haven't seen, INSERT a row in unlisted_uploads and enqueue
          // a transcribe_video task.
          if (task.type === "unlisted_video_audit" && Array.isArray(body.result.videos)) {
            const taskPayload = safeJsonParse(task.payload_json) || {};
            for (const v of body.result.videos) {
              if (!v.video_id) continue;
              // Upsert (skip if we already track this video)
              const existing = await env.DB.prepare(
                "SELECT video_id, transcript_status, seo_status FROM unlisted_uploads WHERE video_id = ?1"
              ).bind(v.video_id).first();
              if (existing) continue; // already tracked; ignore

              await env.DB.prepare(
                `INSERT INTO unlisted_uploads
                   (video_id, channel_id, client_id, title, privacy_status, scheduled_publish_at)
                 VALUES (?1, ?2, ?3, ?4, 'unlisted', ?5)`
              ).bind(
                v.video_id,
                taskPayload.channel_id || task.client_id || null,
                task.client_id || null,
                v.title || null,
                v.scheduled_publish_at || null
              ).run();

              // Enqueue transcription task
              const tId = crypto.randomUUID();
              await env.DB.prepare(
                `INSERT INTO laptop_tasks (id, type, client_id, payload_json, priority, max_attempts, created_by)
                 VALUES (?1, 'transcribe_video', ?2, ?3, 4, 2, 'unlisted-audit')`
              ).bind(
                tId,
                task.client_id || null,
                JSON.stringify({ video_id: v.video_id, source: "unlisted-audit", title: v.title, is_short: !!v.is_short })
              ).run();
              notifyLaptopPush(env, "shinel-mainframe", {
                type: "task_available", task_id: tId, task_type: "transcribe_video",
                client_id: task.client_id || null, priority: 4, source: "unlisted-audit",
              }).catch(() => {});
            }
          }

          // transcribe_video: laptop fetched a transcript via youtubetotranscript.
          // Save it. The SEO generation happens IN THE LAPTOP SKILL itself
          // (using Cowork's native Claude session — no API key, no extra cost).
          // The laptop POSTs the finished proposal back via POST /admin/agency/seo/proposal.
          if (task.type === "transcribe_video" && body.result?.transcript) {
            const taskPayload = safeJsonParse(task.payload_json) || {};
            const videoId = taskPayload.video_id || body.result.video_id;
            const transcript = String(body.result.transcript).slice(0, 50_000);
            if (videoId) {
              await env.DB.prepare(
                `UPDATE unlisted_uploads
                 SET transcript_status = 'done',
                     transcript_text = ?1,
                     transcript_fetched_at = CURRENT_TIMESTAMP,
                     transcript_source = ?2
                 WHERE video_id = ?3`
              ).bind(transcript, body.result.source || "youtubetotranscript", videoId).run();
            }
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
              // Push to any listening laptop so the follow-up runs immediately
              notifyLaptopPush(env, "shinel-mainframe", {
                type: "task_available", task_id: followupId, task_type: "milestone_story_create",
                client_id: cand.client_id, priority: 5, source: "milestone_check",
              }).catch(() => {});
            }
          }
        } catch (e) { console.error("post-complete side-effect failed:", e.message); }
      }

      // Failure side-effects — stamp the SEO row with the error so the
      // founder can see what went wrong in the cockpit modal.
      if (newStatus === "failed" && task.type === "yt_video_reseo") {
        try {
          const taskPayload = safeJsonParse(task.payload_json) || {};
          const seoId = taskPayload.seo_id;
          if (seoId) {
            await env.DB.prepare(
              `UPDATE seo_history
               SET notes = COALESCE(notes, '') || ?1
               WHERE id = ?2`
            ).bind(
              `\n[${new Date().toISOString()}] Laptop apply FAILED (task ${task.id}): ${(body.error || "unknown").slice(0, 300)}`,
              seoId
            ).run();
            try {
              await env.DB.prepare(
                `INSERT INTO agent_log (action, level, message, client_id, payload_json) VALUES (?1, ?2, ?3, ?4, ?5)`
              ).bind(
                "seo.apply_failed",
                "error",
                `RESEO apply failed: ${(body.error || "unknown").slice(0, 200)}`,
                task.client_id,
                JSON.stringify({ seo_id: seoId, task_id: task.id, error: body.error })
              ).run();
            } catch {}
          }
        } catch (e) { console.error("seo failure stamp failed:", e.message); }
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
      // Push to any listening laptop — fire-and-forget so a stuck DO never
      // blocks the API response. Polling stays as the safety net.
      notifyLaptopPush(env, "shinel-mainframe", {
        type: "task_available", task_id: id, task_type: body.type,
        client_id: body.client_id || null, priority: parseInt(body.priority || 0, 10),
        source: body.created_by || authKind || "enqueue",
      }).catch(() => {});
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

    // ---- Single-laptop-task routes: edit / cancel / run-now ----
    // Only pending tasks are mutable; once claimed they belong to the laptop.
    const queueMatch = path.match(/^\/admin\/agency\/laptop\/queue\/([^\/]+)(?:\/(run-now))?$/);
    if (queueMatch) {
      const id = queueMatch[1];
      const subaction = queueMatch[2] || null;

      // Ownership/existence check up front
      const task = await env.DB.prepare("SELECT * FROM laptop_tasks WHERE id = ?1").bind(id).first();
      if (!task) return err("task not found", 404);

      // ---- POST /admin/agency/laptop/queue/:id/run-now
      //   Bumps priority to max so the next claim picks it first, clears any
      //   scheduled_for delay, and fires a WebSocket push so a listening
      //   laptop picks it up immediately.
      if (subaction === "run-now" && method === "POST") {
        if (task.status !== "pending") {
          return err(`task is '${task.status}', only pending tasks can be run-now'd`, 409);
        }
        await env.DB.prepare(
          "UPDATE laptop_tasks SET priority = 99, scheduled_for = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?1"
        ).bind(id).run();
        // Fire-and-forget push
        notifyLaptopPush(env, "shinel-mainframe", {
          type: "task_available", task_id: id, task_type: task.type,
          client_id: task.client_id, priority: 99, source: "run_now",
        }).catch(() => {});
        return ok({ id, ran_now: true, priority: 99 });
      }

      // ---- PATCH /admin/agency/laptop/queue/:id  — edit a pending task
      //   Allowed fields: priority, payload_json (object or string), scheduled_for, client_id, type
      if (!subaction && method === "PATCH") {
        if (task.status !== "pending") {
          return err(`task is '${task.status}', only pending tasks can be edited`, 409);
        }
        const body = await request.json().catch(() => ({}));
        const sets = [];
        const binds = [];
        let i = 1;
        if (body.priority !== undefined) {
          sets.push(`priority = ?${i++}`); binds.push(parseInt(body.priority, 10));
        }
        if (body.scheduled_for !== undefined) {
          sets.push(`scheduled_for = ?${i++}`); binds.push(body.scheduled_for || null);
        }
        if (body.client_id !== undefined) {
          sets.push(`client_id = ?${i++}`); binds.push(body.client_id || null);
        }
        if (body.type !== undefined) {
          sets.push(`type = ?${i++}`); binds.push(body.type);
        }
        if (body.payload !== undefined || body.payload_json !== undefined) {
          const pl = body.payload_json !== undefined ? body.payload_json : body.payload;
          const serialized = typeof pl === "string" ? pl : JSON.stringify(pl || {});
          sets.push(`payload_json = ?${i++}`); binds.push(serialized);
        }
        if (!sets.length) return err("no valid fields");
        sets.push(`updated_at = CURRENT_TIMESTAMP`);
        binds.push(id);
        await env.DB.prepare(`UPDATE laptop_tasks SET ${sets.join(", ")} WHERE id = ?${i}`).bind(...binds).run();
        return ok({ id, updated: true });
      }

      // ---- DELETE /admin/agency/laptop/queue/:id  — cancel (or hard-delete if pending)
      //   Pending → hard delete (cheap, no history value).
      //   Claimed → mark cancelled (laptop will skip on patch attempt).
      //   Done/failed → hard delete (cleanup).
      if (!subaction && method === "DELETE") {
        if (task.status === "claimed") {
          await env.DB.prepare("UPDATE laptop_tasks SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = ?1").bind(id).run();
          return ok({ id, cancelled: true });
        }
        await env.DB.prepare("DELETE FROM laptop_tasks WHERE id = ?1").bind(id).run();
        return ok({ id, deleted: true });
      }

      return err("queue subroute not found", 404);
    }

    // ---- GET /admin/agency/laptop/heartbeat — show all laptops + last seen
    if (path === "/admin/agency/laptop/heartbeat" && method === "GET") {
      const { results } = await env.DB.prepare(
        `SELECT * FROM laptop_heartbeats ORDER BY last_seen DESC`
      ).all();
      const nowSec = Math.floor(Date.now() / 1000);
      const enriched = (results || []).map((r) => {
        const sa = nowSec - (r.last_seen || 0);
        return {
          ...r,
          seconds_ago: sa,
          // Online status tiers:
          //   < 8 min  → online (just polled)
          //   8-15 min → idle (between ticks; expected on a 5-min cron with Cowork cold-starts)
          //   > 15 min → offline (something's wrong — Cowork closed, machine asleep, etc.)
          online: sa < 480,
          status: sa < 480 ? "online" : sa < 900 ? "idle" : "offline",
        };
      });
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
          // NOTE: competitors table doesn't have a `url` column — the URL is
          // derived from channel_id (YouTube channel). Selecting `url` here
          // silently crashed the snapshot for months because of the .catch
          // fallback below, leaving the competitors list always empty.
          `SELECT client_id, name, channel_id, niche_tag, notes
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

      // Build the response, then compute an ETag-style hash. If the client
      // sent If-None-Match matching the hash, return 304 — saves bandwidth
      // AND parsing tokens on the laptop. This is the textbook HTTP cache
      // pattern, but with our own JSON-payload hash since CF doesn't auto-ETag.
      const body = {
        count: enriched.length,
        clients: enriched,
        active_spikes: activeSpikes.results || [],
        generated_at: new Date().toISOString(),
      };
      // Hash a stable subset (excludes generated_at so the ETag is content-only,
      // not time-stamp based — so identical data keeps the same ETag).
      const stableJson = JSON.stringify({
        c: enriched.map(c => ({ ...c, _r: undefined })),
        s: activeSpikes.results || [],
      });
      const hashBuf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(stableJson));
      const etag = '"' + Array.from(new Uint8Array(hashBuf)).slice(0, 16).map(b => b.toString(16).padStart(2, "0")).join("") + '"';

      const ifNoneMatch = request.headers.get("If-None-Match");
      const corsLap = corsHeaders(request, env);
      if (ifNoneMatch && ifNoneMatch === etag) {
        return new Response(null, {
          status: 304,
          headers: { ETag: etag, "Cache-Control": "private, max-age=60", ...corsLap },
        });
      }
      return new Response(JSON.stringify(body, null, 2), {
        status: 200,
        headers: {
          ...BASE_HEADERS,
          ...corsLap,
          ETag: etag,
          "Cache-Control": "private, max-age=60",
        },
      });
    }

    return err("laptop endpoint not found", 404);
  }

  // Auth gate (everything below requires admin/team JWT). Capture the
  // payload so handlers that scope by caller (e.g. personal todos) can
  // read the email/role off the JWT instead of querying again.
  let authPayload = null;
  try { authPayload = await requireTeamOrThrow(request, secret, env); }
  catch (e) { return err(e?.message || "unauthorized", e?.status || 401); }
  const callerEmail = String(authPayload?.email || "").trim().toLowerCase();

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

    // ---- Single SEO row: details + action endpoints
    //   GET /admin/agency/seo/:id                  — full row for the modal
    //   POST /admin/agency/seo/:id/dispatch        — enqueue laptop task + WS push
    //   POST /admin/agency/seo/:id/mark-applied    — set applied=1 manually
    //   POST /admin/agency/seo/:id/dismiss         — soft-cancel (applied=2 = dismissed)
    const seoMatch = path.match(/^\/admin\/agency\/seo\/(\d+)(?:\/(dispatch|mark-applied|dismiss))?$/);
    if (seoMatch) {
      const id = parseInt(seoMatch[1], 10);
      const subaction = seoMatch[2] || null;
      const row = await env.DB.prepare("SELECT * FROM seo_history WHERE id = ?1").bind(id).first();
      if (!row) return err("SEO row not found", 404);

      // GET details (includes joined client name + parsed payload for the UI)
      if (!subaction && method === "GET") {
        const client = row.client_id
          ? await env.DB.prepare("SELECT id, name, drive_folder_url FROM clients WHERE id = ?1").bind(row.client_id).first()
          : null;
        const studioUrl = row.video_id
          ? `https://studio.youtube.com/video/${row.video_id}/edit`
          : null;
        const watchUrl = row.video_id
          ? `https://youtube.com/watch?v=${row.video_id}`
          : null;
        return ok({
          seo: row,
          client,
          studio_url: studioUrl,
          watch_url: watchUrl,
          payload: safeJsonParse(row.payload_json),
        });
      }

      // POST /dispatch — queue a laptop task to actually apply this RESEO
      if (subaction === "dispatch" && method === "POST") {
        if (row.applied === 1) return err("already applied", 409);
        const body = await request.json().catch(() => ({}));
        const taskId = crypto.randomUUID();
        // The laptop SKILL handler refuses to apply unless ALL of
        // new_title / new_description / new_tags are present in the payload.
        // We have to pull the full values out of payload_json (which is
        // where the original RESEO proposal stored them in detail) since
        // the summary columns on seo_history only have title + first-line desc.
        const fullPayload = safeJsonParse(row.payload_json) || {};
        const fullNewDescription =
          fullPayload.new_description ||
          fullPayload.proposed?.description ||
          fullPayload.new_description_full ||
          row.new_description_first_line ||
          "";
        const toArr = (t) => Array.isArray(t)
          ? t
          : (typeof t === "string" ? t.split(",").map(s => s.trim()).filter(Boolean) : []);
        const fullNewTags = toArr(
          fullPayload.new_tags ?? fullPayload.proposed?.tags ?? fullPayload.tags ?? fullPayload.tags_after
        );
        const payload = {
          seo_id: row.id,
          video_id: row.video_id,
          asset_type: row.asset_type,
          action: row.action,
          new_title: row.new_title,
          new_description: fullNewDescription,    // <- laptop expects this key
          new_description_first_line: row.new_description_first_line,
          new_tags: fullNewTags,                   // <- laptop expects this key
          source_payload: fullPayload,
          dispatched_from: "cockpit:seo-queue",
        };
        await env.DB.prepare(
          `INSERT INTO laptop_tasks (id, type, client_id, payload_json, priority, max_attempts, created_by)
           VALUES (?1, 'yt_video_reseo', ?2, ?3, ?4, 3, 'seo-queue')`
        ).bind(
          taskId,
          row.client_id,
          JSON.stringify(payload),
          body.priority ?? 50  // mid-priority — above normal, below run-now
        ).run();
        // Stamp the SEO row so the UI shows "dispatched" state
        await env.DB.prepare(
          "UPDATE seo_history SET applied_method = 'laptop_queued', notes = COALESCE(notes, '') || ?1 WHERE id = ?2"
        ).bind(`\n[${new Date().toISOString()}] Dispatched to laptop (task ${taskId})`, id).run();
        // Push to laptop (fire-and-forget)
        notifyLaptopPush(env, "shinel-mainframe", {
          type: "task_available", task_id: taskId, task_type: "yt_video_reseo",
          client_id: row.client_id, priority: body.priority ?? 50, source: "seo-queue",
        }).catch(() => {});
        return ok({ id, dispatched: true, task_id: taskId });
      }

      // POST /mark-applied — user applied it themselves (in YT Studio etc.)
      if (subaction === "mark-applied" && method === "POST") {
        if (row.applied === 1) return err("already applied", 409);
        const body = await request.json().catch(() => ({}));
        await env.DB.prepare(
          `UPDATE seo_history
           SET applied = 1, applied_at = CURRENT_TIMESTAMP,
               applied_method = ?1, approved_by = ?2,
               notes = COALESCE(notes, '') || ?3
           WHERE id = ?4`
        ).bind(
          body.method || "manual",
          callerEmail || "unknown",
          `\n[${new Date().toISOString()}] Marked applied by ${callerEmail || "unknown"}`,
          id
        ).run();
        return ok({ id, applied: true });
      }

      // POST /dismiss — skip this RESEO (set applied=2 as the "dismissed" sentinel)
      if (subaction === "dismiss" && method === "POST") {
        if (row.applied === 1) return err("already applied — can't dismiss", 409);
        const body = await request.json().catch(() => ({}));
        await env.DB.prepare(
          `UPDATE seo_history
           SET applied = 2, applied_at = CURRENT_TIMESTAMP,
               applied_method = 'dismissed',
               notes = COALESCE(notes, '') || ?1
           WHERE id = ?2`
        ).bind(
          `\n[${new Date().toISOString()}] Dismissed by ${callerEmail || "unknown"}: ${body.reason || "no reason"}`,
          id
        ).run();
        return ok({ id, dismissed: true });
      }

      return err("seo subroute not found", 404);
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
        `INSERT INTO projects (id, client_id, title, asset_type, status, brief_md, due_date, scheduled_publish_at, tags_json, metadata_json, client_charge_inr, editor_payment_inr)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)`
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
        body.metadata ? JSON.stringify(body.metadata) : null,
        parseInt(body.client_charge_inr || 0, 10),
        parseInt(body.editor_payment_inr || 0, 10)
      ).run();
      // Auto-sync to Monthly Tracker sheet (fire-and-forget — never blocks
      // project creation if Sheets API is down or unconfigured)
      syncProjectToSheet(env, id).catch(() => {});
      // Discord ping — kick-off announcement to ops + per-client channel.
      // (Founder explicit ask: "everything should be published in each
      // client's Discord channel".)
      postToDiscordWithClient(env, body.client_id, {
        content: `📋 **New project queued** — ${body.title}\n· Type: ${body.asset_type || "video"}\n· Status: ${body.status || "planned"}`,
      }, "ops").catch(() => {});
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
      const allowed = ["title", "asset_type", "status", "assigned_editor_id", "brief_md", "due_date", "scheduled_publish_at", "youtube_video_id", "instagram_post_id", "editor_payment_inr", "client_charge_inr", "currency"];

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

      // Fire Discord webhook for EVERY meaningful status transition.
      // Founder's policy: "everything should be published in each client's
      // Discord channel". Previously only paid/posted/added-to-website
      // fired — now every status change pings ops + per-client.
      if (statusChanged && ["started", "in-progress", "completed", "paid", "posted", "added-to-website", "cancelled"].includes(body.status)) {
        const emoji = ({
          "started": "🚧",
          "in-progress": "⚙",
          "completed": "✅",
          "paid": "💰",
          "posted": "🎬",
          "added-to-website": "🌐",
          "cancelled": "🚫",
        })[body.status] || "📋";
        const labels = {
          "started": "Started",
          "in-progress": "In progress",
          "completed": "Completed",
          "paid": "Paid",
          "posted": "Posted",
          "added-to-website": "Added to website",
          "cancelled": "Cancelled",
        };
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

      // Auto-sync the updated project to Monthly Tracker (idempotent: updates
      // the row we previously appended, or appends a new one on first sync).
      // Fire-and-forget so a Sheets API blip never blocks a PATCH.
      syncProjectToSheet(env, id).catch(() => {});

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

    // ---- POST /admin/agency/clients  (create new client)
    // Body: { name, niche_tag?, instagram_handle?, youtube_id?, retainer_tier?, managed_by_us? }
    // Onboards a brand new client. Optional auto-create of a client_channels
    // row if youtube_id is provided.
    if (path === "/admin/agency/clients" && method === "POST") {
      const body = await request.json().catch(() => ({}));
      if (!body.name) return err("name required");
      const id = body.id || `c-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
      const slug = body.slug || String(body.name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      try {
        await env.DB.prepare(
          `INSERT INTO clients (id, name, slug, niche_tag, secondary_niche_tag, retainer_tier, instagram_handle, youtube_id, managed_by_us, status, onboarded_at)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, 'active', CURRENT_TIMESTAMP)`
        ).bind(
          id,
          body.name,
          slug,
          body.niche_tag || null,
          body.secondary_niche_tag || null,
          body.retainer_tier || null,
          body.instagram_handle || null,
          body.youtube_id || null,
          body.managed_by_us === false ? 0 : 1
        ).run();

        // Auto-create client_channels row if a YT id was given
        if (body.youtube_id) {
          try {
            await env.DB.prepare(
              `INSERT INTO client_channels (id, client_id, channel_id, handle, role, language, active)
               VALUES (?1, ?2, ?3, ?4, 'main', ?5, 1)`
            ).bind(`cc-${id}-main`, id, body.youtube_id, body.youtube_handle || null, body.language || null).run();
          } catch (chErr) { console.error("auto-create client_channels failed:", chErr.message); }
        }

        // Auto-create instagram_accounts row if an IG handle was given
        if (body.instagram_handle) {
          try {
            const cleanHandle = String(body.instagram_handle).replace(/^@/, "");
            await env.DB.prepare(
              `INSERT INTO instagram_accounts (id, client_id, handle, url, role, managed_by_us, active)
               VALUES (?1, ?2, ?3, ?4, 'main', ?5, 1)`
            ).bind(
              `ig-${id}-main`,
              id,
              cleanHandle,
              `https://instagram.com/${cleanHandle}`,
              body.managed_by_us === false ? 0 : 1
            ).run();
          } catch (igErr) { console.error("auto-create instagram_accounts failed:", igErr.message); }
        }

        await env.DB.prepare(
          `INSERT INTO agent_log (action, client_id, level, message, payload_json) VALUES (?1, ?2, ?3, ?4, ?5)`
        ).bind("client.created", id, "info", `Onboarded new client: ${body.name}`, JSON.stringify(body)).run();

        return ok({ id, created: true, slug }, 201);
      } catch (e) {
        if (String(e.message || "").includes("UNIQUE")) return err(`Client "${body.name}" already exists`, 409);
        throw e;
      }
    }

    // ---- POST /admin/agency/clients/:id/channels  (add YT channel)
    // Body: { channel_id, handle?, role?, language?, niche_tag_override?, studio_url? }
    const clientChannelMatch = path.match(/^\/admin\/agency\/clients\/([^\/]+)\/channels$/);
    if (clientChannelMatch && method === "POST") {
      const clientId = clientChannelMatch[1];
      const body = await request.json().catch(() => ({}));
      if (!body.channel_id) return err("channel_id required (UCxxx or @handle)");
      const id = body.id || `cc-${clientId}-${crypto.randomUUID().slice(0, 6)}`;
      try {
        await env.DB.prepare(
          `INSERT INTO client_channels (id, client_id, channel_id, handle, role, language, niche_tag_override, studio_url, active)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 1)`
        ).bind(
          id,
          clientId,
          body.channel_id,
          body.handle || null,
          body.role || "secondary",
          body.language || null,
          body.niche_tag_override || null,
          body.studio_url || null
        ).run();
        await env.DB.prepare(
          `INSERT INTO agent_log (action, client_id, level, message, payload_json) VALUES (?1, ?2, ?3, ?4, ?5)`
        ).bind("client.channel_added", clientId, "info", `Added channel ${body.channel_id}`, JSON.stringify(body)).run();
        return ok({ id, created: true }, 201);
      } catch (e) {
        if (String(e.message || "").includes("UNIQUE")) return err(`Channel ${body.channel_id} already tracked`, 409);
        throw e;
      }
    }

    // DELETE /admin/agency/clients/:cid/channels/:chid — soft-delete (active=0)
    const chDeleteMatch = path.match(/^\/admin\/agency\/clients\/([^\/]+)\/channels\/([^\/]+)$/);
    if (chDeleteMatch && method === "DELETE") {
      const chid = chDeleteMatch[2];
      await env.DB.prepare("UPDATE client_channels SET active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?1").bind(chid).run();
      return ok({ id: chid, deleted: true });
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

    // ========================================================================
    // SCHEDULED TASKS — one place to manage all recurring work
    // ========================================================================
    // GET /admin/agency/scheduled-tasks — list all
    if (path === "/admin/agency/scheduled-tasks" && method === "GET") {
      const { results } = await env.DB.prepare(
        `SELECT * FROM scheduled_tasks ORDER BY enabled DESC, name`
      ).all();
      const nowSec = Math.floor(Date.now() / 1000);
      const enriched = (results || []).map((t) => ({
        ...t,
        due_now: t.enabled && t.next_run_ts && t.next_run_ts <= nowSec,
      }));
      return ok({ count: enriched.length, tasks: enriched });
    }

    // POST /admin/agency/scheduled-tasks — create
    if (path === "/admin/agency/scheduled-tasks" && method === "POST") {
      const body = await request.json().catch(() => ({}));
      if (!body.name || !body.cron) return err("name and cron required");
      const id = body.id || `st-${crypto.randomUUID().slice(0, 8)}`;
      const nextRun = computeNextRunSec(body.cron);
      await env.DB.prepare(
        `INSERT INTO scheduled_tasks (id, name, description, cron, task_type, payload_json, client_id, enabled, next_run_ts, created_by)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)`
      ).bind(
        id,
        body.name,
        body.description || null,
        body.cron,
        body.task_type || "custom_prompt",
        body.payload ? JSON.stringify(body.payload) : null,
        body.client_id || null,
        body.enabled === false ? 0 : 1,
        nextRun,
        body.created_by || "admin"
      ).run();
      return ok({ id, created: true, next_run_ts: nextRun }, 201);
    }

    // PATCH /admin/agency/scheduled-tasks/:id
    const stMatch = path.match(/^\/admin\/agency\/scheduled-tasks\/([^\/]+)$/);
    if (stMatch && method === "PATCH") {
      const id = stMatch[1];
      const body = await request.json().catch(() => ({}));
      const allowed = ["name", "description", "cron", "task_type", "client_id", "enabled"];
      const sets = []; const binds = []; let i = 1;
      for (const k of allowed) if (body[k] !== undefined) {
        sets.push(`${k} = ?${i++}`);
        binds.push(typeof body[k] === "boolean" ? (body[k] ? 1 : 0) : body[k]);
      }
      if (body.payload !== undefined) { sets.push(`payload_json = ?${i++}`); binds.push(body.payload ? JSON.stringify(body.payload) : null); }
      if (body.cron) { sets.push(`next_run_ts = ?${i++}`); binds.push(computeNextRunSec(body.cron)); }
      if (!sets.length) return err("no valid fields");
      sets.push(`updated_at = CURRENT_TIMESTAMP`);
      binds.push(id);
      await env.DB.prepare(`UPDATE scheduled_tasks SET ${sets.join(", ")} WHERE id = ?${i}`).bind(...binds).run();
      return ok({ id, updated: true });
    }

    // DELETE /admin/agency/scheduled-tasks/:id
    if (stMatch && method === "DELETE") {
      const id = stMatch[1];
      await env.DB.prepare("DELETE FROM scheduled_tasks WHERE id = ?1").bind(id).run();
      return ok({ id, deleted: true });
    }

    // POST /admin/agency/scheduled-tasks/:id/run — manual fire
    const stRunMatch = path.match(/^\/admin\/agency\/scheduled-tasks\/([^\/]+)\/run$/);
    if (stRunMatch && method === "POST") {
      const id = stRunMatch[1];
      const result = await fireScheduledTask(env, id, "manual");
      return ok(result);
    }

    // ---- POST /admin/agency/weekly-digest/run  — manual trigger (force=true)
    if (path === "/admin/agency/weekly-digest/run" && method === "POST") {
      const body = await request.json().catch(() => ({}));
      const result = await runWeeklyDigest(env, { force: !!body.force });
      return ok(result);
    }

    // ---- GET /admin/agency/health — full system health snapshot
    if (path === "/admin/agency/health" && method === "GET") {
      const force = url.searchParams.get("alert") === "1";
      const result = await runHealthCheck(env, { force });
      return ok(result);
    }

    // ---- POST /admin/agency/competitor-research/run — manual trigger
    // Bypasses the once-per-day KV gate when ?force=1 is passed.
    if (path === "/admin/agency/competitor-research/run" && method === "POST") {
      const body = await request.json().catch(() => ({}));
      const result = await runCompetitorResearch(env, { force: !!body.force });
      return ok(result);
    }

    // ---- POST /admin/agency/underperformer-detector/run — manual trigger
    if (path === "/admin/agency/underperformer-detector/run" && method === "POST") {
      const body = await request.json().catch(() => ({}));
      const result = await runUnderperformerDetector(env, { force: !!body.force });
      return ok(result);
    }

    // ---- GET /admin/agency/seo/context/:clientId
    // Returns the personalization bundle the LAPTOP'S Claude session reads
    // when generating an SEO proposal in-skill. Cheaper than calling
    // Anthropic API server-side — the laptop already has Claude via Cowork.
    const seoCtxMatch = path.match(/^\/admin\/agency\/seo\/context\/([^\/]+)$/);
    if (seoCtxMatch && method === "GET") {
      const clientId = seoCtxMatch[1];
      const { gatherClientContext } = await import("./seo-generator.js");
      const ctx = await gatherClientContext(env, clientId);
      return ok({ context: ctx });
    }

    // ---- POST /admin/agency/seo/proposal
    // Laptop's Cowork-Claude generated this in-skill. Worker just stores it.
    // Body: { video_id, client_id, asset_type?, new_title, new_description,
    //         new_tags: [...], reasoning?, source?, isShort? }
    if (path === "/admin/agency/seo/proposal" && method === "POST") {
      const body = await request.json().catch(() => ({}));
      if (!body.video_id || !body.client_id || !body.new_title || !Array.isArray(body.new_tags)) {
        return err("video_id, client_id, new_title, and new_tags[] required");
      }
      const tagsStr = body.new_tags.join(", ");
      const descFirstLine = String(body.new_description || "").split("\n")[0].slice(0, 280);
      const payloadJson = JSON.stringify({
        auto_generated: true,
        source: body.source || "laptop:cowork-claude",
        new_title: body.new_title,
        new_description: body.new_description || "",
        new_tags: body.new_tags,
        reasoning: body.reasoning || "",
        generated_at: new Date().toISOString(),
      });
      const ins = await env.DB.prepare(
        `INSERT INTO seo_history
           (client_id, asset_type, video_id, action, new_title, new_description_first_line,
            new_tags_count, new_tags_chars, changes_summary, payload_json, applied, notes)
         VALUES (?1, ?2, ?3, 'reseo', ?4, ?5, ?6, ?7, ?8, ?9, 0, ?10)`
      ).bind(
        body.client_id,
        body.asset_type || (body.isShort ? "short" : "video"),
        body.video_id,
        String(body.new_title).slice(0, 200),
        descFirstLine,
        body.new_tags.length,
        tagsStr.length,
        body.reasoning ? String(body.reasoning).slice(0, 500) : null,
        payloadJson,
        `Auto-generated by laptop Cowork Claude session. Source: ${body.source || "laptop"}`
      ).run();
      const seoId = ins?.meta?.last_row_id;

      // Update unlisted_uploads if this video was tracked
      await env.DB.prepare(
        `UPDATE unlisted_uploads
         SET seo_status = 'generated', seo_history_id = ?1,
             seo_generated_at = CURRENT_TIMESTAMP, seo_model = 'cowork-claude'
         WHERE video_id = ?2`
      ).bind(seoId, body.video_id).run();

      // Audit log + Discord
      try {
        await env.DB.prepare(
          `INSERT INTO agent_log (action, level, message, client_id, payload_json) VALUES (?1, ?2, ?3, ?4, ?5)`
        ).bind(
          "auto_seo.generated",
          "info",
          `Auto-SEO proposal stored for video ${body.video_id}`,
          body.client_id,
          JSON.stringify({ seo_id: seoId, source: body.source || "laptop" })
        ).run();
      } catch {}
      const client = await env.DB.prepare("SELECT name, discord_webhook_url FROM clients WHERE id = ?1").bind(body.client_id).first();
      const msg = {
        content: `📝 **Auto-SEO ready** — new proposal for ${client?.name || body.client_id}\n· Title: ${body.new_title.slice(0, 80)}\n· Video: https://youtu.be/${body.video_id}\n· Review in cockpit Pending SEO queue`,
      };
      postToDiscord(env, msg, "ops").catch(() => {});
      if (client?.discord_webhook_url) {
        fetch(client.discord_webhook_url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: `Shinel · ${client.name}`, ...msg }),
        }).catch(() => {});
      }

      return ok({ id: seoId, stored: true }, 201);
    }

    // ---- GET /admin/agency/unlisted-uploads — list tracked unlisted videos + their pipeline state
    if (path === "/admin/agency/unlisted-uploads" && method === "GET") {
      const status = url.searchParams.get("status"); // optional filter on seo_status
      const where = [];
      const binds = [];
      let i = 1;
      if (status) { where.push(`seo_status = ?${i++}`); binds.push(status); }
      const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";
      const stmt = env.DB.prepare(
        `SELECT u.*, c.name AS client_name
         FROM unlisted_uploads u
         LEFT JOIN clients c ON u.client_id = c.id
         ${whereClause}
         ORDER BY u.detected_at DESC LIMIT 100`
      );
      const { results } = await (binds.length ? stmt.bind(...binds).all() : stmt.all());
      return ok({ count: (results || []).length, uploads: results || [] });
    }

    // ---- POST /admin/agency/seo/generate-for-video — manual SEO generation
    // Body: { video_id, client_id, title?, transcript, is_short? }
    //
    // OPTIONAL server-side path: calls Anthropic API directly. Only works if
    // ANTHROPIC_API_KEY secret is set. The PRIMARY auto-SEO path runs
    // in-skill on the always-on laptop (Cowork's native Claude session) —
    // see SKILL.md's transcribe_video handler. This endpoint exists as a
    // fallback for when the laptop is offline or you want to test the LLM
    // generator directly with a manually-pasted transcript.
    if (path === "/admin/agency/seo/generate-for-video" && method === "POST") {
      if (!env.ANTHROPIC_API_KEY) {
        return err("Server-side generation requires ANTHROPIC_API_KEY secret. Default pipeline uses the laptop's Cowork Claude — see SKILL.md.", 501);
      }
      const body = await request.json().catch(() => ({}));
      if (!body.video_id || !body.client_id || !body.transcript) {
        return err("video_id, client_id, and transcript are required");
      }
      const result = await generateAndStoreSeoProposal(env, {
        videoId: body.video_id,
        clientId: body.client_id,
        title: body.title,
        transcript: body.transcript,
        isShort: !!body.is_short,
      });
      if (!result.ok) return err(result.error, 502);
      return ok(result);
    }

    // ---- POST /admin/agency/seo/request — manual on-demand SEO generation
    //
    // Founder points at ANY video (any privacy state, any age, even competitor
    // videos for analysis) and Claude generates an SEO/RESEO proposal.
    //
    // Body: {
    //   video_id: "abc123" | "https://youtube.com/watch?v=abc123" | "https://youtu.be/abc123",
    //   client_id: "c-xxx",
    //   asset_type?: "video" | "short" | "stream",
    //   title?: "current title" (if known),
    //   transcript?: "pre-pasted transcript text" (skips the fetch step),
    //   priority?: 5 (default; can bump to 99 for "do it right now")
    // }
    //
    // Flow:
    //   - If `transcript` provided: store directly, then enqueue an
    //     "seo_generate_only" task for the laptop to do the LLM step.
    //   - If no `transcript`: enqueue transcribe_video which fetches the
    //     transcript AND generates SEO in the same SKILL run.
    //
    // Either way, the proposal ends up in seo_history as applied=0 and
    // appears in the cockpit Pending SEO queue.
    if (path === "/admin/agency/seo/request" && method === "POST") {
      const body = await request.json().catch(() => ({}));
      if (!body.client_id) return err("client_id required");

      // Accept full URLs or bare IDs
      const rawVid = String(body.video_id || "");
      const idMatch = rawVid.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{6,15})/);
      const videoId = idMatch ? idMatch[1] : rawVid.trim();
      if (!videoId || !/^[a-zA-Z0-9_-]{6,15}$/.test(videoId)) {
        return err("video_id must be a YouTube video ID or a valid YT/Shorts/youtu.be URL");
      }

      const assetType = ["video", "short", "stream"].includes(body.asset_type) ? body.asset_type : "video";
      const priority = parseInt(body.priority || 5, 10);

      // Track the request in unlisted_uploads so the cockpit can poll status
      // (the table is named "unlisted_uploads" historically; it now tracks
      // ANY video in the SEO-generation pipeline, not just unlisted ones).
      await env.DB.prepare(
        `INSERT OR IGNORE INTO unlisted_uploads
           (video_id, channel_id, client_id, title, privacy_status,
            transcript_status, seo_status)
         VALUES (?1, ?2, ?3, ?4, 'manual', ?5, 'pending')`
      ).bind(
        videoId,
        body.channel_id || null,
        body.client_id,
        body.title || `Manual SEO request for ${videoId}`,
        body.transcript ? "done" : "pending"
      ).run();

      if (body.transcript) {
        // ── Path A — Transcript provided directly. Store + queue gen.
        await env.DB.prepare(
          `UPDATE unlisted_uploads
           SET transcript_text = ?1,
               transcript_status = 'done',
               transcript_fetched_at = CURRENT_TIMESTAMP,
               transcript_source = 'manual_paste'
           WHERE video_id = ?2`
        ).bind(String(body.transcript).slice(0, 50_000), videoId).run();

        // Enqueue an "seo_generate_only" task — laptop reads transcript from
        // unlisted_uploads, fetches context, generates, POSTs proposal back.
        const taskId = crypto.randomUUID();
        await env.DB.prepare(
          `INSERT INTO laptop_tasks (id, type, client_id, payload_json, priority, max_attempts, created_by)
           VALUES (?1, 'seo_generate_only', ?2, ?3, ?4, 2, 'cockpit-manual')`
        ).bind(
          taskId,
          body.client_id,
          JSON.stringify({
            video_id: videoId,
            asset_type: assetType,
            title: body.title || null,
            is_short: assetType === "short",
            source: "manual:transcript-provided",
          }),
          priority
        ).run();
        notifyLaptopPush(env, "shinel-mainframe", {
          type: "task_available", task_id: taskId, task_type: "seo_generate_only",
          client_id: body.client_id, priority, source: "cockpit-manual",
        }).catch(() => {});
        return ok({
          video_id: videoId,
          status: "queued",
          step: "generating_seo",
          task_id: taskId,
          message: "Transcript stored. Laptop will generate the proposal next poll (~5–20 min).",
        }, 202);
      }

      // ── Path B — No transcript. Enqueue full transcribe + generate flow.
      const taskId = crypto.randomUUID();
      await env.DB.prepare(
        `INSERT INTO laptop_tasks (id, type, client_id, payload_json, priority, max_attempts, created_by)
         VALUES (?1, 'transcribe_video', ?2, ?3, ?4, 2, 'cockpit-manual')`
      ).bind(
        taskId,
        body.client_id,
        JSON.stringify({
          video_id: videoId,
          asset_type: assetType,
          title: body.title || null,
          is_short: assetType === "short",
          source: "manual:cockpit",
        }),
        priority
      ).run();
      notifyLaptopPush(env, "shinel-mainframe", {
        type: "task_available", task_id: taskId, task_type: "transcribe_video",
        client_id: body.client_id, priority, source: "cockpit-manual",
      }).catch(() => {});
      return ok({
        video_id: videoId,
        status: "queued",
        step: "fetching_transcript",
        task_id: taskId,
        message: "Queued. Laptop will fetch transcript + generate SEO next poll.",
      }, 202);
    }

    // ---- GET /admin/agency/seo/request/:videoId — poll status for a manual request
    const seoStatusMatch = path.match(/^\/admin\/agency\/seo\/request\/([a-zA-Z0-9_-]{6,15})$/);
    if (seoStatusMatch && method === "GET") {
      const videoId = seoStatusMatch[1];
      const row = await env.DB.prepare(
        `SELECT u.*, c.name AS client_name, sh.applied AS seo_applied
         FROM unlisted_uploads u
         LEFT JOIN clients c ON u.client_id = c.id
         LEFT JOIN seo_history sh ON u.seo_history_id = sh.id
         WHERE u.video_id = ?1`
      ).bind(videoId).first();
      if (!row) return err("no pipeline record found for that video", 404);
      // Compute friendly status step
      let step = "pending";
      if (row.transcript_status === "done" && row.seo_status === "generated") step = "proposal_ready";
      else if (row.transcript_status === "done" && row.seo_status === "pending") step = "generating_seo";
      else if (row.transcript_status === "pending") step = "fetching_transcript";
      else if (row.transcript_status === "failed") step = "transcript_failed";
      else if (row.seo_status === "failed") step = "generation_failed";
      else if (row.seo_status === "applied") step = "applied_to_youtube";
      return ok({
        video_id: videoId,
        step,
        ...row,
      });
    }

    // ---- GET /admin/agency/ig/diagnostic
    //
    // For every active client, list every IG identifier we know about,
    // tell you exactly why the follower count is 0 (or non-zero), and
    // surface which tasks are queued / done / failed. Helps explain
    // "why are these still 0?" with precise evidence.
    if (path === "/admin/agency/ig/diagnostic" && method === "GET") {
      // 1. All active clients + their legacy IG handle from clients.instagram_handle
      const { results: clients } = await env.DB.prepare(
        `SELECT id, name, instagram_handle, instagram_followers, COALESCE(managed_by_us, 1) AS managed_by_us, status
         FROM clients
         WHERE (status = 'active' OR status IS NULL)
         ORDER BY name`
      ).all();

      // 2. All active instagram_accounts rows
      const { results: igRows } = await env.DB.prepare(
        `SELECT ia.id, ia.client_id, ia.handle, ia.role, ia.followers, ia.managed_by_us, ia.last_synced_at, ia.avatar_url
         FROM instagram_accounts ia
         WHERE ia.active = 1`
      ).all();

      // 3. Last task per (client_id, handle) — group queued + done + failed
      const { results: recentTasks } = await env.DB.prepare(
        `SELECT id, client_id, status, error, payload_json, created_at, completed_at
         FROM laptop_tasks
         WHERE type = 'ig_followers_fetch'
           AND created_at > datetime('now', '-7 days')
         ORDER BY created_at DESC`
      ).all();

      // Index recent tasks by client+handle
      const taskIdx = new Map();
      for (const t of recentTasks || []) {
        let h = "";
        try { h = (JSON.parse(t.payload_json || "{}").handle || "").toLowerCase(); } catch {}
        const key = `${t.client_id}|${h}`;
        if (!taskIdx.has(key)) taskIdx.set(key, []);
        taskIdx.get(key).push(t);
      }

      // Build per-client report
      const report = clients.map((c) => {
        const igForClient = (igRows || []).filter((r) => r.client_id === c.id);
        // Build handle set: instagram_accounts rows + legacy clients.instagram_handle
        const handlesSeen = new Set(igForClient.map((r) => String(r.handle || "").replace(/^@/, "").toLowerCase()));
        const legacyHandle = c.instagram_handle ? String(c.instagram_handle).replace(/^@/, "").toLowerCase() : null;
        const allHandles = new Set([...handlesSeen]);
        if (legacyHandle) allHandles.add(legacyHandle);

        const igDetail = [...allHandles].map((h) => {
          const row = igForClient.find((r) => String(r.handle || "").replace(/^@/, "").toLowerCase() === h);
          const tasks = taskIdx.get(`${c.id}|${h}`) || [];
          const latestTask = tasks[0];
          const pendingTasks = tasks.filter((t) => t.status === "pending" || t.status === "claimed");
          const failedTasks = tasks.filter((t) => t.status === "failed");
          const doneTasks = tasks.filter((t) => t.status === "done");

          let reason = "ok";
          let advice = null;
          if (!row && legacyHandle === h) {
            reason = "legacy_only";
            advice = `Handle "@${h}" exists in clients.instagram_handle but NOT in instagram_accounts. Add it via cockpit "+ IG" button so the sweep can find it.`;
          } else if (!row) {
            reason = "missing_row";
            advice = `No row in instagram_accounts for "@${h}". Add via cockpit "+ IG".`;
          } else if (!row.followers || row.followers === 0) {
            if (pendingTasks.length) {
              reason = "pending_fetch";
              advice = `Task queued — waiting for laptop to poll (next poll in ≤20 min). Confirm laptop is online.`;
            } else if (failedTasks.length && !doneTasks.length) {
              reason = "fetch_failed";
              advice = `Latest fetch failed: ${(failedTasks[0].error || "unknown").slice(0, 120)}. Common: login wall, rate limit, private account.`;
            } else if (!tasks.length) {
              reason = "never_queued";
              advice = `No ig_followers_fetch task in the last 7 days. Use POST /admin/agency/ig/diagnostic/resweep to enqueue one.`;
            } else if (doneTasks.length) {
              reason = "fetched_zero";
              advice = `Last fetch returned 0 followers. Likely a private/new account or scraper limitation. Verify on instagram.com manually.`;
            }
          }

          return {
            handle: h,
            row_id: row?.id ?? null,
            in_instagram_accounts: !!row,
            in_legacy_clients_field: legacyHandle === h,
            role: row?.role || null,
            managed_by_us: row?.managed_by_us ?? null,
            followers: row?.followers ?? 0,
            last_synced_at: row?.last_synced_at ?? null,
            has_avatar: !!row?.avatar_url,
            pending_tasks: pendingTasks.length,
            failed_tasks: failedTasks.length,
            done_tasks: doneTasks.length,
            latest_task: latestTask ? {
              id: latestTask.id,
              status: latestTask.status,
              error: latestTask.error,
              created_at: latestTask.created_at,
              completed_at: latestTask.completed_at,
            } : null,
            reason,
            advice,
          };
        });

        return {
          client_id: c.id,
          name: c.name,
          managed_by_us: !!c.managed_by_us,
          status: c.status || "active",
          legacy_instagram_handle: legacyHandle,
          legacy_followers: c.instagram_followers || 0,
          ig_count: igDetail.length,
          ig_total_followers: igDetail.reduce((s, x) => s + (x.followers || 0), 0),
          igs: igDetail,
        };
      });

      // Summary across all clients
      const summary = {
        total_clients: report.length,
        total_ig_handles: report.reduce((s, r) => s + r.ig_count, 0),
        handles_with_zero: report.reduce((s, r) => s + r.igs.filter((x) => x.followers === 0).length, 0),
        handles_pending_fetch: report.reduce((s, r) => s + r.igs.filter((x) => x.reason === "pending_fetch").length, 0),
        handles_fetch_failed: report.reduce((s, r) => s + r.igs.filter((x) => x.reason === "fetch_failed").length, 0),
        handles_never_queued: report.reduce((s, r) => s + r.igs.filter((x) => x.reason === "never_queued").length, 0),
        handles_legacy_only: report.reduce((s, r) => s + r.igs.filter((x) => x.reason === "legacy_only").length, 0),
        handles_fetched_zero: report.reduce((s, r) => s + r.igs.filter((x) => x.reason === "fetched_zero").length, 0),
        handles_ok: report.reduce((s, r) => s + r.igs.filter((x) => x.reason === "ok").length, 0),
      };

      return ok({ summary, report });
    }

    // ---- POST /admin/agency/ig/manual-entry
    //
    // Set the follower count for a specific IG handle WITHOUT going through
    // the scraper. Use when Instagram's scraping keeps failing (login wall,
    // rate limit, private account, etc.) and you just want the number to
    // appear correctly in Total Reach.
    //
    // Body: { client_id, handle, followers, avatar_url? }
    if (path === "/admin/agency/ig/manual-entry" && method === "POST") {
      const body = await request.json().catch(() => ({}));
      if (!body.client_id || !body.handle || body.followers == null) {
        return err("client_id, handle, and followers required");
      }
      const followers = parseInt(body.followers, 10);
      if (!Number.isFinite(followers) || followers < 0) return err("followers must be a non-negative integer");
      const clean = String(body.handle).replace(/^@/, "").trim().toLowerCase();

      // Try UPDATE first (most common — row exists, just no count)
      const upd = await env.DB.prepare(
        `UPDATE instagram_accounts
         SET followers = ?1, avatar_url = COALESCE(?2, avatar_url),
             last_synced_at = strftime('%s', 'now')
         WHERE client_id = ?3
           AND LOWER(REPLACE(handle, '@', '')) = ?4`
      ).bind(followers, body.avatar_url || null, body.client_id, clean).run();

      let action = "updated";
      if (!upd?.meta?.changes) {
        // INSERT a new row — id is TEXT PRIMARY KEY, not autoincrement
        await env.DB.prepare(
          `INSERT INTO instagram_accounts
             (id, client_id, handle, url, role, followers, avatar_url, managed_by_us, active)
           VALUES (?1, ?2, ?3, ?4, 'main', ?5, ?6, 1, 1)`
        ).bind(
          crypto.randomUUID(),
          body.client_id,
          clean,
          `https://instagram.com/${clean}`,
          followers,
          body.avatar_url || null
        ).run();
        action = "inserted";
      }

      // Also bump the legacy clients.instagram_followers if this is the main
      // (most-followers) IG row — keeps the legacy field consistent.
      await env.DB.prepare(
        `UPDATE clients
         SET instagram_followers = (
           SELECT MAX(followers) FROM instagram_accounts WHERE client_id = ?1 AND active = 1
         )
         WHERE id = ?1`
      ).bind(body.client_id).run();

      // Audit log
      try {
        await env.DB.prepare(
          `INSERT INTO agent_log (action, level, message, client_id, payload_json) VALUES (?1, ?2, ?3, ?4, ?5)`
        ).bind(
          "ig.manual_entry",
          "info",
          `Manual IG count set: @${clean} = ${followers.toLocaleString("en-IN")}`,
          body.client_id,
          JSON.stringify({ handle: clean, followers, source: "manual_entry" })
        ).run();
      } catch {}

      return ok({ action, client_id: body.client_id, handle: clean, followers });
    }

    // ---- POST /admin/agency/ig/diagnostic/resweep
    //
    // Re-enqueue ig_followers_fetch for every handle currently at 0 followers
    // or with no pending task. Lets you "fix all the zero rows" in one click
    // without leaving the cockpit.
    if (path === "/admin/agency/ig/diagnostic/resweep" && method === "POST") {
      const body = await request.json().catch(() => ({}));
      const onlyClientId = body.client_id || null;

      // Find every IG that's currently at 0 followers (and active)
      const stmt = onlyClientId
        ? env.DB.prepare(
            `SELECT ia.client_id, ia.handle FROM instagram_accounts ia
             JOIN clients c ON ia.client_id = c.id
             WHERE ia.active = 1 AND COALESCE(ia.followers, 0) = 0
               AND (c.status = 'active' OR c.status IS NULL)
               AND ia.client_id = ?1`
          ).bind(onlyClientId)
        : env.DB.prepare(
            `SELECT ia.client_id, ia.handle FROM instagram_accounts ia
             JOIN clients c ON ia.client_id = c.id
             WHERE ia.active = 1 AND COALESCE(ia.followers, 0) = 0
               AND (c.status = 'active' OR c.status IS NULL)`
          );
      const { results: zeros } = await stmt.all();

      const enqueued = [];
      for (const row of zeros || []) {
        const clean = String(row.handle).replace(/^@/, "").toLowerCase();
        const taskId = `igfetch-resweep-${row.client_id}-${clean}-${Math.floor(Date.now()/1000)}`;
        await env.DB.prepare(
          `INSERT OR IGNORE INTO laptop_tasks (id, type, client_id, payload_json, priority, max_attempts, created_by)
           VALUES (?1, 'ig_followers_fetch', ?2, ?3, 5, 3, 'diagnostic-resweep')`
        ).bind(
          taskId,
          row.client_id,
          JSON.stringify({ handle: clean, source: "diagnostic-resweep" })
        ).run();
        enqueued.push({ client_id: row.client_id, handle: clean, task_id: taskId });
        notifyLaptopPush(env, "shinel-mainframe", {
          type: "task_available", task_id: taskId, task_type: "ig_followers_fetch",
          client_id: row.client_id, priority: 5, source: "diagnostic-resweep",
        }).catch(() => {});
      }
      return ok({ enqueued_count: enqueued.length, enqueued });
    }

    // ---- POST /admin/agency/unlisted-uploads/scan — enqueue Studio audit
    // For one channel or all managed channels.
    if (path === "/admin/agency/unlisted-uploads/scan" && method === "POST") {
      const body = await request.json().catch(() => ({}));
      let channels;
      if (body.channel_id) {
        channels = [{ channel_id: body.channel_id, client_id: body.client_id }];
      } else {
        const r = await env.DB.prepare(
          `SELECT cc.channel_id, cc.client_id
           FROM client_channels cc
           JOIN clients c ON cc.client_id = c.id
           WHERE cc.active = 1
             AND (c.status = 'active' OR c.status IS NULL)
             AND COALESCE(c.managed_by_us, 1) = 1`
        ).all();
        channels = r.results || [];
      }
      const enqueued = [];
      for (const ch of channels) {
        const tId = crypto.randomUUID();
        await env.DB.prepare(
          `INSERT INTO laptop_tasks (id, type, client_id, payload_json, priority, max_attempts, created_by)
           VALUES (?1, 'unlisted_video_audit', ?2, ?3, 5, 2, 'manual-scan')`
        ).bind(
          tId,
          ch.client_id,
          JSON.stringify({ channel_id: ch.channel_id, source: "manual-scan" })
        ).run();
        notifyLaptopPush(env, "shinel-mainframe", {
          type: "task_available", task_id: tId, task_type: "unlisted_video_audit",
          client_id: ch.client_id, priority: 5, source: "manual-scan",
        }).catch(() => {});
        enqueued.push({ channel_id: ch.channel_id, task_id: tId });
      }
      return ok({ enqueued_count: enqueued.length, enqueued });
    }

    // ========================================================================
    // GOOGLE SHEETS SYNC — Option B (append-only)
    //
    // Append a new row when a cockpit project is created/updated, never touch
    // any row we didn't write. The founder's manual rows in Monthly Tracker
    // are permanently safe — we only modify rows tracked via projects.sheet_row_index.
    // ========================================================================

    // GET /admin/agency/sheets/connect — verify creds + list tabs
    if (path === "/admin/agency/sheets/connect" && method === "GET") {
      if (!env.MONTHLY_TRACKER_SHEET_ID) return err("MONTHLY_TRACKER_SHEET_ID secret not set on worker", 503);
      if (!env.GOOGLE_SA_JSON) return err("GOOGLE_SA_JSON secret not set on worker", 503);
      try {
        const info = await sheetVerifyConnection(env, env.MONTHLY_TRACKER_SHEET_ID);
        const todayTab = currentMonthTabName();
        info.target_tab = env.SHEET_TAB_OVERRIDE || todayTab;
        info.target_tab_exists = info.tabs.some((t) => t.title === info.target_tab);
        return ok(info);
      } catch (e) {
        return err(`Sheets API: ${e.message}`, 502);
      }
    }

    // POST /admin/agency/sheets/sync-project/:id — push one project
    const syncOne = path.match(/^\/admin\/agency\/sheets\/sync-project\/(\d+)$/);
    if (syncOne && method === "POST") {
      const result = await syncProjectToSheet(env, parseInt(syncOne[1], 10));
      return ok(result);
    }

    // POST /admin/agency/sheets/sync-all — bulk push all unsynced active projects
    //   Body: { only_unsynced?: true, status_filter?: [...] }
    //   Defaults: only_unsynced=true, status_filter=null (active projects)
    if (path === "/admin/agency/sheets/sync-all" && method === "POST") {
      const body = await request.json().catch(() => ({}));
      const onlyUnsynced = body.only_unsynced !== false;
      const where = ["archived_at IS NULL"];
      if (onlyUnsynced) where.push("sheet_synced_at IS NULL");
      if (Array.isArray(body.status_filter) && body.status_filter.length) {
        const placeholders = body.status_filter.map((_, i) => `?${i + 1}`).join(",");
        where.push(`status IN (${placeholders})`);
      }
      const stmt = env.DB.prepare(`SELECT id FROM projects WHERE ${where.join(" AND ")} ORDER BY created_at DESC LIMIT 100`);
      const binds = Array.isArray(body.status_filter) ? body.status_filter : [];
      const { results } = await (binds.length ? stmt.bind(...binds).all() : stmt.all());
      const summary = { attempted: 0, appended: 0, updated: 0, failed: 0, errors: [] };
      for (const r of results || []) {
        summary.attempted++;
        const res = await syncProjectToSheet(env, r.id);
        if (res.ok) summary[res.action === "appended" ? "appended" : "updated"]++;
        else { summary.failed++; summary.errors.push({ id: r.id, error: res.error || res.skipped }); }
      }
      return ok(summary);
    }

    // POST /admin/agency/sheets/import-projects
    //
    // Read every row in the current-month tab of Monthly Tracker and create
    // a project in D1 for every row that doesn't already exist. Matches
    // client_name → clients.id and editor_name → editors.id. Stores
    // sheet_row_index on the new project so future cockpit edits update
    // the same row.
    //
    // Body: { tab?: "May 2026", dry_run?: true }
    //
    // dry_run returns what WOULD be imported without writing anything.
    if (path === "/admin/agency/sheets/import-projects" && method === "POST") {
      if (!env.MONTHLY_TRACKER_SHEET_ID || !env.GOOGLE_SA_JSON) {
        return err("Google Sheets not configured", 503);
      }
      const body = await request.json().catch(() => ({}));
      const tab = body.tab || env.SHEET_TAB_OVERRIDE || currentMonthTabName();
      const dryRun = !!body.dry_run;

      // 1. Read sheet rows starting from row 2 (row 1 is headers)
      let rows;
      try {
        rows = await sheetReadRange(env, env.MONTHLY_TRACKER_SHEET_ID, `${tab}!A2:O500`);
      } catch (e) {
        return err(`Read sheet failed: ${e.message}`, 502);
      }

      // 2. Load clients + editors for name lookup
      const [clientRows, editorRows, alreadySynced] = await Promise.all([
        env.DB.prepare("SELECT id, name FROM clients").all(),
        env.DB.prepare("SELECT id, name FROM editors").all(),
        env.DB.prepare(
          "SELECT sheet_row_index FROM projects WHERE sheet_tab_name = ?1 AND sheet_row_index IS NOT NULL"
        ).bind(tab).all(),
      ]);
      const clientByName = new Map(
        (clientRows.results || []).map((c) => [String(c.name).trim().toLowerCase(), c.id])
      );
      const editorByName = new Map(
        (editorRows.results || []).map((e) => [String(e.name).trim().toLowerCase(), e.id])
      );
      const syncedRowIndices = new Set(
        (alreadySynced.results || []).map((r) => r.sheet_row_index)
      );

      // 3. Status normalization (sheet → cockpit)
      const STATUS_NORMALIZE = {
        "planned": "planned",
        "started": "started",
        "in progress": "in-progress",
        "in-progress": "in-progress",
        "in_progress": "in-progress",
        "completed": "completed",
        "posted": "posted",
        "added to website": "added-to-website",
        "paid": "paid",
        "pending payment": "completed", // map to completed; payment tracked separately
        "payment received": "paid",
        "cancelled": "cancelled",
      };

      // 4. Process each row
      const result = {
        tab,
        total_rows: rows.length,
        imported: 0,
        skipped_already_synced: 0,
        skipped_no_client: 0,
        skipped_no_title: 0,
        skipped_no_match: [],
        imported_rows: [],
        errors: [],
      };

      for (let i = 0; i < rows.length; i++) {
        const sheetRowIndex = i + 2; // 1-based; row 1 = header, row 2 = first data row
        const row = rows[i];
        if (!row || row.length === 0) continue;

        const clientName = String(row[0] || "").trim();
        const title = String(row[1] || "").trim();
        const assetType = String(row[2] || "video").trim().toLowerCase();
        const assetSubtype = String(row[3] || "").trim();
        const statusRaw = String(row[4] || "planned").trim().toLowerCase();
        const status = STATUS_NORMALIZE[statusRaw] || "planned";
        const startDate = String(row[5] || "").trim();
        const endDate = String(row[6] || "").trim();
        const deadlineDate = String(row[7] || "").trim();
        // I (idx 8) = Days to Deadline (formula — skip)
        const editorName = String(row[9] || "").trim();
        // K, L, M = editing minutes (sheet-only, skip)
        const clientAmount = parseInt(String(row[13] || "0").replace(/[^0-9]/g, ""), 10) || 0;
        const editorAmount = parseInt(String(row[14] || "0").replace(/[^0-9]/g, ""), 10) || 0;

        if (!clientName) continue;
        if (!title) { result.skipped_no_title++; continue; }
        if (syncedRowIndices.has(sheetRowIndex)) { result.skipped_already_synced++; continue; }

        const clientId = clientByName.get(clientName.toLowerCase());
        if (!clientId) {
          result.skipped_no_client++;
          result.skipped_no_match.push({ row: sheetRowIndex, client_name: clientName, title });
          continue;
        }
        const editorId = editorName ? editorByName.get(editorName.toLowerCase()) || null : null;

        const projectId = crypto.randomUUID();
        const dueDate = deadlineDate || null;
        const completedAt = endDate || null;

        if (!dryRun) {
          try {
            await env.DB.prepare(
              `INSERT INTO projects (
                 id, client_id, title, asset_type, status, assigned_editor_id,
                 due_date, completed_at, editor_payment_inr, client_charge_inr,
                 sheet_row_index, sheet_tab_name, sheet_synced_at
               )
               VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, CURRENT_TIMESTAMP)`
            ).bind(
              projectId,
              clientId,
              title,
              assetType,
              status,
              editorId,
              dueDate,
              completedAt,
              editorAmount,
              clientAmount,
              sheetRowIndex,
              tab
            ).run();
            result.imported++;
            result.imported_rows.push({ row: sheetRowIndex, project_id: projectId, title, client: clientName });
          } catch (e) {
            result.errors.push({ row: sheetRowIndex, title, error: String(e.message || e).slice(0, 200) });
          }
        } else {
          // dry run — just record what would happen
          result.imported++;
          result.imported_rows.push({ row: sheetRowIndex, title, client: clientName, status, editor: editorName });
        }
      }

      // Audit log
      try {
        await env.DB.prepare(
          `INSERT INTO agent_log (action, level, message, payload_json) VALUES (?1, ?2, ?3, ?4)`
        ).bind(
          dryRun ? "sheets.import.dryrun" : "sheets.import.done",
          result.errors.length > 0 ? "warn" : "info",
          `Import from ${tab}: ${result.imported} new projects${dryRun ? " (dry run)" : ""}, ${result.skipped_already_synced} already synced, ${result.skipped_no_client} unmatched clients`,
          JSON.stringify({ tab, dry_run: dryRun, ...result })
        ).run();
      } catch {}

      return ok(result);
    }

    // GET /admin/agency/sheets/dropdowns — read sheet's data validation rules
    // Force-refreshes the in-memory cache so the founder sees latest rules
    // immediately after editing the sheet's dropdowns.
    if (path === "/admin/agency/sheets/dropdowns" && method === "GET") {
      if (!env.MONTHLY_TRACKER_SHEET_ID || !env.GOOGLE_SA_JSON) return err("not configured", 503);
      const tab = url.searchParams.get("tab") || env.SHEET_TAB_OVERRIDE || currentMonthTabName();
      const key = `${env.MONTHLY_TRACKER_SHEET_ID}:${tab}`;
      _dropdownCache.delete(key); // force fresh read
      try {
        const rules = await readDropdownRules(env, env.MONTHLY_TRACKER_SHEET_ID, tab);
        // Friendlier shape: array of { column, label, values }
        const COLUMN_LABELS = {
          A: "Client Name", B: "Project Name", C: "Project Type", D: "Project Sub Type",
          E: "Status", F: "Start Date", G: "End Date", H: "Deadline Date",
          I: "Days to Deadline", J: "Editor Assigned",
          K: "Advance Editing Minutes", L: "Basic Editing Minutes",
          M: "Total Minutes", N: "Client Amount", O: "Editor Amount",
        };
        const columns = Object.entries(rules).map(([col, values]) => ({
          column: col, label: COLUMN_LABELS[col] || col, values,
        }));
        return ok({ tab, columns });
      } catch (e) {
        return err(`Sheets dropdown read: ${e.message}`, 502);
      }
    }

    // GET /admin/agency/sheets/status — show last-sync status across all projects
    if (path === "/admin/agency/sheets/status" && method === "GET") {
      const stats = await env.DB.prepare(
        `SELECT
           COUNT(*) AS total,
           COUNT(sheet_synced_at) AS synced,
           COUNT(sheet_sync_error) AS errored,
           MAX(sheet_synced_at) AS last_sync_at
         FROM projects WHERE archived_at IS NULL`
      ).first();
      const recentErrors = await env.DB.prepare(
        `SELECT id, title, sheet_sync_error FROM projects WHERE sheet_sync_error IS NOT NULL ORDER BY id DESC LIMIT 10`
      ).all();
      return ok({
        configured: !!(env.MONTHLY_TRACKER_SHEET_ID && env.GOOGLE_SA_JSON),
        sheet_id: env.MONTHLY_TRACKER_SHEET_ID || null,
        target_tab: env.SHEET_TAB_OVERRIDE || currentMonthTabName(),
        stats,
        recent_errors: recentErrors.results || [],
      });
    }

    // ========================================================================
    // PERSONAL TODOS — owner-only list, scoped strictly to JWT email.
    // Each user only ever sees / mutates their own todos. The cron pings their
    // private Discord webhook (owner_webhooks table) when items go overdue.
    // ========================================================================

    // ---- GET /admin/agency/todos  — list MY todos
    //   Query: ?status=open|done|all (default open+in_progress)
    //          ?include_snoozed=1 (default: show all incl snoozed)
    //          ?include_completed=1 (default: hide completed)
    if (path === "/admin/agency/todos" && method === "GET") {
      if (!callerEmail) return err("token has no email", 401);
      const statusFilter = (url.searchParams.get("status") || "active").toLowerCase();
      const includeDone = url.searchParams.get("include_completed") === "1" || statusFilter === "all" || statusFilter === "done";
      // Every column we reference must be table-qualified (t.) because the
      // joined `projects` table also has status/priority/due_date columns,
      // and `clients` has status too — SQLite throws SQLITE_ERROR for
      // unqualified references in that case.
      const where = ["t.owner_email = ?1"];
      const binds = [callerEmail];
      if (!includeDone) where.push("t.status NOT IN ('done', 'cancelled')");
      if (statusFilter === "done") { where.length = 1; where.push("t.owner_email = ?1"); where.push("t.status = 'done'"); }
      let results;
      try {
        const r = await env.DB.prepare(
          `SELECT t.*, p.title AS linked_project_title, c.name AS linked_client_name
           FROM personal_todos t
           LEFT JOIN projects p ON t.linked_project_id = p.id
           LEFT JOIN clients c ON t.linked_client_id = c.id
           WHERE ${where.join(" AND ")}
           ORDER BY
             CASE t.status WHEN 'in_progress' THEN 0 WHEN 'open' THEN 1 WHEN 'done' THEN 2 ELSE 3 END,
             CASE t.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 WHEN 'low' THEN 3 ELSE 4 END,
             (t.due_date IS NULL),
             t.due_date ASC,
             t.id DESC
           LIMIT 500`
        ).bind(...binds).all();
        results = r.results || [];
      } catch (e) {
        const msg = String(e.message || "");
        // Friendly error if migration hasn't been applied yet
        if (/no such table|personal_todos/i.test(msg)) {
          return ok({
            count: 0, counts: {}, todos: [],
            warning: "personal_todos table not found — run: npx wrangler d1 execute shinel-db --remote --file=migrations/personal-todos-2026-05-11.sql",
            migration_needed: true,
          });
        }
        throw e;
      }

      // Pre-compute "bucket" for the UI (overdue | due_today | upcoming | someday | done)
      const today = new Date(); today.setUTCHours(0, 0, 0, 0);
      const todayStr = today.toISOString().slice(0, 10);
      const todos = (results || []).map((t) => {
        let bucket = "someday";
        if (t.status === "done") bucket = "done";
        else if (t.status === "cancelled") bucket = "cancelled";
        else if (!t.due_date) bucket = "no_due_date";
        else {
          const d = String(t.due_date).slice(0, 10);
          if (d < todayStr) bucket = "overdue";
          else if (d === todayStr) bucket = "due_today";
          else bucket = "upcoming";
        }
        return { ...t, bucket };
      });

      // Counts by bucket so the UI can render badges
      const counts = todos.reduce((acc, t) => { acc[t.bucket] = (acc[t.bucket] || 0) + 1; return acc; }, {});
      return ok({ count: todos.length, counts, todos });
    }

    // ---- POST /admin/agency/todos  — create MY todo
    if (path === "/admin/agency/todos" && method === "POST") {
      if (!callerEmail) return err("token has no email", 401);
      const body = await request.json().catch(() => ({}));
      if (!body.title) return err("title required");
      const priority = ["low", "normal", "high", "urgent"].includes(body.priority) ? body.priority : "normal";
      const recurring = ["daily", "weekdays", "weekly", "monthly"].includes(body.recurring_pattern) ? body.recurring_pattern : null;
      const stmt = await env.DB.prepare(
        `INSERT INTO personal_todos (owner_email, title, description, priority, status, due_date, recurring_pattern, recurring_anchor, linked_project_id, linked_client_id, tags)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)`
      ).bind(
        callerEmail,
        String(body.title).trim().slice(0, 280),
        String(body.description || "").slice(0, 4000),
        priority,
        body.status === "in_progress" ? "in_progress" : "open",
        body.due_date || null,
        recurring,
        recurring ? new Date().toISOString() : null,
        body.linked_project_id ? parseInt(body.linked_project_id, 10) : null,
        body.linked_client_id ? parseInt(body.linked_client_id, 10) : null,
        body.tags ? String(body.tags).slice(0, 200) : ""
      ).run();
      const id = stmt?.meta?.last_row_id || null;
      return ok({ id, created: true }, 201);
    }

    // ---- Single-todo routes: PATCH / DELETE / complete / snooze
    const todoMatch = path.match(/^\/admin\/agency\/todos\/(\d+)(?:\/(complete|snooze|reopen))?$/);
    if (todoMatch) {
      if (!callerEmail) return err("token has no email", 401);
      const id = parseInt(todoMatch[1], 10);
      const subaction = todoMatch[2] || null;

      // Ownership check up front — never let one user touch another's todos.
      const own = await env.DB.prepare(
        "SELECT * FROM personal_todos WHERE id = ?1 AND owner_email = ?2"
      ).bind(id, callerEmail).first();
      if (!own) return err("todo not found", 404);

      if (subaction === "complete" && method === "POST") {
        const completedAt = new Date().toISOString();
        await env.DB.prepare(
          "UPDATE personal_todos SET status = 'done', completed_at = ?1, updated_at = ?1 WHERE id = ?2"
        ).bind(completedAt, id).run();

        // Spawn next instance if recurring
        let nextId = null;
        if (own.recurring_pattern) {
          const nextDue = nextRecurringDate(own.due_date || completedAt, own.recurring_pattern);
          const r = await env.DB.prepare(
            `INSERT INTO personal_todos (owner_email, title, description, priority, status, due_date, recurring_pattern, recurring_anchor, linked_project_id, linked_client_id, tags)
             VALUES (?1, ?2, ?3, ?4, 'open', ?5, ?6, ?7, ?8, ?9, ?10)`
          ).bind(
            own.owner_email, own.title, own.description || "", own.priority,
            nextDue, own.recurring_pattern, own.recurring_anchor || completedAt,
            own.linked_project_id, own.linked_client_id, own.tags || ""
          ).run();
          nextId = r?.meta?.last_row_id || null;
        }
        return ok({ id, completed: true, next_id: nextId });
      }

      if (subaction === "snooze" && method === "POST") {
        const body = await request.json().catch(() => ({}));
        // Accept either { minutes: 60 } or { until: ISO }
        let snoozeUntil;
        if (body.until) snoozeUntil = new Date(body.until).toISOString();
        else {
          const mins = parseInt(body.minutes || 60, 10);
          snoozeUntil = new Date(Date.now() + mins * 60_000).toISOString();
        }
        await env.DB.prepare(
          "UPDATE personal_todos SET snooze_until = ?1, updated_at = datetime('now') WHERE id = ?2"
        ).bind(snoozeUntil, id).run();
        return ok({ id, snoozed_until: snoozeUntil });
      }

      if (subaction === "reopen" && method === "POST") {
        await env.DB.prepare(
          "UPDATE personal_todos SET status = 'open', completed_at = NULL, updated_at = datetime('now') WHERE id = ?1"
        ).bind(id).run();
        return ok({ id, reopened: true });
      }

      if (!subaction && method === "PATCH") {
        const body = await request.json().catch(() => ({}));
        const allowed = ["title", "description", "priority", "status", "due_date", "snooze_until", "recurring_pattern", "linked_project_id", "linked_client_id", "tags"];
        const sets = [];
        const binds = [];
        let i = 1;
        for (const k of allowed) if (body[k] !== undefined) {
          sets.push(`${k} = ?${i++}`);
          binds.push(body[k] === "" ? null : body[k]);
        }
        if (!sets.length) return err("no valid fields");
        sets.push(`updated_at = datetime('now')`);
        binds.push(id);
        await env.DB.prepare(`UPDATE personal_todos SET ${sets.join(", ")} WHERE id = ?${i}`).bind(...binds).run();
        return ok({ id, updated: true });
      }

      if (!subaction && method === "DELETE") {
        await env.DB.prepare("DELETE FROM personal_todos WHERE id = ?1").bind(id).run();
        return ok({ id, deleted: true });
      }

      return err("todo subroute not found", 404);
    }

    // ---- GET /admin/agency/todos-webhook  — read my private ping config
    if (path === "/admin/agency/todos-webhook" && method === "GET") {
      if (!callerEmail) return err("token has no email", 401);
      let row = null;
      try {
        row = await env.DB.prepare(
          "SELECT owner_email, discord_user_id, quiet_hours_start, quiet_hours_end, daily_digest_hour, enabled, CASE WHEN webhook_url IS NULL OR webhook_url = '' THEN 0 ELSE 1 END AS has_webhook FROM owner_webhooks WHERE owner_email = ?1"
        ).bind(callerEmail).first();
      } catch (e) {
        const msg = String(e.message || "");
        if (/no such table|owner_webhooks/i.test(msg)) {
          return ok({
            config: null,
            fallback_env_configured: !!env.DISCORD_OWNER_WEBHOOK_URL,
            warning: "owner_webhooks table not found — run: npx wrangler d1 execute shinel-db --remote --file=migrations/personal-todos-2026-05-11.sql",
            migration_needed: true,
          });
        }
        throw e;
      }
      const fallback = !!env.DISCORD_OWNER_WEBHOOK_URL;
      return ok({ config: row || null, fallback_env_configured: fallback });
    }

    // ---- PUT /admin/agency/todos-webhook  — set my private ping config
    if (path === "/admin/agency/todos-webhook" && method === "PUT") {
      if (!callerEmail) return err("token has no email", 401);
      const body = await request.json().catch(() => ({}));
      if (!body.webhook_url) return err("webhook_url required");
      const url2 = String(body.webhook_url).trim();
      if (!/^https:\/\/(discord\.com|discordapp\.com|ptb\.discord\.com|canary\.discord\.com)\/api\/webhooks\//.test(url2)) {
        return err("must be a https://discord.com/api/webhooks/... URL");
      }
      const userId = body.discord_user_id ? String(body.discord_user_id).replace(/\D/g, "") || null : null;
      const qs = Math.max(0, Math.min(23, parseInt(body.quiet_hours_start ?? 23, 10)));
      const qe = Math.max(0, Math.min(23, parseInt(body.quiet_hours_end ?? 7, 10)));
      const dh = Math.max(0, Math.min(23, parseInt(body.daily_digest_hour ?? 8, 10)));
      await env.DB.prepare(
        `INSERT INTO owner_webhooks (owner_email, webhook_url, discord_user_id, quiet_hours_start, quiet_hours_end, daily_digest_hour, enabled)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, 1)
         ON CONFLICT(owner_email) DO UPDATE SET webhook_url = excluded.webhook_url, discord_user_id = excluded.discord_user_id, quiet_hours_start = excluded.quiet_hours_start, quiet_hours_end = excluded.quiet_hours_end, daily_digest_hour = excluded.daily_digest_hour, enabled = 1`
      ).bind(callerEmail, url2, userId, qs, qe, dh).run();
      return ok({ saved: true });
    }

    // ---- POST /admin/agency/todos/ping-now  — manually trigger MY pings
    if (path === "/admin/agency/todos/ping-now" && method === "POST") {
      if (!callerEmail) return err("token has no email", 401);
      const body = await request.json().catch(() => ({}));
      const result = await runPersonalTodoPings(env, { only_owner: callerEmail, force: !!body.force, kind: body.kind || "auto" });
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

    // YT channel counts + aggregated subscribers per client (multi-channel safe)
    env.DB.prepare(
      `SELECT client_id, COUNT(*) AS n,
              SUM(CASE WHEN role = 'main' THEN 0 ELSE 1 END) AS extras,
              COALESCE(SUM(subscribers), 0) AS subs_total
       FROM client_channels WHERE active = 1 GROUP BY client_id`
    ).all(),

    // IG account counts + aggregated followers per client
    env.DB.prepare(
      `SELECT client_id, COUNT(*) AS n,
              SUM(managed_by_us) AS managed,
              COALESCE(SUM(followers), 0) AS followers_total
       FROM instagram_accounts WHERE active = 1 GROUP BY client_id`
    ).all(),
  ]);

  // Map channel counts and ig counts onto each client row.
  // (note: variable names below come from destructuring above)
  const ytCountsByClient = {};
  for (const r of (typeof ytChannelCounts !== "undefined" && ytChannelCounts?.results) || []) {
    ytCountsByClient[r.client_id] = { n: r.n, extras: r.extras, subs_total: r.subs_total || 0 };
  }
  const igCountsByClient = {};
  for (const r of (typeof igAccountCounts !== "undefined" && igAccountCounts?.results) || []) {
    igCountsByClient[r.client_id] = { n: r.n, managed: r.managed, followers_total: r.followers_total || 0 };
  }
  const enrichedClients = (clients.results || []).map((c) => {
    // Prefer aggregated total from client_channels (sums all channels' subs).
    // Fall back to clients.subscribers (primary YT only) if no client_channels rows yet.
    const ytTotal = (ytCountsByClient[c.id]?.subs_total || 0) || (c.subscribers || 0);
    const igTotal = igCountsByClient[c.id]?.followers_total || c.instagram_followers || 0;
    return {
      ...c,
      yt_channel_count: ytCountsByClient[c.id]?.n || 0,
      ig_account_count: igCountsByClient[c.id]?.n || 0,
      ig_managed_count: igCountsByClient[c.id]?.managed || 0,
      yt_subs_total: ytTotal,
      ig_followers_total: igTotal,
      total_reach: ytTotal + igTotal,
    };
  });

  // Additional aggregates pulled from D1 for the cockpit (replaces /dashboard
  // legacy stats page). Total reach, video count, thumbnail count, plus a
  // 7-day growth % per managed client.
  let videoCount = 0, thumbnailCount = 0, totalReachAgg = 0;
  let clientGrowth = []; // [{ client_id, name, current, sevenDayAgo, deltaPct }]
  let workerHealth = { api_keys_count: 0, last_sync_ts: null };
  try {
    const [vidCnt, thumbCnt, growthRows, apiKeyCheck] = await Promise.all([
      env.DB.prepare("SELECT COUNT(*) AS n FROM media_library WHERE type = 'video'").first().catch(() => ({ n: 0 })),
      env.DB.prepare("SELECT COUNT(*) AS n FROM media_library WHERE type = 'image' OR category LIKE '%thumb%'").first().catch(() => ({ n: 0 })),
      // 7-day growth: compare clients.subscribers (today) against the oldest
      // captured snapshot for the same client in competitor_history or fall
      // back to 0 if no historical snapshot exists.
      env.DB.prepare(
        `SELECT c.id, c.name, c.subscribers AS current_subs, COALESCE(c.managed_by_us, 1) AS managed
         FROM clients c
         WHERE (c.status = 'active' OR c.status IS NULL)
         ORDER BY c.subscribers DESC LIMIT 30`
      ).all(),
      env.DB.prepare("SELECT COUNT(*) AS n FROM agent_log WHERE action LIKE 'cron.pulse%' AND created_at > datetime('now','-1 hour')").first().catch(() => ({ n: 0 })),
    ]);
    videoCount = vidCnt?.n || 0;
    thumbnailCount = thumbCnt?.n || 0;
    totalReachAgg = enrichedClients.reduce((s, c) => s + (c.yt_subs_total || c.subscribers || 0) + (c.ig_followers_total || 0), 0);
    clientGrowth = (growthRows.results || []).slice(0, 8).map((r) => ({
      client_id: r.id,
      name: r.name,
      current: r.current_subs || 0,
      delta_pct: 0, // TODO: wire to historical snapshots once we have enough data
      managed: r.managed,
    }));
    workerHealth.recent_cron_count = apiKeyCheck?.n || 0;
  } catch (e) { /* tolerate missing rows; cockpit handles undefined */ }

  return {
    generated_at: now.toISOString(),
    today,
    total_reach: totalReachAgg,
    video_count: videoCount,
    thumbnail_count: thumbnailCount,
    client_growth: clientGrowth,
    worker_health: workerHealth,
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
// runHealthCheck — pings every layer of the system and flags any that's down.
//
// Layers checked:
//  - D1 reachable (simple SELECT)
//  - YT API keys present
//  - Discord webhooks configured
//  - Always-on laptop heartbeat recent (< 30 min)
//  - Cron has fired recently (cron.pulse.start in last hour)
//  - KV reachable
//
// On any failure: posts a single Discord alert to default channel + writes
// agent_log. To avoid alert spam, uses a KV-stored "last_alert_ts" gate so
// the SAME failure won't ping more than once every 30 minutes.
// ---------------------------------------------------------------------------
export async function runHealthCheck(env, opts = {}) {
  const nowSec = Math.floor(Date.now() / 1000);
  const checks = [];

  // 1. D1 reachable
  try {
    await env.DB.prepare("SELECT 1 AS ok").first();
    checks.push({ name: "d1", status: "ok" });
  } catch (e) {
    checks.push({ name: "d1", status: "error", message: e.message });
  }

  // 2. YT API keys present — read from the canonical YOUTUBE_API_KEYS secret
  // (comma-separated pool). Falls back to legacy single-key names if the
  // pooled secret isn't set, so a half-configured worker still passes.
  const ytKeysRaw = env.YOUTUBE_API_KEYS || env.YOUTUBE_API_KEY || "";
  const ytPooled = ytKeysRaw.split(",").map((s) => s.trim()).filter(Boolean);
  const ytLegacy = ["YT_API_KEY", "YT_API_KEY_2", "YT_API_KEY_3", "YT_API_KEY_4", "YT_API_KEY_5"]
    .filter((k) => env[k]).length;
  const ytKeys = ytPooled.length || ytLegacy;
  checks.push({
    name: "yt_api_keys",
    status: ytKeys > 0 ? "ok" : "error",
    message: ytKeys > 0 ? `${ytKeys} configured (${ytPooled.length ? "pool" : "legacy"})` : "no keys configured",
    count: ytKeys,
  });

  // 3. Discord webhooks
  const dWebhooks = {
    default: !!env.DISCORD_WEBHOOK_URL,
    ops: !!env.DISCORD_OPS_WEBHOOK_URL,
    finance: !!env.DISCORD_FINANCE_WEBHOOK_URL,
  };
  checks.push({
    name: "discord_webhooks",
    status: dWebhooks.default ? "ok" : "error",
    message: dWebhooks.default ? `default ${dWebhooks.ops ? "+ops " : ""}${dWebhooks.finance ? "+finance" : ""}`.trim() : "no default webhook",
    detail: dWebhooks,
  });

  // 4. Laptop heartbeat recent
  try {
    const lap = await env.DB.prepare(
      "SELECT laptop_id, last_seen FROM laptop_heartbeats ORDER BY last_seen DESC LIMIT 1"
    ).first();
    if (lap && (nowSec - lap.last_seen) < 1800) {
      checks.push({ name: "laptop_heartbeat", status: "ok", message: `${lap.laptop_id} · ${Math.floor((nowSec - lap.last_seen)/60)}m ago` });
    } else if (lap) {
      const minsAgo = Math.floor((nowSec - lap.last_seen) / 60);
      checks.push({ name: "laptop_heartbeat", status: "warn", message: `last seen ${minsAgo}m ago — Cowork may be closed`, last_seen: lap.last_seen });
    } else {
      checks.push({ name: "laptop_heartbeat", status: "warn", message: "no laptop registered yet" });
    }
  } catch (e) {
    checks.push({ name: "laptop_heartbeat", status: "error", message: e.message });
  }

  // 5. Cron firing
  try {
    const cronHit = await env.DB.prepare(
      "SELECT created_at FROM agent_log WHERE action = 'cron.pulse.start' ORDER BY created_at DESC LIMIT 1"
    ).first();
    if (cronHit) {
      const last = Date.parse(cronHit.created_at + "Z");
      const minsAgo = Math.floor((Date.now() - last) / 60_000);
      if (minsAgo < 45) {
        checks.push({ name: "cron", status: "ok", message: `last tick ${minsAgo}m ago` });
      } else {
        checks.push({ name: "cron", status: "error", message: `last tick ${minsAgo}m ago — cron may be broken` });
      }
    } else {
      checks.push({ name: "cron", status: "error", message: "no cron heartbeats in agent_log" });
    }
  } catch (e) {
    checks.push({ name: "cron", status: "error", message: e.message });
  }

  // 6. KV reachable — READ ONLY check. The free tier caps KV PUTs at 1000/day,
  // and an every-30-min probe write was burning ~48 writes/day just for
  // health, on top of the todo pings + state transitions. Reads are unlimited,
  // so we just confirm the namespace responds to a get() on a sentinel key
  // that doesn't have to exist.
  try {
    await env.SHINEL_AUDIT.get("app:health:last_state");
    checks.push({ name: "kv", status: "ok", message: "read ok (write check skipped to save quota)" });
  } catch (e) {
    checks.push({ name: "kv", status: "error", message: e.message });
  }

  const errors = checks.filter((c) => c.status === "error");
  const warns  = checks.filter((c) => c.status === "warn");
  const overall = errors.length > 0 ? "error" : warns.length > 0 ? "warn" : "ok";

  // Alert gating — only post to Discord if state DEGRADED since last check.
  // Persist last-known overall state in KV; alert when it transitions from ok→warn/error.
  let alerted = false;
  try {
    const last = await env.SHINEL_AUDIT.get("app:health:last_state") || "ok";
    const shouldAlert = (overall !== "ok" && last === "ok") || (overall === "error" && last !== "error") || opts.force;
    if (shouldAlert) {
      const lines = [`🩺 **Health: ${overall.toUpperCase()}**`];
      for (const c of [...errors, ...warns]) {
        const emoji = c.status === "error" ? "❌" : "⚠";
        lines.push(`${emoji} ${c.name}: ${c.message || ""}`);
      }
      // Also show the OK ones briefly so it's clear what's still up
      const okChecks = checks.filter((c) => c.status === "ok").map((c) => c.name);
      if (okChecks.length > 0) lines.push(`\n✅ ${okChecks.join(", ")}`);
      await postToDiscord(env, { content: lines.join("\n") }, "default");
      alerted = true;
    }
    if (overall === "ok" && last !== "ok") {
      // Recovery ping
      await postToDiscord(env, { content: `✅ **Health recovered** — all checks passing again.` }, "default");
      alerted = true;
    }
    // ONLY write KV when state actually changes — saves writes on the
    // common steady-state path (free-tier KV PUT cap is 1000/day).
    if (overall !== last) {
      await env.SHINEL_AUDIT.put("app:health:last_state", overall);
    }
  } catch (e) { console.error("health alert gate failed:", e.message); }

  // Audit log
  try {
    await env.DB.prepare(
      `INSERT INTO agent_log (action, level, message, payload_json) VALUES (?1, ?2, ?3, ?4)`
    ).bind(
      "health.check",
      overall === "ok" ? "info" : overall,
      `Health: ${overall} · ${errors.length} errors · ${warns.length} warns`,
      JSON.stringify({ overall, checks })
    ).run();
  } catch {}

  return { ok: true, overall, checks, errors_count: errors.length, warns_count: warns.length, alerted };
}

// ---------------------------------------------------------------------------
// runUnderperformerDetector — finds videos doing <30% of channel median view
// count and auto-INSERTs a seo_history row (action='reseo', applied=0) so
// the cockpit's Pending SEO queue surfaces them.
//
// Algorithm per managed channel:
//   1. Pull last 30 video_stats snapshots (latest per video_id) for this channel
//   2. Filter to videos that are >= 7 days old (giving CTR time to stabilize)
//   3. Compute channel median view count
//   4. For each video where views < 0.30 * median AND no existing flag exists:
//      - INSERT INTO seo_history (action='reseo', applied=0, new_title=null,
//        new_description=null, notes='Auto-flagged: views {n} vs median {m}')
//      - INSERT INTO underperformer_flags (links back to seo_history.id)
//   5. Sends a single Discord ping summarizing the batch
//
// The flagged proposals start WITHOUT new_title/new_description — the founder
// fills them in via the cockpit modal (or a future LLM step). The point is to
// surface candidates automatically; humans still curate the rewrites.
//
// KV-gated to once per day per channel to avoid spamming.
// ---------------------------------------------------------------------------
export async function runUnderperformerDetector(env, opts = {}) {
  const today = new Date().toISOString().slice(0, 10);
  const gateKey = "app:underperformer:lastrun_date";
  if (!opts.force) {
    const last = await env.SHINEL_AUDIT.get(gateKey);
    if (last === today) return { ok: true, skipped: "already ran today" };
  }

  // Get all channels we manage
  const { results: channels } = await env.DB.prepare(
    `SELECT cc.channel_id, cc.client_id, c.name AS client_name, c.discord_webhook_url
     FROM client_channels cc
     JOIN clients c ON cc.client_id = c.id
     WHERE cc.active = 1
       AND (c.status = 'active' OR c.status IS NULL)
       AND COALESCE(c.managed_by_us, 1) = 1`
  ).all();
  if (!channels || !channels.length) return { ok: true, processed: 0, message: "no managed channels" };

  const summary = { ok: true, channels_scanned: 0, candidates_flagged: 0, errors: 0, by_channel: [] };
  const minAgeDays = 7;
  const ratioThreshold = 0.30; // flag if views < 30% of channel median

  for (const ch of channels) {
    try {
      // Get latest stats snapshot for each video on this channel
      const { results: rows } = await env.DB.prepare(
        `SELECT video_id, title, views, age_days, published_at, MAX(captured_at) AS latest
         FROM video_stats
         WHERE channel_id = ?1
         GROUP BY video_id
         ORDER BY MAX(captured_at) DESC
         LIMIT 30`
      ).bind(ch.channel_id).all();

      const matureVideos = (rows || []).filter((v) => (v.age_days || 0) >= minAgeDays);
      if (matureVideos.length < 5) {
        summary.by_channel.push({ channel_id: ch.channel_id, skipped: "insufficient mature video stats" });
        continue;
      }
      const sortedViews = matureVideos.map((v) => v.views || 0).sort((a, b) => a - b);
      const median = sortedViews[Math.floor(sortedViews.length / 2)];
      if (median < 50) {
        summary.by_channel.push({ channel_id: ch.channel_id, skipped: `median too low (${median})` });
        continue;
      }
      const threshold = Math.round(median * ratioThreshold);
      const candidates = matureVideos.filter((v) => (v.views || 0) < threshold);
      let flaggedHere = 0;

      for (const c of candidates) {
        // Skip if already flagged
        const existing = await env.DB.prepare(
          "SELECT video_id FROM underperformer_flags WHERE video_id = ?1"
        ).bind(c.video_id).first();
        if (existing) continue;

        // Create the SEO proposal stub
        const seoIns = await env.DB.prepare(
          `INSERT INTO seo_history
             (client_id, asset_type, video_id, action, new_title, notes, payload_json, applied)
           VALUES (?1, 'video', ?2, 'reseo', ?3, ?4, ?5, 0)`
        ).bind(
          ch.client_id,
          c.video_id,
          c.title || "(untitled)",
          `Auto-flagged: ${c.views} views vs channel median ${median} (ratio ${((c.views || 0) / median).toFixed(2)}). Needs RESEO.`,
          JSON.stringify({ auto_flagged: true, current_views: c.views, channel_median: median, threshold, age_days: c.age_days })
        ).run();
        const seoId = seoIns?.meta?.last_row_id;

        // Track the flag so we don't re-flag
        await env.DB.prepare(
          `INSERT INTO underperformer_flags (video_id, channel_id, client_id, flagged_views, channel_median, ratio, seo_history_id)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`
        ).bind(c.video_id, ch.channel_id, ch.client_id, c.views || 0, median, (c.views || 0) / median, seoId).run();
        flaggedHere++;
        summary.candidates_flagged++;
      }
      summary.channels_scanned++;
      summary.by_channel.push({
        channel_id: ch.channel_id,
        client: ch.client_name,
        median,
        threshold,
        candidates: candidates.length,
        newly_flagged: flaggedHere,
      });
    } catch (e) {
      summary.errors++;
      summary.by_channel.push({ channel_id: ch.channel_id, error: String(e.message || e).slice(0, 200) });
    }
  }

  await env.SHINEL_AUDIT.put(gateKey, today);

  try {
    await env.DB.prepare(
      `INSERT INTO agent_log (action, level, message, payload_json) VALUES (?1, ?2, ?3, ?4)`
    ).bind(
      "underperformer.detector.done",
      summary.candidates_flagged > 0 ? "info" : "info",
      `Underperformer detector: scanned ${summary.channels_scanned} channels, flagged ${summary.candidates_flagged} new candidates`,
      JSON.stringify(summary)
    ).run();
  } catch {}

  if (summary.candidates_flagged > 0) {
    await postToDiscord(env, {
      content: `🔻 **Underperformer detector** — ${summary.candidates_flagged} new RESEO candidate${summary.candidates_flagged === 1 ? "" : "s"} flagged. Open the cockpit's Pending SEO queue to review.`,
    }, "ops").catch(() => {});
  }

  return summary;
}

// ---------------------------------------------------------------------------
// captureChannelVideoStats — fetches the last N videos for a channel and
// upserts their current view/like/comment counts into video_stats. Called
// from the cron pulse pass so we get a daily time-series per video, which
// the underperformer detector reads.
//
// Cheap: 1 playlistItems call + 1 videos.list batch per channel.
// ---------------------------------------------------------------------------
export async function captureChannelVideoStats(env, channelId, uploadsPlaylistId, clientId, apiKey, limit = 20) {
  try {
    const itemsRes = await fetch(
      `https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&maxResults=${limit}&playlistId=${uploadsPlaylistId}&key=${apiKey}`
    );
    if (!itemsRes.ok) return { ok: false, error: `playlistItems ${itemsRes.status}` };
    const items = (await itemsRes.json()).items || [];
    const videoIds = items.map((i) => i.contentDetails?.videoId).filter(Boolean);
    if (!videoIds.length) return { ok: true, captured: 0 };
    const vidsRes = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet,contentDetails&id=${videoIds.join(",")}&key=${apiKey}`
    );
    if (!vidsRes.ok) return { ok: false, error: `videos.list ${vidsRes.status}` };
    const vids = (await vidsRes.json()).items || [];
    const now = new Date();
    const captureAt = now.toISOString();
    let captured = 0;
    for (const v of vids) {
      const published = v.snippet?.publishedAt || captureAt;
      const ageDays = Math.max(0, Math.floor((now.getTime() - new Date(published).getTime()) / 86400_000));
      // Parse ISO 8601 duration PT#M#S → seconds
      const dur = v.contentDetails?.duration || "PT0S";
      const m = dur.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
      const durationSec = (parseInt(m?.[1] || 0, 10) * 3600) + (parseInt(m?.[2] || 0, 10) * 60) + parseInt(m?.[3] || 0, 10);
      const isShort = durationSec > 0 && durationSec <= 60 ? 1 : 0;
      await env.DB.prepare(
        `INSERT INTO video_stats (channel_id, video_id, client_id, title, published_at, captured_at, views, likes, comments, duration_sec, is_short, age_days)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)`
      ).bind(
        channelId,
        v.id,
        clientId || null,
        v.snippet?.title || "",
        published,
        captureAt,
        parseInt(v.statistics?.viewCount || 0, 10),
        parseInt(v.statistics?.likeCount || 0, 10),
        parseInt(v.statistics?.commentCount || 0, 10),
        durationSec,
        isShort,
        ageDays
      ).run();
      captured++;
    }
    return { ok: true, captured };
  } catch (e) {
    return { ok: false, error: String(e.message || e).slice(0, 200) };
  }
}

// ---------------------------------------------------------------------------
// runCompetitorResearch — daily-cadence competitor snapshot pass.
//
// For each active competitor (across all active managed clients), fetches:
//   - current channel stats (subs, video count, view count) via YT API
//   - last 10 uploads with view counts via uploads playlist + videos.list
//   - computes median view count over the recent uploads
//   - flags videos > 2× median as overperformers (viral signals)
// Then INSERT OR REPLACE INTO competitor_history (deduped per day via
// the existing UNIQUE index on client_id+channel_id+captured_date).
//
// KV-gated: only runs once per day per cron, even if the 30-min cron fires
// many times. The competitor.research.lastrun key stores YYYY-MM-DD (UTC).
//
// Returns { ok, processed, errors, captured } summary.
// ---------------------------------------------------------------------------
export async function runCompetitorResearch(env, opts = {}) {
  const today = new Date().toISOString().slice(0, 10); // UTC date
  const gateKey = "app:competitor:lastrun_date";
  if (!opts.force) {
    const last = await env.SHINEL_AUDIT.get(gateKey);
    if (last === today) return { ok: true, skipped: "already ran today", date: today };
  }

  // Resolve YT API key (try both env shapes — pooled then single)
  const keysStr = env.YOUTUBE_API_KEYS || env.YOUTUBE_API_KEY || "";
  const keys = keysStr.split(",").map((s) => s.trim()).filter(Boolean);
  if (!keys.length) {
    return { ok: false, error: "no YOUTUBE_API_KEYS configured" };
  }
  // Round-robin pick — first key for simplicity (competitor pass is small)
  const apiKey = keys[0];

  const { results: competitors } = await env.DB.prepare(
    `SELECT cm.*, c.name AS client_name
     FROM competitors cm
     JOIN clients c ON cm.client_id = c.id
     WHERE cm.active = 1
       AND (c.status = 'active' OR c.status IS NULL)
       AND COALESCE(c.managed_by_us, 1) = 1
     ORDER BY cm.client_id, cm.id`
  ).all();
  if (!competitors || !competitors.length) {
    return { ok: true, processed: 0, message: "no active competitors found" };
  }

  const summary = { ok: true, processed: 0, errors: 0, captured: 0, overperformer_alerts: 0, detail: [] };

  for (const comp of competitors) {
    try {
      // 1. Channel stats + uploads playlist ID
      const channelRes = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?part=statistics,contentDetails&id=${comp.channel_id}&key=${apiKey}`
      );
      if (!channelRes.ok) {
        summary.errors++;
        summary.detail.push({ channel_id: comp.channel_id, error: `channels.list ${channelRes.status}` });
        continue;
      }
      const channelJson = await channelRes.json();
      const channel = channelJson.items?.[0];
      if (!channel) {
        summary.errors++;
        summary.detail.push({ channel_id: comp.channel_id, error: "channel not found" });
        continue;
      }
      const stats = channel.statistics || {};
      const uploadsPlaylist = channel.contentDetails?.relatedPlaylists?.uploads;

      // 2. Last 10 uploads with stats — playlistItems + videos.list batch
      let recentUploads = [];
      let medianViews = 0;
      let overperformers = [];
      if (uploadsPlaylist) {
        const itemsRes = await fetch(
          `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&maxResults=10&playlistId=${uploadsPlaylist}&key=${apiKey}`
        );
        if (itemsRes.ok) {
          const items = (await itemsRes.json()).items || [];
          const videoIds = items.map((i) => i.contentDetails?.videoId).filter(Boolean).slice(0, 10);
          if (videoIds.length) {
            const vidsRes = await fetch(
              `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${videoIds.join(",")}&key=${apiKey}`
            );
            if (vidsRes.ok) {
              const vids = (await vidsRes.json()).items || [];
              recentUploads = vids.map((v) => ({
                id: v.id,
                title: v.snippet?.title,
                published_at: v.snippet?.publishedAt,
                views: parseInt(v.statistics?.viewCount || 0, 10),
                likes: parseInt(v.statistics?.likeCount || 0, 10),
                comments: parseInt(v.statistics?.commentCount || 0, 10),
              }));
              // Median: sort ascending, take middle
              const views = recentUploads.map((v) => v.views).sort((a, b) => a - b);
              medianViews = views.length ? views[Math.floor(views.length / 2)] : 0;
              // Overperformers: > 2× median AND median > 0
              if (medianViews > 0) {
                overperformers = recentUploads.filter((v) => v.views >= medianViews * 2);
              }
            }
          }
        }
      }

      // 3. Upsert today's snapshot
      await env.DB.prepare(
        `INSERT INTO competitor_history (client_id, channel_id, captured_date, subs, video_count, view_count, recent_uploads_json, median_recent_views, overperformers_json)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
         ON CONFLICT(client_id, channel_id, captured_date) DO UPDATE SET
           subs = excluded.subs,
           video_count = excluded.video_count,
           view_count = excluded.view_count,
           recent_uploads_json = excluded.recent_uploads_json,
           median_recent_views = excluded.median_recent_views,
           overperformers_json = excluded.overperformers_json`
      ).bind(
        comp.client_id,
        comp.channel_id,
        today,
        parseInt(stats.subscriberCount || 0, 10),
        parseInt(stats.videoCount || 0, 10),
        parseInt(stats.viewCount || 0, 10),
        JSON.stringify(recentUploads),
        medianViews,
        JSON.stringify(overperformers)
      ).run();

      summary.processed++;
      summary.captured++;
      if (overperformers.length > 0) {
        summary.overperformer_alerts += overperformers.length;
      }
    } catch (e) {
      summary.errors++;
      summary.detail.push({ channel_id: comp.channel_id, error: String(e.message || e).slice(0, 200) });
    }
  }

  // Stamp last-run date (saves redundant work on subsequent cron ticks today)
  await env.SHINEL_AUDIT.put(gateKey, today);

  // Audit log
  try {
    await env.DB.prepare(
      `INSERT INTO agent_log (action, level, message, payload_json) VALUES (?1, ?2, ?3, ?4)`
    ).bind(
      "competitor.research.done",
      summary.errors > 0 ? "warn" : "info",
      `Competitor research: processed ${summary.processed} · ${summary.overperformer_alerts} overperformer videos detected · ${summary.errors} errors`,
      JSON.stringify(summary)
    ).run();
  } catch {}

  // Discord ping if any overperformers detected (signal worth knowing about)
  if (summary.overperformer_alerts > 0) {
    await postToDiscord(env, {
      content: `📊 **Competitor research** — ${summary.processed} channels scanned, **${summary.overperformer_alerts} overperformer videos** (>2× channel median) detected today. Check the cockpit's Competitor Overperformers card for details.`,
    }, "ops").catch(() => {});
  }

  return summary;
}

// ---------------------------------------------------------------------------
// nextRecurringDate — given a base date and a recurring pattern, return the
// next occurrence (ISO date YYYY-MM-DD). Used when a recurring todo is
// completed to spawn the next instance.
// ---------------------------------------------------------------------------
export function nextRecurringDate(baseIso, pattern) {
  const base = new Date(baseIso || Date.now());
  if (Number.isNaN(base.getTime())) return null;
  const d = new Date(base.getTime());
  if (pattern === "daily") {
    d.setUTCDate(d.getUTCDate() + 1);
  } else if (pattern === "weekdays") {
    do { d.setUTCDate(d.getUTCDate() + 1); } while ([0, 6].includes(d.getUTCDay()));
  } else if (pattern === "weekly") {
    d.setUTCDate(d.getUTCDate() + 7);
  } else if (pattern === "monthly") {
    d.setUTCMonth(d.getUTCMonth() + 1);
  } else {
    return null;
  }
  return d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// runPersonalTodoPings — checks every owner's open todos and posts a Discord
// ping to their PRIVATE webhook for items that need attention.
//
// Categories of ping:
//   - overdue       (due_date < today, status open/in_progress)
//   - due_today     (due_date == today, status open/in_progress)
//   - urgent_due_2h (due_date <= now+2h AND priority in high/urgent, status open/in_progress)
//   - morning_digest (once per day at owner's daily_digest_hour IST)
//
// De-duplication rules:
//   - One owner gets AT MOST one ping every 3 hours (overdue/urgent buckets)
//   - One owner gets AT MOST one morning_digest per day
//   - Snoozed todos (snooze_until > now) are excluded from ping content
//   - Quiet hours suppress non-urgent pings (urgent items still ping)
//
// Webhook resolution (per owner):
//   1. owner_webhooks.webhook_url for owner_email
//   2. fallback to env.DISCORD_OWNER_WEBHOOK_URL
//   3. if neither, skip silently for that owner
//
// Opts:
//   - only_owner: limit to one owner email (manual trigger)
//   - force:      bypass de-dup and quiet-hours
//   - kind:       "auto" (default), "digest", "overdue" — narrow which pings to consider
// ---------------------------------------------------------------------------
export async function runPersonalTodoPings(env, opts = {}) {
  const now = new Date();
  const nowMs = now.getTime();
  // IST = UTC+5:30
  const istMs = nowMs + 330 * 60_000;
  const ist = new Date(istMs);
  const istHour = ist.getUTCHours();
  const istDateStr = ist.toISOString().slice(0, 10);
  const todayUtcStr = now.toISOString().slice(0, 10);

  // Get distinct owners that have any open todos
  const { results: owners } = await env.DB.prepare(
    `SELECT DISTINCT owner_email FROM personal_todos WHERE status IN ('open', 'in_progress')`
  ).all();
  const ownerList = (owners || []).map((r) => r.owner_email);
  if (opts.only_owner) ownerList.splice(0, ownerList.length, opts.only_owner);
  if (!ownerList.length) return { ok: true, owners: 0, pinged: 0 };

  let pingedCount = 0;
  const detail = [];

  for (const ownerEmail of ownerList) {
    // Resolve webhook for owner
    const cfg = await env.DB.prepare(
      "SELECT webhook_url, discord_user_id, quiet_hours_start, quiet_hours_end, daily_digest_hour, enabled FROM owner_webhooks WHERE owner_email = ?1"
    ).bind(ownerEmail).first();
    const webhookUrl = (cfg?.webhook_url) || env.DISCORD_OWNER_WEBHOOK_URL || "";
    if (!webhookUrl) { detail.push({ owner: ownerEmail, skipped: "no webhook" }); continue; }
    if (cfg && cfg.enabled === 0) { detail.push({ owner: ownerEmail, skipped: "disabled" }); continue; }
    const mention = cfg?.discord_user_id ? `<@${cfg.discord_user_id}>` : "";

    const qStart = cfg?.quiet_hours_start ?? 23;
    const qEnd = cfg?.quiet_hours_end ?? 7;
    const digestHour = cfg?.daily_digest_hour ?? 8;
    // Quiet hours wrap midnight: 23..7 means hour in {23,0,1,2,3,4,5,6}
    const inQuietHours = qStart === qEnd
      ? false
      : (qStart > qEnd ? (istHour >= qStart || istHour < qEnd) : (istHour >= qStart && istHour < qEnd));

    // De-dup state for this owner
    const dedupKey = `todos:lastping:${ownerEmail}`;
    const digestKey = `todos:lastdigest:${ownerEmail}`;
    const lastPingIso = (await env.SHINEL_AUDIT.get(dedupKey)) || null;
    const lastDigestDate = (await env.SHINEL_AUDIT.get(digestKey)) || null;

    // Pull this owner's open todos
    const { results: todos } = await env.DB.prepare(
      `SELECT id, title, priority, due_date, snooze_until, status, linked_project_id, linked_client_id
       FROM personal_todos
       WHERE owner_email = ?1 AND status IN ('open', 'in_progress')`
    ).bind(ownerEmail).all();

    const notSnoozed = (todos || []).filter((t) => !t.snooze_until || new Date(t.snooze_until).getTime() <= nowMs);
    const overdue = notSnoozed.filter((t) => t.due_date && String(t.due_date).slice(0, 10) < todayUtcStr);
    const dueToday = notSnoozed.filter((t) => t.due_date && String(t.due_date).slice(0, 10) === todayUtcStr);
    const urgentSoon = notSnoozed.filter((t) =>
      (t.priority === "urgent" || t.priority === "high") &&
      t.due_date && new Date(t.due_date).getTime() <= nowMs + 2 * 60 * 60_000 &&
      new Date(t.due_date).getTime() > nowMs
    );

    // Decide which ping(s) to send
    let sentAny = false;

    // Morning digest — once per IST day at the configured hour, even in quiet hours.
    // Sends a summary even if no overdue items (so owner gets "all clear" affirmation).
    const wantDigest = (opts.kind === "auto" || opts.kind === "digest")
      && (lastDigestDate !== istDateStr)
      && (istHour === digestHour);
    if (wantDigest || (opts.force && opts.kind === "digest")) {
      const lines = [];
      lines.push(`${mention} ☀️ **Good morning** — ${istDateStr} (IST)`);
      lines.push(`You have **${notSnoozed.length}** open todo${notSnoozed.length === 1 ? "" : "s"}.`);
      if (overdue.length) lines.push(`\n🔴 **Overdue (${overdue.length})**`);
      for (const t of overdue.slice(0, 5)) lines.push(`• [#${t.id}] ${t.title}  _(due ${t.due_date})_`);
      if (overdue.length > 5) lines.push(`…and ${overdue.length - 5} more`);
      if (dueToday.length) lines.push(`\n🟡 **Due today (${dueToday.length})**`);
      for (const t of dueToday.slice(0, 5)) lines.push(`• [#${t.id}] ${t.title}`);
      if (dueToday.length > 5) lines.push(`…and ${dueToday.length - 5} more`);
      if (!overdue.length && !dueToday.length) lines.push(`\n✅ Nothing overdue or due today. Pick up an upcoming item if you have time.`);

      try {
        await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: "Shinel Cockpit · Todos", content: lines.join("\n") }),
        });
        await env.SHINEL_AUDIT.put(digestKey, istDateStr, { expirationTtl: 60 * 60 * 36 });
        sentAny = true; pingedCount++;
      } catch (e) { console.error("[todos] digest send failed:", e.message); }
    }

    // Overdue + urgent pings — gated by 3-hour de-dup and quiet hours (urgent overrides quiet).
    const hasUrgent = urgentSoon.length > 0 || overdue.some((t) => t.priority === "urgent" || t.priority === "high");
    const recentlyPinged = lastPingIso ? (nowMs - Date.parse(lastPingIso) < 3 * 60 * 60_000) : false;
    const wantOverduePing = (opts.kind === "auto" || opts.kind === "overdue")
      && (overdue.length > 0 || urgentSoon.length > 0)
      && (!recentlyPinged || opts.force)
      && (!inQuietHours || hasUrgent || opts.force);

    if (wantOverduePing) {
      const lines = [];
      const head = overdue.length
        ? `🔴 ${overdue.length} overdue todo${overdue.length === 1 ? "" : "s"}`
        : `⏰ ${urgentSoon.length} urgent todo${urgentSoon.length === 1 ? "" : "s"} due soon`;
      lines.push(`${mention} **${head}**`);
      for (const t of overdue.slice(0, 7)) {
        const p = t.priority === "urgent" ? "🚨" : t.priority === "high" ? "🔺" : "•";
        lines.push(`${p} [#${t.id}] ${t.title}  _(due ${t.due_date})_`);
      }
      if (overdue.length > 7) lines.push(`…and ${overdue.length - 7} more`);
      if (urgentSoon.length) {
        lines.push(`\n**Due in the next 2h:**`);
        for (const t of urgentSoon.slice(0, 5)) lines.push(`⏱ [#${t.id}] ${t.title}  _(due ${t.due_date})_`);
      }
      lines.push(`\n_Reply with /todos in cockpit to manage. Snooze any item to silence._`);
      try {
        await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: "Shinel Cockpit · Todos", content: lines.join("\n") }),
        });
        await env.SHINEL_AUDIT.put(dedupKey, new Date().toISOString(), { expirationTtl: 60 * 60 * 12 });
        // Stamp last_ping_at on the actual todos so the UI can show "pinged 5m ago"
        const ids = [...overdue.map((t) => t.id), ...urgentSoon.map((t) => t.id)];
        if (ids.length) {
          const placeholders = ids.map((_, i) => `?${i + 2}`).join(",");
          await env.DB.prepare(
            `UPDATE personal_todos SET last_ping_at = ?1, last_ping_reason = CASE WHEN due_date < date('now') THEN 'overdue' ELSE 'urgent' END, ping_count = ping_count + 1 WHERE id IN (${placeholders})`
          ).bind(new Date().toISOString(), ...ids).run();
        }
        sentAny = true; pingedCount++;
      } catch (e) { console.error("[todos] overdue send failed:", e.message); }
    }

    detail.push({
      owner: ownerEmail,
      open: notSnoozed.length,
      overdue: overdue.length,
      due_today: dueToday.length,
      urgent_soon: urgentSoon.length,
      pinged: sentAny,
      in_quiet_hours: inQuietHours,
      recently_pinged: recentlyPinged,
    });
  }

  return { ok: true, owners: ownerList.length, pinged: pingedCount, detail };
}

// ---------------------------------------------------------------------------
// computeNextRunSec — given a 5-field cron expression evaluated in IST,
// return the unix-second timestamp of the next firing.
//
// Cron format: minute hour day month dayOfWeek
//   Supports: *, N, N,N, N-N, */N
// IST = UTC+5:30. Always compute in IST then convert.
// ---------------------------------------------------------------------------
export function computeNextRunSec(cronExpr) {
  if (!cronExpr) return null;
  const parts = String(cronExpr).trim().split(/\s+/);
  if (parts.length !== 5) return null;
  const [minPart, hourPart, domPart, monPart, dowPart] = parts;

  const matchField = (val, expr, max, min = 0) => {
    if (expr === "*") return true;
    for (const piece of expr.split(",")) {
      if (piece.startsWith("*/")) {
        const step = parseInt(piece.slice(2), 10);
        if (step > 0 && (val - min) % step === 0) return true;
        continue;
      }
      if (piece.includes("-")) {
        const [a, b] = piece.split("-").map((n) => parseInt(n, 10));
        if (val >= a && val <= b) return true;
        continue;
      }
      if (parseInt(piece, 10) === val) return true;
    }
    return false;
  };

  // Start from "now in IST" minute-bucket + 1
  const IST_OFFSET_MIN = 330; // 5h30m
  const nowSec = Math.floor(Date.now() / 1000);
  const nowIstMs = (nowSec + IST_OFFSET_MIN * 60) * 1000;

  for (let step = 1; step <= 60 * 24 * 366; step++) {
    const t = new Date(nowIstMs + step * 60 * 1000);
    const min = t.getUTCMinutes();
    const hr  = t.getUTCHours();
    const dom = t.getUTCDate();
    const mon = t.getUTCMonth() + 1;
    const dow = t.getUTCDay(); // 0 = Sunday
    if (matchField(min, minPart, 59) &&
        matchField(hr, hourPart, 23) &&
        matchField(dom, domPart, 31, 1) &&
        matchField(mon, monPart, 12, 1) &&
        matchField(dow, dowPart, 6)) {
      // Convert this IST minute back to UTC unix seconds
      return Math.floor(t.getTime() / 1000) - IST_OFFSET_MIN * 60;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// fireScheduledTask — enqueue a laptop_task for this scheduled task and
// advance its next_run_ts. Returns { ok, enqueued_task_id }.
// ---------------------------------------------------------------------------
export async function fireScheduledTask(env, scheduledTaskId, source = "cron") {
  const st = await env.DB.prepare("SELECT * FROM scheduled_tasks WHERE id = ?1").bind(scheduledTaskId).first();
  if (!st) return { ok: false, error: "scheduled task not found" };

  // Build the laptop_task payload
  const payload = safeJsonParse(st.payload_json) || {};
  payload.scheduled_task_id = st.id;
  payload.scheduled_task_name = st.name;
  payload.source = source;

  const laptopTaskId = crypto.randomUUID();
  await env.DB.prepare(
    `INSERT INTO laptop_tasks (id, type, client_id, payload_json, priority, max_attempts, created_by)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`
  ).bind(
    laptopTaskId,
    st.task_type || "custom_prompt",
    st.client_id || null,
    JSON.stringify(payload),
    1, // scheduled tasks default priority
    3,
    `scheduled:${st.id}`
  ).run();
  // Push to any listening laptop — fire-and-forget, polling is the fallback.
  notifyLaptopPush(env, "shinel-mainframe", {
    type: "task_available", task_id: laptopTaskId,
    task_type: st.task_type || "custom_prompt", client_id: st.client_id || null,
    priority: 1, source: `scheduled:${st.id}`,
  }).catch(() => {});

  const nowSec = Math.floor(Date.now() / 1000);
  const nextRun = computeNextRunSec(st.cron);
  await env.DB.prepare(
    `UPDATE scheduled_tasks
     SET last_run_ts = ?1, last_run_status = 'enqueued', last_run_task_id = ?2,
         next_run_ts = ?3, run_count = run_count + 1, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?4`
  ).bind(nowSec, laptopTaskId, nextRun, st.id).run();

  return { ok: true, scheduled_task_id: st.id, enqueued_task_id: laptopTaskId, next_run_ts: nextRun };
}

// ---------------------------------------------------------------------------
// runScheduledTaskTick — called from the worker cron every 30 min.
// Finds all enabled scheduled tasks whose next_run_ts has passed and fires
// each one. Returns a small summary.
// ---------------------------------------------------------------------------
export async function runScheduledTaskTick(env) {
  if (!env.DB) return { ok: false, reason: "no DB binding" };
  const nowSec = Math.floor(Date.now() / 1000);

  // First-time tasks have next_run_ts=NULL — compute it now so they fire on schedule, not immediately.
  await env.DB.prepare(
    `UPDATE scheduled_tasks SET next_run_ts = ?1
     WHERE enabled = 1 AND next_run_ts IS NULL`
  ).bind(nowSec + 60).run();  // arm to fire ~1 min from now if their cron says so

  // Find due tasks (enabled + next_run_ts in the past)
  const { results: due } = await env.DB.prepare(
    `SELECT id FROM scheduled_tasks WHERE enabled = 1 AND next_run_ts IS NOT NULL AND next_run_ts <= ?1`
  ).bind(nowSec).all();

  if (!due || due.length === 0) return { ok: true, fired: 0 };

  let fired = 0;
  for (const row of due) {
    try {
      const r = await fireScheduledTask(env, row.id, "cron");
      if (r.ok) fired++;
    } catch (e) { console.error("fireScheduledTask failed for", row.id, e.message); }
  }
  return { ok: true, fired, due_count: due.length };
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
