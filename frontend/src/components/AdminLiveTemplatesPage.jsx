/**
 * AdminLiveTemplatesPage — KV-backed CRUD for the /live-templates page's
 * thumbnail grid.
 *
 * Each entry: { id, imageUrl, label, sortOrder }
 *   - imageUrl: paste a URL (upload via Media Center first if you need
 *     to host it). Must start with `/` or `https://`.
 *   - label: short display label (e.g. "BGMI Series A")
 *   - sortOrder: lower number = appears first. Defaults to last+10.
 *
 * KV cap: 12 entries. Public GET endpoint is edge-cached for 5 min,
 * so changes propagate within ~5 minutes (or instantly if you hard-refresh).
 *
 * Pattern mirrors AdminLandingPagesPage / AdminTestimonialsPage.
 */
import React, { useCallback, useEffect, useState } from "react";
import { Plus, Edit3, Trash2, RefreshCw, Save, X, Image as ImageIcon, ExternalLink } from "lucide-react";
import { AUTH_BASE } from "../config/constants";
import { authedFetch } from "../utils/tokenStore";

const EMPTY = { imageUrl: "", label: "", sortOrder: "" };

function toast(type, message) {
  try {
    window.dispatchEvent(new CustomEvent("notify", { detail: { type, message } }));
  } catch { /* noop */ }
}

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
      setItems(Array.isArray(data.thumbnails) ? data.thumbnails : []);
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
      imageUrl: t.imageUrl || "",
      label: t.label || "",
      sortOrder: t.sortOrder ?? "",
    });
  };
  const cancel = () => { setEditing(null); setForm(EMPTY); };

  const save = async () => {
    if (!form.imageUrl.trim()) {
      return toast("error", "Image URL is required");
    }
    if (!/^(\/|https?:\/\/)/i.test(form.imageUrl.trim())) {
      return toast("error", "URL must start with / or https://");
    }
    setSaving(true);
    try {
      const path = editing === "new" ? `/api/live-templates` : `/api/live-templates/${encodeURIComponent(editing)}`;
      const method = editing === "new" ? "POST" : "PUT";
      const payload = {
        imageUrl: form.imageUrl.trim(),
        label: form.label.trim(),
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
      toast("success", editing === "new" ? "Thumbnail added" : "Thumbnail updated");
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
    if (!confirm(`Remove thumbnail "${t.label || t.id}"?`)) return;
    try {
      const res = await authedFetch(AUTH_BASE, `/api/live-templates/${encodeURIComponent(t.id)}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`Delete failed (${res.status})`);
      toast("success", "Thumbnail removed");
      await load();
    } catch (e) {
      toast("error", e.message);
    }
  };

  const moveBy = async (t, delta) => {
    // Coarse reorder: bump sortOrder by ±15 so it crosses neighbours.
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
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl grid place-items-center"
            style={{ background: "var(--orange-soft)", color: "var(--orange)" }}
          >
            <ImageIcon size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-black" style={{ color: "var(--text)" }}>
              Live templates · thumbnails
            </h1>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Drives the "Same template, different creators" grid on /live-templates. Public edge cache is 5 minutes.
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
            New thumbnail
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
              {editing === "new" ? "New thumbnail" : "Edit thumbnail"}
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <Field
                label="Image URL *"
                value={form.imageUrl}
                onChange={(v) => setForm(f => ({ ...f, imageUrl: v }))}
                maxLength={800}
                placeholder="https://… or /assets/foo.jpg"
              />
            </div>
            <Field
              label="Label"
              value={form.label}
              onChange={(v) => setForm(f => ({ ...f, label: v }))}
              maxLength={80}
              placeholder="BGMI Series A"
            />
            <Field
              label="Sort order"
              value={String(form.sortOrder)}
              onChange={(v) => setForm(f => ({ ...f, sortOrder: v.replace(/[^0-9-]/g, "") }))}
              maxLength={6}
              placeholder="auto (lower = first)"
            />
            {form.imageUrl && /^(\/|https?:\/\/)/i.test(form.imageUrl) && (
              <div className="md:col-span-2">
                <div className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>
                  Preview
                </div>
                <img
                  src={form.imageUrl}
                  alt=""
                  className="w-full max-w-md aspect-video object-cover rounded-lg border"
                  style={{ borderColor: "var(--border)" }}
                  loading="lazy"
                />
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 mt-4">
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
          No thumbnails yet — the /live-templates page will fall back to the bundled defaults until you add some.
          <br />
          Click <strong>New thumbnail</strong> to add one.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((t) => (
            <div
              key={t.id}
              className="rounded-2xl border overflow-hidden"
              style={{ background: "var(--surface)", borderColor: "var(--border)" }}
            >
              <div className="aspect-video bg-[var(--surface-alt)] grid place-items-center overflow-hidden">
                <img
                  src={t.imageUrl}
                  alt={t.label || ""}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={(e) => { e.currentTarget.style.display = "none"; }}
                />
              </div>
              <div className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-bold truncate text-sm" style={{ color: "var(--text)" }}>
                    {t.label || <span style={{ color: "var(--text-muted)" }}>(no label)</span>}
                  </div>
                  <span className="text-[10px] font-mono opacity-60" style={{ color: "var(--text-muted)" }}>
                    #{t.sortOrder ?? "—"}
                  </span>
                </div>
                <a
                  href={t.imageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-mono truncate hover:text-orange-500 max-w-full"
                  style={{ color: "var(--text-muted)" }}
                >
                  <span className="truncate">{t.imageUrl}</span>
                  <ExternalLink size={10} className="shrink-0" />
                </a>
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => moveBy(t, -1)}
                      className="px-2 py-1 rounded-md text-xs font-bold hover:bg-[var(--surface-alt)] focus-visible:ring-2 focus-visible:ring-[var(--orange)]"
                      title="Move earlier"
                      style={{ color: "var(--text-muted)" }}
                    >↑</button>
                    <button
                      type="button"
                      onClick={() => moveBy(t, 1)}
                      className="px-2 py-1 rounded-md text-xs font-bold hover:bg-[var(--surface-alt)] focus-visible:ring-2 focus-visible:ring-[var(--orange)]"
                      title="Move later"
                      style={{ color: "var(--text-muted)" }}
                    >↓</button>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => startEdit(t)}
                      className="p-2 rounded-lg hover:bg-[var(--surface-alt)] focus-visible:ring-2 focus-visible:ring-[var(--orange)]"
                      aria-label="Edit"
                      title="Edit"
                      style={{ color: "var(--text-muted)" }}
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(t)}
                      className="p-2 rounded-lg hover:bg-[var(--surface-alt)] focus-visible:ring-2 focus-visible:ring-[var(--orange)]"
                      aria-label="Delete"
                      title="Delete"
                      style={{ color: "#ef4444" }}
                    >
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
        KV cap: 12 entries. Public reads cached at the edge for 5 minutes. To upload an image, use Media Center first and paste the URL here.
      </p>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, maxLength = 120 }) {
  return (
    <div>
      <label className="text-xs font-bold uppercase tracking-widest ml-1" style={{ color: "var(--text-muted)" }}>
        {label}
      </label>
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
