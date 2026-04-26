/**
 * AdminLiveTemplatesPage — KV-backed editor for the /live-templates page's
 * "Same template, different creators" sliders.
 *
 * Each entry is a TEMPLATE GROUP: one base render + two creator variations
 * (V1 + V2) that the public page renders as a TripleBeforeAfterSlider.
 *   - Base = the empty template you use for new clients
 *   - V1 / V2 = real creator deliveries built from that base
 *
 * KV cap: 8 template groups. Public reads cached at the edge for 5 min.
 * Pattern mirrors AdminLandingPagesPage / AdminTestimonialsPage.
 *
 * To upload an image, use Media Center first and paste the URL here.
 */
import React, { useCallback, useEffect, useState } from "react";
import { Plus, Edit3, Trash2, RefreshCw, Save, X, Image as ImageIcon, ExternalLink } from "lucide-react";
import { AUTH_BASE } from "../config/constants";
import { authedFetch } from "../utils/tokenStore";

const EMPTY = {
  name: "",
  baseUrl: "", baseLabel: "",
  v1Url: "",   v1Label: "",
  v2Url: "",   v2Label: "",
  sortOrder: "",
};

function toast(type, message) {
  try {
    window.dispatchEvent(new CustomEvent("notify", { detail: { type, message } }));
  } catch { /* noop */ }
}

const isOkUrl = (u) => /^(\/|https?:\/\/)/i.test(String(u || "").trim());

export default function AdminLiveTemplatesPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await authedFetch(AUTH_BASE, `/api/live-templates`);
      if (!res.ok) throw new Error(`Live templates (${res.status})`);
      const data = await res.json().catch(() => ({}));
      setItems(Array.isArray(data.templates) ? data.templates : []);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const startCreate = () => { setEditing("new"); setForm(EMPTY); };
  const startEdit = (t) => {
    setEditing(t.id);
    setForm({
      name: t.name || "",
      baseUrl: t.baseUrl || "", baseLabel: t.baseLabel || "",
      v1Url: t.v1Url || "",     v1Label: t.v1Label || "",
      v2Url: t.v2Url || "",     v2Label: t.v2Label || "",
      sortOrder: t.sortOrder ?? "",
    });
  };
  const cancel = () => { setEditing(null); setForm(EMPTY); };

  const save = async () => {
    if (!form.baseUrl.trim() || !form.v1Url.trim() || !form.v2Url.trim()) {
      return toast("error", "Base, Variation 1 and Variation 2 image URLs are all required");
    }
    for (const u of [form.baseUrl, form.v1Url, form.v2Url]) {
      if (!isOkUrl(u)) return toast("error", "URLs must start with / or https://");
    }
    setSaving(true);
    try {
      const path = editing === "new" ? `/api/live-templates` : `/api/live-templates/${encodeURIComponent(editing)}`;
      const method = editing === "new" ? "POST" : "PUT";
      const payload = {
        name: form.name.trim(),
        baseUrl: form.baseUrl.trim(),  baseLabel: form.baseLabel.trim(),
        v1Url:   form.v1Url.trim(),    v1Label:   form.v1Label.trim(),
        v2Url:   form.v2Url.trim(),    v2Label:   form.v2Label.trim(),
      };
      if (form.sortOrder !== "" && Number.isFinite(Number(form.sortOrder))) {
        payload.sortOrder = Number(form.sortOrder);
      }
      const res = await authedFetch(AUTH_BASE, path, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Save failed");
      toast("success", editing === "new" ? "Template added" : "Template updated");
      setEditing(null);
      setForm(EMPTY);
      await load();
    } catch (e) {
      toast("error", e.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (t) => {
    if (!confirm(`Remove template "${t.name || t.id}"?`)) return;
    try {
      const res = await authedFetch(AUTH_BASE, `/api/live-templates/${encodeURIComponent(t.id)}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`Delete failed (${res.status})`);
      toast("success", "Template removed");
      await load();
    } catch (e) {
      toast("error", e.message);
    }
  };

  const moveBy = async (t, delta) => {
    const next = (Number(t.sortOrder) || 0) + delta * 15;
    try {
      const res = await authedFetch(AUTH_BASE, `/api/live-templates/${encodeURIComponent(t.id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sortOrder: next }),
      });
      if (!res.ok) throw new Error(`Reorder failed (${res.status})`);
      await load();
    } catch (e) {
      toast("error", e.message);
    }
  };

  return (
    <div className="max-w-6xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl grid place-items-center shrink-0"
            style={{ background: "var(--orange-soft)", color: "var(--orange)" }}
          >
            <ImageIcon size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-black" style={{ color: "var(--text)" }}>
              Live templates
            </h1>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Each entry = a Base + 2 creator variations rendered as one drag-to-compare slider on /live-templates. Edge cache: 5 min.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold border hover:bg-[var(--surface-alt)] disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-[var(--orange)]"
            style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text)" }}
            aria-label="Refresh"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <button
            type="button"
            onClick={startCreate}
            disabled={editing !== null}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold focus-visible:ring-2 focus-visible:ring-[var(--orange)] disabled:opacity-40"
            style={{ background: "var(--orange)", color: "#fff" }}
          >
            <Plus size={14} />
            New template
          </button>
        </div>
      </div>

      {err && (
        <div
          className="mb-4 px-4 py-3 rounded-xl border text-sm"
          style={{ background: "rgba(239,68,68,0.08)", borderColor: "rgba(239,68,68,0.3)", color: "#ef4444" }}
          role="alert"
        >
          {err}
        </div>
      )}

      {editing && (
        <div
          className="mb-6 p-5 rounded-2xl border"
          style={{ background: "var(--surface)", borderColor: "var(--orange)" }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-black" style={{ color: "var(--text)" }}>
              {editing === "new" ? "New template" : "Edit template"}
            </h2>
            <button
              type="button"
              onClick={cancel}
              aria-label="Close editor"
              className="w-8 h-8 grid place-items-center rounded-lg hover:bg-[var(--surface-alt)] focus-visible:ring-2 focus-visible:ring-[var(--orange)]"
              style={{ color: "var(--text-muted)" }}
            >
              <X size={16} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            <Field label="Template name" value={form.name} onChange={(v) => setForm(f => ({ ...f, name: v }))} maxLength={80} placeholder="BGMI Series A" />
            <Field label="Sort order" value={String(form.sortOrder)} onChange={(v) => setForm(f => ({ ...f, sortOrder: v.replace(/[^0-9-]/g, "") }))} maxLength={6} placeholder="auto (lower = first)" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <ImageBlock title="Base template" urlValue={form.baseUrl} labelValue={form.baseLabel}
              onUrl={(v) => setForm(f => ({ ...f, baseUrl: v }))}
              onLabel={(v) => setForm(f => ({ ...f, baseLabel: v }))}
              labelPlaceholder="Base" />
            <ImageBlock title="Variation 1" urlValue={form.v1Url} labelValue={form.v1Label}
              onUrl={(v) => setForm(f => ({ ...f, v1Url: v }))}
              onLabel={(v) => setForm(f => ({ ...f, v1Label: v }))}
              labelPlaceholder="Variation 1" />
            <ImageBlock title="Variation 2" urlValue={form.v2Url} labelValue={form.v2Label}
              onUrl={(v) => setForm(f => ({ ...f, v2Url: v }))}
              onLabel={(v) => setForm(f => ({ ...f, v2Label: v }))}
              labelPlaceholder="Variation 2" />
          </div>

          <div className="flex justify-end gap-2 mt-5">
            <button
              type="button"
              onClick={cancel}
              className="px-4 py-2 rounded-lg text-sm font-bold border hover:bg-[var(--surface-alt)] focus-visible:ring-2 focus-visible:ring-[var(--orange)]"
              style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text)" }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-[var(--orange)]"
              style={{ background: "var(--orange)", color: "#fff" }}
            >
              <Save size={14} />
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      )}

      {loading && !items.length ? (
        <div className="text-center py-16" style={{ color: "var(--text-muted)" }}>Loading…</div>
      ) : items.length === 0 ? (
        <div
          className="text-center py-16 rounded-2xl border"
          style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text-muted)" }}
        >
          No templates yet — /live-templates falls back to the bundled BGMI defaults until you add one.
          <br />
          Click <strong>New template</strong> to add one.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((t) => (
            <div
              key={t.id}
              className="rounded-2xl border overflow-hidden"
              style={{ background: "var(--surface)", borderColor: "var(--border)" }}
            >
              <div className="grid grid-cols-3 gap-px bg-[var(--border)]">
                <ThumbCell src={t.baseUrl} label={t.baseLabel || "Base"} />
                <ThumbCell src={t.v1Url}   label={t.v1Label   || "V1"} />
                <ThumbCell src={t.v2Url}   label={t.v2Label   || "V2"} />
              </div>
              <div className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-black text-sm truncate" style={{ color: "var(--text)" }}>
                    {t.name || <span style={{ color: "var(--text-muted)" }}>(no name)</span>}
                  </div>
                  <span className="text-[10px] font-mono opacity-60" style={{ color: "var(--text-muted)" }}>
                    #{t.sortOrder ?? "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => moveBy(t, -1)} title="Move earlier" className="px-2 py-1 rounded-md text-xs font-bold hover:bg-[var(--surface-alt)] focus-visible:ring-2 focus-visible:ring-[var(--orange)]" style={{ color: "var(--text-muted)" }}>↑</button>
                    <button type="button" onClick={() => moveBy(t, 1)}  title="Move later"   className="px-2 py-1 rounded-md text-xs font-bold hover:bg-[var(--surface-alt)] focus-visible:ring-2 focus-visible:ring-[var(--orange)]" style={{ color: "var(--text-muted)" }}>↓</button>
                  </div>
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => startEdit(t)} aria-label="Edit"   className="p-2 rounded-lg hover:bg-[var(--surface-alt)] focus-visible:ring-2 focus-visible:ring-[var(--orange)]" style={{ color: "var(--text-muted)" }}>
                      <Edit3 size={14} />
                    </button>
                    <button type="button" onClick={() => remove(t)}    aria-label="Delete" className="p-2 rounded-lg hover:bg-[var(--surface-alt)] focus-visible:ring-2 focus-visible:ring-[var(--orange)]" style={{ color: "#ef4444" }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs mt-6" style={{ color: "var(--text-muted)" }}>
        KV cap: 8 templates. Public reads cached at the edge for 5 min — hard-refresh to see immediately.
      </p>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, maxLength = 120 }) {
  return (
    <div>
      <label className="text-xs font-bold uppercase tracking-widest ml-1" style={{ color: "var(--text-muted)" }}>{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={maxLength}
        placeholder={placeholder}
        className="w-full mt-1 px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/5 focus:border-orange-500/50 focus-visible:ring-2 focus-visible:ring-orange-500/60 outline-none text-sm font-medium"
        style={{ color: "var(--text)" }}
      />
    </div>
  );
}

function ImageBlock({ title, urlValue, labelValue, onUrl, onLabel, labelPlaceholder }) {
  const previewable = urlValue && /^(\/|https?:\/\/)/i.test(urlValue);
  return (
    <div className="rounded-xl border p-3" style={{ borderColor: "var(--border)" }}>
      <div className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: "var(--orange)" }}>{title} *</div>
      {previewable ? (
        <img src={urlValue} alt="" className="w-full aspect-video object-cover rounded-lg mb-2 border" style={{ borderColor: "var(--border)" }} loading="lazy" />
      ) : (
        <div className="w-full aspect-video bg-[var(--surface-alt)] rounded-lg mb-2 grid place-items-center text-xs" style={{ color: "var(--text-muted)" }}>preview</div>
      )}
      <div className="space-y-2">
        <Field label="Image URL" value={urlValue} onChange={onUrl} maxLength={800} placeholder="https://… or /assets/foo.jpg" />
        <Field label="Label (shown above slider)" value={labelValue} onChange={onLabel} maxLength={60} placeholder={labelPlaceholder} />
      </div>
    </div>
  );
}

function ThumbCell({ src, label }) {
  return (
    <div className="aspect-video bg-[var(--surface-alt)] relative">
      {src ? (
        <img src={src} alt={label} className="w-full h-full object-cover" loading="lazy" onError={(e) => { e.currentTarget.style.opacity = "0.2"; }} />
      ) : (
        <div className="w-full h-full grid place-items-center text-[10px]" style={{ color: "var(--text-muted)" }}>—</div>
      )}
      <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest" style={{ background: "rgba(0,0,0,0.6)", color: "#fff" }}>{label}</span>
    </div>
  );
}
