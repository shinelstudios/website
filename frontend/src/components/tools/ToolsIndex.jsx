import React from "react";
import { Link } from "react-router-dom";
import { Wand2, Languages, Search, Lightbulb } from "lucide-react";

const tiles = [
  {
    to: "/tools/srt",
    title: "Auto SRT (Multi-Language)",
    desc: "Paste or upload transcript and export .srt — quick timing presets.",
    icon: Languages,
    roles: ["admin", "editor"], // clients don’t see this
  },
  {
    to: "/tools/seo",
    title: "SEO Tool",
    desc: "10 titles, 1 high-CTR description, 15 tags. Export & copy.",
    icon: Search,
    roles: ["admin", "editor", "client"],
  },
  {
    to: "/tools/thumbnail-ideation",
    title: "Thumbnail Ideation",
    desc: "Punchy text concepts & composition prompts in 3 styles.",
    icon: Lightbulb,
    roles: ["admin", "editor", "client"],
  },
  {
    to: "/tools/custom-ais",
    title: "Custom AIs",
    desc: "Internal assistants & automations for Shinel Studios.",
    icon: Wand2,
    roles: ["admin"], // admin-only
  },
];

export default function ToolsIndex() {
  const role = (localStorage.getItem("userRole") || "").toLowerCase();
  const allowed = tiles.filter(t => t.roles.includes(role));

  return (
    <section style={{ background: "var(--surface)" }}>
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-3xl md:text-4xl font-bold font-['Poppins']" style={{ color: "var(--text)" }}>
          AI Tools
        </h1>
        <p className="mt-2 text-sm md:text-base" style={{ color: "var(--text-muted)" }}>
          Curated utilities to speed up editing, packaging and iteration.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-6">
          {allowed.map(({ to, title, desc, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="rounded-2xl p-5 border hover:-translate-y-0.5 transition"
              style={{ background: "var(--surface-alt)", borderColor: "var(--border)", color: "var(--text)" }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl grid place-items-center"
                     style={{ background: "rgba(232,80,2,0.10)", border: "1px solid var(--border)" }}>
                  <Icon size={18} style={{ color: "var(--orange)" }} />
                </div>
                <div className="font-semibold">{title}</div>
              </div>
              <div className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>{desc}</div>
            </Link>
          ))}
        </div>

        {allowed.length === 0 && (
          <div className="mt-6 rounded-xl p-4 border text-sm"
               style={{ background: "var(--surface-alt)", borderColor: "var(--border)", color: "var(--text-muted)" }}>
            Your role doesn’t have access to any tools yet.
          </div>
        )}
      </div>
    </section>
  );
}
