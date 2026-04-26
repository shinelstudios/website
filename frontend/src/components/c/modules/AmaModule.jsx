import React from "react";
import { HairlineCard } from "../../../design";
import { AUTH_BASE } from "../../../config/constants";
import { MessageCircle, Check } from "lucide-react";

function Render({ client, config }) {
  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [form, setForm] = React.useState({ name: "", question: "", website: "" });
  const [status, setStatus] = React.useState({ phase: "idle", error: null });

  React.useEffect(() => {
    let cancelled = false;
    if (!client.slug) { setLoading(false); return; }
    fetch(`${AUTH_BASE}/api/c/${encodeURIComponent(client.slug)}/ama`)
      .then(r => r.ok ? r.json() : { items: [] })
      .then(d => { if (!cancelled) { setItems(Array.isArray(d?.items) ? d.items : []); setLoading(false); } })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [client.slug]);

  const submit = async (e) => {
    e.preventDefault();
    setStatus({ phase: "loading", error: null });
    try {
      const res = await fetch(`${AUTH_BASE}/api/c/${encodeURIComponent(client.slug)}/ama`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setStatus({ phase: "done", error: null });
      setForm({ name: "", question: "", website: "" });
    } catch (err) {
      setStatus({ phase: "idle", error: err.message || "Submit failed" });
    }
  };

  return (
    <HairlineCard className="p-5 md:p-6">
      <div className="flex items-center gap-3 mb-3">
        <span className="w-10 h-10 rounded-full grid place-items-center" style={{ background: "rgba(232,80,2,0.15)", color: "var(--orange)" }}>
          <MessageCircle size={20} />
        </span>
        <h3 className="text-lg md:text-xl font-black" style={{ color: "var(--text)" }}>
          {config?.headline || "Ask me anything"}
        </h3>
      </div>
      {config?.subheadline ? (
        <p className="mb-4 text-sm" style={{ color: "var(--text-muted)" }}>{config.subheadline}</p>
      ) : null}

      {!loading && items.length > 0 && (
        <div className="space-y-3 mb-4">
          {items.map(it => (
            <div key={it.id} className="rounded-lg p-3" style={{ background: "var(--surface)", border: "1px solid var(--hairline)" }}>
              <p className="text-xs font-bold mb-1" style={{ color: "var(--orange)" }}>
                {it.name ? `${it.name} asked:` : "Someone asked:"}
              </p>
              <p className="text-sm mb-2" style={{ color: "var(--text)" }}>{it.question}</p>
              <p className="text-xs whitespace-pre-wrap" style={{ color: "var(--text-muted)" }}>{it.answer}</p>
            </div>
          ))}
        </div>
      )}

      {status.phase === "done" ? (
        <div className="rounded-lg p-3 text-center" style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.3)" }}>
          <Check size={18} className="mx-auto mb-1" style={{ color: "#16a34a" }} />
          <p className="text-xs font-bold" style={{ color: "#16a34a" }}>Got your question — they may answer it later.</p>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-2">
          <input type="text" hidden value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} tabIndex={-1} autoComplete="off" />
          <input type="text" placeholder="Your name (optional)" maxLength={60} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full rounded p-2.5 text-sm" style={{ background: "var(--surface)", border: "1px solid var(--hairline)", color: "var(--text)" }} />
          <textarea required rows={2} placeholder="Ask your question…" maxLength={500} value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })}
            className="w-full rounded p-2.5 text-sm" style={{ background: "var(--surface)", border: "1px solid var(--hairline)", color: "var(--text)" }} />
          {status.error ? <p className="text-xs" style={{ color: "#dc2626" }}>{status.error}</p> : null}
          <button type="submit" disabled={status.phase === "loading"}
            className="w-full rounded-lg px-4 py-2.5 text-xs font-black uppercase tracking-widest disabled:opacity-50"
            style={{ background: "var(--orange)", color: "#fff", minHeight: 44 }}>
            {status.phase === "loading" ? "Sending…" : (config?.ctaLabel || "Submit question")}
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
        <input type="text" value={config?.headline || ""} onChange={(e) => onChange({ ...config, headline: e.target.value })} maxLength={80} placeholder="Ask me anything"
          className="w-full rounded p-2 text-sm" style={{ background: "var(--surface)", border: "1px solid var(--hairline)", color: "var(--text)" }} />
      </div>
      <div>
        <label className="block text-xs font-black uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>Sub-headline</label>
        <input type="text" value={config?.subheadline || ""} onChange={(e) => onChange({ ...config, subheadline: e.target.value })} maxLength={200} placeholder="I'll answer the best ones in my next video."
          className="w-full rounded p-2 text-sm" style={{ background: "var(--surface)", border: "1px solid var(--hairline)", color: "var(--text)" }} />
      </div>
      <p className="text-[10px] opacity-60" style={{ color: "var(--text-muted)" }}>
        Questions land in <strong>/clients/me/inbox</strong>. Open one, type your answer, hit "Answer & publish" to make it public.
      </p>
    </div>
  );
}

export default { Render, Editor };
