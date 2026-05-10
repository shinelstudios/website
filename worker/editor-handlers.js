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

// Look up the editors row matching the JWT email. Returns null if no editor
// row exists (editor was never added to roster).
async function getCurrentEditor(env, payload) {
  if (!env?.DB || !payload?.email) return null;
  try {
    const email = String(payload.email).trim().toLowerCase();
    const row = await env.DB
      .prepare("SELECT * FROM editors WHERE LOWER(email) = ? AND active = 1 LIMIT 1")
      .bind(email).first();
    return row || null;
  } catch (e) {
    console.error("getCurrentEditor failed:", e?.message || e);
    return null;
  }
}

export async function handleEditorRoute(request, env, secret, url, requireAuthOrThrow) {
  const path = url.pathname;
  const method = request.method;

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

  } catch (e) {
    console.error("[editor-handlers] error:", e);
    return err(e?.message || "internal error", 500);
  }

  return null;
}
