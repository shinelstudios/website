/**
 * IgAttemptsModal — per-client "why is this IG count what it is?" inspector.
 *
 * Two visible affordances are exported for use in the Clients panel:
 *
 *   <IgWhyZeroChip clientId name onOpen />
 *     Subtle text chip ("WHY 0?") shown next to a 0 IG follower count when
 *     the client has at least one IG handle. Clicking opens the attempts
 *     modal so the user can see WHY the scraper is returning 0 (login wall /
 *     rate limit / wrong handle / etc.).
 *
 *   <IgStaleSyncDot lastStatus lastAt onOpen />
 *     Forward-compatible: yellow warning dot for clients with followers > 0
 *     but whose most-recent scrape attempt failed. Renders nothing unless
 *     the snapshot exposes a `ig_last_attempt_status === "failed"` signal
 *     for this client (it currently does NOT — see notes in OpsCockpit).
 *
 *   <IgAttemptsModal clientId clientName onClose onRefreshNeeded />
 *     The modal itself. Lazy-loads up to 10 recent ig_followers_fetch
 *     attempts from /admin/agency/ig/recent-attempts on mount.
 *
 * API contract:
 *   GET /admin/agency/ig/recent-attempts?clientId={id}&limit=10
 *   -> { ok, client_id, client_name, instagram_handle, current_followers,
 *        attempts: [{ id, status, result, error, claimed_at, completed_at,
 *                     summary }] }
 *
 * Auth: same team JWT cookie + bearer token pattern as IgDiagnosticModal.
 */
import React, { useEffect, useState, useCallback } from "react";
import { X, RefreshCw, Zap, AlertCircle, Loader, ChevronDown, ChevronRight } from "lucide-react";
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

// API returns claimed_at/completed_at as unix seconds; fall back to ISO strings.
function fmtRelativeFromUnix(ts) {
  if (ts == null) return "—";
  const ms = typeof ts === "number" ? ts * 1000 : new Date(ts).getTime();
  if (!Number.isFinite(ms)) return "—";
  const delta = Date.now() - ms;
  if (delta < 0) return "just now";
  const m = Math.floor(delta / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// Status pill colour rules from the spec:
//   green for done + followers>0
//   gray  for done + 0
//   red   for failed
//   blue  for pending / claimed
function statusPill(status, followers) {
  const s = String(status || "").toLowerCase();
  if (s === "failed") return { label: "FAILED", cls: "bg-red-500/10 text-red-600 border border-red-500/30" };
  if (s === "pending") return { label: "PENDING", cls: "bg-blue-500/10 text-blue-600 border border-blue-500/30" };
  if (s === "claimed") return { label: "RUNNING", cls: "bg-blue-500/10 text-blue-600 border border-blue-500/30" };
  if (s === "done") {
    if (Number(followers || 0) > 0) {
      return { label: "DONE", cls: "bg-emerald-500/10 text-emerald-600 border border-emerald-500/30" };
    }
    return { label: "DONE · 0", cls: "bg-neutral-500/10 text-neutral-500 border border-neutral-500/30" };
  }
  return { label: (s || "—").toUpperCase(), cls: "bg-neutral-500/10 text-neutral-500 border border-neutral-500/30" };
}

// =====================================================================
// IgWhyZeroChip — subtle inline trigger next to a 0 IG count
// =====================================================================
export function IgWhyZeroChip({ onOpen }) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onOpen?.(); }}
      className="text-[10px] uppercase tracking-wider text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 hover:underline ml-1"
      title="Show recent fetch attempts and why this is still 0"
    >
      Why 0?
    </button>
  );
}

// =====================================================================
// IgStaleSyncDot — yellow dot for stale/failed-last-sync (followers > 0)
// =====================================================================
export function IgStaleSyncDot({ lastStatus, lastAtUnix, onOpen }) {
  if (String(lastStatus || "").toLowerCase() !== "failed") return null;
  const rel = fmtRelativeFromUnix(lastAtUnix);
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onOpen?.(); }}
      className="inline-flex items-center justify-center w-2.5 h-2.5 rounded-full bg-yellow-400 hover:bg-yellow-500 ml-1 align-middle"
      title={`Last sync failed ${rel} — value may be stale (click for details)`}
      aria-label="Last IG sync failed"
    />
  );
}

// =====================================================================
// AttemptRow — single attempt with expandable raw JSON
// =====================================================================
function AttemptRow({ attempt }) {
  const [showRaw, setShowRaw] = useState(false);
  const followers = attempt?.result?.followers;
  const pill = statusPill(attempt.status, followers);
  // Prefer completed_at; fall back to claimed_at for in-flight tasks.
  const tsUnix = attempt.completed_at || attempt.claimed_at || attempt.created_at;
  const rel = fmtRelativeFromUnix(tsUnix);

  return (
    <div className="border border-neutral-200 dark:border-neutral-800 rounded-md p-2.5 bg-[var(--surface)]">
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded ${pill.cls}`}>
          {pill.label}
        </span>
        <span className="text-xs text-neutral-700 dark:text-neutral-200 flex-1 min-w-0 break-words">
          {attempt.summary || "—"}
        </span>
        <span className="text-[10px] text-neutral-500 whitespace-nowrap">{rel}</span>
      </div>
      <button
        type="button"
        onClick={() => setShowRaw((v) => !v)}
        className="text-[10px] uppercase tracking-wider text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 mt-1.5 inline-flex items-center gap-1"
      >
        {showRaw ? <ChevronDown size={10} /> : <ChevronRight size={10} />} View raw
      </button>
      {showRaw && (
        <pre className="mt-1.5 text-[10px] leading-tight bg-neutral-100 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded p-2 overflow-x-auto whitespace-pre-wrap break-all max-h-60">
{JSON.stringify({ id: attempt.id, status: attempt.status, result: attempt.result, error: attempt.error, claimed_at: attempt.claimed_at, completed_at: attempt.completed_at }, null, 2)}
        </pre>
      )}
    </div>
  );
}

// =====================================================================
// IgAttemptsModal — main lazy-loaded inspector
// =====================================================================
export default function IgAttemptsModal({ clientId, clientName, onClose, onRefreshNeeded }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [syncBusy, setSyncBusy] = useState(false);

  const load = useCallback(async () => {
    if (!clientId) return;
    setLoading(true); setError(null);
    try {
      const r = await authedFetch(`/admin/agency/ig/recent-attempts?clientId=${encodeURIComponent(clientId)}&limit=10`);
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        setError(j.error || `API ${r.status}`);
        return;
      }
      setData(await r.json());
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  // "Run sync now" — re-uses the existing diagnostic resweep endpoint. The
  // backend only enqueues handles currently at 0, so for clients above 0 we
  // fall back to the generic laptop/enqueue endpoint with the client's
  // primary instagram_handle.
  const runSyncNow = async () => {
    if (!data?.instagram_handle) {
      alert("No instagram_handle on this client. Add one via the '+ IG' button first.");
      return;
    }
    setSyncBusy(true);
    try {
      const r = await authedFetch("/admin/agency/laptop/enqueue", {
        method: "POST",
        body: JSON.stringify({
          type: "ig_followers_fetch",
          client_id: clientId,
          priority: 5,
          payload: { handle: data.instagram_handle, source: "cockpit-attempts-modal" },
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { alert(j.error || `Enqueue failed (${r.status})`); return; }
      // Re-load attempts to surface the newly-pending row.
      await load();
      onRefreshNeeded?.();
    } catch (e) { alert(e.message); }
    finally { setSyncBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[var(--surface-elev)] rounded-xl border border-neutral-200 dark:border-neutral-800 max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-[var(--surface-elev)] border-b border-neutral-200 dark:border-neutral-800 px-5 py-3 flex justify-between items-start z-10 gap-2">
          <div className="min-w-0">
            <h3 className="text-base font-bold truncate">
              IG sync attempts — {data?.client_name || clientName || "…"}
            </h3>
            <p className="text-[10px] text-neutral-500 mt-0.5">
              {data?.instagram_handle ? <>@{data.instagram_handle}</> : "no handle on file"}
              {data && typeof data.current_followers === "number" && (
                <> · current: <strong>{data.current_followers.toLocaleString("en-IN")}</strong> followers</>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={load}
              disabled={loading}
              className="text-xs px-2 py-1.5 rounded-md border border-neutral-300 dark:border-neutral-700 disabled:opacity-50"
              title="Re-fetch attempts list"
            >
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
            </button>
            <button
              onClick={runSyncNow}
              disabled={syncBusy || !data?.instagram_handle}
              className="text-xs px-3 py-1.5 rounded-md bg-pink-500 text-white font-bold hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-1"
              title="Queue a fresh ig_followers_fetch task for this handle"
            >
              {syncBusy ? <Loader size={12} className="animate-spin" /> : <Zap size={12} />}
              Run sync now
            </button>
            <button onClick={onClose} className="text-neutral-400 hover:text-neutral-700"><X size={18} /></button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5">
          {loading && !data && (
            <div className="text-center py-8 text-neutral-500 text-sm">
              <Loader className="animate-spin inline mr-2" size={14} /> Loading attempts…
            </div>
          )}
          {error && (
            <div className="text-sm text-red-600 bg-red-500/10 p-3 rounded mb-3 flex items-center gap-2">
              <AlertCircle size={14} /> {error}
            </div>
          )}
          {data && !loading && data.attempts?.length === 0 && (
            <div className="text-sm text-neutral-500 py-6 text-center">
              No ig_followers_fetch tasks have been recorded for this client yet.
              {data.instagram_handle && (
                <div className="text-xs mt-2">Click "Run sync now" above to queue the first one.</div>
              )}
            </div>
          )}
          {data && data.attempts?.length > 0 && (
            <div className="space-y-2">
              {data.attempts.map((a) => (
                <AttemptRow key={a.id} attempt={a} />
              ))}
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-neutral-200 dark:border-neutral-800 text-[10px] text-neutral-500 text-center">
          Showing up to 10 most-recent attempts. Older attempts roll off as new ones queue.
        </div>
      </div>
    </div>
  );
}
