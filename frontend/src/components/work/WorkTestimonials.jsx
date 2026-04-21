/**
 * WorkTestimonials — slim horizontal band pulling published KV
 * testimonials from `/api/testimonials` (shipped commit ad44abb).
 *
 * Renders as a scroll-snap horizontal row on every breakpoint. Empty
 * state is a graceful no-op: the section simply renders nothing when
 * no testimonials exist yet, so the Work page doesn't show an empty
 * band.
 *
 * Uses a simple fetch (public endpoint, 5min edge-cached) — no authed
 * plumbing needed for reads.
 */
import React, { useEffect, useState } from "react";
import { Quote } from "lucide-react";
import { AUTH_BASE } from "../../config/constants";
import { Section, Kicker, RevealOnScroll } from "../../design";

export default function WorkTestimonials() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    const ctrl = new AbortController();
    fetch(`${AUTH_BASE}/api/testimonials`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.testimonials)) {
          setItems(data.testimonials.slice(0, 6));
        }
      })
      .catch(() => { /* silent — band just doesn't render */ });
    return () => ctrl.abort();
  }, []);

  if (!items.length) return null;

  return (
    <Section size="sm" hairlineTop hairlineBot>
      <RevealOnScroll><Kicker>In their words</Kicker></RevealOnScroll>

      <ul
        className="mt-6 flex gap-4 overflow-x-auto snap-x snap-mandatory -mx-4 md:mx-0 px-4 md:px-0 pb-2"
        style={{ scrollbarWidth: "thin" }}
      >
        {items.map((t) => (
          <li
            key={t.id}
            className="snap-start shrink-0 w-[85%] md:w-[360px]"
          >
            <article
              className="h-full p-5 rounded-2xl hairline flex flex-col gap-3"
              style={{ background: "var(--surface)" }}
            >
              <Quote size={18} style={{ color: "var(--orange)" }} aria-hidden="true" />
              <p className="text-sm md:text-base leading-relaxed" style={{ color: "var(--text)" }}>
                "{t.quote}"
              </p>
              <div className="flex items-center gap-3 mt-auto">
                {t.avatar ? (
                  <img
                    src={t.avatar}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="w-9 h-9 rounded-full object-cover"
                  />
                ) : (
                  <div
                    className="w-9 h-9 rounded-full grid place-items-center font-black text-white"
                    style={{ background: "var(--orange)" }}
                    aria-hidden="true"
                  >
                    {(t.author || "?").slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="text-sm font-bold truncate" style={{ color: "var(--text)" }}>{t.author}</div>
                  <div className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
                    {[t.role, t.channel].filter(Boolean).join(" · ")}
                  </div>
                </div>
              </div>
            </article>
          </li>
        ))}
      </ul>
    </Section>
  );
}
