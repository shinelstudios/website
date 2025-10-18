// frontend/src/components/Trustbar.jsx
/* ---------------- Trust Bar (cross-browser, iOS-fixed) ---------------- */
import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * Props:
 *  - items?: Array<{ text: string, icon?: React.FC<{ size?: number, style?: React.CSSProperties }> }>
 *  - prefersReduced?: boolean  // optional; if omitted we'll detect via matchMedia
 */
const TrustBar = ({ items, prefersReduced: prefersReducedProp }) => {
  const elements = Array.isArray(items) ? items : [];
  const trackRef = useRef(null);
  const containerRef = useRef(null);

  const [isPaused, setIsPaused] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [isIOS, setIsIOS] = useState(false);
  const [prefersReduced, setPrefersReduced] = useState(() => {
    if (typeof prefersReducedProp === "boolean") return prefersReducedProp;
    if (typeof window !== "undefined" && window.matchMedia) {
      try {
        return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      } catch {}
    }
    return false;
  });

  // Keep prefers-reduced-motion in sync if not explicitly provided as a prop
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
      // Safari < 14 fallback
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

  // Duplicate the list 3× to allow a seamless loop
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

  // (iOS) Kick/re-kick the CSS animation so Safari always starts it
  useEffect(() => {
    if (prefersReduced || !isIOS || !trackRef.current) return;
    const track = trackRef.current;

    const startAnimation = () => {
      track.style.animation = "none";
      // force reflow
      // eslint-disable-next-line no-unused-expressions
      track.offsetHeight;
      track.style.animation = "";
      // also flip the class for good measure
      track.classList.remove("animate");
      // eslint-disable-next-line no-unused-expressions
      track.offsetWidth;
      track.classList.add("animate");
      // ensure GPU layer
      track.style.transform = "translate3d(0,0,0)";
      track.style.webkitTransform = "translate3d(0,0,0)";
    };

    const t1 = setTimeout(startAnimation, 120);
    const t2 = setTimeout(startAnimation, 480);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [prefersReduced, isIOS]);

  // Pause when tab hidden; on iOS, restart on visibility gain
  useEffect(() => {
    const onVis = () => {
      const visible = !document.hidden;
      setIsVisible(visible);
      if (visible && isIOS && trackRef.current) {
        const track = trackRef.current;
        track.style.animation = "none";
        // eslint-disable-next-line no-unused-expressions
        track.offsetHeight;
        track.style.animation = "";
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [isIOS]);

  // Input handlers (touch = pause; unpause & re-kick on iOS)
  const handleTouchStart = () => setIsPaused(true);
  const handleTouchEnd = () => {
    setIsPaused(false);
    if (isIOS && trackRef.current) {
      requestAnimationFrame(() => {
        const track = trackRef.current;
        track.style.animation = "none";
        // eslint-disable-next-line no-unused-expressions
        track.offsetHeight;
        track.style.animation = "";
      });
    }
  };

  const handleMouseEnter = () => !isIOS && setIsPaused(true);
  const handleMouseLeave = () => !isIOS && setIsPaused(false);

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
      }}
    >
      {prefersReduced ? (
        /* Static, scrollable list for reduced motion users */
        <div
          className="static-trust-bar"
          style={{
            padding: "0.625rem 1rem",
            display: "flex",
            gap: "1.5rem",
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
                <item.icon size={14} style={{ color: "var(--orange)", flexShrink: 0 }} />
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
              width: "clamp(20px, 8%, 60px)",
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
              width: "clamp(20px, 8%, 60px)",
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
              gap: "2rem",
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
                      minWidth: "14px",
                      minHeight: "14px",
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
          --marquee-duration: 45s;
          user-select: none;
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          -webkit-tap-highlight-color: transparent;
        }
        .static-trust-bar::-webkit-scrollbar { display: none; }

        /* Smooth, GPU-accelerated translate for continuous scroll */
        @keyframes marquee-scroll {
          0%   { transform: translate3d(0,0,0); }
          100% { transform: translate3d(-33.333%,0,0); }
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

        /* Speed by viewport */
        @media (max-width: 640px) { .trustbar { --marquee-duration: 35s; } }
        @media (min-width: 641px) and (max-width: 1024px) { .trustbar { --marquee-duration: 40s; } }
        @media (min-width: 1025px) { .trustbar { --marquee-duration: 50s; } }

        /* Respect reduced motion */
        @media (prefers-reduced-motion: reduce) {
          .marquee-track { animation: none !important; -webkit-animation: none !important; }
        }

        /* Rendering tweaks */
        .marquee-container { -webkit-font-smoothing: antialiased; transform: translateZ(0); isolation: isolate; }
        .marquee-item {
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
          transform: translate3d(0,0,0);
          -webkit-transform: translate3d(0,0,0);
        }

        /* iOS/Safari extras & accessibility helpers */
        @supports (-webkit-touch-callout: none) {
          .marquee-container { -webkit-overflow-scrolling: touch; contain: layout style paint; }
          .marquee-track > * { transform: translateZ(0); -webkit-transform: translateZ(0); }
        }
        @media (prefers-contrast: high) {
          .marquee-mask-left, .marquee-mask-right { display: none; }
        }
      `}</style>
    </div>
  );
};

export default TrustBar;
