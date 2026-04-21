/**
 * ServicesMatrix — "Everything we ship, under one roof".
 *
 * Three bento cards (GFX · Video Editing · Channel/SEO) with a bottom
 * ribbon calling out the AI + automation woven across all of them.
 *
 * Card previews use real inventory data (first few thumbnails/videos that
 * are Shinel-attributed) so the page feels alive on first paint. If the
 * API fetch is still pending, each card gracefully falls back to a
 * branded placeholder via the <img> onError handler.
 */
import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Palette,
  Film,
  LineChart,
  ArrowUpRight,
  Sparkles,
} from "lucide-react";
import { Section, Kicker, Display, Lede, RevealOnScroll } from "../../design";

const YT_THUMB = (id) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

function pickPreviews(items, count) {
  const src = (p) => (p.videoId ? YT_THUMB(p.videoId) : p.image);
  return items
    .filter((p) => src(p))
    .slice(0, count)
    .map((p) => ({ src: src(p), alt: p.title || "" }));
}

function Chip({ children }) {
  return (
    <span
      className="inline-flex items-center text-[11px] md:text-xs font-bold px-2.5 py-1 rounded-full hairline whitespace-nowrap"
      style={{ color: "var(--text)", background: "var(--surface-alt)" }}
    >
      {children}
    </span>
  );
}

function PreviewStack({ previews, accent }) {
  // Three overlapping stacked thumbnails for a subtle "we ship a lot" vibe.
  const fallback = "https://placehold.co/400x225/0A0A0A/E85002?text=Shinel";
  const items = previews.length
    ? previews
    : [{ src: fallback }, { src: fallback }, { src: fallback }];

  return (
    <div className="relative w-full" style={{ aspectRatio: "16 / 9" }}>
      {items.slice(0, 3).map((p, i) => (
        <div
          key={i}
          className="absolute rounded-lg md:rounded-xl overflow-hidden hairline"
          style={{
            inset: 0,
            transform:
              i === 0 ? "translate(-6%, -6%) rotate(-3deg)" :
              i === 1 ? "translate(0, 0) rotate(0deg)" :
                        "translate(6%, 6%) rotate(3deg)",
            zIndex: 10 - i,
            boxShadow: i === 1 ? `0 12px 30px ${accent}33` : "0 4px 12px rgba(0,0,0,0.25)",
            background: "var(--surface-alt)",
          }}
        >
          <img
            src={p.src}
            alt={p.alt || ""}
            loading="lazy"
            decoding="async"
            className="block w-full h-full object-cover"
            onError={(e) => { e.currentTarget.src = fallback; }}
          />
        </div>
      ))}
    </div>
  );
}

function AnalyticsGraphic({ accent }) {
  // Hand-built SVG so we don't leak real client analytics.
  return (
    <div
      className="relative w-full rounded-xl md:rounded-2xl overflow-hidden hairline"
      style={{ aspectRatio: "16 / 9", background: "var(--surface-alt)" }}
    >
      <svg viewBox="0 0 320 180" className="block w-full h-full">
        <defs>
          <linearGradient id="graph-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={accent} stopOpacity="0.4" />
            <stop offset="1" stopColor={accent} stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* subtle grid */}
        <g stroke="currentColor" strokeOpacity="0.08" strokeWidth="1">
          <line x1="0" y1="40"  x2="320" y2="40"/>
          <line x1="0" y1="80"  x2="320" y2="80"/>
          <line x1="0" y1="120" x2="320" y2="120"/>
        </g>
        {/* area */}
        <path
          d="M 10 150 L 50 130 L 90 138 L 130 110 L 170 90 L 210 72 L 250 56 L 290 34 L 310 30 L 310 170 L 10 170 Z"
          fill="url(#graph-grad)"
        />
        {/* line */}
        <path
          d="M 10 150 L 50 130 L 90 138 L 130 110 L 170 90 L 210 72 L 250 56 L 290 34 L 310 30"
          fill="none"
          stroke={accent}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* nodes */}
        {[50, 130, 210, 290].map((x, i) => (
          <circle key={i} cx={x} cy={[130, 110, 72, 34][i]} r="3" fill={accent}/>
        ))}
      </svg>
      <div
        className="absolute top-3 right-3 flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full"
        style={{ background: accent, color: "#0a0a0a" }}
      >
        <LineChart size={10} strokeWidth={3} />
        LIVE
      </div>
    </div>
  );
}

function Card({ icon: Icon, title, chips, href, cta, children }) {
  return (
    <article
      className="group relative flex flex-col gap-4 p-5 md:p-6 rounded-2xl md:rounded-3xl hairline h-full"
      style={{ background: "var(--surface)" }}
    >
      {children}

      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl grid place-items-center"
          style={{ background: "var(--orange-soft)", color: "var(--orange)" }}
        >
          <Icon size={18} strokeWidth={2.5} />
        </div>
        <h3 className="text-xl md:text-2xl font-black" style={{ color: "var(--text)" }}>
          {title}
        </h3>
      </div>

      <ul className="flex flex-wrap gap-1.5">
        {chips.map((c) => (
          <li key={c}><Chip>{c}</Chip></li>
        ))}
      </ul>

      <Link
        to={href}
        className="inline-flex items-center gap-1 text-sm font-black uppercase tracking-[0.15em] mt-auto focus-visible:ring-2 focus-visible:ring-[var(--orange)] rounded"
        style={{ color: "var(--orange)" }}
      >
        {cta}
        <ArrowUpRight
          size={14}
          className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
        />
      </Link>
    </article>
  );
}

export default function ServicesMatrix({ projects = [] }) {
  const videos = useMemo(() => projects.filter((p) => p.kind === "video"), [projects]);
  const gfx    = useMemo(() => projects.filter((p) => p.kind === "gfx"), [projects]);

  const gfxPreviews = useMemo(() => pickPreviews(gfx, 3), [gfx]);
  const videoPreviews = useMemo(() => pickPreviews(videos, 3), [videos]);

  return (
    <Section size="md" tone="alt" hairlineTop hairlineBot>
      <RevealOnScroll><Kicker>What we ship</Kicker></RevealOnScroll>
      <RevealOnScroll delay="80ms">
        <Display as="h2" size="lg" className="mt-2 mb-3">
          Every piece of the creative stack,{" "}
          <span style={{ color: "var(--orange)" }}>under one roof.</span>
        </Display>
      </RevealOnScroll>
      <RevealOnScroll delay="160ms">
        <Lede className="max-w-2xl mb-10">
          GFX, video editing, and SEO / channel work — and AI woven through every
          lane, not bolted on. Pick the one you need or ship the whole line.
        </Lede>
      </RevealOnScroll>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
        <RevealOnScroll delay="80ms">
          <Card
            icon={Palette}
            title="GFX"
            chips={[
              "Instagram posts",
              "Logos",
              "Thumbnails",
              "Shorts / reel covers",
              "Community posts",
              "Channel art",
            ]}
            href="/graphic-design"
            cta="See GFX work"
          >
            <PreviewStack previews={gfxPreviews} accent="#E85002" />
          </Card>
        </RevealOnScroll>

        <RevealOnScroll delay="160ms">
          <Card
            icon={Film}
            title="Video Editing"
            chips={[
              "Short-form",
              "Long-form",
              "Podcast edits",
              "Gaming edits",
              "Documentary",
              "Reels",
            ]}
            href="/video-editing"
            cta="See edits"
          >
            <PreviewStack previews={videoPreviews} accent="#E85002" />
          </Card>
        </RevealOnScroll>

        <RevealOnScroll delay="240ms">
          <Card
            icon={LineChart}
            title="Channel / SEO"
            chips={[
              "Channel management",
              "Video controlling",
              "Uploads",
              "Scheduling",
              "Thumbnail A/B",
              "Analytics",
            ]}
            href="/work#reel"
            cta="See the work"
          >
            <AnalyticsGraphic accent="#E85002" />
          </Card>
        </RevealOnScroll>
      </div>

      {/* AI ribbon */}
      <RevealOnScroll delay="200ms">
        <div
          className="mt-6 md:mt-8 flex flex-wrap items-center gap-x-4 gap-y-2 px-4 md:px-5 py-4 rounded-2xl hairline"
          style={{ background: "var(--surface)" }}
        >
          <span className="inline-flex items-center gap-2 font-black text-sm md:text-base" style={{ color: "var(--text)" }}>
            <Sparkles size={16} style={{ color: "var(--orange)" }} />
            AI + automation, woven through every service
          </span>
          <span className="hidden md:inline" style={{ color: "var(--text-muted)" }}>·</span>
          <span className="text-xs md:text-sm" style={{ color: "var(--text-muted)" }}>
            script polish · thumbnail ideation · auto-captions · beat-matching · transcript cleanup · SEO hinting
          </span>
        </div>
      </RevealOnScroll>
    </Section>
  );
}
