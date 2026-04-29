/**
 * ReadingProgress — 2px orange bar at top tracks scroll progress through
 * an article/case-study page. Uses transform: scaleX() which stays on the
 * compositor; no layout or paint work.
 *
 * Props:
 *   target — ref to the article element (progress calculated relative to it).
 *            If omitted, uses full document scroll.
 *
 * Perf note: prior version called getBoundingClientRect() inside every
 * scroll-RAF tick, which forces a synchronous layout flush 60×/sec on a
 * scrolling page. Now the rect is cached and only recomputed on resize +
 * a one-shot ResizeObserver on the target. Scroll handler reads window
 * scrollY only — pure compositor work.
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

    // Cached top + height of the target so the scroll handler doesn't
    // trigger getBoundingClientRect on every frame. Recomputed on
    // resize and via ResizeObserver below.
    let cachedTop = 0;
    let cachedHeight = 0;
    let usingTarget = !!target?.current;

    const measure = () => {
      if (target?.current) {
        const rect = target.current.getBoundingClientRect();
        cachedTop = window.scrollY + rect.top;
        cachedHeight = rect.height - window.innerHeight;
        usingTarget = true;
      } else {
        cachedTop = 0;
        cachedHeight = document.documentElement.scrollHeight - window.innerHeight;
        usingTarget = false;
      }
    };
    measure();

    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        let progress;
        if (usingTarget) {
          progress = Math.max(0, Math.min(1, (window.scrollY - cachedTop) / Math.max(1, cachedHeight)));
        } else {
          progress = Math.max(0, Math.min(1, window.scrollY / Math.max(1, cachedHeight)));
        }
        bar.style.setProperty("--progress", String(progress));
        raf = 0;
      });
    };

    const onResize = () => { measure(); onScroll(); };

    let ro = null;
    if (target?.current && typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => { measure(); onScroll(); });
      ro.observe(target.current);
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });
    onScroll();

    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      if (ro) ro.disconnect();
    };
  }, [reduce, target]);

  if (reduce) return null;
  return <div ref={barRef} className="reading-progress" aria-hidden="true" />;
}
