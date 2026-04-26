import React from "react";
import { HairlineCard } from "../../../design";
import { AUTH_BASE } from "../../../config/constants";
import { MessageSquare, Check } from "lucide-react";

function timeAgo(ms) {
  const d = Math.floor((Date.now() - Number(ms)) / 60000);
  if (d < 1) return "just now";
  if (d < 60) return `${d}m ago`;
  if (d < 1440) return `${Math.floor(d / 60)}h ago`;
  return `${Math.floor(d / 1440)}d ago`;
}

function Render({ client, config }) {
  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [form, setForm] = React.useState({ name: "", message: "", website: "" });
  const [status, setStatus] = React.useState({ phase: "idle", error: null });

  const load = React.useCallback(() => {
    if (!client.slug) return;
    fetch(`${AUTH_BASE}/api/c/${encodeURIComponent(client.slug)}/wall`)
      .then(r => r.ok ? r.json() : { items: [] })
      .then(d => { setItems(Array.isArray(d?.items) ? d.items : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [client.slug]);
  React.useEffect(() => { load(); }, [load]);

  const submit = async (e) => {
    e.preventDefault();
    setStatus({ phase: "loading", error: null });
    try {
      const res = await fetch(`${AUTH_BASE}/api/c/${encodeURIComponent(client.slug)}/wall`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setStatus({ phase: "done", error: null, autoPinned: !!data.autoPinned });
      setForm({ name: "", message: "", website: "" });
      // Reload — auto-pinned comments show immediately.
      setTimeout(load, 600);
    } catch (err) {
      setStatus({ phase: "idle", error: err.message || "Submit failed" });
    }
  };

  return (
    <HairlineCard className="p-5 md:p-6">
      <div className="flex items-center gap-3 mb-3">
        <span className="w-10 h-10 rounded-full grid place-items-center" style={{ background: "rgba(232,80,2,0.15)", color: "var(--orange)" }}>
          <MessageSquare size={20} />
        </span>
        <h3 className="text-lg md:text-xl font-black" style={{ color: "var(--text)" }}>
          {config?.headline || "Fan wall"}
        </h3>
      </div>
      {config?.subheadline ? (
        <p className="mb-4 text-sm" style={{ color: "var(--text-muted)" }}>{config.subheadline}</p>
      ) : null}

      {!loading && items.length > 0 && (
        <div className="space-y-2 mb-4 max-h-64 overflow-y-auto pr-1">
          {items.map(it => (
            <div key={it.id} className="rounded-lg p-3" style={{ background: "var(--surface)", border: "1px solid var(--hairline)" }}>
              <div className="flex items-baseline justify-between gap-2 mb-1">
                <p className="text-xs font-bold" style={{ color: "var(--text)" }}>{it.name}</p>
                <p className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>{timeAgo(it.createdAt)}</p>
              </div>
              <p className="text-sm whitespace-pre-wrap" style={{ color: "var(--text-muted)" }}>{it.message}</p>
            </div>
          ))}
        </div>
      )}

      {status.phase === "done" ? (
        <div className="rounded-lg p-3 text-center" style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.3)" }}>
          <Check size={18} className="mx-auto mb-1" style={{ color: "#16a34a" }} />
          <p className="text-xs font-bold" style={{ color: "#16a34a" }}>
            {status.autoPinned ? "Posted!" : "Got it — visible after the creator approves."}
          </p>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-2">
          <input type="text" hidden value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} tabIndex={-1} autoComplete="off" />
          <input type="text" required placeholder="Your name" maxLength={60} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full rounded p-2.5 text-sm" style={{ background: "var(--surface)", border: "1px solid var(--hairline)", color: "var(--text)" }} />
          <textarea required rows={2} placeholder="Leave a message…" maxLength={500} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })}
            className="w-full rounded p-2.5 text-sm" style={{ background: "var(--surface)", border: "1px solid var(--hairline)", color: "var(--text)" }} />
          {status.error ? <p className="text-xs" style={{ color: "#dc2626" }}>{status.error}</p> : null}
          <button type="submit" disabled={status.phase === "loading"}
            className="w-full rounded-lg px-4 py-2.5 text-xs font-black uppercase tracking-widest disabled:opacity-50"
            style={{ background: "var(--orange)", color: "#fff", minHeight: 44 }}>
            {status.phase === "loading" ? "Sending…" : (config?.ctaLabel || "Post to wall")}
          </button>
        </form>
      )}
    </HairlineCard>
  );
}

function Editor({ config, onChange }) {
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-black uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>Headline</label>
        <input type="text" value={config?.headline || ""} onChange={(e) => onChange({ ...config, headline: e.target.value })} maxLength={80} placeholder="Fan wall"
          className="w-full rounded p-2 text-sm" style={{ background: "var(--surface)", border: "1px solid var(--hairline)", color: "var(--text)" }} />
      </div>
      <div>
        <label className="block text-xs font-black uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>Sub-headline</label>
        <input type="text" value={config?.subheadline || ""} onChange={(e) => onChange({ ...config, subheadline: e.target.value })} maxLength={200} placeholder="Drop a note. I read every one."
          className="w-full rounded p-2 text-sm" style={{ background: "var(--surface)", border: "1px solid var(--hairline)", color: "var(--text)" }} />
      </div>
      <label className="inline-flex items-center gap-2 text-sm font-bold cursor-pointer" style={{ color: "var(--text)" }}>
        <input type="checkbox" checked={config?.autoPin !== false} onChange={(e) => onChange({ ...config, autoPin: e.target.checked })} className="w-4 h-4 accent-orange-500" />
        Auto-publish new comments (uncheck for moderation queue)
      </label>
      <p className="text-[10px] opacity-60" style={{ color: "var(--text-muted)" }}>
        With moderation off, visit <strong>/clients/me/inbox</strong> and pin the comments you want public.
      </p>
    </div>
  );
}

export default { Render, Editor };
