/**
 * MobileCtaBar — sticky bottom CTA visible on mobile only.
 *
 * Appears after the user scrolls past a sentinel placed at the bottom of
 * the hero. Two actions: primary WhatsApp deep-link, secondary mailto.
 * Respects iOS safe-area via env(safe-area-inset-bottom).
 */
import React, { useEffect, useRef, useState } from "react";
import { ArrowRight, Mail } from "lucide-react";

export default function MobileCtaBar({
  whatsappHref = "https://wa.me/919876543210?text=Hi%20Shinel%20—%20I%27d%20like%20to%20start%20a%20project",
  emailHref = "mailto:hello@shinelstudios.in?subject=Project%20enquiry",
}) {
  const [shown, setShown] = useState(false);
  const sentinelRef = useRef(null);

  useEffect(() => {
    // Sentinel is rendered into DOM by this component — we watch it for
    // leaving the viewport (scrolled past).
    const el = sentinelRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        const e = entries[0];
        if (!e) return;
        // Show when the sentinel is ABOVE the viewport (scrolled past).
        setShown(!e.isIntersecting && (e.boundingClientRect.top || 0) < 0);
      },
      { threshold: 0 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <>
      {/* Sentinel: dropped just below the hero by the caller's placement. */}
      <div ref={sentinelRef} aria-hidden="true" style={{ height: 1 }} />

      <div
        role="region"
        aria-label="Quick contact"
        className="md:hidden fixed left-0 right-0 bottom-0 z-40"
        style={{
          paddingBottom: "max(12px, env(safe-area-inset-bottom))",
          paddingLeft: 12,
          paddingRight: 12,
          paddingTop: 12,
          transform: shown ? "translateY(0)" : "translateY(150%)",
          transition: "transform 280ms cubic-bezier(0.22, 1, 0.36, 1)",
          pointerEvents: shown ? "auto" : "none",
        }}
      >
        <div
          className="flex items-center gap-2 p-2 rounded-full hairline"
          style={{
            background: "var(--surface)",
            boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
          }}
        >
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-full font-black text-sm focus-visible:ring-2 focus-visible:ring-[var(--orange)]"
            style={{ background: "var(--orange)", color: "#fff" }}
            aria-label="Start a project on WhatsApp"
          >
            Start a project
            <ArrowRight size={14} />
          </a>
          <a
            href={emailHref}
            className="w-12 h-12 shrink-0 rounded-full grid place-items-center hairline focus-visible:ring-2 focus-visible:ring-[var(--orange)]"
            style={{ color: "var(--text)" }}
            aria-label="Email us"
          >
            <Mail size={16} />
          </a>
        </div>
      </div>
    </>
  );
}
