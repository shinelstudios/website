/**
 * EditorialProcess — numbered 6-step process strip on the home page.
 *
 * Editorial feel: large numerals, hairline separators, staggered reveals.
 * Reads to a visitor like a magazine spread: "here's how it goes from brief
 * to ship, no mystery". Reinforces Shinel's reliability vs a freelance
 * hire-and-pray feel.
 */
import React from "react";
import {
  Section,
  Eyebrow,
  Display,
  Lede,
  RevealOnScroll,
} from "../../design";

const STEPS = [
  {
    n: "01",
    title: "Brief",
    body:
      "15-min audit call or async form. We learn your channel, audience, and the growth gap.",
  },
  {
    n: "02",
    title: "Scope",
    body:
      "You get a scoped quote, timeline, and named editor/artist before any payment.",
  },
  {
    n: "03",
    title: "Draft",
    body:
      "First cut, thumbnail set, or graphic pack inside the committed turnaround.",
  },
  {
    n: "04",
    title: "Revise",
    body:
      "Two structured revision rounds. Time-stamped feedback in a Frame.io / Google Drive folder.",
  },
  {
    n: "05",
    title: "Ship",
    body:
      "Final files in every format you need. Source + archival copy stays with us for a year.",
  },
  {
    n: "06",
    title: "Measure",
    body:
      "We share the first 7 days of YouTube analytics after each drop, learning what to push next.",
  },
];

export default function EditorialProcess() {
  return (
    <Section size="lg" tone="surface" hairlineTop>
      <div className="max-w-3xl mb-12">
        <RevealOnScroll>
          <Eyebrow className="mb-3">How it works</Eyebrow>
        </RevealOnScroll>
        <RevealOnScroll delay="80ms">
          <Display size="lg" className="mb-4">
            Six steps. Predictable on purpose.
          </Display>
        </RevealOnScroll>
        <RevealOnScroll delay="160ms">
          <Lede>
            Every project — whether it's a single thumbnail or a monthly long-form
            retainer — runs on the same groove. You always know what's next,
            who's doing it, and when it lands.
          </Lede>
        </RevealOnScroll>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0">
        {STEPS.map((s, i) => (
          <RevealOnScroll key={s.n} delay={`${i * 60}ms`}>
            <div
              className="group p-6 md:p-8 h-full border-t md:border-l md:border-t-0 first:border-l-0"
              style={{
                borderColor: "var(--hairline)",
                borderTopWidth: "1px",
                borderLeftWidth: "1px",
              }}
            >
              <div
                className="text-display-md mb-5 font-semibold text-mono-num transition-colors"
                style={{ color: "var(--orange)" }}
              >
                {s.n}
              </div>
              <div className="text-display-sm mb-2">{s.title}</div>
              <p
                className="text-sm leading-relaxed"
                style={{ color: "var(--text-muted)" }}
              >
                {s.body}
              </p>
            </div>
          </RevealOnScroll>
        ))}
      </div>
    </Section>
  );
}
