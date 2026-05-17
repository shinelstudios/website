/**
 * SponsorshipsPanel — deal pipeline view of every sponsor inquiry that's
 * come in through any /c/<slug>/sponsor form.
 *
 * Lives on top of client_inbox (type='sponsor') so historical inquiries are
 * already populated — the migration just adds status/notes/value columns.
 *
 * Lifecycle:
 *   new → outreach → negotiating → signed → invoiced → paid       (won)
 *                              \__ declined / ghosted              (lost)
 *
 * Status changes update D1 and fire Discord on signed/paid milestones.
 */

import { useEffect, useMemo, useState } from "react";
import { Briefcase, RefreshCw, IndianRupee } from "lucide-react";
import { authedFetch } from "../../utils/tokenStore";

const PIPELINE = [
  { key: "new",          label: "New",          tone: "bg-blue-500/15 text-blue-700 dark:text-blue-300" },
  { key: "outreach",     label: "Outreach",     tone: "bg-purple-500/15 text-purple-700 dark:text-purple-300" },
  { key: "negotiating",  label: "Negotiating",  tone: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  { key: "signed",       label: "Signed",       tone: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300" },
  { key: "invoiced",     label: "Invoiced",     tone: "bg-teal-500/15 text-teal-700 dark:text-teal-300" },
  { key: "paid",         label: "Paid",         tone: "bg-green-500/15 text-green-700 dark:text-green-300" },
  { key: "declined",     label: "Declined",     tone: "bg-neutral-500/15 text-neutral-500 dark:text-neutral-400" },
  { key: "ghosted",      label: "Ghosted",      tone: "bg-neutral-500/15 text-neutral-500 dark:text-neutral-400" },
];

function fmtINR(n) {
  if (!n) return "—";
  return "₹" + Number(n).toLocaleString("en-IN");
}
function fmtTime(ts) {
  if (!ts) return "";
  try { return new Date(typeof ts === "number" ? ts * 1000 : ts).toLocaleDateString("en-IN", { day: "numeric", month: "short" }); } catch { return ""; }
}

export default function SponsorshipsPanel() {
  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [busy, setBusy] = useState({});

  async function load() {
    setLoading(true);
    try {
      const qs = filter ? `?status=${filter}` : "";
      const res = await authedFetch(`/admin/agency/sponsorships${qs}`);
      const j = await res.json();
      if (res.ok) { setRows(j.sponsorships || []); setStats(j.stats || []); }
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

  async function patch(id, body) {
    setBusy((b) => ({ ...b, [id]: true }));
    try {
      const res = await authedFetch(`/admin/agency/sponsorships/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) { const j = await res.json().catch(() => ({})); alert(`Failed: ${j.error || res.status}`); }
      await load();
    } finally { setBusy((b) => { const n = { ...b }; delete n[id]; return n; }); }
  }

  const statsByStatus = useMemo(() => {
    const m = {};
    for (const s of stats || []) m[s.status] = s;
    return m;
  }, [stats]);

  const totalPaid = statsByStatus.paid?.total_inr || 0;
  const totalSignedPipeline = (statsByStatus.signed?.total_inr || 0) + (statsByStatus.invoiced?.total_inr || 0);

  return (
    <section className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 bg-[var(--surface-elev)] space-y-4">
      <header className="flex items-center justify-between pb-2 border-b border-neutral-100 dark:border-neutral-900">
        <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
          <Briefcase size={15} className="text-[var(--orange)]" />
          Sponsorships
          <span className="text-xs text-neutral-500 font-normal">· {rows.length} {filter ? `· ${filter}` : "shown"}</span>
        </h3>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-neutral-500">Paid: <strong className="text-green-600 dark:text-green-400">{fmtINR(totalPaid)}</strong></span>
          <span className="text-neutral-500">In pipeline: <strong>{fmtINR(totalSignedPipeline)}</strong></span>
          <button
            onClick={load}
            disabled={loading}
            className="px-2 py-1 rounded-md border border-neutral-300 dark:border-neutral-700 hover:bg-[var(--surface-alt)] flex items-center gap-1"
          >
            <RefreshCw size={11} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
      </header>

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilter("")}
          className={`text-xs px-3 py-1.5 rounded-full font-bold ${filter === "" ? "bg-[var(--orange)] text-white" : "bg-[var(--surface-alt)]"}`}
        >
          All
        </button>
        {PIPELINE.map((c) => (
          <button
            key={c.key}
            onClick={() => setFilter(c.key)}
            className={`text-xs px-3 py-1.5 rounded-full font-bold ${filter === c.key ? "bg-[var(--orange)] text-white" : c.tone}`}
          >
            {c.label} · {statsByStatus[c.key]?.n || 0}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-neutral-500 py-6 text-center">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-neutral-500 py-6 text-center">No sponsor inquiries yet.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => {
            const col = PIPELINE.find((c) => c.key === r.status) || PIPELINE[0];
            let pl = {}; try { pl = JSON.parse(r.payload_json || "{}"); } catch {}
            return (
              <li key={r.id} className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-3 bg-[var(--surface-alt)]">
                <div className="flex items-start gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <strong className="text-sm">{pl.brand || pl.company || pl.name || "(unknown brand)"}</strong>
                      <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded ${col.tone}`}>{col.label}</span>
                      <span className="text-[10px] text-neutral-500">→ {r.client_name || r.client_id}</span>
                      <span className="text-[10px] text-neutral-500">{fmtTime(r.created_at)}</span>
                    </div>
                    <div className="text-xs text-neutral-500 mt-0.5">
                      {pl.email && <a href={`mailto:${pl.email}`} className="hover:underline">{pl.email}</a>}
                      {pl.budget && <span className="ml-2">· stated budget: {pl.budget}</span>}
                    </div>
                    {pl.message && <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1 italic line-clamp-2">{pl.message}</p>}
                    {r.notes && <p className="text-xs text-neutral-700 dark:text-neutral-300 mt-1">📝 {r.notes}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <select
                      value={r.status}
                      onChange={(e) => patch(r.id, { status: e.target.value })}
                      disabled={busy[r.id]}
                      className="text-xs rounded border border-neutral-300 dark:border-neutral-700 px-1.5 py-1 bg-[var(--surface-elev)]"
                    >
                      {PIPELINE.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                    </select>
                    <div className="flex items-center gap-1">
                      <IndianRupee size={10} className="text-neutral-400" />
                      <input
                        type="number"
                        placeholder="value"
                        defaultValue={r.value_inr || ""}
                        onBlur={(e) => {
                          const v = e.target.value ? parseInt(e.target.value, 10) : null;
                          if (v !== (r.value_inr || null)) patch(r.id, { value_inr: v });
                        }}
                        className="text-xs w-20 rounded border border-neutral-300 dark:border-neutral-700 px-1.5 py-1 bg-[var(--surface-elev)]"
                      />
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <footer className="text-[11px] text-neutral-500 pt-2 border-t border-neutral-100 dark:border-neutral-900">
        Status changes to <strong>signed</strong> ping <code>#ops</code>. Status changes to <strong>paid</strong> ping <code>#finance</code>.
      </footer>
    </section>
  );
}
