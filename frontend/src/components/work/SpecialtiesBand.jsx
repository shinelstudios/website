/**
 * SpecialtiesBand — three editorial cards linking to the AI specialty
 * sub-pages. This is the conversion-critical section on /work.
 *
 * Reads the shared SPECIALTIES config so adding a fourth specialty later
 * means appending to the config file, no JSX change.
 */
import React from "react";
import { Section, Kicker, Display, Lede, RevealOnScroll } from "../../design";
import SpecialtyCard from "./SpecialtyCard";
import { SPECIALTIES } from "../../config/specialties";

export default function SpecialtiesBand({ exclude }) {
  const items = SPECIALTIES.filter((s) => s.slug !== exclude);
  if (!items.length) return null;

  return (
    <Section size="md" hairlineTop hairlineBot>
      <div className="flex items-end justify-between flex-wrap gap-4 mb-8">
        <div>
          <RevealOnScroll><Kicker>Where we push hardest</Kicker></RevealOnScroll>
          <RevealOnScroll delay="80ms">
            <Display as="h2" size="lg" className="mt-2">
              Our AI specialties.
            </Display>
          </RevealOnScroll>
        </div>
        <RevealOnScroll delay="160ms">
          <Lede className="max-w-md">
            The three lanes we push the hardest — each has its own microsite.
            Share the right link with the right client.
          </Lede>
        </RevealOnScroll>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
        {items.map((s, i) => (
          <RevealOnScroll key={s.slug} delay={`${60 + i * 80}ms`}>
            <SpecialtyCard specialty={s} />
          </RevealOnScroll>
        ))}
      </div>
    </Section>
  );
}
