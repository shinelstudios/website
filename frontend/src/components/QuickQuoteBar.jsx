// src/components/QuickQuoteBar.jsx
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap } from "lucide-react";

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
  const [forcedHidden, setForcedHidden] = React.useState(false); // hide when lead form visible
  const [isMobile, setIsMobile] = React.useState(false);

  // Detect mobile for positioning
  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

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

  // Hide when close to the lead form or footer (both directions)
  React.useEffect(() => {
    const target = () =>
      document.getElementById("leadform") ||
      document.getElementById("leadform-section") ||
      document.querySelector("footer");

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

  // Hide when ProofSection (thumbnail showcase) is visible
  const [nearProofSection, setNearProofSection] = React.useState(false);
  React.useEffect(() => {
    const proofSection = document.getElementById("proof");
    if (!proofSection) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setNearProofSection(entry.isIntersecting);
      },
      {
        root: null,
        rootMargin: "-100px 0px -100px 0px", // Hide when proof section is in center of viewport
        threshold: [0, 0.1, 0.5, 1]
      }
    );

    observer.observe(proofSection);
    return () => observer.disconnect();
  }, []);

  const visible = showBase && !nearForm && !forcedHidden && !isMobile && !nearProofSection;

  // Broadcast visibility so Header/TrustBar can react
  React.useEffect(() => {
    document.dispatchEvent(new CustomEvent("qqb:visible", { detail: { visible } }));
    return () =>
      document.dispatchEvent(new CustomEvent("qqb:visible", { detail: { visible: false } }));
  }, [visible]);

  const shimmer = {
    x: ["-120%", "120%"],
    transition: { repeat: Infinity, duration: 1.8, ease: "linear" }
  };

  if (!visible) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="qqb-container"
        initial={isMobile ? { y: 100, opacity: 0 } : { y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={isMobile ? { y: 100, opacity: 0 } : { y: -100, opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="fixed left-0 right-0 z-30 px-4"
        style={{
          top: isMobile ? "auto" : "calc(var(--header-offset, var(--header-h, 92px)) + 12px)",
          bottom: isMobile ? "max(16px, env(safe-area-inset-bottom, 16px))" : "auto",
          WebkitTransform: "translate3d(0,0,0)", // Force GPU
        }}
        role="region"
        aria-label="Quick quote and audit"
      >
        <div className="container mx-auto max-w-4xl">
          <motion.div
            className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl p-3 md:px-4 md:py-2"
            style={{
              background: "rgba(0, 0, 0, 0.85)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              boxShadow: isMobile
                ? "0 -10px 40px rgba(0,0,0,0.4)"
                : "0 10px 40px rgba(0,0,0,0.4)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="hidden sm:flex w-8 h-8 rounded-full items-center justify-center"
                style={{ background: "rgba(232,80,2,0.15)", color: "var(--orange)" }}
              >
                <Zap size={16} />
              </div>
              <span className="text-sm md:text-base font-medium text-white/90">
                {isMobile ? "Before you go — want a quick quote?" : "Before you go — want a quick quote? Free audit in 24h."}
              </span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <motion.button
                onClick={() => onBook?.()}
                className="flex-1 sm:flex-none relative overflow-hidden rounded-xl px-5 h-[40px] text-xs md:text-sm font-bold text-white shadow-lg ss-btn-pulse"
                style={{ background: "linear-gradient(90deg, var(--orange), #ff9357)" }}
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.98 }}
              >
                <motion.span
                  aria-hidden="true"
                  initial={false}
                  animate={shimmer}
                  className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/3"
                  style={{
                    background: "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.4) 50%, rgba(255,255,255,0) 100%)",
                    filter: "blur(5px)",
                    WebkitBackdropFilter: "blur(0px)", // Fixes some iOS shimmer issues
                    willChange: "transform",
                  }}
                />
                Get Free Audit
              </motion.button>

              <motion.a
                href="#contact"
                className="flex-1 sm:flex-none rounded-xl px-5 h-[40px] grid place-items-center text-xs md:text-sm font-bold text-white/90 border-2 transition-colors border-white/20 hover:border-white/40 bg-white/5"
                whileHover={{ scale: 1.02, y: -1 }}
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
