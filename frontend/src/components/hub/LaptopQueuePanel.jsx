/**
 * LaptopQueuePanel — embedded inside OpsCockpit.
 *
 * Shows the always-on laptop's task queue: pending / claimed / done / failed.
 * Lets you enqueue ad-hoc tasks (IG fetch, RESEO sweep, etc.) and shows
 * the laptop's last heartbeat so you know whether it's online.
 */
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Cpu, RefreshCw, Plus, Check, AlertCircle, Clock, Loader, X } from "lucide-react";
import { AUTH_BASE } from "../../config/constants";
import { getAccessToken } from "../../utils/tokenStore";

const TASK_TYPES = [
  { key: "ig_followers_fetch",      label: "IG followers fetch",       hint: "Open IG profile, scrape follower count" },
  { key: "ig_recent_posts_fetch",   label: "IG recent posts fetch",    hint: "Pull last 12 IG posts" },
  { key: "yt_stream_seo_check",     label: "YT scheduled stream SEO",  hint: "Run SEO audit on scheduled streams" },
  { key: "yt_video_reseo",          label: "YT video RESEO",           hint: "Update title/description for low performers" },
  { key: "milestone_check",         label: "Client milestone check",   hint: "Find clients hitting 10K/50K/100K" },
  { key: "milestone_story_create",  label: "Milestone story (Higgsfield+IG)", hint: "Generate + post celebration story" },
  { key: "homepage_stats_refresh",  label: "Refresh homepage stats",   hint: "Recompute public reach numbers" },
];

const STATUS_STYLE = {
  pending:   "bg-neutral-500/10 text-neutral-600",
  claimed:   "bg-yellow-500/10 text-yellow-600 animate-pulse",
  done:      "bg-emerald-500/10 text-emerald-600",
  failed:    "bg-red-500/10 text-red-500",
  cancelled: "bg-neutral-200/50 text-neutral-500",
};

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

function fmtTs(s) {
  if (!s) return "—";
  const ms = typeof s === "number" ? s * 1000 : Date.parse(s);
  try { return new Date(ms).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" }); }
  catch { return "—"; }
}
function fmtAgo(secAgo) {
  if (secAgo == null) return "never";
  if (secAgo < 60) return `${secAgo}s ago`;
  if (secAgo < 3600) return `${Math.floor(secAgo / 60)}m ago`;
  if (secAgo < 86400) return `${Math.floor(secAgo / 3600)}h ago`;
  return `${Math.floor(secAgo / 86400)}d ago`;
}

function EnqueueModal({ clients, onClose, onEnqueued }) {
  const [type, setType] = useState(TASK_TYPES[0].key);
  const [clientId, setClientId] = useState("");
  const [priority, setPriority] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const submit = async () => {
    setBusy(true); setErr(null);
    try {
      const res = await authedFetch("/admin/agency/laptop/enqueue", {
        method: "POST",
        body: JSON.stringify({ type, client_id: clientId || null, priority: parseInt(priority || 0, 10) }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || `API ${res.status}`);
      onEnqueued?.();
      onClose();
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  };

  const def = TASK_TYPES.find((t) => t.key === type);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="bg-[var(--surface-elev)] rounded-xl border border-neutral-200 dark:border-neutral-800 max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-lg font-bold">Enqueue laptop task</h3>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-700"><X size={18} /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-neutral-500 uppercase tracking-wider mb-1 block">Task type</label>
            <select value={type} onChange={(e) => setType(e.target.value)} className="w-full bg-[var(--surface)] border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 py-2 text-sm">
              {TASK_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
            </select>
            {def?.hint && <p className="text-[10px] text-neutral-500 mt-1">{def.hint}</p>}
          </div>
          <div>
            <label className="text-xs text-neutral-500 uppercase tracking-wider mb-1 block">Client (optional — leave blank for all)</label>
            <select value={clientId} onChange={(e) => setClientId(e.target.value)} className="w-full bg-[var(--surface)] border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 py-2 text-sm">
              <option value="">— All clients —</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-neutral-500 uppercase tracking-wider mb-1 block">Priority (higher runs first)</label>
            <input type="number" value={priority} onChange={(e) => setPriority(e.target.value)} className="w-full bg-[var(--surface)] border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 py-2 text-sm" />
          </div>
          {err && <div className="text-xs text-red-500 bg-red-500/10 px-3 py-2 rounded">{err}</div>}
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="text-sm px-4 py-2 rounded-lg border border-neutral-200 dark:border-neutral-800">Cancel</button>
          <button onClick={submit} disabled={busy} className="text-sm px-4 py-2 rounded-lg bg-[var(--orange)] text-white font-bold disabled:opacity-50">
            {busy ? "Enqueuing…" : "Enqueue"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LaptopQueuePanel({ clients = [] }) {
  const [tasks, setTasks] = useState([]);
  const [heartbeats, setHeartbeats] = useState([]);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [loading, setLoading] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [tRes, hRes] = await Promise.all([
        authedFetch(`/admin/agency/laptop/queue?status=${encodeURIComponent(statusFilter)}&limit=50`),
        authedFetch(`/admin/agency/laptop/heartbeat`),
      ]);
      if (tRes.ok) setTasks((await tRes.json()).tasks || []);
      if (hRes.ok) setHeartbeats((await hRes.json()).laptops || []);
    } finally { setLoading(false); }
  }, [statusFilter]);

  useEffect(() => { refresh(); }, [refresh]);

  // Auto-refresh every 15s when on pending/claimed (so you can watch tasks complete)
  useEffect(() => {
    if (!["pending", "claimed", "all"].includes(statusFilter)) return;
    const id = setInterval(refresh, 15000);
    return () => clearInterval(id);
  }, [refresh, statusFilter]);

  const counts = useMemo(() => {
    const c = { pending: 0, claimed: 0, done: 0, failed: 0 };
    for (const t of tasks) c[t.status] = (c[t.status] || 0) + 1;
    return c;
  }, [tasks]);

  const onlineLaptop = heartbeats.find((h) => h.online);

  return (
    <section className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 bg-[var(--surface-elev)]">
      <header className="flex items-center justify-between mb-3 pb-2 border-b border-neutral-100 dark:border-neutral-900 flex-wrap gap-2">
        <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
          <Cpu size={15} className="text-[var(--orange)]" />
          Laptop Queue
          <span className="text-xs text-neutral-500 font-normal">
            · {tasks.length} {statusFilter}
          </span>
          {onlineLaptop ? (
            <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 inline-flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {onlineLaptop.laptop_id} online · {fmtAgo(onlineLaptop.seconds_ago)}
            </span>
          ) : (
            <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-red-500/10 text-red-500">
              No laptop online
            </span>
          )}
        </h3>
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-[var(--surface)] border border-neutral-200 dark:border-neutral-800 rounded px-2 py-1.5"
          >
            <option value="pending">Pending</option>
            <option value="claimed">Claimed</option>
            <option value="done">Done</option>
            <option value="failed">Failed</option>
            <option value="all">All</option>
          </select>
          <button onClick={refresh} disabled={loading} className="text-xs px-2 py-1.5 rounded-md border border-neutral-200 dark:border-neutral-800 disabled:opacity-50">
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={() => setShowNew(true)}
            className="text-xs px-3 py-1.5 rounded-md bg-[var(--orange)] text-white font-bold hover:opacity-90 flex items-center gap-1"
          >
            <Plus size={12} /> Enqueue
          </button>
        </div>
      </header>

      {!onlineLaptop && (
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 text-yellow-700 p-3 text-xs mb-3">
          <strong>No laptop online.</strong> Tasks will queue up and run when the always-on laptop polls next.
          To set up: install the <code>laptop-poll-queue</code> Cowork skill on the always-on machine.
        </div>
      )}

      {tasks.length === 0 ? (
        <div className="text-center py-6 text-sm text-neutral-500">
          {loading ? "Loading…" : `No ${statusFilter} tasks.`}
        </div>
      ) : (
        <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
          {tasks.map((t) => {
            const def = STATUS_STYLE[t.status] || STATUS_STYLE.pending;
            const clientName = clients.find((c) => c.id === t.client_id)?.name;
            return (
              <div key={t.id} className="flex items-center justify-between gap-3 text-xs bg-[var(--surface)] rounded-md px-3 py-2 border border-neutral-100 dark:border-neutral-900">
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-[11px] font-semibold">{t.type}</div>
                  <div className="text-[10px] text-neutral-500">
                    {clientName ? `${clientName} · ` : ""}
                    enqueued {fmtTs(t.created_at)}
                    {t.attempts > 0 ? ` · ${t.attempts} attempt${t.attempts > 1 ? "s" : ""}` : ""}
                    {t.error ? ` · ${t.error.slice(0, 80)}` : ""}
                  </div>
                </div>
                <span className={`text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full whitespace-nowrap ${def}`}>
                  {t.status}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {showNew && <EnqueueModal clients={clients} onClose={() => setShowNew(false)} onEnqueued={refresh} />}
    </section>
  );
}
