/**
 * YtQuotaPanel — shows daily YouTube API quota usage per key.
 *
 * Each key has a hard 10,000 unit/day cap; we soft-throttle at 8,500.
 * Visual: a bar per key colored by state (healthy / warning / exhausted).
 * Refreshes every 60s.
 */
import React, { useEffect, useState, useCallback } from "react";
import { Zap, RefreshCw, AlertTriangle, CheckCircle2 } from "lucide-react";
import { AUTH_BASE } from "../../config/constants";
import { getAccessToken } from "../../utils/tokenStore";

const STATE_META = {
  healthy:         { color: "bg-emerald-500", text: "text-emerald-600", label: "Healthy", emoji: "✅" },
  warning:         { color: "bg-yellow-500",  text: "text-yellow-700",  label: "Approaching limit", emoji: "⚠" },
  exhausted_soft:  { color: "bg-orange-500",  text: "text-orange-700",  label: "Soft-throttled", emoji: "🟧" },
  exhausted_hard:  { color: "bg-red-500",     text: "text-red-700",     label: "EXHAUSTED", emoji: "🚨" },
};

function fmt(n) {
  return (n || 0).toLocaleString("en-IN");
}

export default function YtQuotaPanel() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const token = getAccessToken();
      const r = await fetch(`${AUTH_BASE}/admin/agency/yt-quota`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
      });
      if (!r.ok) { setError((await r.json())?.error || `API ${r.status}`); return; }
      setData(await r.json());
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, [load]);

  const overallPercent = data
    ? Math.round((data.total_units_used / data.total_units_available) * 100)
    : 0;

  return (
    <section className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 bg-[var(--surface-elev)]">
      <header className="flex items-center justify-between mb-3 pb-2 border-b border-neutral-100 dark:border-neutral-900 flex-wrap gap-2">
        <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
          <Zap size={15} className="text-[var(--orange)]" />
          YouTube API Quota
          {data && (
            <span className="text-xs text-neutral-500 font-normal">
              · {fmt(data.total_units_used)} / {fmt(data.total_units_available)} units used today ({overallPercent}%)
            </span>
          )}
        </h3>
        <button onClick={load} disabled={loading} className="text-xs px-2 py-1.5 rounded-md border border-neutral-200 dark:border-neutral-800 disabled:opacity-50">
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
        </button>
      </header>

      {error && <div className="text-xs text-red-600 bg-red-500/10 p-2 rounded mb-3">{error}</div>}

      {data && (
        <>
          {/* Overall health pill */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className="text-[10px] uppercase tracking-wider font-bold text-neutral-500">
              {data.healthy_keys} / {data.total_keys} keys healthy
            </span>
            {data.healthy_keys === 0 && (
              <span className="px-2 py-0.5 rounded bg-red-500 text-white text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1">
                <AlertTriangle size={10} /> ALL KEYS THROTTLED
              </span>
            )}
            {data.healthy_keys > 0 && data.healthy_keys === data.total_keys && (
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1">
                <CheckCircle2 size={10} /> All clear
              </span>
            )}
          </div>

          {/* Per-key bars */}
          <div className="space-y-2">
            {data.keys.map((k) => {
              const meta = STATE_META[k.state] || STATE_META.healthy;
              return (
                <div key={k.index} className="flex items-center gap-3">
                  <div className="text-[10px] font-mono w-20 flex-shrink-0 text-neutral-500">
                    Key #{k.index + 1}
                  </div>
                  <div className="flex-1 h-5 bg-neutral-200 dark:bg-neutral-900 rounded-md overflow-hidden relative">
                    <div
                      className={`h-full ${meta.color} transition-all duration-300`}
                      style={{ width: `${Math.min(100, k.percent_used)}%` }}
                    />
                    <div className="absolute inset-0 flex items-center justify-between px-2 text-[10px] font-bold tabular-nums">
                      <span className={k.percent_used > 50 ? "text-white" : "text-neutral-700 dark:text-neutral-300"}>
                        {fmt(k.used)} / {fmt(k.limit_hard)}
                      </span>
                      <span className={`${meta.text} bg-white/80 dark:bg-neutral-950/80 px-1 rounded`}>
                        {k.percent_used}%
                      </span>
                    </div>
                  </div>
                  <div className={`text-[10px] uppercase tracking-wider font-bold w-32 flex-shrink-0 text-right ${meta.text}`}>
                    {meta.emoji} {meta.label}
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-[10px] text-neutral-500 mt-3 text-center">
            Resets daily at midnight UTC (5:30 AM IST). Soft-throttle kicks in at 8,500 units to leave a 15% buffer. Hard exhaustion (403) auto-cools for 1 hour.
          </p>
        </>
      )}
    </section>
  );
}
