/**
 * TripleBeforeAfterSlider — three layered images with two draggable handles.
 *
 * Stacking (back → front):
 *   - V2 covers the whole frame
 *   - V1 is clipped to between handle1 and handle2
 *   - Base is clipped to 0 → handle1
 *
 * Both handles enforce pos1 ≤ pos2. Drag from anywhere on the track snaps
 * to the nearest handle. Pointer events (works for touch + mouse + pen),
 * arrow keys for keyboard, RAF-throttled updates, document-level listeners
 * so drags survive the cursor leaving the container.
 *
 * Restored from the pre-2026-04-26 version of /live-templates (commit
 * before 02a0f57). Same logic, simpler styling that fits the editorial
 * design system.
 */
import React, { useCallback, useEffect, useRef, useState } from "react";

const clamp = (v) => Math.max(0, Math.min(100, v));

export default function TripleBeforeAfterSlider({
  base,
  baseLabel = "Base",
  v1,
  v1Label = "Variation 1",
  v2,
  v2Label = "Variation 2",
  className = "",
}) {
  const [pos1, setPos1] = useState(33);
  const [pos2, setPos2] = useState(66);
  const [isMobile, setIsMobile] = useState(false);

  const containerRef = useRef(null);
  const activeHandleRef = useRef(null);
  const rafRef = useRef(null);
  const pos1Ref = useRef(pos1);
  const pos2Ref = useRef(pos2);

  useEffect(() => { pos1Ref.current = pos1; }, [pos1]);
  useEffect(() => { pos2Ref.current = pos2; }, [pos2]);

  // Track viewport size for mobile-sized handle controls. Doesn't need
  // ResizeObserver granularity — innerWidth on resize is enough.
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const setFromPct = useCallback((pct, which) => {
    const p = clamp(pct);
    if (which === 1) {
      const next1 = p;
      const next2 = Math.max(next1, pos2Ref.current);
      if (next1 !== pos1Ref.current) setPos1(next1);
      if (next2 !== pos2Ref.current) setPos2(next2);
    } else if (which === 2) {
      const next2 = p;
      const next1 = Math.min(next2, pos1Ref.current);
      if (next2 !== pos2Ref.current) setPos2(next2);
      if (next1 !== pos1Ref.current) setPos1(next1);
    }
  }, []);

  const updateByClientX = useCallback((clientX) => {
    const which = activeHandleRef.current;
    if (!which || !containerRef.current) return;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const rect = containerRef.current.getBoundingClientRect();
      const x = clientX - rect.left;
      const pct = (x / rect.width) * 100;
      setFromPct(pct, which);
    });
  }, [setFromPct]);

  const bindDrag = useCallback(() => {
    const onMove = (ev) => updateByClientX(ev.clientX);
    const endDrag = () => {
      activeHandleRef.current = null;
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", endDrag);
      document.removeEventListener("pointercancel", endDrag);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    document.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerup", endDrag, { passive: true });
    document.addEventListener("pointercancel", endDrag, { passive: true });
    return endDrag;
  }, [updateByClientX]);

  const startDrag = useCallback((which, clientX) => {
    activeHandleRef.current = which;
    bindDrag();
    if (typeof clientX === "number") updateByClientX(clientX);
  }, [bindDrag, updateByClientX]);

  // Tap anywhere on the track → snap nearest handle to that point.
  const onContainerPointerDown = (e) => {
    if (!containerRef.current) return;
    if (e?.cancelable) e.preventDefault();
    e?.stopPropagation?.();
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = clamp((x / rect.width) * 100);
    const which = Math.abs(pct - pos1Ref.current) <= Math.abs(pct - pos2Ref.current) ? 1 : 2;
    startDrag(which, e.clientX);
  };

  const handleSize = isMobile ? 48 : 56;
  const iconSize = isMobile ? 22 : 26;

  const Handle = ({ xPct, which, label }) => (
    <div
      className="absolute top-0 bottom-0"
      style={{
        left: `${xPct}%`,
        transform: "translateX(-50%)",
        zIndex: 15,
        touchAction: "none",
        cursor: "ew-resize",
      }}
      onPointerDown={(e) => {
        if (e?.cancelable) e.preventDefault();
        e.stopPropagation();
        startDrag(which, e.clientX);
      }}
      role="slider"
      aria-orientation="horizontal"
      tabIndex={0}
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(xPct)}
      onKeyDown={(e) => {
        const step = e.shiftKey ? 5 : 1;
        if (e.key === "ArrowLeft")  { setFromPct(xPct - step, which); e.preventDefault(); }
        else if (e.key === "ArrowRight") { setFromPct(xPct + step, which); e.preventDefault(); }
        else if (e.key === "Home") { setFromPct(which === 1 ? 0 : pos1Ref.current, which); e.preventDefault(); }
        else if (e.key === "End")  { setFromPct(which === 2 ? 100 : pos2Ref.current, which); e.preventDefault(); }
      }}
    >
      {/* vertical bar */}
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
      {/* knob */}
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
          <path d="M9 18l-6-6 6-6" />
        </svg>
      </div>
    </div>
  );

  return (
    <div className={className}>
      {/* Top labels */}
      <div className="flex justify-between mb-2 px-1 text-[10px] md:text-[11px] font-black uppercase tracking-[0.18em]">
        <span style={{ color: "var(--orange)" }}>{baseLabel}</span>
        <span style={{ color: "var(--orange)" }}>{v1Label}</span>
        <span style={{ color: "var(--orange)" }}>{v2Label}</span>
      </div>

      {/* Slider canvas */}
      <div
        ref={containerRef}
        className="relative rounded-xl overflow-hidden border select-none"
        style={{
          borderColor: "rgba(232,80,2,0.25)",
          background: "var(--surface)",
          aspectRatio: "16/9",
          touchAction: "none",
          userSelect: "none",
          WebkitUserSelect: "none",
          boxShadow: "0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)",
        }}
        onPointerDown={onContainerPointerDown}
      >
        {/* back: V2 */}
        <div className="absolute inset-0">
          <img
            src={v2}
            alt={v2Label}
            className="w-full h-full object-cover"
            draggable="false"
            decoding="async"
            loading="lazy"
            style={{ pointerEvents: "none", userSelect: "none" }}
          />
        </div>
        {/* middle: V1, clipped to [pos1, pos2] */}
        <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - pos2}% 0 ${pos1}%)` }}>
          <img
            src={v1}
            alt={v1Label}
            className="w-full h-full object-cover"
            draggable="false"
            decoding="async"
            loading="lazy"
            style={{ pointerEvents: "none", userSelect: "none" }}
          />
        </div>
        {/* front: Base, clipped to [0, pos1] */}
        <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - pos1}% 0 0)` }}>
          <img
            src={base}
            alt={baseLabel}
            className="w-full h-full object-cover"
            draggable="false"
            decoding="async"
            loading="lazy"
            style={{ pointerEvents: "none", userSelect: "none" }}
          />
        </div>

        <Handle xPct={pos1} which={1} label={`Divide ${baseLabel} & ${v1Label}`} />
        <Handle xPct={pos2} which={2} label={`Divide ${v1Label} & ${v2Label}`} />

        {/* Hint pill */}
        <div
          className="absolute left-1/2 backdrop-blur-md"
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
          {isMobile ? "Drag the orange handles" : "Drag the two handles to compare"}
        </div>
      </div>
    </div>
  );
}
