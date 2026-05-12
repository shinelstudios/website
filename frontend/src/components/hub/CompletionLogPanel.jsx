/**
 * CompletionLogPanel — "what just happened" feed.
 *
 * Reads agent_log + recent laptop_tasks + recent seo_history apply events
 * and renders them as a unified timeline. Lets the founder see at a glance:
 *   - "BGMI PHARAOH MODE RESEO applied 5m ago"
 *   - "Kiaraa Gaming - IG followers updated to 12.0K"
 *   - "Competitor research done: 3 overperformers found"
 *   - "Auto-SEO proposal generated for video XYZ"
 *
 * Auto-refreshes every 30s. Filter chips: all / SEO / IG / cron / errors.
 */
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Activity, CheckCircle2, AlertCircle, RefreshCw, Filter, ExternalLink } from "lucide-react";
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

function fmtAgo(s) {
  if (!s) return "—";
  const ms = Date.now() - Date.parse(s + (s.endsWith("Z") ? "" : "Z"));
  if (Number.isNaN(ms)) return s;
  const sec = Math.round(ms / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.round(hr / 24)}d ago`;
}

// Friendly labels + emojis + categories for known action types.
// Anything not in this map gets a generic display.
const ACTION_META = {
  "seo.applied":             { emoji: "✏",  cat: "SEO",  label: "RESEO applied to YouTube",       color: "text-emerald-600" },
  "seo.apply_failed":        { emoji: "❌", cat: "SEO",  label: "RESEO apply failed",              color: "text-red-600" },
  "auto_seo.generated":      { emoji: "🤖", cat: "SEO",  label: "Auto-SEO proposal generated",     color: "text-purple-600" },
  "auto_seo.failed":         { emoji: "⚠",  cat: "SEO",  label: "Auto-SEO failed",                 color: "text-red-600" },
  "ig_sweep.triggered":      { emoji: "🔄", cat: "IG",   label: "IG sweep enqueued",               color: "text-pink-600" },
  "client.misconfigured":    { emoji: "⚠",  cat: "Data", label: "Client missing IG/YT",            color: "text-yellow-700" },
  "competitor.research.done":{ emoji: "📊", cat: "Cron", label: "Competitor research done",        color: "text-blue-600" },
  "underperformer.detector.done": { emoji: "🔻", cat: "SEO", label: "Underperformer scan done",   color: "text-orange-600" },
  "health.check":            { emoji: "🩺", cat: "Cron", label: "Health check",                    color: "text-neutral-600" },
  "cron.pulse.start":        { emoji: "⏰", cat: "Cron", label: "Cron tick started",               color: "text-neutral-500" },
  "cron.pulse.done":         { emoji: "✓",  cat: "Cron", label: "Pulse sync done",                 color: "text-emerald-600" },
  "cron.pulse.error":        { emoji: "💥", cat: "Cron", label: "Cron error",                      color: "text-red-600" },
  "cron.pulse.skip":         { emoji: "⏭",  cat: "Cron", label: "Cron skipped (cooldown)",        color: "text-neutral-500" },
  "editor.task.status":      { emoji: "👤", cat: "Editor", label: "Editor updated task",           color: "text-indigo-600" },
};

const CATEGORIES = ["all", "SEO", "IG", "Cron", "Editor", "Errors"];

function metaFor(action) {
  return ACTION_META[action] || {
    emoji: "·",
    cat: action.split(".")[0] || "Other",
    label: action.replace(/[._]/g, " "),
    color: "text-neutral-600",
  };
}

export default function CompletionLogPanel() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  const load = useCallback(async () => {
    try {
      const r = await authedFetch("/admin/agency/agent-log?limit=100");
      if (!r.ok) { setError((await r.json())?.error || "Load failed"); return; }
      const j = await r.json();
      setEntries(j.results || j.entries || []);
      setLastRefresh(new Date());
      setError(null);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, [load]);

  const filtered = useMemo(() => {
    if (filter === "all") return entries;
    if (filter === "Errors") return entries.filter((e) => e.level === "error" || e.level === "warn");
    return entries.filter((e) => metaFor(e.action).cat === filter);
  }, [entries, filter]);

  // Counts per category for the filter chips
  const counts = useMemo(() => {
    const c = { all: entries.length, SEO: 0, IG: 0, Cron: 0, Editor: 0, Errors: 0 };
    for (const e of entries) {
      const m = metaFor(e.action);
      if (m.cat in c) c[m.cat]++;
      if (e.level === "error" || e.level === "warn") c.Errors++;
    }
    return c;
  }, [entries]);

  return (
    <section className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 bg-[var(--surface-elev)]">
      <header className="flex items-center justify-between mb-3 pb-2 border-b border-neutral-100 dark:border-neutral-900 flex-wrap gap-2">
        <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
          <Activity size={15} className="text-[var(--orange)]" />
          Completion Log
          <span className="text-xs text-neutral-500 font-normal">· {entries.length} recent events</span>
          {lastRefresh && <span className="text-[10px] text-neutral-400 font-normal">· auto-refresh 30s · last {fmtAgo(lastRefresh.toISOString())}</span>}
        </h3>
        <button onClick={load} disabled={loading} className="text-xs px-2 py-1.5 rounded-md border border-neutral-200 dark:border-neutral-800 disabled:opacity-50">
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
        </button>
      </header>

      {/* Filter chips */}
      <div className="flex gap-1 mb-3 text-xs flex-wrap">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className={`px-2.5 py-1 rounded-full transition-colors ${
              filter === c
                ? c === "Errors"
                  ? "bg-red-500 text-white border-red-500"
                  : "bg-[var(--orange)] text-white border-[var(--orange)]"
                : "bg-neutral-100 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800"
            }`}
          >
            {c} {counts[c] > 0 && <span className="opacity-60">({counts[c]})</span>}
          </button>
        ))}
      </div>

      {error && <div className="text-xs text-red-600 bg-red-500/10 p-2 rounded mb-3">{error}</div>}

      {loading && entries.length === 0 ? (
        <div className="text-sm text-neutral-500 text-center py-6">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-8 text-neutral-500 text-sm border border-dashed border-neutral-200 dark:border-neutral-800 rounded-xl">
          No events match this filter. The automation pipelines haven't fired recently — or check a different category.
        </div>
      ) : (
        <div className="space-y-1.5 max-h-[500px] overflow-y-auto">
          {filtered.map((e) => {
            const m = metaFor(e.action);
            const isError = e.level === "error";
            const isWarn = e.level === "warn";
            return (
              <div
                key={e.id}
                className={`flex items-start gap-3 text-xs p-2 rounded-md ${
                  isError
                    ? "bg-red-500/5 border border-red-500/20"
                    : isWarn
                    ? "bg-yellow-500/5 border border-yellow-500/20"
                    : "bg-[var(--surface)] hover:bg-neutral-100 dark:hover:bg-neutral-900"
                }`}
              >
                <div className="text-base flex-shrink-0 leading-tight pt-0.5">{m.emoji}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className={`font-bold ${m.color}`}>{m.label}</span>
                    <span className="text-[9px] uppercase tracking-wider text-neutral-500 px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-900">{m.cat}</span>
                    {isError && <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-red-500 text-white">ERROR</span>}
                    {isWarn && <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-yellow-500 text-white">WARN</span>}
                    {e.client_id && (
                      <span className="text-[10px] text-neutral-500">· {e.client_id}</span>
                    )}
                    <span className="text-[10px] text-neutral-400 ml-auto">{fmtAgo(e.created_at)}</span>
                  </div>
                  {e.message && (
                    <div className="text-neutral-600 dark:text-neutral-400 mt-0.5 break-words">{e.message}</div>
                  )}
                  {e.payload_json && (
                    <details className="mt-1">
                      <summary className="text-[10px] text-neutral-400 cursor-pointer hover:text-neutral-600">payload</summary>
                      <pre className="mt-1 p-1.5 text-[10px] font-mono bg-neutral-100 dark:bg-neutral-900 rounded overflow-x-auto whitespace-pre-wrap">
                        {(() => {
                          try { return JSON.stringify(JSON.parse(e.payload_json), null, 2); }
                          catch { return e.payload_json; }
                        })()}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-[10px] text-neutral-500 mt-3 text-center">
        Every automated action gets logged here. Pulse syncs, RESEO applies, auto-SEO generations, competitor research, IG sweeps, editor task updates — all visible.
      </p>
    </section>
  );
}
