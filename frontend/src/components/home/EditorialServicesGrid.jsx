/**
 * EditorialServicesGrid — replaces the legacy ServicesSection with a clean
 * editorial grid. 8 services in HairlineCards, design-token typography,
 * RevealOnScroll stagger. Embeds ServiceSchema for rich SERP results.
 */
import React from "react";
import { Link } from "react-router-dom";
import {
  Image as IconImage, Play, Zap, Wand2, PenTool, Megaphone, Bot,
  ArrowUpRight,
} from "lucide-react";
import {
  Section, Kicker, Display, Lede, HairlineCard, RevealOnScroll,
} from "../../design";
import { ServiceSchema } from "../MetaTags.jsx";

const SERVICES = [
  {
    Icon: IconImage,
    title: "AI Thumbnail Design",
    outcome: "Concept + layout exploration that lifts CTR.",
    proof: "Multivariate iterations · A/B-ready exports",
    path: "/thumbnails",
    description: "Multi-variant thumbnail design with AI-assisted concept generation and brand-consistent exports.",
  },
  {
    Icon: Play,
    title: "Retention-Led Editing",
    outcome: "Style-matched cuts and pacing that hold attention.",
    proof: "Kamz Inkzone (173k): +38% avg view duration in 30 days",
    path: "/video-editing",
    description: "Long-form video editing tuned for YouTube retention with hook optimization and pacing analysis.",
  },
  {
    Icon: Zap,
    title: "Shorts Production",
    outcome: "Hook-first highlights, auto-captions, meme timing.",
    proof: "Manav: +9.4k subs from Shorts in Q2",
    path: "/shorts",
    description: "YouTube Shorts and Instagram Reels production with hook-first structure and platform optimization.",
  },
  {
    Icon: Wand2,
    title: "Transcripts & Captions",
    outcome: "Auto transcripts with on-brand subtitle styling.",
    proof: "99% accuracy · Brand-matched · Higher retention",
    path: "/tools/srt",
    description: "Automatic transcription and styled captions for video accessibility and retention.",
  },
  {
    Icon: PenTool,
    title: "Script Drafts & Research",
    outcome: "AI outlines + beat sheets, finished by humans.",
    proof: "Hook retention +18% in A/B tests (first 8 s)",
    path: "/tools/seo",
    description: "Video script research, outlines, and beat sheets with AI-assisted drafting.",
  },
  {
    Icon: Wand2,
    title: "Face-Safe Swap & Cleanup",
    outcome: "Consent-first face replacement and object removal.",
    proof: "Creator-approved · Review-gated workflow",
    path: "/video-editing",
    description: "Consent-based face replacement, object removal, and visual cleanup with creator approval workflow.",
  },
  {
    Icon: Megaphone,
    title: "Voice Generation & Cleanup",
    outcome: "Natural pickups, noise cleanup, alt takes.",
    proof: "Consent-first cloning · Policy compliant",
    path: "/video-editing",
    description: "Voice cleanup, noise reduction, and consent-based voice generation for video pickups.",
  },
  {
    Icon: Bot,
    title: "Workflow Automations & SEO",
    outcome: "Auto-posting, asset handoff, titles, tags, descriptions.",
    proof: "+27% browse/search traffic after metadata revamp",
    path: "/tools/seo",
    description: "YouTube SEO, metadata optimization, and workflow automation for content delivery.",
  },
];

export default function EditorialServicesGrid() {
  return (
    <Section size="lg" id="services" tone="surface-alt" hairlineTop>
      {/* Schema.org per service for SERP rich results */}
      <ServiceSchema services={SERVICES.map((s) => ({ name: s.title, description: s.description }))} />

      <div className="max-w-3xl mb-12">
        <RevealOnScroll>
          <Kicker className="mb-3">What we ship</Kicker>
        </RevealOnScroll>
        <RevealOnScroll delay="80ms">
          <Display size="lg" className="mb-4">
            Eight services.{" "}
            <span style={{ color: "var(--orange)" }} className="italic">
              One outcome.
            </span>
          </Display>
        </RevealOnScroll>
        <RevealOnScroll delay="160ms">
          <Lede>
            Human editors paired with AI systems. We optimise for the numbers
            that move channels — not for hours billed or deliverables ticked.
          </Lede>
        </RevealOnScroll>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
        {SERVICES.map((s, i) => (
          <RevealOnScroll key={s.title} delay={`${(i % 4) * 60}ms`}>
            <Link to={s.path} className="block h-full group">
              <HairlineCard className="p-5 md:p-6 h-full transition-transform hover:-translate-y-0.5">
                <span
                  className="inline-grid place-items-center w-10 h-10 md:w-12 md:h-12 rounded-xl mb-4"
                  style={{ background: "rgba(232,80,2,0.12)", color: "var(--orange)" }}
                >
                  <s.Icon size={20} className="md:hidden" aria-hidden="true" />
                  <s.Icon size={24} className="hidden md:inline" aria-hidden="true" />
                </span>
                <h3 className="text-display-sm mb-2 leading-tight" style={{ color: "var(--text)" }}>
                  {s.title}
                </h3>
                <p className="text-sm leading-relaxed mb-3" style={{ color: "var(--text-muted)" }}>
                  {s.outcome}
                </p>
                <p
                  className="text-[11px] font-mono pt-3 border-t leading-snug"
                  style={{ color: "var(--text-muted)", borderColor: "var(--hairline)", opacity: 0.85 }}
                >
                  {s.proof}
                </p>
                <span
                  className="mt-4 inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ color: "var(--orange)" }}
                >
                  Learn more <ArrowUpRight size={10} />
                </span>
              </HairlineCard>
            </Link>
          </RevealOnScroll>
        ))}
      </div>
    </Section>
  );
}
