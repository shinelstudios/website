import React from "react";
import { HairlineCard } from "../../../design";
import { AUTH_BASE } from "../../../config/constants";
import { MessageSquare, Check } from "lucide-react";

function Render({ client, config }) {
  const [form, setForm] = React.useState({ name: "", email: "", message: "", website: "" });
  const [status, setStatus] = React.useState({ phase: "idle", error: null });

  const submit = async (e) => {
    e.preventDefault();
    setStatus({ phase: "loading", error: null });
    try {
      const res = await fetch(`${AUTH_BASE}/api/c/${encodeURIComponent(client.slug)}/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setStatus({ phase: "done", error: null });
      setForm({ name: "", email: "", message: "", website: "" });
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
          {config?.headline || "Send me a message"}
        </h3>
      </div>
      {config?.subheadline ? (
        <p className="mb-4 text-sm" style={{ color: "var(--text-muted)" }}>{config.subheadline}</p>
      ) : null}
      {status.phase === "done" ? (
        <div className="rounded-lg p-4 text-center" style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.3)" }}>
          <Check size={20} className="mx-auto mb-2" style={{ color: "#16a34a" }} />
          <p className="text-sm font-bold" style={{ color: "#16a34a" }}>Got it — they'll see this.</p>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-2">
          <input type="text" hidden value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} tabIndex={-1} autoComplete="off" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input type="text" required placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="rounded p-2.5 text-sm" style={{ background: "var(--surface)", border: "1px solid var(--hairline)", color: "var(--text)" }} />
            <input type="email" required placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="rounded p-2.5 text-sm" style={{ background: "var(--surface)", border: "1px solid var(--hairline)", color: "var(--text)" }} />
          </div>
          <textarea required rows={3} placeholder="What's up?" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} maxLength={2000}
            className="w-full rounded p-2.5 text-sm" style={{ background: "var(--surface)", border: "1px solid var(--hairline)", color: "var(--text)" }} />
          {status.error ? (
            <p className="text-xs" style={{ color: "#dc2626" }}>{status.error}</p>
          ) : null}
          <button type="submit" disabled={status.phase === "loading"}
            className="w-full rounded-lg text-sm font-bold disabled:opacity-50 px-4 py-3"
            style={{ background: "var(--orange)", color: "#fff", minHeight: 48 }}>
            {status.phase === "loading" ? "Sending…" : (config?.ctaLabel || "Send")}
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
        <input type="text" value={config?.headline || ""} onChange={(e) => onChange({ ...config, headline: e.target.value })} maxLength={80} placeholder="Send me a message"
          className="w-full rounded p-2 text-sm" style={{ background: "var(--surface)", border: "1px solid var(--hairline)", color: "var(--text)" }} />
      </div>
      <div>
        <label className="block text-xs font-black uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>Sub-headline</label>
        <input type="text" value={config?.subheadline || ""} onChange={(e) => onChange({ ...config, subheadline: e.target.value })} maxLength={200} placeholder="Reply within 24 hours."
          className="w-full rounded p-2 text-sm" style={{ background: "var(--surface)", border: "1px solid var(--hairline)", color: "var(--text)" }} />
      </div>
      <div>
        <label className="block text-xs font-black uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>CTA label</label>
        <input type="text" value={config?.ctaLabel || ""} onChange={(e) => onChange({ ...config, ctaLabel: e.target.value })} maxLength={20} placeholder="Send"
          className="w-full rounded p-2 text-sm" style={{ background: "var(--surface)", border: "1px solid var(--hairline)", color: "var(--text)" }} />
      </div>
      <p className="text-[10px] opacity-60" style={{ color: "var(--text-muted)" }}>
        Messages land in your inbox + ping your Discord webhook (if set).
      </p>
    </div>
  );
}

export default { Render, Editor };
