import React from "react";
import { HairlineCard } from "../../../design";
import { AUTH_BASE } from "../../../config/constants";

const METRIC_LABELS = {
  subscribers: "Subscribers",
  instagram_followers: "Instagram followers",
  view_count: "Total views",
};

function fmtNum(n) {
  const v = Number(n || 0);
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + "M";
  if (v >= 1_000) return (v / 1_000).toFixed(1) + "k";
  return String(v);
}

function Render({ client, config }) {
  const metric = config?.metric || "subscribers";
  const [series, setSeries] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    if (!client.slug) { setLoading(false); return; }
    fetch(`${AUTH_BASE}/api/c/${encodeURIComponent(client.slug)}/stats/30day`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (!cancelled) { setSeries(d?.series || []); setLoading(false); } })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [client.slug]);

  const values = series.map(r => Number(r[metric] || 0));
  const max = Math.max(1, ...values);
  const first = values[0] || 0;
  const last = values[values.length - 1] || 0;
  const delta = last - first;
  const deltaPct = first > 0 ? ((delta / first) * 100) : 0;

  return (
    <HairlineCard className="p-5 md:p-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: "var(--orange)" }}>
            Last 30 days
          </p>
          <h3 className="mt-1 text-2xl md:text-3xl font-black" style={{ color: "var(--text)" }}>
            {fmtNum(last)}
            <span className="ml-2 text-base font-bold" style={{ color: "var(--text-muted)" }}>
              {METRIC_LABELS[metric]}
            </span>
          </h3>
          {series.length > 1 ? (
            <p className="mt-1 text-xs font-bold" style={{ color: delta >= 0 ? "#16a34a" : "#dc2626" }}>
              {delta >= 0 ? "▲" : "▼"} {fmtNum(Math.abs(delta))} ({Math.abs(deltaPct).toFixed(1)}%)
            </p>
          ) : null}
        </div>
      </div>

      {loading ? (
        <div className="mt-4 h-24 rounded animate-pulse" style={{ background: "var(--surface)" }} />
      ) : values.length === 0 ? (
        <p className="mt-4 text-xs" style={{ color: "var(--text-muted)" }}>
          No stats captured yet. Check back after Shinel's daily sync runs.
        </p>
      ) : (
        <div className="mt-4 flex items-end gap-1 h-24">
          {values.map((v, i) => (
            <div
              key={i}
              className="flex-1 rounded-t"
              style={{
                height: `${(v / max) * 100}%`,
                background: "linear-gradient(180deg, var(--orange), rgba(232,80,2,0.4))",
                minHeight: 2,
              }}
              title={`${fmtNum(v)} on day ${i + 1}`}
            />
          ))}
        </div>
      )}
    </HairlineCard>
  );
}

function Editor({ config, onChange }) {
  return (
    <div>
      <label className="block text-xs font-black uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>
        Metric to highlight
      </label>
      <select
        value={config?.metric || "subscribers"}
        onChange={(e) => onChange({ ...config, metric: e.target.value })}
        className="rounded p-2 text-sm w-full md:w-auto"
        style={{ background: "var(--surface)", border: "1px solid var(--hairline)", color: "var(--text)" }}
      >
        {Object.entries(METRIC_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>
    </div>
  );
}

export default { Render, Editor };
