/**
 * LiveTemplates — direct-URL only (no nav link).
 *
 * One-page landing for the BGMI livestream-thumbnail subscription product.
 * Three pricing tiers (single ₹150, subscription ₹600/5, pro ₹1500/15)
 * with the middle one highlighted as MOST POPULAR.
 *
 * The "Same template, different creators" section is the signature feature:
 * each template renders as a TripleBeforeAfterSlider showing Base → V1 → V2
 * with two draggable handles. Restored from the pre-2026-04-26 version.
 *
 * Per business policy this URL must NEVER be linked from site nav. Tracked
 * in the admin "Hidden landing pages" registry at /dashboard/landing-pages.
 * Admin can edit the template sliders at /dashboard/live-templates.
 */
import { useEffect, useState } from "react";
import { ArrowRight, Sparkles, Zap, Repeat, ShieldCheck, MessageCircle, Check } from "lucide-react";
import {
  Section,
  Kicker,
  Display,
  Lede,
  HairlineCard,
  RevealOnScroll,
  SpotlightSweep,
  Img,
  useReducedMotion,
} from "../design";
import MetaTags, { ProductSchema, FAQSchema } from "./MetaTags";
import { AUTH_BASE } from "../config/constants";
import TripleBeforeAfterSlider from "./live-templates/TripleBeforeAfterSlider";

import bgmiBase from "@/assets/bgmi-thumbnail-base.jpg";
import bgmiCreator1 from "@/assets/bgmi-thumbnail-creator1.jpg";
import bgmiCreator2 from "@/assets/bgmi-thumbnail-creator2.jpg";
import bgmiBase2 from "@/assets/bgmi-thumbnail-base2.jpg";
import bgmiBase2Webp from "@/assets/bgmi-thumbnail-base2.webp";
import bgmiCreator3 from "@/assets/bgmi-thumbnail-creator3.jpg";
import bgmiCreator3Webp from "@/assets/bgmi-thumbnail-creator3.webp";
import bgmiCreator4 from "@/assets/bgmi-thumbnail-creator4.jpg";

const WHATSAPP_HREF = "https://wa.me/918968141585?text=Hi%20Shinel%20%E2%80%94%20I%27d%20like%20a%20BGMI%20livestream%20thumbnail";

// Hardcoded defaults — render at build-time prerender AND fall back here if
// /api/live-templates is unreachable or empty. Admin edits at
// /dashboard/live-templates override these on the live site.
const FALLBACK_TEMPLATES = [
  {
    id: "bgmi-a",
    name: "BGMI Series A",
    baseUrl: bgmiBase,    baseLabel: "Base",
    v1Url:   bgmiCreator1, v1Label:  "Creator 1",
    v2Url:   bgmiCreator2, v2Label:  "Creator 2",
  },
  {
    id: "bgmi-b",
    name: "BGMI Series B",
    baseUrl: bgmiBase2,    baseLabel: "Base",
    v1Url:   bgmiCreator3, v1Label:  "Creator 3",
    v2Url:   bgmiCreator4, v2Label:  "Creator 4",
  },
];

const STEPS = [
  { icon: Sparkles, title: "Pick a template", body: "Browse our high-CTR BGMI templates. One winner is all you need." },
  { icon: Zap, title: "Send your photo + name", body: "We swap in your face and handle. Same composition, your branding." },
  { icon: Repeat, title: "Get it back in 3–4 hours", body: "Express delivery. Subscribers get up to 15 swaps every month." },
];

const FAQS = [
  {
    question: "How fast is express delivery?",
    answer: "3–4 hours from when you send us your photo and stream title. We work IST 10am–10pm. Orders after 9pm ship next morning.",
  },
  {
    question: "What's the difference between the 3 tiers?",
    answer: "All three deliver the same quality. The single (₹150) is for one-off streams; the 5-pack (₹600) saves ₹150 if you stream weekly; the 15-pack (₹1500) saves ₹750 if you stream daily — that's ₹100 per thumbnail, our best rate.",
  },
  {
    question: "Can I request a fresh template design?",
    answer: "Yes — that's a separate engagement. Reach out on WhatsApp and we'll quote you a custom template. Most creators are best served by our existing winners.",
  },
  {
    question: "Why one template over many?",
    answer: "Channel consistency. Viewers recognise you in their feed faster, your CTR climbs, the algorithm rewards it. The whole product is built around this insight.",
  },
  {
    question: "Can I cancel my subscription anytime?",
    answer: "Yes — month-to-month, no lock-in. Pause for a slow month, resume when you're streaming again.",
  },
];

const PRODUCT_SCHEMA = {
  name: "BGMI Livestream Thumbnail Templates",
  description: "High-CTR gaming livestream thumbnails. ₹150 single, ₹600 for 5 (₹120 each), ₹1500 for 15 (₹100 each).",
  image: "/assets/bgmi-thumbnail-creator1.jpg",
  price: "100",
  currency: "INR",
};

const PRICING_TIERS = [
  {
    badge: null,
    label: "Single",
    price: "₹150",
    unit: "/ thumbnail",
    sub: "One-off, no commitment.",
    features: [
      "1 thumbnail from any template",
      "Your photo + stream title swapped in",
      "Delivered in 3–4 working hours",
      "Pay per thumbnail",
    ],
    cta: "Order one",
    primary: false,
  },
  {
    badge: "Most popular",
    label: "Subscription · 5 / month",
    price: "₹600",
    unit: "/ month",
    sub: "Effective ₹120 per thumbnail. Save ₹150 vs. single.",
    features: [
      "5 thumbnails every month",
      "Pick one template, use it all month",
      "Same 3–4 hour express turnaround",
      "Priority WhatsApp queue",
      "Pause or cancel anytime",
    ],
    cta: "Start subscription",
    primary: true,
  },
  {
    badge: "Best value",
    label: "Pro · 15 / month",
    price: "₹1500",
    unit: "/ month",
    sub: "Effective ₹100 per thumbnail. Save ₹750 vs. single.",
    features: [
      "Up to 15 thumbnails every month",
      "Front-of-queue delivery",
      "Multiple templates if needed",
      "Pause or cancel anytime",
      "Best per-thumbnail rate we offer",
    ],
    cta: "Go pro",
    primary: false,
  },
];

export default function LiveTemplates() {
  const reduced = useReducedMotion();
  const [templates, setTemplates] = useState(FALLBACK_TEMPLATES);

  // Fetch admin-managed templates on mount; gracefully fall back to the
  // hardcoded defaults if the worker is unreachable or returns nothing.
  // The endpoint is edge-cached for 5 min so this is essentially free.
  useEffect(() => {
    let cancelled = false;
    fetch(`${AUTH_BASE}/api/live-templates`, { headers: { Accept: "application/json" } })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data || !Array.isArray(data.templates) || data.templates.length === 0) return;
        setTemplates(
          data.templates.map((t) => ({
            id: t.id,
            name: t.name || "",
            baseUrl: t.baseUrl, baseLabel: t.baseLabel || "Base",
            v1Url: t.v1Url,     v1Label:   t.v1Label   || "Variation 1",
            v2Url: t.v2Url,     v2Label:   t.v2Label   || "Variation 2",
          }))
        );
      })
      .catch(() => { /* keep fallback */ });
    return () => { cancelled = true; };
  }, []);

  return (
    <>
      <MetaTags
        title="BGMI Livestream Thumbnail Templates — from ₹100 each"
        description="High-CTR gaming livestream thumbnails. Single ₹150, 5/mo ₹600 (₹120 each), Pro 15/mo ₹1500 (₹100 each). Pick a template, send your photo, get it back in 3–4 hours."
        keywords="BGMI thumbnails, livestream thumbnails, gaming thumbnail templates, YouTube gaming, stream branding"
      />
      <ProductSchema product={PRODUCT_SCHEMA} />
      <FAQSchema faqs={FAQS} />

      {/* HERO */}
      <Section size="lg" className="relative pt-24 md:pt-32 pb-12 md:pb-16 overflow-hidden">
        {!reduced && <SpotlightSweep />}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center relative z-10">
          <div className="lg:col-span-7">
            <RevealOnScroll>
              <Kicker>BGMI · Live thumbnail templates</Kicker>
            </RevealOnScroll>
            <RevealOnScroll delay="80ms">
              <Display as="h1" size="xl" className="mt-3 mb-5">
                Templates that make your stream{" "}
                <span style={{ color: "var(--orange)" }}>look pro.</span>
              </Display>
            </RevealOnScroll>
            <RevealOnScroll delay="160ms">
              <Lede>
                One high-CTR template, your face every time. Viewers recognise you
                in their feed; your click-through climbs. From{" "}
                <strong style={{ color: "var(--text)" }}>₹100 a thumbnail</strong>{" "}
                on the 15-pack.
              </Lede>
            </RevealOnScroll>
            <RevealOnScroll delay="240ms">
              <div className="flex flex-wrap items-center gap-3 mt-6 md:mt-8">
                <a
                  href={WHATSAPP_HREF}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 md:px-6 py-3 md:py-4 rounded-full font-black text-sm md:text-base focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--orange)]"
                  style={{ background: "var(--orange)", color: "#fff", boxShadow: "0 10px 30px rgba(232,80,2,0.35)" }}
                >
                  <MessageCircle size={18} />
                  Start on WhatsApp
                  <ArrowRight size={16} />
                </a>
                <a
                  href="#pricing"
                  className="inline-flex items-center gap-2 px-5 py-3 md:py-4 rounded-full font-bold text-sm border hairline hover:bg-[var(--surface-alt)] focus-visible:ring-2 focus-visible:ring-[var(--orange)]"
                  style={{ color: "var(--text)" }}
                >
                  See pricing ↓
                </a>
              </div>
            </RevealOnScroll>
          </div>

          {/* Hero preview — quick before/after pair */}
          <div className="lg:col-span-5 w-full">
            <RevealOnScroll delay="200ms">
              <HairlineCard className="p-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-widest mb-1.5" style={{ color: "var(--text-muted)" }}>
                      Template
                    </div>
                    <Img
                      src={bgmiBase2}
                      webp={bgmiBase2Webp}
                      alt="Base template — empty creator slot"
                      className="w-full aspect-video object-cover rounded-lg"
                      loading="lazy"
                    />
                  </div>
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-widest mb-1.5" style={{ color: "var(--orange)" }}>
                      Your stream
                    </div>
                    <Img
                      src={bgmiCreator3}
                      webp={bgmiCreator3Webp}
                      alt="Customised — creator photo + name swapped in"
                      className="w-full aspect-video object-cover rounded-lg"
                      loading="lazy"
                    />
                  </div>
                </div>
              </HairlineCard>
            </RevealOnScroll>
          </div>
        </div>
      </Section>

      {/* HOW IT WORKS */}
      <Section size="lg" className="py-12 md:py-16">
        <RevealOnScroll>
          <Kicker>How it works</Kicker>
        </RevealOnScroll>
        <RevealOnScroll delay="80ms">
          <Display as="h2" size="lg" className="mt-3 mb-8 md:mb-10">
            Three steps. Same day delivery.
          </Display>
        </RevealOnScroll>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <RevealOnScroll key={s.title} delay={`${i * 80}ms`}>
                <HairlineCard className="p-5 md:p-6 h-full">
                  <div
                    className="w-10 h-10 rounded-xl grid place-items-center mb-4"
                    style={{ background: "var(--orange-soft)", color: "var(--orange)" }}
                  >
                    <Icon size={18} />
                  </div>
                  <div className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>
                    Step {i + 1}
                  </div>
                  <h3 className="font-black text-lg mb-2" style={{ color: "var(--text)" }}>{s.title}</h3>
                  <p className="text-sm" style={{ color: "var(--text-muted)" }}>{s.body}</p>
                </HairlineCard>
              </RevealOnScroll>
            );
          })}
        </div>
      </Section>

      {/* TEMPLATE SLIDERS — the signature comparison feature */}
      <Section size="lg" className="py-12 md:py-16">
        <RevealOnScroll>
          <Kicker>The work</Kicker>
        </RevealOnScroll>
        <RevealOnScroll delay="80ms">
          <Display as="h2" size="lg" className="mt-3 mb-3">
            Same template, different creators.
          </Display>
        </RevealOnScroll>
        <RevealOnScroll delay="160ms">
          <Lede className="mb-8 md:mb-10">
            Drag the orange handles to compare the empty <strong>Base</strong>{" "}
            against two real creator deliveries. The composition stays — your
            face, name and the highlight text change.
          </Lede>
        </RevealOnScroll>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
          {templates.map((t, i) => (
            <RevealOnScroll key={t.id || i} delay={`${(i % 2) * 80}ms`}>
              <HairlineCard className="p-3 md:p-4">
                {t.name && (
                  <div className="px-1 pb-3 flex items-center justify-between">
                    <span className="text-sm font-black" style={{ color: "var(--text)" }}>{t.name}</span>
                    <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: "var(--orange)" }}>Live</span>
                  </div>
                )}
                <TripleBeforeAfterSlider
                  base={t.baseUrl}      baseLabel={t.baseLabel}
                  v1={t.v1Url}          v1Label={t.v1Label}
                  v2={t.v2Url}          v2Label={t.v2Label}
                />
              </HairlineCard>
            </RevealOnScroll>
          ))}
        </div>
      </Section>

      {/* PRICING — 3 tiers, middle highlighted */}
      <Section size="lg" id="pricing" className="py-12 md:py-16 scroll-mt-24">
        <RevealOnScroll>
          <Kicker>Pricing</Kicker>
        </RevealOnScroll>
        <RevealOnScroll delay="80ms">
          <Display as="h2" size="lg" className="mt-3 mb-3">
            Pay once or save big monthly.
          </Display>
        </RevealOnScroll>
        <RevealOnScroll delay="160ms">
          <Lede className="mb-10 md:mb-12">
            The more you commit, the cheaper each thumbnail gets. Most active
            streamers pick the 5/month subscription — the sweet spot.
          </Lede>
        </RevealOnScroll>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6 items-stretch">
          {PRICING_TIERS.map((tier, i) => (
            <RevealOnScroll key={tier.label} delay={`${i * 80}ms`}>
              <div
                className={`relative h-full rounded-2xl border p-5 md:p-6 flex flex-col ${tier.primary ? "md:scale-[1.04] md:shadow-2xl" : ""}`}
                style={{
                  background: tier.primary ? "linear-gradient(180deg, rgba(232,80,2,0.10), var(--surface))" : "var(--surface)",
                  borderColor: tier.primary ? "var(--orange)" : "var(--border)",
                  boxShadow: tier.primary ? "0 18px 40px rgba(232,80,2,0.18)" : undefined,
                }}
              >
                {tier.badge && (
                  <span
                    className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap"
                    style={{
                      background: tier.primary ? "var(--orange)" : "var(--surface-alt)",
                      color: tier.primary ? "#fff" : "var(--text)",
                      border: tier.primary ? "none" : "1px solid var(--border)",
                    }}
                  >
                    {tier.badge}
                  </span>
                )}
                <div className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: tier.primary ? "var(--orange)" : "var(--text-muted)" }}>
                  {tier.label}
                </div>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-4xl md:text-5xl font-black" style={{ color: "var(--text)" }}>{tier.price}</span>
                  <span className="text-sm" style={{ color: "var(--text-muted)" }}>{tier.unit}</span>
                </div>
                <p className="text-xs mb-6" style={{ color: tier.primary ? "var(--text)" : "var(--text-muted)" }}>
                  {tier.sub}
                </p>
                <ul className="space-y-2.5 text-sm flex-1" style={{ color: "var(--text)" }}>
                  {tier.features.map((line) => (
                    <li key={line} className="flex items-start gap-2">
                      <Check size={14} className="mt-1 shrink-0" style={{ color: "var(--orange)" }} />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
                <a
                  href={WHATSAPP_HREF}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`mt-6 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full text-sm focus-visible:ring-2 focus-visible:ring-[var(--orange)] ${tier.primary ? "font-black" : "font-bold border hairline hover:bg-[var(--surface-alt)]"}`}
                  style={tier.primary
                    ? { background: "var(--orange)", color: "#fff", boxShadow: "0 10px 30px rgba(232,80,2,0.35)" }
                    : { color: "var(--text)" }
                  }
                >
                  {tier.cta}
                  <ArrowRight size={14} />
                </a>
              </div>
            </RevealOnScroll>
          ))}
        </div>

        <p className="text-xs text-center mt-8" style={{ color: "var(--text-muted)" }}>
          All prices in INR. Subscription pauses + cancels via WhatsApp anytime.
        </p>
      </Section>

      {/* FAQ */}
      <Section size="lg" className="py-12 md:py-16">
        <RevealOnScroll>
          <Kicker>FAQ</Kicker>
        </RevealOnScroll>
        <RevealOnScroll delay="80ms">
          <Display as="h2" size="lg" className="mt-3 mb-8 md:mb-10">Quick answers.</Display>
        </RevealOnScroll>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl">
          {FAQS.map((f, i) => (
            <RevealOnScroll key={f.question} delay={`${(i % 2) * 80}ms`}>
              <HairlineCard className="p-5 md:p-6 h-full">
                <h3 className="font-black mb-2" style={{ color: "var(--text)" }}>{f.question}</h3>
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>{f.answer}</p>
              </HairlineCard>
            </RevealOnScroll>
          ))}
        </div>
      </Section>

      {/* FINAL CTA */}
      <Section size="lg" className="py-16 md:py-20">
        <RevealOnScroll>
          <HairlineCard className="p-6 md:p-12 text-center" style={{ borderColor: "var(--orange)" }}>
            <div
              className="w-12 h-12 mx-auto rounded-2xl grid place-items-center mb-5"
              style={{ background: "var(--orange-soft)", color: "var(--orange)" }}
            >
              <ShieldCheck size={24} />
            </div>
            <Display as="h2" size="md" className="mb-3">
              Ready to look pro on every stream?
            </Display>
            <p className="text-base mb-6 max-w-xl mx-auto" style={{ color: "var(--text-muted)" }}>
              Start on WhatsApp — we'll send back a sample with your photo before
              you pay anything.
            </p>
            <a
              href={WHATSAPP_HREF}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-4 rounded-full font-black text-base focus-visible:ring-2 focus-visible:ring-[var(--orange)]"
              style={{ background: "var(--orange)", color: "#fff", boxShadow: "0 10px 30px rgba(232,80,2,0.35)" }}
            >
              <MessageCircle size={18} />
              Start on WhatsApp
              <ArrowRight size={16} />
            </a>
          </HairlineCard>
        </RevealOnScroll>
      </Section>
    </>
  );
}
