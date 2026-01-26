import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
// [NEW] Imported new icons for social proof
import { CheckCircle2, Users, TrendingUp } from "lucide-react";
import { LazyImage } from "./ProgressiveImage";
import { useClientStats } from "../context/ClientStatsContext";
import { useGlobalConfig } from "../context/GlobalConfigContext";

/**
 * Reusable, responsive, auto-scrolling marquee for "Creators Worked With".
 */

// Helper to find asset URL from a glob map
function findAssetByBase(base, globMap) {
  const needle = base.toLowerCase();
  for (const path in globMap) {
    const file = path.split("/").pop().toLowerCase();
    const noExt = file.replace(/\.(png|jpg|jpeg|webp|svg)$/, "");
    if (noExt === needle || noExt.startsWith(needle)) return globMap[path];
  }
  return null;
}

// Format subscriber count
function formatSubs(n) {
  if (n == null) return "";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 ? 1 : 0)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n % 1_000 ? 1 : 0)}K`;
  return String(n);
}

// Creator badge component (pure component for better performance)
const CreatorBadge = React.memo(({ creator, isHovered }) => {
  const [imageError, setImageError] = useState(false);

  return (
    <>
      <span className="cw-avatar flex items-center justify-center text-xs font-bold text-white bg-[var(--surface-alt)]">
        {creator.url && !imageError ? (
          <img
            src={creator.url}
            alt={`${creator.name} logo`}
            width="48"
            height="48"
            className="w-full h-full object-cover"
            style={{ filter: isHovered ? "grayscale(0)" : undefined }}
            onError={() => setImageError(true)}
          />
        ) : (
          <span className="relative z-10">{creator.name?.charAt(0) || 'C'}</span>
        )}
        <span className="cw-ring" style={{ borderColor: isHovered ? creator.color : "transparent" }} />
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
          <span className="cw-title truncate">{creator.name}</span>
          <span
            className="text-[10px] px-1.5 py-0.5 rounded font-medium"
            style={{ background: "var(--surface-alt)", color: "var(--text-muted)" }}
          >
            {creator.category}
          </span>
        </span>
        {creator.subs != null && (
          <span className="cw-meta">{formatSubs(creator.subs)} subscribers</span>
        )}
      </span>
    </>
  );
});

// [NEW] Animation variants for staggered header
const headerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariant = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: "easeOut",
    },
  },
};

const CreatorsWorkedWithMarquee = ({
  isDark,
  creators: creatorsProp,
  speedPps = 60,
  gap = 1.0,
  forceMotion = false,
  direction = 'left',
}) => {
  const { stats, loading } = useClientStats();
  const { config } = useGlobalConfig();
  const prefersReduced = false;

  // State
  const [isPaused, setIsPaused] = useState(false);
  const [hoveredKey, setHoveredKey] = useState(null);
  const [isVisible, setIsVisible] = useState(true);
  const [shouldAnimate, setShouldAnimate] = useState(false);

  // Refs
  const containerRef = useRef(null);
  const trackRef = useRef(null);
  const segmentRef = useRef(null);

  // Animation state
  const [animationDuration, setAnimationDuration] = useState('30s');
  const [animationDistance, setAnimationDistance] = useState('0px');

  // Memoized handlers
  const handleMouseEnter = useCallback((key) => {
    setHoveredKey(key);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoveredKey(null);
  }, []);

  // Determine the final list of creators
  const finalCreators = useMemo(() => {
    if (creatorsProp && creatorsProp.length) return creatorsProp;
    if (loading) return [];

    return stats.map(client => ({
      name: client.title,
      key: client.youtubeId || client.id, // Use youtubeId as unique key
      url: client.logo,
      subs: client.subscribers,
      category: "Creator",
      color: "var(--orange)",
      href: client.youtubeId ? `https://youtube.com/channel/${client.youtubeId}` : null
    }));
  }, [creatorsProp, stats, loading]);
  if (!finalCreators || finalCreators.length === 0) return null;

  // Calculate total combined reach for display
  const totalSubs = useMemo(() => {
    const fromStats = finalCreators.reduce((sum, c) => sum + (c.subs || 0), 0);
    return fromStats || (config?.stats?.totalReach || 0);
  }, [finalCreators, config]);
  const fmt = useCallback((n) => {
    if (n == null) return null;
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 ? 1 : 0)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(n % 1_000 ? 1 : 0)}K`;
    return `${n}`;
  }, []);

  const gapRem = Math.max(0.25, Number(gap));

  // Measure segment width AND container width
  useEffect(() => {
    const gapPx = { current: 0 };

    const updateMarqueeMetrics = () => {
      const seg = segmentRef.current;
      const cont = containerRef.current;
      if (!seg || !cont || typeof window === 'undefined') return;

      const segmentWidth = seg.scrollWidth;
      const containerWidth = cont.clientWidth;
      const isOverflowing = segmentWidth > containerWidth;
      setShouldAnimate(isOverflowing);

      gapPx.current = parseFloat(getComputedStyle(document.documentElement).fontSize) * gapRem;

      const totalDistance = segmentWidth + gapPx.current;
      const pxPerSec = Math.max(20, Number(speedPps) || 60);
      const durationSec = totalDistance / pxPerSec;

      setAnimationDuration(`${durationSec.toFixed(3)}s`);
      setAnimationDistance(`${totalDistance.toFixed(2)}px`);
    };

    const rafId = requestAnimationFrame(updateMarqueeMetrics);

    let ro;
    if (typeof window !== 'undefined' && 'ResizeObserver' in window) {
      ro = new ResizeObserver(updateMarqueeMetrics);
      if (segmentRef.current) ro.observe(segmentRef.current);
      if (containerRef.current) ro.observe(containerRef.current);
    }

    window.addEventListener('resize', updateMarqueeMetrics);

    return () => {
      cancelAnimationFrame(rafId);
      if (ro) ro.disconnect();
      window.removeEventListener('resize', updateMarqueeMetrics);
    }
  }, [speedPps, gapRem]);


  // Pause when scrolled out of view
  useEffect(() => {
    if (!trackRef.current || typeof window === 'undefined' || !("IntersectionObserver" in window)) {
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.01 }
    );
    io.observe(trackRef.current);
    return () => io.disconnect();
  }, []);


  // Determine animation states
  const showStatic = prefersReduced && !forceMotion;
  const enableAnimation = !showStatic && shouldAnimate;
  const animationIsPaused = isPaused || !isVisible;

  return (
    <section
      className="relative py-20 overflow-hidden"
      style={{ background: "var(--surface)" }}
      aria-labelledby="marquee-heading"
    >
      <div className="container mx-auto px-4 relative z-10 max-w-7xl">
        {/* [MODIFIED] Header with stagger animation */}
        <motion.div
          className="text-center mb-10"
          initial={showStatic ? {} : "hidden"}
          whileInView={showStatic ? {} : "visible"}
          variants={headerVariants}
          viewport={{ once: true }}
        >
          {/* [MODIFIED] Social proof pills */}
          <motion.div
            className="inline-flex flex-wrap justify-center items-center gap-4 px-5 py-2 rounded-full mb-5"
            style={{ background: "var(--surface-alt)", border: "1px solid var(--border)" }}
            variants={itemVariant}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 size={14} style={{ color: "var(--orange)" }} />
              <span className="text-sm font-medium" style={{ color: "var(--text)" }}>
                Proven Results
              </span>
            </div>
            <span className="h-3 w-px hidden sm:inline-block" style={{ background: "var(--border)" }} />
            <div className="flex items-center gap-2">
              <Users size={14} style={{ color: "var(--orange)" }} />
              <span className="text-sm font-medium" style={{ color: "var(--text)" }}>
                {config?.stats?.creatorsImpacted || finalCreators.length}+ Creators
              </span>
            </div>
            <span className="h-3 w-px hidden sm:inline-block" style={{ background: "var(--border)" }} />
            <div className="flex items-center gap-2">
              <TrendingUp size={14} style={{ color: "var(--orange)" }} />
              <span className="text-sm font-medium" style={{ color: "var(--orange)" }}>
                {fmt(totalSubs)}+ Combined Reach
              </span>
            </div>
          </motion.div>

          <motion.h2
            id="marquee-heading"
            className="text-3xl md:text-4xl lg:text-5xl font-bold font-['Poppins'] mb-3"
            style={{ color: "var(--text)" }}
            variants={itemVariant}
          >
            The Visual Engine for Top-Tier Creators
          </motion.h2>
          <motion.p
            className="text-base md:text-lg max-w-2xl mx-auto"
            style={{ color: "var(--text-muted)" }}
            variants={itemVariant}
          >
            We craft the visuals that stop the scroll, build your brand, and
            turn viewers into loyal fans. We speak your niche.
          </motion.p>
        </motion.div>

        {/* [NEW] Marquee container wrapped in motion.div for fade-in */}
        <motion.div
          initial={showStatic ? {} : { opacity: 0, y: 20 }}
          whileInView={showStatic ? {} : { opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <div
            ref={containerRef}
            className="relative select-none"
            role="region"
            aria-roledescription="carousel"
            aria-label="Scrolling creator logos"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            onTouchStart={() => setIsPaused(true)}
            onTouchEnd={() => setIsPaused(false)}
            onTouchCancel={() => setIsPaused(false)}
            onFocus={() => setIsPaused(true)}
            onBlur={() => setIsPaused(false)}
            style={{
              maskImage:
                "linear-gradient(90deg, transparent 0%, black 8%, black 92%, transparent 100%)",
              WebkitMaskImage:
                "-webkit-linear-gradient(90deg, transparent 0%, black 8%, black 92%, transparent 100%)",
            }}
          >
            {/* Edge gradient overlays */}
            <div
              className="pointer-events-none absolute left-0 top-0 bottom-0 z-10"
              style={{
                width: "8vw",
                minWidth: "16px",
                maxWidth: "64px",
                background: "linear-gradient(90deg, var(--surface) 0%, transparent 100%)",
              }}
              aria-hidden="true"
            />
            <div
              className="pointer-events-none absolute right-0 top-0 bottom-0 z-10"
              style={{
                width: "8vw",
                minWidth: "16px",
                maxWidth: "64px",
                background: "linear-gradient(270deg, var(--surface) 0%, transparent 100%)",
              }}
              aria-hidden="true"
            />

            {/* Track (2x segments for seamless loop) */}
            <div
              ref={trackRef}
              className={`cw-track ${enableAnimation ? "cw-animated" : "cw-static"
                } ${animationIsPaused ? "paused" : ""} ${direction === 'right' ? 'direction-right' : ''
                }`}
              style={{
                "--gap-rem": `${gapRem}`,
                "--animation-duration": animationDuration,
                "--animation-distance": animationDistance,
              }}
            >
              {/* Segment A (measured) */}
              <ul
                ref={segmentRef}
                className="cw-segment"
              >
                {finalCreators.map((creator) => {
                  const key = `${creator.key}-a`;
                  const isHovered = hoveredKey === key;
                  return (
                    <motion.li
                      key={key}
                      className="cw-item"
                      onMouseEnter={() => handleMouseEnter(key)}
                      onMouseLeave={handleMouseLeave}
                      whileHover={!showStatic ? { y: -4, scale: 1.01 } : {}}
                      transition={{ duration: 0.2 }}
                      style={{
                        background: isHovered ? "var(--surface-alt)" : "transparent",
                        border: `1px solid ${isHovered ? "var(--border)" : "transparent"}`,
                      }}
                    >
                      {creator.href ? (
                        <a
                          href={creator.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="cw-item-link"
                          aria-label={`Visit ${creator.name}`}
                        >
                          <CreatorBadge creator={creator} isHovered={isHovered} />
                        </a>
                      ) : (
                        <div className="cw-item-link" role="presentation">
                          <CreatorBadge creator={creator} isHovered={isHovered} />
                        </div>
                      )}
                    </motion.li>
                  );
                })}
              </ul>

              {/* Segment B (clone) */}
              {enableAnimation && (
                <ul
                  className="cw-segment"
                  aria-hidden="true" // Clone is decorative
                >
                  {finalCreators.map((creator) => {
                    const key = `${creator.key}-b`;
                    const isHovered = hoveredKey === key;
                    return (
                      <motion.li
                        key={key}
                        className="cw-item"
                        onMouseEnter={() => handleMouseEnter(key)}
                        onMouseLeave={handleMouseLeave}
                        whileHover={!showStatic ? { y: -4, scale: 1.01 } : {}}
                        transition={{ duration: 0.2 }}
                        style={{
                          background: isHovered ? "var(--surface-alt)" : "transparent",
                          border: `1px solid ${isHovered ? "var(--border)" : "transparent"}`,
                        }}
                      >
                        {creator.href ? (
                          <a
                            href={creator.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="cw-item-link"
                            aria-label={`Visit ${creator.name}`}
                          >
                            <CreatorBadge creator={creator} isHovered={isHovered} />
                          </a>
                        ) : (
                          <div className="cw-item-link" role="presentation">
                            <CreatorBadge creator={creator} isHovered={isHovered} />
                          </div>
                        )}
                      </motion.li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </motion.div>

        {enableAnimation && (
          <motion.p
            className="text-center mt-6 text-xs"
            style={{ color: "var(--text-muted)" }}
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 0.6 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5 }} // Delay to appear after marquee
          >
            Hover / touch / focus to pause
          </motion.p>
        )}
      </div>

      {/* Scoped styles */}
      <style>{`
        .cw-track {
          display: flex;
          align-items: center;
          width: max-content;
          will-change: transform;
          transform: translate3d(0,0,0);
        }
        .cw-track.cw-animated {
          animation: cw-marquee var(--animation-duration) linear infinite;
        }
        .cw-track.cw-animated.direction-right {
          animation-direction: reverse;
        }
        .cw-track.cw-animated.paused {
          animation-play-state: paused !important;
        }

        .cw-track.cw-static {
            justify-content: center;
            flex-wrap: wrap;
            width: 100%;
        }
        
        /* Fallback for 'gap' on segments */
        .cw-track > .cw-segment:not(:first-child) {
          margin-left: calc(var(--gap-rem) * 1rem);
        }

        .cw-segment {
          display: inline-flex;
          align-items: center;
          white-space: nowrap;
          padding: 0.5rem 0;
          flex-shrink: 0;
        }
        
        /* Static mode segment styling */
        .cw-track.cw-static .cw-segment {
           white-space: normal;
           gap: calc(var(--gap-rem) * 0.5rem) calc(var(--gap-rem) * 1rem);
           display: flex;
           flex-wrap: wrap;
           justify-content: center;
        }

        /* Fallback for 'gap' on items */
        .cw-track:not(.cw-static) .cw-segment > .cw-item:not(:first-child) {
          margin-left: calc(var(--gap-rem) * 1rem);
        }

        .cw-item {
          display: block;
          border-radius: 14px;
          transition: background 180ms ease, border 180ms ease, transform 180ms ease;
          outline: 2px solid transparent;
          outline-offset: 2px;
          transition: outline-color 0.2s ease;
          will-change: transform; /* [NEW] Hint for hover animation */
        }
        .cw-item:focus-within {
          outline-color: var(--orange);
        }

        .cw-item-link {
          display: inline-flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.625rem 0.875rem;
          min-width: max-content;
          text-decoration: none;
          color: inherit;
          border-radius: inherit;
          outline: none;
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

        @keyframes cw-marquee {
          from { transform: translate3d(0,0,0); }
          to   { transform: translate3d(calc(var(--animation-distance) * -1), 0, 0); }
        }

      `}</style>
    </section>
  );
};

export default CreatorsWorkedWithMarquee;