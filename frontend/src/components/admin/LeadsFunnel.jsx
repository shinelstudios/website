/**
 * LeadsFunnel — horizontal-bar funnel of leads grouped by status.
 *
 * Reads the existing /leads endpoint (admin-gated). Each lead has a
 * `status` field; we bucket into 5 standard stages and render bar
 * widths proportional to the largest bucket so the eye reads them
 * relative.
 *
 * Drops cleanly into AdminStats as a tile.
 */
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Mail, ArrowUpRight, RefreshCw, AlertCircle } from "lucide-react";
import { AUTH_BASE } from "../../config/constants";
import { authedFetch } from "../../utils/tokenStore";

const STAGES = [
  { key: "new",        label: "New",        color: "#94a3b8" }, // slate-400
  { key: "contacted",  label: "Contacted",  color: "#60a5fa" }, // blue-400
  { key: "qualified",  label: "Qualified",  color: "#a78bfa" }, // violet-400
  { key: "won",        label: "Won",        color: "#22c55e" }, // green-500
  { key: "lost",       label: "Lost",       color: "#ef4444" }, // red-500
];

function bucketOf(status) {
  const s = String(status || "").toLowerCase().trim();
  if (!s || s === "open" || s === "fresh") return "new";
  if (s.includes("contact")) return "contacted";
  if (s.includes("qualif")) return "qualified";
  if (s === "won" || s.includes("closed-won") || s.includes("converted")) return "won";
  if (s === "lost" || s.includes("closed-lost") || s.includes("dropped")) return "lost";
  return "new";
}

export default function LeadsFunnel({ className = "" }) {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await authedFetch(AUTH_BASE, "/leads");
      if (!res.ok) throw new Error(`Leads (${res.status})`);
      const data = await res.json().catch(() => ({}));
      setLeads(Array.isArray(data.leads) ? data.leads : []);
    } catch (e) {
      setErr(e.message || "Failed to load leads");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const counts = useMemo(() => {
    const c = Object.fromEntries(STAGES.map((s) => [s.key, 0]));
    for (const l of leads) c[bucketOf(l.status)]++;
    return c;
  }, [leads]);

  const max = Math.max(1, ...Object.values(counts));
  const total = leads.length;

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
            <Mail size={16} />
          </div>
          <div>
            <h3 className="text-base font-black" style={{ color: "var(--text)" }}>Leads funnel</h3>
            <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>{total} total</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
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
          <Link
            to="/dashboard/leads"
            className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-widest px-2 py-1 rounded hover:bg-[var(--surface-alt)]"
            style={{ color: "var(--orange)" }}
          >
            CRM <ArrowUpRight size={11} />
          </Link>
        </div>
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

      <ul className="space-y-2.5">
        {STAGES.map((s) => {
          const n = counts[s.key];
          const pct = Math.round((n / max) * 100);
          return (
            <li key={s.key}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-bold" style={{ color: "var(--text)" }}>{s.label}</span>
                <span className="font-mono" style={{ color: "var(--text-muted)" }}>{n}</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--surface-alt)" }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${pct}%`, background: s.color }}
                  aria-hidden="true"
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
