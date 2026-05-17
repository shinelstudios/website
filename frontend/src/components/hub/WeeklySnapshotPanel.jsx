/**
 * WeeklySnapshotPanel — founder briefing card at the top of the Overview tab.
 *
 * Pulls from /admin/agency/public/snapshot-weekly (no auth — aggregate only).
 * Always rendered from live worker data. The 24x7 laptop scrapers keep the
 * underlying tables fresh, and the worker rolls them up here on each load.
 *
 * Designed dense — fits in one cockpit row, no full-page mode needed.
 */

import { useEffect, useState } from "react";
import { Activity, RefreshCw, Youtube, Instagram, TrendingUp } from "lucide-react";
import { AUTH_BASE } from "../../config/constants";

function fmtNum(n) {
  if (n == null) return "—";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2).replace(/\.?0+$/, "") + "M";
  if (n >= 1_000)     return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(n);
}
function fmtTime(iso) {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }); }
  catch { return iso; }
}

const PIPELINE_TONES = {
  new: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  contacted: "bg-purple-500/15 text-purple-700 dark:text-purple-300",
  outreach: "bg-purple-500/15 text-purple-700 dark:text-purple-300",
  qualified: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  negotiating: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  signed: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300",
  paid: "bg-green-500/15 text-green-700 dark:text-green-300",
  closed: "bg-green-500/15 text-green-700 dark:text-green-300",
  invoiced: "bg-teal-500/15 text-teal-700 dark:text-teal-300",
  lost: "bg-neutral-300/30 text-neutral-500",
  declined: "bg-neutral-300/30 text-neutral-500",
  ghosted: "bg-neutral-300/30 text-neutral-500",
};

export default function WeeklySnapshotPanel() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`${AUTH_BASE}/admin/agency/public/snapshot-weekly`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const j = await res.json();
      setData(j); setErr("");
    } catch (e) { setErr(String(e?.message || e)); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const r = data?.reach || {};
  const c = data?.counts || {};
  const w = data?.last_7d || {};
  const leadsP = data?.pipeline?.leads_by_status || {};
  const sponsP = data?.pipeline?.sponsorships_by_status || {};
  const top    = data?.top_socials_by_reach || [];

  // Pipelines as ordered chips
  const leadOrder  = ["new", "contacted", "qualified", "closed", "lost"];
  const sponsOrder = ["new", "outreach", "negotiating", "signed", "invoiced", "paid", "declined", "ghosted"];

  return (
    <section className="lg:col-span-2 rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 bg-[var(--surface-elev)]">
      <header className="flex items-center justify-between mb-3 pb-2 border-b border-neutral-100 dark:border-neutral-900">
        <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
          <Activity size={15} className="text-[var(--orange)]" />
          Weekly Snapshot
          <span className="text-xs text-neutral-500 font-normal">· {data?.generated_at ? `as of ${fmtTime(data.generated_at)}` : (loading ? "loading…" : "—")}</span>
        </h3>
        <button
          onClick={load}
          disabled={loading}
          className="text-xs px-2 py-1 rounded-md border border-neutral-300 dark:border-neutral-700 hover:bg-[var(--surface-alt)] flex items-center gap-1"
        >
          <RefreshCw size={11} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </header>

      {err && (
        <p className="text-xs text-red-500 mb-3">
          Couldn't load snapshot: {err}. Endpoint may not be deployed yet — check <code>/admin/agency/public/snapshot-weekly</code>.
        </p>
      )}

      {/* Hero row: 4 big numbers */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="rounded-lg bg-[var(--ink)] text-white p-3" style={{ background: "#0a0a0a" }}>
          <div className="text-[10px] uppercase tracking-wider font-bold text-white/60">Total Reach</div>
          <div className="text-2xl font-extrabold mt-1 font-tabular">{fmtNum(r.total)}</div>
          <div className="text-[10px] text-white/50 mt-0.5">{fmtNum(r.yt)} YT · {fmtNum(r.ig)} IG</div>
        </div>
        <div className="rounded-lg bg-[var(--surface-alt)] p-3">
          <div className="text-[10px] uppercase tracking-wider font-bold text-neutral-500">Active Clients</div>
          <div className="text-2xl font-extrabold mt-1 font-tabular">{c.active_clients ?? "—"}</div>
          <div className="text-[10px] text-neutral-500 mt-0.5">of {c.total_clients ?? "—"} total · {c.paused_clients ?? 0} paused</div>
        </div>
        <div className="rounded-lg bg-[var(--surface-alt)] p-3">
          <div className="text-[10px] uppercase tracking-wider font-bold text-neutral-500">Posts (7d)</div>
          <div className="text-2xl font-extrabold mt-1 font-tabular">{(w.yt_uploads ?? 0) + (w.ig_posts ?? 0)}</div>
          <div className="text-[10px] text-neutral-500 mt-0.5">{w.yt_uploads ?? 0} YT · {w.ig_posts ?? 0} IG</div>
        </div>
        <div className="rounded-lg bg-[var(--surface-alt)] p-3">
          <div className="text-[10px] uppercase tracking-wider font-bold text-neutral-500">Projects shipped</div>
          <div className="text-2xl font-extrabold mt-1 font-tabular">{w.projects_completed ?? "—"}</div>
          <div className="text-[10px] text-neutral-500 mt-0.5">posted in last 7 days</div>
        </div>
      </div>

      {/* Pipeline strips */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-3">
          <div className="text-[10px] uppercase tracking-wider font-bold text-neutral-500 mb-2">
            Lead Pipeline <span className="text-neutral-400 font-normal">· {w.new_leads ?? 0} new this week</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {leadOrder.map((k) => (
              <span key={k} className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${PIPELINE_TONES[k]}`}>
                {k} · {leadsP[k] || 0}
              </span>
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-3">
          <div className="text-[10px] uppercase tracking-wider font-bold text-neutral-500 mb-2">
            Sponsorships <span className="text-neutral-400 font-normal">· {w.sponsorship_inquiries ?? 0} new inquiries</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {sponsOrder.map((k) => {
              const s = sponsP[k];
              const cnt = (s && typeof s === "object" ? s.count : s) || 0;
              if (!cnt) return null;
              return (
                <span key={k} className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${PIPELINE_TONES[k]}`}>
                  {k} · {cnt}
                </span>
              );
            })}
            {sponsOrder.every((k) => !((sponsP[k] && (sponsP[k].count || sponsP[k])) || 0)) && (
              <span className="text-[11px] text-neutral-500 italic">No sponsorship activity yet.</span>
            )}
          </div>
        </div>
      </div>

      {/* Top socials by reach */}
      {top.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-wider font-bold text-neutral-500 mb-2 flex items-center gap-1">
            <TrendingUp size={11} /> Top socials by reach
          </div>
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
            {top.slice(0, 5).map((s, i) => (
              <li key={`${s.handle}-${s.kind}-${i}`} className="rounded-md border border-neutral-200 dark:border-neutral-800 p-2 bg-[var(--surface-alt)]">
                <div className="flex items-center gap-1 text-[11px] font-bold truncate">
                  {s.kind === "yt" ? <Youtube size={11} className="text-red-500 shrink-0" /> : <Instagram size={11} className="text-pink-500 shrink-0" />}
                  <span className="truncate">{s.handle}</span>
                </div>
                <div className="text-[10px] text-neutral-500 truncate">{s.client || ""}</div>
                <div className="text-base font-extrabold font-tabular">{fmtNum(s.reach)}</div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
