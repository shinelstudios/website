/**
 * GrowthPanel — the "more clients / show work / earn more" cockpit view.
 *
 * v1 (this drop) focuses on **leads** — D1-backed pipeline with status edit
 * + convert-to-client shortcut. Showcase + sponsorship sub-panels land next.
 *
 * Pipeline columns:
 *   new → contacted → qualified → closed (won)   |   lost (dead)
 *
 * Every status change PATCHes the worker, which fires Discord on `closed`.
 */

import { useEffect, useMemo, useState } from "react";
import { Sprout, Mail, ChevronDown, RefreshCw, ExternalLink, UserPlus2, Trash2 } from "lucide-react";
import { authedFetch } from "../../utils/tokenStore";

const STATUS_COLUMNS = [
  { key: "new",        label: "New",        tone: "bg-blue-500/15 text-blue-700 dark:text-blue-300" },
  { key: "contacted",  label: "Contacted",  tone: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  { key: "qualified",  label: "Qualified",  tone: "bg-purple-500/15 text-purple-700 dark:text-purple-300" },
  { key: "closed",     label: "Won",        tone: "bg-green-500/15 text-green-700 dark:text-green-300" },
  { key: "lost",       label: "Lost",       tone: "bg-neutral-500/15 text-neutral-500 dark:text-neutral-400" },
];

function fmtTime(ts) {
  if (!ts) return "";
  try {
    const d = new Date(ts);
    const diff = (Date.now() - d.getTime()) / 60000; // minutes
    if (diff < 1)     return "just now";
    if (diff < 60)    return `${Math.floor(diff)}m ago`;
    if (diff < 1440)  return `${Math.floor(diff / 60)}h ago`;
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  } catch { return ""; }
}

export default function GrowthPanel() {
  const [leads, setLeads] = useState([]);
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState(""); // "" = all
  const [busy, setBusy] = useState({});

  async function load() {
    setLoading(true);
    try {
      const qs = filter ? `?status=${filter}` : "";
      const res = await authedFetch(`/admin/agency/leads${qs}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const j = await res.json();
      setLeads(j.leads || []);
      setStats(j.stats || []);
    } catch (e) {
      console.error("leads load failed", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

  async function patchLead(id, body) {
    setBusy((b) => ({ ...b, [id]: true }));
    try {
      const res = await authedFetch(`/admin/agency/leads/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        alert(`Update failed: ${j.error || res.status}`);
      }
      await load();
    } finally {
      setBusy((b) => { const n = { ...b }; delete n[id]; return n; });
    }
  }

  async function convertLead(lead) {
    if (!confirm(`Convert "${lead.name}" into an active client?`)) return;
    setBusy((b) => ({ ...b, [lead.id]: true }));
    try {
      const res = await authedFetch(`/admin/agency/leads/${encodeURIComponent(lead.id)}/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: lead.name }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { alert(`Convert failed: ${j.error || res.status}`); return; }
      alert(`Converted! New client_id: ${j.clientId}\n\nFinish onboarding in the Clients panel: channels, IG, Drive folder, Discord webhook.`);
      await load();
    } finally {
      setBusy((b) => { const n = { ...b }; delete n[lead.id]; return n; });
    }
  }

  const statsByStatus = useMemo(() => {
    const m = {};
    for (const s of stats || []) m[s.status] = s.n;
    return m;
  }, [stats]);

  return (
    <section className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 bg-[var(--surface-elev)] space-y-4">
      <header className="flex items-center justify-between pb-2 border-b border-neutral-100 dark:border-neutral-900">
        <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
          <Sprout size={15} className="text-[var(--orange)]" />
          Lead Pipeline
          <span className="text-xs text-neutral-500 font-normal">· {leads.length} {filter ? `· filtered to ${filter}` : "shown"}</span>
        </h3>
        <button
          onClick={load}
          className="text-xs px-2 py-1 rounded-md border border-neutral-300 dark:border-neutral-700 hover:bg-[var(--surface-alt)] flex items-center gap-1"
          disabled={loading}
        >
          <RefreshCw size={11} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </header>

      {/* Stat chips per status */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilter("")}
          className={`text-xs px-3 py-1.5 rounded-full font-bold ${filter === "" ? "bg-[var(--orange)] text-white" : "bg-[var(--surface-alt)]"}`}
        >
          All · {Object.values(statsByStatus).reduce((a, b) => a + b, 0)}
        </button>
        {STATUS_COLUMNS.map((c) => (
          <button
            key={c.key}
            onClick={() => setFilter(c.key)}
            className={`text-xs px-3 py-1.5 rounded-full font-bold ${filter === c.key ? "bg-[var(--orange)] text-white" : c.tone}`}
          >
            {c.label} · {statsByStatus[c.key] || 0}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <p className="text-sm text-neutral-500 py-6 text-center">Loading…</p>
      ) : leads.length === 0 ? (
        <p className="text-sm text-neutral-500 py-6 text-center">
          {filter ? `No "${filter}" leads.` : "No leads yet. New submissions land here when prospects fill the contact form."}
        </p>
      ) : (
        <ul className="space-y-2">
          {leads.map((l) => {
            const interests = (() => { try { return JSON.parse(l.interests_json || "[]"); } catch { return []; } })();
            const col = STATUS_COLUMNS.find((c) => c.key === l.status) || STATUS_COLUMNS[0];
            const isDone = l.status === "closed" || l.status === "lost";
            return (
              <li
                key={l.id}
                className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-3 bg-[var(--surface-alt)] flex items-start gap-3 hover:border-[var(--orange)]/40 transition"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <strong className="text-sm">{l.name}</strong>
                    <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded ${col.tone}`}>{col.label}</span>
                    {l.source && <span className="text-[10px] text-neutral-500 uppercase">via {l.source}</span>}
                    <span className="text-[10px] text-neutral-500">{fmtTime(l.created_at)}</span>
                  </div>
                  <div className="text-xs text-neutral-500 mt-0.5 flex items-center gap-2 flex-wrap">
                    <a href={`mailto:${l.email}`} className="hover:underline flex items-center gap-1">
                      <Mail size={10} /> {l.email}
                    </a>
                    {l.handle && <span>· @{l.handle}</span>}
                  </div>
                  {interests.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {interests.map((it) => (
                        <span key={it} className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-200/60 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">{it}</span>
                      ))}
                    </div>
                  )}
                  {l.notes && (
                    <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1.5 italic">{l.notes}</p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <select
                    value={l.status}
                    onChange={(e) => patchLead(l.id, { status: e.target.value })}
                    disabled={busy[l.id]}
                    className="text-xs rounded border border-neutral-300 dark:border-neutral-700 px-1.5 py-1 bg-[var(--surface-elev)]"
                  >
                    {STATUS_COLUMNS.map((c) => (
                      <option key={c.key} value={c.key}>{c.label}</option>
                    ))}
                  </select>
                  {!isDone && (
                    <button
                      onClick={() => convertLead(l)}
                      disabled={busy[l.id]}
                      className="text-xs px-2 py-1 rounded-md bg-green-500/15 text-green-700 dark:text-green-300 hover:bg-green-500/25 font-bold flex items-center gap-1"
                      title="Promote this lead into an active client row"
                    >
                      <UserPlus2 size={11} /> Convert
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <footer className="text-[11px] text-neutral-500 pt-2 border-t border-neutral-100 dark:border-neutral-900">
        Every new lead pings the Discord <code className="font-mono">ops</code> channel automatically.
        Status changes update D1 + mirror the legacy KV-backed AdminLeadsPage view.
      </footer>
    </section>
  );
}
