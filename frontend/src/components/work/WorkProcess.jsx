/**
 * WorkProcess — 4-step filmstrip laid out horizontally.
 *
 * Static, no JS, compositor-safe hover states only. On mobile scrolls
 * horizontally with scroll-snap so each step reads in isolation.
 */
import React from "react";
import { MessagesSquare, Sparkles, Send, RotateCw } from "lucide-react";
import { Section, Kicker, Display, RevealOnScroll } from "../../design";

const STEPS = [
  {
    icon: MessagesSquare,
    title: "Brief",
    body: "One call. Goals, references, tone, deadline — we lock the scope.",
  },
  {
    icon: Sparkles,
    title: "Concept",
    body: "Sample frames or a mini-cut. You say yes or steer before we go deep.",
  },
  {
    icon: Send,
    title: "Ship",
    body: "Draft → approved master. Platform-native exports. Captions baked in.",
  },
  {
    icon: RotateCw,
    title: "Iterate",
    body: "Weekly rhythm. We A/B thumbnails, refine hooks, sharpen the next batch.",
  },
];

export default function WorkProcess() {
  return (
    <Section size="md" hairlineBot>
      <RevealOnScroll><Kicker>How it goes</Kicker></RevealOnScroll>
      <RevealOnScroll delay="80ms">
        <Display as="h2" size="lg" className="mt-2 mb-8">
          Four steps, no drama.
        </Display>
      </RevealOnScroll>

      <ol
        className="flex md:grid md:grid-cols-4 gap-4 md:gap-5 overflow-x-auto md:overflow-visible snap-x snap-mandatory -mx-4 md:mx-0 px-4 md:px-0 pb-2 md:pb-0"
        style={{ scrollbarWidth: "thin" }}
      >
        {STEPS.map((s, i) => (
          <li
            key={s.title}
            className="snap-start shrink-0 md:shrink w-[85%] md:w-auto"
          >
            <RevealOnScroll delay={`${60 + i * 80}ms`}>
              <div
                className="h-full p-5 md:p-6 rounded-2xl md:rounded-3xl hairline flex flex-col gap-3"
                style={{ background: "var(--surface)" }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-lg grid place-items-center"
                    style={{ background: "var(--orange-soft)", color: "var(--orange)" }}
                    aria-hidden="true"
                  >
                    <s.icon size={16} strokeWidth={2.5} />
                  </div>
                  <span
                    className="text-[10px] font-black uppercase tracking-[0.3em]"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Step {i + 1}
                  </span>
                </div>
                <h3 className="text-xl md:text-2xl font-black" style={{ color: "var(--text)" }}>
                  {s.title}
                </h3>
                <p className="text-sm md:text-base" style={{ color: "var(--text-muted)" }}>
                  {s.body}
                </p>
              </div>
            </RevealOnScroll>
          </li>
        ))}
      </ol>
    </Section>
  );
}
