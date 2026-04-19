/**
 * ReadingProgress — 2px orange bar at top tracks scroll progress through
 * an article/case-study page. Uses transform: scaleX() which stays on the
 * compositor; no layout or paint work.
 *
 * Props:
 *   target — ref to the article element (progress calculated relative to it).
 *            If omitted, uses full document scroll.
 */
import React, { useEffect, useRef } from "react";
import { useReducedMotion } from "../hooks/useReducedMotion";

export default function ReadingProgress({ target }) {
  const barRef = useRef(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (reduce) return;
    const bar = barRef.current;
    if (!bar) return;

    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        let progress = 0;
        if (target?.current) {
          const rect = target.current.getBoundingClientRect();
          const top = window.scrollY + rect.top;
          const height = rect.height - window.innerHeight;
          progress = Math.max(0, Math.min(1, (window.scrollY - top) / Math.max(1, height)));
        } else {
          const scrollH = document.documentElement.scrollHeight - window.innerHeight;
          progress = Math.max(0, Math.min(1, window.scrollY / Math.max(1, scrollH)));
        }
        bar.style.setProperty("--progress", String(progress));
        raf = 0;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    onScroll();

    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [reduce, target]);

  if (reduce) return null;
  return <div ref={barRef} className="reading-progress" aria-hidden="true" />;
}
