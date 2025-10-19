// frontend/src/components/CreatorsWorkedWithMarquee.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";

/**
 * Reusable, responsive, auto-scrolling marquee for "Creators Worked With".
 * - Auto-measures content and adjusts duration dynamically.
 * - Pauses on hover/touch and when off-screen (IntersectionObserver).
 * - Respects prefers-reduced-motion unless forceMotion is true.
 *
 * Props:
 * - isDark?: boolean
 * - creators?: Array<{name, key, url, category, color, subs?: number}>
 * - speedPps?: number  // pixels per second (default 60)
 * - gap?: number       // rem gap between items (default 1.0)
 * - forceMotion?: boolean // ignore reduced-motion (default false)
 */

function findAssetByBase(base, globMap) {
  const needle = base.toLowerCase();
  // Try exact filename match first (basenames only)
  for (const path in globMap) {
    const file = path.split("/").pop().toLowerCase();
    const noExt = file.replace(/\.(png|jpg|jpeg|webp|svg)$/, "");
    if (noExt === needle) return globMap[path];
  }
  // Fallback: startsWith
  for (const path in globMap) {
    const file = path.split("/").pop().toLowerCase();
    const noExt = file.replace(/\.(png|jpg|jpeg|webp|svg)$/, "");
    if (noExt.startsWith(needle)) return globMap[path];
  }
  return null;
}

const CreatorsWorkedWithMarquee = ({
  isDark,
  creators: creatorsProp,
  speedPps = 60,
  gap = 1.0,
  forceMotion = false,
}) => {
  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const [isPaused, setIsPaused] = useState(false);
  const [hoveredKey, setHoveredKey] = useState(null);
  const [isVisible, setIsVisible] = useState(true);
  const [segmentWidth, setSegmentWidth] = useState(0); // width of one logical list (before duplication)
  const [containerWidth, setContainerWidth] = useState(0);

  const containerRef = useRef(null);
  const trackRef = useRef(null);
  const segmentRef = useRef(null);

  // Default creators (can be overridden via props)
  const LOGOS =
    creatorsProp
      ? null
      : import.meta.glob("../assets/creators/*.{png,jpg,jpeg,webp,svg}", {
          eager: true,
          query: "?url",
          import: "default",
        });

  const SUBS = (typeof window !== "undefined" && window.SS_SUBS) || {};

  const defaultCreators = useMemo(() => {
    if (!LOGOS) return [];
    const base = [
      { name: "Kamz Inkzone", key: "kamz", category: "Gaming", color: "#ff6b6b" },
      { name: "Deadlox Gaming", key: "deadlox", category: "Gaming", color: "#4ecdc4" },
      { name: "Kundan Parashar", key: "kundan", category: "Devotional", color: "#f7b731" },
      { name: "Aish is Live", key: "aish", category: "Lifestyle", color: "#45b7d1" },
      { name: "Gamer Mummy", key: "gamermummy", category: "Gaming", color: "#5f27cd" },
      { name: "Gamify Anchit", key: "anchit", category: "Gaming", color: "#ff9ff3" },
      { name: "Maggie Live", key: "maggie", category: "Lifestyle", color: "#ee5a6f" },
      { name: "Crown Ankit", key: "ankit", category: "Gaming", color: "#48dbfb" },
      { name: "Manav Maggie Sukhija", key: "manav", category: "Lifestyle", color: "#ff9357" },
    ];
    return base
      .map((c) => {
        const url = findAssetByBase(c.key, LOGOS);
        return url ? { ...c, url, subs: SUBS[c.key] } : null;
      })
      .filter(Boolean);
  }, [LOGOS]);

  const creators = creatorsProp && creatorsProp.length ? creatorsProp : defaultCreators;
  if (!creators || creators.length === 0) return null;

  // For stats display
  const fmt = (n) => {
    if (n == null) return null;
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 ? 1 : 0)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(n % 1_000 ? 1 : 0)}K`;
    return `${n}`;
  };
  const totalSubs = creators.reduce((sum, c) => sum + (c.subs || 0), 0);

  // Duplicate once for seamless loop (two segments)
  const loop = useMemo(() => [...creators, ...creators], [creators]);

  // Measure segment and container widths to compute duration dynamically
  useEffect(() => {
    const ro = new ResizeObserver(() => {
      const container = containerRef.current;
      const seg = segmentRef.current;
      if (!container || !seg) return;
      setContainerWidth(container.clientWidth);
      setSegmentWidth(seg.scrollWidth);
    });
    if (containerRef.current) ro.observe(containerRef.current);
    if (segmentRef.current) ro.observe(segmentRef.current);
    return () => ro.disconnect();
  }, []);

  // Pause when scrolled out of view
  useEffect(() => {
    if (!trackRef.current || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.01 }
    );
    io.observe(trackRef.current);
    return () => io.disconnect();
  }, []);

  // Calculate animation duration (seconds): distance / pixelsPerSecond
  // Distance to travel = width of one segment
  const distancePx = Math.max(1, segmentWidth);
  const pxPerSec = Math.max(20, Number(speedPps) || 60);
  const durationSec = distancePx / pxPerSec;

  // Prefer reduced motion unless forced
  const showStatic = prefersReduced && !forceMotion;

  // Styles
  const gapRem = Math.max(0.25, Number(gap));
  const paused = isPaused || !isVisible;

  return (
    <section
      className="relative py-20 overflow-hidden"
      style={{ background: "var(--surface)" }}
      aria-label="Creators we’ve worked with"
    >
      <div className="container mx-auto px-4 relative z-10 max-w-7xl">
        {/* Header */}
        <motion.div
          className="text-center mb-10"
          initial={showStatic ? {} : { opacity: 0, y: 16 }}
          whileInView={showStatic ? {} : { opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <motion.div
            className="inline-flex items-center gap-4 px-5 py-2 rounded-full mb-5"
            style={{ background: "var(--surface-alt)", border: "1px solid var(--border)" }}
            whileHover={showStatic ? {} : { scale: 1.02 }}
          >
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--orange)" }} />
              <span className="text-sm font-medium" style={{ color: "var(--text)" }}>
                {creators.length}+ Active Clients
              </span>
            </div>
            <span className="h-3 w-px" style={{ background: "var(--border)" }} />
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"
                  stroke="var(--orange)"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              <span className="text-sm font-medium" style={{ color: "var(--orange)" }}>
                {fmt(totalSubs)}+ Combined Reach
              </span>
            </div>
          </motion.div>

          <h2
            className="text-3xl md:text-4xl lg:text-5xl font-bold font-['Poppins'] mb-3"
            style={{ color: "var(--text)" }}
          >
            Trusted by Creators Across Genres
          </h2>
          <p className="text-base md:text-lg max-w-2xl mx-auto" style={{ color: "var(--text-muted)" }}>
            From <strong style={{ color: "var(--text)" }}>Gaming</strong> to{" "}
            <strong style={{ color: "var(--text)" }}>Lifestyle</strong> to{" "}
            <strong style={{ color: "var(--text)" }}>Devotional</strong> — we adapt to your niche
          </p>
        </motion.div>

        {/* Marquee */}
        <div
          ref={containerRef}
          className="relative select-none"
          role="region"
          aria-roledescription="carousel"
          aria-label="Creator logos scrolling"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onTouchStart={() => setIsPaused(true)}
          onTouchEnd={() => setIsPaused(false)}
          style={{
            maskImage:
              "linear-gradient(90deg, transparent 0%, black 8%, black 92%, transparent 100%)",
            WebkitMaskImage:
              "linear-gradient(90deg, transparent 0%, black 8%, black 92%, transparent 100%)",
          }}
        >
          {/* Edge gradient masks (visual only; mask handles fade on Safari too) */}
          <div
            className="pointer-events-none absolute left-0 top-0 bottom-0 z-10"
            style={{
              width: "clamp(16px, 8vw, 64px)",
              background: "linear-gradient(90deg, var(--surface) 0%, transparent 100%)",
            }}
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute right-0 top-0 bottom-0 z-10"
            style={{
              width: "clamp(16px, 8vw, 64px)",
              background: "linear-gradient(270deg, var(--surface) 0%, transparent 100%)",
            }}
            aria-hidden="true"
          />

          {/* Track (2x segments for seamless loop) */}
          <div
            ref={trackRef}
            className={`cw-track ${showStatic ? "" : "animate"} ${paused ? "paused" : ""}`}
            style={{
              "--gap-rem": `${gapRem}`,
              "--duration": `${durationSec.toFixed(3)}s`,
              "--distance": `${distancePx}px`,
            }}
          >
            {/* Segment A (measured) */}
            <ul
              ref={segmentRef}
              className="cw-segment"
              style={{ gap: "calc(var(--gap-rem) * 1rem)" }}
            >
              {creators.map((c, i) => {
                const key = `${c.key}-a-${i}`;
                const isHovered = hoveredKey === key;
                return (
                  <motion.li
                    key={key}
                    className="cw-item"
                    onMouseEnter={() => setHoveredKey(key)}
                    onMouseLeave={() => setHoveredKey(null)}
                    whileHover={showStatic ? {} : { y: -4, scale: 1.01 }}
                    transition={{ duration: 0.2 }}
                    style={{
                      background: isHovered ? "var(--surface-alt)" : "transparent",
                      border: `1px solid ${isHovered ? "var(--border)" : "transparent"}`,
                    }}
                  >
                    <CreatorBadge c={c} isHovered={isHovered} />
                  </motion.li>
                );
              })}
            </ul>

            {/* Segment B (clone) */}
            <ul className="cw-segment" style={{ gap: "calc(var(--gap-rem) * 1rem)" }}>
              {creators.map((c, i) => {
                const key = `${c.key}-b-${i}`;
                const isHovered = hoveredKey === key;
                return (
                  <motion.li
                    key={key}
                    className="cw-item"
                    onMouseEnter={() => setHoveredKey(key)}
                    onMouseLeave={() => setHoveredKey(null)}
                    whileHover={showStatic ? {} : { y: -4, scale: 1.01 }}
                    transition={{ duration: 0.2 }}
                    style={{
                      background: isHovered ? "var(--surface-alt)" : "transparent",
                      border: `1px solid ${isHovered ? "var(--border)" : "transparent"}`,
                    }}
                  >
                    <CreatorBadge c={c} isHovered={isHovered} />
                  </motion.li>
                );
              })}
            </ul>
          </div>
        </div>

        {!showStatic && (
          <motion.p
            className="text-center mt-6 text-xs"
            style={{ color: "var(--text-muted)" }}
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 0.6 }}
            viewport={{ once: true }}
          >
            Hover / touch to pause
          </motion.p>
        )}
      </div>

      {/* Scoped styles */}
      <style>{`
        .cw-track {
          display: flex;
          align-items: center;
          width: max-content;
          gap: calc(var(--gap-rem) * 1rem);
          will-change: transform;
          transform: translate3d(0,0,0);
        }
        .cw-track.animate {
          animation: cw-marquee var(--duration) linear infinite;
        }
        .cw-track.animate.paused {
          animation-play-state: paused !important;
        }

        .cw-segment {
          display: inline-flex;
          align-items: center;
          white-space: nowrap;
          padding: 0.5rem 0;
        }

        .cw-item {
          display: inline-flex;
          align-items: center;
          gap: 0.75rem;
          border-radius: 14px;
          padding: 0.625rem 0.875rem;
          min-width: max-content;
          transition: background 180ms ease, border 180ms ease, transform 180ms ease;
        }

        .cw-avatar {
          position: relative;
          width: 48px;
          height: 48px;
          border-radius: 999px;
          overflow: hidden;
          flex-shrink: 0;
        }
        .cw-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: filter 200ms ease;
          filter: grayscale(0.05);
        }
        .cw-ring {
          position: absolute;
          inset: 0;
          border-radius: 999px;
          border: 2px solid transparent;
          pointer-events: none;
          transition: border 200ms ease;
        }
        .cw-badge {
          position: absolute;
          bottom: -2px;
          right: -2px;
          width: 16px;
          height: 16px;
          border-radius: 999px;
          background: var(--orange);
          border: 2px solid var(--surface);
          display: grid;
          place-items: center;
        }

        .cw-title { color: var(--text); font-weight: 600; font-size: 0.9375rem; line-height: 1; }
        .cw-meta  { color: var(--text-muted); font-size: 0.6875rem; }

        /* Keyframes: travel by exactly one segment (dynamic via CSS var) */
        @keyframes cw-marquee {
          from { transform: translate3d(0,0,0); }
          to   { transform: translate3d(calc(var(--distance) * -1), 0, 0); }
        }

        /* Reduced motion: disable animation entirely */
        @media (prefers-reduced-motion: reduce) {
          .cw-track.animate { animation: none !important; }
        }
      `}</style>
    </section>
  );
};

const CreatorBadge = ({ c, isHovered }) => {
  return (
    <>
      <span className="cw-avatar">
        <img
          src={c.url}
          alt={`${c.name} logo`}
          loading="lazy"
          style={{ filter: isHovered ? "grayscale(0)" : undefined }}
        />
        <span className="cw-ring" style={{ borderColor: isHovered ? c.color : "transparent" }} />
        <span className="cw-badge" aria-label="Verified client">
          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M20 6L9 17l-5-5"
              stroke="white"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </span>

      <span className="inline-flex flex-col gap-1 min-w-0">
        <span className="flex items-center gap-2 min-w-0">
          <span className="cw-title truncate">{c.name}</span>
          <span
            className="text-[10px] px-1.5 py-0.5 rounded font-medium"
            style={{ background: "var(--surface-alt)", color: "var(--text-muted)" }}
          >
            {c.category}
          </span>
        </span>
        {c.subs != null && (
          <span className="cw-meta">{formatSubs(c.subs)} subscribers</span>
        )}
      </span>
    </>
  );
};

function formatSubs(n) {
  if (n == null) return "";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 ? 1 : 0)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n % 1_000 ? 1 : 0)}K`;
  return String(n);
}

export default CreatorsWorkedWithMarquee;