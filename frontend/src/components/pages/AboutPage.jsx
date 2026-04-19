/**
 * AboutPage — redesign v2.
 * Route: /about
 *
 * Editorial hero + studio values + founder note, then the existing
 * ProcessSection / MediaMentions / NewsletterSignup strips that were wired
 * into the old page (kept working to avoid regressing content hooks).
 */
import React from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Compass, Zap, Shield, Sparkles } from "lucide-react";
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
  NumberTickIn,
} from "../../design";

const ProcessSection = React.lazy(() => import("../ProcessSection"));
const MediaMentions = React.lazy(() => import("../MediaMentions"));
const NewsletterSignup = React.lazy(() => import("../NewsletterSignup"));

const VALUES = [
  {
    icon: Compass,
    title: "Made for outcomes",
    body:
      "Every deliverable has a number attached — watch time, CTR, shares, inquiries. We track it, we share it, we iterate on it.",
  },
  {
    icon: Zap,
    title: "Studio pace",
    body:
      "Long-form in under 10 days. Shorts in 48 h. Thumbnails in 24 h. No ghosting, no mystery weeks. You always know the ETA.",
  },
  {
    icon: Shield,
    title: "Craft above trend",
    body:
      "Trends expire. Foundations don't. We build brand systems, shot discipline, and typographic rigour that age well.",
  },
  {
    icon: Sparkles,
    title: "AI is a tool, not a replacement",
    body:
      "We use AI where it saves a human hour of grunt work. Creative judgement, client relationship, and taste stay human.",
  },
];

export default function AboutPage() {
  return (
    <ErrorBoundary>
      <div className="min-h-svh bg-[var(--surface)] relative">
        <MetaTags
          title="About Us - Shinel Studios | AI-First Creative Studio"
          description="Learn how Shinel Studios combines human craft with AI speed to deliver high-performance content for creators and brands."
          keywords="about shinel studios, creative process, AI video editing, content strategy"
        />
        <BreadcrumbSchema
          items={[
            { name: "Home", url: "/" },
            { name: "About", url: "/about" },
          ]}
        />

        <GrainOverlay />

        {/* Hero */}
        <Section size="lg" className="pt-24 md:pt-32">
          <div className="grid md:grid-cols-[1.4fr_1fr] gap-10 md:gap-16 items-end">
            <div>
              <RevealOnScroll>
                <Kicker className="mb-6">About Shinel Studios</Kicker>
              </RevealOnScroll>
              <RevealOnScroll delay="80ms">
                <Display as="h1" size="xl" className="mb-6">
                  We build{" "}
                  <span style={{ color: "var(--orange)" }}>engines</span><br />
                  for growth.
                </Display>
              </RevealOnScroll>
              <RevealOnScroll delay="160ms">
                <Lede className="mb-8">
                  Shinel Studios is a post-production house for creators and brands
                  who refuse to choose between craft and speed. We edit videos,
                  design thumbnails, ship graphic systems, and strategise channels —
                  end-to-end, with real humans on every file.
                </Lede>
              </RevealOnScroll>
              <RevealOnScroll delay="240ms">
                <div className="flex flex-wrap gap-3">
                  <Link to="/work" className="btn-editorial">
                    See the work <ArrowUpRight size={14} />
                  </Link>
                  <Link to="/#contact" className="btn-editorial-ghost">
                    Start a project
                  </Link>
                </div>
              </RevealOnScroll>
            </div>

            <RevealOnScroll delay="240ms">
              <HairlineCard className="p-6 md:p-8">
                <Eyebrow className="mb-4">In numbers</Eyebrow>
                <div className="space-y-4">
                  <StatRow
                    label="Views delivered"
                    value={<NumberTickIn to={100} suffix="M+" />}
                  />
                  <StatRow
                    label="Creators served"
                    value={<NumberTickIn to={150} suffix="+" />}
                  />
                  <StatRow
                    label="Videos polished"
                    value={<NumberTickIn to={5000} suffix="+" formatter="compact" />}
                  />
                  <StatRow label="Reply time" value="under 24 h" />
                </div>
              </HairlineCard>
            </RevealOnScroll>
          </div>
        </Section>

        {/* Values */}
        <Section size="lg" tone="alt" hairlineTop>
          <div className="max-w-3xl mb-12">
            <RevealOnScroll>
              <Eyebrow className="mb-3">What we care about</Eyebrow>
            </RevealOnScroll>
            <RevealOnScroll delay="80ms">
              <Display size="md" className="mb-4">
                Four rules every project follows — no exceptions.
              </Display>
            </RevealOnScroll>
            <RevealOnScroll delay="160ms">
              <Lede>
                We've built Shinel the way we wished an agency had existed when we
                were creators ourselves. These aren't slogans — they're how we say no
                to work that doesn't fit.
              </Lede>
            </RevealOnScroll>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {VALUES.map((v, i) => (
              <RevealOnScroll key={v.title} delay={`${(i % 2) * 80}ms`}>
                <HairlineCard tone="surface" className="p-6 md:p-8 h-full">
                  <div
                    className="w-11 h-11 rounded-xl hairline grid place-items-center mb-5"
                    style={{ background: "var(--orange-soft)" }}
                  >
                    <v.icon size={18} style={{ color: "var(--orange)" }} />
                  </div>
                  <Display size="sm" className="mb-2">
                    {v.title}
                  </Display>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {v.body}
                  </p>
                </HairlineCard>
              </RevealOnScroll>
            ))}
          </div>
        </Section>

        {/* Founder note */}
        <Section size="lg" hairlineTop>
          <div className="grid md:grid-cols-[1fr_1.5fr] gap-10 md:gap-16">
            <RevealOnScroll>
              <div>
                <Eyebrow className="mb-3">Founder note</Eyebrow>
                <Display size="md" className="mb-4">
                  "We ship like we're the client."
                </Display>
              </div>
            </RevealOnScroll>
            <RevealOnScroll delay="80ms">
              <div className="space-y-4 text-base md:text-lg leading-relaxed" style={{ color: "var(--text-muted)" }}>
                <p>
                  Most agencies treat the brief as a one-way handoff. We treat it like
                  a conversation. Every week you get a milestone, every drop you get a
                  read-out of how it performed in the first 7 days, and every quarter
                  we sit down and ask whether we're building the right channel for you.
                </p>
                <p>
                  The makers on this site are named, visible, and reachable. That's
                  deliberate. The people editing your videos aren't anonymous
                  contractors — they're collaborators with their own portfolios,
                  their own taste, their own incentive to make your channel win.
                </p>
                <p style={{ color: "var(--text)" }}>
                  — Shinel Studios team
                </p>
              </div>
            </RevealOnScroll>
          </div>
        </Section>

        {/* Process Section — existing integrated strip kept */}
        <ErrorBoundary fallback={<SectionSkeleton content="processStep" contentCount={4} />}>
          <React.Suspense fallback={<SectionSkeleton content="processStep" contentCount={4} />}>
            <ProcessSection />
          </React.Suspense>
        </ErrorBoundary>

        {/* Media Mentions — existing */}
        <ErrorBoundary>
          <React.Suspense fallback={<SectionSkeleton content="card" contentCount={4} />}>
            <MediaMentions />
          </React.Suspense>
        </ErrorBoundary>

        {/* Closing CTA */}
        <Section size="md" tone="ink" hairlineTop>
          <div className="max-w-3xl">
            <Eyebrow className="mb-4" style={{ color: "rgba(255,255,255,0.6)" }}>Start today</Eyebrow>
            <Display size="lg" as="h2" className="mb-6" style={{ color: "var(--paper)" }}>
              Send us the brief. We'll reply with scope and a named editor before your next meeting.
            </Display>
            <div className="flex flex-wrap gap-3">
              <Link to="/#contact" className="btn-editorial">
                Start a project <ArrowUpRight size={14} />
              </Link>
              <Link
                to="/work"
                className="btn-editorial-ghost"
                style={{ color: "var(--paper)", borderColor: "rgba(255,255,255,0.25)" }}
              >
                Explore recent work
              </Link>
            </div>
          </div>
        </Section>

        {/* Newsletter — existing */}
        <ErrorBoundary>
          <React.Suspense fallback={<SectionSkeleton content="card" contentCount={1} />}>
            <NewsletterSignup />
          </React.Suspense>
        </ErrorBoundary>
      </div>
    </ErrorBoundary>
  );
}

function StatRow({ label, value }) {
  return (
    <div className="flex items-baseline justify-between hairline-b pb-3 last:border-b-0 last:pb-0">
      <span className="text-eyebrow">{label}</span>
      <span className="text-display-sm">{value}</span>
    </div>
  );
}
