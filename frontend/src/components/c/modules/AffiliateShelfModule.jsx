import React from "react";
import { HairlineCard } from "../../../design";
import { ShoppingBag } from "lucide-react";

function Render({ config }) {
  const items = Array.isArray(config?.items) ? config.items : [];
  if (items.length === 0) return null;
  return (
    <HairlineCard className="p-5 md:p-6">
      <div className="flex items-center gap-3 mb-4">
        <span className="w-10 h-10 rounded-full grid place-items-center" style={{ background: "rgba(232,80,2,0.15)", color: "var(--orange)" }}>
          <ShoppingBag size={20} />
        </span>
        <h3 className="text-lg md:text-xl font-black" style={{ color: "var(--text)" }}>
          {config?.headline || "What I use"}
        </h3>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {items.slice(0, 12).map((it, i) => (
          <a
            key={i}
            href={it.url || "#"}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="block group"
          >
            <div className="aspect-square rounded-lg overflow-hidden mb-2" style={{ background: "var(--surface)", border: "1px solid var(--hairline)" }}>
              {it.image ? (
                <img src={it.image} alt={it.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" decoding="async" />
              ) : (
                <div className="w-full h-full grid place-items-center text-xs" style={{ color: "var(--text-muted)" }}>No image</div>
              )}
            </div>
            <p className="text-xs font-bold leading-tight line-clamp-2" style={{ color: "var(--text)" }}>{it.name || "Item"}</p>
            {it.price ? (
              <p className="text-[10px] font-mono mt-0.5" style={{ color: "var(--text-muted)" }}>{it.price}</p>
            ) : null}
          </a>
        ))}
      </div>
      {config?.disclaimer ? (
        <p className="mt-4 text-[10px] opacity-60" style={{ color: "var(--text-muted)" }}>{config.disclaimer}</p>
      ) : (
        <p className="mt-4 text-[10px] opacity-50" style={{ color: "var(--text-muted)" }}>
          Affiliate links — I may earn a small commission. No extra cost to you.
        </p>
      )}
    </HairlineCard>
  );
}

function Editor({ config, onChange }) {
  const items = Array.isArray(config?.items) ? config.items : [];
  const updateItem = (i, patch) => { const next = items.slice(); next[i] = { ...next[i], ...patch }; onChange({ ...config, items: next }); };
  const removeItem = (i) => { const next = items.slice(); next.splice(i, 1); onChange({ ...config, items: next }); };
  const addItem = () => {
    if (items.length >= 12) return;
    onChange({ ...config, items: [...items, { name: "", url: "", image: "", price: "" }] });
  };
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-black uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>Headline</label>
        <input type="text" value={config?.headline || ""} onChange={(e) => onChange({ ...config, headline: e.target.value })} maxLength={60} placeholder="What I use"
          className="w-full rounded p-2 text-sm" style={{ background: "var(--surface)", border: "1px solid var(--hairline)", color: "var(--text)" }} />
      </div>
      <div>
        <label className="block text-xs font-black uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>Items (max 12)</label>
        {items.map((it, i) => (
          <div key={i} className="grid grid-cols-1 md:grid-cols-12 gap-2 mb-2 p-3 rounded" style={{ background: "var(--surface)", border: "1px solid var(--hairline)" }}>
            <input placeholder="Name" value={it.name || ""} onChange={(e) => updateItem(i, { name: e.target.value })} maxLength={80}
              className="md:col-span-3 rounded p-2 text-sm" style={{ background: "var(--surface-alt)", border: "1px solid var(--hairline)", color: "var(--text)" }} />
            <input placeholder="Image URL" value={it.image || ""} onChange={(e) => updateItem(i, { image: e.target.value })} maxLength={500}
              className="md:col-span-4 rounded p-2 text-sm" style={{ background: "var(--surface-alt)", border: "1px solid var(--hairline)", color: "var(--text)" }} />
            <input placeholder="Affiliate URL" value={it.url || ""} onChange={(e) => updateItem(i, { url: e.target.value })} maxLength={500}
              className="md:col-span-3 rounded p-2 text-sm" style={{ background: "var(--surface-alt)", border: "1px solid var(--hairline)", color: "var(--text)" }} />
            <input placeholder="₹ price" value={it.price || ""} onChange={(e) => updateItem(i, { price: e.target.value })} maxLength={20}
              className="md:col-span-1 rounded p-2 text-sm" style={{ background: "var(--surface-alt)", border: "1px solid var(--hairline)", color: "var(--text)" }} />
            <button type="button" onClick={() => removeItem(i)} className="md:col-span-1 text-xs font-black uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>×</button>
          </div>
        ))}
        <button type="button" onClick={addItem} disabled={items.length >= 12} className="text-xs font-black uppercase tracking-widest px-4 py-2 rounded disabled:opacity-40" style={{ background: "var(--orange)", color: "#fff" }}>
          Add item {items.length}/12
        </button>
      </div>
      <div>
        <label className="block text-xs font-black uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>Custom disclaimer (optional)</label>
        <input type="text" value={config?.disclaimer || ""} onChange={(e) => onChange({ ...config, disclaimer: e.target.value })} maxLength={200} placeholder="Default: 'Affiliate links — I may earn a small commission.'"
          className="w-full rounded p-2 text-sm" style={{ background: "var(--surface)", border: "1px solid var(--hairline)", color: "var(--text)" }} />
      </div>
    </div>
  );
}

export default { Render, Editor };
