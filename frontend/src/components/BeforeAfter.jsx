import React, { useState, useEffect, useRef } from "react";
import {
  motion,
  useMotionValue,
  useTransform,
  animate,
} from "framer-motion";

/* ===================== Enhanced Before/After (keyboard + drag + animations) ===================== */
const BeforeAfter = ({
  before,
  after,
  label = "Thumbnail Revamp",
  beforeAlt = "Before",
  afterAlt = "After",
  width = 1280,
  height = 720,
}) => {
  // [NEW] Use MotionValue for performant, non-React-rerender updates
  const vPct = useMotionValue(50);

  // [NEW] Keep a separate React state *only* for ARIA attributes
  // This syncs from the MotionValue but doesn't drive the animation
  const [v, setV] = useState(50);
  useEffect(() => vPct.on("change", setV), [vPct]);

  const [isHovering, setIsHovering] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const wrapRef = useRef(null);
  const dragging = useRef(false);

  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

  // [MODIFIED] setFromClientX now updates the MotionValue directly
  const setFromClientX = (clientX) => {
    const el = wrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pct = ((clientX - rect.left) / rect.width) * 100;
    vPct.set(clamp(pct, 0, 100)); // Use .set() for a direct update
  };

  // Pointer handlers
  useEffect(() => {
    const onMove = (e) => {
      if (!dragging.current) return;
      if (e.type.startsWith("touch") && e.touches.length > 0) {
        setFromClientX(e.touches[0].clientX);
        e.preventDefault();
      } else if (e.clientX !== undefined) {
        setFromClientX(e.clientX);
      }
    };
    const onUp = () => {
      dragging.current = false;
      setIsDragging(false);
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    document.addEventListener("touchmove", onMove, { passive: false });
    document.addEventListener("touchend", onUp, { passive: true });
    document.addEventListener("touchcancel", onUp, { passive: true });

    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend", onUp);
      document.removeEventListener("touchcancel", onUp);
    };
  }, [vPct]); // [MODIFIED] Add vPct to dependency array

  // Auto-play demo on first view
  const [hasPlayed, setHasPlayed] = useState(false);
  useEffect(() => {
    if (hasPlayed || reduceMotion) return;
    const el = wrapRef.current;
    if (!el || !("IntersectionObserver" in window)) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasPlayed) {
          setHasPlayed(true);
          
          // [MODIFIED] Use Framer Motion's animate utility for performant auto-play
          const controls = animate(vPct, [50, 75, 25, 50], {
            duration: 2,
            ease: "easeInOut",
          });
          
          // Store controls to stop them on unmount
          el.animationControls = controls;
        }
      },
      { threshold: 0.3, rootMargin: "0px" }
    );

    io.observe(el);
    return () => {
      io.disconnect();
      if (el.animationControls) {
        el.animationControls.stop();
      }
    };
  }, [hasPlayed, reduceMotion, vPct]);

  // [NEW] Create transform MotionValues
  const clip = useTransform(vPct, (latest) => `inset(0 ${100 - latest}% 0 0)`);
  const left = useTransform(vPct, (latest) => `${latest}%`);

  return (
    <figure className="w-full max-w-4xl mx-auto" role="group" aria-labelledby="ba-caption">
      <div
        ref={wrapRef}
        className="relative rounded-2xl overflow-hidden border-2 select-none group"
        style={{
          borderColor: isDragging ? "var(--orange)" : "var(--border)",
          boxShadow: isDragging
            ? "0 20px 40px rgba(232,80,2,0.25)"
            : isHovering
            ? "0 12px 30px rgba(0,0,0,0.15)"
            : "0 8px 20px rgba(0,0,0,0.1)",
          transition: "all 0.3s ease",
          touchAction: "none",
          WebkitTapHighlightColor: "transparent",
          WebkitUserSelect: "none",
          WebkitTouchCallout: "none",
        }}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        onMouseDown={(e) => {
          dragging.current = true;
          setIsDragging(true);
          setFromClientX(e.clientX);
        }}
        onTouchStart={(e) => {
          dragging.current = true;
          setIsDragging(true);
          if (e.touches.length > 0) {
            setFromClientX(e.touches[0].clientX);
          }
        }}
      >
        {/* AFTER image (background) */}
        <div className="relative">
          <img
            src={after}
            alt={afterAlt}
            loading="lazy"
            decoding="async"
            width={width}
            height={height}
            className="w-full block"
            style={{ aspectRatio: `${width} / ${height}` }}
          />
          
          {/* After label */}
          <motion.div
            className="absolute top-4 right-4 px-3 py-1.5 rounded-full text-xs font-semibold"
            style={{
              background: "rgba(0,0,0,0.75)",
              color: "#fff",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
              willChange: "transform, opacity",
            }}
            initial={reduceMotion ? {} : { opacity: 0, x: 10 }}
            animate={reduceMotion ? {} : { opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            ✨ After
          </motion.div>
        </div>

        {/* BEFORE image (revealed by clipPath) */}
        {/* [MODIFIED] Converted to motion.div and using style={clip} */}
        <motion.div
          className="absolute inset-0"
          style={{
            clipPath: clip,
            WebkitClipPath: clip,
          }}
        >
          <img
            src={before}
            alt={beforeAlt}
            loading="lazy"
            decoding="async"
            width={width}
            height={height}
            className="w-full block"
            style={{ aspectRatio: `${width} / ${height}` }}
          />
          
          {/* Before label */}
          <motion.div
            className="absolute top-4 left-4 px-3 py-1.5 rounded-full text-xs font-semibold"
            style={{
              background: "rgba(0,0,0,0.75)",
              color: "#fff",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
              willChange: "transform, opacity",
            }}
            initial={reduceMotion ? {} : { opacity: 0, x: -10 }}
            // [MODIFIED] Driven by React state `v` which is synced from MotionValue
            animate={reduceMotion ? {} : { opacity: v > 15 ? 1 : 0, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            📷 Before
          </motion.div>
        </motion.div>

        {/* Enhanced divider line with glow */}
        {/* [MODIFIED] Converted to motion.div and using style={left} */}
        <motion.div
          className="absolute top-0 bottom-0 pointer-events-none"
          style={{
            left: left, // Using MotionValue
            width: 3,
            background: "linear-gradient(to bottom, rgba(232,80,2,0), var(--orange), rgba(232,80,2,0))",
            boxShadow: isDragging
              ? "0 0 20px rgba(232,80,2,0.8), 0 0 40px rgba(232,80,2,0.4)"
              : "0 0 10px rgba(232,80,2,0.5)",
            transition: "box-shadow 0.2s ease",
            willChange: "transform",
            transform: "translate3d(0, 0, 0)", // Keep GPU acceleration
          }}
          aria-hidden="true"
        />

        {/* Handle with enhanced design */}
        {/* [MODIFIED] Converted to motion.button and using style={left} */}
        <motion.button
          type="button"
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-12 w-12 rounded-full shadow-xl focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--orange)] z-10"
          style={{
            left: left, // Using MotionValue
            background: "linear-gradient(135deg, var(--orange), #ff9357)",
            color: "#fff",
            border: "3px solid rgba(255,255,255,0.9)",
            cursor: isDragging ? "grabbing" : "grab",
            willChange: "transform",
            transform: "translate3d(-50%, -50%, 0)", // Keep GPU acceleration
            WebkitTapHighlightColor: "transparent",
          }}
          // [MODIFIED] Updated ARIA label and valuenow
          aria-label={`${label}: ${Math.round(v)} percent. Use arrow keys to adjust.`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(v)}
          role="slider"
          onKeyDown={(e) => {
            // [MODIFIED] Update MotionValue directly
            const current = vPct.get();
            if (e.key === "ArrowLeft") vPct.set(clamp(current - 2, 0, 100));
            if (e.key === "ArrowRight") vPct.set(clamp(current + 2, 0, 100));
            if (e.key === "Home") vPct.set(0);
            if (e.key === "End") vPct.set(100);
          }}
          onMouseDown={() => {
            dragging.current = true;
            setIsDragging(true);
          }}
          onTouchStart={(e) => {
            e.stopPropagation();
            dragging.current = true;
            setIsDragging(true);
          }}
          whileHover={reduceMotion ? {} : { scale: 1.1 }}
          whileTap={reduceMotion ? {} : { scale: 0.95 }}
          animate={
            !reduceMotion && !isDragging && isHovering
              ? { scale: [1, 1.05, 1] }
              : {}
          }
          transition={{ duration: 2, repeat: Infinity }}
        >
          {/* Enhanced icon */}
          <div className="flex items-center justify-center">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M13 6l-6 6 6 6M19 6l-6 6 6 6"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          {/* Pulse ring on hover */}
          {!reduceMotion && (isHovering || isDragging) && (
            <motion.div
              className="absolute inset-0 rounded-full border-2"
              style={{ borderColor: "var(--orange)" }}
              initial={{ scale: 1, opacity: 0.8 }}
              animate={{ scale: 1.8, opacity: 0 }}
              transition={{ duration: 1.5, repeat: Infinity }}
              aria-hidden="true"
            />
          )}
        </motion.button>

        {/* Progress indicator */}
        <motion.div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full text-xs font-semibold"
          style={{
            background: "rgba(0,0,0,0.75)",
            color: "#fff",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            willChange: "transform, opacity",
            transform: "translate3d(-50%, 0, 0)",
          }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: isDragging ? 1 : 0, y: isDragging ? 0 : 10 }}
          transition={{ duration: 0.2 }}
        >
          {Math.round(v)}%
        </motion.div>

        {/* Hint overlay (shows briefly on first view) */}
        {!hasPlayed && !reduceMotion && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{
              background: "rgba(0,0,0,0.4)",
              backdropFilter: "blur(2px)",
              WebkitBackdropFilter: "blur(2px)",
            }}
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            transition={{ delay: 3, duration: 0.5 }}
          >
            <div
              className="px-4 py-2 rounded-full text-sm font-semibold"
              style={{
                background: "rgba(255,255,255,0.95)",
                color: "var(--text)",
              }}
            >
              👆 Drag to compare
            </div>
          </motion.div>
        )}

        {/* [REMOVED] Visually-hidden range input is no longer needed */}
      </div>

      {/* Enhanced caption */}
      <figcaption id="ba-caption" className="text-center mt-4">
        <motion.div
          className="inline-flex flex-col items-center gap-2"
          initial={reduceMotion ? {} : { opacity: 0, y: 10 }}
          animate={reduceMotion ? {} : { opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="text-sm md:text-base font-semibold" style={{ color: "var(--text)" }}>
            {label}
          </div>
          <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
            <span className="hidden sm:inline">
              <span className="font-medium" style={{ color: "var(--text)" }}>Drag</span> the slider or use
            </span>
            <span className="sm:hidden">Use</span>
            <kbd
              className="px-2 py-1 rounded font-mono text-xs"
              style={{
                borderColor: "var(--border)",
                border: "1px solid",
                background: "var(--surface)",
              }}
            >
              ←
            </kbd>
            <span>/</span>
            <kbd
              className="px-2 py-1 rounded font-mono text-xs"
              style={{
                borderColor: "var(--border)",
                border: "1px solid",
                background: "var(--surface)",
              }}
            >
              →
            </kbd>
            <span>to compare</span>
          </div>
        </motion.div>
      </figcaption>
    </figure>
  );
};

export { BeforeAfter };