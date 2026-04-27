/**
 * SpecialtyPageTemplate — shared microsite template used by the three
 * AI specialty sub-pages: /work/ai-music, /work/ai-tattoo, /work/ai-gfx.
 *
 * Driven by a config object from `src/config/specialties.js`. Same
 * shape, different content + palette; the per-specialty palette floods
 * the entire layout (not just the hero CTA), so each page reads as a
 * distinct room rather than one template stamped three times.
 *
 * Section order (v2 redesign):
 *   1. Cinematic hero: palette aurora + parallax SVG art + ken-burns
 *   2. Live numbers band (3 NumberTickIn counters from /api/specialty/:slug/stats)
 *   3. Sample strip — big tiles with auto-peek captions
 *   4. Services as a hairline-separated competence list
 *   5. Process as a vertical timeline with palette accent rail
 *   6. Pricing as a typographic statement (no card)
 *   7. Related specialties
 *   8. Final CTA band with grain overlay
 *
 * Per-specialty signature mini-motif (SignatureMotif) is the gutter
 * decoration; the parallax hero is the page's *one* signature ambient
 * motion per CLAUDE.md contract.
 */
import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, CheckCircle2, ImageIcon, Play, X } from "lucide-react";
import MetaTags, { BreadcrumbSchema } from "../MetaTags";
import {
  Section,
  Kicker,
  Display,
  Lede,
  RevealOnScroll,
  GrainOverlay,
  NumberTickIn,
  useReducedMotion,
  useInView,
} from "../../design";
import { SPECIALTIES, SPECIALTY_SAMPLES } from "../../config/specialties";
import SpecialtyCard from "./SpecialtyCard";
import KineticVerb from "./KineticVerb";
import { AUTH_BASE } from "../../config/constants";
import { resolveMediaUrl, formatCompactNumber } from "../../utils/formatters";
import { extractYouTubeId } from "../../utils/youtube";

// Pull the shortcode out of any public IG reel/post URL. Same shape as
// the worker-side helper. Returns "" when the URL isn't recognisable.
function extractIgShortcode(raw) {
  if (!raw || typeof raw !== "string") return "";
  const m = raw.match(/instagram\.com\/(?:reel|reels|p|tv)\/([A-Za-z0-9_-]{5,40})/i);
  return m ? m[1] : "";
}

/* ============================================================================
 * Per-specialty hero artwork. Same SVG primitives as v1 but tuned to read
 * larger inside the parallax wrapper.
 * ========================================================================= */
function HeroArt({ slug, palette }) {
  const common = "absolute inset-0 w-full h-full pointer-events-none";
  if (slug === "ai-music") {
    return (
      <svg viewBox="0 0 400 400" className={common} aria-hidden="true">
        <defs>
          <radialGradient id="m-g" cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor={palette.accent} stopOpacity="0.55" />
            <stop offset="1" stopColor={palette.accent} stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="200" cy="200" r="180" fill="url(#m-g)" />
        {Array.from({ length: 80 }, (_, i) => {
          const t = (i / 80) * Math.PI * 2;
          const r = 100 + Math.sin(i * 0.7) * 30;
          const x1 = 200 + Math.cos(t) * 70;
          const y1 = 200 + Math.sin(t) * 70;
          const x2 = 200 + Math.cos(t) * r;
          const y2 = 200 + Math.sin(t) * r;
          return (
            <line
              key={i}
              x1={x1} y1={y1} x2={x2} y2={y2}
              stroke={palette.accent}
              strokeOpacity={0.4 + (Math.sin(i * 0.3) * 0.3)}
              strokeWidth="2"
              strokeLinecap="round"
            />
          );
        })}
      </svg>
    );
  }
  if (slug === "ai-tattoo") {
    return (
      <svg viewBox="0 0 400 400" className={common} aria-hidden="true">
        <defs>
          <radialGradient id="t-g" cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor={palette.accent} stopOpacity="0.5" />
            <stop offset="1" stopColor={palette.accent} stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="200" cy="200" r="180" fill="url(#t-g)" />
        <g stroke={palette.accent} strokeWidth="3" fill="none" strokeLinecap="round">
          <path d="M80 260 C 130 140, 200 90, 270 140 C 330 180, 340 260, 300 320" strokeOpacity="0.75" />
          <path d="M60 200 C 110 120, 250 100, 320 160" strokeOpacity="0.45" />
          <path d="M120 320 C 170 260, 230 240, 310 280" strokeOpacity="0.55" />
          <circle cx="200" cy="200" r="14" fill={palette.accent} fillOpacity="0.85" />
          <circle cx="200" cy="200" r="38" strokeOpacity="0.65" />
        </g>
      </svg>
    );
  }
  // ai-gfx — iridescent stack
  return (
    <svg viewBox="0 0 400 400" className={common} aria-hidden="true">
      <defs>
        <radialGradient id="g-g" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor={palette.accent} stopOpacity="0.5" />
          <stop offset="1" stopColor={palette.accent} stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="200" cy="200" r="180" fill="url(#g-g)" />
      <g fill="none" stroke={palette.accent} strokeWidth="2.5">
        {[0, 1, 2, 3, 4].map((i) => (
          <rect
            key={i}
            x={120 + i * 10}
            y={120 + i * 10}
            width={160 - i * 20}
            height={160 - i * 20}
            strokeOpacity={0.3 + i * 0.12}
            transform={`rotate(${i * 4} 200 200)`}
          />
        ))}
      </g>
    </svg>
  );
}

/* ============================================================================
 * PaletteAurora — palette-tinted ambient backdrop for the hero. A single
 * blurred radial blob sized larger than the viewport, drifting on scroll
 * via transform: translate3d (no layout work). Paused off-screen and on
 * prefers-reduced-motion. This is the page's signature ambient motion.
 * ========================================================================= */
function PaletteAurora({ palette }) {
  const reduce = useReducedMotion();
  const [ref, inView] = useInView({ once: false, threshold: 0.0 });
  const blobRef = React.useRef(null);
  const rafRef = React.useRef(0);

  React.useEffect(() => {
    if (reduce || !inView) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }
    let lastY = -1;
    const loop = () => {
      const y = window.scrollY;
      if (y !== lastY && blobRef.current) {
        const el = blobRef.current;
        const t = y * 0.18;          // gentle parallax
        const s = 1 + Math.min(0.04, y / 12000); // very subtle scale up
        el.style.transform = `translate3d(${t * 0.3}px, ${t}px, 0) scale(${s})`;
        lastY = y;
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [reduce, inView]);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="absolute inset-0 overflow-hidden pointer-events-none"
    >
      <div
        ref={blobRef}
        className="absolute will-change-transform"
        style={{
          top: "-30%",
          right: "-20%",
          width: "120%",
          height: "120%",
          background: `radial-gradient(closest-side, ${palette.accent}55, ${palette.accent}11 45%, transparent 70%)`,
          filter: "blur(20px)",
        }}
      />
      <div
        aria-hidden="true"
        className="absolute"
        style={{
          bottom: "-25%",
          left: "-15%",
          width: "70%",
          height: "70%",
          background: `radial-gradient(closest-side, ${palette.accentDeep}33, transparent 70%)`,
          filter: "blur(16px)",
        }}
      />
    </div>
  );
}

/* ============================================================================
 * SignatureMotif — tiny per-specialty SVG decoration in the gutter.
 * - ai-music: 3 thin equaliser bars pulsing
 * - ai-tattoo: ink-drip line glyph
 * - ai-gfx: floating geometric shapes
 * All transform/opacity only, paused on reduced-motion.
 * ========================================================================= */
function SignatureMotif({ slug, palette, position = "br" }) {
  const reduce = useReducedMotion();
  const positionClass =
    position === "br" ? "bottom-6 right-6" :
    position === "bl" ? "bottom-6 left-6" :
    position === "tr" ? "top-6 right-6" :
                        "top-6 left-6";

  if (slug === "ai-music") {
    return (
      <div className={`absolute ${positionClass} pointer-events-none flex items-end gap-1.5 h-12`} aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="block w-1 rounded-full"
            style={{
              background: palette.accent,
              opacity: 0.85,
              height: "60%",
              transformOrigin: "bottom",
              animation: reduce
                ? "none"
                : `eqPulse 1.4s cubic-bezier(.4,0,.6,1) ${i * 0.18}s infinite`,
            }}
          />
        ))}
        <style>{`
          @keyframes eqPulse {
            0%, 100% { transform: scaleY(0.4); }
            50%      { transform: scaleY(1); }
          }
        `}</style>
      </div>
    );
  }

  if (slug === "ai-tattoo") {
    return (
      <svg
        className={`absolute ${positionClass} pointer-events-none`}
        width="56" height="80" viewBox="0 0 56 80" aria-hidden="true"
      >
        <g stroke={palette.accent} strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.6">
          <path d="M28 4 C 24 22, 32 36, 28 52 C 26 60, 30 68, 28 76" />
          <circle cx="28" cy="76" r="2" fill={palette.accent} />
          <circle cx="28" cy="68" r="1" fill={palette.accent} opacity="0.6" />
        </g>
      </svg>
    );
  }

  // ai-gfx — small floating geo shapes
  return (
    <div className={`absolute ${positionClass} pointer-events-none w-20 h-20`} aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="absolute"
          style={{
            top: `${10 + i * 24}%`,
            left: `${i * 30}%`,
            width: 14 - i * 2,
            height: 14 - i * 2,
            border: `1.5px solid ${palette.accent}`,
            opacity: 0.7 - i * 0.15,
            borderRadius: i === 0 ? "999px" : i === 1 ? "2px" : "0",
            transform: i === 2 ? "rotate(45deg)" : "none",
            animation: reduce ? "none" : `gfxFloat ${4 + i}s ease-in-out infinite`,
            animationDelay: `${i * 0.3}s`,
          }}
        />
      ))}
      <style>{`
        @keyframes gfxFloat {
          0%, 100% { transform: translate3d(0, 0, 0) rotate(0deg); }
          50%      { transform: translate3d(2px, -6px, 0) rotate(8deg); }
        }
      `}</style>
    </div>
  );
}

/* ============================================================================
 * LiveNumbersBand — three counters under the hero. Hits
 * /api/specialty/:slug/stats; falls back to sensible static defaults
 * synchronously so the band never renders empty on a cold cache.
 * ========================================================================= */
function LiveNumbersBand({ slug, palette }) {
  const [stats, setStats] = React.useState({
    samples: 0,
    totalViews: 0,
    turnaroundDays: 2,
  });
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    fetch(`${AUTH_BASE}/api/specialty/${encodeURIComponent(slug)}/stats`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d) return;
        setStats({
          samples: Number(d.samples || 0),
          totalViews: Number(d.totalViews || 0),
          turnaroundDays: Number(d.turnaroundDays || 2),
        });
        setLoaded(true);
      })
      .catch(() => { /* silent; static fallback stays */ });
    return () => { cancelled = true; };
  }, [slug]);

  const shouldAnimate = loaded && (stats.samples > 0 || stats.totalViews > 0);

  return (
    <Section size="md" tone="alt" hairlineTop hairlineBot>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-10">
        {[
          {
            label: "Samples shipped",
            value: stats.samples,
            formatter: undefined,
            suffix: "",
          },
          {
            label: "Audience reach",
            value: stats.totalViews,
            formatter: "compact",
            suffix: " views",
          },
          {
            label: "Fastest turnaround",
            value: stats.turnaroundDays,
            formatter: undefined,
            suffix: " days",
          },
        ].map((stat, i) => (
          <RevealOnScroll key={stat.label} delay={`${80 + i * 80}ms`}>
            <div className="flex flex-col items-start gap-2">
              <span
                className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.25em]"
                style={{ color: palette.accent }}
              >
                {stat.label}
              </span>
              <span
                className="font-black leading-[0.95] tracking-tight"
                style={{
                  color: "var(--text)",
                  fontSize: "clamp(2.5rem, 5vw, 4rem)",
                  textShadow: `0 0 40px ${palette.glow}`,
                }}
              >
                {shouldAnimate ? (
                  <NumberTickIn
                    to={stat.value}
                    formatter={stat.formatter}
                    suffix={stat.suffix}
                  />
                ) : (
                  // Static fallback before live data arrives — keep the
                  // suffix visible so the layout doesn't shift.
                  <>
                    {stat.formatter === "compact"
                      ? formatCompactNumber(stat.value)
                      : String(stat.value)}
                    {stat.suffix}
                  </>
                )}
              </span>
            </div>
          </RevealOnScroll>
        ))}
      </div>
    </Section>
  );
}

/* ============================================================================
 * SampleStrip — bigger tiles with auto-peek captions on a 6s rotation.
 * Pauses off-screen + tab-hidden + reduced-motion. Hover (desktop) keeps
 * the caption visible. Mobile shows captions by default so the tap-to-play
 * affordance stays obvious.
 * ========================================================================= */
function SampleStrip({ samples, palette, onPlay }) {
  const reduce = useReducedMotion();
  const [peekIdx, setPeekIdx] = React.useState(-1);
  const [stripRef, stripInView] = useInView({ once: false, threshold: 0.2 });
  const timerRef = React.useRef(null);

  React.useEffect(() => {
    if (reduce || !stripInView || !samples?.length) return;
    let alive = true;
    let visible = true;
    const onVis = () => { visible = !document.hidden; };
    document.addEventListener("visibilitychange", onVis);

    const tick = () => {
      if (!alive) return;
      if (visible) {
        setPeekIdx(Math.floor(Math.random() * samples.length));
      }
      timerRef.current = setTimeout(() => {
        setPeekIdx(-1);
        timerRef.current = setTimeout(tick, 3500);
      }, 2500);
    };
    timerRef.current = setTimeout(tick, 4000);
    return () => {
      alive = false;
      document.removeEventListener("visibilitychange", onVis);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [reduce, stripInView, samples?.length]);

  if (!samples || samples.length === 0) {
    return (
      <div
        className="rounded-2xl md:rounded-3xl p-8 md:p-12 text-center hairline"
        style={{ background: "var(--surface)" }}
      >
        <div
          className="mx-auto w-14 h-14 rounded-2xl grid place-items-center mb-4"
          style={{ background: palette.accentSoft, color: palette.accent }}
          aria-hidden="true"
        >
          <ImageIcon size={22} />
        </div>
        <h3 className="text-xl md:text-2xl font-black mb-2" style={{ color: "var(--text)" }}>
          Fresh pieces incoming.
        </h3>
        <p className="max-w-md mx-auto text-sm md:text-base" style={{ color: "var(--text-muted)" }}>
          We're uploading our latest. For our most recent work on this lane,
          drop us a DM — we'll send a reel within the hour.
        </p>
      </div>
    );
  }

  return (
    <ul
      ref={stripRef}
      className="flex gap-4 md:gap-6 overflow-x-auto snap-x snap-mandatory -mx-4 md:mx-0 px-4 md:px-0 pb-4"
      style={{ scrollbarWidth: "thin" }}
    >
      {samples.map((s, i) => {
        const isShort = (s.ratio || "").replace(/\s/g, "") === "9/16";
        const cellWidth = isShort
          ? "w-[70%] md:w-[290px]"
          : "w-[90%] md:w-[480px]";
        const isPeeking = peekIdx === i;
        const bestViews = Math.max(s.views || 0, s.igViews || 0);

        const inner = (
          <div className="relative w-full overflow-hidden rounded-xl md:rounded-2xl group">
            <div
              className="relative w-full"
              style={{ aspectRatio: s.ratio || "16 / 9" }}
            >
              <img
                src={s.src}
                alt={s.alt || ""}
                loading="lazy"
                decoding="async"
                className="block w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                style={{ filter: "saturate(1.05)" }}
              />
              {s.playable && (
                <div className="absolute inset-0 grid place-items-center" aria-hidden="true">
                  <span
                    className="grid place-items-center w-14 h-14 md:w-16 md:h-16 rounded-full backdrop-blur-md transition-transform duration-300 group-hover:scale-110"
                    style={{
                      background: palette.accent,
                      color: "#0a0a0a",
                      boxShadow: `0 8px 24px ${palette.glow}`,
                    }}
                  >
                    <Play size={22} fill="#0a0a0a" strokeWidth={0} />
                  </span>
                </div>
              )}

              {/* Caption overlay — peek-cycle on desktop, always visible
                  on mobile (md:hidden flips it). */}
              <div
                className={`absolute inset-x-0 bottom-0 p-3 md:p-4 bg-gradient-to-t from-black/90 via-black/60 to-transparent transition-opacity duration-500 md:opacity-0 md:group-hover:opacity-100 ${isPeeking ? "md:!opacity-100" : ""}`}
                style={{
                  transitionTimingFunction: "cubic-bezier(.4,0,.2,1)",
                }}
              >
                <div className="text-xs md:text-sm font-black text-white leading-snug line-clamp-2">
                  {s.alt || ""}
                </div>
                {bestViews > 0 && (
                  <div
                    className="mt-1 inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.18em]"
                    style={{ color: palette.accent }}
                  >
                    <Play size={9} fill="currentColor" strokeWidth={0} />
                    {formatCompactNumber(bestViews)} views
                  </div>
                )}
              </div>
            </div>
          </div>
        );

        const cellClasses = `snap-start shrink-0 ${cellWidth}`;

        if (s.playable && (s.videoId || s.igCode)) {
          const playPayload = s.videoId
            ? { source: "youtube", videoId: s.videoId, isShort, title: s.alt }
            : { source: "instagram", igCode: s.igCode, isShort: true, title: s.alt };
          return (
            <li key={i} className={cellClasses}>
              <button
                type="button"
                onClick={() => onPlay(playPayload)}
                className="block w-full text-left rounded-xl md:rounded-2xl focus-visible:ring-2 focus-visible:ring-[var(--orange)]"
                aria-label={`Play ${s.alt || "sample"}`}
              >
                {inner}
              </button>
            </li>
          );
        }

        if (s.href) {
          return (
            <li key={i} className={cellClasses}>
              <a
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full rounded-xl md:rounded-2xl focus-visible:ring-2 focus-visible:ring-[var(--orange)]"
              >
                {inner}
              </a>
            </li>
          );
        }

        return <li key={i} className={cellClasses}>{inner}</li>;
      })}
    </ul>
  );
}

/* ============================================================================
 * VideoLightbox — inline player for both YouTube and Instagram. 9:16 for
 * shorts/reels, 16:9 for longs. Body scroll locked while open.
 * ========================================================================= */
function VideoLightbox({ payload, onClose }) {
  React.useEffect(() => {
    if (!payload) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [payload, onClose]);

  if (!payload) return null;
  const { source, videoId, igCode, isShort, title } = payload;

  const src = source === "instagram"
    ? `https://www.instagram.com/reel/${encodeURIComponent(igCode)}/embed/`
    : `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`;

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-black/85 backdrop-blur-md p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title || "Video player"}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 grid place-items-center w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white"
        aria-label="Close player"
      >
        <X size={18} />
      </button>
      <div
        className="relative w-full max-h-[90vh] overflow-hidden rounded-2xl bg-black"
        style={{
          aspectRatio: isShort ? "9 / 16" : "16 / 9",
          maxWidth: isShort ? "min(420px, 92vw)" : "min(1100px, 92vw)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <iframe
          src={src}
          title={title || "Sample"}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="absolute inset-0 w-full h-full"
        />
      </div>
    </div>
  );
}

/* ============================================================================
 * Main template
 * ========================================================================= */
export default function SpecialtyPageTemplate({ slug }) {
  const specialty = SPECIALTIES.find((s) => s.slug === slug);
  if (!specialty) {
    return (
      <main className="min-h-[60vh] grid place-items-center px-4 py-20">
        <div className="text-center">
          <h1 className="text-2xl font-black mb-2">Specialty not found</h1>
          <Link to="/work" className="text-[var(--orange)] font-bold">← Back to work</Link>
        </div>
      </main>
    );
  }

  const { palette, title, tagline, heroCopy, services, processSteps, pricingAnchor, verb, meta } = specialty;

  // Live samples from inventory tagged with this specialty.
  const [liveSamples, setLiveSamples] = React.useState([]);
  const [lightbox, setLightbox] = React.useState(null);

  React.useEffect(() => {
    let cancelled = false;
    fetch(`${AUTH_BASE}/api/specialty/${encodeURIComponent(slug)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d?.items) return;
        const transformed = d.items.map((it) => {
          if (it.kind === "video") {
            const isShort = (it.videoKind || "").toUpperCase() === "SHORT" ||
                            (it.videoKind || "").toUpperCase() === "REEL";
            const vid = it.videoId || extractYouTubeId(
              it.mirrorUrl || it.primaryUrl || it.creatorUrl || ""
            );
            const igCode = extractIgShortcode(it.igUrl || "");
            const src = vid ? `https://i.ytimg.com/vi/${vid}/maxresdefault.jpg` : "";
            return {
              src,
              alt: it.title,
              kind: "image",
              ratio: isShort ? "9/16" : "16/9",
              videoId: vid,
              igCode,
              playable: !!vid || !!igCode,
              views: Number(it.views || 0),
              igViews: Number(it.igViews || 0),
              igUrl: it.igUrl || "",
              href: it.mirrorUrl || it.primaryUrl || it.creatorUrl || it.igUrl || (vid ? `https://youtube.com/watch?v=${vid}` : ""),
            };
          }
          const vid = it.videoId || extractYouTubeId(it.youtubeUrl || "");
          const igCode = extractIgShortcode(it.igUrl || "");
          return {
            src: resolveMediaUrl(it.imageUrl, AUTH_BASE) || "",
            alt: it.title,
            kind: "image",
            ratio: "16/9",
            videoId: vid,
            igCode,
            playable: !!vid || !!igCode,
            views: Number(it.views || 0),
            igViews: Number(it.igViews || 0),
            igUrl: it.igUrl || "",
            href: it.youtubeUrl || it.igUrl || (vid ? `https://youtube.com/watch?v=${vid}` : ""),
          };
        }).filter((x) => x.src);
        setLiveSamples(transformed);
      })
      .catch(() => { /* silent */ });
    return () => { cancelled = true; };
  }, [slug]);

  const samples = liveSamples.length > 0
    ? liveSamples
    : (SPECIALTY_SAMPLES[slug] || []);

  const whatsappHref = `https://wa.me/918968141585?text=${encodeURIComponent(
    `Hi Shinel — I'd like to talk about ${title}.`
  )}`;

  return (
    <main className="min-h-screen relative" style={{ color: "var(--text)" }}>
      <MetaTags
        title={meta.title}
        description={meta.description}
        path={meta.path}
      />
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "/" },
          { name: "Work", url: "/work" },
          { name: title, url: meta.path },
        ]}
      />

      <GrainOverlay />

      {/* ===================================================================
       * HERO — palette aurora backdrop, parallax SVG art, ken-burns mount,
       * per-specialty signature mini-motif in the gutter.
       * ================================================================= */}
      <Section size="lg" className="relative overflow-hidden pt-24 md:pt-28">
        <PaletteAurora palette={palette} />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center relative z-10">
          <div className="lg:col-span-7 order-1">
            <RevealOnScroll>
              <Link
                to="/work"
                className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.2em] mb-4 focus-visible:ring-2 focus-visible:ring-[var(--orange)] rounded"
                style={{ color: "var(--text-muted)" }}
              >
                <ArrowLeft size={12} />
                Back to Work
              </Link>
            </RevealOnScroll>

            <RevealOnScroll delay="60ms">
              <span
                className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.3em]"
                style={{ color: palette.accent }}
              >
                {heroCopy.kicker}
              </span>
            </RevealOnScroll>

            <RevealOnScroll delay="140ms">
              <h1
                className="font-black leading-[0.92] mt-3 mb-5"
                style={{
                  color: "var(--text)",
                  fontSize: "clamp(2.75rem, 7vw, 5.5rem)",
                  letterSpacing: "-0.02em",
                }}
              >
                {heroCopy.headline}{" "}
                <span
                  style={{
                    color: palette.accent,
                    textShadow: `0 0 32px ${palette.glow}`,
                  }}
                >
                  <KineticVerb
                    words={[verb, ...Array.from(new Set([
                      "craft",
                      "ship",
                      "land",
                    ]))]}
                    intervalMs={3200}
                  />
                </span>
                <span style={{ color: palette.accent }}>.</span>
              </h1>
            </RevealOnScroll>

            <RevealOnScroll delay="220ms">
              <Lede className="mb-8 max-w-xl">{heroCopy.lede}</Lede>
            </RevealOnScroll>

            <RevealOnScroll delay="300ms">
              <div className="flex flex-wrap items-center gap-3">
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-4 rounded-full font-black text-base focus-visible:ring-2 focus-visible:ring-offset-2 hover:scale-[1.02] active:scale-[0.98] transition-transform"
                  style={{
                    background: palette.accent,
                    color: "#0a0a0a",
                    boxShadow: `0 12px 36px ${palette.glow}`,
                  }}
                  aria-label={`Start a ${title} project`}
                >
                  Start a project
                  <ArrowRight size={18} />
                </a>
                <a
                  href="#samples"
                  className="inline-flex items-center gap-2 px-5 py-4 rounded-full font-bold text-sm hairline hover:bg-[var(--surface-alt)] focus-visible:ring-2 focus-visible:ring-[var(--orange)]"
                  style={{ color: "var(--text)" }}
                >
                  See samples ↓
                </a>
              </div>
            </RevealOnScroll>
          </div>

          {/* Right column: ken-burns hero art on a square with the
              signature motif tucked in the gutter. */}
          <div className="lg:col-span-5 order-2 relative">
            <div
              className="relative w-full rounded-2xl md:rounded-3xl overflow-hidden hairline kb-cell"
              style={{
                aspectRatio: "1 / 1",
                background: `linear-gradient(145deg, ${palette.accentSoft}, var(--surface))`,
              }}
            >
              <div className="absolute inset-0 kb-zoom">
                <HeroArt slug={slug} palette={palette} />
              </div>
              <span
                className="absolute top-4 left-4 z-10 text-[10px] font-black uppercase tracking-[0.25em] px-2.5 py-1 rounded-full"
                style={{ background: palette.accent, color: "#0a0a0a" }}
              >
                {specialty.shortLabel}
              </span>
              <SignatureMotif slug={slug} palette={palette} position="br" />
              <style>{`
                .kb-cell { isolation: isolate; }
                .kb-zoom { animation: kbZoom 30s ease-in-out infinite alternate; transform-origin: 60% 40%; will-change: transform; }
                @keyframes kbZoom {
                  from { transform: scale(1); }
                  to   { transform: scale(1.04); }
                }
                @media (prefers-reduced-motion: reduce) {
                  .kb-zoom { animation: none; }
                }
              `}</style>
            </div>
          </div>
        </div>
      </Section>

      {/* ===================================================================
       * LIVE NUMBERS BAND
       * ================================================================= */}
      <LiveNumbersBand slug={slug} palette={palette} />

      {/* ===================================================================
       * SAMPLES — bigger tiles, peek captions, palette-tinted scrollbar
       * ================================================================= */}
      <Section id="samples" size="lg">
        <div className="flex items-end justify-between flex-wrap gap-4 mb-8">
          <div>
            <RevealOnScroll>
              <span
                className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.3em]"
                style={{ color: palette.accent }}
              >
                The work
              </span>
            </RevealOnScroll>
            <RevealOnScroll delay="80ms">
              <Display as="h2" size="lg" className="mt-2">
                Recent samples.
              </Display>
            </RevealOnScroll>
          </div>
          <RevealOnScroll delay="160ms">
            <span className="text-xs md:text-sm" style={{ color: "var(--text-muted)" }}>
              Scroll horizontally →
            </span>
          </RevealOnScroll>
        </div>
        <RevealOnScroll delay="200ms">
          <SampleStrip
            samples={samples}
            palette={palette}
            onPlay={(payload) => setLightbox(payload)}
          />
        </RevealOnScroll>
      </Section>

      <VideoLightbox payload={lightbox} onClose={() => setLightbox(null)} />

      {/* ===================================================================
       * SERVICES — hairline-separated competence list (no pills)
       * ================================================================= */}
      <Section size="lg" tone="alt" hairlineTop className="relative">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-start">
          <div className="lg:col-span-5">
            <RevealOnScroll>
              <span
                className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.3em]"
                style={{ color: palette.accent }}
              >
                What we handle
              </span>
            </RevealOnScroll>
            <RevealOnScroll delay="80ms">
              <Display as="h2" size="lg" className="mt-2">
                {tagline}
              </Display>
            </RevealOnScroll>
          </div>

          <div className="lg:col-span-7">
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
              {services.map((s, i) => (
                <RevealOnScroll key={s} delay={`${40 + i * 50}ms`}>
                  <li
                    className="flex items-baseline gap-3 py-4 md:py-5"
                    style={{
                      borderBottom: `1px solid ${palette.accent}1f`,
                    }}
                  >
                    <span
                      className="text-[10px] font-black tabular-nums"
                      style={{ color: palette.accent }}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="flex-1 text-base md:text-lg font-bold" style={{ color: "var(--text)" }}>
                      {s}
                    </span>
                    <CheckCircle2
                      size={14}
                      style={{ color: palette.accent, opacity: 0.75 }}
                      aria-hidden="true"
                    />
                  </li>
                </RevealOnScroll>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      {/* ===================================================================
       * PROCESS — vertical timeline with palette accent rail
       * ================================================================= */}
      <Section size="lg" className="relative">
        <RevealOnScroll>
          <span
            className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.3em]"
            style={{ color: palette.accent }}
          >
            How we ship
          </span>
        </RevealOnScroll>
        <RevealOnScroll delay="80ms">
          <Display as="h2" size="lg" className="mt-2 mb-12 max-w-2xl">
            Three clean steps from brief to ship.
          </Display>
        </RevealOnScroll>

        <ol className="relative">
          {/* The rail — vertical on desktop, horizontal-on-top mobile via ::before per-step */}
          <div
            aria-hidden="true"
            className="absolute left-[18px] top-0 bottom-0 w-px hidden md:block"
            style={{
              background: `linear-gradient(180deg, ${palette.accent}55, ${palette.accent}11)`,
            }}
          />

          {processSteps.map((step, i) => (
            <RevealOnScroll key={step.title} delay={`${80 + i * 100}ms`}>
              <li className="relative pl-0 md:pl-16 pb-10 md:pb-14 last:pb-0">
                {/* Numeral disc */}
                <div
                  className="md:absolute md:left-0 md:top-0 mb-3 md:mb-0 inline-flex items-center justify-center w-9 h-9 rounded-full font-black text-sm tabular-nums"
                  style={{
                    background: palette.accent,
                    color: "#0a0a0a",
                    boxShadow: `0 0 0 6px var(--surface)`,
                  }}
                  aria-hidden="true"
                >
                  {i + 1}
                </div>
                <h3
                  className="font-black leading-tight mb-3"
                  style={{
                    color: "var(--text)",
                    fontSize: "clamp(1.5rem, 3vw, 2rem)",
                  }}
                >
                  {step.title}
                </h3>
                <p
                  className="max-w-xl text-base md:text-lg leading-relaxed"
                  style={{ color: "var(--text-muted)" }}
                >
                  {step.body}
                </p>
              </li>
            </RevealOnScroll>
          ))}
        </ol>
      </Section>

      {/* ===================================================================
       * PRICING — typographic statement, no card
       * ================================================================= */}
      <Section size="lg" tone="alt" hairlineTop hairlineBot>
        <div className="max-w-4xl">
          <RevealOnScroll>
            <span
              className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.3em]"
              style={{ color: palette.accent }}
            >
              How we quote
            </span>
          </RevealOnScroll>
          <RevealOnScroll delay="80ms">
            <p
              className="font-black leading-[1.1] mt-3 mb-8"
              style={{
                color: "var(--text)",
                fontSize: "clamp(1.75rem, 4vw, 3rem)",
                letterSpacing: "-0.02em",
              }}
            >
              <span
                style={{
                  background: `linear-gradient(135deg, ${palette.accent}, ${palette.accentDeep})`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Custom-quoted,
              </span>{" "}
              <span style={{ color: "var(--text)" }}>
                scoped to your track, platform, and cadence.
              </span>
            </p>
          </RevealOnScroll>
          <RevealOnScroll delay="160ms">
            <p className="text-base md:text-lg max-w-2xl mb-8" style={{ color: "var(--text-muted)" }}>
              {pricingAnchor} For non-AI production tiers, see the{" "}
              <Link
                to="/pricing"
                className="underline underline-offset-4 font-bold"
                style={{ color: palette.accent }}
              >
                pricing page
              </Link>.
            </p>
          </RevealOnScroll>
          <RevealOnScroll delay="240ms">
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-7 py-4 rounded-full font-black text-base focus-visible:ring-2 focus-visible:ring-offset-2 hover:scale-[1.02] active:scale-[0.98] transition-transform"
              style={{
                background: palette.accent,
                color: "#0a0a0a",
                boxShadow: `0 12px 36px ${palette.glow}`,
              }}
            >
              Get a quote
              <ArrowRight size={18} />
            </a>
          </RevealOnScroll>
        </div>
      </Section>

      {/* ===================================================================
       * RELATED SPECIALTIES
       * ================================================================= */}
      <Section size="md">
        <RevealOnScroll>
          <span
            className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.3em]"
            style={{ color: palette.accent }}
          >
            Also in our lanes
          </span>
        </RevealOnScroll>
        <RevealOnScroll delay="80ms">
          <Display as="h2" size="md" className="mt-2 mb-8">
            Other specialties.
          </Display>
        </RevealOnScroll>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
          {SPECIALTIES.filter((s) => s.slug !== slug).map((s, i) => (
            <RevealOnScroll key={s.slug} delay={`${60 + i * 80}ms`}>
              <SpecialtyCard specialty={s} />
            </RevealOnScroll>
          ))}
        </div>
      </Section>

      {/* ===================================================================
       * FINAL CTA — gradient with grain overlay, single primary CTA
       * ================================================================= */}
      <section
        className="relative w-full py-20 md:py-28 overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${palette.accent}, ${palette.accentDeep})` }}
      >
        <GrainOverlay local />
        <div className="container mx-auto px-4 md:px-6 text-center text-[#0a0a0a] relative z-10">
          <RevealOnScroll>
            <span className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.3em] opacity-70">
              Ready when you are
            </span>
          </RevealOnScroll>
          <RevealOnScroll delay="80ms">
            <h2
              className="font-black leading-[0.95] mt-3 mb-5"
              style={{
                fontSize: "clamp(2.5rem, 6vw, 4.5rem)",
                letterSpacing: "-0.02em",
              }}
            >
              Let's ship the next one.
            </h2>
          </RevealOnScroll>
          <RevealOnScroll delay="160ms">
            <p className="text-base md:text-lg font-semibold opacity-90 max-w-2xl mx-auto mb-10">
              Tell us the brief — we'll reply inside 3 hours with a sample
              concept or a quote. No long forms.
            </p>
          </RevealOnScroll>
          <RevealOnScroll delay="240ms">
            <div className="flex flex-wrap items-center justify-center gap-4">
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-black bg-[#0a0a0a] text-white text-base md:text-lg hover:scale-[1.02] active:scale-[0.98] transition-transform focus-visible:ring-2 focus-visible:ring-offset-2"
              >
                Start a project
                <ArrowRight size={18} />
              </a>
              <a
                href="mailto:hello@shinelstudios.in?subject=Project%20enquiry"
                className="inline-flex items-center gap-2 px-2 py-2 font-bold underline underline-offset-4 text-sm md:text-base"
                style={{ color: "#0a0a0a" }}
              >
                Email us
              </a>
            </div>
          </RevealOnScroll>
        </div>
      </section>
    </main>
  );
}
