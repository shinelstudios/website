/**
 * WorkFAQ — quick-answer accordion for the most common pre-enquiry
 * objections. Uses the `grid-template-rows: 0fr → 1fr` trick from the
 * LiveTemplates fix so expansion is compositor-only (no layout thrash).
 */
import React, { useState } from "react";
import { Plus, Minus } from "lucide-react";
import { Section, Kicker, Display, Lede, RevealOnScroll } from "../../design";

const FAQS = [
  {
    q: "How fast can you turn around an edit?",
    a: "Shorts: 24–48 hours for a first draft. Long-form: 5–7 days. If you're on a retainer we hold a weekly slot so turnaround stays predictable.",
  },
  {
    q: "What's a typical cost?",
    a: "Standard production tiers are listed on the pricing page — starter sprints, monthly shorts factories, long-form rhythms, full-studio retainers. Anything AI-assisted (music videos, tattoo content, AI graphics) is custom-quoted to scope since the work and turnaround vary wildly per brief.",
  },
  {
    q: "Do you handle uploads + scheduling?",
    a: "Yes. For channel-management clients we upload, title, describe, tag, set thumbnails, and schedule. You approve, we ship.",
  },
  {
    q: "Can you match my brand tone?",
    a: "That's the whole job. Brief call → reference lock → style guide. Every edit from there reads like you made it, just cleaner.",
  },
  {
    q: "Revisions included?",
    a: "Two rounds included on every deliverable. Third round is a flat 20% of the original. Nobody gets surprised.",
  },
  {
    q: "How do I start?",
    a: "Hit 'Start a project' above — it opens WhatsApp with your brief prefilled. Or mail hello@shinelstudios.in. First reply is under 3 hours on a weekday.",
  },
];

function Row({ item, open, onToggle }) {
  return (
    <li className="hairline-b">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-4 py-4 md:py-5 text-left focus-visible:ring-2 focus-visible:ring-[var(--orange)] rounded"
      >
        <span
          className="text-base md:text-lg font-bold"
          style={{ color: "var(--text)" }}
        >
          {item.q}
        </span>
        <span
          className="w-8 h-8 shrink-0 rounded-full grid place-items-center transition-colors"
          style={{
            background: open ? "var(--orange)" : "var(--surface-alt)",
            color: open ? "#fff" : "var(--text)",
          }}
          aria-hidden="true"
        >
          {open ? <Minus size={14} /> : <Plus size={14} />}
        </span>
      </button>
      <div
        style={{
          display: "grid",
          gridTemplateRows: open ? "1fr" : "0fr",
          opacity: open ? 1 : 0,
          transition: "grid-template-rows 300ms ease-out, opacity 250ms ease-out",
        }}
      >
        <div style={{ overflow: "hidden", minHeight: 0 }}>
          <p
            className="pb-5 md:pb-6 pr-10 text-sm md:text-base leading-relaxed"
            style={{ color: "var(--text-muted)" }}
          >
            {item.a}
          </p>
        </div>
      </div>
    </li>
  );
}

export default function WorkFAQ() {
  const [openIdx, setOpenIdx] = useState(-1);
  return (
    <Section size="md" tone="alt">
      <RevealOnScroll><Kicker>Quick answers</Kicker></RevealOnScroll>
      <RevealOnScroll delay="80ms">
        <Display as="h2" size="lg" className="mt-2 mb-3">
          Before you reach out.
        </Display>
      </RevealOnScroll>
      <RevealOnScroll delay="160ms">
        <Lede className="max-w-2xl mb-8">
          The six things everyone asks. Still got a question? Hit the big
          orange button — we reply fast.
        </Lede>
      </RevealOnScroll>

      <ul className="hairline-t max-w-3xl">
        {FAQS.map((item, i) => (
          <Row
            key={i}
            item={item}
            open={openIdx === i}
            onToggle={() => setOpenIdx(openIdx === i ? -1 : i)}
          />
        ))}
      </ul>
    </Section>
  );
}
