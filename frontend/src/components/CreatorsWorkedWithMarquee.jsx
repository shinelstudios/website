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
          <LazyImage
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
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1], // Custom cubic-bezier for more professional feel
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
  const [prefersReduced, setPrefersReduced] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReduced(mediaQuery.matches);

    const handler = () => setPrefersReduced(mediaQuery.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

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
      category: client.category || "Creator",
      color: "var(--orange)"
    }));
  }, [creatorsProp, stats, loading]);
  if (!finalCreators || finalCreators.length === 0) return null;

  // Calculate total combined reach for display, prioritizing Admin Config
  const totalSubs = useMemo(() => {
    // If Admin has set a manual override text (e.g. "100M+"), use that directly if possible,
    // though this formatting function expects a number. 
    // If the config value is a string that looks like a number, parse it.
    // However, the upstream component now allows text. 
    // We should probably check if `config.stats.totalReach` exists and use it directly in the render
    // instead of passing it through `fmt`.
    return config?.stats?.totalReach || finalCreators.reduce((sum, c) => sum + (c.subs || 0), 0);
  }, [finalCreators, config]);

  const fmt = useCallback((n) => {
    if (n == null) return null;
    if (typeof n === 'string') return n; // Allow direct string strings from admin
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
      // [FIX] Pre-calculate negative distance for iOS Safari to avoid calc() in keyframes
      if (cont) {
        cont.style.setProperty("--neg-animation-distance", `-${totalDistance.toFixed(2)}px`);
      }
    };

    const rafId = requestAnimationFrame(updateMarqueeMetrics);
    // ... rest of the effect ...
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

  const animateDir = direction === 'right' ? 'ltr' : 'rtl'; // Direction logic for class

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
          {/* [MODIFIED] Social proof pills - More Professional/Branded */}
          <motion.div
            className="inline-flex flex-wrap justify-center items-center gap-6 px-8 py-3 rounded-2xl mb-8"
            style={{
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.05)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              boxShadow: "0 10px 30px -10px rgba(0,0,0,0.5)"
            }}
            variants={itemVariant}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[var(--orange)]/10 flex items-center justify-center">
                <CheckCircle2 size={16} className="text-[var(--orange)]" />
              </div>
              <span className="text-sm font-black uppercase tracking-widest text-white">
                Proven Results
              </span>
            </div>

            <span className="h-4 w-px bg-white/10 hidden sm:block" />

            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[var(--orange)]/10 flex items-center justify-center">
                <Users size={16} className="text-[var(--orange)]" />
              </div>
              <span className="text-sm font-black uppercase tracking-widest text-white">
                {config?.stats?.creatorsImpacted || finalCreators.length}+ Creators
              </span>
            </div>

            <span className="h-4 w-px bg-white/10 hidden sm:block" />

            <div className="flex items-center gap-2.5 group cursor-default">
              <div className="w-8 h-8 rounded-lg bg-[var(--orange)]/10 flex items-center justify-center group-hover:bg-[var(--orange)] transition-colors duration-300">
                <TrendingUp size={16} className="text-[var(--orange)] group-hover:text-white transition-colors duration-300" />
              </div>
              <span className="text-sm font-black uppercase tracking-widest text-[var(--orange)]">
                {fmt(totalSubs)}+ Total Reach
              </span>
            </div>
          </motion.div>

          <motion.h2
            id="marquee-heading"
            className="text-4xl md:text-5xl lg:text-7xl font-black italic uppercase tracking-tighter mb-4"
            style={{ color: "var(--text)" }}
            variants={itemVariant}
          >
            The <span className="text-[var(--orange)]">Visual Engine.</span>
          </motion.h2>
          <motion.p
            className="text-base md:text-lg max-w-2xl mx-auto font-medium"
            style={{ color: "var(--text-muted)" }}
            variants={itemVariant}
          >
            We craft visuals that stop the scroll, build authority, and
            transform viewers into loyal communities.
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
              position: "relative",
              overflow: "hidden",
              /* Removed mask-image/WebkitMaskImage as it's buggy in Safari with translate3d */
            }}
          >
            {/* fade masks - Permanent fix for iOS Safari marquee visibility */}
            <div
              className="marquee-mask-left"
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                bottom: 0,
                width: "8vw",
                minWidth: "16px",
                maxWidth: "64px",
                background: "linear-gradient(to right, var(--surface) 0%, transparent 100%)",
                zIndex: 10,
                pointerEvents: "none",
                transform: "translate3d(0,0,0)",
              }}
              aria-hidden="true"
            />
            <div
              className="marquee-mask-right"
              style={{
                position: "absolute",
                right: 0,
                top: 0,
                bottom: 0,
                width: "8vw",
                minWidth: "16px",
                maxWidth: "64px",
                background: "linear-gradient(to left, var(--surface) 0%, transparent 100%)",
                zIndex: 10,
                pointerEvents: "none",
                transform: "translate3d(0,0,0)",
              }}
              aria-hidden="true"
            />

            {/* Track (2x segments for seamless loop) */}
            <div
              ref={trackRef}
              className={`cw-track ${enableAnimation ? "cw-animated" : "cw-static"
                } ${animationIsPaused ? "paused" : ""} ${animateDir === 'ltr' ? 'direction-ltr' : 'direction-rtl'
                }`}
              style={{
                "--gap-rem": `${gapRem}`,
                "--animation-duration": animationDuration,
                "WebkitAnimationDuration": animationDuration,
                "--animation-distance": animationDistance,
                "WebkitAnimationName": animateDir === 'ltr' ? 'cw-marquee-ltr' : 'cw-marquee-rtl',
                "animationName": animateDir === 'ltr' ? 'cw-marquee-ltr' : 'cw-marquee-rtl',
                "WebkitAnimationTimingFunction": "linear",
                "animationTimingFunction": "linear",
                "WebkitAnimationIterationCount": "infinite",
                "animationIterationCount": "infinite",
                "WebkitAnimationPlayState": animationIsPaused ? "paused" : "running",
                "animationPlayState": animationIsPaused ? "paused" : "running",
                /* Permanent GPU Hardware Acceleration */
                WebkitPerspective: "1000px",
                perspective: "1000px",
                WebkitTransformStyle: "preserve-3d",
                transformStyle: "preserve-3d",
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
                      whileHover={!showStatic ? { background: "var(--surface-alt)" } : {}}
                      transition={{ duration: 0.2 }}
                      style={{
                        background: isHovered ? "var(--surface-alt)" : "transparent",
                        border: `1px solid ${isHovered ? "var(--border)" : "transparent"}`,
                        willChange: "transform",
                      }}
                    >
                      <div className="cw-item-inner" role="presentation">
                        <CreatorBadge creator={creator} isHovered={isHovered} />
                      </div>
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
                        whileHover={!showStatic ? { background: "var(--surface-alt)" } : {}}
                        transition={{ duration: 0.2 }}
                        style={{
                          background: isHovered ? "var(--surface-alt)" : "transparent",
                          border: `1px solid ${isHovered ? "var(--border)" : "transparent"}`,
                          willChange: "transform",
                        }}
                      >
                        <div className="cw-item-inner" role="presentation">
                          <CreatorBadge creator={creator} isHovered={isHovered} />
                        </div>
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
          /* GPU Acceleration Forces */
          transform: translate3d(0, 0, 0);
          -webkit-transform: translate3d(0, 0, 0);
          transform-style: preserve-3d;
          -webkit-transform-style: preserve-3d;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
          perspective: 1000px;
          -webkit-perspective: 1000px;
          /* Force Subpixel Rendering */
          -webkit-font-smoothing: antialiased;
        }
        
        .cw-track.cw-animated.direction-rtl {
          animation: cw-marquee-rtl var(--animation-duration) linear infinite;
          -webkit-animation: cw-marquee-rtl var(--animation-duration) linear infinite;
        }

        .cw-track.cw-animated.direction-ltr {
          animation: cw-marquee-ltr var(--animation-duration) linear infinite;
          -webkit-animation: cw-marquee-ltr var(--animation-duration) linear infinite;
        }

        .cw-track.cw-animated.paused {
          animation-play-state: paused !important;
          -webkit-animation-play-state: paused !important;
        }

        .cw-track.cw-static {
            justify-content: center;
            flex-wrap: wrap;
            width: 100%;
        }
        
        .cw-track > .cw-segment:not(:first-child) {
          margin-left: calc(var(--gap-rem) * 1rem);
        }

        .cw-segment {
          display: inline-flex;
          align-items: center;
          white-space: nowrap;
          padding: 1rem 0;
          flex-shrink: 0;
          transform-style: preserve-3d;
          -webkit-transform-style: preserve-3d;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
        }
        
        .cw-track.cw-static .cw-segment {
           white-space: normal;
           gap: calc(var(--gap-rem) * 0.5rem) calc(var(--gap-rem) * 1rem);
           display: flex;
           flex-wrap: wrap;
           justify-content: center;
        }

        .cw-track:not(.cw-static) .cw-segment > .cw-item:not(:first-child) {
          margin-left: calc(var(--gap-rem) * 1rem);
        }

        .cw-item {
          -webkit-backface-visibility: hidden;
          backface-visibility: hidden;
          -webkit-transform-style: preserve-3d;
          transform-style: preserve-3d;
          display: block;
          border-radius: 20px;
          transition: all 0.4s cubic-bezier(0.22, 1, 0.36, 1);
          outline: 2px solid transparent;
          outline-offset: 2px;
          will-change: transform, background-color;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
        }
        
        .cw-item:hover {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(255, 255, 255, 0.1);
        }

        .cw-item:focus-within {
          outline-color: var(--orange);
          background: rgba(255, 255, 255, 0.08);
        }

        .cw-item-inner {
          cursor: default;
          display: inline-flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem 1.25rem;
          min-width: max-content;
          text-decoration: none;
          color: inherit;
          border-radius: inherit;
          outline: none;
        }

        .cw-avatar {
          position: relative;
          width: 52px;
          height: 52px;
          border-radius: 16px;
          overflow: hidden;
          flex-shrink: 0;
          background: #111;
          box-shadow: 0 4px 12px rgba(0,0,0,0.5);
        }
        .cw-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: all 0.3s ease;
          filter: grayscale(0.2);
        }
        .cw-item:hover img {
          filter: grayscale(0);
        }

        .cw-ring {
          position: absolute;
          inset: 0;
          border-radius: inherit;
          border: 2px solid transparent;
          pointer-events: none;
          transition: border 300ms ease;
        }
        .cw-badge {
          position: absolute;
          bottom: -4px;
          right: -4px;
          width: 18px;
          height: 18px;
          border-radius: 6px;
          background: var(--orange);
          border: 2px solid #000;
          display: grid;
          place-items: center;
          z-index: 2;
        }

        .cw-title { 
          color: var(--text); 
          font-weight: 800; 
          font-size: 1rem; 
          line-height: 1.2; 
          letter-spacing: -0.01em;
        }
        .cw-meta  { 
          color: var(--text-muted); 
          font-size: 0.75rem; 
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        /* RTL Direction */
        @keyframes cw-marquee-rtl {
          from { transform: translate3d(0, 0, 0); }
          to { transform: translate3d(var(--neg-animation-distance), 0, 0); }
        }
        
        @-webkit-keyframes cw-marquee-rtl {
          from { -webkit-transform: translate3d(0, 0, 0); }
          to { -webkit-transform: translate3d(var(--neg-animation-distance), 0, 0); }
        }

        /* LTR Direction */
        @keyframes cw-marquee-ltr {
          from { transform: translate3d(var(--neg-animation-distance), 0, 0); }
          to { transform: translate3d(0, 0, 0); }
        }
        
        @-webkit-keyframes cw-marquee-ltr {
          from { -webkit-transform: translate3d(var(--neg-animation-distance), 0, 0); }
          to { -webkit-transform: translate3d(0, 0, 0); }
        }

      `}</style>
    </section>
  );
};

export default CreatorsWorkedWithMarquee;