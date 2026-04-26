import React from "react";
import { HairlineCard } from "../../../design";
import { AUTH_BASE } from "../../../config/constants";
import { Sparkles } from "lucide-react";

function fmtDate(ms) {
  return new Date(Number(ms)).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function Render({ client, config }) {
  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    if (!client.slug) { setLoading(false); return; }
    fetch(`${AUTH_BASE}/api/c/${encodeURIComponent(client.slug)}/devlog`)
      .then(r => r.ok ? r.json() : { items: [] })
      .then(d => { if (!cancelled) { setItems(Array.isArray(d?.items) ? d.items : []); setLoading(false); } })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [client.slug]);

  if (loading) {
    return (
      <HairlineCard className="p-5">
        <div className="h-20 rounded animate-pulse" style={{ background: "var(--surface)" }} />
      </HairlineCard>
    );
  }
  if (items.length === 0) return null;

  return (
    <HairlineCard className="p-5 md:p-6">
      <div className="flex items-center gap-3 mb-3">
        <span className="w-10 h-10 rounded-full grid place-items-center" style={{ background: "rgba(232,80,2,0.15)", color: "var(--orange)" }}>
          <Sparkles size={20} />
        </span>
        <h3 className="text-lg md:text-xl font-black" style={{ color: "var(--text)" }}>
          {config?.headline || "Behind the scenes"}
        </h3>
      </div>
      {config?.subheadline ? (
        <p className="mb-4 text-sm" style={{ color: "var(--text-muted)" }}>{config.subheadline}</p>
      ) : null}
      <div className="relative pl-6">
        <div className="absolute left-2 top-2 bottom-2 w-px" style={{ background: "var(--hairline)" }} aria-hidden="true" />
        {items.map((it, i) => (
          <div key={it.id} className="relative pb-4 last:pb-0">
            <span className="absolute -left-[18px] top-1 w-3 h-3 rounded-full" style={{ background: "var(--orange)", boxShadow: "0 0 0 3px var(--surface)" }} aria-hidden="true" />
            <p className="text-[10px] font-mono mb-1" style={{ color: "var(--text-muted)" }}>
              {fmtDate(it.createdAt)} · {it.postedBy}
            </p>
            <p className="text-sm whitespace-pre-wrap" style={{ color: "var(--text)" }}>{it.body}</p>
          </div>
        ))}
      </div>
    </HairlineCard>
  );
}

function Editor({ config, onChange }) {
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-black uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>Headline</label>
        <input type="text" value={config?.headline || ""} onChange={(e) => onChange({ ...config, headline: e.target.value })} maxLength={80} placeholder="Behind the scenes"
          className="w-full rounded p-2 text-sm" style={{ background: "var(--surface)", border: "1px solid var(--hairline)", color: "var(--text)" }} />
      </div>
      <div>
        <label className="block text-xs font-black uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>Sub-headline</label>
        <input type="text" value={config?.subheadline || ""} onChange={(e) => onChange({ ...config, subheadline: e.target.value })} maxLength={200} placeholder="Production updates from the Shinel team."
          className="w-full rounded p-2 text-sm" style={{ background: "var(--surface)", border: "1px solid var(--hairline)", color: "var(--text)" }} />
      </div>
      <p className="text-[10px] opacity-60" style={{ color: "var(--text-muted)" }}>
        Only Shinel team members can post here. Ask your account manager to add an update.
      </p>
    </div>
  );
}

export default { Render, Editor };
