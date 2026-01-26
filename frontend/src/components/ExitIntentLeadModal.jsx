// src/components/ExitIntentLeadModal.jsx
import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import QuickLeadForm from "./QuickLeadForm.jsx";

const ExitIntentLeadModal = ({
  dwellMs = 600_000,
  onceMode = "session",
  userCooldownDays = 7,
  mountGuardMs = 4_000,
  zIndex = 1000,
}) => {
  const [open, setOpen] = useState(false);
  const [eligible, setEligible] = useState(false);
  const [isCoarse, setIsCoarse] = useState(false);

  const mountAt = useRef(Date.now());
  const suppressUntil = useRef(0);
  const dwellTimer = useRef(null);

  const SESSION_KEY = "ss_exit_offer_shown";
  const USER_KEY = "ss_exit_offer_shown_at";

  const now = () => Date.now();

  const isShownThisSession = () => {
    try { return sessionStorage.getItem(SESSION_KEY) === "1"; } catch { return false; }
  };
  const markShownThisSession = () => {
    try { sessionStorage.setItem(SESSION_KEY, "1"); } catch { }
  };

  // Support clearing session for testing
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('clear-exit') === 'true') {
      sessionStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(USER_KEY);
      console.log("[ExitIntent] Session/Local storage cleared for testing");
    }
  }, []);

  const isShownInCooldown = () => {
    if (onceMode !== "user") return false;
    try {
      const ts = Number(localStorage.getItem(USER_KEY) || 0);
      if (!ts) return false;
      const ms = userCooldownDays * 24 * 60 * 60 * 1000;
      return now() - ts < ms;
    } catch { return false; }
  };
  const markShownForUser = () => {
    if (onceMode !== "user") return;
    try { localStorage.setItem(USER_KEY, String(now())); } catch { }
  };

  const tryOpen = (reason) => {
    if (open) return;

    // Check if forced for testing (?force-exit=true)
    const urlParams = new URLSearchParams(window.location.search);
    const forced = urlParams.get('force-exit') === 'true';

    if (!forced) {
      if (now() - mountAt.current < mountGuardMs) {
        console.log(`[ExitIntent] Blocked: Mount guard (${Math.round((mountGuardMs - (now() - mountAt.current)) / 1000)}s left)`);
        return;
      }
      if (now() < suppressUntil.current) {
        console.log(`[ExitIntent] Blocked: Recently suppressed (${Math.round((suppressUntil.current - now()) / 1000)}s left)`);
        return;
      }
      if (isShownThisSession()) {
        console.log("[ExitIntent] Blocked: Already shown this session");
        return;
      }
      if (isShownInCooldown()) {
        console.log("[ExitIntent] Blocked: Cooldown period active");
        return;
      }
    } else {
      console.log("[ExitIntent] Bypassing guards (force-exit=true)");
    }

    console.log(`[ExitIntent] Opening! Reason: ${reason}`);
    setOpen(true);
    markShownThisSession();
    markShownForUser();
    try { window.dispatchEvent(new CustomEvent("analytics", { detail: { ev: "exit_intent_open", reason } })); } catch { }
  };

  const close = () => {
    setOpen(false);
    suppressUntil.current = now() + 10_000;
    try { window.dispatchEvent(new CustomEvent("analytics", { detail: { ev: "exit_intent_close" } })); } catch { }
  };

  // detect coarse pointer (mobile/tablet)
  useEffect(() => {
    let coarse = false;
    try { coarse = window.matchMedia?.("(pointer: coarse)")?.matches ?? false; } catch { }
    setIsCoarse(coarse);
    setEligible(true); // both desktop and mobile eligible (mobile uses dwell only)
  }, []);

  // exit-intent (desktop/top leave)
  useEffect(() => {
    if (!eligible || isCoarse) return;
    const onMouseOut = (e) => {
      if (e.relatedTarget) return;
      // More lenient: trigger if mouse moves toward top (clientY < 15)
      if (e.clientY > 15) return;
      if (now() < suppressUntil.current) return;
      tryOpen("mouse_exit_top");
    };
    document.addEventListener("mouseout", onMouseOut);
    return () => document.removeEventListener("mouseout", onMouseOut);
  }, [eligible, isCoarse]);

  // dwell (all devices)
  useEffect(() => {
    if (!eligible) return;
    if (isShownThisSession() || isShownInCooldown()) return;
    dwellTimer.current = window.setTimeout(() => tryOpen("dwell_timer"), dwellMs);
    return () => window.clearTimeout(dwellTimer.current);
  }, [eligible, dwellMs]);

  // suppress when clicking internal links
  useEffect(() => {
    const onClickCapture = (ev) => {
      const a = ev.composedPath().find((n) => n?.tagName === "A" && n.href);
      if (!a) return;
      try {
        const url = new URL(a.href);
        if (url.origin === window.location.origin) {
          suppressUntil.current = now() + 5_000;
        }
      } catch { }
    };
    document.addEventListener("click", onClickCapture, true);
    return () => document.removeEventListener("click", onClickCapture, true);
  }, []);

  // briefly suppress around tab visibility/history nav
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        tryOpen("tab_hidden");
      }
    };
    const onPop = () => { tryOpen("popstate_exit"); };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("popstate", onPop);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("popstate", onPop);
    };
  }, []);

  // iOS-safe scroll lock (use body)
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  if (!eligible) return null;

  const sheet = isCoarse; // bottom sheet on mobile

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Simple RGBA overlay (no backdrop-filter) */}
          <motion.div
            key="exit-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0"
            aria-hidden="true"
            style={{ zIndex, background: "rgba(0,0,0,0.55)" }}
            onClick={close}
          />
          {/* Center modal (desktop) or bottom sheet (mobile) */}
          <motion.div
            key="exit-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Get a quick quote"
            initial={sheet ? { y: "100%" } : { y: 30, opacity: 0, scale: 0.98 }}
            animate={sheet ? { y: 0 } : { y: 0, opacity: 1, scale: 1 }}
            exit={sheet ? { y: "100%" } : { y: 30, opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", damping: 28, stiffness: 220 }}
            className={sheet
              ? "fixed left-0 right-0 bottom-0 w-full max-h-[92vh] overflow-auto rounded-t-[2.5rem] shadow-2xl"
              : "fixed left-1/2 top-[10%] -translate-x-1/2 w-[min(94vw,640px)] max-h-[85vh] overflow-auto rounded-[2.5rem] shadow-2xl"
            }
            style={{
              zIndex: zIndex + 1,
              background: "rgba(10, 10, 10, 0.85)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              backdropFilter: "blur(32px)",
              WebkitBackdropFilter: "blur(32px)",
            }}
          >
            {/* Pull-to-dismiss indicator for mobile */}
            {sheet && (
              <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mt-4 mb-2 pointer-events-none" />
            )}

            {/* Premium background effects */}
            <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[40%] bg-orange-500/15 blur-[100px] pointer-events-none animate-pulse rounded-full" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[60%] h-[50%] bg-blue-500/5 blur-[120px] pointer-events-none rounded-full" />

            {/* Main Header with value prop focus */}
            <div
              className="sticky top-0 z-20 px-8 py-6 flex items-center justify-between"
              style={{ background: "transparent", borderBottom: "1px solid rgba(255, 255, 255, 0.08)" }}
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500/30 to-orange-600/10 flex items-center justify-center border border-orange-500/20 shadow-lg">
                  <span className="text-2xl">🔥</span>
                </div>
                <div>
                  <h3 className="text-xl font-black text-white leading-tight tracking-tight uppercase">
                    Don't Leave empty-handed
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                    <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-orange-500/90 whitespace-nowrap">
                      Limited Time: Free Content Audit
                    </p>
                  </div>
                </div>
              </div>
              <button
                onClick={close}
                className="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 transition-all active:scale-90"
                style={{ color: "rgba(255,255,255,0.6)" }}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <div className="px-8 py-10 relative" style={{ "--text": "#fff", "--text-muted": "rgba(255,255,255,0.5)", "--border": "rgba(255,255,255,0.1)", "--surface": "rgba(255,255,255,0.06)", "--surface-alt": "transparent" }}>
              {/* Value Proposition Grid */}
              <div className="mb-10 text-center sm:text-left">
                <h4 className="text-3xl sm:text-4xl font-black text-white mb-4 leading-tight">
                  Get Your <span className="text-orange-500">Custom Roadmap</span> <br className="hidden sm:block" /> and Boost Your Views.
                </h4>
                <p className="text-base text-gray-400 max-w-md">
                  Join 50+ high-growth channels. We've optimized 500+ videos for maximum retention and CTR. <span className="text-white font-semibold">100% Free.</span>
                </p>
              </div>

              {/* Progress Indicator */}
              <div className="mb-6 flex items-center justify-between text-[11px] font-bold uppercase tracking-widest text-orange-500/60">
                <span>Request details</span>
                <span>Takes ~20 Seconds</span>
              </div>
              <div className="w-full h-1 bg-white/10 rounded-full mb-8 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: "35%" }}
                  className="h-full bg-orange-500"
                />
              </div>

              {/* Form Container with shadow/depth */}
              <div className="relative z-10 rounded-3xl p-1" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                <QuickLeadForm />
              </div>

              <div className="mt-10 pt-8 border-t border-white/5 flex flex-col items-center gap-6">
                {/* Micro social proof */}
                <div className="flex flex-wrap items-center justify-center gap-6 opacity-40 grayscale hover:grayscale-0 transition-all duration-500">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[10px]">⭐</div>
                    <span className="text-[10px] font-bold text-white uppercase tracking-wider">Top Rated</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[10px]">📊</div>
                    <span className="text-[10px] font-bold text-white uppercase tracking-wider">40% CTR Lift</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[10px]">🎥</div>
                    <span className="text-[10px] font-bold text-white uppercase tracking-wider">500+ Videos</span>
                  </div>
                </div>

                <div className="flex flex-col items-center gap-3">
                  <p className="text-[10px] text-center font-bold opacity-30 text-white uppercase tracking-[0.2em]">
                    Secure • No Spam • Trusted Globally
                  </p>
                  <button
                    onClick={close}
                    className="text-xs font-bold text-white/30 hover:text-white/60 transition-colors uppercase tracking-widest py-2"
                  >
                    Maybe later, I'm just looking
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ExitIntentLeadModal;
