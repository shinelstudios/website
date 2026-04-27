/**
 * PricingTeaser — 3-tier condensed pricing strip pointing at /pricing.
 * Middle tier highlighted (most-popular pattern proven on /live-templates).
 */
import React from "react";
import { Link } from "react-router-dom";
import { Check, ArrowUpRight } from "lucide-react";
import { Section, Kicker, Display, Lede, HairlineCard, RevealOnScroll } from "../../design";

const TIERS = [
  {
    name: "Starter",
    price: "₹4,999",
    unit: "/ thumbnail pack",
    desc: "Single creator, single drop. 3 thumbnail concepts + 2 revisions.",
    bullets: ["3 concepts", "2 revisions", "48 h delivery"],
    cta: "Try a single project",
  },
  {
    name: "Monthly retainer",
    price: "₹49,999",
    unit: "/ month",
    desc: "4 long-form edits, 8 shorts, 12 thumbnails, named editor.",
    bullets: ["4 long-form + 8 shorts", "12 thumbnails", "Named editor + slack"],
    cta: "Plan a retainer",
    badge: "Most popular",
    primary: true,
  },
  {
    name: "Brand systems",
    price: "Custom",
    unit: "scoped per project",
    desc: "Full brand identity, motion package, channel rebrand. Quote in 24 h.",
    bullets: ["Logo + motion + GFX", "Channel art + templates", "Style guide"],
    cta: "Get a custom quote",
  },
];

export default function PricingTeaser() {
  return (
    <Section size="lg" hairlineTop>
      <div className="max-w-3xl mb-10">
        <RevealOnScroll>
          <Kicker className="mb-3">Pricing · transparent</Kicker>
        </RevealOnScroll>
        <RevealOnScroll delay="80ms">
          <Display size="lg" className="mb-4">
            Three tiers. Pick the one{" "}
            <span style={{ color: "var(--orange)" }} className="italic">
              that fits.
            </span>
          </Display>
        </RevealOnScroll>
        <RevealOnScroll delay="160ms">
          <Lede>
            Most creators land on the monthly retainer — predictable output, a
            named editor, and the best per-deliverable rate. One-off projects
            and brand systems on either side.
          </Lede>
        </RevealOnScroll>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5 items-stretch">
        {TIERS.map((t, i) => (
          <RevealOnScroll key={t.name} delay={`${i * 80}ms`}>
            <HairlineCard
              className="relative p-6 md:p-7 h-full"
              style={{
                background: t.primary ? "rgba(232,80,2,0.04)" : "var(--surface)",
                borderColor: t.primary ? "var(--orange)" : "var(--hairline)",
                transform: t.primary ? "scale(1.02)" : "none",
                boxShadow: t.primary ? "0 18px 42px -28px rgba(232,80,2,0.6)" : "none",
              }}
            >
              {t.badge && (
                <span
                  className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest"
                  style={{ background: "var(--orange)", color: "#fff" }}
                >
                  {t.badge}
                </span>
              )}
              <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-3" style={{ color: "var(--orange)" }}>
                {t.name}
              </p>
              <p className="text-display-md leading-none mb-1" style={{ color: "var(--text)" }}>
                <span className="text-mono-num">{t.price}</span>
              </p>
              <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>{t.unit}</p>
              <p className="text-sm leading-relaxed mb-5" style={{ color: "var(--text-muted)" }}>{t.desc}</p>
              <ul className="space-y-2 mb-6">
                {t.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-2 text-sm" style={{ color: "var(--text)" }}>
                    <Check size={14} style={{ color: "var(--orange)", marginTop: 3 }} aria-hidden="true" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
              <Link
                to="/pricing"
                className={t.primary ? "btn-editorial w-full justify-center inline-flex items-center gap-1" : "btn-editorial-ghost w-full justify-center inline-flex items-center gap-1"}
              >
                {t.cta} <ArrowUpRight size={12} />
              </Link>
            </HairlineCard>
          </RevealOnScroll>
        ))}
      </div>

      <div className="mt-8 text-center">
        <Link
          to="/pricing"
          className="text-xs font-black uppercase tracking-widest inline-flex items-center gap-1.5"
          style={{ color: "var(--orange)" }}
        >
          See full pricing breakdown <ArrowUpRight size={12} />
        </Link>
      </div>
    </Section>
  );
}
