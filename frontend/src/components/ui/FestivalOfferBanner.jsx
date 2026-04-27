/**
 * FestivalOfferBanner — auto-shows during a configured festival window.
 *
 * Rulebook:
 *   1. Max 25% discount ever (was 30% pre-2026-04-27).
 *   2. National (India) festivals first, then famous international.
 *   3. Window: 1 day before festival → end of durationDays.
 *   4. Live countdown in the banner.
 *   5. Dismissal persists for the browser session (sessionStorage).
 *
 * Visual is editorial v2: kicker label + display text + mono countdown
 * chip. Per-festival theme background is preserved as a brand
 * differentiator (Holi pink, Diwali gold, Indep tricolour, etc.) but
 * typography + spacing follow the design system.
 */
import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, ArrowRight, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { FESTIVAL_DATABASE } from "../../config/constants";

const DISMISS_KEY = "shinel:festivalBanner:dismissed";

const FestivalOfferBanner = () => {
  const navigate = useNavigate();
  const [timeLeft, setTimeLeft] = useState("");
  const [dismissedId, setDismissedId] = useState(() => {
    try { return sessionStorage.getItem(DISMISS_KEY) || null; } catch { return null; }
  });

  const activeOffer = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    return FESTIVAL_DATABASE.find((fest) => {
      const start = new Date(currentYear, fest.month, fest.day - 1);
      const end = new Date(currentYear, fest.month, fest.day + fest.durationDays);
      return now >= start && now <= end;
    });
  }, []);

  useEffect(() => {
    if (!activeOffer) return;
    const tick = () => {
      const now = new Date();
      const end = new Date(now.getFullYear(), activeOffer.month, activeOffer.day + activeOffer.durationDays);
      const diff = end - now;
      if (diff <= 0) { setTimeLeft(""); return; }
      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const m = Math.floor((diff / 1000 / 60) % 60);
      const s = Math.floor((diff / 1000) % 60);
      setTimeLeft(`${d > 0 ? d + "d " : ""}${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`);
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [activeOffer]);

  const dismiss = () => {
    if (!activeOffer) return;
    try { sessionStorage.setItem(DISMISS_KEY, activeOffer.id); } catch { /* */ }
    setDismissedId(activeOffer.id);
  };

  const claim = () => navigate("/pricing");

  if (!activeOffer) return null;
  if (dismissedId === activeOffer.id) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: "auto", opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
        className="relative z-[70]"
        style={{
          background: activeOffer.theme,
          borderBottom: "1px solid rgba(0,0,0,0.08)",
        }}
        role="region"
        aria-label="Festival offer"
      >
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-2.5 md:py-3">
          {/* Mobile: stacked. Desktop: horizontal. */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-4">

            {/* Headline */}
            <div className="flex items-start md:items-center gap-3 flex-1">
              <span
                className="hidden md:grid place-items-center w-9 h-9 rounded-lg shrink-0"
                style={{ background: "rgba(0,0,0,0.08)", color: activeOffer.badgeColor }}
                aria-hidden="true"
              >
                <Sparkles size={16} />
              </span>
              <div className="flex-1 min-w-0">
                <p
                  className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.18em] leading-tight"
                  style={{ color: activeOffer.textColor, opacity: 0.85 }}
                >
                  <Sparkles size={11} className="inline md:hidden mr-1 -mt-0.5" aria-hidden="true" />
                  {activeOffer.title}
                </p>
                <p
                  className="text-base md:text-xl font-black leading-tight mt-0.5"
                  style={{ color: activeOffer.textColor, fontFamily: "var(--font-display, 'Outfit Variable', 'Outfit', sans-serif)" }}
                >
                  Flat <span className="font-mono-num">{activeOffer.discount}%</span> off
                  <span className="ml-2 text-xs md:text-sm font-bold opacity-75">on all services</span>
                </p>
              </div>
            </div>

            {/* Countdown chip — primary on mobile, inline on desktop */}
            {timeLeft && (
              <div
                className="inline-flex self-start md:self-auto items-center gap-2 px-3 py-1.5 rounded-full shrink-0"
                style={{
                  background: "rgba(0,0,0,0.12)",
                  border: "1px solid rgba(0,0,0,0.15)",
                }}
              >
                <Clock size={12} style={{ color: activeOffer.textColor }} aria-hidden="true" />
                <span
                  className="text-[11px] font-mono-num font-bold tabular-nums tracking-tight"
                  style={{ color: activeOffer.textColor }}
                  aria-live="polite"
                >
                  {timeLeft}
                </span>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={claim}
                className="inline-flex items-center gap-1.5 px-4 md:px-5 py-2 rounded-full text-[11px] md:text-xs font-black uppercase tracking-widest transition-transform hover:-translate-y-0.5 active:translate-y-0"
                style={{
                  background: "#0F0F0F",
                  color: "#fff",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
                  minHeight: 36,
                }}
              >
                Claim · code {activeOffer.code}
                <ArrowRight size={12} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={dismiss}
                aria-label="Dismiss festival offer"
                className="grid place-items-center w-8 h-8 rounded-full transition-colors"
                style={{ color: activeOffer.textColor, opacity: 0.7 }}
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default FestivalOfferBanner;
