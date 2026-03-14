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
  const [nearCollision, setNearCollision] = React.useState(false); // hide near important sections
  const [forcedHidden, setForcedHidden] = React.useState(false); // hide when lead form visible
  const [scrollingUp, setScrollingUp] = React.useState(true);   // show on scroll up
  const [dismissed, setDismissed] = React.useState(false);      // manually closed
  const [isMobile, setIsMobile] = React.useState(false);

  // Persistence: Check if dismissed in this session
  React.useEffect(() => {
    const isDismissed = sessionStorage.getItem("qqb_dismissed") === "true";
    if (isDismissed) setDismissed(true);
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem("qqb_dismissed", "true");
  };

  // Detect mobile for positioning
  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Scroll Direction & Threshold Logic
  React.useEffect(() => {
    let lastScrollY = window.scrollY;
    let raf = null;

    const compute = () => {
      const y = window.scrollY;
      const h = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      
      // Threshold: show after 15% scroll
      setShowBase(h > 0 && y / h > 0.15);
      
      // Direction: show on scroll up, hide on scroll down
      // But keep shown if we are very near the top (not enough room to scroll up)
      if (y < 100) {
        setScrollingUp(true);
      } else {
        setScrollingUp(y < lastScrollY);
      }
      
      lastScrollY = y;
      raf = null;
    };

    const onScroll = () => {
      if (raf !== null) return;
      raf = requestAnimationFrame(compute);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  // Collision Detection (Intersection Observer for multiple IDs)
  React.useEffect(() => {
    const collisionTargets = [
      "#leadform",
      "#leadform-section",
      "#touch",
      "#services",
      "#proof",
      "footer"
    ];

    const observer = new IntersectionObserver(
      (entries) => {
        const isColliding = entries.some(entry => entry.isIntersecting);
        setNearCollision(isColliding);
      },
      {
        root: null,
        rootMargin: "0px 0px -10% 0px", // Trigger when element is slightly in view
        threshold: [0, 0.1]
      }
    );

    collisionTargets.forEach(selector => {
      const el = document.querySelector(selector);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  // Hide when the lead form broadcasts visibility
  React.useEffect(() => {
    const onLead = (e) => setForcedHidden(Boolean(e?.detail?.visible));
    document.addEventListener("leadform:visible", onLead);
    return () => document.removeEventListener("leadform:visible", onLead);
  }, []);

  const visible = showBase && !nearCollision && !forcedHidden && !dismissed && (scrollingUp || isMobile);

  // Broadcast visibility
  React.useEffect(() => {
    document.dispatchEvent(new CustomEvent("qqb:visible", { detail: { visible } }));
    return () =>
      document.dispatchEvent(new CustomEvent("qqb:visible", { detail: { visible: false } }));
  }, [visible]);

  const shimmer = {
    x: ["-120%", "120%"],
    transition: { repeat: Infinity, duration: 2.2, ease: "linear" }
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="qqb-container"
          initial={isMobile ? { y: 100, opacity: 0 } : { y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={isMobile ? { y: 100, opacity: 0 } : { y: -100, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="fixed left-0 right-0 z-[60] px-4"
          style={{
            top: isMobile ? "auto" : "calc(var(--header-offset, var(--header-h, 92px)) + 12px)",
            bottom: isMobile ? "max(16px, env(safe-area-inset-bottom, 16px))" : "auto",
          }}
        >
          <div className="container mx-auto max-w-4xl relative">
            <motion.div
              className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl p-3 md:px-4 md:py-2 group"
              style={{
                background: "rgba(10, 10, 10, 0.9)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                boxShadow: "0 20px 40px rgba(0,0,0,0.6), inset 0 0 20px rgba(232,80,2,0.05)",
                backdropFilter: "blur(16px)",
                WebkitBackdropFilter: "blur(16px)",
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="hidden sm:flex w-8 h-8 rounded-full items-center justify-center shrink-0"
                  style={{ 
                    background: "rgba(232,80,2,0.2)", 
                    color: "var(--orange)",
                    boxShadow: "0 0 15px rgba(232,80,2,0.15)"
                  }}
                >
                  <Zap size={16} fill="currentColor" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm md:text-base font-bold text-white tracking-tight">
                    {isMobile ? "Audit your channel today?" : "Before you go — want a quick quote? Free audit in 24h."}
                  </span>
                  {!isMobile && (
                    <span className="text-[10px] text-gray-400 font-medium uppercase tracking-widest leading-none mt-0.5">Limited slots available for Q1</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <motion.button
                  onClick={() => onBook?.()}
                  className="flex-1 sm:flex-none relative overflow-hidden rounded-xl px-6 h-[42px] text-xs md:text-sm font-black text-white shadow-lg ss-btn-pulse"
                  style={{ background: "linear-gradient(90deg, var(--orange), #ff9357)" }}
                  whileHover={{ scale: 1.05, y: -1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <motion.span
                    animate={shimmer}
                    className="absolute inset-y-0 -left-1/2 w-1/3 skew-x-12"
                    style={{
                      background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)",
                    }}
                  />
                  GET FREE AUDIT
                </motion.button>

                <motion.a
                  href="#contact"
                  className="flex-1 sm:flex-none rounded-xl px-6 h-[42px] grid place-items-center text-xs md:text-sm font-black text-white/90 border-2 border-white/10 hover:border-orange-500/50 hover:bg-orange-500/5 transition-all"
                  whileHover={{ scale: 1.05, y: -1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  GET QUOTE
                </motion.a>

                {/* Dismiss Button */}
                {!isMobile && (
                  <button 
                    onClick={handleDismiss}
                    className="ml-2 p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/10 transition-all"
                    title="Dismiss for this session"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default QuickQuoteBar;
