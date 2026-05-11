/**
 * ScheduledTasksPanel — embedded in OpsCockpit.
 *
 * The single source of truth for every recurring job. Worker cron checks
 * this table every 30 min and enqueues due tasks into the laptop queue.
 * Replaces having tasks scattered across Cowork's schedule on the main
 * laptop.
 */
import React, { useEffect, useState, useCallback } from "react";
import { CalendarClock, Play, Pause, Plus, Edit3, Trash2, RefreshCw, X, AlertCircle } from "lucide-react";
import { AUTH_BASE } from "../../config/constants";
import { getAccessToken } from "../../utils/tokenStore";

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

const TASK_TYPES = [
  "custom_prompt", "daily_research_run", "news_spike_scan", "content_pipeline_review",
  "weekly_client_report", "ig_followers_sweep", "milestone_check", "milestone_story_create",
  "yt_stream_seo_check",
];

const CRON_HINTS = [
  { label: "Every hour",                value: "0 * * * *" },
  { label: "Every 3 hours",             value: "0 */3 * * *" },
  { label: "Every 4 hours",             value: "0 */4 * * *" },
  { label: "Daily 3 AM IST",            value: "0 3 * * *" },
  { label: "Daily 9 AM IST",            value: "0 9 * * *" },
  { label: "Twice daily (8am+8pm)",     value: "0 8,20 * * *" },
  { label: "Sunday 10 AM IST",          value: "0 10 * * 0" },
  { label: "Monday 9 AM IST",           value: "0 9 * * 1" },
  { label: "Every 30 min",              value: "*/30 * * * *" },
];

function fmtTs(s) {
  if (!s) return "—";
  try { return new Date(s * 1000).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" }); }
  catch { return "—"; }
}
function fmtAgo(secAgo) {
  if (secAgo == null) return "never";
  if (secAgo < 60) return `${secAgo}s ago`;
  if (secAgo < 3600) return `${Math.floor(secAgo / 60)}m ago`;
  if (secAgo < 86400) return `${Math.floor(secAgo / 3600)}h ago`;
  return `${Math.floor(secAgo / 86400)}d ago`;
}
function fmtUntil(sec) {
  if (sec == null) return "—";
  const now = Math.floor(Date.now() / 1000);
  const delta = sec - now;
  if (delta < 0) return `due ${fmtAgo(-delta)}`;
  if (delta < 60) return `in ${delta}s`;
  if (delta < 3600) return `in ${Math.floor(delta / 60)}m`;
  if (delta < 86400) return `in ${Math.floor(delta / 3600)}h`;
  return `in ${Math.floor(delta / 86400)}d`;
}

function EditTaskModal({ task, clients, onClose, onSaved }) {
  const isNew = !task;
  const [form, setForm] = useState(task ? {
    name: task.name,
    description: task.description || "",
    cron: task.cron,
    task_type: task.task_type,
    client_id: task.client_id || "",
    payload: task.payload_json ? task.payload_json : "{}",
    enabled: task.enabled === 1,
  } : {
    name: "", description: "", cron: "0 9 * * *",
    task_type: "custom_prompt", client_id: "", payload: '{"prompt":""}',
    enabled: true,
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const save = async () => {
    let payloadObj;
    try { payloadObj = form.payload ? JSON.parse(form.payload) : {}; }
    catch { setErr("Payload JSON is invalid"); return; }

    setBusy(true); setErr(null);
    try {
      const body = {
        name: form.name,
        description: form.description,
        cron: form.cron,
        task_type: form.task_type,
        client_id: form.client_id || null,
        payload: payloadObj,
        enabled: form.enabled,
      };
      const url = isNew ? "/admin/agency/scheduled-tasks" : `/admin/agency/scheduled-tasks/${encodeURIComponent(task.id)}`;
      const method = isNew ? "POST" : "PATCH";
      const r = await authedFetch(url, { method, body: JSON.stringify(body) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || `API ${r.status}`);
      onSaved();
      onClose();
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  };

  const remove = async () => {
    if (!window.confirm(`Delete scheduled task "${task.name}"? This cannot be undone.`)) return;
    setBusy(true);
    try {
      const r = await authedFetch(`/admin/agency/scheduled-tasks/${encodeURIComponent(task.id)}`, { method: "DELETE" });
      if (!r.ok) throw new Error(`API ${r.status}`);
      onSaved();
      onClose();
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="bg-[var(--surface-elev)] rounded-xl border border-neutral-200 dark:border-neutral-800 max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-lg font-bold">{isNew ? "New scheduled task" : "Edit scheduled task"}</h3>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-700"><X size={18} /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-neutral-500 uppercase tracking-wider mb-1 block">Name *</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full bg-[var(--surface)] border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs text-neutral-500 uppercase tracking-wider mb-1 block">Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="w-full bg-[var(--surface)] border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-neutral-500 uppercase tracking-wider mb-1 block">Cron (IST) *</label>
              <input value={form.cron} onChange={(e) => setForm({ ...form, cron: e.target.value })} placeholder="0 3 * * *" className="w-full bg-[var(--surface)] border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 py-2 text-sm font-mono" />
              <select onChange={(e) => e.target.value && setForm({ ...form, cron: e.target.value })} value="" className="text-[10px] mt-1 bg-transparent text-neutral-500">
                <option value="">presets…</option>
                {CRON_HINTS.map((h) => <option key={h.value} value={h.value}>{h.label} ({h.value})</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-neutral-500 uppercase tracking-wider mb-1 block">Task type</label>
              <select value={form.task_type} onChange={(e) => setForm({ ...form, task_type: e.target.value })} className="w-full bg-[var(--surface)] border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 py-2 text-sm">
                {TASK_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-neutral-500 uppercase tracking-wider mb-1 block">Client scope (optional)</label>
            <select value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })} className="w-full bg-[var(--surface)] border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 py-2 text-sm">
              <option value="">— All clients —</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-neutral-500 uppercase tracking-wider mb-1 block">Payload (JSON)</label>
            <textarea
              value={form.payload}
              onChange={(e) => setForm({ ...form, payload: e.target.value })}
              rows={6}
              placeholder='{"prompt":"What the laptop should do when this fires…"}'
              className="w-full bg-[var(--surface)] border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 py-2 text-xs font-mono"
            />
            <p className="text-[10px] text-neutral-500 mt-1">For <code>custom_prompt</code> tasks, include a <code>prompt</code> field describing what to do.</p>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} />
            Enabled
          </label>
          {err && <div className="text-xs text-red-500 bg-red-500/10 px-3 py-2 rounded">{err}</div>}
        </div>
        <div className="flex justify-between gap-2 mt-4">
          {!isNew && (
            <button onClick={remove} disabled={busy} className="text-xs px-3 py-2 rounded-lg text-red-500 hover:bg-red-500/10 flex items-center gap-1 disabled:opacity-50">
              <Trash2 size={12} /> Delete
            </button>
          )}
          <div className="flex gap-2 ml-auto">
            <button onClick={onClose} className="text-sm px-4 py-2 rounded-lg border border-neutral-200 dark:border-neutral-800">Cancel</button>
            <button onClick={save} disabled={busy || !form.name || !form.cron} className="text-sm px-4 py-2 rounded-lg bg-[var(--orange)] text-white font-bold disabled:opacity-50">
              {busy ? "Saving…" : isNew ? "Create" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ScheduledTasksPanel({ clients = [] }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openTask, setOpenTask] = useState(null);
  const [showNew, setShowNew] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const r = await authedFetch("/admin/agency/scheduled-tasks");
      if (r.ok) setTasks((await r.json()).tasks || []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const runNow = async (task) => {
    if (!window.confirm(`Run "${task.name}" now? It'll be enqueued to the laptop queue.`)) return;
    try {
      const r = await authedFetch(`/admin/agency/scheduled-tasks/${encodeURIComponent(task.id)}/run`, { method: "POST" });
      const j = await r.json();
      if (j?.ok) alert(`Enqueued ✓\nTask ID: ${j.enqueued_task_id}`);
      else alert("Result: " + JSON.stringify(j));
      refresh();
    } catch (e) { alert("Run-now error: " + e.message); }
  };

  const toggle = async (task) => {
    try {
      await authedFetch(`/admin/agency/scheduled-tasks/${encodeURIComponent(task.id)}`, {
        method: "PATCH",
        body: JSON.stringify({ enabled: !task.enabled }),
      });
      refresh();
    } catch (e) { alert("Toggle error: " + e.message); }
  };

  return (
    <section className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 bg-[var(--surface-elev)]">
      <header className="flex items-center justify-between mb-3 pb-2 border-b border-neutral-100 dark:border-neutral-900 flex-wrap gap-2">
        <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
          <CalendarClock size={15} className="text-[var(--orange)]" />
          Scheduled Tasks
          <span className="text-xs text-neutral-500 font-normal">· {tasks.filter(t => t.enabled).length} active · {tasks.length} total</span>
        </h3>
        <div className="flex items-center gap-2">
          <button onClick={refresh} disabled={loading} className="text-xs px-2 py-1.5 rounded-md border border-neutral-200 dark:border-neutral-800 disabled:opacity-50">
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          </button>
          <button onClick={() => setShowNew(true)} className="text-xs px-3 py-1.5 rounded-md bg-[var(--orange)] text-white font-bold hover:opacity-90 flex items-center gap-1">
            <Plus size={12} /> New
          </button>
        </div>
      </header>

      <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 text-blue-600 p-3 text-xs mb-3">
        🗓 <strong>Single source of truth.</strong> All recurring jobs live here. Worker cron checks every 30 min, enqueues due tasks to the laptop queue. Delete your Cowork-side schedules — they're replaced by these.
      </div>

      {tasks.length === 0 ? (
        <div className="text-center py-6 text-sm text-neutral-500">
          {loading ? "Loading…" : "No scheduled tasks yet. Click + New to create one."}
        </div>
      ) : (
        <div className="space-y-1.5">
          {tasks.map((t) => {
            const clientName = clients.find((c) => c.id === t.client_id)?.name;
            return (
              <div key={t.id} className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-xs ${
                t.enabled
                  ? (t.last_run_status === "failed" ? "border-red-500/30 bg-red-500/5" : "border-neutral-100 dark:border-neutral-900 bg-[var(--surface)]")
                  : "border-neutral-200 dark:border-neutral-800 bg-[var(--surface)] opacity-50"
              }`}>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold flex items-center gap-2">
                    {t.enabled ? <Play size={11} className="text-emerald-500" /> : <Pause size={11} className="text-neutral-400" />}
                    <span>{t.name}</span>
                    {clientName && <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600">{clientName}</span>}
                    {t.task_type !== "custom_prompt" && <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-neutral-200/50 text-neutral-600 font-mono">{t.task_type}</span>}
                  </div>
                  <div className="text-[10px] text-neutral-500 mt-0.5">
                    <span className="font-mono">{t.cron}</span>
                    {" · "}
                    next: {fmtUntil(t.next_run_ts)}
                    {t.last_run_ts ? <> · last: {fmtTs(t.last_run_ts)} ({t.last_run_status || "?"})</> : <> · never run</>}
                    {t.run_count > 0 && <> · {t.run_count}× total</>}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => runNow(t)} title="Run now" className="text-[10px] px-2 py-1 rounded border border-neutral-200 dark:border-neutral-800 hover:bg-[var(--surface-alt)]">▶ Now</button>
                  <button onClick={() => toggle(t)} title={t.enabled ? "Disable" : "Enable"} className="text-[10px] px-2 py-1 rounded border border-neutral-200 dark:border-neutral-800 hover:bg-[var(--surface-alt)]">
                    {t.enabled ? "Pause" : "Enable"}
                  </button>
                  <button onClick={() => setOpenTask(t)} title="Edit" className="text-[10px] px-2 py-1 rounded text-neutral-500 hover:text-neutral-700">
                    <Edit3 size={11} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showNew && <EditTaskModal task={null} clients={clients} onClose={() => setShowNew(false)} onSaved={refresh} />}
      {openTask && <EditTaskModal task={openTask} clients={clients} onClose={() => setOpenTask(null)} onSaved={refresh} />}
    </section>
  );
}
