import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion } from "framer-motion";

/* ===================== Calendly Modal (focus-trap, ARIA polish, safer sandbox) ===================== */

const buildCalendlyUrl = () => {
  const base = "https://calendly.com/shinelstudioofficial/15-min-audit";
  try {
    const u = new URL(base);
    const utm = JSON.parse(localStorage.getItem("utm") || "{}");
    Object.entries(utm).forEach(([k, v]) => u.searchParams.set(k, v));
    u.searchParams.set("hide_event_type_details", "1");
    u.searchParams.set("primary_color", "E85002");
    return u.toString();
  } catch {
    return base;
  }
};

export const CalendlyModal = ({ open, onClose }) => {
  const dialogRef = useRef(null);
  const firstFocusable = useRef(null);
  const lastFocusable = useRef(null);
  const url = useMemo(buildCalendlyUrl, []); // stable per mount

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";

    // focus trap
    const el = dialogRef.current;
    if (el) {
      const focusables = el.querySelectorAll(
        'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])'
      );
      if (focusables.length) {
        firstFocusable.current = focusables[0];
        lastFocusable.current = focusables[focusables.length - 1];
        firstFocusable.current.focus();
      }
    }

    const onKeydown = (e) => {
      if (e.key === "Escape") onClose?.();
      if (e.key === "Tab" && firstFocusable.current && lastFocusable.current) {
        if (e.shiftKey && document.activeElement === firstFocusable.current) {
          e.preventDefault(); lastFocusable.current.focus();
        } else if (!e.shiftKey && document.activeElement === lastFocusable.current) {
          e.preventDefault(); firstFocusable.current.focus();
        }
      }
    };

    const handleMessage = (e) => {
      if (!e.data?.event?.startsWith("calendly.")) return;
      if (e.data.event === "calendly.event_scheduled") {
        try { window.dispatchEvent(new CustomEvent("analytics", { detail: { ev: "calendly_booked" } })); } catch { }
        try { window.dispatchEvent(new CustomEvent("notify", { detail: { type: "success", message: "Audit booked! Check your email." } })); } catch { }
        setTimeout(() => onClose?.(), 2000);
      }
    };

    document.addEventListener("keydown", onKeydown);
    window.addEventListener("message", handleMessage);

    return () => {
      document.documentElement.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKeydown);
      window.removeEventListener("message", handleMessage);
    };
  }, [open, onClose]);


  if (!open) return null;
  const onOverlay = (e) => { if (e.currentTarget === e.target) onClose?.(); };

  return (
    <motion.div
      className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Free 15-minute content audit"
      onMouseDown={onOverlay}
      onTouchStart={onOverlay}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        ref={dialogRef}
        className="bg-[var(--surface)] rounded-2xl w-full max-w-3xl overflow-hidden border focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)]"
        style={{ borderColor: "var(--border)" }}
        initial={{ scale: 0.98, y: 8, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.98, y: 8, opacity: 0 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
      >
        <div className="flex items-center justify-between px-4 py-3" style={{ color: "var(--text)" }}>
          <b>Free 15-min Content Audit</b>
          <button
            onClick={onClose}
            className="text-sm opacity-80 hover:opacity-100 px-3 py-1 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)]"
            aria-label="Close scheduling dialog"
          >
            Close
          </button>
        </div>

        <div className="h-[70vh]">
          <iframe
            title="Book a call"
            src={url}
            className="w-full h-full"
            style={{ border: 0 }}
            loading="lazy"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
            referrerPolicy="strict-origin-when-cross-origin"
            allow="camera; microphone; fullscreen; clipboard-read; clipboard-write"
          />
        </div>
      </motion.div>
    </motion.div>
  );
};

export default CalendlyModal;