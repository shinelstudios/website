/**
 * AdminLandingPagesPage — registry of one-page landings reachable by direct
 * URL only (e.g. /live-templates).
 *
 * These pages exist in the codebase as React components but are deliberately
 * NOT linked from site nav — they're share/SEO-driven surfaces. This admin
 * page keeps a live list so they don't get forgotten between sessions.
 *
 * KV cap: 50 entries. URL <500 chars (must start with / or https://),
 * title <120 chars, internal note <500 chars.
 */
import React, { useCallback, useEffect, useState } from "react";
import { Plus, Edit3, Trash2, RefreshCw, Save, X, Bookmark, ExternalLink } from "lucide-react";
import { AUTH_BASE } from "../config/constants";
import { authedFetch } from "../utils/tokenStore";

const EMPTY = { url: "", title: "", internalNote: "" };

function toast(type, message) {
  try {
    window.dispatchEvent(new CustomEvent("notify", { detail: { type, message } }));
  } catch { /* noop */ }
}

function fullHref(url) {
  if (!url) return "#";
  if (/^https?:\/\//i.test(url)) return url;
  return url.startsWith("/") ? url : `/${url}`;
}

export default function AdminLandingPagesPage() {
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
      const res = await authedFetch(AUTH_BASE, `/api/landing-pages`);
      if (!res.ok) throw new Error(`Landing pages (${res.status})`);
      const data = await res.json().catch(() => ({}));
      setItems(Array.isArray(data.pages) ? data.pages : []);
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

  const startEdit = (p) => {
    setEditing(p.id);
    setForm({
      url: p.url || "",
      title: p.title || "",
      internalNote: p.internalNote || "",
    });
  };

  const cancel = () => {
    setEditing(null);
    setForm(EMPTY);
  };

  const save = async () => {
    if (!form.url.trim() || !form.title.trim()) {
      return toast("error", "URL and title are required");
    }
    if (!/^(\/|https?:\/\/)/i.test(form.url.trim())) {
      return toast("error", "URL must start with / or https://");
    }
    setSaving(true);
    try {
      const path = editing === "new" ? `/api/landing-pages` : `/api/landing-pages/${encodeURIComponent(editing)}`;
      const method = editing === "new" ? "POST" : "PUT";
      const res = await authedFetch(AUTH_BASE, path, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Save failed");
      toast("success", editing === "new" ? "Landing page added" : "Landing page updated");
      setEditing(null);
      setForm(EMPTY);
      await load();
    } catch (e) {
      toast("error", e.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (p) => {
    if (!confirm(`Remove "${p.title}" from registry?`)) return;
    try {
      const res = await authedFetch(AUTH_BASE, `/api/landing-pages/${encodeURIComponent(p.id)}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`Delete failed (${res.status})`);
      toast("success", "Landing page removed");
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
            <Bookmark size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-black" style={{ color: "var(--text)" }}>
              Hidden landing pages
            </h1>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Direct-URL-only pages we don't surface in site nav. Keep this list current so we don't lose them.
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
            New entry
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
              {editing === "new" ? "New landing page" : "Edit landing page"}
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
          <div className="grid grid-cols-1 gap-3">
            <Field
              label="URL *"
              value={form.url}
              onChange={(v) => setForm(f => ({ ...f, url: v }))}
              maxLength={500}
              placeholder="/live-templates  or  https://…"
            />
            <Field
              label="Title *"
              value={form.title}
              onChange={(v) => setForm(f => ({ ...f, title: v }))}
              maxLength={120}
              placeholder="BGMI Live Templates"
            />
            <div>
              <label className="text-xs font-bold uppercase tracking-widest ml-1" style={{ color: "var(--text-muted)" }}>
                Internal note <span className="text-[10px] font-normal opacity-70">({form.internalNote.length}/500)</span>
              </label>
              <textarea
                value={form.internalNote}
                onChange={(e) => setForm(f => ({ ...f, internalNote: e.target.value.slice(0, 500) }))}
                rows={3}
                className="w-full mt-1 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/5 focus:border-orange-500/50 focus-visible:ring-2 focus-visible:ring-orange-500/60 outline-none text-sm resize-none"
                style={{ color: "var(--text)" }}
                placeholder="Why this page exists, who it's for, last refreshed when…"
              />
            </div>
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
          No entries yet. Click <strong>New entry</strong> to register one.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((p) => (
            <div
              key={p.id}
              className="p-4 rounded-2xl border flex items-start gap-4"
              style={{ background: "var(--surface)", borderColor: "var(--border)" }}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-black truncate" style={{ color: "var(--text)" }}>
                    {p.title}
                  </h3>
                </div>
                <a
                  href={fullHref(p.url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-mono truncate hover:text-orange-500"
                  style={{ color: "var(--text-muted)" }}
                >
                  {p.url}
                  <ExternalLink size={11} />
                </a>
                {p.internalNote && (
                  <p className="text-xs mt-2 leading-relaxed" style={{ color: "var(--text-muted)" }}>
                    {p.internalNote}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => startEdit(p)}
                  className="p-2 rounded-lg hover:bg-[var(--surface-alt)] focus-visible:ring-2 focus-visible:ring-[var(--orange)]"
                  aria-label="Edit"
                  title="Edit"
                  style={{ color: "var(--text-muted)" }}
                >
                  <Edit3 size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => remove(p)}
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
        KV cap: 50 entries. The pages themselves live as React components in the codebase — this is just the bookmark.
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
