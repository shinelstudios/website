/**
 * BeforeAfterSlider — 2-image, 1-handle responsive comparison slider.
 *
 * Distilled from TripleBeforeAfterSlider.jsx (used on /live-templates) but
 * simplified to two layered images and one draggable handle. Touch + mouse
 * + pen via pointer events with document-level listeners (so drags survive
 * the cursor leaving the container). RAF-throttled updates. Keyboard
 * accessible (arrow keys + Home/End + shift for big steps). Handle scales
 * 44px (mobile, meets WCAG tap target) → 56px (desktop).
 */
import React, { useCallback, useEffect, useRef, useState } from "react";

const clamp = (v) => Math.max(0, Math.min(100, v));

export default function BeforeAfterSlider({
  before,
  beforeLabel = "Before",
  after,
  afterLabel = "After",
  className = "",
  initial = 50,
}) {
  const [pos, setPos] = useState(clamp(initial));
  const [isMobile, setIsMobile] = useState(false);

  const containerRef = useRef(null);
  const draggingRef = useRef(false);
  const rafRef = useRef(null);
  const posRef = useRef(pos);
  useEffect(() => { posRef.current = pos; }, [pos]);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const updateByClientX = useCallback((clientX) => {
    if (!draggingRef.current || !containerRef.current) return;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const rect = containerRef.current.getBoundingClientRect();
      const pct = clamp(((clientX - rect.left) / rect.width) * 100);
      if (pct !== posRef.current) setPos(pct);
    });
  }, []);

  const startDrag = useCallback((clientX) => {
    draggingRef.current = true;
    const onMove = (ev) => updateByClientX(ev.clientX);
    const endDrag = () => {
      draggingRef.current = false;
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", endDrag);
      document.removeEventListener("pointercancel", endDrag);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    document.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerup", endDrag, { passive: true });
    document.addEventListener("pointercancel", endDrag, { passive: true });
    if (typeof clientX === "number") updateByClientX(clientX);
  }, [updateByClientX]);

  const onTrackPointerDown = (e) => {
    if (e?.cancelable) e.preventDefault();
    startDrag(e.clientX);
  };

  const handleSize = isMobile ? 44 : 56;
  const iconSize = isMobile ? 18 : 22;

  return (
    <div className={className}>
      {/* Top labels */}
      <div className="flex justify-between mb-2 px-1 text-[10px] md:text-[11px] font-black uppercase tracking-[0.18em]">
        <span style={{ color: "var(--orange)" }}>{beforeLabel}</span>
        <span style={{ color: "var(--orange)" }}>{afterLabel}</span>
      </div>

      <div
        ref={containerRef}
        onPointerDown={onTrackPointerDown}
        className="relative rounded-xl overflow-hidden border select-none"
        style={{
          borderColor: "rgba(232,80,2,0.25)",
          background: "var(--surface)",
          aspectRatio: "16/9",
          touchAction: "none",
          userSelect: "none",
          WebkitUserSelect: "none",
          boxShadow: "0 4px 16px rgba(0,0,0,0.18)",
          cursor: "ew-resize",
        }}
      >
        {/* AFTER (back layer, full bleed) */}
        <div className="absolute inset-0">
          <img
            src={after}
            alt={afterLabel}
            className="w-full h-full object-cover"
            draggable="false"
            decoding="async"
            loading="lazy"
            style={{ pointerEvents: "none", userSelect: "none" }}
          />
        </div>

        {/* BEFORE (front layer, clipped to [0, pos]) */}
        <div
          className="absolute inset-0"
          style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
        >
          <img
            src={before}
            alt={beforeLabel}
            className="w-full h-full object-cover"
            draggable="false"
            decoding="async"
            loading="lazy"
            style={{ pointerEvents: "none", userSelect: "none" }}
          />
        </div>

        {/* Handle */}
        <div
          className="absolute top-0 bottom-0"
          style={{ left: `${pos}%`, transform: "translateX(-50%)", zIndex: 15, touchAction: "none" }}
          role="slider"
          aria-orientation="horizontal"
          aria-label={`${beforeLabel} vs ${afterLabel} divider`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(pos)}
          tabIndex={0}
          onPointerDown={(e) => {
            if (e?.cancelable) e.preventDefault();
            e.stopPropagation();
            startDrag(e.clientX);
          }}
          onKeyDown={(e) => {
            const step = e.shiftKey ? 5 : 1;
            if (e.key === "ArrowLeft")  { setPos(clamp(posRef.current - step)); e.preventDefault(); }
            else if (e.key === "ArrowRight") { setPos(clamp(posRef.current + step)); e.preventDefault(); }
            else if (e.key === "Home") { setPos(0); e.preventDefault(); }
            else if (e.key === "End")  { setPos(100); e.preventDefault(); }
          }}
        >
          <div
            className="absolute top-0 bottom-0 left-1/2"
            style={{
              width: 3,
              background: "linear-gradient(180deg, var(--orange), #ff9357, var(--orange))",
              transform: "translateX(-50%)",
              boxShadow: "0 0 0 2px rgba(255,255,255,0.55), 0 0 18px rgba(232,80,2,0.55)",
              pointerEvents: "none",
            }}
          />
          <div
            className="absolute top-1/2 left-1/2 rounded-full grid place-items-center"
            style={{
              width: handleSize,
              height: handleSize,
              transform: "translate(-50%, -50%)",
              background: "linear-gradient(135deg, var(--orange), #ff9357)",
              boxShadow: "0 6px 18px rgba(232,80,2,0.4), inset 0 -2px 10px rgba(0,0,0,0.3), inset 0 2px 0 rgba(255,255,255,0.3)",
              border: `${isMobile ? 3 : 4}px solid white`,
              pointerEvents: "none",
            }}
          >
            <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 18l-6-6 6-6" />
              <path d="M9 18l-6-6 6-6" transform="translate(8 0)" />
            </svg>
          </div>
        </div>

        {/* Hint pill */}
        <div
          className="absolute left-1/2 backdrop-blur-md pointer-events-none"
          style={{
            bottom: isMobile ? 10 : 14,
            transform: "translateX(-50%)",
            background: "rgba(0,0,0,0.65)",
            padding: isMobile ? "5px 12px" : "6px 14px",
            borderRadius: 999,
            fontSize: isMobile ? 10 : 11,
            color: "#fff",
            fontWeight: 700,
            border: "1px solid rgba(255,255,255,0.15)",
            WebkitBackdropFilter: "blur(12px)",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          {isMobile ? "Drag the orange handle" : "Drag the orange handle to compare"}
        </div>
      </div>
    </div>
  );
}
