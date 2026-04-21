/**
 * AdminMetricsPage — Core Web Vitals rollup for the last N days.
 *
 * Reads `/api/metrics/summary?days=N` (team-gated) and renders:
 *   - Overall p75 LCP / CLS / INP / FCP / TTFB for the window
 *   - Per-day pageview sparkline
 *   - Top-20 paths with pageview counts + per-path p75 vitals
 *
 * Data source is the web-vitals beacon at `utils/webVitals.js`, which
 * POSTs a single anonymous payload per pageview on visibility-hidden /
 * pagehide. No cookies, no PII — just path + performance numbers.
 *
 * Thresholds follow Google's "good / needs-improvement / poor" bands:
 *   LCP  <=2500 good · <=4000 needs · else poor
 *   CLS  <=0.10 good · <=0.25 needs · else poor
 *   INP  <= 200 good · <= 500 needs · else poor
 *   FCP  <=1800 good · <=3000 needs · else poor
 *   TTFB <= 800 good · <=1800 needs · else poor
 */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { BarChart3, RefreshCw, Calendar, Globe } from "lucide-react";
import { AUTH_BASE } from "../config/constants";
import { authedFetch } from "../utils/tokenStore";

const THRESHOLDS = {
  lcp:  { good: 2500, needs: 4000, unit: "ms" },
  cls:  { good: 0.1,  needs: 0.25, unit: "" },
  inp:  { good: 200,  needs: 500,  unit: "ms" },
  fcp:  { good: 1800, needs: 3000, unit: "ms" },
  ttfb: { good: 800,  needs: 1800, unit: "ms" },
};

function bandColor(metric, value) {
  if (value == null) return "var(--text-muted)";
  const t = THRESHOLDS[metric];
  if (!t) return "var(--text)";
  if (value <= t.good) return "#22c55e";      // green
  if (value <= t.needs) return "#f59e0b";     // amber
  return "#ef4444";                           // red
}

function fmt(metric, value) {
  if (value == null) return "—";
  if (metric === "cls") return value.toFixed(3);
  return `${Math.round(value)}${THRESHOLDS[metric]?.unit || ""}`;
}

function OverallStat({ label, metric, value }) {
  const color = bandColor(metric, value);
  return (
    <div
      className="rounded-2xl p-5 border"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
    >
      <div className="text-xs uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>
        {label} · p75
      </div>
      <div className="text-3xl font-black" style={{ color }}>
        {fmt(metric, value)}
      </div>
    </div>
  );
}

function DayBar({ date, count, max }) {
  const height = max > 0 ? Math.max(4, Math.round((count / max) * 60)) : 4;
  return (
    <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
      <div
        className="w-full rounded-t transition-all"
        style={{
          height: `${height}px`,
          background: count > 0 ? "var(--orange)" : "var(--border)",
          opacity: count > 0 ? 1 : 0.4,
        }}
        title={`${date}: ${count} pageviews`}
      />
      <div className="text-[10px] font-mono whitespace-nowrap" style={{ color: "var(--text-muted)" }}>
        {date.slice(5)}
      </div>
      <div className="text-[10px] font-bold" style={{ color: "var(--text)" }}>
        {count}
      </div>
    </div>
  );
}

export default function AdminMetricsPage() {
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [summary, setSummary] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await authedFetch(AUTH_BASE, `/api/metrics/summary?days=${days}`);
      if (!res.ok) throw new Error(`Summary (${res.status})`);
      const data = await res.json().catch(() => ({}));
      if (!data.ok) throw new Error(data.error || "Failed to load");
      setSummary(data);
    } catch (e) {
      setErr(e.message || "Failed to load metrics");
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => { load(); }, [load]);

  const perDayEntries = useMemo(() => {
    if (!summary?.perDay) return [];
    // Return oldest → newest so the bar chart reads left-to-right.
    return Object.entries(summary.perDay).sort(([a], [b]) => a.localeCompare(b));
  }, [summary]);

  const maxDayCount = useMemo(() => {
    return perDayEntries.reduce((m, [, c]) => Math.max(m, Number(c) || 0), 0);
  }, [perDayEntries]);

  const topPaths = useMemo(() => (summary?.paths || []).slice(0, 20), [summary]);

  const overall = summary?.overall || {};

  return (
    <div className="max-w-6xl mx-auto pb-20">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl grid place-items-center"
            style={{ background: "var(--orange-soft)", color: "var(--orange)" }}
          >
            <BarChart3 size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-black" style={{ color: "var(--text)" }}>
              Web Vitals
            </h1>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Anonymous Core Web Vitals beacon — last {days} days.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="flex items-center gap-1 text-xs rounded-lg border p-1"
            style={{ background: "var(--surface)", borderColor: "var(--border)" }}
          >
            {[1, 7, 30].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDays(d)}
                className="px-3 py-1.5 rounded-md font-bold transition-colors focus-visible:ring-2 focus-visible:ring-[var(--orange)]"
                style={{
                  background: days === d ? "var(--orange)" : "transparent",
                  color: days === d ? "#fff" : "var(--text-muted)",
                }}
                aria-pressed={days === d}
              >
                {d}d
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold border hover:bg-[var(--surface-alt)] disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-[var(--orange)]"
            style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text)" }}
            aria-label="Refresh metrics"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {err && (
        <div
          className="mb-6 px-4 py-3 rounded-xl border text-sm"
          style={{ background: "rgba(239,68,68,0.08)", borderColor: "rgba(239,68,68,0.3)", color: "#ef4444" }}
          role="alert"
        >
          {err}
        </div>
      )}

      {/* Overall p75 cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
        <OverallStat label="LCP" metric="lcp" value={overall.lcpP75} />
        <OverallStat label="CLS" metric="cls" value={overall.clsP75} />
        <OverallStat label="INP" metric="inp" value={overall.inpP75} />
        <OverallStat label="FCP" metric="fcp" value={overall.fcpP75} />
        <OverallStat label="TTFB" metric="ttfb" value={overall.ttfbP75} />
      </div>

      {/* Per-day bar chart */}
      <div
        className="mb-8 p-5 rounded-2xl border"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <div className="flex items-center gap-2 mb-4" style={{ color: "var(--text-muted)" }}>
          <Calendar size={14} />
          <span className="text-xs uppercase tracking-widest font-bold">
            Pageviews per day · {overall.totalViews || 0} total
          </span>
        </div>
        {perDayEntries.length === 0 ? (
          <div className="text-sm py-8 text-center" style={{ color: "var(--text-muted)" }}>
            No data yet. Real-user beacons start collecting on next page load.
          </div>
        ) : (
          <div className="flex items-end gap-2 h-[80px]">
            {perDayEntries.map(([date, count]) => (
              <DayBar key={date} date={date} count={Number(count) || 0} max={maxDayCount} />
            ))}
          </div>
        )}
      </div>

      {/* Per-path breakdown */}
      <div
        className="rounded-2xl border overflow-hidden"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <div className="flex items-center gap-2 px-5 py-4" style={{ color: "var(--text-muted)", borderBottom: "1px solid var(--border)" }}>
          <Globe size={14} />
          <span className="text-xs uppercase tracking-widest font-bold">Top paths</span>
        </div>
        {topPaths.length === 0 ? (
          <div className="text-sm py-10 text-center" style={{ color: "var(--text-muted)" }}>
            No path-level data yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ color: "var(--text-muted)" }}>
                  <th className="text-left font-bold uppercase tracking-widest text-[10px] px-5 py-2">Path</th>
                  <th className="text-right font-bold uppercase tracking-widest text-[10px] px-3 py-2">Views</th>
                  <th className="text-right font-bold uppercase tracking-widest text-[10px] px-3 py-2">LCP</th>
                  <th className="text-right font-bold uppercase tracking-widest text-[10px] px-3 py-2">CLS</th>
                  <th className="text-right font-bold uppercase tracking-widest text-[10px] px-3 py-2">INP</th>
                  <th className="text-right font-bold uppercase tracking-widest text-[10px] px-3 py-2">FCP</th>
                  <th className="text-right font-bold uppercase tracking-widest text-[10px] px-3 py-2">TTFB</th>
                </tr>
              </thead>
              <tbody>
                {topPaths.map((p) => (
                  <tr key={p.path} style={{ borderTop: "1px solid var(--border)" }}>
                    <td className="px-5 py-3 font-mono text-xs truncate max-w-xs" style={{ color: "var(--text)" }}>
                      {p.path}
                    </td>
                    <td className="px-3 py-3 text-right font-bold" style={{ color: "var(--text)" }}>
                      {p.views}
                    </td>
                    <td className="px-3 py-3 text-right font-mono" style={{ color: bandColor("lcp", p.lcpP75) }}>
                      {fmt("lcp", p.lcpP75)}
                    </td>
                    <td className="px-3 py-3 text-right font-mono" style={{ color: bandColor("cls", p.clsP75) }}>
                      {fmt("cls", p.clsP75)}
                    </td>
                    <td className="px-3 py-3 text-right font-mono" style={{ color: bandColor("inp", p.inpP75) }}>
                      {fmt("inp", p.inpP75)}
                    </td>
                    <td className="px-3 py-3 text-right font-mono" style={{ color: bandColor("fcp", p.fcpP75) }}>
                      {fmt("fcp", p.fcpP75)}
                    </td>
                    <td className="px-3 py-3 text-right font-mono" style={{ color: bandColor("ttfb", p.ttfbP75) }}>
                      {fmt("ttfb", p.ttfbP75)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs mt-4" style={{ color: "var(--text-muted)" }}>
        Beacon is anonymous, respects DNT, skipped on localhost. p75 = 75th percentile.
        Green / amber / red bands follow Google Core Web Vitals thresholds.
      </p>
    </div>
  );
}
