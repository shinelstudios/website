/**
 * SheetSyncPanel — Option B: append-only Google Sheets integration.
 *
 * Shows: connection status, target tab, last sync time, error count.
 * Actions: test connection, sync all unsynced projects.
 *
 * NEVER touches manual rows in the founder's Monthly Tracker — the worker
 * only writes rows tracked by `projects.sheet_row_index`. Manual rows have
 * NULL there forever, so they're permanently safe.
 */
import React, { useEffect, useState, useCallback } from "react";
import { FileSpreadsheet, RefreshCw, Check, AlertCircle, ExternalLink, Loader } from "lucide-react";
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

function fmtAgo(iso) {
  if (!iso) return "never";
  const ms = Date.now() - Date.parse(iso);
  if (Number.isNaN(ms)) return "—";
  const min = Math.round(ms / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.round(hr / 24)}d ago`;
}

export default function SheetSyncPanel() {
  const [status, setStatus] = useState(null);
  const [connection, setConnection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(null); // "connect" | "sync-all"
  const [bulkResult, setBulkResult] = useState(null);

  const loadStatus = useCallback(async () => {
    try {
      const r = await authedFetch("/admin/agency/sheets/status");
      if (!r.ok) { setError((await r.json())?.error || "Status check failed"); return; }
      setStatus(await r.json());
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadStatus(); }, [loadStatus]);

  const testConnect = async () => {
    setBusy("connect"); setError(null); setConnection(null);
    try {
      const r = await authedFetch("/admin/agency/sheets/connect");
      const j = await r.json();
      if (!r.ok) { setError(j.error || `${r.status}`); return; }
      setConnection(j);
    } catch (e) { setError(e.message); }
    finally { setBusy(null); }
  };

  const syncAll = async () => {
    if (!window.confirm("Sync all unsynced active projects to the Monthly Tracker? This APPENDS new rows only — your manual rows are untouched.")) return;
    setBusy("sync-all"); setBulkResult(null);
    try {
      const r = await authedFetch("/admin/agency/sheets/sync-all", {
        method: "POST",
        body: JSON.stringify({ only_unsynced: true }),
      });
      const j = await r.json();
      if (!r.ok) { setError(j.error || "Sync failed"); return; }
      setBulkResult(j);
      await loadStatus();
    } catch (e) { setError(e.message); }
    finally { setBusy(null); }
  };

  return (
    <section className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 bg-[var(--surface-elev)]">
      <header className="flex items-center justify-between mb-3 pb-2 border-b border-neutral-100 dark:border-neutral-900 flex-wrap gap-2">
        <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
          <FileSpreadsheet size={15} className="text-emerald-500" />
          Monthly Tracker Sync
          {status?.configured && (
            <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600">configured</span>
          )}
          {status && !status.configured && (
            <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-700">setup needed</span>
          )}
        </h3>
        <div className="flex items-center gap-2">
          <button onClick={loadStatus} disabled={loading} className="text-xs px-2 py-1.5 rounded-md border border-neutral-200 dark:border-neutral-800 disabled:opacity-50">
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={testConnect}
            disabled={busy != null || !status?.configured}
            className="text-xs px-3 py-1.5 rounded-md border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-50"
          >
            {busy === "connect" ? "Testing…" : "Test connection"}
          </button>
          <button
            onClick={syncAll}
            disabled={busy != null || !status?.configured || (status?.stats?.total === status?.stats?.synced)}
            className="text-xs px-3 py-1.5 rounded-md bg-emerald-500 text-white font-bold hover:opacity-90 disabled:opacity-50 flex items-center gap-1"
          >
            {busy === "sync-all" ? <Loader size={12} className="animate-spin" /> : <FileSpreadsheet size={12} />}
            Sync unsynced
          </button>
        </div>
      </header>

      {/* Setup-needed banner */}
      {status && !status.configured && (
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 text-yellow-800 dark:text-yellow-300 p-3 text-xs space-y-2">
          <div className="font-semibold">Google Sheets is not configured yet.</div>
          <ol className="list-decimal list-inside space-y-1 text-[11px]">
            <li>Create a Google Cloud service account → download its JSON key</li>
            <li>Share your Monthly Tracker sheet with that service account email (Editor access)</li>
            <li>Run on your dev machine:
              <pre className="mt-1 p-2 bg-neutral-900 text-neutral-100 rounded text-[10px] font-mono whitespace-pre-wrap">{`cd worker
npx wrangler secret put GOOGLE_SA_JSON        # paste full JSON
npx wrangler secret put MONTHLY_TRACKER_SHEET_ID   # paste 1v5ypV4-osnaVGcofI...
npx wrangler deploy`}</pre>
            </li>
            <li>Come back, click "Test connection" — you should see your tabs listed</li>
          </ol>
        </div>
      )}

      {/* Stats grid */}
      {status?.configured && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <StatBox label="Total projects" value={status.stats?.total ?? 0} />
          <StatBox label="Synced" value={status.stats?.synced ?? 0} accent="emerald" />
          <StatBox label="Errored" value={status.stats?.errored ?? 0} accent={status.stats?.errored > 0 ? "red" : "neutral"} />
          <StatBox label="Last sync" value={fmtAgo(status.stats?.last_sync_at)} small />
        </div>
      )}

      {status?.configured && (
        <div className="text-xs text-neutral-500 mb-3 flex items-center gap-2 flex-wrap">
          <span>Target tab:</span>
          <code className="px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-900">{status.target_tab}</code>
          <span>·</span>
          <a
            href={`https://docs.google.com/spreadsheets/d/${status.sheet_id}/edit`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--orange)] hover:underline inline-flex items-center gap-1"
          >
            Open sheet <ExternalLink size={10} />
          </a>
        </div>
      )}

      {/* Connection test result */}
      {connection && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs mb-3">
          <div className="font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1 mb-2">
            <Check size={12} /> Connection OK
          </div>
          <div className="space-y-1">
            <div>Service account: <code className="text-[10px]">{connection.service_account_email}</code></div>
            <div>
              Target tab <code>{connection.target_tab}</code>:{" "}
              {connection.target_tab_exists ? (
                <span className="text-emerald-600">exists ✓</span>
              ) : (
                <span className="text-red-600">missing — create it in the sheet or set SHEET_TAB_OVERRIDE</span>
              )}
            </div>
            <details>
              <summary className="cursor-pointer text-neutral-500">All tabs ({connection.tabs?.length || 0})</summary>
              <ul className="mt-1 ml-4 space-y-0.5">
                {connection.tabs?.map((t) => (
                  <li key={t.title}>· <code>{t.title}</code> <span className="text-neutral-500">({t.rows}×{t.columns})</span></li>
                ))}
              </ul>
            </details>
          </div>
        </div>
      )}

      {/* Bulk-sync result */}
      {bulkResult && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs mb-3">
          <div className="font-semibold text-emerald-700 dark:text-emerald-400 mb-1">Bulk sync done</div>
          <div className="text-neutral-600 dark:text-neutral-400">
            Attempted {bulkResult.attempted} · Appended {bulkResult.appended} · Updated {bulkResult.updated}
            {bulkResult.failed > 0 && <> · <span className="text-red-600">Failed {bulkResult.failed}</span></>}
          </div>
          {bulkResult.errors?.length > 0 && (
            <details className="mt-2">
              <summary className="cursor-pointer text-red-600">Errors ({bulkResult.errors.length})</summary>
              <ul className="mt-1 ml-4 text-[10px] space-y-0.5 font-mono">
                {bulkResult.errors.slice(0, 10).map((e, i) => (
                  <li key={i}>· #{e.id}: {e.error}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      {/* Recent errors */}
      {status?.recent_errors?.length > 0 && (
        <details className="text-xs">
          <summary className="cursor-pointer text-red-600 flex items-center gap-1">
            <AlertCircle size={12} /> {status.recent_errors.length} project(s) failed last sync
          </summary>
          <ul className="mt-2 space-y-1 text-[11px]">
            {status.recent_errors.map((e) => (
              <li key={e.id} className="p-2 rounded bg-red-50 dark:bg-red-950/30 border border-red-200/40 dark:border-red-900/40">
                <div className="font-semibold">{e.title}</div>
                <div className="text-red-700 dark:text-red-400 font-mono text-[10px] mt-0.5">{e.sheet_sync_error}</div>
              </li>
            ))}
          </ul>
        </details>
      )}

      {error && (
        <div className="text-xs text-red-600 bg-red-500/10 p-2 rounded mt-2">
          {error}
        </div>
      )}

      <p className="text-[10px] text-neutral-500 mt-3">
        Append-only sync — cockpit only writes rows it owns (tracked via <code>sheet_row_index</code>).
        Your manual rows in the sheet are never modified.
      </p>
    </section>
  );
}

function StatBox({ label, value, accent = "neutral", small = false }) {
  const accentClass = accent === "emerald"
    ? "text-emerald-600 dark:text-emerald-400"
    : accent === "red"
    ? "text-red-600 dark:text-red-400"
    : "text-neutral-900 dark:text-neutral-100";
  return (
    <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-3 bg-[var(--surface)]">
      <div className={`font-black tabular-nums ${accentClass} ${small ? "text-base" : "text-2xl"} leading-none`}>
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-wider text-neutral-500 font-semibold mt-1">
        {label}
      </div>
    </div>
  );
}
