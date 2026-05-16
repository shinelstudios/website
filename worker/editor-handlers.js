/**
 * editor-handlers.js — editor-scope worker routes for /editor/me/*
 * 2026-05-09
 *
 * Editors see ONLY their assigned tasks. Strict need-to-know:
 *   - GET /editor/me/profile          → their editor row
 *   - GET /editor/me/tasks            → tasks WHERE assignee_email = jwt.email
 *   - GET /editor/me/projects         → projects WHERE assigned_editor_id = self
 *   - PATCH /editor/me/tasks/:id      → update status only ('todo'|'doing'|'done')
 *
 * No path returns OTHER editors' work, no client list, no finance, no global state.
 * Auth: any logged-in user with role including "editor", "team", "admin", or "artist".
 *
 * INTEGRATION (1-line addition to worker.js — see EDITOR-PATCH.md):
 *
 *   import { handleEditorRoute } from "./editor-handlers.js";
 *   const editorRes = await handleEditorRoute(request, env, secret, url, requireAuthOrThrow);
 *   if (editorRes) return editorRes;
 */

const BASE_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
};

function corsHeaders(request, env) {
  const origin = request.headers.get("origin") || "";
  const allowed = (env.ALLOWED_ORIGINS || "")
    .split(",").map((s) => s.trim()).filter(Boolean);
  const isAllowed = origin && allowed.some((a) => {
    if (!a || a === "*") return false;
    try {
      const uo = new URL(origin); const ua = new URL(a);
      return uo.hostname === ua.hostname && uo.protocol === ua.protocol;
    } catch { return a === origin; }
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

const respond = (request, env) => {
  const cors = corsHeaders(request, env);
  return {
    ok: (data, status = 200) => new Response(JSON.stringify(data, null, 2), { status, headers: { ...BASE_HEADERS, ...cors } }),
    err: (msg, status = 400) => new Response(JSON.stringify({ error: msg }), { status, headers: { ...BASE_HEADERS, ...cors } }),
  };
};

// Look up the editors row matching the JWT email. If no row exists AND the
// caller has a staff role (team/admin/editor/artist), auto-create one so
// EVERY staff member can use /editor/me + build a portfolio without an
// admin pre-adding them to the roster.
//
// Founder policy (May 2026): "portfolio should work for all our staff".
async function getCurrentEditor(env, payload) {
  if (!env?.DB || !payload?.email) return null;
  try {
    const email = String(payload.email).trim().toLowerCase();
    let row = await env.DB
      .prepare("SELECT * FROM editors WHERE LOWER(email) = ? AND active = 1 LIMIT 1")
      .bind(email).first();
    if (row) return row;

    // No row — check if caller is staff (team/admin/editor/artist) and create
    const roleStr = String(payload.role || "").toLowerCase();
    const roles = roleStr.split(",").map((s) => s.trim()).filter(Boolean);
    const isStaff = roles.some((r) => ["team", "admin", "editor", "artist"].includes(r));
    if (!isStaff) return null;

    // Derive a reasonable name from email local-part (e.g. "raghav@..." → "Raghav")
    const localPart = email.split("@")[0] || "Staff";
    const niceName = localPart
      .replace(/[._-]+/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
    // Pick a default role for the editors row based on JWT role
    const editorRole = roles.includes("admin") ? "admin"
      : roles.includes("team") ? "team"
      : roles.includes("artist") ? "artist"
      : "editor";

    const id = crypto.randomUUID();

    // Pick a public slug. Prefer the email local-part; if taken, suffix.
    // The slug reservation lets the editor's portfolio URL "just work" once they
    // add a single item + publish, instead of forcing slug configuration first.
    const baseSlug = (localPart || "staff").toLowerCase().replace(/[^a-z0-9_-]/g, "");
    let slug = baseSlug;
    try {
      let attempt = 0;
      while (attempt < 10) {
        const taken = await env.DB.prepare(
          "SELECT id FROM editors WHERE LOWER(slug) = ?1 LIMIT 1"
        ).bind(slug).first();
        if (!taken) break;
        attempt++;
        slug = `${baseSlug}-${attempt + 1}`;
      }
    } catch { slug = baseSlug; }

    await env.DB.prepare(
      `INSERT INTO editors (id, name, email, role, compensation_type, active, joined_at, slug, public_enabled)
       VALUES (?1, ?2, ?3, ?4, 'salary', 1, datetime('now'), ?5, 1)`
    ).bind(id, niceName, email, editorRole, slug).run();

    row = await env.DB
      .prepare("SELECT * FROM editors WHERE id = ?1")
      .bind(id).first();

    try {
      await env.DB.prepare(
        `INSERT INTO agent_log (action, level, message, payload_json) VALUES (?1, ?2, ?3, ?4)`
      ).bind(
        "editor.auto_created",
        "info",
        `Auto-created editor row for staff member ${email}`,
        JSON.stringify({ id, email, role: editorRole, source: "/editor/me access" })
      ).run();
    } catch {}

    return row;
  } catch (e) {
    console.error("getCurrentEditor failed:", e?.message || e);
    return null;
  }
}

export async function handleEditorRoute(request, env, secret, url, requireAuthOrThrow) {
  const path = url.pathname;
  const method = request.method;

  // --- Public read-only routes for editor portfolios ---
  // These run BEFORE the auth gate so anyone (visitors) can see published
  // editor pages. Format: /editor/public/:slug
  //                       /editor/public/:slug/portfolio
  // Editor must have public_enabled=1 to appear.
  const { ok: pubOk, err: pubErr } = respond(request, env);
  const publicSlugMatch = path.match(/^\/editor\/public\/([a-z0-9_-]+)(?:\/portfolio)?$/i);
  if (publicSlugMatch && method === "GET") {
    const slug = publicSlugMatch[1].toLowerCase();
    const isPortfolio = path.endsWith("/portfolio");
    try {
      const editor = await env.DB.prepare(
        `SELECT id, name, slug, bio, avatar_url, cover_url, portfolio_color, socials_json, role
         FROM editors
         WHERE LOWER(slug) = ?1 AND public_enabled = 1 AND active = 1`
      ).bind(slug).first();
      if (!editor) return pubErr("editor profile not found or not public", 404);

      if (isPortfolio) {
        const { results } = await env.DB.prepare(
          `SELECT id, asset_type, source, title, description, client_attribution,
                  thumbnail_url, video_url, embed_youtube_id, tags, sort_order, featured, created_at
           FROM editor_portfolio_items
           WHERE editor_id = ?1 AND public_enabled = 1
           ORDER BY featured DESC, sort_order ASC, created_at DESC
           LIMIT 200`
        ).bind(editor.id).all();
        return pubOk({ items: results || [] });
      }
      // Profile only — no items here so the page can fetch portfolio lazily
      return pubOk({
        editor: {
          name: editor.name,
          slug: editor.slug,
          bio: editor.bio || "",
          avatar_url: editor.avatar_url,
          cover_url: editor.cover_url,
          portfolio_color: editor.portfolio_color || "#E85002",
          role: editor.role,
          socials: (() => { try { return JSON.parse(editor.socials_json || "{}"); } catch { return {}; } })(),
        },
      });
    } catch (e) {
      console.error("[editor public] error:", e);
      return pubErr("internal error", 500);
    }
  }

  if (!path.startsWith("/editor/me/")) return null;

  const { ok, err } = respond(request, env);

  // Auth gate (any logged-in user; we additionally require editor row exists)
  let payload;
  try { payload = await requireAuthOrThrow(request, secret, env); }
  catch (e) { return err(e?.message || "unauthorized", e?.status || 401); }

  const editor = await getCurrentEditor(env, payload);
  if (!editor) {
    return err("Not on the editor roster — ask an admin to add you to /dashboard/editors.", 403);
  }
  const myEmail = String(payload.email).toLowerCase();

  try {
    // ---- GET /editor/me/profile
    if (path === "/editor/me/profile" && method === "GET") {
      return ok({
        editor: {
          id: editor.id,
          name: editor.name,
          email: editor.email,
          role: editor.role,
          payment_per: editor.payment_per,
          joined_at: editor.joined_at,
        },
      });
    }

    // ---- GET /editor/me/tasks
    // Returns ONLY their tasks. Three buckets: up-next (todo), in-progress (doing), recent-done (last 7d).
    if (path === "/editor/me/tasks" && method === "GET") {
      const cutoff = new Date(Date.now() - 7 * 86400_000).toISOString();

      const [upNext, inProgress, recentDone] = await Promise.all([
        env.DB.prepare(
          `SELECT t.*, p.title AS project_title, p.client_id, p.asset_type, p.due_date AS project_due_date
           FROM tasks t LEFT JOIN projects p ON t.project_id = p.id
           WHERE LOWER(t.assignee_email) = ?1 AND t.status = 'todo'
           ORDER BY t.priority DESC, t.due_date ASC NULLS LAST, t.created_at ASC LIMIT 50`
        ).bind(myEmail).all(),
        env.DB.prepare(
          `SELECT t.*, p.title AS project_title, p.client_id, p.asset_type, p.due_date AS project_due_date
           FROM tasks t LEFT JOIN projects p ON t.project_id = p.id
           WHERE LOWER(t.assignee_email) = ?1 AND t.status = 'doing'
           ORDER BY t.updated_at DESC LIMIT 50`
        ).bind(myEmail).all(),
        env.DB.prepare(
          `SELECT t.*, p.title AS project_title, p.client_id
           FROM tasks t LEFT JOIN projects p ON t.project_id = p.id
           WHERE LOWER(t.assignee_email) = ?1 AND t.status = 'done' AND t.completed_at >= ?2
           ORDER BY t.completed_at DESC LIMIT 20`
        ).bind(myEmail, cutoff).all(),
      ]);

      return ok({
        editor: { id: editor.id, name: editor.name },
        up_next: upNext.results || [],
        in_progress: inProgress.results || [],
        recent_done: recentDone.results || [],
        counts: {
          up_next: (upNext.results || []).length,
          in_progress: (inProgress.results || []).length,
          recent_done: (recentDone.results || []).length,
        },
      });
    }

    // ---- GET /editor/me/projects
    // Projects assigned to this editor (across all tasks). Read-only summary.
    if (path === "/editor/me/projects" && method === "GET") {
      const { results } = await env.DB.prepare(
        `SELECT p.*, c.name AS client_name
         FROM projects p LEFT JOIN clients c ON p.client_id = c.id
         WHERE p.assigned_editor_id = ?1 AND p.archived_at IS NULL
         ORDER BY p.updated_at DESC LIMIT 100`
      ).bind(editor.id).all();
      return ok({ count: (results || []).length, projects: results || [] });
    }

    // ---- PATCH /editor/me/tasks/:id  (status only — todo/doing/done)
    const taskMatch = path.match(/^\/editor\/me\/tasks\/([^\/]+)$/);
    if (taskMatch && method === "PATCH") {
      const taskId = taskMatch[1];
      const body = await request.json().catch(() => ({}));
      const newStatus = String(body.status || "").toLowerCase();
      if (!["todo", "doing", "done", "blocked"].includes(newStatus)) {
        return err("status must be one of todo|doing|done|blocked");
      }
      // Verify the task belongs to this editor
      const existing = await env.DB.prepare(
        "SELECT id, assignee_email, status FROM tasks WHERE id = ?1 LIMIT 1"
      ).bind(taskId).first();
      if (!existing) return err("task not found", 404);
      if (String(existing.assignee_email || "").toLowerCase() !== myEmail) {
        return err("not your task", 403);
      }
      const completedAt = newStatus === "done" ? new Date().toISOString() : null;
      await env.DB.prepare(
        `UPDATE tasks SET status = ?1, updated_at = CURRENT_TIMESTAMP, completed_at = ?2,
         blocking_reason = ?3 WHERE id = ?4`
      ).bind(
        newStatus,
        completedAt,
        newStatus === "blocked" ? (body.blocking_reason || "Blocked — see editor") : null,
        taskId
      ).run();
      // Audit log
      await env.DB.prepare(
        `INSERT INTO agent_log (action, level, message, payload_json) VALUES (?1, ?2, ?3, ?4)`
      ).bind(
        "editor.task.status",
        "info",
        `${editor.name} → task ${taskId} → ${newStatus}`,
        JSON.stringify({ task_id: taskId, editor_id: editor.id, old: existing.status, new: newStatus })
      ).run();
      return ok({ id: taskId, status: newStatus, updated: true });
    }

    // ====================================================================
    // EDITOR PROFILE + PORTFOLIO self-service
    // ====================================================================

    // PATCH /editor/me/profile  — editor edits their own public profile.
    // Allowed: bio, avatar_url, cover_url, portfolio_color, socials, slug, public_enabled.
    // Slug must be unique + URL-safe (a-z 0-9 - _).
    if (path === "/editor/me/profile" && method === "PATCH") {
      const body = await request.json().catch(() => ({}));
      const sets = [];
      const binds = [];
      let i = 1;
      const allowedDirect = ["bio", "avatar_url", "cover_url", "portfolio_color"];
      for (const k of allowedDirect) if (body[k] !== undefined) {
        sets.push(`${k} = ?${i++}`); binds.push(body[k]);
      }
      if (body.socials !== undefined) {
        sets.push(`socials_json = ?${i++}`);
        binds.push(JSON.stringify(body.socials || {}));
      }
      if (body.public_enabled !== undefined) {
        sets.push(`public_enabled = ?${i++}`); binds.push(body.public_enabled ? 1 : 0);
      }
      if (body.slug !== undefined) {
        const slug = String(body.slug).toLowerCase().replace(/[^a-z0-9_-]/g, "");
        if (slug.length < 3) return err("slug must be at least 3 chars (a-z, 0-9, -, _)");
        // Reject if slug already taken by another editor
        const conflict = await env.DB.prepare(
          "SELECT id FROM editors WHERE LOWER(slug) = ?1 AND id != ?2"
        ).bind(slug, editor.id).first();
        if (conflict) return err(`slug "${slug}" is already taken`, 409);
        sets.push(`slug = ?${i++}`); binds.push(slug);
      }
      if (!sets.length) return err("no valid fields to update");
      binds.push(editor.id);
      await env.DB.prepare(`UPDATE editors SET ${sets.join(", ")} WHERE id = ?${i}`).bind(...binds).run();
      return ok({ updated: true });
    }

    // GET /editor/me/portfolio  — list MY portfolio items
    if (path === "/editor/me/portfolio" && method === "GET") {
      const { results } = await env.DB.prepare(
        `SELECT id, asset_type, source, title, description, client_attribution,
                thumbnail_url, video_url, embed_youtube_id, tags, sort_order, featured, public_enabled, created_at
         FROM editor_portfolio_items
         WHERE editor_id = ?1
         ORDER BY featured DESC, sort_order ASC, created_at DESC`
      ).bind(editor.id).all();
      return ok({ count: (results || []).length, items: results || [] });
    }

    // POST /editor/me/portfolio  — create a new portfolio item
    if (path === "/editor/me/portfolio" && method === "POST") {
      const body = await request.json().catch(() => ({}));
      if (!body.title) return err("title required");
      const assetType = ["thumbnail", "video", "short", "reel"].includes(body.asset_type) ? body.asset_type : "video";
      const source = body.source === "shinel" ? "shinel" : "personal";
      // Extract YT video ID from a full URL if provided
      let embedYtId = body.embed_youtube_id || null;
      if (!embedYtId && body.video_url) {
        const m = String(body.video_url).match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{6,15})/);
        if (m) embedYtId = m[1];
      }
      const r = await env.DB.prepare(
        `INSERT INTO editor_portfolio_items
           (editor_id, asset_type, source, title, description, client_attribution,
            thumbnail_url, video_url, embed_youtube_id, tags, sort_order, featured, public_enabled)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)`
      ).bind(
        editor.id, assetType, source,
        String(body.title).slice(0, 200),
        String(body.description || "").slice(0, 2000),
        body.client_attribution ? String(body.client_attribution).slice(0, 200) : null,
        body.thumbnail_url || null,
        body.video_url || null,
        embedYtId,
        body.tags ? String(body.tags).slice(0, 500) : "",
        parseInt(body.sort_order || 0, 10),
        body.featured ? 1 : 0,
        body.public_enabled === false ? 0 : 1
      ).run();
      return ok({ id: r?.meta?.last_row_id, created: true }, 201);
    }

    // PATCH/DELETE /editor/me/portfolio/:id
    const portfolioMatch = path.match(/^\/editor\/me\/portfolio\/(\d+)$/);
    if (portfolioMatch) {
      const itemId = parseInt(portfolioMatch[1], 10);
      // Ownership check
      const owned = await env.DB.prepare(
        "SELECT id FROM editor_portfolio_items WHERE id = ?1 AND editor_id = ?2"
      ).bind(itemId, editor.id).first();
      if (!owned) return err("portfolio item not found", 404);

      if (method === "PATCH") {
        const body = await request.json().catch(() => ({}));
        const allowed = ["title", "description", "client_attribution", "thumbnail_url",
          "video_url", "embed_youtube_id", "asset_type", "source", "tags",
          "sort_order", "featured", "public_enabled"];
        const sets = [];
        const binds = [];
        let i = 1;
        for (const k of allowed) if (body[k] !== undefined) {
          let v = body[k];
          if (k === "featured" || k === "public_enabled") v = v ? 1 : 0;
          if (k === "sort_order") v = parseInt(v || 0, 10);
          sets.push(`${k} = ?${i++}`); binds.push(v);
        }
        if (!sets.length) return err("no valid fields");
        sets.push(`updated_at = datetime('now')`);
        binds.push(itemId);
        await env.DB.prepare(`UPDATE editor_portfolio_items SET ${sets.join(", ")} WHERE id = ?${i}`).bind(...binds).run();
        return ok({ id: itemId, updated: true });
      }

      if (method === "DELETE") {
        await env.DB.prepare("DELETE FROM editor_portfolio_items WHERE id = ?1").bind(itemId).run();
        return ok({ id: itemId, deleted: true });
      }
    }

  } catch (e) {
    console.error("[editor-handlers] error:", e);
    return err(e?.message || "internal error", 500);
  }

  return null;
}
