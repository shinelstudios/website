// src/components/ExitIntentLeadModal.jsx
import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
// ⬇️ Update this import path if your QuickLeadForm file is elsewhere
import QuickLeadForm from "./QuickLeadForm.jsx";

/**
 * ExitIntentLeadModal
 *
 * Triggers:
 *  - Desktop exit-intent (mouse leaves at the top edge)
 *  - Inactivity/dwell timer: shows after dwellMs (default 10 min)
 *
 * Suppression:
 *  - Only once per session (sessionStorage). Optionally "once per user" cool-down (localStorage)
 *  - Suppress when navigating inside the site (internal links / router transitions)
 *
 * Props:
 *  - dwellMs?: number (default 600_000 = 10 min)
 *  - onceMode?: "session" | "user"  (default "session")
 *  - userCooldownDays?: number      (default 7, only if onceMode="user")
 *  - mountGuardMs?: number          (ignore triggers for first X ms; default 4000)
 *  - zIndex?: number (default 1000)
 */
const ExitIntentLeadModal = ({
  dwellMs = 600_000,
  onceMode = "session",
  userCooldownDays = 7,
  mountGuardMs = 4_000,
  zIndex = 1000,
}) => {
  const [open, setOpen] = useState(false);
  const [eligible, setEligible] = useState(false);

  const mountAt = useRef(Date.now());
  const suppressUntil = useRef(0);
  const dwellTimer = useRef(null);

  // --- Util: flags
  const SESSION_KEY = "ss_exit_offer_shown";
  const USER_KEY = "ss_exit_offer_shown_at"; // timestamp (ms)

  const now = () => Date.now();

  const isShownThisSession = () => {
    try { return sessionStorage.getItem(SESSION_KEY) === "1"; } catch { return false; }
  };
  const markShownThisSession = () => {
    try { sessionStorage.setItem(SESSION_KEY, "1"); } catch {}
  };

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
    try { localStorage.setItem(USER_KEY, String(now())); } catch {}
  };

  // --- Internal: open modal (respect flags)
  const tryOpen = (reason) => {
    if (open) return;
    const withinMountGuard = now() - mountAt.current < mountGuardMs;
    if (withinMountGuard) return;
    if (now() < suppressUntil.current) return;
    if (isShownThisSession()) return;
    if (isShownInCooldown()) return;

    setOpen(true);
    markShownThisSession();
    markShownForUser();
    // Optional: analytics ping
    try { window.dispatchEvent(new CustomEvent("analytics", { detail: { ev: "exit_intent_open", reason } })); } catch {}
  };

  const close = () => {
    setOpen(false);
    // Briefly suppress re-triggers (e.g., if user hovers out again)
    suppressUntil.current = now() + 10_000;
    try { window.dispatchEvent(new CustomEvent("analytics", { detail: { ev: "exit_intent_close" } })); } catch {}
  };

  // --- Eligibility (pointer/hover-capable devices mostly considered "desktop")
  useEffect(() => {
    let isCoarse = false;
    try {
      isCoarse = window.matchMedia?.("(pointer: coarse)")?.matches ?? false;
    } catch {}
    // We still allow dwell fallback on any device; exit-intent is for non-coarse pointers.
    setEligible(true);
  }, []);

  // --- Exit-intent (desktop): mouse leaving at top edge, ignore internal navigations
  useEffect(() => {
    if (!eligible) return;

    const onMouseOut = (e) => {
      // Only when pointer leaves document at top
      const rel = e.relatedTarget;
      if (rel) return; // moving into another element — not leaving page
      const y = e.clientY;
      if (y > 0) return;
      // Avoid when we recently clicked an internal link
      if (now() < suppressUntil.current) return;
      tryOpen("mouse_exit_top");
    };

    document.addEventListener("mouseout", onMouseOut);
    return () => document.removeEventListener("mouseout", onMouseOut);
  }, [eligible]);

  // --- Dwell timer (any device): show after dwellMs once per session
  useEffect(() => {
    if (!eligible) return;
    if (isShownThisSession() || isShownInCooldown()) return;
    dwellTimer.current = window.setTimeout(() => tryOpen("dwell_timer"), dwellMs);
    return () => window.clearTimeout(dwellTimer.current);
  }, [eligible, dwellMs]);

  // --- Suppress when navigating internally (anchor clicks / router links)
  useEffect(() => {
    const isInternalClick = (ev) => {
      // capture <a> clicks that stay on same origin
      const a = ev
        .composedPath()
        .find((n) => n?.tagName === "A" && n.href) ?? null;
      if (!a) return false;
      try {
        const url = new URL(a.href);
        return url.origin === window.location.origin;
      } catch {
        return false;
      }
    };
    const onClickCapture = (ev) => {
      if (isInternalClick(ev)) {
        // Suppress exit-intent for a short grace period after internal navigation
        suppressUntil.current = now() + 5_000;
      }
    };
    document.addEventListener("click", onClickCapture, true);
    return () => document.removeEventListener("click", onClickCapture, true);
  }, []);

  // --- Also suppress during route transitions (React Router users)
  // If you use react-router, you can pass a location key via a prop and watch it here
  // For a zero-dep approach, we also listen to BFCache restore and visibility.
  useEffect(() => {
    const onVisibility = () => {
      // If user switches tabs and returns, don't immediately pop the modal.
      if (document.visibilityState === "hidden") {
        suppressUntil.current = now() + 3_000;
      }
    };
    const onPopState = () => {
      // Navigating within app via history/back/forward — suppress briefly
      suppressUntil.current = now() + 3_000;
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("popstate", onPopState);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

  // --- Prevent background scroll when open
  useEffect(() => {
    if (!open) return;
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => { document.documentElement.style.overflow = prev; };
  }, [open]);

  if (!eligible) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="exit-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0"
            aria-hidden="true"
            style={{
              zIndex,
              background: "rgba(0,0,0,0.5)",
              backdropFilter: "blur(2px)",
            }}
            onClick={close}
          />
          <motion.div
            key="exit-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Get a quick quote"
            initial={{ opacity: 0, y: -14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -14, scale: 0.98 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="fixed left-1/2 top-10 -translate-x-1/2 w-[min(92vw,860px)] max-h-[88vh] overflow-auto rounded-2xl shadow-2xl"
            style={{
              zIndex: zIndex + 1,
              background: "var(--surface)",
              border: "1px solid var(--border)",
            }}
          >
            {/* Header */}
            <div
              className="sticky top-0 flex items-center justify-between px-4 md:px-6 py-3"
              style={{
                background: "color-mix(in oklab, var(--surface) 92%, transparent)",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ background: "var(--orange)" }}
                  aria-hidden="true"
                />
                <span className="text-sm md:text-base font-semibold" style={{ color: "var(--text)" }}>
                  Before you go — want a quick quote?
                </span>
              </div>

              <button
                onClick={close}
                className="rounded-lg px-2 py-1 text-sm"
                style={{ color: "var(--text)" }}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* Body: your existing form */}
            <div className="px-4 md:px-6 py-4 md:py-6">
              <QuickLeadForm />
              <p className="mt-3 text-[11px] text-center" style={{ color: "var(--text-muted)" }}>
                We’ll show this only once {onceMode === "user" ? "every few visits" : "this session"}.
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ExitIntentLeadModal;
