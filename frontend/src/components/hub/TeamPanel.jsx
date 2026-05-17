/**
 * TeamPanel — editor roster section inside /dashboard/ops cockpit.
 *
 * Lists all editors. Click "+ Add" to add an editor. Click row → modal to
 * edit details. Soft-delete via "Remove" in the edit modal.
 *
 * Editors are then selectable in PipelineKanban's CardModal as
 * "Assigned editor" — letting you delegate work per project.
 */
import React, { useEffect, useState, useCallback } from "react";
import { Users2, Plus, X, Edit3, Trash2 } from "lucide-react";
import { AUTH_BASE } from "../../config/constants";
import { getAccessToken } from "../../utils/tokenStore";

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

const ROLES = ["editor", "thumbnail-designer", "gfx", "sm-manager", "va", "admin"];
const PAYMENT_PER = ["video", "short", "thumbnail", "monthly", "hourly"];

function EditorModal({ editor, onClose, onSaved }) {
  const isNew = !editor;
  const [form, setForm] = useState(
    editor || {
      name: "",
      email: "",
      phone: "",
      role: "editor",
      compensation_type: "freelance",
      monthly_salary_inr: 0,
      payment_rate_inr: 0,
      payment_per: "video",
      notes: "",
    }
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const set = (k) => (e) => {
    const v = e.target.type === "number" ? parseInt(e.target.value || 0, 10) : e.target.value;
    setForm({ ...form, [k]: v });
  };

  const save = async () => {
    if (!form.name?.trim()) { setError("Name required"); return; }
    setBusy(true);
    setError(null);
    try {
      const path = isNew ? "/admin/agency/editors" : `/admin/agency/editors/${encodeURIComponent(editor.id)}`;
      const method = isNew ? "POST" : "PATCH";
      const res = await authedFetch(path, { method, body: JSON.stringify(form) });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `API ${res.status}`);
      }
      onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!editor || !window.confirm(`Remove ${editor.name} from the roster?`)) return;
    setBusy(true);
    try {
      const res = await authedFetch(`/admin/agency/editors/${encodeURIComponent(editor.id)}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`API ${res.status}`);
      onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="bg-[var(--surface-elev)] rounded-xl border border-neutral-200 dark:border-neutral-800 max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-bold">{isNew ? "Add team member" : "Edit team member"}</h3>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-700"><X size={18} /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-neutral-500 uppercase tracking-wider mb-1 block">Name *</label>
            <input value={form.name || ""} onChange={set("name")} placeholder="e.g. Rohit Sharma" className="w-full bg-[var(--surface)] border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-neutral-500 uppercase tracking-wider mb-1 block">Email</label>
              <input value={form.email || ""} onChange={set("email")} placeholder="rohit@gmail.com" className="w-full bg-[var(--surface)] border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs text-neutral-500 uppercase tracking-wider mb-1 block">Phone</label>
              <input value={form.phone || ""} onChange={set("phone")} placeholder="+91 ..." className="w-full bg-[var(--surface)] border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="text-xs text-neutral-500 uppercase tracking-wider mb-1 block">Role</label>
            <select value={form.role || "editor"} onChange={set("role")} className="w-full bg-[var(--surface)] border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 py-2 text-sm">
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          {/* Compensation type — freelance (per project) or salary (monthly) */}
          <div>
            <label className="text-xs text-neutral-500 uppercase tracking-wider mb-1 block">Compensation</label>
            <div className="flex gap-2">
              <label className={`flex-1 cursor-pointer rounded-lg border-2 p-2 text-center text-sm font-bold transition ${
                form.compensation_type === "freelance"
                  ? "border-[var(--orange)] bg-[var(--orange)]/10 text-[var(--orange)]"
                  : "border-neutral-200 dark:border-neutral-800 text-neutral-500 hover:bg-[var(--surface-alt)]"
              }`}>
                <input type="radio" name="comp" value="freelance" checked={form.compensation_type === "freelance"} onChange={set("compensation_type")} className="hidden" />
                Freelance
                <div className="text-[10px] font-normal mt-0.5">paid per project</div>
              </label>
              <label className={`flex-1 cursor-pointer rounded-lg border-2 p-2 text-center text-sm font-bold transition ${
                form.compensation_type === "salary"
                  ? "border-[var(--orange)] bg-[var(--orange)]/10 text-[var(--orange)]"
                  : "border-neutral-200 dark:border-neutral-800 text-neutral-500 hover:bg-[var(--surface-alt)]"
              }`}>
                <input type="radio" name="comp" value="salary" checked={form.compensation_type === "salary"} onChange={set("compensation_type")} className="hidden" />
                Salary
                <div className="text-[10px] font-normal mt-0.5">monthly fixed</div>
              </label>
            </div>
          </div>

          {form.compensation_type === "salary" ? (
            <div>
              <label className="text-xs text-neutral-500 uppercase tracking-wider mb-1 block">Monthly salary (₹)</label>
              <input type="number" value={form.monthly_salary_inr || 0} onChange={set("monthly_salary_inr")} placeholder="e.g. 25000" className="w-full bg-[var(--surface)] border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 py-2 text-sm" />
              <p className="text-[10px] text-neutral-500 mt-1">Salaried editors don't get per-project payments. Whatever they handle is covered by this monthly amount.</p>
            </div>
          ) : (
            <div>
              <label className="text-xs text-neutral-500 uppercase tracking-wider mb-1 block">Default rate (₹) — optional hint</label>
              <div className="grid grid-cols-2 gap-3">
                <input type="number" value={form.payment_rate_inr || 0} onChange={set("payment_rate_inr")} placeholder="e.g. 1500" className="bg-[var(--surface)] border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 py-2 text-sm" />
                <select value={form.payment_per || "video"} onChange={set("payment_per")} className="bg-[var(--surface)] border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 py-2 text-sm">
                  {PAYMENT_PER.map((p) => <option key={p} value={p}>per {p}</option>)}
                </select>
              </div>
              <p className="text-[10px] text-neutral-500 mt-1">Just a default hint — actual project payment is set when assigning to each project.</p>
            </div>
          )}
          <div>
            <label className="text-xs text-neutral-500 uppercase tracking-wider mb-1 block">
              Discord User ID <span className="text-neutral-400 normal-case">(optional — for @-mentions in weekly summary)</span>
            </label>
            <input
              value={form.discord_user_id || ""}
              onChange={set("discord_user_id")}
              placeholder="e.g. 282859044593598464"
              className="w-full bg-[var(--surface)] border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 py-2 text-sm font-mono"
            />
            <p className="text-[10px] text-neutral-500 mt-1">
              In Discord: User Settings → Advanced → Developer Mode ON, then right-click the member → Copy User ID. Numeric.
            </p>
          </div>

          <div>
            <label className="text-xs text-neutral-500 uppercase tracking-wider mb-1 block">Notes</label>
            <textarea value={form.notes || ""} onChange={set("notes")} rows={2} placeholder="Specialties, availability, etc." className="w-full bg-[var(--surface)] border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 py-2 text-sm" />
          </div>
          {error && <div className="text-xs text-red-500 bg-red-500/10 px-3 py-2 rounded">{error}</div>}
        </div>
        <div className="flex justify-between gap-2 mt-4">
          <div>
            {!isNew && (
              <button onClick={remove} disabled={busy} className="text-xs px-3 py-2 rounded-lg text-red-500 hover:bg-red-500/10 flex items-center gap-1 disabled:opacity-50">
                <Trash2 size={12} /> Remove
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="text-sm px-4 py-2 rounded-lg border border-neutral-200 dark:border-neutral-800">Cancel</button>
            <button onClick={save} disabled={busy || !form.name?.trim()} className="text-sm px-4 py-2 rounded-lg bg-[var(--orange)] text-white font-bold disabled:opacity-50">
              {busy ? "Saving…" : isNew ? "Add" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TeamPanel({ onChange }) {
  const [editors, setEditors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openEditor, setOpenEditor] = useState(null); // null|null=closed, false=new, object=edit
  const [showNew, setShowNew] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authedFetch(`/admin/agency/editors`);
      if (res.ok) {
        const json = await res.json();
        setEditors(json.editors || []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const onSaved = () => {
    setOpenEditor(null);
    setShowNew(false);
    refresh();
    onChange?.();
  };

  return (
    <section className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 bg-[var(--surface-elev)]">
      <header className="flex items-center justify-between mb-3 pb-2 border-b border-neutral-100 dark:border-neutral-900">
        <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
          <Users2 size={15} className="text-[var(--orange)]" />
          Team Roster
          <span className="text-xs text-neutral-500 font-normal">· {editors.length}</span>
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={async () => {
              if (!confirm("Back-fill missing slugs + publish flags for every active editor? This makes their /editor/public/<slug> URL live.")) return;
              try {
                const res = await authedFetch(`/admin/agency/editors/backfill-slugs`, { method: "POST" });
                const j = await res.json().catch(() => ({}));
                if (!res.ok) { alert(`Failed: ${j.error || res.status}`); return; }
                const sample = (j.updates || []).slice(0, 6).map((u) => `${u.name || u.email} → ${u.slug || "(slug already set)"}`).join("\n");
                alert(`Scanned ${j.scanned} editors. Updated ${j.updated}.\n\n${sample || "(no changes needed)"}\n\nPublic URL pattern: /editor/public/<slug>`);
                refresh();
              } catch (e) { alert("Network error: " + e.message); }
            }}
            className="text-xs px-3 py-1.5 rounded-md border border-neutral-300 dark:border-neutral-700 hover:bg-[var(--surface-alt)]"
            title="One-shot: set slug + public_enabled for any editor missing them"
          >
            Back-fill slugs
          </button>
          <button
            onClick={() => setShowNew(true)}
            className="text-xs px-3 py-1.5 rounded-md bg-[var(--orange)] text-white font-bold hover:opacity-90 flex items-center gap-1"
          >
            <Plus size={12} /> Add
          </button>
        </div>
      </header>

      {editors.length === 0 ? (
        <div className="text-sm text-neutral-500 py-6 text-center">
          No editors yet. Click <strong>Add</strong> above to invite your first team member.
          <br />
          Once added, you can assign editors per project from the kanban.
        </div>
      ) : (
        <ul className="space-y-1.5">
          {editors.map((ed) => (
            <li key={ed.id}>
              <button
                onClick={() => setOpenEditor(ed)}
                className="w-full text-left flex items-center justify-between rounded-lg border border-neutral-100 dark:border-neutral-900 px-3 py-2 hover:bg-[var(--surface-alt)] transition group"
              >
                <div>
                  <div className="font-semibold text-sm flex items-center gap-2">
                    {ed.name}
                    {ed.slug && ed.public_enabled ? (
                      <span
                        onClick={(e) => { e.stopPropagation(); window.open(`/editor/${ed.slug}`, "_blank"); }}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-700 dark:text-green-300 font-bold cursor-pointer hover:bg-green-500/30"
                        title={`Open public portfolio at /editor/${ed.slug}`}
                      >
                        🌐 /editor/{ed.slug}
                      </span>
                    ) : ed.slug ? (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 font-bold" title="Slug set but portfolio not yet published — click row → toggle Publish">
                        ⏸ unpublished
                      </span>
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-300/30 text-neutral-500 font-bold" title="No portfolio slug yet — click 'Back-fill slugs' above">
                        no portfolio
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-neutral-500">
                    {ed.role || "editor"}
                    {ed.email && ` · ${ed.email}`}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    {ed.compensation_type === "salary" ? (
                      <>
                        <div className="text-mono-num text-sm font-semibold">₹{(ed.monthly_salary_inr || 0).toLocaleString("en-IN")}</div>
                        <div className="text-[10px] uppercase tracking-wider text-blue-500 font-bold">monthly · salary</div>
                      </>
                    ) : (
                      <>
                        <div className="text-mono-num text-sm font-semibold">₹{(ed.payment_rate_inr || 0).toLocaleString("en-IN")}</div>
                        <div className="text-[10px] uppercase tracking-wider text-neutral-500">per {ed.payment_per || "video"} · freelance</div>
                      </>
                    )}
                  </div>
                  <Edit3 size={12} className="text-neutral-400 opacity-0 group-hover:opacity-100 transition" />
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {showNew && <EditorModal editor={null} onClose={() => setShowNew(false)} onSaved={onSaved} />}
      {openEditor && <EditorModal editor={openEditor} onClose={() => setOpenEditor(null)} onSaved={onSaved} />}
    </section>
  );
}
