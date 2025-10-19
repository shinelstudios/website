// src/components/ExitIntentLeadModal.jsx
import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
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

  const tryOpen = (reason) => {
    if (open) return;
    if (now() - mountAt.current < mountGuardMs) return;
    if (now() < suppressUntil.current) return;
    if (isShownThisSession()) return;
    if (isShownInCooldown()) return;

    setOpen(true);
    markShownThisSession();
    markShownForUser();
    try { window.dispatchEvent(new CustomEvent("analytics", { detail: { ev: "exit_intent_open", reason } })); } catch {}
  };

  const close = () => {
    setOpen(false);
    suppressUntil.current = now() + 10_000;
    try { window.dispatchEvent(new CustomEvent("analytics", { detail: { ev: "exit_intent_close" } })); } catch {}
  };

  // detect coarse pointer (mobile/tablet)
  useEffect(() => {
    let coarse = false;
    try { coarse = window.matchMedia?.("(pointer: coarse)")?.matches ?? false; } catch {}
    setIsCoarse(coarse);
    setEligible(true); // both desktop and mobile eligible (mobile uses dwell only)
  }, []);

  // exit-intent (desktop/top leave)
  useEffect(() => {
    if (!eligible || isCoarse) return;
    const onMouseOut = (e) => {
      if (e.relatedTarget) return;
      if (e.clientY > 0) return;
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
      } catch {}
    };
    document.addEventListener("click", onClickCapture, true);
    return () => document.removeEventListener("click", onClickCapture, true);
  }, []);

  // briefly suppress around tab visibility/history nav
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        suppressUntil.current = now() + 3_000;
      }
    };
    const onPop = () => { suppressUntil.current = now() + 3_000; };
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
            initial={sheet ? { y: "100%", opacity: 1 } : { y: -14, opacity: 0.0, scale: 0.98 }}
            animate={sheet ? { y: 0, opacity: 1 } : { y: 0, opacity: 1, scale: 1 }}
            exit={sheet ? { y: "100%", opacity: 1 } : { y: -14, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.24, ease: "easeOut" }}
            className={sheet
              ? "fixed left-0 right-0 bottom-0 w-full max-h-[85vh] overflow-auto rounded-t-2xl shadow-2xl"
              : "fixed left-1/2 top-10 -translate-x-1/2 w-[min(92vw,860px)] max-h-[88vh] overflow-auto rounded-2xl shadow-2xl"
            }
            style={{
              zIndex: zIndex + 1,
              background: "var(--surface)",
              border: "1px solid var(--border)",
            }}
          >
            <div
              className={sheet ? "sticky top-0 px-4 py-3 flex items-center justify-between" : "sticky top-0 px-4 md:px-6 py-3 flex items-center justify-between"}
              style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}
            >
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ background: "var(--orange)" }} />
                <span className="text-sm md:text-base font-semibold" style={{ color: "var(--text)" }}>
                  Before you go — want a quick quote?
                </span>
              </div>
              <button onClick={close} className="rounded-lg px-2 py-1 text-sm" style={{ color: "var(--text)" }} aria-label="Close">✕</button>
            </div>

            <div className={sheet ? "px-4 py-4" : "px-4 md:px-6 py-4 md:py-6"}>
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
