/**
 * EditorialBeforeAfterSection — replaces the desktop-only ServiceLens
 * magnifier with a touch-safe 2-handle comparison slider. Editorial
 * skeleton: Section + Kicker + Display + Lede + slider + CTA.
 */
import React from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { Section, Kicker, Display, Lede, RevealOnScroll } from "../../design";
import BeforeAfterSlider from "./BeforeAfterSlider.jsx";
import SAMPLE_VLOG_BEFORE from "../../assets/Vlog_sample_before.jpg";
import SAMPLE_VLOG_AFTER from "../../assets/Vlog_sample_after.jpg";

export default function EditorialBeforeAfterSection() {
  return (
    <Section size="lg" hairlineTop>
      <div className="grid lg:grid-cols-[1fr_1.4fr] gap-10 lg:gap-14 items-center">
        <div>
          <RevealOnScroll>
            <Kicker className="mb-3">The Shinel touch</Kicker>
          </RevealOnScroll>
          <RevealOnScroll delay="80ms">
            <Display size="lg" className="mb-4">
              Raw footage in.{" "}
              <span style={{ color: "var(--orange)" }} className="italic">
                Polished story out.
              </span>
            </Display>
          </RevealOnScroll>
          <RevealOnScroll delay="160ms">
            <Lede className="mb-6">
              Drag the handle to see the difference. Color, pacing, captions,
              hooks — every cut tuned for retention. Same source clip, two very
              different outcomes.
            </Lede>
          </RevealOnScroll>
          <RevealOnScroll delay="240ms">
            <Link to="/work" className="btn-editorial inline-flex items-center gap-2">
              See more before/afters <ArrowUpRight size={14} />
            </Link>
          </RevealOnScroll>
        </div>
        <RevealOnScroll delay="120ms">
          <BeforeAfterSlider
            before={SAMPLE_VLOG_BEFORE}
            after={SAMPLE_VLOG_AFTER}
            beforeLabel="Original footage"
            afterLabel="Shinel-edited"
          />
        </RevealOnScroll>
      </div>
    </Section>
  );
}
