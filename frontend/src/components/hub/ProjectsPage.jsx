/**
 * ProjectsPage — /dashboard/projects
 *
 * Dedicated page for the project pipeline. Two views:
 *  - kanban: full-width drag-drop (the existing PipelineKanban component)
 *  - list:   filterable, paginated table; bulk-mark-paid, bulk-archive
 *
 * Filters apply to BOTH views. State persists in URL search params so the
 * user can bookmark a filtered view (e.g. ?status=in-progress&clientId=...).
 */
import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Filter, List, LayoutGrid, RefreshCw, ExternalLink, IndianRupee, Check, Archive } from "lucide-react";
import { AUTH_BASE } from "../../config/constants";
import { getAccessToken } from "../../utils/tokenStore";
import PipelineKanban from "./PipelineKanban";

const STATUSES = ["planned", "started", "in-progress", "completed", "paid", "posted", "added-to-website", "archive"];
const ASSET_TYPES = ["long-form", "short", "reel", "live", "community", "thumbnail-only", "carousel"];

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

const fmtINR = (n) => `₹${(n || 0).toLocaleString("en-IN")}`;
const fmtDate = (s) => {
  if (!s) return "—";
  try { return new Date(s).toLocaleDateString("en-IN", { month: "short", day: "numeric" }); }
  catch { return "—"; }
};

export default function ProjectsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [view, setView] = useState(() => searchParams.get("view") || "kanban");
  const [clients, setClients] = useState([]);
  const [editors, setEditors] = useState([]);
  const [allProjects, setAllProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busyBulk, setBusyBulk] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 25;

  // Filter state synced to URL
  const filters = useMemo(() => ({
    clientId: searchParams.get("clientId") || "",
    status:   searchParams.get("status")   || "",
    asset:    searchParams.get("asset")    || "",
    editorId: searchParams.get("editorId") || "",
    q:        searchParams.get("q")        || "",
  }), [searchParams]);

  const setFilter = (key, val) => {
    const next = new URLSearchParams(searchParams);
    if (val) next.set(key, val); else next.delete(key);
    next.set("view", view);
    setSearchParams(next, { replace: true });
    setPage(1);
  };
  const setViewMode = (v) => {
    setView(v);
    const next = new URLSearchParams(searchParams);
    next.set("view", v);
    setSearchParams(next, { replace: true });
  };
  const clearFilters = () => {
    setSearchParams({ view });
    setPage(1);
  };

  const loadAux = useCallback(async () => {
    try {
      const [cRes, eRes] = await Promise.all([
        authedFetch(`/admin/agency/clients/full?show_inactive=true`),
        authedFetch(`/admin/agency/editors`),
      ]);
      if (cRes.ok) {
        const json = await cRes.json();
        setClients(json.clients || []);
      }
      if (eRes.ok) {
        const json = await eRes.json();
        setEditors(json.editors || []);
      }
    } catch (e) { console.error("aux load failed", e); }
  }, []);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    try {
      // Pull all projects (cap 200 per query). Use by-status to get them grouped,
      // then flatten — already includes joined client_name for display.
      const res = await authedFetch(`/admin/agency/projects/by-status${filters.clientId ? `?clientId=${encodeURIComponent(filters.clientId)}` : ""}`);
      if (res.ok) {
        const json = await res.json();
        const flat = [];
        for (const arr of Object.values(json.grouped || {})) for (const p of (arr || [])) flat.push(p);
        // Sort newest first
        flat.sort((a, b) => (b.updated_at || "").localeCompare(a.updated_at || ""));
        setAllProjects(flat);
      }
    } finally {
      setLoading(false);
    }
  }, [filters.clientId]);

  useEffect(() => { loadAux(); }, [loadAux]);
  useEffect(() => { loadProjects(); }, [loadProjects]);

  const filtered = useMemo(() => {
    return allProjects.filter((p) => {
      if (filters.status && p.status !== filters.status) return false;
      if (filters.asset && p.asset_type !== filters.asset) return false;
      if (filters.editorId && p.assigned_editor_id !== filters.editorId) return false;
      if (filters.q) {
        const q = filters.q.toLowerCase();
        const hay = `${p.title || ""} ${p.client_name || ""} ${p.asset_type || ""} ${p.youtube_video_id || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [allProjects, filters]);

  // Count summary by status (over filtered set)
  const statusSummary = useMemo(() => {
    const out = {};
    for (const s of STATUSES) out[s] = 0;
    for (const p of filtered) out[p.status] = (out[p.status] || 0) + 1;
    return out;
  }, [filtered]);

  const editorMap = useMemo(() => {
    const m = {};
    for (const e of editors) m[e.id] = e;
    return m;
  }, [editors]);

  const toggleSelected = (id) => {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const selectPageAll = (visible) => {
    setSelected((s) => {
      const next = new Set(s);
      const allSelected = visible.every((p) => next.has(p.id));
      if (allSelected) for (const p of visible) next.delete(p.id);
      else for (const p of visible) next.add(p.id);
      return next;
    });
  };

  const bulkUpdate = async (newStatus) => {
    if (selected.size === 0) return;
    if (!window.confirm(`Move ${selected.size} project(s) to "${newStatus}"?`)) return;
    setBusyBulk(true);
    try {
      const ids = [...selected];
      const results = await Promise.allSettled(ids.map((id) =>
        authedFetch(`/admin/agency/projects/${encodeURIComponent(id)}`, {
          method: "PATCH",
          body: JSON.stringify({ status: newStatus }),
        })
      ));
      const failed = results.filter((r) => r.status === "rejected" || (r.value && !r.value.ok)).length;
      if (failed > 0) alert(`${failed} of ${ids.length} updates failed. Reloading…`);
      setSelected(new Set());
      await loadProjects();
    } finally {
      setBusyBulk(false);
    }
  };

  // Pagination over the filtered set (list view only)
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="p-4 md:p-6 max-w-[1500px] mx-auto">
      <header className="mb-4 flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="text-kicker text-[var(--orange)]">Pipeline</div>
          <h1 className="text-display-md font-bold mt-1">Projects</h1>
          <div className="text-xs text-neutral-500 mt-1">
            {filtered.length} of {allProjects.length} · across {clients.length} clients
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="rounded-md border border-neutral-200 dark:border-neutral-800 flex p-0.5">
            <button
              onClick={() => setViewMode("kanban")}
              className={`px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1 ${view === "kanban" ? "bg-[var(--orange)] text-white" : "text-neutral-500 hover:text-neutral-700"}`}
            >
              <LayoutGrid size={12} /> Kanban
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1 ${view === "list" ? "bg-[var(--orange)] text-white" : "text-neutral-500 hover:text-neutral-700"}`}
            >
              <List size={12} /> List
            </button>
          </div>
          <button
            onClick={() => loadProjects()}
            disabled={loading}
            className="text-xs px-2 py-1.5 rounded-md border border-neutral-200 dark:border-neutral-800 text-neutral-500 disabled:opacity-50 inline-flex items-center gap-1"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
      </header>

      {/* Filters */}
      <section className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-[var(--surface-elev)] p-3 mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={13} className="text-neutral-500" />
          <select
            value={filters.clientId}
            onChange={(e) => setFilter("clientId", e.target.value)}
            className="text-xs bg-[var(--surface)] border border-neutral-200 dark:border-neutral-800 rounded px-2 py-1.5"
          >
            <option value="">All clients</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select
            value={filters.status}
            onChange={(e) => setFilter("status", e.target.value)}
            className="text-xs bg-[var(--surface)] border border-neutral-200 dark:border-neutral-800 rounded px-2 py-1.5"
          >
            <option value="">All statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select
            value={filters.asset}
            onChange={(e) => setFilter("asset", e.target.value)}
            className="text-xs bg-[var(--surface)] border border-neutral-200 dark:border-neutral-800 rounded px-2 py-1.5"
          >
            <option value="">All asset types</option>
            {ASSET_TYPES.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <select
            value={filters.editorId}
            onChange={(e) => setFilter("editorId", e.target.value)}
            className="text-xs bg-[var(--surface)] border border-neutral-200 dark:border-neutral-800 rounded px-2 py-1.5"
          >
            <option value="">Any editor</option>
            <option value="__none__" disabled>—</option>
            {editors.map((e) => <option key={e.id} value={e.id}>{e.name}{e.compensation_type === "salary" ? " · salary" : ""}</option>)}
          </select>
          <input
            type="search"
            value={filters.q}
            onChange={(e) => setFilter("q", e.target.value)}
            placeholder="Search title / video id…"
            className="text-xs bg-[var(--surface)] border border-neutral-200 dark:border-neutral-800 rounded px-2 py-1.5 flex-1 min-w-[180px]"
          />
          {(filters.clientId || filters.status || filters.asset || filters.editorId || filters.q) && (
            <button onClick={clearFilters} className="text-xs px-2 py-1.5 rounded text-neutral-500 hover:text-neutral-700 underline">
              Clear
            </button>
          )}
        </div>

        {/* Status pill summary */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setFilter("status", filters.status === s ? "" : s)}
              className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider ${STATUS_STYLE[s]} ${
                filters.status === s ? "ring-2 ring-[var(--orange)]" : "hover:opacity-80"
              }`}
            >
              {s} · {statusSummary[s] || 0}
            </button>
          ))}
        </div>
      </section>

      {/* Bulk action bar (list view) */}
      {view === "list" && selected.size > 0 && (
        <div className="rounded-xl border border-[var(--orange)]/40 bg-[var(--orange)]/5 p-3 mb-3 flex items-center justify-between flex-wrap gap-2">
          <div className="text-xs">
            <strong>{selected.size}</strong> selected
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => bulkUpdate("paid")} disabled={busyBulk} className="text-xs px-3 py-1.5 rounded-md bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25 disabled:opacity-50 inline-flex items-center gap-1"><IndianRupee size={11} /> Mark paid</button>
            <button onClick={() => bulkUpdate("posted")} disabled={busyBulk} className="text-xs px-3 py-1.5 rounded-md bg-green-500/15 text-green-600 hover:bg-green-500/25 disabled:opacity-50 inline-flex items-center gap-1"><Check size={11} /> Mark posted</button>
            <button onClick={() => bulkUpdate("added-to-website")} disabled={busyBulk} className="text-xs px-3 py-1.5 rounded-md bg-purple-500/15 text-purple-600 hover:bg-purple-500/25 disabled:opacity-50">→ On website</button>
            <button onClick={() => bulkUpdate("archive")} disabled={busyBulk} className="text-xs px-3 py-1.5 rounded-md bg-neutral-200 dark:bg-neutral-800 text-neutral-600 hover:bg-neutral-300 disabled:opacity-50 inline-flex items-center gap-1"><Archive size={11} /> Archive</button>
            <button onClick={() => setSelected(new Set())} className="text-xs px-2 py-1.5 rounded text-neutral-500 hover:text-neutral-700 underline">Clear</button>
          </div>
        </div>
      )}

      {/* Body */}
      {view === "kanban" ? (
        <PipelineKanban
          clients={clients}
          onChange={loadProjects}
        />
      ) : (
        <section className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-[var(--surface-elev)] overflow-hidden">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-neutral-500">
              {loading ? "Loading…" : "No projects match the current filters."}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-[var(--surface)] border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 uppercase tracking-wider">
                    <tr>
                      <th className="px-3 py-2 text-left w-8">
                        <input
                          type="checkbox"
                          checked={pageRows.length > 0 && pageRows.every((p) => selected.has(p.id))}
                          onChange={() => selectPageAll(pageRows)}
                          className="cursor-pointer"
                        />
                      </th>
                      <th className="px-3 py-2 text-left">Title</th>
                      <th className="px-3 py-2 text-left">Client</th>
                      <th className="px-3 py-2 text-left">Type</th>
                      <th className="px-3 py-2 text-left">Status</th>
                      <th className="px-3 py-2 text-left">Editor</th>
                      <th className="px-3 py-2 text-right">Pay</th>
                      <th className="px-3 py-2 text-left">Updated</th>
                      <th className="px-3 py-2 text-left">Link</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((p) => {
                      const ed = editorMap[p.assigned_editor_id];
                      return (
                        <tr key={p.id} className={`border-b border-neutral-100 dark:border-neutral-900 hover:bg-[var(--surface-alt)] ${selected.has(p.id) ? "bg-[var(--orange)]/5" : ""}`}>
                          <td className="px-3 py-2">
                            <input
                              type="checkbox"
                              checked={selected.has(p.id)}
                              onChange={() => toggleSelected(p.id)}
                              className="cursor-pointer"
                            />
                          </td>
                          <td className="px-3 py-2 max-w-[300px]">
                            <div className="font-semibold truncate" title={p.title}>{p.title}</div>
                            {p.due_date && <div className="text-[10px] text-[var(--orange)]">due {fmtDate(p.due_date)}</div>}
                          </td>
                          <td className="px-3 py-2">
                            {p.client_id ? (
                              <Link to={`/dashboard/clients/${encodeURIComponent(p.client_id)}`} className="hover:text-[var(--orange)] hover:underline">
                                {p.client_name || p.client_id}
                              </Link>
                            ) : (p.client_name || "—")}
                          </td>
                          <td className="px-3 py-2 text-neutral-500">{p.asset_type || "—"}</td>
                          <td className="px-3 py-2">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider ${STATUS_STYLE[p.status] || "bg-neutral-100 text-neutral-500"}`}>
                              {p.status || "—"}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            {ed ? (
                              <span>{ed.name}{ed.compensation_type === "salary" && <span className="text-[10px] text-blue-500"> · salary</span>}</span>
                            ) : <span className="text-neutral-400">—</span>}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {p.editor_payment_inr > 0 ? <span className="text-emerald-600 font-semibold">{fmtINR(p.editor_payment_inr)}</span> : <span className="text-neutral-400">—</span>}
                          </td>
                          <td className="px-3 py-2 text-neutral-500">{fmtDate(p.updated_at)}</td>
                          <td className="px-3 py-2">
                            {p.youtube_video_id && (
                              <a href={`https://youtu.be/${p.youtube_video_id}`} target="_blank" rel="noopener noreferrer" className="text-[var(--orange)] hover:underline inline-flex items-center gap-1">
                                YT <ExternalLink size={10} />
                              </a>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between p-3 border-t border-neutral-200 dark:border-neutral-800 text-xs">
                  <div className="text-neutral-500">
                    Page {page} of {totalPages} · {filtered.length} total
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage(1)}
                      disabled={page === 1}
                      className="px-2 py-1 rounded border border-neutral-200 dark:border-neutral-800 disabled:opacity-40"
                    >« First</button>
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-2 py-1 rounded border border-neutral-200 dark:border-neutral-800 disabled:opacity-40"
                    >‹ Prev</button>
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="px-2 py-1 rounded border border-neutral-200 dark:border-neutral-800 disabled:opacity-40"
                    >Next ›</button>
                    <button
                      onClick={() => setPage(totalPages)}
                      disabled={page === totalPages}
                      className="px-2 py-1 rounded border border-neutral-200 dark:border-neutral-800 disabled:opacity-40"
                    >Last »</button>
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      )}
    </div>
  );
}
