import React from "react";
import { HairlineCard } from "../../../design";
import { Calendar, ExternalLink } from "lucide-react";

function Render({ config }) {
  if (!config?.url) return null;
  return (
    <HairlineCard className="p-5 md:p-6">
      <div className="flex items-center gap-3 mb-3">
        <span className="w-10 h-10 rounded-full grid place-items-center" style={{ background: "rgba(232,80,2,0.15)", color: "var(--orange)" }}>
          <Calendar size={20} />
        </span>
        <div>
          <h3 className="text-lg md:text-xl font-black leading-tight" style={{ color: "var(--text)" }}>
            {config?.headline || "Book a 1:1 with me"}
          </h3>
          {config?.subheadline ? (
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{config.subheadline}</p>
          ) : null}
        </div>
      </div>
      <a
        href={config.url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center gap-2 w-full px-4 py-3 rounded-lg text-sm font-bold"
        style={{ background: "var(--orange)", color: "#fff", minHeight: 48 }}
      >
        <ExternalLink size={16} /> {config?.ctaLabel || "Pick a time"}
      </a>
    </HairlineCard>
  );
}

function Editor({ config, onChange }) {
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-black uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>Calendly / booking URL</label>
        <input type="url" value={config?.url || ""} onChange={(e) => onChange({ ...config, url: e.target.value })} maxLength={500} placeholder="https://calendly.com/yourhandle/30min"
          className="w-full rounded p-2 text-sm" style={{ background: "var(--surface)", border: "1px solid var(--hairline)", color: "var(--text)" }} />
        <p className="text-[10px] mt-1 opacity-60">Anything that opens in a new tab — Calendly, Cal.com, SavvyCal, Topmate, etc.</p>
      </div>
      <div>
        <label className="block text-xs font-black uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>Headline</label>
        <input type="text" value={config?.headline || ""} onChange={(e) => onChange({ ...config, headline: e.target.value })} maxLength={80} placeholder="Book a 1:1 with me"
          className="w-full rounded p-2 text-sm" style={{ background: "var(--surface)", border: "1px solid var(--hairline)", color: "var(--text)" }} />
      </div>
      <div>
        <label className="block text-xs font-black uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>Sub-headline</label>
        <input type="text" value={config?.subheadline || ""} onChange={(e) => onChange({ ...config, subheadline: e.target.value })} maxLength={200} placeholder="30 min · ₹1500 · channel feedback"
          className="w-full rounded p-2 text-sm" style={{ background: "var(--surface)", border: "1px solid var(--hairline)", color: "var(--text)" }} />
      </div>
      <div>
        <label className="block text-xs font-black uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>CTA label</label>
        <input type="text" value={config?.ctaLabel || ""} onChange={(e) => onChange({ ...config, ctaLabel: e.target.value })} maxLength={40} placeholder="Pick a time"
          className="w-full rounded p-2 text-sm" style={{ background: "var(--surface)", border: "1px solid var(--hairline)", color: "var(--text)" }} />
      </div>
    </div>
  );
}

export default { Render, Editor };
