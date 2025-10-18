// frontend/src/components/Trustbar.jsx
/* ---------------- Trust Bar (cross-browser, iOS-fixed) ---------------- */
import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * Props:
 *  - items?: Array<{ text: string, icon?: React.FC<{ size?: number, style?: React.CSSProperties }> }>
 *  - prefersReduced?: boolean    // optional; if omitted we'll detect via matchMedia
 *  - forceMotion?: boolean       // NEW: force marquee even if reduced motion is on (useful for iOS)
 *  - speed?: number              // NEW: seconds per loop (default 45)
 *  - direction?: "rtl" | "ltr"   // NEW: scroll direction (default "rtl" → right→left)
 *  - gapRem?: number             // NEW: gap between items in rem (default 2)
 *  - maskWidth?: string          // NEW: CSS width for fade masks (default "clamp(20px, 8%, 60px)")
 */
const TrustBar = ({
  items,
  prefersReduced: prefersReducedProp,
  forceMotion = false,
  speed = 45,
  direction = "rtl",
  gapRem = 2,
  maskWidth = "clamp(20px, 8%, 60px)",
}) => {
  const elements = Array.isArray(items) ? items : [];
  const trackRef = useRef(null);
  const containerRef = useRef(null);

  const [isPaused, setIsPaused] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [isIOS, setIsIOS] = useState(false);

  // Reduced-motion preference (live-updating unless explicitly provided)
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
    try {
      m.addEventListener?.("change", handler);
    } catch {
      m.addListener?.(handler);
    }
    return () => {
      try {
        m.removeEventListener?.("change", handler);
      } catch {
        m.removeListener?.(handler);
      }
    };
  }, [prefersReducedProp]);

  // Duplicate list for seamless loop (3× is plenty and light)
  const duplicatedItems = useMemo(
    () => [...elements, ...elements, ...elements],
    [elements]
  );

  // Detect iOS (covers iPadOS on Mac chip w/ touch)
  useEffect(() => {
    const iOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    setIsIOS(iOS);
  }, []);

  // Helper: kick / re-kick the CSS animation (iOS Safari)
  const kick = () => {
    const track = trackRef.current;
    if (!track) return;
    track.style.animation = "none";
    // force reflow
    // eslint-disable-next-line no-unused-expressions
    track.offsetHeight;
    track.style.animation = "";
    track.classList.remove("animate");
    // eslint-disable-next-line no-unused-expressions
    track.offsetWidth;
    track.classList.add("animate");
    // ensure GPU layer
    track.style.transform = "translate3d(0,0,0)";
    track.style.webkitTransform = "translate3d(0,0,0)";
  };

  // Begin animation on mount and when toggles change (iOS is picky)
  useEffect(() => {
    // If reduced motion is requested and we are NOT forcing motion, do nothing
    const shouldAnimate = !(prefersReduced && !forceMotion);
    if (!shouldAnimate) return;

    // Kick on iOS (and as a harmless no-op elsewhere)
    if (trackRef.current) {
      const t1 = setTimeout(kick, 120);
      const t2 = setTimeout(kick, 480);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [prefersReduced, forceMotion]);

  // Extra reliability hooks for WebKit/iOS (tab hidden, BFCache restore, etc.)
  useEffect(() => {
    const onVisibility = () => {
      const visible = !document.hidden;
      setIsVisible(visible);
      if (visible && trackRef.current) kick();
    };
    const onPageShow = (e) => {
      // Fire on BFCache restore
      if (e.persisted && trackRef.current) kick();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, []);

  // Intersection observer: only run when visible in viewport (battery-friendly)
  useEffect(() => {
    if (!trackRef.current || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            setIsPaused(true);
          } else {
            setIsPaused(false);
            // iOS sometimes needs a kick when re-entering
            kick();
          }
        });
      },
      { root: null, threshold: 0.01 }
    );
    io.observe(trackRef.current);
    return () => io.disconnect();
  }, []);

  // Input handlers (touch = pause; unpause & re-kick on iOS)
  const handleTouchStart = () => setIsPaused(true);
  const handleTouchEnd = () => {
    setIsPaused(false);
    // restart after touch (especially on iOS)
    if (trackRef.current) requestAnimationFrame(kick);
  };
  const handleMouseEnter = () => !isIOS && setIsPaused(true);
  const handleMouseLeave = () => !isIOS && setIsPaused(false);

  // Decide final animation enablement
  const showStatic = prefersReduced && !forceMotion;

  // CSS direction: rtl (right→left) by default
  const translatePercent = direction === "rtl" ? "-33.333%" : "33.333%";

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
        // Expose runtime tunables as CSS vars
        ["--marquee-duration"]: `${speed}s`,
        ["--marquee-distance"]: translatePercent,
        ["--marquee-gap"]: `${gapRem}rem`,
        ["--marquee-mask"]: maskWidth,
      }}
    >
      {showStatic ? (
        /* Static, scrollable list for reduced motion users */
        <div
          className="static-trust-bar"
          style={{
            padding: "0.625rem 1rem",
            display: "flex",
            gap: "var(--marquee-gap)",
            overflowX: "auto",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {elements.map((item, i) => (
            <div
              key={`static-${i}`}
              style={{
                whiteSpace: "nowrap",
                fontSize: "0.75rem",
                color: "var(--text)",
                display: "inline-flex",
                gap: "0.5rem",
                alignItems: "center",
                flexShrink: 0,
              }}
            >
              {item.icon && (
                <item.icon size={14} style={{ color: "var(--orange),", flexShrink: 0 }} />
              )}
              <span>{item.text}</span>
            </div>
          ))}
        </div>
      ) : (
        /* Animated marquee */
        <div
          ref={containerRef}
          className="marquee-container"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          style={{
            position: "relative",
            overflow: "hidden",
            cursor: "default",
            WebkitUserSelect: "none",
            userSelect: "none",
          }}
        >
          {/* fade masks */}
          <div
            className="marquee-mask-left"
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
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
              right: 0,
              top: 0,
              bottom: 0,
              width: "var(--marquee-mask)",
              background: "linear-gradient(90deg, transparent 0%, var(--header-bg) 100%)",
              zIndex: 1,
              pointerEvents: "none",
            }}
          />

          <div
            ref={trackRef}
            className={`marquee-track animate ${isPaused ? "paused" : ""} ${
              !isVisible ? "hidden-tab" : ""
            } ${isIOS ? "ios-track" : ""}`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "var(--marquee-gap)",
              padding: "0.625rem 0",
              whiteSpace: "nowrap",
            }}
          >
            {duplicatedItems.map((item, i) => (
              <span
                key={`item-${i}`}
                className="marquee-item"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  fontSize: "clamp(0.6875rem, 1.5vw, 0.875rem)",
                  lineHeight: 1.2,
                  color: "var(--text)",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
              >
                {item.icon && (
                  <item.icon
                    size={14}
                    style={{
                      color: "var(--orange)",
                      flexShrink: 0,
                      minWidth: 14,
                      minHeight: 14,
                    }}
                  />
                )}
                <span>{item.text}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Component-scoped CSS (kept inline for portability) */}
      <style>{`
        .trustbar {
          user-select: none;
          -webkit-user-select: none;
          -webkit-tap-highlight-color: transparent;
        }
        .static-trust-bar::-webkit-scrollbar { display: none; }

        /* Smooth, GPU-accelerated translate for continuous scroll */
        @keyframes marquee-scroll {
          0%   { transform: translate3d(0,0,0); }
          100% { transform: translate3d(var(--marquee-distance),0,0); }
        }
        @-webkit-keyframes marquee-scroll {
          0%   { -webkit-transform: translate3d(0,0,0); transform: translate3d(0,0,0); }
          100% { -webkit-transform: translate3d(var(--marquee-distance),0,0); transform: translate3d(var(--marquee-distance),0,0); }
        }

        .marquee-track {
          will-change: transform;
          transform: translate3d(0,0,0);
          -webkit-transform: translate3d(0,0,0);
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
          perspective: 1000px;
          -webkit-perspective: 1000px;
          transform-style: preserve-3d;
          -webkit-transform-style: preserve-3d;
        }
        .marquee-track.animate {
          animation: marquee-scroll var(--marquee-duration) linear infinite;
          -webkit-animation: marquee-scroll var(--marquee-duration) linear infinite;
        }

        /* iOS polish */
        .ios-track { -webkit-font-smoothing: subpixel-antialiased; }
        .ios-track.animate {
          animation-timing-function: linear;
          animation-fill-mode: forwards;
          -webkit-animation-timing-function: linear;
          -webkit-animation-fill-mode: forwards;
        }

        /* Pause states */
        .marquee-track.paused,
        .marquee-track.hidden-tab {
          animation-play-state: paused !important;
          -webkit-animation-play-state: paused !important;
        }

        /* Speed by viewport (kept consistent with your previous values) */
        @media (max-width: 640px) {
          .trustbar { --marquee-duration: calc(${speed}s * 0.78); }
        }
        @media (min-width: 641px) and (max-width: 1024px) {
          .trustbar { --marquee-duration: calc(${speed}s * 0.89); }
        }
        @media (min-width: 1025px) {
          .trustbar { --marquee-duration: ${speed}s; }
        }

        /* Respect reduced motion (unless forceMotion=true was set by parent) */
        @media (prefers-reduced-motion: reduce) {
          .marquee-track { animation: none !important; -webkit-animation: none !important; }
        }

        /* Rendering tweaks */
        .marquee-container {
          -webkit-font-smoothing: antialiased;
          transform: translateZ(0);
          isolation: isolate;
        }
        .marquee-item {
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
          transform: translate3d(0,0,0);
          -webkit-transform: translate3d(0,0,0);
        }

        /* iOS/Safari extras */
        @supports (-webkit-touch-callout: none) {
          .marquee-container { -webkit-overflow-scrolling: touch; contain: layout style paint; }
          .marquee-track > * { transform: translateZ(0); -webkit-transform: translateZ(0); }
        }

        /* Accessibility: hide masks in high-contrast modes */
        @media (prefers-contrast: high) {
          .marquee-mask-left, .marquee-mask-right { display: none; }
        }
      `}</style>
    </div>
  );
};

export default TrustBar;
