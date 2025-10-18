// Updated Trustbar.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";

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

  const duplicatedItems = useMemo(() => [...elements, ...elements, ...elements], [elements]);

  useEffect(() => {
    const iOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    setIsIOS(iOS);
  }, []);

  const kick = () => {
    const track = trackRef.current;
    if (!track) return;
    track.style.animation = "none";
    track.offsetHeight;
    track.style.animation = "";
    track.classList.remove("animate");
    track.offsetWidth;
    track.classList.add("animate");
    track.style.transform = "translate3d(0,0,0)";
    track.style.webkitTransform = "translate3d(0,0,0)";
  };

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
  }, [prefersReduced, forceMotion]);

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

  const handleTouchStart = () => setIsPaused(true);
  const handleTouchEnd = () => {
    setIsPaused(false);
    if (trackRef.current) requestAnimationFrame(kick);
  };
  const handleMouseEnter = () => !isIOS && setIsPaused(true);
  const handleMouseLeave = () => !isIOS && setIsPaused(false);

  const showStatic = prefersReduced && !forceMotion;
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
        ["--marquee-duration"]: `${speed}s`,
        ["--marquee-distance"]: translatePercent,
        ["--marquee-gap"]: `${gapRem}rem`,
        ["--marquee-mask"]: maskWidth,
      }}
    >
      {showStatic ? (
        <div className="static-trust-bar" style={{ padding: "0.625rem 1rem", display: "flex", gap: "var(--marquee-gap)", overflowX: "auto", scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch" }}>
          {elements.map((item, i) => (
            <div key={`static-${i}`} style={{ whiteSpace: "nowrap", fontSize: "0.75rem", color: "var(--text)", display: "inline-flex", gap: "0.5rem", alignItems: "center", flexShrink: 0 }}>
              {item.icon && <item.icon size={14} style={{ color: "var(--orange)", flexShrink: 0 }} />}
              <span>{item.text}</span>
            </div>
          ))}
        </div>
      ) : (
        <div
          ref={containerRef}
          className="marquee-container"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          style={{ position: "relative", overflow: "hidden", cursor: "default", WebkitUserSelect: "none", userSelect: "none" }}
        >
          <div className="marquee-mask-left" style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "var(--marquee-mask)", background: "linear-gradient(90deg, var(--header-bg) 0%, transparent 100%)", zIndex: 1, pointerEvents: "none" }} />
          <div className="marquee-mask-right" style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "var(--marquee-mask)", background: "linear-gradient(90deg, transparent 0%, var(--header-bg) 100%)", zIndex: 1, pointerEvents: "none" }} />

          <div
            ref={trackRef}
            className={`marquee-track animate ${isPaused ? "paused" : ""} ${!isVisible ? "hidden-tab" : ""} ${isIOS ? "ios-track" : ""}`}
            style={{ display: "inline-flex", alignItems: "center", gap: "var(--marquee-gap)", padding: "0.625rem 0", whiteSpace: "nowrap" }}
          >
            {duplicatedItems.map((item, i) => (
              <span
                key={`item-${i}`}
                className="marquee-item"
                style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", fontSize: "clamp(0.6875rem, 1.5vw, 0.875rem)", lineHeight: 1.2, color: "var(--text)", whiteSpace: "nowrap", flexShrink: 0 }}
              >
                {item.icon && <item.icon size={14} style={{ color: "var(--orange)", flexShrink: 0, minWidth: 14, minHeight: 14 }} />}
                <span>{item.text}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <style>{`/* Scoped styles omitted here for brevity. Reuse previous <style> block or move to external CSS file */`}</style>
    </div>
  );
};

export default TrustBar;
