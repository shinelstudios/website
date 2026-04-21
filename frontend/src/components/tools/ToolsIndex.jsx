/**
 * ToolsIndex.jsx
 * 
 * About: Navigation hub and landing page for all specialized creator tools.
 * Features: Tool cards, Role-based visibility, Interactive grid of tools.
 */
import React from "react";
import { Link } from "react-router-dom";
import { Wand2, Languages, Search, Lightbulb, Image as ImageIcon, TrendingUp, BarChart2, Youtube, ArrowUpRight, Sparkles } from "lucide-react";
import GridMatrix from "../animations/GridMatrix";
import { Kicker, Eyebrow, Display, Lede, RevealOnScroll, HairlineCard } from "../../design";


// PHASE 2 · TODO — remaining tools per CLAUDE.md "Phase 2 roadmap" #3:
//   1. [DONE — /tools/thumbnail-clickability] "Is my thumbnail clickable?"
//      Client-side canvas analysis. No face-api.js (skipped the 1.5MB dep —
//      skin-tone cluster heuristic is enough for a first pass).
//   2. "Channel audit in 60s"         → paste YT channel URL, worker calls
//      the existing fetchYouTubeChannelInfo(), analyse last 20 videos,
//      return scored report + 3 fixes. New tile + route /tools/channel-audit.
//   3. "Content calendar starter"      → niche input, 30-day posting plan
//      with title/thumbnail concept pairs. LLM-free, template-driven.
//      New tile + route /tools/content-calendar.
// Add tiles to this array AND import the corresponding icon from lucide-react.
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
    roles: ["admin", "editor", "client", "public"],
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
    roles: ["admin", "editor", "client", "public"],
  },
  {
    to: "/tools/custom-ais",
    title: "Custom AIs",
    desc: "Internal assistants & automations for Shinel Studios.",
    icon: Wand2,
    roles: ["admin", "editor", "client", "public"],
  },
  {
    to: "/tools/thumbnail-previewer",
    title: "Thumbnail A/B Previewer",
    desc: "Test how your designs look in YouTube search & Home grid.",
    icon: ImageIcon,
    roles: ["admin", "editor", "client", "public"],
  },
  {
    to: "/tools/thumbnail-clickability",
    title: "Is my thumbnail clickable?",
    desc: "Upload, get a 0–100 score + 3 concrete fixes. Runs in your browser — nothing uploads.",
    icon: Sparkles,
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
  // YouTube Automated Captions — hidden. Requires a yt-dlp-capable backend at
  // CAPTIONS_API_URL; YouTube's 2025–2026 anti-bot blocks the pure-HTTP path
  // from Cloudflare Worker IPs. Re-enable by (a) pointing CAPTIONS_API_URL at a
  // running backend/server.js and (b) uncommenting this entry + the route in
  // App.jsx. Full context in the plan file / commit 00952c4.
  /* {
    to: "/tools/youtube-captions",
    title: "YouTube Automated Captions",
    desc: "Extract manual & auto-generated captions directly from any YouTube URL.",
    icon: Youtube,
    roles: ["admin", "editor", "client", "public"],
  }, */
];



export default function ToolsIndex() {
  const roleLS = (localStorage.getItem("role") || localStorage.getItem("userRole") || "public").toLowerCase();
  const allowed = tiles.filter(t => t.roles.includes(roleLS));

  return (
    <section style={{ background: "var(--surface)", position: "relative", overflow: "hidden", minHeight: "100vh" }}>
      {/* Grid Matrix Background Animation */}
      <GridMatrix color="#E85002" opacity={0.15} gridSize={50} nodeCount={15} />

      <div className="container mx-auto px-4 md:px-6 pt-24 md:pt-32 pb-16 relative z-10">
        {/* Editorial hero */}
        <div className="max-w-3xl mb-10 md:mb-14">
          <RevealOnScroll>
            <Kicker className="mb-5">Free Tools</Kicker>
          </RevealOnScroll>
          <RevealOnScroll delay="80ms">
            <Display as="h1" size="xl" className="mb-5">
              Creator utilities <span style={{ color: "var(--orange)" }}>on the house.</span>
            </Display>
          </RevealOnScroll>
          <RevealOnScroll delay="160ms">
            <Lede>
              SEO titles, thumbnail A/B previews, ROI math, SRT captions, and
              more \u2014 built by the Shinel team, free for every creator. No signup,
              no rate caps, no email harvest.
            </Lede>
          </RevealOnScroll>
        </div>

        <div className="flex items-end justify-between gap-3 mb-6">
          <Eyebrow>All tools</Eyebrow>
          <span className="text-meta" style={{ color: "var(--text-muted)" }}>
            {allowed.length} available
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {allowed.map(({ to, title, desc, icon: Icon }, i) => (
            <RevealOnScroll key={to} delay={`${(i % 6) * 60}ms`}>
              <HairlineCard
                as={Link}
                to={to}
                interactive
                className="block p-6 group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div
                    className="w-11 h-11 rounded-xl grid place-items-center"
                    style={{
                      background: "var(--orange-soft)",
                      border: "1px solid var(--hairline)",
                    }}
                  >
                    <Icon size={18} style={{ color: "var(--orange)" }} />
                  </div>
                  <ArrowUpRight
                    size={16}
                    className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                    style={{ color: "var(--text-muted)" }}
                  />
                </div>
                <div className="text-display-sm mb-2">{title}</div>
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
                  {desc}
                </p>
              </HairlineCard>
            </RevealOnScroll>
          ))}
        </div>

        {allowed.length === 0 && (
          <div className="mt-6 surface-card p-6 text-sm" style={{ color: "var(--text-muted)" }}>
            Your role doesn\u2019t have access to any tools yet.
          </div>
        )}
      </div>
    </section>
  );
}
