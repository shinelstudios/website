/**
 * AdminTestimonialsPage — KV-backed CRUD for quote-style testimonials.
 *
 * These are additive to the rich hardcoded TESTIMONIALS carousel on the
 * homepage (which includes video/analytics/poster references that don't
 * map to a simple admin form). This page lets team members add plain
 * {author, role, channel, quote, avatar} entries without a deploy —
 * handy for collecting praise mid-campaign.
 *
 * KV cap: 50 entries. Form caps quote at 500 chars, author at 80.
 * Draft vs published toggle — drafts never appear on homepage.
 */
import React, { useCallback, useEffect, useState } from "react";
import { Plus, Edit3, Trash2, Eye, EyeOff, RefreshCw, Save, X, Quote } from "lucide-react";
import { AUTH_BASE } from "../config/constants";
import { authedFetch } from "../utils/tokenStore";

const EMPTY = {
  author: "",
  role: "",
  channel: "",
  quote: "",
  avatar: "",
  link: "",
  published: true,
};

function toast(type, message) {
  try {
    window.dispatchEvent(new CustomEvent("notify", { detail: { type, message } }));
  } catch { /* noop */ }
}

export default function AdminTestimonialsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [editing, setEditing] = useState(null); // null | "new" | "<id>"
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await authedFetch(AUTH_BASE, `/api/testimonials/all`);
      if (!res.ok) throw new Error(`Testimonials (${res.status})`);
      const data = await res.json().catch(() => ({}));
      setItems(Array.isArray(data.testimonials) ? data.testimonials : []);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const startCreate = () => {
    setEditing("new");
    setForm(EMPTY);
  };

  const startEdit = (t) => {
    setEditing(t.id);
    setForm({
      author: t.author || "",
      role: t.role || "",
      channel: t.channel || "",
      quote: t.quote || "",
      avatar: t.avatar || "",
      link: t.link || "",
      published: t.published !== false,
    });
  };

  const cancel = () => {
    setEditing(null);
    setForm(EMPTY);
  };

  const save = async () => {
    if (!form.author.trim() || !form.quote.trim()) {
      return toast("error", "Author and quote are required");
    }
    setSaving(true);
    try {
      const path = editing === "new" ? `/api/testimonials` : `/api/testimonials/${encodeURIComponent(editing)}`;
      const method = editing === "new" ? "POST" : "PUT";
      const res = await authedFetch(AUTH_BASE, path, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Save failed");
      toast("success", editing === "new" ? "Testimonial added" : "Testimonial updated");
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
    if (!confirm(`Remove testimonial from ${t.author}?`)) return;
    try {
      const res = await authedFetch(AUTH_BASE, `/api/testimonials/${encodeURIComponent(t.id)}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`Delete failed (${res.status})`);
      toast("success", "Testimonial removed");
      await load();
    } catch (e) {
      toast("error", e.message);
    }
  };

  const togglePublished = async (t) => {
    try {
      const res = await authedFetch(AUTH_BASE, `/api/testimonials/${encodeURIComponent(t.id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published: !(t.published !== false) }),
      });
      if (!res.ok) throw new Error(`Toggle failed (${res.status})`);
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
            <Quote size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-black" style={{ color: "var(--text)" }}>
              Testimonials
            </h1>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Simple quote-style praise wall. Additive to the hardcoded carousel on the home page.
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
            New testimonial
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
              {editing === "new" ? "New testimonial" : "Edit testimonial"}
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
            <Field label="Author *" value={form.author} onChange={(v) => setForm(f => ({ ...f, author: v }))} maxLength={80} />
            <Field label="Role" value={form.role} onChange={(v) => setForm(f => ({ ...f, role: v }))} maxLength={80} placeholder="Streamer • 17K" />
            <Field label="Channel" value={form.channel} onChange={(v) => setForm(f => ({ ...f, channel: v }))} maxLength={80} placeholder="Gaming" />
            <Field label="Avatar URL" value={form.avatar} onChange={(v) => setForm(f => ({ ...f, avatar: v }))} maxLength={500} placeholder="https://…" />
            <div className="md:col-span-2">
              <Field label="Link (optional)" value={form.link} onChange={(v) => setForm(f => ({ ...f, link: v }))} maxLength={500} placeholder="https://youtube.com/@channel" />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-bold uppercase tracking-widest ml-1" style={{ color: "var(--text-muted)" }}>
                Quote * <span className="text-[10px] font-normal opacity-70">({form.quote.length}/500)</span>
              </label>
              <textarea
                value={form.quote}
                onChange={(e) => setForm(f => ({ ...f, quote: e.target.value.slice(0, 500) }))}
                rows={3}
                className="w-full mt-1 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/5 focus:border-orange-500/50 focus-visible:ring-2 focus-visible:ring-orange-500/60 outline-none text-sm resize-none"
                style={{ color: "var(--text)" }}
                placeholder="What they said, in their voice."
              />
            </div>
            <label className="flex items-center gap-2 text-sm" style={{ color: "var(--text)" }}>
              <input
                type="checkbox"
                checked={form.published}
                onChange={(e) => setForm(f => ({ ...f, published: e.target.checked }))}
                className="accent-[var(--orange)] w-4 h-4"
              />
              Published (visible on homepage)
            </label>
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
        <div className="text-center py-16" style={{ color: "var(--text-muted)" }}>
          Loading…
        </div>
      ) : items.length === 0 ? (
        <div
          className="text-center py-16 rounded-2xl border"
          style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text-muted)" }}
        >
          No testimonials yet. Click <strong>New testimonial</strong> to add one.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((t) => (
            <div
              key={t.id}
              className="p-5 rounded-2xl border"
              style={{
                background: "var(--surface)",
                borderColor: t.published !== false ? "var(--border)" : "rgba(245,158,11,0.3)",
                opacity: t.published !== false ? 1 : 0.75,
              }}
            >
              <div className="flex items-start gap-3 mb-3">
                {t.avatar ? (
                  <img
                    src={t.avatar}
                    alt=""
                    className="w-10 h-10 rounded-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <div
                    className="w-10 h-10 rounded-full grid place-items-center font-black text-white"
                    style={{ background: "var(--orange)" }}
                    aria-hidden="true"
                  >
                    {(t.author || "?").slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-bold truncate" style={{ color: "var(--text)" }}>
                    {t.author}
                  </div>
                  <div className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
                    {[t.role, t.channel].filter(Boolean).join(" · ") || "—"}
                  </div>
                </div>
                {t.published === false && (
                  <span
                    className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full"
                    style={{ background: "rgba(245,158,11,0.15)", color: "#f59e0b" }}
                  >
                    Draft
                  </span>
                )}
              </div>
              <p className="text-sm mb-4" style={{ color: "var(--text)" }}>
                “{t.quote}”
              </p>
              <div className="flex items-center justify-end gap-1">
                <button
                  type="button"
                  onClick={() => togglePublished(t)}
                  className="p-2 rounded-lg hover:bg-[var(--surface-alt)] focus-visible:ring-2 focus-visible:ring-[var(--orange)]"
                  aria-label={t.published !== false ? "Unpublish" : "Publish"}
                  title={t.published !== false ? "Unpublish" : "Publish"}
                  style={{ color: "var(--text-muted)" }}
                >
                  {t.published !== false ? <Eye size={14} /> : <EyeOff size={14} />}
                </button>
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
          ))}
        </div>
      )}

      <p className="text-xs mt-6" style={{ color: "var(--text-muted)" }}>
        KV cap: 50 entries. For video/analytics-rich testimonials keep editing the hardcoded carousel in ShinelStudiosHomepage.jsx.
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
