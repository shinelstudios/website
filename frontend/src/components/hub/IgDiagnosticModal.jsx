/**
 * IgDiagnosticModal — opens from the Clients panel.
 *
 * Shows every active IG handle in the system, color-coded by status:
 *   ✅ OK (has real followers)
 *   ⏳ Pending fetch (queued but laptop hasn't polled)
 *   ⚠ Failed (login wall / rate limit / private)
 *   ❓ Never queued
 *   📭 Legacy only (in clients.instagram_handle but not instagram_accounts)
 *   💤 Fetched zero (scrape returned 0)
 *
 * Per row: "Resweep" button + "Enter manually" inline input — type the
 * follower count and click save. Bypasses the scraper entirely.
 */
import React, { useEffect, useState, useCallback } from "react";
import { X, RefreshCw, Zap, Check, AlertCircle, Edit2, Loader } from "lucide-react";
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

const REASON_META = {
  ok:             { emoji: "✅", color: "text-emerald-600", label: "OK", bg: "bg-emerald-500/5" },
  pending_fetch:  { emoji: "⏳", color: "text-blue-600",    label: "Pending (laptop will fetch)", bg: "bg-blue-500/5" },
  fetch_failed:   { emoji: "⚠",  color: "text-red-600",     label: "Scrape failed", bg: "bg-red-500/5" },
  never_queued:   { emoji: "❓", color: "text-yellow-700",  label: "Never queued",  bg: "bg-yellow-500/5" },
  legacy_only:    { emoji: "📭", color: "text-orange-700",  label: "Legacy field only", bg: "bg-orange-500/5" },
  missing_row:    { emoji: "📭", color: "text-orange-700",  label: "Not in instagram_accounts", bg: "bg-orange-500/5" },
  fetched_zero:   { emoji: "💤", color: "text-neutral-600", label: "Scrape returned 0", bg: "bg-neutral-500/5" },
};

function fmtNum(n) {
  if (n == null || isNaN(n)) return "—";
  return n.toLocaleString("en-IN");
}

// =====================================================================
// ManualEntryInput — inline input for typing a follower count
// =====================================================================
function ManualEntryInput({ clientId, handle, currentFollowers, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(currentFollowers || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const save = async () => {
    setBusy(true); setError(null);
    try {
      const n = parseInt(String(value).replace(/[^0-9]/g, ""), 10);
      if (!Number.isFinite(n) || n < 0) { setError("Enter a number"); return; }
      const r = await authedFetch("/admin/agency/ig/manual-entry", {
        method: "POST",
        body: JSON.stringify({ client_id: clientId, handle, followers: n }),
      });
      const j = await r.json();
      if (!r.ok) { setError(j.error || "Save failed"); return; }
      onSaved?.(n);
      setEditing(false);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  if (!editing) {
    return (
      <button
        onClick={() => { setEditing(true); setValue(currentFollowers || ""); }}
        className="text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded border border-purple-500/40 text-purple-600 hover:bg-purple-500 hover:text-white inline-flex items-center gap-1"
        title="Type the follower count manually (bypasses scraper)"
      >
        <Edit2 size={9} /> Enter manually
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <input
        autoFocus
        type="text"
        inputMode="numeric"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false); }}
        placeholder="e.g. 12500"
        className="w-24 px-2 py-1 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-xs"
      />
      <button onClick={save} disabled={busy} className="px-2 py-1 rounded bg-emerald-500 text-white text-[10px] font-bold disabled:opacity-50">
        {busy ? "…" : "Save"}
      </button>
      <button onClick={() => setEditing(false)} className="px-1.5 py-1 rounded border border-neutral-300 dark:border-neutral-700 text-[10px]">✕</button>
      {error && <span className="text-[10px] text-red-600 ml-1">{error}</span>}
    </div>
  );
}

// =====================================================================
// IgDiagnosticModal — main component
// =====================================================================
export default function IgDiagnosticModal({ onClose, onRefreshNeeded }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [resweepBusy, setResweepBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const r = await authedFetch("/admin/agency/ig/diagnostic");
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        setError(j.error || `API ${r.status}`);
        return;
      }
      setData(await r.json());
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const resweep = async () => {
    if (!window.confirm("Re-queue every IG handle currently at 0 followers? Laptop will fetch them next poll.")) return;
    setResweepBusy(true);
    try {
      const r = await authedFetch("/admin/agency/ig/diagnostic/resweep", {
        method: "POST",
        body: JSON.stringify({}),
      });
      const j = await r.json();
      if (!r.ok) { alert(j.error || "Resweep failed"); return; }
      alert(`Re-queued ${j.enqueued_count} handle${j.enqueued_count === 1 ? "" : "s"} for the laptop to fetch.`);
      await load();
    } catch (e) { alert(e.message); }
    finally { setResweepBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[var(--surface-elev)] rounded-xl border border-neutral-200 dark:border-neutral-800 max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-[var(--surface-elev)] border-b border-neutral-200 dark:border-neutral-800 px-5 py-3 flex justify-between items-center z-10">
          <div>
            <h3 className="text-lg font-bold">Instagram diagnostic</h3>
            <p className="text-[10px] text-neutral-500">Why is each handle at 0? What can we fix right now?</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={load} disabled={loading} className="text-xs px-2 py-1.5 rounded-md border border-neutral-300 dark:border-neutral-700 disabled:opacity-50">
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
            </button>
            <button
              onClick={resweep}
              disabled={resweepBusy}
              className="text-xs px-3 py-1.5 rounded-md bg-orange-500 text-white font-bold hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-1"
            >
              {resweepBusy ? <Loader size={12} className="animate-spin" /> : <Zap size={12} />}
              Resweep all zeros
            </button>
            <button onClick={onClose} className="text-neutral-400 hover:text-neutral-700"><X size={18} /></button>
          </div>
        </div>

        {/* Summary */}
        {data?.summary && (
          <div className="px-5 py-3 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950/50 grid grid-cols-3 md:grid-cols-7 gap-2 text-xs">
            <SummaryStat label="Total handles" value={data.summary.total_ig_handles} />
            <SummaryStat label="✅ OK" value={data.summary.handles_ok} color="text-emerald-600" />
            <SummaryStat label="⏳ Pending" value={data.summary.handles_pending_fetch} color="text-blue-600" />
            <SummaryStat label="⚠ Failed" value={data.summary.handles_fetch_failed} color="text-red-600" />
            <SummaryStat label="❓ Never queued" value={data.summary.handles_never_queued} color="text-yellow-700" />
            <SummaryStat label="📭 Legacy only" value={data.summary.handles_legacy_only} color="text-orange-700" />
            <SummaryStat label="💤 Returned 0" value={data.summary.handles_fetched_zero} color="text-neutral-600" />
          </div>
        )}

        <div className="p-5">
          {loading && !data && (
            <div className="text-center py-8 text-neutral-500"><Loader className="animate-spin inline mr-2" size={14} /> Loading diagnostic…</div>
          )}
          {error && (
            <div className="text-sm text-red-600 bg-red-500/10 p-3 rounded mb-3 flex items-center gap-2">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          {data?.report && (
            <div className="space-y-3">
              {data.report.map((c) => {
                const hasIssue = c.igs.some((ig) => ig.reason !== "ok");
                return (
                  <details key={c.client_id} open={hasIssue} className="rounded-lg border border-neutral-200 dark:border-neutral-800 overflow-hidden">
                    <summary className="cursor-pointer px-3 py-2 bg-[var(--surface)] hover:bg-neutral-100 dark:hover:bg-neutral-900 flex items-center gap-2">
                      <div className="font-bold text-sm">{c.name}</div>
                      <div className="text-[10px] text-neutral-500">{c.ig_count} handle{c.ig_count === 1 ? "" : "s"} · total {fmtNum(c.ig_total_followers)} followers</div>
                      {hasIssue && <span className="ml-auto text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded bg-yellow-500/10 text-yellow-700">needs attention</span>}
                      {!hasIssue && c.ig_count > 0 && <span className="ml-auto text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600">all good</span>}
                    </summary>
                    {c.ig_count === 0 ? (
                      <div className="px-3 py-3 text-xs text-neutral-500">No IG accounts configured for this client.</div>
                    ) : (
                      <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
                        {c.igs.map((ig) => {
                          const meta = REASON_META[ig.reason] || REASON_META.never_queued;
                          return (
                            <div key={ig.handle} className={`px-3 py-2.5 ${meta.bg}`}>
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  <span className="text-base">{meta.emoji}</span>
                                  <code className="font-mono font-bold text-sm">@{ig.handle}</code>
                                  <span className={`text-[10px] uppercase tracking-wider font-bold ${meta.color}`}>
                                    {meta.label}
                                  </span>
                                  <span className="text-xs ml-auto font-bold tabular-nums">{fmtNum(ig.followers)} followers</span>
                                </div>
                              </div>
                              {ig.advice && (
                                <div className="text-[11px] text-neutral-600 dark:text-neutral-400 mt-1.5">{ig.advice}</div>
                              )}
                              {ig.latest_task && (
                                <div className="text-[10px] text-neutral-500 mt-1">
                                  Latest task: {ig.latest_task.status} · {ig.latest_task.created_at}
                                  {ig.latest_task.error && <span className="text-red-600"> · {ig.latest_task.error.slice(0, 100)}</span>}
                                </div>
                              )}
                              <div className="mt-2">
                                <ManualEntryInput
                                  clientId={c.client_id}
                                  handle={ig.handle}
                                  currentFollowers={ig.followers}
                                  onSaved={(n) => { load(); onRefreshNeeded?.(); }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </details>
                );
              })}
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-neutral-200 dark:border-neutral-800 text-[10px] text-neutral-500 text-center">
          Tip: if scraping keeps failing on a specific handle (login wall / private account), just type the count manually — bypasses the scraper completely.
        </div>
      </div>
    </div>
  );
}

function SummaryStat({ label, value, color }) {
  return (
    <div>
      <div className={`text-lg font-black tabular-nums ${color || ""}`}>{value ?? 0}</div>
      <div className="text-[9px] uppercase tracking-wider text-neutral-500">{label}</div>
    </div>
  );
}
