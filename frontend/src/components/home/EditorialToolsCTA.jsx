/**
 * EditorialToolsCTA — clean editorial replacement for the old AI Tools
 * CTA band. Section + Kicker + Display + Lede + 2 buttons.
 */
import React from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { Section, Kicker, Display, Lede, RevealOnScroll } from "../../design";

export default function EditorialToolsCTA() {
  return (
    <Section size="md" tone="surface-alt" hairlineTop>
      <div className="max-w-3xl mx-auto text-center">
        <RevealOnScroll>
          <Kicker className="mb-3">Free creator tools</Kicker>
        </RevealOnScroll>
        <RevealOnScroll delay="80ms">
          <Display size="lg" className="mb-4">
            Master your{" "}
            <span style={{ color: "var(--orange)" }} className="italic">
              growth
            </span>{" "}
            with AI.
          </Display>
        </RevealOnScroll>
        <RevealOnScroll delay="160ms">
          <Lede className="mb-7">
            Channel audits, thumbnail clickability scores, content-calendar
            generators, ROI calculators — open to everyone, free, no signup
            required.
          </Lede>
        </RevealOnScroll>
        <RevealOnScroll delay="240ms">
          <div className="inline-flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/tools" className="btn-editorial inline-flex items-center gap-2">
              <Sparkles size={14} aria-hidden="true" /> Explore all tools
            </Link>
            <Link to="/tools/channel-audit" className="btn-editorial-ghost inline-flex items-center gap-2">
              Try the 60-second channel audit <ArrowUpRight size={14} />
            </Link>
          </div>
        </RevealOnScroll>
      </div>
    </Section>
  );
}
