/**
 * EditorialServicesMarquee — giant kinetic type marquee listing every service.
 *
 * Two counter-scrolling rows of oversized typography with orange separators.
 * Clickable items deep-link to the service pages. Uses the design-system
 * MarqueeRow primitive so perf + reduced-motion are handled.
 *
 * Placed on the home between social-proof and the Services section, as a
 * punchy editorial beat that sets up the service cards.
 */
import React from "react";
import { Link } from "react-router-dom";
import { MarqueeRow, Section, Kicker } from "../../design";

const ROW_TOP = [
  { label: "Video Editing", to: "/video-editing" },
  { label: "Long-form", to: "/video-editing" },
  { label: "Shorts", to: "/shorts" },
  { label: "Reels", to: "/shorts" },
  { label: "Thumbnails", to: "/thumbnails" },
  { label: "Channel Branding", to: "/branding" },
];

const ROW_BOTTOM = [
  { label: "Logos", to: "/services/graphic-design" },
  { label: "Posts", to: "/services/graphic-design" },
  { label: "Banners", to: "/services/graphic-design" },
  { label: "Flex & Hoardings", to: "/services/graphic-design" },
  { label: "Visiting Cards", to: "/services/graphic-design" },
  { label: "YouTube SEO", to: "/tools/seo" },
  { label: "Channel Strategy", to: "/tools" },
];

function MarqueeItem({ label, to, color }) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-6 md:gap-8 shrink-0"
      style={{ color: color || "var(--text)" }}
    >
      <span
        className="text-display-lg md:text-display-xl font-semibold whitespace-nowrap transition-opacity group-hover:opacity-60"
        style={{ letterSpacing: "-0.02em" }}
      >
        {label}
      </span>
      <span
        aria-hidden="true"
        className="shrink-0 w-3 h-3 md:w-4 md:h-4 rounded-full"
        style={{ background: "var(--orange)" }}
      />
    </Link>
  );
}

export default function EditorialServicesMarquee() {
  return (
    <Section size="md" tone="alt" hairlineTop hairlineBot bleed>
      <div className="container mx-auto px-4 md:px-6 mb-8">
        <Kicker>What we make</Kicker>
      </div>

      <MarqueeRow direction="left" speed="medium" className="mb-4">
        {ROW_TOP.map((item) => (
          <MarqueeItem key={item.label} label={item.label} to={item.to} />
        ))}
      </MarqueeRow>

      <MarqueeRow direction="right" speed="slow">
        {ROW_BOTTOM.map((item) => (
          <MarqueeItem
            key={item.label}
            label={item.label}
            to={item.to}
            color="var(--text-muted)"
          />
        ))}
      </MarqueeRow>
    </Section>
  );
}
