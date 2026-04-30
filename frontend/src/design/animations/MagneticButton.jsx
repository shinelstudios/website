/**
 * MagneticButton — wraps a button-shaped child and translates it
 * subtly toward the cursor on hover. Max travel ~6 px so it feels
 * alive, not gimmicky. Phones / coarse pointers / reduced-motion
 * users get a plain wrapper that does nothing.
 *
 * Usage:
 *   <MagneticButton><button className="btn-editorial">Send</button></MagneticButton>
 *
 * Perf contract:
 *   - transform-only writes on RAF
 *   - one listener at the wrapper level, not on global mousemove
 *   - tears down on unmount + on PRMR / coarse-pointer transitions
 */
import React, { useEffect, useRef } from "react";
import { useReducedMotion } from "../hooks/useReducedMotion";

export default function MagneticButton({ children, strength = 6, className = "" }) {
  const wrapRef = useRef(null);
  const innerRef = useRef(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (reduce) return;
    // Coarse pointers (touch) get no magnetic effect — there's no cursor
    // to follow, and forcing a transform on tap would just lag the click.
    const fine = typeof window !== "undefined" && window.matchMedia?.("(hover: hover) and (pointer: fine)").matches;
    if (!fine) return;

    const wrap = wrapRef.current;
    const inner = innerRef.current;
    if (!wrap || !inner) return;

    let raf = 0;
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;

    const onMove = (e) => {
      const rect = wrap.getBoundingClientRect();
      const dx = e.clientX - (rect.left + rect.width / 2);
      const dy = e.clientY - (rect.top + rect.height / 2);
      // Normalize against half the wrapper diag, clamp to [-1,1]
      const norm = Math.max(rect.width, rect.height) / 2;
      targetX = Math.max(-1, Math.min(1, dx / norm)) * strength;
      targetY = Math.max(-1, Math.min(1, dy / norm)) * strength;
      schedule();
    };
    const onLeave = () => {
      targetX = 0;
      targetY = 0;
      schedule();
    };
    const schedule = () => {
      if (raf) return;
      raf = requestAnimationFrame(tick);
    };
    const tick = () => {
      // Lerp toward target — softens the trail so the button doesn't
      // teleport on each move event.
      currentX += (targetX - currentX) * 0.18;
      currentY += (targetY - currentY) * 0.18;
      inner.style.transform = `translate3d(${currentX.toFixed(2)}px, ${currentY.toFixed(2)}px, 0)`;
      const settled = Math.abs(targetX - currentX) < 0.05 && Math.abs(targetY - currentY) < 0.05;
      raf = settled ? 0 : requestAnimationFrame(tick);
      if (settled && targetX === 0 && targetY === 0) inner.style.transform = "";
    };

    wrap.addEventListener("mousemove", onMove);
    wrap.addEventListener("mouseleave", onLeave);
    return () => {
      wrap.removeEventListener("mousemove", onMove);
      wrap.removeEventListener("mouseleave", onLeave);
      if (raf) cancelAnimationFrame(raf);
      inner.style.transform = "";
    };
  }, [reduce, strength]);

  return (
    <span ref={wrapRef} className={`inline-block ${className}`} style={{ display: "inline-block" }}>
      <span ref={innerRef} style={{ display: "inline-block", willChange: "transform" }}>
        {children}
      </span>
    </span>
  );
}
