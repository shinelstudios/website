/**
 * FAQAccordion — native <details>/<summary> for accessibility + zero JS
 * overhead. Embeds FAQSchema (JSON-LD) so Google can surface rich FAQ
 * snippets in SERPs — direct SEO win and the main reason this section
 * exists on the homepage.
 */
import React from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ArrowUpRight } from "lucide-react";
import { Section, Kicker, Display, Lede, HairlineCard, RevealOnScroll } from "../../design";
import { FAQSchema } from "../MetaTags.jsx";

const FAQS = [
  {
    question: "How fast is turnaround?",
    answer: "Thumbnails in 24–48 hours. Shorts in 48–72 hours. Long-form in 5–10 days. Graphic packs in 3–5 days. Every quote names a firm deadline before payment.",
  },
  {
    question: "Who owns the final files?",
    answer: "You do — full ownership of source files, SVGs, PDFs, and archival MP4s. We keep a copy for a year so you can request re-exports free.",
  },
  {
    question: "How do revisions work?",
    answer: "Two structured revision rounds per deliverable, included. Feedback goes in a shared Frame.io or Google Drive thread — no WhatsApp ping-pong.",
  },
  {
    question: "Can I pick my editor?",
    answer: "Yes. Every project names the editor or artist upfront. If you've seen a maker's portfolio you can request them by name.",
  },
  {
    question: "Do you sign NDAs?",
    answer: "Yes. We sign NDAs before any brief is shared. Standard mutual NDA on request, or we'll counter-sign yours.",
  },
  {
    question: "What if I'm not happy with the work?",
    answer: "Two revision rounds are included to dial it in. If it still misses, we extend revisions free until it lands — we'd rather over-deliver than have a churned client.",
  },
  {
    question: "Do you work with creators outside India?",
    answer: "Yes — about 30% of our roster is international. We schedule reviews in your timezone and bill in USD or INR.",
  },
  {
    question: "What AI do you actually use?",
    answer: "Voice cleanup, transcription, thumbnail concept generation, captioning, and some color/audio cleanup. All AI use is consent-first and creator-approved before shipping.",
  },
];

export default function FAQAccordion() {
  return (
    <Section size="lg" id="faq" tone="surface" hairlineTop>
      <FAQSchema faqs={FAQS.map((f) => ({ question: f.question, answer: f.answer }))} />

      <div className="grid lg:grid-cols-[1fr_1.6fr] gap-10 lg:gap-14">
        <div>
          <RevealOnScroll>
            <Kicker className="mb-3">FAQ</Kicker>
          </RevealOnScroll>
          <RevealOnScroll delay="80ms">
            <Display size="lg" className="mb-4">
              The answers,{" "}
              <span style={{ color: "var(--orange)" }} className="italic">
                straight up.
              </span>
            </Display>
          </RevealOnScroll>
          <RevealOnScroll delay="160ms">
            <Lede className="mb-6">
              The questions creators and brands ask most often. If yours isn't
              here, WhatsApp us and we'll reply inside 24 h.
            </Lede>
          </RevealOnScroll>
          <RevealOnScroll delay="240ms">
            <Link
              to="/faq"
              className="text-xs font-black uppercase tracking-widest inline-flex items-center gap-1.5"
              style={{ color: "var(--orange)" }}
            >
              All FAQs <ArrowUpRight size={12} />
            </Link>
          </RevealOnScroll>
        </div>
        <div className="space-y-3">
          {FAQS.map((f, i) => (
            <RevealOnScroll key={f.question} delay={`${(i % 3) * 60}ms`}>
              <HairlineCard className="p-0 overflow-hidden">
                <details className="group">
                  <summary
                    className="flex items-center justify-between gap-4 p-5 cursor-pointer list-none"
                    style={{ color: "var(--text)" }}
                  >
                    <span className="font-bold text-sm md:text-base">{f.question}</span>
                    <ChevronDown
                      size={18}
                      className="shrink-0 transition-transform group-open:rotate-180"
                      style={{ color: "var(--orange)" }}
                      aria-hidden="true"
                    />
                  </summary>
                  <div
                    className="px-5 pb-5 text-sm leading-relaxed"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {f.answer}
                  </div>
                </details>
              </HairlineCard>
            </RevealOnScroll>
          ))}
        </div>
      </div>
    </Section>
  );
}
