import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";

/**
 * Reusable, responsive, auto-scrolling trust/logo bar.
 * - [NEW] Uses a pixels-per-second (speedPps) prop for responsive, consistent speed.
 * - [NEW] Auto-measures content and adjusts duration dynamically.
 * - [FIX] Replaced all CSS 'gap' properties with 'margin-left' for broad iOS support.
 * - [FIX] Simplified animation logic; removed 'kick()' function for better stability.
 * - [FIX] Removed 'drag-to-scrub' feature to prevent jank on touch devices.
 * - Pauses on hover/touch and when off-screen (IntersectionObserver).
 * - Respects prefers-reduced-motion.
 *
 * Props:
 * - items: Array<{icon: React.ComponentType, text: string}>
 * - prefersReduced: boolean (optional override)
 * - forceMotion: boolean (ignore reduced-motion)
 * - speedPps: number (pixels per second, default 40)
 * - direction: "rtl" | "ltr" (default "rtl")
 * - gapRem: number (gap between items in rem, default 2)
 * - maskWidth: string (CSS value for fade mask, default "clamp(20px, 8%, 60px)")
 * - boostOnHover: boolean (speed boost on hover/press)
 * - boostFactor: number (lower = faster, default 0.6)
 */
const TrustBar = ({
  items,
  prefersReduced: prefersReducedProp,
  forceMotion = false,
  speedPps = 40, // [MODIFIED] Changed to pixels-per-second
  direction = "rtl",
  gapRem = 2,
  maskWidth = "clamp(20px, 8%, 60px)",
  boostOnHover = true,
  boostFactor = 0.6,
}) => {
  const elements = Array.isArray(items) ? items : [];
  if (elements.length === 0) return null;

  const segmentRef = useRef(null); // Ref to measure the first segment
  const trackRef = useRef(null);   // Ref for the track containing both segments
  const containerRef = useRef(null);

  const [isPaused, setIsPaused] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [isIOS, setIsIOS] = useState(false);
  const [isBoosted, setIsBoosted] = useState(false);

  // Animation state
  const [animationDuration, setAnimationDuration] = useState("60s"); // Default duration
  const [animationDistance, setAnimationDistance] = useState("0px");

  const [prefersReduced, setPrefersReduced] = useState(() => {
    if (typeof prefersReducedProp === "boolean") return prefersReducedProp;
    if (typeof window !== "undefined" && window.matchMedia) {
      try {
        return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      } catch {}
    }
    return false;
  });

  useEffect(() => {
    if (typeof prefersReducedProp === "boolean") {
      setPrefersReduced(prefersReducedProp);
      return;
    }
    if (!window.matchMedia) return;
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e) => setPrefersReduced(!!e.matches);
    m.addEventListener?.("change", handler);
    return () => m.removeEventListener?.("change", handler);
  }, [prefersReducedProp]);

  // [NEW] We only need two copies for a seamless loop
  const duplicatedItems = useMemo(() => [...elements, ...elements], [elements]);

  useEffect(() => {
    try {
      const iOS =
        /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
      setIsIOS(iOS);
    } catch {}
  }, []);

  // [NEW] Measure segment width and calculate animation properties
  useEffect(() => {
    const gapPx = { current: 0 };

    const updateMarqueeMetrics = () => {
      const seg = segmentRef.current;
      if (!seg || typeof window === 'undefined') return;

      // Calculate gap in pixels based on root font size
      gapPx.current = parseFloat(getComputedStyle(document.documentElement).fontSize) * gapRem;
      
      const segmentWidth = seg.scrollWidth;
      // Total distance to travel = width of segment + gap between segments
      const totalDistance = segmentWidth + gapPx.current; 
      
      const pxPerSec = Math.max(10, Number(speedPps) || 40);
      const durationSec = totalDistance / pxPerSec;

      setAnimationDuration(`${durationSec.toFixed(3)}s`);
      setAnimationDistance(`${totalDistance.toFixed(2)}px`); 
    };

    // Initial calculation on mount, after layout
    const rafId = requestAnimationFrame(updateMarqueeMetrics);

    let ro;
    if (typeof window !== 'undefined' && 'ResizeObserver' in window) {
      ro = new ResizeObserver(updateMarqueeMetrics);
      if (segmentRef.current) {
        ro.observe(segmentRef.current);
      }
    }
    
    // Always add resize listener for fallback and to catch rem/font-size changes
    window.addEventListener('resize', updateMarqueeMetrics);

    return () => {
      cancelAnimationFrame(rafId);
      if (ro) ro.disconnect();
      window.removeEventListener('resize', updateMarqueeMetrics);
    }
  }, [speedPps, gapRem, elements.length]); // Recalc if these change


  // [MODIFIED] Pause when not on screen (simplified)
  useEffect(() => {
    if (!containerRef.current || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting); // Just set visibility state
      },
      { root: null, threshold: 0.01 }
    );
    io.observe(containerRef.current);
    return () => io.disconnect();
  }, []);

  // [MODIFIED] Simplified event handlers (no scrub)
  const handleTouchStart = useCallback(() => {
    setIsPaused(true);
    if (boostOnHover) setIsBoosted(true);
  }, [boostOnHover]);

  const handleTouchEnd = useCallback(() => {
    setIsPaused(false);
    if (boostOnHover) setIsBoosted(false);
  }, [boostOnHover]);

  const handleMouseEnter = useCallback(() => {
    if (!isIOS) {
      setIsPaused(true);
      if (boostOnHover) setIsBoosted(true);
    }
  }, [isIOS, boostOnHover]);

  const handleMouseLeave = useCallback(() => {
    if (!isIOS) {
      setIsPaused(false);
      if (boostOnHover) setIsBoosted(false);
    }
  }, [isIOS, boostOnHover]);


  const showStatic = prefersReduced && !forceMotion;
  const animateDir = direction === "rtl" ? "rtl" : "ltr";
  const baseDuration = parseFloat(animationDuration) || 60;
  const boostedDuration = Math.max(2, baseDuration * boostFactor);
  const effectiveDuration = isBoosted ? boostedDuration : baseDuration;

  return (
    <div
      className="w-full trustbar"
      style={{
        background: "var(--header-bg)",
        boxShadow: "inset 0 1px 0 var(--border)",
        position: "relative",
        zIndex: 2,
        overflow: "hidden",
        WebkitOverflowScrolling: "touch",
        WebkitTapHighlightColor: "transparent",
        ["--marquee-duration"]: `${effectiveDuration}s`,
        ["--marquee-boost-duration"]: `${boostedDuration}s`, // For transitions
        ["--marquee-gap-rem"]: `${gapRem}`,
        ["--marquee-gap"]: `calc(var(--marquee-gap-rem) * 1rem)`,
        ["--marquee-mask"]: maskWidth,
        ["--animation-duration"]: `${effectiveDuration}s`,
        ["--animation-distance"]: animationDistance,
      }}
    >
      {showStatic ? (
        <div
          className="static-trust-bar"
          style={{
            padding: "0.625rem 1rem",
            display: "flex",
            // [FIX] No 'gap', use margin fallback (see CSS)
            overflowX: "auto",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {elements.map((item, i) => (
            <div
              key={`static-${i}`}
              className="static-trust-item"
              style={{
                whiteSpace: "nowrap",
                fontSize: "clamp(0.6875rem, 1.5vw, 0.875rem)", // [FIX] Consistent font size
                color: "var(--text)",
                display: "inline-flex",
                gap: "0.5rem", // 'gap' inside item is fine
                alignItems: "center",
                flexShrink: 0,
              }}
            >
              {item.icon && <item.icon size={14} style={{ color: "var(--orange)", flexShrink: 0 }} />}
              <span>{item.text}</span>
            </div>
          ))}
        </div>
      ) : (
        <div
          ref={containerRef}
          className={`marquee-container dir-${animateDir}`}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd} // [FIX] Handle touch cancel
          style={{
            position: "relative",
            overflow: "hidden",
            cursor: "default", // [FIX] No 'ew-resize'
            WebkitUserSelect: "none",
            userSelect: "none",
          }}
        >
          {/* fade masks */}
          <div
            className="marquee-mask-left"
            style={{
              position: "absolute",
              left: 0, top: 0, bottom: 0,
              width: "var(--marquee-mask)",
              background: "linear-gradient(90deg, var(--header-bg) 0%, transparent 100%)",
              zIndex: 1,
              pointerEvents: "none",
            }}
          />
          <div
            className="marquee-mask-right"
            style={{
              position: "absolute",
              right: 0, top: 0, bottom: 0,
              width: "var(--marquee-mask)",
              background: "linear-gradient(270deg, var(--header-bg) 0%, transparent 100%)", // [FIX] Corrected gradient direction
              zIndex: 1,
              pointerEvents: "none",
            }}
          />

          {/* [MODIFIED] New track structure */}
          <div
            ref={trackRef}
            className={`marquee-track ${isPaused || !isVisible ? "paused" : ""}`}
            style={{
              display: "flex", // Use flex for the track
              width: "max-content",
              alignItems: "center",
              willChange: "transform",
              transform: "translate3d(0,0,0)",
              animation: "marquee-scroll var(--animation-duration) linear infinite",
              animationDirection: animateDir === 'rtl' ? 'normal' : 'reverse',
              animationPlayState: (isPaused || !isVisible) ? "paused" : "running",
              transition: "animation-duration 0.3s ease-out", // Smooth speed boost
            }}
          >
            {/* Segment A (Measured) */}
            <ul ref={segmentRef} className="marquee-segment">
              {elements.map((item, i) => (
                <li key={`item-a-${i}`} className="marquee-item">
                  {item.icon && (
                    <item.icon
                      size={14}
                      style={{ color: "var(--orange)", flexShrink: 0, minWidth: 14, minHeight: 14 }}
                    />
                  )}
                  <span>{item.text}</span>
                </li>
              ))}
            </ul>
            {/* Segment B (Clone) */}
            <ul className="marquee-segment" aria-hidden="true">
              {elements.map((item, i) => (
                <li key={`item-b-${i}`} className="marquee-item">
                  {item.icon && (
                    <item.icon
                      size={14}
                      style={{ color: "var(--orange)", flexShrink: 0, minWidth: 14, minHeight: 14 }}
                    />
                  )}
                  <span>{item.text}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <style>{`
/* =============== TrustBar Scoped Styles & Animations =============== */

/* [NEW] Keyframes driven by CSS vars */
@keyframes marquee-scroll {
  from { transform: translate3d(0,0,0); }
  to   { transform: translate3d(calc(var(--animation-distance) * -1), 0, 0); }
}

.trustbar .marquee-track.paused {
  animation-play-state: paused !important;
}

/* [NEW] Segment styling */
.trustbar .marquee-segment {
  display: inline-flex;
  align-items: center;
  padding: 0.625rem 0;
  white-space: nowrap;
  flex-shrink: 0;
  /* 'gap' replaced by margin on items */
}

/* [NEW] Margin fallback for gap between segments */
.trustbar .marquee-segment:not(:first-child) {
  margin-left: var(--marquee-gap);
}

/* [NEW] Item styling */
.trustbar .marquee-item {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem; /* gap inside item is fine */
  font-size: clamp(0.6875rem, 1.5vw, 0.875rem);
  line-height: 1.2;
  color: var(--text);
  white-space: nowrap;
  flex-shrink: 0;
  padding-inline: 0.1rem; /* Slight touch target increase */
}

/* [NEW] Margin fallback for gap between items */
.trustbar .marquee-segment > .marquee-item:not(:first-child) {
  margin-left: var(--marquee-gap);
}


/* --- Static (Reduced Motion) Fallback --- */

/* [FIX] Margin fallback for static list */
.trustbar .static-trust-item:not(:first-child) {
  margin-left: var(--marquee-gap);
}

/* Hide default scrollbars for static mode */
.trustbar .static-trust-bar::-webkit-scrollbar { display: none; }
.trustbar .static-trust-bar { scrollbar-width: none; -ms-overflow-style: none; }

/* iOS-specific smoothing (still useful) */
.trustbar .marquee-track {
  -webkit-backface-visibility: hidden;
  -webkit-perspective: 1000;
}
      `}</style>
    </div>
  );
};

export default TrustBar;