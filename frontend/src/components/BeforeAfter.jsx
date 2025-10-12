// src/components/BeforeAfter.jsx

import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";

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
  const [v, setV] = useState(50);
  const [isHovering, setIsHovering] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const wrapRef = useRef(null);
  const dragging = useRef(false);

  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

  const setFromClientX = (clientX) => {
    const el = wrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setV(clamp(pct, 0, 100));
  };

  // Pointer handlers
  useEffect(() => {
    const onMove = (e) => {
      if (!dragging.current) return;
      if (e.type.startsWith("touch")) {
        setFromClientX(e.touches[0].clientX);
      } else {
        setFromClientX(e.clientX);
      }
      e.preventDefault();
    };
    const onUp = () => {
      dragging.current = false;
      setIsDragging(false);
    };

    document.addEventListener("mousemove", onMove, { passive: false });
    document.addEventListener("mouseup", onUp);
    document.addEventListener("touchmove", onMove, { passive: false });
    document.addEventListener("touchend", onUp);

    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend", onUp);
    };
  }, []);

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
          // Smooth auto-slide demo
          let start = null;
          const duration = 2000;
          const animate = (timestamp) => {
            if (!start) start = timestamp;
            const progress = (timestamp - start) / duration;
            
            if (progress < 1) {
              // Ease in-out
              const eased = progress < 0.5
                ? 2 * progress * progress
                : 1 - Math.pow(-2 * progress + 2, 2) / 2;
              setV(50 + (eased * 50 - 25));
              requestAnimationFrame(animate);
            } else {
              setV(50);
            }
          };
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.5 }
    );

    io.observe(el);
    return () => io.disconnect();
  }, [hasPlayed, reduceMotion]);

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
          setFromClientX(e.touches[0].clientX);
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
            }}
            initial={reduceMotion ? {} : { opacity: 0, x: 10 }}
            animate={reduceMotion ? {} : { opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            ✨ After
          </motion.div>
        </div>

        {/* BEFORE image (revealed by clipPath) */}
        <div
          className="absolute inset-0"
          style={{
            clipPath: `inset(0 ${100 - v}% 0 0)`,
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
            }}
            initial={reduceMotion ? {} : { opacity: 0, x: -10 }}
            animate={reduceMotion ? {} : { opacity: v > 15 ? 1 : 0, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            📷 Before
          </motion.div>
        </div>

        {/* Enhanced divider line with glow */}
        <div
          className="absolute top-0 bottom-0 pointer-events-none"
          style={{
            left: `${v}%`,
            width: 3,
            background: "linear-gradient(to bottom, rgba(232,80,2,0), var(--orange), rgba(232,80,2,0))",
            boxShadow: isDragging
              ? "0 0 20px rgba(232,80,2,0.8), 0 0 40px rgba(232,80,2,0.4)"
              : "0 0 10px rgba(232,80,2,0.5)",
            transition: "box-shadow 0.2s ease",
          }}
          aria-hidden="true"
        />

        {/* Handle with enhanced design */}
        <motion.button
          type="button"
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-12 w-12 rounded-full shadow-xl focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--orange)] z-10"
          style={{
            left: `${v}%`,
            background: "linear-gradient(135deg, var(--orange), #ff9357)",
            color: "#fff",
            border: "3px solid rgba(255,255,255,0.9)",
            cursor: isDragging ? "grabbing" : "grab",
          }}
          aria-label={`Reveal slider: ${Math.round(v)} percent`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(v)}
          role="slider"
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") setV((p) => clamp(p - 2, 0, 100));
            if (e.key === "ArrowRight") setV((p) => clamp(p + 2, 0, 100));
            if (e.key === "Home") setV(0);
            if (e.key === "End") setV(100);
          }}
          onMouseDown={() => {
            dragging.current = true;
            setIsDragging(true);
          }}
          onTouchStart={() => {
            dragging.current = true;
            setIsDragging(true);
          }}
          whileHover={reduceMotion ? {} : { scale: 1.1 }}
          whileTap={reduceMotion ? {} : { scale: 0.95 }}
          animate={
            !reduceMotion && !isDragging && isHovering
              ? {
                  scale: [1, 1.05, 1],
                }
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

        {/* Visually-hidden range input */}
        <label htmlFor="ba-range" className="sr-only">
          Drag to compare {beforeAlt} and {afterAlt}
        </label>
        <input
          id="ba-range"
          type="range"
          min="0"
          max="100"
          step="1"
          value={v}
          onChange={(e) => setV(+e.target.value)}
          className="sr-only"
          aria-hidden="false"
        />
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