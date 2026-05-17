/**
 * CreatorPitchCTA — homepage section aimed at *creators* (not brands).
 *
 * The rest of the site speaks to brand buyers ("hire us to edit your campaign").
 * This single section flips the conversation: a creator landing on the
 * homepage gets an explicit, on-brand pitch to apply for the roster.
 *
 * Placement: between the OurCreatorsHero trophy wall and the existing
 * CreatorsWorkedWithMarquee. Visual is a full-width dark band with an
 * orange gradient accent so it reads as its own beat in the scroll.
 */

import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";

export default function CreatorPitchCTA() {
  return (
    <section
      id="creator-pitch-cta"
      aria-labelledby="creator-pitch-heading"
      className="relative w-full overflow-hidden py-20 md:py-28 px-4"
      style={{
        background:
          "radial-gradient(ellipse at top left, color-mix(in oklab, var(--orange) 35%, #0a0a0a) 0%, #0a0a0a 55%, #050505 100%)",
      }}
    >
      {/* Soft orange glow blobs for depth */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 -right-24 w-[420px] h-[420px] rounded-full opacity-40 blur-3xl"
        style={{ background: "radial-gradient(circle, var(--orange), transparent 65%)" }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-40 -left-20 w-[360px] h-[360px] rounded-full opacity-25 blur-3xl"
        style={{ background: "radial-gradient(circle, var(--orange), transparent 65%)" }}
      />

      <div className="relative max-w-4xl mx-auto text-center">
        {/* Eyebrow */}
        <span
          className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.22em] mb-5"
          style={{ color: "var(--orange)" }}
        >
          <Sparkles size={12} /> For creators
        </span>

        {/* Headline */}
        <h2
          id="creator-pitch-heading"
          className="text-4xl md:text-6xl font-extrabold tracking-tight leading-[1.05] mb-5"
          style={{ color: "#fafafa" }}
        >
          Want us to edit{" "}
          <em className="not-italic" style={{ color: "var(--orange)" }}>
            YOUR
          </em>{" "}
          channel?
        </h2>

        {/* Sub-line */}
        <p
          className="text-base md:text-lg max-w-2xl mx-auto mb-9"
          style={{ color: "rgba(250,250,250,0.72)" }}
        >
          We pick 1 in 30 channels we audit. If your content is good and you're
          serious about scaling, send us a link to your channel.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
          <Link
            to="/contact?source=creator-pitch"
            className="btn-editorial"
            aria-label="Pitch your channel to Shinel Studios"
          >
            Pitch your channel <ArrowRight size={14} />
          </Link>
          <Link
            to="/creators"
            className="btn-editorial-ghost"
            style={{ color: "#fafafa", borderColor: "rgba(250,250,250,0.4)" }}
            aria-label="See the current Shinel Studios roster"
          >
            See who's already on the roster
          </Link>
        </div>
      </div>
    </section>
  );
}
