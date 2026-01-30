import React from "react";
import { Link } from "react-router-dom";
import { Wand2, Languages, Search, Lightbulb, Image as ImageIcon, TrendingUp, BarChart2 } from "lucide-react";
import GridMatrix from "../animations/GridMatrix";


const tiles = [
  {
    to: "/roi-calculator",
    title: "YouTube ROI & CTR Calculator",
    desc: "Visualize potential revenue and growth lift from better click-through rates.",
    icon: Search,
    roles: ["admin", "editor", "client", "public"],
  },
  {
    to: "/tools/srt",
    title: "Auto SRT (Multi-Language)",
    desc: "Paste or upload transcript and export .srt — quick timing presets.",
    icon: Languages,
    roles: ["admin", "editor", "public"],
  },
  {
    to: "/tools/seo",
    title: "SEO Tool",
    desc: "10 titles, 1 high-CTR description, 15 tags. Export & copy.",
    icon: Search,
    roles: ["admin", "editor", "client", "public"],
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
    roles: ["admin"],
  },
  {
    to: "/tools/thumbnail-previewer",
    title: "Thumbnail A/B Previewer",
    desc: "Test how your designs look in YouTube search & Home grid.",
    icon: ImageIcon,
    roles: ["admin", "editor", "client", "public"],
  },
  {
    to: "/tools/thumbnail-tester",
    title: "Thumbnail A/B Tester",
    desc: "Vote simulator. Upload 2 designs and see which wins.",
    icon: BarChart2,
    roles: ["admin", "editor", "client", "public"],
  },
  {
    to: "/tools/comparison",
    title: "DIY vs Shinel ROI",
    desc: "See how much time and money you save by outsourcing to pro editors.",
    icon: TrendingUp,
    roles: ["admin", "editor", "client", "public"],
  },
];



export default function ToolsIndex() {
  const role = (localStorage.getItem("userRole") || "public").toLowerCase();
  const allowed = tiles.filter(t => t.roles.includes(role));

  return (
    <section style={{ background: "var(--surface)", position: "relative", overflow: "hidden", minHeight: "100vh" }}>
      {/* Grid Matrix Background Animation */}
      <GridMatrix
        color="#E85002"
        opacity={0.15}
        gridSize={50}
        nodeCount={15}
      />

      <div className="container mx-auto px-4 py-12 relative z-10">
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
