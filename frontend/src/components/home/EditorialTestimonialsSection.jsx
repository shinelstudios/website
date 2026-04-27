/**
 * EditorialTestimonialsSection — replaces the legacy 600-line inline
 * testimonials block. Renders 4 hardcoded "rich" testimonials (video +
 * analytics mix) in a HairlineCard grid + a "More praise" KV-backed
 * quote wall below.
 *
 * Also emits ReviewSchema (aggregate rating) for SERP rich snippets.
 */
import React from "react";
import { Quote } from "lucide-react";
import {
  Section, Kicker, Display, Lede, HairlineCard, RevealOnScroll,
} from "../../design";
import { AUTH_BASE } from "../../config/constants";
import VideoTestimonialCard from "./VideoTestimonialCard.jsx";
import AnalyticsTestimonialCard from "./AnalyticsTestimonialCard.jsx";
import { ReviewSchema } from "../MetaTags.jsx";

const RICH_TESTIMONIALS = [
  {
    type: "video",
    creator: "Kamz Inkzone",
    handle: "@kamzinkzone · 173k subs",
    videoId: "dQw4w9WgXcQ", // placeholder — admin can replace
    quote: "Shinel turned my channel around. Retention went up, CTR went up, and I finally have a process I can trust.",
  },
  {
    type: "analytics",
    creator: "Manav Sukhija",
    handle: "@manavsukhija",
    quote: "The Shorts strategy alone added 9.4k subs in a quarter. Hooks are tighter, captions are on-brand, and the cadence is finally predictable.",
    metrics: [
      { value: "+9.4k", label: "subs Q2" },
      { value: "+38%", label: "watch time" },
      { value: "2×", label: "shorts/wk" },
    ],
    deltaLabel: "+38% YoY",
  },
  {
    type: "analytics",
    creator: "Maggie Live",
    handle: "@maggielivereal · 21k subs",
    quote: "Thumbnails went from afterthought to my main growth lever. CTR nearly tripled in 8 weeks.",
    metrics: [
      { value: "287%", label: "CTR lift" },
      { value: "12", label: "concepts/mo" },
      { value: "8wk", label: "to land" },
    ],
    deltaLabel: "+287% CTR",
  },
  {
    type: "video",
    creator: "Aish is Live",
    handle: "@aishislive",
    videoId: "L_jWHffIx5E", // placeholder — admin can replace
    quote: "Hook-tuned long-form means I'm not staring at retention dropoff at 8 seconds anymore. Cleanest workflow I've used.",
  },
];

export default function EditorialTestimonialsSection() {
  const [kvQuotes, setKvQuotes] = React.useState([]);

  React.useEffect(() => {
    let cancelled = false;
    fetch(`${AUTH_BASE}/api/testimonials`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled) return;
        const arr = Array.isArray(d?.testimonials) ? d.testimonials : [];
        setKvQuotes(arr.slice(0, 6));
      })
      .catch(() => { /* silent */ });
    return () => { cancelled = true; };
  }, []);

  return (
    <Section size="lg" hairlineTop>
      <ReviewSchema
        reviews={{
          averageRating: "4.9",
          count: 50,
          items: RICH_TESTIMONIALS,
        }}
      />

      <div className="max-w-3xl mb-10">
        <RevealOnScroll>
          <Kicker className="mb-3">Praise · in their words</Kicker>
        </RevealOnScroll>
        <RevealOnScroll delay="80ms">
          <Display size="lg" className="mb-4">
            What creators say after{" "}
            <span style={{ color: "var(--orange)" }} className="italic">
              shipping with us.
            </span>
          </Display>
        </RevealOnScroll>
        <RevealOnScroll delay="160ms">
          <Lede>
            Real channels, real numbers, real receipts. Click any video card to
            watch the deliverable that earned the testimonial.
          </Lede>
        </RevealOnScroll>
      </div>

      {/* Rich testimonials grid: video + analytics mix */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5 mb-12">
        {RICH_TESTIMONIALS.map((t, i) => (
          <RevealOnScroll key={`${t.creator}-${i}`} delay={`${(i % 4) * 60}ms`}>
            {t.type === "video" ? (
              <VideoTestimonialCard testimonial={t} />
            ) : (
              <AnalyticsTestimonialCard testimonial={t} />
            )}
          </RevealOnScroll>
        ))}
      </div>

      {/* KV-backed "more praise" quote wall — only renders if any quotes exist */}
      {kvQuotes.length > 0 && (
        <>
          <div className="mb-5">
            <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: "var(--text-muted)" }}>
              More praise
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {kvQuotes.map((q, i) => (
              <RevealOnScroll key={q.id || i} delay={`${(i % 3) * 60}ms`}>
                <HairlineCard className="p-5 h-full">
                  <Quote size={14} className="mb-2" style={{ color: "var(--orange)", opacity: 0.7 }} aria-hidden="true" />
                  <p className="text-sm leading-relaxed mb-3" style={{ color: "var(--text)" }}>
                    {q.quote || q.text || ""}
                  </p>
                  <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                    {q.author || q.creator || q.name || "Anonymous"}
                  </p>
                </HairlineCard>
              </RevealOnScroll>
            ))}
          </div>
        </>
      )}
    </Section>
  );
}
