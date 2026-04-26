import React from "react";
import { HairlineCard } from "../../../design";
import {
  Link as LinkIcon, Youtube, Instagram, Twitter, Globe, Music,
  ShoppingBag, Calendar, Mail, BookOpen, MessageCircle, Heart, Trophy,
} from "lucide-react";

const ICON_MAP = {
  link: LinkIcon, youtube: Youtube, instagram: Instagram, twitter: Twitter,
  website: Globe, spotify: Music, shop: ShoppingBag, calendly: Calendar,
  email: Mail, course: BookOpen, discord: MessageCircle, heart: Heart, trophy: Trophy,
};
const ICON_OPTIONS = Object.keys(ICON_MAP);

function safeUrl(u) {
  const s = String(u || "").trim();
  if (!s) return "";
  if (s.startsWith("http://") || s.startsWith("https://") || s.startsWith("mailto:") || s.startsWith("tel:")) return s;
  return `https://${s}`;
}

function Render({ config }) {
  const links = Array.isArray(config?.links) ? config.links : [];
  if (!links.length) return null;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {links.map((l, i) => {
        const Icon = ICON_MAP[l.icon] || LinkIcon;
        return (
          <a
            key={i}
            href={safeUrl(l.url)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-left font-bold transition-transform hover:-translate-y-0.5 active:translate-y-0"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--hairline)",
              color: "var(--text)",
              minHeight: 56,
            }}
          >
            <span
              className="w-9 h-9 rounded-lg grid place-items-center shrink-0"
              style={{ background: "rgba(232,80,2,0.12)", color: "var(--orange)" }}
            >
              <Icon size={18} />
            </span>
            <span className="truncate">{l.label}</span>
          </a>
        );
      })}
    </div>
  );
}

function Editor({ config, onChange }) {
  const links = Array.isArray(config?.links) ? config.links : [];
  const update = (i, patch) => {
    const next = links.slice();
    next[i] = { ...next[i], ...patch };
    onChange({ ...config, links: next });
  };
  const remove = (i) => {
    const next = links.slice();
    next.splice(i, 1);
    onChange({ ...config, links: next });
  };
  const add = () => {
    if (links.length >= 10) return;
    onChange({ ...config, links: [...links, { label: "", url: "", icon: "link" }] });
  };
  return (
    <div className="space-y-3">
      {links.map((l, i) => (
        <div key={i} className="flex flex-col md:flex-row gap-2 items-stretch md:items-center p-3 rounded-lg" style={{ background: "var(--surface)", border: "1px solid var(--hairline)" }}>
          <select
            value={l.icon || "link"}
            onChange={(e) => update(i, { icon: e.target.value })}
            className="rounded p-2 text-sm md:w-32"
            style={{ background: "var(--surface-alt)", border: "1px solid var(--hairline)", color: "var(--text)" }}
          >
            {ICON_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
          <input
            type="text"
            value={l.label || ""}
            onChange={(e) => update(i, { label: e.target.value })}
            maxLength={60}
            placeholder="Label (e.g. Subscribe on YouTube)"
            className="flex-1 rounded p-2 text-sm"
            style={{ background: "var(--surface-alt)", border: "1px solid var(--hairline)", color: "var(--text)" }}
          />
          <input
            type="url"
            value={l.url || ""}
            onChange={(e) => update(i, { url: e.target.value })}
            maxLength={500}
            placeholder="https://…"
            className="flex-1 rounded p-2 text-sm"
            style={{ background: "var(--surface-alt)", border: "1px solid var(--hairline)", color: "var(--text)" }}
          />
          <button
            type="button"
            onClick={() => remove(i)}
            className="text-xs font-black uppercase tracking-widest px-3 py-2 rounded"
            style={{ background: "transparent", border: "1px solid var(--hairline)", color: "var(--text-muted)" }}
          >
            Remove
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        disabled={links.length >= 10}
        className="text-xs font-black uppercase tracking-widest px-4 py-2 rounded disabled:opacity-40"
        style={{ background: "var(--orange)", color: "#fff" }}
      >
        Add link {links.length}/10
      </button>
    </div>
  );
}

export default { Render, Editor };
