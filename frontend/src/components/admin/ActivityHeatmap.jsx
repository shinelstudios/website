/**
 * ActivityHeatmap — GitHub-style 12-week grid of inventory creation
 * activity, per team-member.
 *
 * Reads /admin/team-activity (worker endpoint added in this commit).
 * Each cell = one day; intensity scales with that day's count. Members
 * are sorted by total volume descending.
 *
 * Renders compactly enough to drop into AdminStats as a single tile.
 * Fixed cell width keeps mobile readable; horizontal scroll if too narrow.
 */
import React, { useEffect, useMemo, useState } from "react";
import { Activity, RefreshCw, AlertCircle } from "lucide-react";
import { AUTH_BASE } from "../../config/constants";
import { authedFetch } from "../../utils/tokenStore";

// Five-step intensity. Lowest = surface tint, highest = bright orange.
function cellColor(n, max) {
  if (!n) return "var(--surface-alt)";
  if (max <= 1) return "var(--orange)";
  const t = Math.min(1, n / max);
  // Quintile bins for the eye, not perfect linearity.
  if (t <= 0.2) return "color-mix(in oklab, var(--orange) 20%, var(--surface-alt))";
  if (t <= 0.4) return "color-mix(in oklab, var(--orange) 40%, var(--surface-alt))";
  if (t <= 0.6) return "color-mix(in oklab, var(--orange) 60%, var(--surface-alt))";
  if (t <= 0.8) return "color-mix(in oklab, var(--orange) 80%, var(--surface-alt))";
  return "var(--orange)";
}

function shortName(email) {
  if (!email) return "—";
  const local = String(email).split("@")[0];
  if (!local) return email;
  return local.length > 18 ? local.slice(0, 17) + "…" : local;
}

export default function ActivityHeatmap({ className = "" }) {
  const [data, setData] = useState({ days: [], members: [] });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await authedFetch(AUTH_BASE, "/admin/team-activity?days=84");
      if (!res.ok) throw new Error(`Activity (${res.status})`);
      const json = await res.json().catch(() => ({}));
      setData({
        days: Array.isArray(json.days) ? json.days : [],
        members: Array.isArray(json.members) ? json.members : [],
      });
    } catch (e) {
      setErr(e.message || "Failed to load activity");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const max = useMemo(() => {
    let m = 0;
    for (const member of data.members) {
      for (const v of Object.values(member.byDay || {})) {
        if (v > m) m = v;
      }
    }
    return m;
  }, [data]);

  const monthLabels = useMemo(() => {
    // Show a tick where the month rolls over. Returned as { dayIdx → "Apr" }.
    const out = {};
    let prev = "";
    data.days.forEach((d, i) => {
      const month = d.slice(5, 7);
      if (month !== prev) {
        out[i] = new Date(d).toLocaleString("en-US", { month: "short" });
        prev = month;
      }
    });
    return out;
  }, [data.days]);

  return (
    <div
      className={`rounded-2xl border p-5 md:p-6 ${className}`}
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div
            className="w-9 h-9 rounded-lg grid place-items-center"
            style={{ background: "var(--orange-soft)", color: "var(--orange)" }}
            aria-hidden="true"
          >
            <Activity size={16} />
          </div>
          <div>
            <h3 className="text-base font-black" style={{ color: "var(--text)" }}>Team activity</h3>
            <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
              Pieces shipped per day · last 12 weeks
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          aria-label="Refresh"
          className="p-2 rounded-lg border hover:bg-[var(--surface-alt)] disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-[var(--orange)]"
          style={{ borderColor: "var(--border)", color: "var(--text)" }}
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {err && (
        <div
          className="mb-3 px-3 py-2 rounded-lg text-xs flex items-center gap-2"
          style={{ background: "rgba(239,68,68,0.08)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.25)" }}
          role="alert"
        >
          <AlertCircle size={12} /> {err}
        </div>
      )}

      {loading && data.members.length === 0 ? (
        <div className="text-sm py-6 text-center" style={{ color: "var(--text-muted)" }}>Loading…</div>
      ) : data.members.length === 0 ? (
        <div className="text-sm py-6 text-center" style={{ color: "var(--text-muted)" }}>
          No attributed activity in the last 12 weeks. As editors ship pieces with their email
          attribution, dots will fill in here.
        </div>
      ) : (
        <div className="overflow-x-auto -mx-2">
          <table className="border-separate" style={{ borderSpacing: "2px" }}>
            <thead>
              <tr>
                <th className="text-left text-[10px] font-bold uppercase tracking-widest pr-3 pb-1" style={{ color: "var(--text-muted)" }}>
                  Member
                </th>
                {data.days.map((d, i) => (
                  <th
                    key={d}
                    className="text-[9px] font-mono align-bottom pb-1"
                    style={{ color: "var(--text-muted)", minWidth: 10 }}
                  >
                    {monthLabels[i] || ""}
                  </th>
                ))}
                <th className="text-right text-[10px] font-bold uppercase tracking-widest pl-2 pb-1" style={{ color: "var(--text-muted)" }}>
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {data.members.map((m) => (
                <tr key={m.email}>
                  <td
                    className="text-xs font-mono pr-3 align-middle"
                    style={{ color: "var(--text)", maxWidth: 160 }}
                    title={m.email}
                  >
                    {shortName(m.email)}
                  </td>
                  {data.days.map((d) => {
                    const n = m.byDay?.[d] || 0;
                    return (
                      <td
                        key={d}
                        title={`${d} — ${n} piece${n === 1 ? "" : "s"}`}
                        style={{
                          width: 10,
                          height: 10,
                          background: cellColor(n, max),
                          borderRadius: 2,
                        }}
                      />
                    );
                  })}
                  <td className="text-xs font-mono font-bold pl-2 text-right" style={{ color: "var(--text)" }}>
                    {m.total}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div
        className="mt-4 flex items-center justify-end gap-2 text-[10px]"
        style={{ color: "var(--text-muted)" }}
        aria-hidden="true"
      >
        <span>Less</span>
        {[0, 1, 2, 3, 4].map((i) => (
          <span
            key={i}
            style={{
              width: 10,
              height: 10,
              borderRadius: 2,
              background: cellColor(max ? Math.ceil((max * (i + 1)) / 5) : 0, max || 1),
            }}
          />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
