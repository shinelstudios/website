/**
 * LiveTemplates — direct-URL only (no nav link).
 *
 * One-page landing for the BGMI livestream-thumbnail subscription product.
 * Two pricing models: ₹120/express (one-off, 3–4 hr swap) and ₹500/mo
 * subscription (5–15 thumbnails/month from a high-CTR template).
 *
 * Refreshed 2026-04-26 to use the editorial design system (Section /
 * Kicker / Display / Lede / HairlineCard / Img). Old version was 1816
 * lines of duplicated bespoke markup.
 *
 * Per business policy, this URL must NEVER be linked from site nav. Tracked
 * in the admin "Hidden landing pages" registry at /dashboard/landing-pages.
 */
import React from "react";
import { ArrowRight, Sparkles, Zap, Repeat, ShieldCheck, MessageCircle } from "lucide-react";
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

import bgmiCreator1 from "@/assets/bgmi-thumbnail-creator1.jpg";
import bgmiCreator1Webp from "@/assets/bgmi-thumbnail-creator1.webp";
import bgmiCreator2 from "@/assets/bgmi-thumbnail-creator2.jpg";
import bgmiCreator2Webp from "@/assets/bgmi-thumbnail-creator2.webp";
import bgmiBase2 from "@/assets/bgmi-thumbnail-base2.jpg";
import bgmiBase2Webp from "@/assets/bgmi-thumbnail-base2.webp";
import bgmiCreator3 from "@/assets/bgmi-thumbnail-creator3.jpg";
import bgmiCreator3Webp from "@/assets/bgmi-thumbnail-creator3.webp";
import bgmiCreator4 from "@/assets/bgmi-thumbnail-creator4.jpg";
import bgmiCreator4Webp from "@/assets/bgmi-thumbnail-creator4.webp";

const WHATSAPP_HREF = "https://wa.me/918968141585?text=Hi%20Shinel%20%E2%80%94%20I%27d%20like%20a%20BGMI%20livestream%20thumbnail";

const TEMPLATES = [
  { creator: bgmiCreator1, creatorWebp: bgmiCreator1Webp, name: "BGMI Series A" },
  { creator: bgmiCreator2, creatorWebp: bgmiCreator2Webp, name: "BGMI Series A" },
  { creator: bgmiCreator3, creatorWebp: bgmiCreator3Webp, name: "BGMI Series B" },
  { creator: bgmiCreator4, creatorWebp: bgmiCreator4Webp, name: "BGMI Series B" },
];

const STEPS = [
  { icon: Sparkles, title: "Pick a template", body: "Browse our high-CTR BGMI templates. One winner is all you need." },
  { icon: Zap, title: "Send your photo + name", body: "We swap in your face and handle. Same composition, your branding." },
  { icon: Repeat, title: "Get it back in 3–4 hours", body: "Express delivery. Subscribers get 5–15 swaps every month." },
];

const FAQS = [
  {
    question: "How fast is express delivery?",
    answer: "3–4 hours from when you send us your photo and stream title. We work IST 10am–10pm. Orders after 9pm ship next morning.",
  },
  {
    question: "What's included in the ₹500/mo subscription?",
    answer: "5–15 thumbnails per month using your chosen template. Pause anytime, no contract. Same composition every stream — that's the point.",
  },
  {
    question: "Can I request a fresh template design?",
    answer: "Yes — that's a separate engagement. Reach out on WhatsApp and we'll quote you a custom template. Most creators are best served by our existing winners.",
  },
  {
    question: "Why one template over many?",
    answer: "Channel consistency. Viewers recognise you in their feed faster, your CTR climbs, the algorithm rewards it. The whole product is built around this insight.",
  },
];

const PRODUCT_SCHEMA = {
  name: "BGMI Livestream Thumbnail Templates",
  description: "High-CTR gaming livestream thumbnails on subscription. ₹120 express or ₹500/mo for 5–15 swaps.",
  image: "/assets/bgmi-thumbnail-creator1.jpg",
  price: "120",
  currency: "INR",
};

export default function LiveTemplates() {
  const reduced = useReducedMotion();

  return (
    <>
      <MetaTags
        title="BGMI Livestream Thumbnail Templates — ₹120 express or ₹500/mo"
        description="High-CTR gaming livestream thumbnails on subscription. Pick a template, send your photo, get it back in 3–4 hours. From ₹120 or ₹500/mo for 5–15 thumbnails."
        keywords="BGMI thumbnails, livestream thumbnails, gaming thumbnail templates, YouTube gaming, stream branding"
      />
      <ProductSchema product={PRODUCT_SCHEMA} />
      <FAQSchema faqs={FAQS} />

      {/* HERO */}
      <Section size="lg" className="relative pt-24 md:pt-32 pb-16 overflow-hidden">
        {!reduced && <SpotlightSweep />}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center relative z-10">
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
                in their feed; your click-through climbs. From ₹120 express or
                ₹500/mo for 5–15 swaps.
              </Lede>
            </RevealOnScroll>
            <RevealOnScroll delay="240ms">
              <div className="flex flex-wrap items-center gap-3 mt-8">
                <a
                  href={WHATSAPP_HREF}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-4 rounded-full font-black text-base focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--orange)]"
                  style={{ background: "var(--orange)", color: "#fff", boxShadow: "0 10px 30px rgba(232,80,2,0.35)" }}
                >
                  <MessageCircle size={18} />
                  Start on WhatsApp
                  <ArrowRight size={16} />
                </a>
                <a
                  href="#pricing"
                  className="inline-flex items-center gap-2 px-5 py-4 rounded-full font-bold text-sm border hairline hover:bg-[var(--surface-alt)] focus-visible:ring-2 focus-visible:ring-[var(--orange)]"
                  style={{ color: "var(--text)" }}
                >
                  See pricing ↓
                </a>
              </div>
            </RevealOnScroll>
          </div>

          {/* Hero preview — single before/after */}
          <div className="lg:col-span-5">
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
      <Section size="lg" className="py-16">
        <RevealOnScroll>
          <Kicker>How it works</Kicker>
        </RevealOnScroll>
        <RevealOnScroll delay="80ms">
          <Display as="h2" size="lg" className="mt-3 mb-10">
            Three steps. Same day delivery.
          </Display>
        </RevealOnScroll>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <RevealOnScroll key={s.title} delay={`${i * 80}ms`}>
                <HairlineCard className="p-6 h-full">
                  <div
                    className="w-10 h-10 rounded-xl grid place-items-center mb-4"
                    style={{ background: "var(--orange-soft)", color: "var(--orange)" }}
                  >
                    <Icon size={18} />
                  </div>
                  <div className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>
                    Step {i + 1}
                  </div>
                  <h3 className="font-black text-lg mb-2" style={{ color: "var(--text)" }}>
                    {s.title}
                  </h3>
                  <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                    {s.body}
                  </p>
                </HairlineCard>
              </RevealOnScroll>
            );
          })}
        </div>
      </Section>

      {/* TEMPLATE GRID */}
      <Section size="lg" className="py-16">
        <RevealOnScroll>
          <Kicker>Recent work</Kicker>
        </RevealOnScroll>
        <RevealOnScroll delay="80ms">
          <Display as="h2" size="lg" className="mt-3 mb-3">
            Same template, different creators.
          </Display>
        </RevealOnScroll>
        <RevealOnScroll delay="160ms">
          <Lede className="mb-10">
            Two of our most-used BGMI templates, swapped for four different
            streamers. The composition stays — your face, name and the highlight
            text change.
          </Lede>
        </RevealOnScroll>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {TEMPLATES.map((t, i) => (
            <RevealOnScroll key={i} delay={`${(i % 2) * 80}ms`}>
              <HairlineCard className="p-2">
                <Img
                  src={t.creator}
                  webp={t.creatorWebp}
                  alt={`${t.name} — creator example ${i + 1}`}
                  className="w-full aspect-video object-cover rounded-lg"
                  loading="lazy"
                />
                <div className="px-2 py-2 flex items-center justify-between">
                  <span className="text-xs font-bold" style={{ color: "var(--text)" }}>
                    {t.name}
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                    Live
                  </span>
                </div>
              </HairlineCard>
            </RevealOnScroll>
          ))}
        </div>
      </Section>

      {/* PRICING */}
      <Section size="lg" id="pricing" className="py-16 scroll-mt-24">
        <RevealOnScroll>
          <Kicker>Pricing</Kicker>
        </RevealOnScroll>
        <RevealOnScroll delay="80ms">
          <Display as="h2" size="lg" className="mt-3 mb-3">
            Pay once or stay on subscription.
          </Display>
        </RevealOnScroll>
        <RevealOnScroll delay="160ms">
          <Lede className="mb-10">
            Most active streamers save more on the monthly. One-off works if
            you stream less than 4× a month.
          </Lede>
        </RevealOnScroll>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-4xl">
          {/* Express */}
          <RevealOnScroll>
            <HairlineCard className="p-7 h-full flex flex-col">
              <div className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>
                Express
              </div>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-4xl font-black" style={{ color: "var(--text)" }}>
                  ₹120
                </span>
                <span className="text-sm" style={{ color: "var(--text-muted)" }}>
                  / thumbnail
                </span>
              </div>
              <p className="text-xs mb-6" style={{ color: "var(--text-muted)" }}>
                One-off delivery in 3–4 hours.
              </p>
              <ul className="space-y-2 text-sm flex-1" style={{ color: "var(--text)" }}>
                {[
                  "1 thumbnail from any existing template",
                  "Your photo + stream title swapped in",
                  "Delivered in 3–4 working hours",
                  "Pay per thumbnail, no commitment",
                ].map((line) => (
                  <li key={line} className="flex items-start gap-2">
                    <span className="mt-1 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "var(--orange)" }} />
                    {line}
                  </li>
                ))}
              </ul>
              <a
                href={WHATSAPP_HREF}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full font-bold text-sm border hairline hover:bg-[var(--surface-alt)] focus-visible:ring-2 focus-visible:ring-[var(--orange)]"
                style={{ color: "var(--text)" }}
              >
                Order one
                <ArrowRight size={14} />
              </a>
            </HairlineCard>
          </RevealOnScroll>

          {/* Subscription */}
          <RevealOnScroll delay="80ms">
            <HairlineCard
              className="p-7 h-full flex flex-col relative"
              style={{ borderColor: "var(--orange)" }}
            >
              <span
                className="absolute -top-3 left-7 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest"
                style={{ background: "var(--orange)", color: "#fff" }}
              >
                Most popular
              </span>
              <div className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: "var(--orange)" }}>
                Subscription
              </div>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-4xl font-black" style={{ color: "var(--text)" }}>
                  ₹500
                </span>
                <span className="text-sm" style={{ color: "var(--text-muted)" }}>
                  / month
                </span>
              </div>
              <p className="text-xs mb-6" style={{ color: "var(--text-muted)" }}>
                5–15 thumbnails per month. Effective rate: ₹33–₹100.
              </p>
              <ul className="space-y-2 text-sm flex-1" style={{ color: "var(--text)" }}>
                {[
                  "Up to 15 thumbnails per month",
                  "Pick one template, use it all month",
                  "Same 3–4 hour express turnaround",
                  "Pause or cancel anytime",
                  "Priority WhatsApp queue",
                ].map((line) => (
                  <li key={line} className="flex items-start gap-2">
                    <span className="mt-1 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "var(--orange)" }} />
                    {line}
                  </li>
                ))}
              </ul>
              <a
                href={WHATSAPP_HREF}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full font-black text-sm focus-visible:ring-2 focus-visible:ring-[var(--orange)]"
                style={{ background: "var(--orange)", color: "#fff", boxShadow: "0 10px 30px rgba(232,80,2,0.35)" }}
              >
                Start subscription
                <ArrowRight size={14} />
              </a>
            </HairlineCard>
          </RevealOnScroll>
        </div>
      </Section>

      {/* FAQ */}
      <Section size="lg" className="py-16">
        <RevealOnScroll>
          <Kicker>FAQ</Kicker>
        </RevealOnScroll>
        <RevealOnScroll delay="80ms">
          <Display as="h2" size="lg" className="mt-3 mb-10">
            Quick answers.
          </Display>
        </RevealOnScroll>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl">
          {FAQS.map((f, i) => (
            <RevealOnScroll key={f.question} delay={`${(i % 2) * 80}ms`}>
              <HairlineCard className="p-6 h-full">
                <h3 className="font-black mb-2" style={{ color: "var(--text)" }}>
                  {f.question}
                </h3>
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                  {f.answer}
                </p>
              </HairlineCard>
            </RevealOnScroll>
          ))}
        </div>
      </Section>

      {/* FINAL CTA */}
      <Section size="lg" className="py-20">
        <RevealOnScroll>
          <HairlineCard className="p-8 md:p-12 text-center" style={{ borderColor: "var(--orange)" }}>
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
