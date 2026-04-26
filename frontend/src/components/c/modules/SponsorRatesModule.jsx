import React from "react";
import { HairlineCard } from "../../../design";
import { AUTH_BASE } from "../../../config/constants";
import { Megaphone, Check, AlertTriangle } from "lucide-react";

function Render({ client, config }) {
  const tiers = Array.isArray(config?.tiers) ? config.tiers : [];
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState({ name: "", email: "", brand: "", budget: "", message: "", website: "" });
  const [status, setStatus] = React.useState({ phase: "idle", error: null });

  const submit = async (e) => {
    e.preventDefault();
    setStatus({ phase: "loading", error: null });
    try {
      const res = await fetch(`${AUTH_BASE}/api/c/${encodeURIComponent(client.slug)}/sponsor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setStatus({ phase: "done", error: null });
    } catch (err) {
      setStatus({ phase: "idle", error: err.message || "Submit failed" });
    }
  };

  return (
    <HairlineCard className="p-5 md:p-6">
      <div className="flex items-center gap-3 mb-3">
        <span className="w-10 h-10 rounded-full grid place-items-center" style={{ background: "rgba(232,80,2,0.15)", color: "var(--orange)" }}>
          <Megaphone size={20} />
        </span>
        <h3 className="text-lg md:text-xl font-black" style={{ color: "var(--text)" }}>
          {config?.headline || "Sponsorships"}
        </h3>
      </div>
      {config?.subheadline ? (
        <p className="mb-4 text-sm" style={{ color: "var(--text-muted)" }}>{config.subheadline}</p>
      ) : null}

      {tiers.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          {tiers.slice(0, 3).map((t, i) => (
            <div key={i} className="rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--hairline)" }}>
              <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: "var(--orange)" }}>{t.name || "Tier"}</p>
              <p className="mt-1 text-xl font-black" style={{ color: "var(--text)" }}>{t.price || "Custom"}</p>
              {t.deliverables ? (
                <p className="mt-2 text-xs whitespace-pre-wrap" style={{ color: "var(--text-muted)" }}>{t.deliverables}</p>
              ) : null}
            </div>
          ))}
        </div>
      )}

      {!open && status.phase !== "done" && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full inline-flex items-center justify-center px-4 py-3 rounded-lg text-sm font-bold"
          style={{ background: "var(--orange)", color: "#fff", minHeight: 48 }}
        >
          {config?.ctaLabel || "Inquire about sponsorship"}
        </button>
      )}

      {status.phase === "done" && (
        <div className="rounded-lg p-4 text-center" style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.3)" }}>
          <Check size={20} className="mx-auto mb-2" style={{ color: "#16a34a" }} />
          <p className="text-sm font-bold" style={{ color: "#16a34a" }}>Got it — they'll be in touch shortly.</p>
        </div>
      )}

      {open && status.phase !== "done" && (
        <form onSubmit={submit} className="space-y-2">
          <input type="text" hidden value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} tabIndex={-1} autoComplete="off" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input type="text" required placeholder="Your name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded p-2.5 text-sm" style={{ background: "var(--surface)", border: "1px solid var(--hairline)", color: "var(--text)" }} />
            <input type="email" required placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full rounded p-2.5 text-sm" style={{ background: "var(--surface)", border: "1px solid var(--hairline)", color: "var(--text)" }} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input type="text" placeholder="Brand (optional)" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })}
              className="w-full rounded p-2.5 text-sm" style={{ background: "var(--surface)", border: "1px solid var(--hairline)", color: "var(--text)" }} />
            <input type="text" placeholder="Budget (optional)" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })}
              className="w-full rounded p-2.5 text-sm" style={{ background: "var(--surface)", border: "1px solid var(--hairline)", color: "var(--text)" }} />
          </div>
          <textarea required rows={3} placeholder="What are you looking to do?" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })}
            maxLength={2000}
            className="w-full rounded p-2.5 text-sm" style={{ background: "var(--surface)", border: "1px solid var(--hairline)", color: "var(--text)" }} />
          {status.error ? (
            <p className="text-xs" style={{ color: "#dc2626" }}>{status.error}</p>
          ) : null}
          <div className="flex gap-2">
            <button type="button" onClick={() => setOpen(false)} className="px-4 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest" style={{ background: "transparent", border: "1px solid var(--hairline)", color: "var(--text-muted)", minHeight: 44 }}>
              Cancel
            </button>
            <button type="submit" disabled={status.phase === "loading"} className="flex-1 rounded-lg text-xs font-black uppercase tracking-widest disabled:opacity-50" style={{ background: "var(--orange)", color: "#fff", minHeight: 44 }}>
              {status.phase === "loading" ? "Sending…" : "Send inquiry"}
            </button>
          </div>
        </form>
      )}
    </HairlineCard>
  );
}

function Editor({ config, onChange }) {
  const tiers = Array.isArray(config?.tiers) ? config.tiers : [];
  const updateTier = (i, patch) => {
    const next = tiers.slice();
    next[i] = { ...next[i], ...patch };
    onChange({ ...config, tiers: next });
  };
  const removeTier = (i) => {
    const next = tiers.slice(); next.splice(i, 1);
    onChange({ ...config, tiers: next });
  };
  const addTier = () => {
    if (tiers.length >= 3) return;
    onChange({ ...config, tiers: [...tiers, { name: "", price: "", deliverables: "" }] });
  };
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-black uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>Headline</label>
        <input type="text" value={config?.headline || ""} onChange={(e) => onChange({ ...config, headline: e.target.value })} maxLength={80} placeholder="Sponsorships"
          className="w-full rounded p-2 text-sm" style={{ background: "var(--surface)", border: "1px solid var(--hairline)", color: "var(--text)" }} />
      </div>
      <div>
        <label className="block text-xs font-black uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>Sub-headline</label>
        <input type="text" value={config?.subheadline || ""} onChange={(e) => onChange({ ...config, subheadline: e.target.value })} maxLength={200} placeholder="Open for brand integrations across video + shorts."
          className="w-full rounded p-2 text-sm" style={{ background: "var(--surface)", border: "1px solid var(--hairline)", color: "var(--text)" }} />
      </div>
      <div>
        <label className="block text-xs font-black uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>Tiers (max 3)</label>
        {tiers.map((t, i) => (
          <div key={i} className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2 p-3 rounded" style={{ background: "var(--surface)", border: "1px solid var(--hairline)" }}>
            <input placeholder="Name (e.g. Mention)" value={t.name || ""} onChange={(e) => updateTier(i, { name: e.target.value })} maxLength={40}
              className="rounded p-2 text-sm" style={{ background: "var(--surface-alt)", border: "1px solid var(--hairline)", color: "var(--text)" }} />
            <input placeholder="Price (e.g. ₹15k)" value={t.price || ""} onChange={(e) => updateTier(i, { price: e.target.value })} maxLength={40}
              className="rounded p-2 text-sm" style={{ background: "var(--surface-alt)", border: "1px solid var(--hairline)", color: "var(--text)" }} />
            <div className="flex gap-2">
              <input placeholder="Deliverables" value={t.deliverables || ""} onChange={(e) => updateTier(i, { deliverables: e.target.value })} maxLength={200}
                className="flex-1 rounded p-2 text-sm" style={{ background: "var(--surface-alt)", border: "1px solid var(--hairline)", color: "var(--text)" }} />
              <button type="button" onClick={() => removeTier(i)} className="text-xs font-black uppercase tracking-widest px-2" style={{ color: "var(--text-muted)" }}>×</button>
            </div>
          </div>
        ))}
        <button type="button" onClick={addTier} disabled={tiers.length >= 3} className="text-xs font-black uppercase tracking-widest px-4 py-2 rounded disabled:opacity-40" style={{ background: "var(--orange)", color: "#fff" }}>
          Add tier {tiers.length}/3
        </button>
      </div>
      <div>
        <label className="block text-xs font-black uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>CTA label</label>
        <input type="text" value={config?.ctaLabel || ""} onChange={(e) => onChange({ ...config, ctaLabel: e.target.value })} maxLength={60} placeholder="Inquire about sponsorship"
          className="w-full rounded p-2 text-sm" style={{ background: "var(--surface)", border: "1px solid var(--hairline)", color: "var(--text)" }} />
      </div>
    </div>
  );
}

export default { Render, Editor };
