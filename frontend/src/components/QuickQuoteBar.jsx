// src/components/QuickQuoteBar.jsx
import React from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

/**
 * QuickQuoteBar
 * - Desktop only (hidden on mobile to avoid duplicating the sticky CTA)
 * - Fixed just below the header, using CSS vars --header-offset / --header-h
 * - Appears after ~20% scroll, hides when near the lead form
 * - Listens to "leadform:visible" and broadcasts "qqb:visible"
 */
const QuickQuoteBar = ({ onBook }) => {
  const [showBase, setShowBase] = React.useState(false);        // scrolled enough
  const [nearForm, setNearForm] = React.useState(false);        // hide near lead form
  const [forcedHidden, setForcedHidden] = React.useState(false); // leadform:visible event
  const prefersReducedMotion = useReducedMotion();

  // Hide when the lead form broadcasts visibility
  React.useEffect(() => {
    const onLead = (e) => setForcedHidden(Boolean(e?.detail?.visible));
    document.addEventListener("leadform:visible", onLead);
    return () => document.removeEventListener("leadform:visible", onLead);
  }, []);

  // Show after ~20% scroll (rAF-throttled)
  React.useEffect(() => {
    let raf = null;
    const compute = () => {
      const y = window.scrollY || 0;
      const h = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      setShowBase(h > 0 && y / h > 0.2);
      raf = null;
    };
    const onScroll = () => {
      if (raf !== null) return;
      raf = requestAnimationFrame(compute);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  // Hide when close to the lead form (both directions)
  React.useEffect(() => {
    const target = () =>
      document.getElementById("leadform") ||
      document.getElementById("leadform-section");

    let io;
    const fallbackHandler = () => {
      const el = target();
      if (!el) return setNearForm(false);
      const rect = el.getBoundingClientRect();
      setNearForm(rect.top < 220 && rect.bottom > 0);
    };

    if ("IntersectionObserver" in window) {
      const el = target();
      if (!el) return setNearForm(false);
      io = new IntersectionObserver(
        (entries) => {
          // When any part is on screen (or close), compute fine proximity
          setNearForm(entries.some((e) => e.isIntersecting));
          // Fine-tune with bounds
          fallbackHandler();
        },
        { root: null, rootMargin: "220px 0px 0px 0px", threshold: [0, 0.01] }
      );
      io.observe(el);
      // Keep proximity exact on scroll/resize
      window.addEventListener("scroll", fallbackHandler, { passive: true });
      window.addEventListener("resize", fallbackHandler);
      fallbackHandler();
      return () => {
        io && io.disconnect();
        window.removeEventListener("scroll", fallbackHandler);
        window.removeEventListener("resize", fallbackHandler);
      };
    } else {
      // Fallback: scroll/resize compute
      fallbackHandler();
      window.addEventListener("scroll", fallbackHandler, { passive: true });
      window.addEventListener("resize", fallbackHandler);
      return () => {
        window.removeEventListener("scroll", fallbackHandler);
        window.removeEventListener("resize", fallbackHandler);
      };
    }
  }, []);

  const visible = showBase && !nearForm && !forcedHidden;

  // Broadcast visibility so Header/TrustBar can react
  React.useEffect(() => {
    document.dispatchEvent(new CustomEvent("qqb:visible", { detail: { visible } }));
    return () =>
      document.dispatchEvent(new CustomEvent("qqb:visible", { detail: { visible: false } }));
  }, [visible]);

  const shimmer =
    !prefersReducedMotion
      ? { x: ["-120%", "120%"], transition: { repeat: Infinity, duration: 1.8, ease: "linear" } }
      : {};

  if (!visible) return null;

  return (
    <AnimatePresence>
      {/* Desktop: top, under header */}
      <motion.div
        key="qqb-desktop"
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -40, opacity: 0 }}
        className="hidden md:block fixed left-0 right-0 z-40"
        role="region"
        aria-label="Quick quote and audit"
        style={{ top: "calc(var(--header-offset, var(--header-h, 92px)) + 10px)" }}
      >
        <div className="container mx-auto px-4">
          <motion.div
            className="flex items-center justify-between gap-3 rounded-xl px-3.5 py-2"
            style={{
              background: "color-mix(in oklab, var(--surface) 92%, transparent)",
              border: "1px solid var(--border)",
              boxShadow: "0 10px 24px rgba(0,0,0,0.12)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
            }}
            initial={{ filter: "saturate(0.96)" }}
            animate={{ filter: "saturate(1)" }}
            transition={{ duration: 0.2 }}
          >
            <span className="text-sm" style={{ color: "var(--text)" }}>
              🚀 Get a <b>free content audit</b> in 24 hours.
            </span>

            <div className="flex items-center gap-2">
              <motion.button
                onClick={() => onBook?.()}
                className="relative overflow-hidden rounded-lg px-4 h-[36px] text-sm font-semibold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)]"
                style={{ background: "linear-gradient(90deg, var(--orange), #ff9357)" }}
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.98 }}
              >
                {!prefersReducedMotion && (
                  <motion.span
                    aria-hidden="true"
                    initial={false}
                    animate={shimmer}
                    className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/3"
                    style={{
                      background:
                        "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,30) 50%, rgba(255,255,255,0) 100%)",
                      filter: "blur(5px)",
                    }}
                  />
                )}
                Get Free Audit
              </motion.button>

              <motion.a
                href="#contact"
                className="rounded-lg px-4 h-[36px] grid place-items-center text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)]"
                style={{ border: "2px solid var(--orange)", color: "var(--orange)" }}
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.98 }}
              >
                Get Quote
              </motion.a>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default QuickQuoteBar;
