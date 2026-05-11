/**
 * PersonalTodosPanel
 *
 * Owner-only personal todo list inside the Cockpit. Scoped strictly to the
 * caller's JWT email by the backend — every endpoint enforces ownership.
 *
 * What it does:
 *  - Lists my todos bucketed as overdue / due_today / upcoming / no_due / done
 *  - Add / edit inline; priority + due date + recurring + snooze + tags
 *  - Link a todo to a project or client (optional)
 *  - Configure a PRIVATE Discord webhook for pings (per-user)
 *  - "Ping me now" button to test pings + force the morning digest
 *  - Quiet hours + daily digest hour configurable per user
 *
 * Cron behaviour (worker side):
 *  - Every 30 min: checks overdue + urgent-soon todos, pings webhook with 3h de-dup
 *  - Once/day at `daily_digest_hour` IST: morning digest with all open + overdue
 *  - Snoozed todos are silent until snooze_until passes
 */
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { AUTH_BASE } from "../../config/constants";
import { getAccessToken } from "../../utils/tokenStore";

const PRIORITY_RANK = { urgent: 0, high: 1, normal: 2, low: 3 };
const PRIORITY_BADGE = {
  urgent: "bg-red-100 text-red-800 border-red-300 dark:bg-red-950 dark:text-red-200 dark:border-red-800",
  high:   "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950 dark:text-orange-200 dark:border-orange-800",
  normal: "bg-neutral-100 text-neutral-700 border-neutral-300 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700",
  low:    "bg-neutral-100 text-neutral-500 border-neutral-300 dark:bg-neutral-800 dark:text-neutral-400 dark:border-neutral-700",
};
const BUCKET_META = {
  overdue:     { label: "Overdue",     color: "text-red-700 dark:text-red-400",     emoji: "🔴" },
  due_today:   { label: "Due today",   color: "text-yellow-700 dark:text-yellow-400", emoji: "🟡" },
  upcoming:    { label: "Upcoming",    color: "text-blue-700 dark:text-blue-400",   emoji: "🔵" },
  no_due_date: { label: "No due date", color: "text-neutral-600 dark:text-neutral-400", emoji: "⚪" },
  someday:     { label: "Someday",     color: "text-neutral-500 dark:text-neutral-500", emoji: "💤" },
};
const BUCKET_ORDER = ["overdue", "due_today", "upcoming", "no_due_date", "someday"];

function authedFetch(path, opts = {}) {
  const token = getAccessToken();
  return fetch(`${AUTH_BASE}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers || {}),
    },
    credentials: "include",
  });
}

function fmtDate(iso) {
  if (!iso) return "";
  const s = String(iso).slice(0, 10);
  const d = new Date(s + "T00:00:00Z");
  if (Number.isNaN(d.getTime())) return s;
  const today = new Date(); today.setUTCHours(0, 0, 0, 0);
  const diffDays = Math.round((d.getTime() - today.getTime()) / 86400_000);
  if (diffDays === 0) return "today";
  if (diffDays === -1) return "yesterday";
  if (diffDays === 1) return "tomorrow";
  if (diffDays > 0 && diffDays < 7) return `in ${diffDays}d`;
  if (diffDays < 0 && diffDays > -14) return `${Math.abs(diffDays)}d ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function fmtRelative(iso) {
  if (!iso) return "";
  const ms = Date.now() - Date.parse(iso);
  if (Number.isNaN(ms)) return "";
  const min = Math.round(ms / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.round(hr / 24)}d ago`;
}

// =====================================================================
// AddTodo — inline quick-add row
// =====================================================================
function AddTodo({ onAdd, busy }) {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("normal");
  const [dueDate, setDueDate] = useState("");
  const [showMore, setShowMore] = useState(false);
  const [description, setDescription] = useState("");
  const [recurring, setRecurring] = useState("");
  const [tags, setTags] = useState("");

  const submit = async (e) => {
    e?.preventDefault();
    if (!title.trim()) return;
    await onAdd({
      title: title.trim(),
      description,
      priority,
      due_date: dueDate || null,
      recurring_pattern: recurring || null,
      tags,
    });
    setTitle(""); setDescription(""); setPriority("normal"); setDueDate(""); setRecurring(""); setTags("");
    setShowMore(false);
  };

  return (
    <form onSubmit={submit} className="mb-4 p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
      <div className="flex gap-2 items-stretch">
        <input
          autoFocus
          placeholder="What needs doing? (press Enter to add)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="flex-1 px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-sm"
        />
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          className="px-2 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-sm"
        >
          <option value="low">Low</option>
          <option value="normal">Normal</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="px-2 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-sm"
        />
        <button
          type="submit"
          disabled={busy || !title.trim()}
          className="px-4 py-2 rounded-lg bg-[var(--orange)] text-white text-sm font-bold disabled:opacity-50"
        >
          Add
        </button>
      </div>
      <div className="mt-2 flex items-center gap-3 text-xs">
        <button
          type="button"
          onClick={() => setShowMore((v) => !v)}
          className="text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
        >
          {showMore ? "▾ Less" : "▸ More options"}
        </button>
      </div>
      {showMore && (
        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2">
          <textarea
            placeholder="Description / notes"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="md:col-span-3 px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-sm"
          />
          <select
            value={recurring}
            onChange={(e) => setRecurring(e.target.value)}
            className="px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-sm"
          >
            <option value="">One-time (no recurrence)</option>
            <option value="daily">Repeat daily</option>
            <option value="weekdays">Repeat weekdays</option>
            <option value="weekly">Repeat weekly</option>
            <option value="monthly">Repeat monthly</option>
          </select>
          <input
            placeholder="Tags (comma-separated)"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className="md:col-span-2 px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-sm"
          />
        </div>
      )}
    </form>
  );
}

// =====================================================================
// TodoRow — single todo with inline actions
// =====================================================================
function TodoRow({ todo, onComplete, onSnooze, onDelete, onEdit, onReopen, busy }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({
    title: todo.title,
    priority: todo.priority,
    due_date: todo.due_date ? String(todo.due_date).slice(0, 10) : "",
    description: todo.description || "",
  });
  const [showSnoozeMenu, setShowSnoozeMenu] = useState(false);

  const isDone = todo.status === "done";
  const isSnoozed = todo.snooze_until && new Date(todo.snooze_until).getTime() > Date.now();
  const dueChip = todo.due_date ? fmtDate(todo.due_date) : null;

  const save = async () => {
    await onEdit(todo.id, {
      title: draft.title,
      priority: draft.priority,
      due_date: draft.due_date || null,
      description: draft.description,
    });
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="p-3 rounded-xl border border-[var(--orange)] bg-orange-50 dark:bg-orange-950/30">
        <div className="flex flex-col gap-2">
          <input
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            className="px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-sm"
          />
          <textarea
            value={draft.description}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            rows={2}
            placeholder="Notes / description"
            className="px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-sm"
          />
          <div className="flex gap-2">
            <select
              value={draft.priority}
              onChange={(e) => setDraft({ ...draft, priority: e.target.value })}
              className="flex-1 px-2 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-sm"
            >
              <option value="low">Low</option><option value="normal">Normal</option>
              <option value="high">High</option><option value="urgent">Urgent</option>
            </select>
            <input
              type="date"
              value={draft.due_date}
              onChange={(e) => setDraft({ ...draft, due_date: e.target.value })}
              className="px-2 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-sm"
            />
            <button onClick={save} disabled={busy} className="px-4 py-2 rounded-lg bg-[var(--orange)] text-white text-sm font-bold">Save</button>
            <button onClick={() => setEditing(false)} className="px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 text-sm">Cancel</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`group p-3 rounded-xl border bg-white dark:bg-neutral-900 hover:shadow-sm transition-shadow ${
      isDone ? "border-neutral-200 dark:border-neutral-800 opacity-60" :
      isSnoozed ? "border-neutral-200 dark:border-neutral-800 opacity-70" :
      todo.bucket === "overdue" ? "border-red-200 dark:border-red-900" :
      todo.bucket === "due_today" ? "border-yellow-200 dark:border-yellow-900" :
      "border-neutral-200 dark:border-neutral-800"
    }`}>
      <div className="flex items-start gap-3">
        <button
          onClick={() => (isDone ? onReopen(todo.id) : onComplete(todo.id))}
          disabled={busy}
          aria-label={isDone ? "Reopen" : "Complete"}
          className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
            isDone ? "bg-green-500 border-green-500 text-white" : "border-neutral-300 dark:border-neutral-600 hover:border-[var(--orange)]"
          }`}
        >
          {isDone && <span className="text-[10px]">✓</span>}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <div className={`text-sm font-medium ${isDone ? "line-through text-neutral-500" : ""}`}>
              {todo.title}
            </div>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase border ${PRIORITY_BADGE[todo.priority] || PRIORITY_BADGE.normal}`}>
              {todo.priority}
            </span>
            {todo.recurring_pattern && (
              <span className="text-[10px] text-neutral-500 dark:text-neutral-400">
                🔁 {todo.recurring_pattern}
              </span>
            )}
            {todo.linked_client_name && (
              <span className="text-[10px] text-neutral-500 dark:text-neutral-400">
                · client: {todo.linked_client_name}
              </span>
            )}
            {todo.linked_project_title && (
              <span className="text-[10px] text-neutral-500 dark:text-neutral-400">
                · project: {todo.linked_project_title}
              </span>
            )}
          </div>
          {todo.description && (
            <div className="mt-1 text-xs text-neutral-600 dark:text-neutral-400 whitespace-pre-wrap">
              {todo.description}
            </div>
          )}
          <div className="mt-1.5 flex items-center gap-3 text-xs text-neutral-500">
            {dueChip && (
              <span className={
                todo.bucket === "overdue" ? "text-red-600 dark:text-red-400 font-semibold" :
                todo.bucket === "due_today" ? "text-yellow-700 dark:text-yellow-400 font-semibold" :
                ""
              }>
                📅 {dueChip}
              </span>
            )}
            {isSnoozed && (
              <span>💤 snoozed until {fmtDate(todo.snooze_until)}</span>
            )}
            {todo.last_ping_at && (
              <span title={`Last pinged: ${todo.last_ping_at}`}>🔔 last ping {fmtRelative(todo.last_ping_at)}</span>
            )}
            {todo.tags && (
              <span className="text-neutral-400">#{String(todo.tags).split(",").map(s => s.trim()).filter(Boolean).join(" #")}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          {!isDone && (
            <div className="relative">
              <button
                onClick={() => setShowSnoozeMenu(!showSnoozeMenu)}
                disabled={busy}
                className="px-2 py-1 rounded text-xs text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                title="Snooze"
              >
                💤
              </button>
              {showSnoozeMenu && (
                <div className="absolute right-0 mt-1 z-10 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg overflow-hidden min-w-[140px]">
                  {[
                    { label: "1 hour", minutes: 60 },
                    { label: "Until tomorrow 9am", minutes: hoursUntilTomorrow9am() * 60 },
                    { label: "3 days", minutes: 60 * 24 * 3 },
                    { label: "1 week", minutes: 60 * 24 * 7 },
                  ].map((opt) => (
                    <button
                      key={opt.label}
                      onClick={() => { onSnooze(todo.id, opt.minutes); setShowSnoozeMenu(false); }}
                      className="block w-full text-left px-3 py-1.5 text-xs hover:bg-neutral-100 dark:hover:bg-neutral-800"
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <button
            onClick={() => setEditing(true)}
            disabled={busy}
            className="px-2 py-1 rounded text-xs text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            title="Edit"
          >
            ✏
          </button>
          <button
            onClick={() => { if (window.confirm("Delete this todo?")) onDelete(todo.id); }}
            disabled={busy}
            className="px-2 py-1 rounded text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
            title="Delete"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}

function hoursUntilTomorrow9am() {
  const now = new Date();
  const t = new Date();
  t.setDate(now.getDate() + 1);
  t.setHours(9, 0, 0, 0);
  return Math.max(1, Math.round((t.getTime() - now.getTime()) / 3_600_000));
}

// =====================================================================
// WebhookConfigPanel — set my private Discord webhook + preferences
// =====================================================================
function WebhookConfigPanel({ initial, onSaved }) {
  const [open, setOpen] = useState(!initial?.config?.has_webhook && !initial?.fallback_env_configured);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [discordUserId, setDiscordUserId] = useState(initial?.config?.discord_user_id || "");
  const [quietStart, setQuietStart] = useState(initial?.config?.quiet_hours_start ?? 23);
  const [quietEnd, setQuietEnd] = useState(initial?.config?.quiet_hours_end ?? 7);
  const [digestHour, setDigestHour] = useState(initial?.config?.daily_digest_hour ?? 8);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [pingBusy, setPingBusy] = useState(false);

  const hasWebhook = !!(initial?.config?.has_webhook);
  const usingFallback = !hasWebhook && initial?.fallback_env_configured;

  const save = async () => {
    setBusy(true); setError(null);
    try {
      const r = await authedFetch("/admin/agency/todos-webhook", {
        method: "PUT",
        body: JSON.stringify({
          webhook_url: webhookUrl,
          discord_user_id: discordUserId || null,
          quiet_hours_start: parseInt(quietStart, 10),
          quiet_hours_end: parseInt(quietEnd, 10),
          daily_digest_hour: parseInt(digestHour, 10),
        }),
      });
      if (!r.ok) { setError((await r.json())?.error || "Save failed"); return; }
      setWebhookUrl("");
      onSaved?.();
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  const pingNow = async (kind) => {
    setPingBusy(true);
    try {
      const r = await authedFetch("/admin/agency/todos/ping-now", {
        method: "POST",
        body: JSON.stringify({ force: true, kind }),
      });
      const j = await r.json();
      if (j?.pinged > 0) alert(`✅ Ping sent (${kind}). Check Discord.`);
      else alert(`No ping sent.\n${JSON.stringify(j?.detail?.[0] || j, null, 2)}`);
    } catch (e) { alert("Error: " + e.message); }
    finally { setPingBusy(false); }
  };

  return (
    <div className="mb-4 p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50">
      <button onClick={() => setOpen(!open)} className="flex items-center justify-between w-full text-left">
        <div className="text-sm font-semibold flex items-center gap-2">
          <span>🔔 Private Discord pings</span>
          {hasWebhook && <span className="text-[10px] text-green-600 dark:text-green-400 font-normal">configured</span>}
          {usingFallback && <span className="text-[10px] text-blue-600 dark:text-blue-400 font-normal">using fallback webhook</span>}
          {!hasWebhook && !usingFallback && <span className="text-[10px] text-orange-600 dark:text-orange-400 font-normal">not configured</span>}
        </div>
        <span className="text-xs text-neutral-500">{open ? "▾" : "▸"}</span>
      </button>
      {open && (
        <div className="mt-3 space-y-3">
          <p className="text-xs text-neutral-600 dark:text-neutral-400">
            Paste a Discord webhook URL from a <strong>private channel only you can see</strong>.
            Cron will ping you for overdue todos (3h de-dup) + a daily morning digest.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <input
              type="password"
              placeholder={hasWebhook ? "Webhook already set — paste new to change" : "https://discord.com/api/webhooks/..."}
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              className="md:col-span-2 px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-sm font-mono"
            />
            <input
              placeholder="Discord user ID (for @mention, optional)"
              value={discordUserId}
              onChange={(e) => setDiscordUserId(e.target.value)}
              className="px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-sm"
            />
            <div className="grid grid-cols-3 gap-2">
              <label className="text-xs">
                <span className="block text-neutral-500 mb-0.5">Quiet start</span>
                <input type="number" min={0} max={23} value={quietStart} onChange={(e) => setQuietStart(e.target.value)} className="w-full px-2 py-1.5 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-sm" />
              </label>
              <label className="text-xs">
                <span className="block text-neutral-500 mb-0.5">Quiet end</span>
                <input type="number" min={0} max={23} value={quietEnd} onChange={(e) => setQuietEnd(e.target.value)} className="w-full px-2 py-1.5 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-sm" />
              </label>
              <label className="text-xs">
                <span className="block text-neutral-500 mb-0.5">Digest at</span>
                <input type="number" min={0} max={23} value={digestHour} onChange={(e) => setDigestHour(e.target.value)} className="w-full px-2 py-1.5 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-sm" />
              </label>
            </div>
          </div>
          {error && <div className="text-xs text-red-600">{error}</div>}
          <div className="flex flex-wrap gap-2">
            <button onClick={save} disabled={busy || !webhookUrl} className="px-3 py-1.5 rounded bg-[var(--orange)] text-white text-xs font-bold disabled:opacity-50">
              {busy ? "Saving…" : (hasWebhook ? "Update settings" : "Save webhook")}
            </button>
            <button onClick={() => pingNow("digest")} disabled={pingBusy} className="px-3 py-1.5 rounded border border-neutral-300 dark:border-neutral-700 text-xs disabled:opacity-50">
              {pingBusy ? "…" : "Send digest now"}
            </button>
            <button onClick={() => pingNow("overdue")} disabled={pingBusy} className="px-3 py-1.5 rounded border border-neutral-300 dark:border-neutral-700 text-xs disabled:opacity-50">
              {pingBusy ? "…" : "Send overdue ping now"}
            </button>
          </div>
          <p className="text-[10px] text-neutral-500">
            Quiet hours (IST): pings paused between <strong>{quietStart}:00</strong> and <strong>{quietEnd}:00</strong>,
            except urgent items still ping. Daily digest fires at <strong>{digestHour}:00 IST</strong>.
          </p>
        </div>
      )}
    </div>
  );
}

// =====================================================================
// PersonalTodosPanel — main component
// =====================================================================
export default function PersonalTodosPanel() {
  const [todos, setTodos] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [filterBucket, setFilterBucket] = useState(null);
  const [webhookCfg, setWebhookCfg] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const params = showCompleted ? "?include_completed=1" : "";
      const r = await authedFetch(`/admin/agency/todos${params}`);
      if (!r.ok) { setError((await r.json())?.error || "Load failed"); return; }
      const j = await r.json();
      setTodos(j.todos || []);
      setCounts(j.counts || {});
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [showCompleted]);

  const loadWebhook = useCallback(async () => {
    try {
      const r = await authedFetch("/admin/agency/todos-webhook");
      if (!r.ok) return;
      const j = await r.json();
      setWebhookCfg(j);
    } catch {}
  }, []);

  useEffect(() => { load(); loadWebhook(); }, [load, loadWebhook]);

  const addTodo = async (body) => {
    setBusy(true);
    try {
      const r = await authedFetch("/admin/agency/todos", { method: "POST", body: JSON.stringify(body) });
      if (!r.ok) { alert((await r.json())?.error || "Add failed"); return; }
      await load();
    } finally { setBusy(false); }
  };

  const editTodo = async (id, body) => {
    setBusy(true);
    try {
      const r = await authedFetch(`/admin/agency/todos/${id}`, { method: "PATCH", body: JSON.stringify(body) });
      if (!r.ok) { alert((await r.json())?.error || "Save failed"); return; }
      await load();
    } finally { setBusy(false); }
  };

  const completeTodo = async (id) => {
    setBusy(true);
    try {
      const r = await authedFetch(`/admin/agency/todos/${id}/complete`, { method: "POST", body: "{}" });
      if (!r.ok) alert((await r.json())?.error || "Complete failed");
      await load();
    } finally { setBusy(false); }
  };

  const reopenTodo = async (id) => {
    setBusy(true);
    try {
      await authedFetch(`/admin/agency/todos/${id}/reopen`, { method: "POST", body: "{}" });
      await load();
    } finally { setBusy(false); }
  };

  const snoozeTodo = async (id, minutes) => {
    setBusy(true);
    try {
      await authedFetch(`/admin/agency/todos/${id}/snooze`, { method: "POST", body: JSON.stringify({ minutes }) });
      await load();
    } finally { setBusy(false); }
  };

  const deleteTodo = async (id) => {
    setBusy(true);
    try {
      await authedFetch(`/admin/agency/todos/${id}`, { method: "DELETE" });
      await load();
    } finally { setBusy(false); }
  };

  const filtered = useMemo(() => {
    if (!filterBucket) return todos;
    return todos.filter((t) => t.bucket === filterBucket);
  }, [todos, filterBucket]);

  const grouped = useMemo(() => {
    const g = {};
    for (const b of BUCKET_ORDER) g[b] = [];
    g.done = []; g.cancelled = [];
    for (const t of filtered) (g[t.bucket] || (g[t.bucket] = [])).push(t);
    return g;
  }, [filtered]);

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between gap-2 flex-wrap">
        <h2 className="text-2xl font-black">My Todos</h2>
        <div className="text-xs text-neutral-500">
          Private to you · Pinged to your Discord on overdue + every morning at {webhookCfg?.config?.daily_digest_hour ?? 8}:00 IST
        </div>
      </div>

      <WebhookConfigPanel initial={webhookCfg} onSaved={loadWebhook} />

      <AddTodo onAdd={addTodo} busy={busy} />

      {/* Bucket filter chips */}
      <div className="flex gap-2 flex-wrap text-xs">
        <button
          onClick={() => setFilterBucket(null)}
          className={`px-2.5 py-1 rounded-full border transition-colors ${
            !filterBucket ? "bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-neutral-900 dark:border-white" : "border-neutral-300 dark:border-neutral-700"
          }`}
        >
          All ({todos.filter(t => t.status !== "done").length})
        </button>
        {BUCKET_ORDER.map((b) => {
          const n = counts[b] || 0;
          if (!n && filterBucket !== b) return null;
          const meta = BUCKET_META[b];
          return (
            <button
              key={b}
              onClick={() => setFilterBucket(filterBucket === b ? null : b)}
              className={`px-2.5 py-1 rounded-full border transition-colors ${
                filterBucket === b ? "bg-[var(--orange)] text-white border-[var(--orange)]" : "border-neutral-300 dark:border-neutral-700 hover:border-neutral-400"
              }`}
            >
              {meta.emoji} {meta.label} ({n})
            </button>
          );
        })}
        <label className="ml-auto inline-flex items-center gap-1.5 text-xs text-neutral-500">
          <input type="checkbox" checked={showCompleted} onChange={(e) => setShowCompleted(e.target.checked)} />
          Show completed
        </label>
      </div>

      {loading && <div className="text-sm text-neutral-500 text-center py-6">Loading todos…</div>}
      {error && <div className="text-sm text-red-600 bg-red-50 dark:bg-red-950 p-3 rounded">{error}</div>}

      {!loading && todos.length === 0 && (
        <div className="text-center py-10 text-neutral-500 border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-xl">
          <div className="text-3xl mb-2">📭</div>
          <div className="text-sm">No todos yet. Add one above.</div>
        </div>
      )}

      <div className="space-y-5">
        {BUCKET_ORDER.map((b) => {
          const items = grouped[b] || [];
          if (!items.length) return null;
          const meta = BUCKET_META[b];
          return (
            <section key={b}>
              <div className={`mb-2 text-xs font-bold uppercase tracking-wider ${meta.color}`}>
                {meta.emoji} {meta.label} <span className="text-neutral-400 font-normal">· {items.length}</span>
              </div>
              <div className="space-y-1.5">
                {items.map((t) => (
                  <TodoRow
                    key={t.id}
                    todo={t}
                    onComplete={completeTodo}
                    onSnooze={snoozeTodo}
                    onDelete={deleteTodo}
                    onEdit={editTodo}
                    onReopen={reopenTodo}
                    busy={busy}
                  />
                ))}
              </div>
            </section>
          );
        })}

        {showCompleted && grouped.done?.length > 0 && (
          <section>
            <div className="mb-2 text-xs font-bold uppercase tracking-wider text-green-700 dark:text-green-400">
              ✅ Done <span className="text-neutral-400 font-normal">· {grouped.done.length}</span>
            </div>
            <div className="space-y-1.5">
              {grouped.done.map((t) => (
                <TodoRow
                  key={t.id}
                  todo={t}
                  onComplete={completeTodo}
                  onSnooze={snoozeTodo}
                  onDelete={deleteTodo}
                  onEdit={editTodo}
                  onReopen={reopenTodo}
                  busy={busy}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
