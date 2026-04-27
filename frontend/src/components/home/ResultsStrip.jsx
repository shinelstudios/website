/**
 * ResultsStrip — horizontal carousel of client wins. Discrete cards,
 * touch-swipeable on mobile via native overflow. Each card teases a
 * concrete outcome metric. Static for v1; admin tooling can come later.
 */
import React from "react";
import { Link } from "react-router-dom";
import { TrendingUp, Eye, Users, Zap, ArrowUpRight } from "lucide-react";
import { Section, Kicker, Display, Lede, HairlineCard, RevealOnScroll } from "../../design";

const RESULTS = [
  {
    Icon: TrendingUp,
    creator: "Kamz Inkzone",
    headline: "+38% avg view duration",
    detail: "Retention-led editing across 12 long-form drops over 30 days. New chapter cuts + tighter B-roll.",
    href: "/work",
  },
  {
    Icon: Users,
    creator: "Manav Sukhija",
    headline: "+9.4k subs in Q2",
    detail: "Shorts production with hook-first structure. Two drops per week, meme-timed cuts, auto captions.",
    href: "/work",
  },
  {
    Icon: Eye,
    creator: "Maggie Live",
    headline: "287% CTR lift",
    detail: "Multivariate thumbnail design. A/B tested concepts, brand-consistent style across 8 weeks.",
    href: "/work",
  },
  {
    Icon: Zap,
    creator: "Aish is Live",
    headline: "1.2M views on a single drop",
    detail: "Hook-tuned long-form edit with structured retention checkpoints. First 8 seconds re-cut three times.",
    href: "/work",
  },
];

export default function ResultsStrip() {
  return (
    <Section size="lg" tone="surface-alt" hairlineTop>
      <div className="max-w-3xl mb-10">
        <RevealOnScroll>
          <Kicker className="mb-3">The receipts</Kicker>
        </RevealOnScroll>
        <RevealOnScroll delay="80ms">
          <Display size="lg" className="mb-4">
            Numbers our clients{" "}
            <span style={{ color: "var(--orange)" }} className="italic">
              actually see.
            </span>
          </Display>
        </RevealOnScroll>
        <RevealOnScroll delay="160ms">
          <Lede>
            Real outcomes from real channels. Every metric on this page is a
            creator we worked with by name.
          </Lede>
        </RevealOnScroll>
      </div>

      <div className="-mx-4 md:-mx-6 px-4 md:px-6 overflow-x-auto pb-4 scroll-smooth snap-x snap-mandatory">
        <div className="flex gap-4 md:gap-5 min-w-min">
          {RESULTS.map((r, i) => (
            <RevealOnScroll key={r.creator} delay={`${i * 60}ms`}>
              <Link to={r.href} className="block group">
                <HairlineCard className="p-5 md:p-6 w-[280px] md:w-[340px] h-full snap-start transition-transform hover:-translate-y-0.5">
                  <span
                    className="inline-grid place-items-center w-10 h-10 rounded-xl mb-4"
                    style={{ background: "rgba(232,80,2,0.12)", color: "var(--orange)" }}
                  >
                    <r.Icon size={20} aria-hidden="true" />
                  </span>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-2" style={{ color: "var(--text-muted)" }}>
                    {r.creator}
                  </p>
                  <p className="text-display-sm mb-3 leading-tight" style={{ color: "var(--orange)" }}>
                    {r.headline}
                  </p>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
                    {r.detail}
                  </p>
                  <span
                    className="mt-4 inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ color: "var(--orange)" }}
                  >
                    See the work <ArrowUpRight size={10} />
                  </span>
                </HairlineCard>
              </Link>
            </RevealOnScroll>
          ))}
        </div>
      </div>
    </Section>
  );
}
