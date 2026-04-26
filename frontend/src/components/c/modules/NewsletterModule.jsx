import React from "react";
import { HairlineCard } from "../../../design";
import { AUTH_BASE } from "../../../config/constants";
import { Mail, Check } from "lucide-react";

function Render({ client, config }) {
  const [email, setEmail] = React.useState("");
  const [website, setWebsite] = React.useState(""); // honeypot
  const [status, setStatus] = React.useState({ phase: "idle", error: null });

  const submit = async (e) => {
    e.preventDefault();
    setStatus({ phase: "loading", error: null });
    try {
      const res = await fetch(`${AUTH_BASE}/api/c/${encodeURIComponent(client.slug)}/newsletter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, website }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setStatus({ phase: "done", error: null });
      setEmail("");
    } catch (err) {
      setStatus({ phase: "idle", error: err.message || "Submit failed" });
    }
  };

  return (
    <HairlineCard className="p-5 md:p-6">
      <div className="flex items-center gap-3 mb-3">
        <span className="w-10 h-10 rounded-full grid place-items-center" style={{ background: "rgba(232,80,2,0.15)", color: "var(--orange)" }}>
          <Mail size={20} />
        </span>
        <h3 className="text-lg md:text-xl font-black" style={{ color: "var(--text)" }}>
          {config?.headline || "Get my newsletter"}
        </h3>
      </div>
      {config?.subheadline ? (
        <p className="mb-4 text-sm" style={{ color: "var(--text-muted)" }}>{config.subheadline}</p>
      ) : null}
      {status.phase === "done" ? (
        <div className="rounded-lg p-4 text-center" style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.3)" }}>
          <Check size={20} className="mx-auto mb-2" style={{ color: "#16a34a" }} />
          <p className="text-sm font-bold" style={{ color: "#16a34a" }}>Subscribed — talk soon.</p>
        </div>
      ) : (
        <form onSubmit={submit} className="flex flex-col sm:flex-row gap-2">
          <input type="text" hidden value={website} onChange={(e) => setWebsite(e.target.value)} tabIndex={-1} autoComplete="off" />
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="flex-1 rounded-lg px-4 py-3 text-sm"
            style={{ background: "var(--surface)", border: "1px solid var(--hairline)", color: "var(--text)", minHeight: 48 }}
          />
          <button
            type="submit"
            disabled={status.phase === "loading"}
            className="rounded-lg px-5 py-3 text-sm font-bold disabled:opacity-50"
            style={{ background: "var(--orange)", color: "#fff", minHeight: 48 }}
          >
            {status.phase === "loading" ? "…" : (config?.ctaLabel || "Subscribe")}
          </button>
        </form>
      )}
      {status.error ? (
        <p className="mt-2 text-xs" style={{ color: "#dc2626" }}>{status.error}</p>
      ) : null}
    </HairlineCard>
  );
}

function Editor({ config, onChange }) {
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-black uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>Headline</label>
        <input type="text" value={config?.headline || ""} onChange={(e) => onChange({ ...config, headline: e.target.value })} maxLength={80} placeholder="Get my newsletter"
          className="w-full rounded p-2 text-sm" style={{ background: "var(--surface)", border: "1px solid var(--hairline)", color: "var(--text)" }} />
      </div>
      <div>
        <label className="block text-xs font-black uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>Sub-headline</label>
        <input type="text" value={config?.subheadline || ""} onChange={(e) => onChange({ ...config, subheadline: e.target.value })} maxLength={200} placeholder="One email a week. Behind-the-scenes + early drops."
          className="w-full rounded p-2 text-sm" style={{ background: "var(--surface)", border: "1px solid var(--hairline)", color: "var(--text)" }} />
      </div>
      <div>
        <label className="block text-xs font-black uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>CTA label</label>
        <input type="text" value={config?.ctaLabel || ""} onChange={(e) => onChange({ ...config, ctaLabel: e.target.value })} maxLength={20} placeholder="Subscribe"
          className="w-full rounded p-2 text-sm" style={{ background: "var(--surface)", border: "1px solid var(--hairline)", color: "var(--text)" }} />
      </div>
      <p className="text-[10px] opacity-60" style={{ color: "var(--text-muted)" }}>
        Subscribers land in your inbox at <strong>/clients/me/inbox</strong>. Export the list as CSV from there.
      </p>
    </div>
  );
}

export default { Render, Editor };
