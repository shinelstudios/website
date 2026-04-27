/**
 * PricingTeaser — homepage strip mirroring real /pricing data, NOT made-up
 * numbers. Shows one coherent ladder (gaming) since the homepage testimonials
 * lean gaming. Vlog / podcast / brand pipelines live at /pricing where users
 * can switch category. Middle tier (Shorts Factory) is marked POPULAR per
 * the same `POPULAR` map in Pricing.jsx.
 *
 * If pricing numbers change in Pricing.jsx, update them here too — these
 * are the only three plans surfaced on /. (Or pull from a shared constant
 * if/when we extract one.)
 */
import React from "react";
import { Link } from "react-router-dom";
import { Check, ArrowUpRight } from "lucide-react";
import { Section, Kicker, Display, Lede, HairlineCard, RevealOnScroll } from "../../design";

// Mirrors PLANS.gaming from Pricing.jsx as of 2026-04-27. Three plans
// (skipping "The Vanguard" middle tier on the homepage to keep the
// teaser scannable). Full ladder + categories at /pricing.
const TIERS = [
  {
    name: "Trial Sprint",
    tag: "Test the workflow",
    price: "₹599",
    unit: "one-time",
    desc: "Single deliverable to prove the quality before you commit to monthly. 48-hour handoff.",
    bullets: [
      "1 cinematic thumbnail (A/B ready)",
      "1 high-octane short (≤50s)",
      "Channel audit + SEO baseline",
    ],
    cta: "Start a trial",
  },
  {
    name: "Shorts Factory",
    tag: "Viral frequency",
    price: "₹6,999",
    unit: "/ month",
    desc: "30 shorts + 30 thumbnails on a 72-hour priority queue. The plan most gaming creators land on.",
    bullets: [
      "30 optimized shorts / month",
      "30 vertical thumbnails",
      "Meme-engine + trend captions",
    ],
    cta: "Scale shorts",
    badge: "Most popular",
    primary: true,
  },
  {
    name: "Empire Tier",
    tag: "Full studio outsource",
    price: "₹13,499",
    unit: "/ month",
    desc: "Complete channel management: long-form + shorts + thumbnails + monthly growth audit. 48h SLA.",
    bullets: [
      "4 long-form + 20 shorts / mo",
      "Complete channel management",
      "Monthly growth & analytics audit",
    ],
    cta: "Build my empire",
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
            Test the workflow.{" "}
            <span style={{ color: "var(--orange)" }} className="italic">
              Then scale up.
            </span>
          </Display>
        </RevealOnScroll>
        <RevealOnScroll delay="160ms">
          <Lede>
            Most creators start with the <strong>Trial Sprint</strong> at ₹599
            to see the quality, then move to a monthly retainer once
            they've shipped a deliverable they're happy with. Three of our
            gaming plans below — vlog, podcast, and brand pipelines have
            their own pricing.
          </Lede>
        </RevealOnScroll>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5 items-stretch">
        {TIERS.map((t, i) => (
          <RevealOnScroll key={t.name} delay={`${i * 80}ms`}>
            <HairlineCard
              className="relative p-6 md:p-7 h-full flex flex-col"
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
              <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-1" style={{ color: "var(--orange)" }}>
                {t.name}
              </p>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>
                {t.tag}
              </p>
              <p className="text-display-md leading-none mb-1" style={{ color: "var(--text)" }}>
                <span className="text-mono-num">{t.price}</span>
              </p>
              <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>{t.unit}</p>
              <p className="text-sm leading-relaxed mb-5" style={{ color: "var(--text-muted)" }}>{t.desc}</p>
              <ul className="space-y-2 mb-6 flex-1">
                {t.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-2 text-sm" style={{ color: "var(--text)" }}>
                    <Check size={14} style={{ color: "var(--orange)", marginTop: 3, flexShrink: 0 }} aria-hidden="true" />
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
          See all 14 plans across gaming, vlog, podcast & brand <ArrowUpRight size={12} />
        </Link>
      </div>
    </Section>
  );
}
