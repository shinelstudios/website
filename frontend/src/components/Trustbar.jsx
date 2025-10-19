// frontend/src/components/TrustBar.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";

const TrustBar = ({
  items,
  prefersReduced: prefersReducedProp,
  forceMotion = false,
  speed = 45,                 // seconds per loop
  direction = "rtl",          // "rtl" or "ltr"
  gapRem = 2,
  maskWidth = "clamp(20px, 8%, 60px)",
  boostOnHover = true,        // speed boost on hover/press
  boostFactor = 0.6,          // lower = faster (duration * factor)
  enableScrub = true,         // drag to scrub on touch
}) => {
  const elements = Array.isArray(items) ? items : [];
  const trackRef = useRef(null);
  const containerRef = useRef(null);

  const [isPaused, setIsPaused] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [isIOS, setIsIOS] = useState(false);
  const [isBoosted, setIsBoosted] = useState(false);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubStartX, setScrubStartX] = useState(0);
  const [scrubOffsetX, setScrubOffsetX] = useState(0);

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

  // Triple the items so we can loop seamlessly
  const duplicatedItems = useMemo(() => [...elements, ...elements, ...elements], [elements]);

  // iOS detection (for subtle behavior tweaks)
  useEffect(() => {
    try {
      const iOS =
        /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
      setIsIOS(iOS);
    } catch {}
  }, []);

  // Kick/restart animation
  const kick = () => {
    const track = trackRef.current;
    if (!track) return;
    track.style.animation = "none";
    // reflow
    // eslint-disable-next-line no-unused-expressions
    track.offsetHeight;
    track.style.animation = "";
    track.classList.remove("animate");
    // reflow
    // eslint-disable-next-line no-unused-expressions
    track.offsetWidth;
    track.classList.add("animate");
    // ensure GPU acceleration
    track.style.transform = "translate3d(0,0,0)";
    track.style.webkitTransform = "translate3d(0,0,0)";
  };

  // Start/keep the animation alive
  useEffect(() => {
    const shouldAnimate = !(prefersReduced && !forceMotion);
    if (!shouldAnimate) return;
    if (trackRef.current) {
      const t1 = setTimeout(kick, 120);
      const t2 = setTimeout(kick, 480);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [prefersReduced, forceMotion, direction, speed, elements.length]);

  // Handle tab/page visibility
  useEffect(() => {
    const onVisibility = () => {
      const visible = !document.hidden;
      setIsVisible(visible);
      if (visible && trackRef.current) kick();
    };
    const onPageShow = (e) => {
      if (e.persisted && trackRef.current) kick();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, []);

  // Pause when not on screen
  useEffect(() => {
    if (!trackRef.current || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            setIsPaused(true);
          } else {
            setIsPaused(false);
            kick();
          }
        });
      },
      { root: null, threshold: 0.01 }
    );
    io.observe(trackRef.current);
    return () => io.disconnect();
  }, []);

  // Hover / touch pause + speed boost
  const handleTouchStart = (e) => {
    setIsPaused(true);
    if (boostOnHover) setIsBoosted(true);
    if (enableScrub) {
      setIsScrubbing(true);
      setScrubStartX(e.touches?.[0]?.clientX ?? 0);
      setScrubOffsetX(0);
    }
  };
  const handleTouchMove = (e) => {
    if (!isScrubbing || !enableScrub) return;
    const x = e.touches?.[0]?.clientX ?? 0;
    const delta = x - scrubStartX;
    setScrubOffsetX(delta);
    // apply a manual translate during scrub
    const track = trackRef.current;
    if (track) {
      track.style.transition = "none";
      track.style.transform = `translate3d(${delta}px,0,0)`;
    }
  };
  const handleTouchEnd = () => {
    setIsPaused(false);
    if (boostOnHover) setIsBoosted(false);
    if (enableScrub) {
      setIsScrubbing(false);
      setScrubOffsetX(0);
      // resume CSS animation from clean state
      if (trackRef.current) {
        trackRef.current.style.transition = "";
        trackRef.current.style.transform = "translate3d(0,0,0)";
        requestAnimationFrame(kick);
      }
    }
  };
  const handleMouseEnter = () => {
    if (!isIOS) {
      setIsPaused(true);
      if (boostOnHover) setIsBoosted(true);
    }
  };
  const handleMouseLeave = () => {
    if (!isIOS) {
      setIsPaused(false);
      if (boostOnHover) setIsBoosted(false);
    }
  };

  const showStatic = prefersReduced && !forceMotion;
  const animateDir = direction === "rtl" ? "rtl" : "ltr";
  const baseDuration = Math.max(4, Number(speed) || 45); // clamp sane min
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
        ["--marquee-gap"]: `${gapRem}rem`,
        ["--marquee-mask"]: maskWidth,
      }}
      aria-live="off"
    >
      {showStatic ? (
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
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{
            position: "relative",
            overflow: "hidden",
            cursor: enableScrub ? "ew-resize" : "default",
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
            className={`marquee-track animate ${isPaused ? "paused" : ""} ${!isVisible ? "hidden-tab" : ""} ${isIOS ? "ios-track" : ""}`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "var(--marquee-gap)",
              padding: "0.625rem 0",
              whiteSpace: "nowrap",
              willChange: "transform",
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
                    style={{ color: "var(--orange)", flexShrink: 0, minWidth: 14, minHeight: 14 }}
                  />
                )}
                <span>{item.text}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <style>{`
/* =============== TrustBar Scoped Styles & Animations =============== */

.trustbar .marquee-track.animate {
  animation-duration: var(--marquee-duration);
  animation-timing-function: linear;
  animation-iteration-count: infinite;
  animation-name: marquee-rtl; /* default; overridden by container dir class */
}

.trustbar .dir-ltr .marquee-track.animate {
  animation-name: marquee-ltr;
}

/* Pause states */
.trustbar .marquee-track.paused,
.trustbar .marquee-track.hidden-tab {
  animation-play-state: paused !important;
}

/* iOS-specific smoothing */
.trustbar .marquee-track.ios-track {
  transform: translate3d(0,0,0);
  -webkit-transform: translate3d(0,0,0);
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  perspective: 1000;
  -webkit-perspective: 1000;
}

/* Keyframes:
   We tripled the content; moving by -33.333% (or +33.333% for LTR) yields a seamless loop.
*/
@keyframes marquee-rtl {
  from { transform: translate3d(0,0,0); }
  to   { transform: translate3d(-33.333%, 0, 0); }
}
@keyframes marquee-ltr {
  from { transform: translate3d(0,0,0); }
  to   { transform: translate3d(33.333%, 0, 0); }
}

/* Hide default scrollbars for static mode on WebKit */
.trustbar .static-trust-bar::-webkit-scrollbar { display: none; }

/* Slight accessibility tuning: increase touch target affordance */
.trustbar .marquee-item { padding-inline: 0.1rem; }

/* Optional hover boost cursor feedback (desktop) */
@media (hover:hover) and (pointer:fine) {
  .trustbar .marquee-container { cursor: ${enableScrub ? 'ew-resize' : 'default'}; }
}
      `}</style>
    </div>
  );
};

export default TrustBar;
