/**
 * FAQPage — redesign v2.
 * Route: /faq
 *
 * Editorial hero + quick-answer cards for the most-asked questions,
 * then the existing FAQSection for the long form, and a closing contact band.
 */
import React from "react";
import { Link } from "react-router-dom";
import { HelpCircle, MessageCircle, Clock, Shield, ArrowUpRight } from "lucide-react";
import MetaTags, { BreadcrumbSchema } from "../MetaTags";
import { SectionSkeleton } from "../SkeletonLoader";
import ErrorBoundary from "../ErrorBoundary";
import {
  Section,
  Kicker,
  Eyebrow,
  Display,
  Lede,
  HairlineCard,
  RevealOnScroll,
  GrainOverlay,
} from "../../design";

const FAQSection = React.lazy(() => import("../FAQSection"));
const ContactCTA = React.lazy(() => import("../ContactCTA"));

const QUICK_ANSWERS = [
  {
    icon: Clock,
    q: "How fast is turnaround?",
    a: "Thumbnails 24–48 h. Shorts 48–72 h. Long-form 5–10 days. Graphic packs 3–5 days. Every quote names a firm deadline.",
  },
  {
    icon: Shield,
    q: "Who owns the final files?",
    a: "You do. We hand over source files, SVGs, PDFs, and archival MP4s. We keep a copy for a year so you can request re-exports free.",
  },
  {
    icon: MessageCircle,
    q: "How do revisions work?",
    a: "Two structured rounds per deliverable included. Feedback goes in a shared Frame.io / Google Drive thread — no WhatsApp ping-pong.",
  },
  {
    icon: HelpCircle,
    q: "Can I pick my editor?",
    a: "Yes. Every project names the editor or artist upfront. You can request a specific maker if you've seen their portfolio.",
  },
];

export default function FAQPage() {
  return (
    <ErrorBoundary>
      <div className="min-h-svh bg-[var(--surface)] relative">
        <MetaTags
          title="FAQ - Shinel Studios | Common Questions About Our Services"
          description="Find answers to common questions about our video editing, thumbnail design, and growth services. Turnaround times, pricing, revisions, ownership."
          keywords="shinel studios faq, video editing cost, thumbnail design process, creator growth"
        />
        <BreadcrumbSchema
          items={[
            { name: "Home", url: "/" },
            { name: "FAQ", url: "/faq" },
          ]}
        />

        <GrainOverlay />

        {/* Hero */}
        <Section size="lg" className="pt-24 md:pt-32">
          <div className="max-w-3xl">
            <RevealOnScroll>
              <Kicker className="mb-6">Help · FAQ</Kicker>
            </RevealOnScroll>
            <RevealOnScroll delay="80ms">
              <Display as="h1" size="xl" className="mb-6">
                Straight answers, <span style={{ color: "var(--orange)" }}>no marketing speak.</span>
              </Display>
            </RevealOnScroll>
            <RevealOnScroll delay="160ms">
              <Lede>
                The questions we get most often — turnaround, ownership, revisions,
                pricing — answered plainly. If yours isn't here, WhatsApp us and
                we'll reply inside 24 h.
              </Lede>
            </RevealOnScroll>
          </div>
        </Section>

        {/* Quick answers */}
        <Section size="md" hairlineTop>
          <div className="mb-10">
            <Eyebrow className="mb-3">Top four</Eyebrow>
            <Display size="md">The ones everyone asks first.</Display>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {QUICK_ANSWERS.map((qa, i) => (
              <RevealOnScroll key={qa.q} delay={`${(i % 2) * 80}ms`}>
                <HairlineCard className="p-6 md:p-7 h-full">
                  <div className="flex items-start gap-4">
                    <div
                      className="w-10 h-10 rounded-xl hairline grid place-items-center shrink-0 mt-0.5"
                      style={{ background: "var(--orange-soft)" }}
                    >
                      <qa.icon size={16} style={{ color: "var(--orange)" }} />
                    </div>
                    <div>
                      <div className="text-display-sm mb-2">{qa.q}</div>
                      <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
                        {qa.a}
                      </p>
                    </div>
                  </div>
                </HairlineCard>
              </RevealOnScroll>
            ))}
          </div>
        </Section>

        {/* Existing detailed FAQ accordion */}
        <Section size="lg" tone="alt" hairlineTop>
          <div className="mb-10">
            <Eyebrow className="mb-3">Everything else</Eyebrow>
            <Display size="md">Every question, long form.</Display>
          </div>
          <ErrorBoundary fallback={<SectionSkeleton content="accordion" contentCount={6} />}>
            <React.Suspense fallback={<SectionSkeleton content="accordion" contentCount={6} />}>
              <FAQSection />
            </React.Suspense>
          </ErrorBoundary>
        </Section>

        {/* Still-have-questions band */}
        <Section size="md" tone="ink" hairlineTop>
          <div className="grid md:grid-cols-[1.3fr_1fr] gap-10 items-end">
            <div>
              <Eyebrow className="mb-3" style={{ color: "rgba(255,255,255,0.6)" }}>
                Still stuck?
              </Eyebrow>
              <Display size="lg" as="h2" className="mb-4" style={{ color: "var(--paper)" }}>
                WhatsApp us — we're real humans and we reply fast.
              </Display>
              <p className="max-w-xl" style={{ color: "rgba(255,255,255,0.65)" }}>
                Share the context and we'll come back with a clear yes, no, or a
                scope estimate. No sales calls required.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 md:justify-end">
              <Link to="/#contact" className="btn-editorial">
                Start a project <ArrowUpRight size={14} />
              </Link>
            </div>
          </div>

          <div className="mt-10">
            <React.Suspense fallback={<SectionSkeleton content="card" contentCount={1} />}>
              <ContactCTA />
            </React.Suspense>
          </div>
        </Section>
      </div>
    </ErrorBoundary>
  );
}
