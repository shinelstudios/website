/**
 * EditorMe — read-only "my queue" page for editors at /editor/me.
 *
 * Hits /admin/agency/editor-me (which matches the JWT email → editors.email).
 * Editors see only the projects assigned to them + their own pending payouts.
 * Admins/team can also visit (sees their own row if they have an editor entry).
 *
 * What this page DOES NOT show: pricing of other editors, other clients'
 * data, agency-wide finance. Just "what's on my plate" + "what I'm owed".
 */
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { RefreshCw, IndianRupee, ExternalLink, Briefcase, AlertCircle } from "lucide-react";
import { AUTH_BASE } from "../../config/constants";
import { getAccessToken } from "../../utils/tokenStore";

const STATUS_STYLE = {
  "planned":          "bg-neutral-500/10 text-neutral-600",
  "started":          "bg-blue-500/10 text-blue-500",
  "in-progress":      "bg-orange-500/10 text-orange-500",
  "completed":        "bg-yellow-500/10 text-yellow-600",
  "paid":             "bg-emerald-500/10 text-emerald-600",
  "posted":           "bg-green-500/10 text-green-600",
  "added-to-website": "bg-purple-500/10 text-purple-600",
  "archive":          "bg-neutral-200/50 text-neutral-500",
};

const ACTIVE_STATUSES = ["planned", "started", "in-progress", "completed"];
const DONE_STATUSES = ["paid", "posted", "added-to-website"];

const fmtINR = (n) => `₹${(n || 0).toLocaleString("en-IN")}`;
const fmtDate = (s) => {
  if (!s) return "—";
  try { return new Date(s).toLocaleDateString("en-IN", { month: "short", day: "numeric" }); }
  catch { return "—"; }
};

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

export default function EditorMe() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authedFetch(`/admin/agency/editor-me`);
      if (!res.ok) throw new Error(`API ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const grouped = useMemo(() => {
    const out = { active: [], done: [], other: [] };
    for (const p of (data?.projects || [])) {
      if (ACTIVE_STATUSES.includes(p.status)) out.active.push(p);
      else if (DONE_STATUSES.includes(p.status)) out.done.push(p);
      else out.other.push(p);
    }
    return out;
  }, [data]);

  if (loading && !data) {
    return <div className="p-8 text-sm text-neutral-500">Loading your queue…</div>;
  }
  if (error) {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 text-red-500 p-4 text-sm flex items-center gap-2">
          <AlertCircle size={14} /> Could not load: {error}
        </div>
      </div>
    );
  }
  if (!data) return null;

  // Editor not found case
  if (!data.editor) {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">My queue</h1>
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 text-yellow-700 p-4 text-sm">
          {data.message || "No editor record found for your email. Ask the admin to add you to the team roster."}
        </div>
      </div>
    );
  }

  const isSalary = data.editor.compensation_type === "salary";

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <header className="mb-4 flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="text-kicker text-[var(--orange)]">My queue</div>
          <h1 className="text-display-md font-bold mt-1">Hi, {data.editor.name}</h1>
          <div className="text-xs text-neutral-500 mt-1">
            {data.editor.role || "editor"}
            {isSalary
              ? <> · Salaried · {fmtINR(data.editor.monthly_salary_inr)}/mo</>
              : <> · Freelance · default {fmtINR(data.editor.payment_rate_inr)} per {data.editor.payment_per || "video"}</>}
          </div>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="text-xs px-2 py-1.5 rounded-md border border-neutral-200 dark:border-neutral-800 text-neutral-500 hover:text-neutral-700 disabled:opacity-50 inline-flex items-center gap-1"
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </header>

      {/* Finance summary */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <Stat icon={<Briefcase size={12} />} label="Active" value={grouped.active.length} />
        <Stat icon={<Briefcase size={12} />} label="Shipped" value={grouped.done.length} />
        {!isSalary && (
          <>
            <Stat icon={<IndianRupee size={12} />} label="Lifetime paid" value={fmtINR(data.finance?.paid_total)} accent="text-emerald-600" />
            <Stat icon={<IndianRupee size={12} />} label="Pending payout" value={fmtINR(data.finance?.pending_total)} accent="text-yellow-600" sub={`${data.finance?.pending_count || 0} projects`} />
          </>
        )}
        {isSalary && (
          <>
            <Stat icon={<IndianRupee size={12} />} label="Monthly salary" value={fmtINR(data.editor.monthly_salary_inr)} accent="text-blue-600" />
            <Stat icon={<Briefcase size={12} />} label="In-progress count" value={grouped.active.length} />
          </>
        )}
      </section>

      {/* Active queue */}
      <Section title="Active queue" count={grouped.active.length}>
        {grouped.active.length === 0 ? (
          <p className="text-sm text-neutral-500 p-4">No active projects assigned. 🎉</p>
        ) : (
          <ProjectsTable projects={grouped.active} showPayment={!isSalary} />
        )}
      </Section>

      {/* Shipped */}
      <Section title="Recently shipped" count={grouped.done.length} defaultOpen={false}>
        <ProjectsTable projects={grouped.done.slice(0, 30)} showPayment={!isSalary} />
        {grouped.done.length > 30 && (
          <div className="text-[10px] text-neutral-500 text-center py-2">+ {grouped.done.length - 30} older</div>
        )}
      </Section>

      {/* Archive / other */}
      {grouped.other.length > 0 && (
        <Section title="Other / archived" count={grouped.other.length} defaultOpen={false}>
          <ProjectsTable projects={grouped.other} showPayment={!isSalary} />
        </Section>
      )}

      <div className="text-[11px] text-neutral-400 text-center mt-6">
        Read-only view · Reach out to the team for any updates needed.
      </div>
    </div>
  );
}

function Section({ title, count, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-[var(--surface-elev)] mb-4 overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 border-b border-neutral-100 dark:border-neutral-900 hover:bg-[var(--surface-alt)]"
      >
        <h3 className="text-sm font-bold uppercase tracking-wider">{title} <span className="text-neutral-500 font-normal text-xs">· {count}</span></h3>
        <span className="text-neutral-400 text-xs">{open ? "▾" : "▸"}</span>
      </button>
      {open && children}
    </section>
  );
}

function ProjectsTable({ projects, showPayment }) {
  if (!projects || projects.length === 0) return null;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="bg-[var(--surface)] border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 uppercase tracking-wider">
          <tr>
            <th className="px-3 py-2 text-left">Title</th>
            <th className="px-3 py-2 text-left">Client</th>
            <th className="px-3 py-2 text-left">Type</th>
            <th className="px-3 py-2 text-left">Status</th>
            <th className="px-3 py-2 text-left">Due</th>
            {showPayment && <th className="px-3 py-2 text-right">Pay</th>}
            <th className="px-3 py-2 text-left">Link</th>
          </tr>
        </thead>
        <tbody>
          {projects.map((p) => (
            <tr key={p.id} className="border-b border-neutral-100 dark:border-neutral-900 hover:bg-[var(--surface-alt)]">
              <td className="px-3 py-2 max-w-[300px]">
                <div className="font-semibold truncate" title={p.title}>{p.title}</div>
              </td>
              <td className="px-3 py-2 text-neutral-500">{p.client_name || "—"}</td>
              <td className="px-3 py-2 text-neutral-500">{p.asset_type || "—"}</td>
              <td className="px-3 py-2">
                <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider ${STATUS_STYLE[p.status] || "bg-neutral-100 text-neutral-500"}`}>
                  {p.status || "—"}
                </span>
              </td>
              <td className="px-3 py-2 text-neutral-500">{p.due_date ? fmtDate(p.due_date) : "—"}</td>
              {showPayment && (
                <td className="px-3 py-2 text-right tabular-nums">
                  {p.editor_payment_inr > 0 ? (
                    <span className={p.status === "paid" ? "text-emerald-600 font-semibold" : "text-yellow-600 font-semibold"}>
                      {fmtINR(p.editor_payment_inr)}
                    </span>
                  ) : <span className="text-neutral-400">—</span>}
                </td>
              )}
              <td className="px-3 py-2">
                {p.youtube_video_id ? (
                  <a href={`https://youtu.be/${p.youtube_video_id}`} target="_blank" rel="noopener noreferrer" className="text-[var(--orange)] hover:underline inline-flex items-center gap-1">
                    YT <ExternalLink size={10} />
                  </a>
                ) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Stat({ icon, label, value, accent, sub }) {
  return (
    <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-[var(--surface-elev)] p-3">
      <div className="text-[10px] uppercase tracking-wider text-neutral-500 flex items-center gap-1">{icon} {label}</div>
      <div className={`text-lg font-bold mt-0.5 ${accent || ""}`}>{value}</div>
      {sub && <div className="text-[10px] text-neutral-500 mt-0.5">{sub}</div>}
    </div>
  );
}
