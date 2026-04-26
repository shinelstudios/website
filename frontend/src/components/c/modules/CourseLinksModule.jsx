import React from "react";
import { HairlineCard } from "../../../design";
import {
  BookOpen, MessageCircle, Heart, Send, Globe, ChevronRight,
} from "lucide-react";

const PLATFORM_ICONS = {
  course: BookOpen, patreon: Heart, discord: MessageCircle, telegram: Send, website: Globe, generic: Globe,
};
const PLATFORM_OPTIONS = Object.keys(PLATFORM_ICONS);

function Render({ config }) {
  const items = Array.isArray(config?.items) ? config.items : [];
  if (items.length === 0) return null;
  return (
    <HairlineCard className="p-5 md:p-6">
      <h3 className="text-lg md:text-xl font-black mb-4" style={{ color: "var(--text)" }}>
        {config?.headline || "Go deeper"}
      </h3>
      <div className="space-y-2">
        {items.slice(0, 6).map((it, i) => {
          const Icon = PLATFORM_ICONS[it.platform] || Globe;
          return (
            <a
              key={i}
              href={it.url || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 rounded-lg transition-transform hover:-translate-y-0.5 active:translate-y-0"
              style={{ background: "var(--surface)", border: "1px solid var(--hairline)", minHeight: 56 }}
            >
              <span className="w-10 h-10 rounded-lg grid place-items-center shrink-0" style={{ background: "rgba(232,80,2,0.12)", color: "var(--orange)" }}>
                <Icon size={18} />
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm leading-tight" style={{ color: "var(--text)" }}>{it.label || "Link"}</p>
                {it.description ? (
                  <p className="text-xs mt-0.5 truncate" style={{ color: "var(--text-muted)" }}>{it.description}</p>
                ) : null}
              </div>
              <ChevronRight size={16} style={{ color: "var(--text-muted)" }} className="shrink-0" />
            </a>
          );
        })}
      </div>
    </HairlineCard>
  );
}

function Editor({ config, onChange }) {
  const items = Array.isArray(config?.items) ? config.items : [];
  const updateItem = (i, patch) => { const next = items.slice(); next[i] = { ...next[i], ...patch }; onChange({ ...config, items: next }); };
  const removeItem = (i) => { const next = items.slice(); next.splice(i, 1); onChange({ ...config, items: next }); };
  const addItem = () => {
    if (items.length >= 6) return;
    onChange({ ...config, items: [...items, { platform: "course", label: "", description: "", url: "" }] });
  };
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-black uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>Headline</label>
        <input type="text" value={config?.headline || ""} onChange={(e) => onChange({ ...config, headline: e.target.value })} maxLength={60} placeholder="Go deeper"
          className="w-full rounded p-2 text-sm" style={{ background: "var(--surface)", border: "1px solid var(--hairline)", color: "var(--text)" }} />
      </div>
      <div>
        <label className="block text-xs font-black uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>Items (max 6)</label>
        {items.map((it, i) => (
          <div key={i} className="space-y-2 mb-3 p-3 rounded" style={{ background: "var(--surface)", border: "1px solid var(--hairline)" }}>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              <select value={it.platform || "course"} onChange={(e) => updateItem(i, { platform: e.target.value })}
                className="rounded p-2 text-sm" style={{ background: "var(--surface-alt)", border: "1px solid var(--hairline)", color: "var(--text)" }}>
                {PLATFORM_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
              <input placeholder="Label" value={it.label || ""} onChange={(e) => updateItem(i, { label: e.target.value })} maxLength={60}
                className="md:col-span-3 rounded p-2 text-sm" style={{ background: "var(--surface-alt)", border: "1px solid var(--hairline)", color: "var(--text)" }} />
            </div>
            <input placeholder="Description (optional)" value={it.description || ""} onChange={(e) => updateItem(i, { description: e.target.value })} maxLength={120}
              className="w-full rounded p-2 text-sm" style={{ background: "var(--surface-alt)", border: "1px solid var(--hairline)", color: "var(--text)" }} />
            <div className="flex gap-2">
              <input placeholder="URL" value={it.url || ""} onChange={(e) => updateItem(i, { url: e.target.value })} maxLength={500}
                className="flex-1 rounded p-2 text-sm" style={{ background: "var(--surface-alt)", border: "1px solid var(--hairline)", color: "var(--text)" }} />
              <button type="button" onClick={() => removeItem(i)} className="text-xs font-black uppercase tracking-widest px-3" style={{ color: "var(--text-muted)" }}>Remove</button>
            </div>
          </div>
        ))}
        <button type="button" onClick={addItem} disabled={items.length >= 6} className="text-xs font-black uppercase tracking-widest px-4 py-2 rounded disabled:opacity-40" style={{ background: "var(--orange)", color: "#fff" }}>
          Add item {items.length}/6
        </button>
      </div>
    </div>
  );
}

export default { Render, Editor };
