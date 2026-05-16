/**
 * PipelineKanban — kanban view of agency projects.
 * Lives inside /dashboard/ops as a section.
 *
 * Status ladder (left → right):
 *   planned → started → in-progress → completed → paid → posted → added-to-website → archive
 *
 * Drag-and-drop: native HTML5 DnD. Drop a card on a column → PATCH /admin/agency/projects/:id
 * with the new status. Optimistic update with rollback on failure.
 *
 * Click a card → side modal (status, editor, payment).
 *
 * Buttons:
 *   [+ New project]      → modal to create one
 *   [Auto-import recent] → POSTs to /admin/agency/projects/auto-import-pulse
 */
import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { Plus, RefreshCw, Download, Target, X, ExternalLink, GripVertical, Maximize2 } from "lucide-react";
import { Link } from "react-router-dom";
import { AUTH_BASE } from "../../config/constants";
import { getAccessToken } from "../../utils/tokenStore";

const COLUMNS = [
  { key: "planned",          label: "Planned",          color: "border-neutral-300 dark:border-neutral-700",  accent: "bg-neutral-500/10 text-neutral-600" },
  { key: "started",          label: "Started",          color: "border-blue-500/30",                          accent: "bg-blue-500/10 text-blue-500" },
  { key: "in-progress",      label: "In Progress",      color: "border-orange-500/30",                        accent: "bg-orange-500/10 text-orange-500" },
  { key: "completed",        label: "Completed",        color: "border-yellow-500/40",                        accent: "bg-yellow-500/10 text-yellow-600" },
  { key: "paid",             label: "Paid",             color: "border-emerald-500/40",                       accent: "bg-emerald-500/10 text-emerald-600" },
  { key: "posted",           label: "Posted",           color: "border-green-500/40",                         accent: "bg-green-500/10 text-green-600" },
  { key: "added-to-website", label: "On Website",       color: "border-purple-500/40",                        accent: "bg-purple-500/10 text-purple-600" },
  { key: "archive",          label: "Archive",          color: "border-neutral-200 dark:border-neutral-800 opacity-60", accent: "bg-neutral-200/50 text-neutral-500" },
];

const STATUSES = COLUMNS.map((c) => c.key);

const fmtDate = (s) => {
  if (!s) return null;
  try { return new Date(s).toLocaleDateString("en-IN", { month: "short", day: "numeric" }); }
  catch { return null; }
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

function CardModal({ project, clients, editors, onClose, onSaved }) {
  const [status, setStatus] = useState(project.status || "planned");
  const [editorId, setEditorId] = useState(project.assigned_editor_id || "");
  const [payment, setPayment] = useState(project.editor_payment_inr || 0);
  const [clientCharge, setClientCharge] = useState(project.client_charge_inr || 0);
  const [dueDate, setDueDate] = useState(project.due_date ? String(project.due_date).slice(0, 10) : "");
  const [busy, setBusy] = useState(false);

  const selectedEditor = editors.find((e) => e.id === editorId);
  const isFreelance = selectedEditor && selectedEditor.compensation_type !== "salary";

  React.useEffect(() => {
    if (selectedEditor && selectedEditor.compensation_type !== "salary" && (project.editor_payment_inr === 0 || project.editor_payment_inr === null)) {
      setPayment(selectedEditor.payment_rate_inr || 0);
    }
    if (selectedEditor && selectedEditor.compensation_type === "salary") {
      setPayment(0);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editorId]);

  const save = async () => {
    setBusy(true);
    try {
      const body = {
        status,
        assigned_editor_id: editorId || null,
        editor_payment_inr: isFreelance ? parseInt(payment || 0, 10) : 0,
        client_charge_inr: parseInt(clientCharge || 0, 10),
        due_date: dueDate || null,
      };
      const res = await authedFetch(`/admin/agency/projects/${encodeURIComponent(project.id)}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`API ${res.status}`);
      onSaved();
      onClose();
    } catch (e) {
      console.error(e);
      alert("Failed to save: " + e.message);
    } finally {
      setBusy(false);
    }
  };

  const clientName = clients.find((c) => c.id === project.client_id)?.name || project.client_name || project.client_id;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="bg-[var(--surface-elev)] rounded-xl border border-neutral-200 dark:border-neutral-800 max-w-lg w-full p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-wider text-neutral-500">{clientName} · {project.asset_type || "—"}</div>
            <h3 className="text-lg font-bold mt-1 break-words">{project.title}</h3>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-700"><X size={18} /></button>
        </div>
        {project.youtube_video_id && (
          <a
            href={`https://youtube.com/watch?v=${project.youtube_video_id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-[var(--orange)] hover:underline mb-3"
          >
            <ExternalLink size={12} /> youtu.be/{project.youtube_video_id}
          </a>
        )}
        <div className="space-y-3">
          <div>
            <label className="text-xs text-neutral-500 uppercase tracking-wider mb-1 block">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full bg-[var(--surface)] border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 py-2 text-sm"
            >
              {COLUMNS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-neutral-500 uppercase tracking-wider mb-1 block">Assigned editor</label>
            <select
              value={editorId}
              onChange={(e) => setEditorId(e.target.value)}
              className="w-full bg-[var(--surface)] border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">— Unassigned —</option>
              {editors.map((ed) => (
                <option key={ed.id} value={ed.id}>
                  {ed.name}{ed.role ? ` · ${ed.role}` : ""}{ed.compensation_type === "salary" ? " · salary" : " · freelance"}
                </option>
              ))}
            </select>
            {editors.length === 0 && (
              <p className="text-xs text-neutral-500 mt-1">No editors yet — add one from the cockpit's Team panel.</p>
            )}
          </div>
          {isFreelance && (
            <div>
              <label className="text-xs text-neutral-500 uppercase tracking-wider mb-1 block">
                Payment for this project (₹)
              </label>
              <input
                type="number"
                value={payment}
                onChange={(e) => setPayment(e.target.value)}
                placeholder={`default: ${selectedEditor?.payment_rate_inr || 0}`}
                className="w-full bg-[var(--surface)] border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 py-2 text-sm"
              />
              <p className="text-[10px] text-neutral-500 mt-1">
                Freelance · gets paid this amount when project is delivered. Logged for invoicing.
              </p>
            </div>
          )}
          {selectedEditor && selectedEditor.compensation_type === "salary" && (
            <div className="text-xs bg-blue-500/10 text-blue-500 px-3 py-2 rounded">
              <strong>Salaried editor</strong> — no per-project payment. Covered by ₹{(selectedEditor.monthly_salary_inr || 0).toLocaleString("en-IN")}/month.
            </div>
          )}

          {/* Client charge — what we INVOICE the client for this project */}
          <div>
            <label className="text-xs text-neutral-500 uppercase tracking-wider mb-1 block">
              Client charge (₹) <span className="text-neutral-400 normal-case">— what we invoice the client</span>
            </label>
            <input
              type="number"
              value={clientCharge}
              onChange={(e) => setClientCharge(e.target.value)}
              placeholder="0"
              className="w-full bg-[var(--surface)] border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 py-2 text-sm"
            />
            {/* Live margin readout. Positive = profit, negative = loss. */}
            {(parseInt(clientCharge || 0, 10) > 0 || parseInt(payment || 0, 10) > 0) && (() => {
              const charge = parseInt(clientCharge || 0, 10);
              const cost = isFreelance ? parseInt(payment || 0, 10) : 0;
              const margin = charge - cost;
              const marginPct = charge > 0 ? Math.round((margin / charge) * 100) : 0;
              return (
                <p className={`text-[10px] mt-1 ${margin > 0 ? "text-emerald-600" : margin < 0 ? "text-red-500" : "text-neutral-500"}`}>
                  Margin: ₹{margin.toLocaleString("en-IN")} ({marginPct}%)
                  {!isFreelance && cost === 0 && " · salaried editor, no per-project cost"}
                </p>
              );
            })()}
          </div>

          {/* Due date — editable */}
          <div>
            <label className="text-xs text-neutral-500 uppercase tracking-wider mb-1 block">Due date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full bg-[var(--surface)] border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          {project.brief_md && (
            <div className="text-sm bg-neutral-100 dark:bg-neutral-900 rounded-lg p-3 max-h-32 overflow-y-auto whitespace-pre-wrap">{project.brief_md}</div>
          )}
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="text-sm px-4 py-2 rounded-lg border border-neutral-200 dark:border-neutral-800">Cancel</button>
          <button
            onClick={save}
            disabled={busy}
            className="text-sm px-4 py-2 rounded-lg bg-[var(--orange)] text-white font-bold disabled:opacity-50"
          >
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

function NewProjectModal({ clients, onClose, onCreated }) {
  const [form, setForm] = useState({
    client_id: clients[0]?.id || "",
    title: "",
    asset_type: "long-form",
    status: "planned",
    due_date: "",
    client_charge_inr: 0,
  });
  const [busy, setBusy] = useState(false);
  const update = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const save = async () => {
    if (!form.client_id || !form.title) return;
    setBusy(true);
    try {
      const res = await authedFetch(`/admin/agency/projects`, {
        method: "POST",
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error(`API ${res.status}`);
      onCreated();
      onClose();
    } catch (e) {
      console.error(e);
      alert("Failed: " + e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="bg-[var(--surface-elev)] rounded-xl border border-neutral-200 dark:border-neutral-800 max-w-lg w-full p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-lg font-bold">New project</h3>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-700"><X size={18} /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-neutral-500 uppercase tracking-wider mb-1 block">Client</label>
            <select value={form.client_id} onChange={update("client_id")} className="w-full bg-[var(--surface)] border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 py-2 text-sm">
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-neutral-500 uppercase tracking-wider mb-1 block">Title</label>
            <input value={form.title} onChange={update("title")} placeholder="e.g. AiSH 1v1 TDM Custom Room — May 10 stream" className="w-full bg-[var(--surface)] border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-neutral-500 uppercase tracking-wider mb-1 block">Asset type</label>
              <select value={form.asset_type} onChange={update("asset_type")} className="w-full bg-[var(--surface)] border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 py-2 text-sm">
                <option value="long-form">Long-form</option>
                <option value="short">Short</option>
                <option value="reel">IG Reel</option>
                <option value="live">Live</option>
                <option value="community">Community post</option>
                <option value="thumbnail-only">Thumbnail only</option>
                <option value="carousel">IG Carousel</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-neutral-500 uppercase tracking-wider mb-1 block">Status</label>
              <select value={form.status} onChange={update("status")} className="w-full bg-[var(--surface)] border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 py-2 text-sm">
                {COLUMNS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-neutral-500 uppercase tracking-wider mb-1 block">Due date (optional)</label>
              <input type="date" value={form.due_date} onChange={update("due_date")} className="w-full bg-[var(--surface)] border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs text-neutral-500 uppercase tracking-wider mb-1 block">Client charge ₹ (optional)</label>
              <input type="number" value={form.client_charge_inr} onChange={update("client_charge_inr")} placeholder="0" className="w-full bg-[var(--surface)] border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="text-sm px-4 py-2 rounded-lg border border-neutral-200 dark:border-neutral-800">Cancel</button>
          <button onClick={save} disabled={busy || !form.title} className="text-sm px-4 py-2 rounded-lg bg-[var(--orange)] text-white font-bold disabled:opacity-50">
            {busy ? "Creating…" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PipelineKanban({ clients = [], onChange }) {
  const [grouped, setGrouped] = useState({});
  const [editors, setEditors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openCard, setOpenCard] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dragOverCol, setDragOverCol] = useState(null);
  const draggingRef = useRef(null);

  const totalProjects = useMemo(() =>
    Object.values(grouped).reduce((sum, arr) => sum + (arr?.length || 0), 0),
    [grouped]
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [projRes, edRes] = await Promise.all([
        authedFetch(`/admin/agency/projects/by-status`),
        authedFetch(`/admin/agency/editors`),
      ]);
      if (projRes.ok) {
        const json = await projRes.json();
        setGrouped(json.grouped || {});
      }
      if (edRes.ok) {
        const json = await edRes.json();
        setEditors(json.editors || []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const onAutoImport = async () => {
    if (!window.confirm("Import last 30 days of YT uploads as projects (status=posted)? Skips ones already imported.")) return;
    setBusy(true);
    try {
      const res = await authedFetch(`/admin/agency/projects/auto-import-pulse`, {
        method: "POST",
        body: JSON.stringify({ days: 30 }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `API ${res.status}`);
      alert(`Imported ${json.imported} projects (skipped ${json.skipped_existing} already-imported, ${json.total_pulses} total pulses).`);
      await refresh();
      onChange?.();
    } catch (e) {
      alert("Auto-import failed: " + e.message);
    } finally {
      setBusy(false);
    }
  };

  // ---------- drag-and-drop ----------
  const onDragStart = (project) => (e) => {
    draggingRef.current = project;
    e.dataTransfer.effectAllowed = "move";
    try { e.dataTransfer.setData("text/plain", project.id); } catch {}
  };
  const onDragEnd = () => {
    draggingRef.current = null;
    setDragOverCol(null);
  };
  const onColDragOver = (colKey) => (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverCol !== colKey) setDragOverCol(colKey);
  };
  const onColDragLeave = (colKey) => () => {
    if (dragOverCol === colKey) setDragOverCol(null);
  };
  const onColDrop = (newStatus) => async (e) => {
    e.preventDefault();
    setDragOverCol(null);
    const project = draggingRef.current;
    draggingRef.current = null;
    if (!project) return;
    if (project.status === newStatus) return;

    // optimistic update
    const oldStatus = project.status;
    setGrouped((g) => {
      const next = { ...g };
      next[oldStatus] = (next[oldStatus] || []).filter((p) => p.id !== project.id);
      next[newStatus] = [...(next[newStatus] || []), { ...project, status: newStatus }];
      return next;
    });

    try {
      const res = await authedFetch(`/admin/agency/projects/${encodeURIComponent(project.id)}`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error(`API ${res.status}`);
      onChange?.();
    } catch (err) {
      console.error("Drag drop save failed:", err);
      // rollback
      setGrouped((g) => {
        const next = { ...g };
        next[newStatus] = (next[newStatus] || []).filter((p) => p.id !== project.id);
        next[oldStatus] = [...(next[oldStatus] || []), project];
        return next;
      });
      alert("Couldn't save status change: " + err.message);
    }
  };

  return (
    <section className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 bg-[var(--surface-elev)]">
      <header className="flex items-center justify-between mb-3 pb-2 border-b border-neutral-100 dark:border-neutral-900 flex-wrap gap-2">
        <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
          <Target size={15} className="text-[var(--orange)]" />
          Project Pipeline
          <span className="text-xs text-neutral-500 font-normal">· {totalProjects} active · drag cards between columns</span>
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={refresh}
            disabled={loading}
            className="text-xs px-2 py-1.5 rounded-md border border-neutral-200 dark:border-neutral-800 text-neutral-500 hover:text-neutral-700 disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={onAutoImport}
            disabled={busy}
            className="text-xs px-3 py-1.5 rounded-md border border-neutral-200 dark:border-neutral-800 hover:bg-[var(--surface-alt)] flex items-center gap-1 disabled:opacity-50"
            title="Import last 30 days of YouTube uploads as projects"
          >
            <Download size={12} /> Auto-import recent
          </button>
          <button
            onClick={() => setShowNew(true)}
            className="text-xs px-3 py-1.5 rounded-md bg-[var(--orange)] text-white font-bold hover:opacity-90 flex items-center gap-1"
          >
            <Plus size={12} /> New
          </button>
          <Link
            to="/dashboard/projects"
            className="text-xs px-2 py-1.5 rounded-md border border-neutral-200 dark:border-neutral-800 text-neutral-500 hover:text-neutral-700 inline-flex items-center gap-1"
            title="Open the full Projects page (filters, list view, bulk actions)"
          >
            <Maximize2 size={12} /> Full page
          </Link>
        </div>
      </header>

      {totalProjects === 0 && !loading && (
        <div className="text-center py-8 text-sm text-neutral-500">
          No projects yet. Click <strong>Auto-import recent</strong> above to populate from YouTube uploads, or <strong>+ New</strong> to create manually.
        </div>
      )}

      {totalProjects > 0 && (
        <div className="overflow-x-auto pb-2">
          <div className="flex gap-3 min-w-fit">
            {COLUMNS.map((col) => {
              const cards = grouped[col.key] || [];
              const isOver = dragOverCol === col.key;
              return (
                <div
                  key={col.key}
                  onDragOver={onColDragOver(col.key)}
                  onDragLeave={onColDragLeave(col.key)}
                  onDrop={onColDrop(col.key)}
                  className={`rounded-lg border-2 ${col.color} p-2 w-[220px] flex-shrink-0 transition-colors ${
                    isOver ? "bg-[var(--orange)]/10 border-[var(--orange)]" : ""
                  }`}
                >
                  <div className="flex items-center justify-between mb-2 px-1">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400">{col.label}</div>
                    <div className={`text-[10px] tabular-nums px-1.5 py-0.5 rounded ${col.accent}`}>{cards.length}</div>
                  </div>
                  <div className="space-y-1.5 max-h-[600px] overflow-y-auto pr-1 min-h-[120px]">
                    {cards.map((p) => {
                      const clientName = clients.find((c) => c.id === p.client_id)?.name || p.client_name || "—";
                      return (
                        <div
                          key={p.id}
                          draggable
                          onDragStart={onDragStart(p)}
                          onDragEnd={onDragEnd}
                          onClick={() => setOpenCard(p)}
                          className="cursor-grab active:cursor-grabbing bg-[var(--surface)] hover:bg-[var(--surface-alt)] rounded-md border border-neutral-100 dark:border-neutral-900 p-2 transition group"
                        >
                          <div className="flex items-start gap-1">
                            <GripVertical size={12} className="text-neutral-400 mt-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition" />
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-semibold leading-snug line-clamp-2 break-words">{p.title}</div>
                              <div className="flex items-center justify-between mt-1.5">
                                <div className="text-[10px] text-neutral-500 truncate">{clientName}</div>
                                {p.asset_type && (
                                  <div className="text-[9px] uppercase tracking-wider px-1 py-0.5 rounded bg-neutral-100 dark:bg-neutral-900 text-neutral-500">{p.asset_type}</div>
                                )}
                              </div>
                              {p.editor_payment_inr > 0 && (
                                <div className="text-[10px] text-emerald-600 mt-0.5">₹{p.editor_payment_inr.toLocaleString("en-IN")}</div>
                              )}
                              {p.due_date && (
                                <div className="text-[9px] text-[var(--orange)] mt-1">due {fmtDate(p.due_date)}</div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {cards.length === 0 && (
                      <div className="text-[10px] text-neutral-400 italic text-center py-4">drop here</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {openCard && <CardModal project={openCard} clients={clients} editors={editors} onClose={() => setOpenCard(null)} onSaved={() => { refresh(); onChange?.(); }} />}
      {showNew && <NewProjectModal clients={clients} onClose={() => setShowNew(false)} onCreated={() => { refresh(); onChange?.(); }} />}
    </section>
  );
}
