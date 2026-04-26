/**
 * Client portal module registry — single source of truth for renderable
 * sections on /c/<slug>. Adding a new module = drop a file here that
 * exports default `{ Render, Editor }` then add one entry below. Server-
 * side validation lives in worker.js sanitizeClientModules().
 */
import HeroModule from "./HeroModule.jsx";
import BioLinksModule from "./BioLinksModule.jsx";
import LatestVideoModule from "./LatestVideoModule.jsx";
import Stats30DayModule from "./Stats30DayModule.jsx";
import TipJarModule from "./TipJarModule.jsx";
import ShinelFooterModule from "./ShinelFooterModule.jsx";

// Phase 2 (revenue + engagement)
import SponsorRatesModule from "./SponsorRatesModule.jsx";
import AffiliateShelfModule from "./AffiliateShelfModule.jsx";
import MerchShelfModule from "./MerchShelfModule.jsx";
import CalendlyModule from "./CalendlyModule.jsx";
import CourseLinksModule from "./CourseLinksModule.jsx";
import NewsletterModule from "./NewsletterModule.jsx";
import ContactModule from "./ContactModule.jsx";

export const MODULE_REGISTRY = {
  hero: {
    label: "Hero",
    description: "Avatar, name, tagline, optional banner.",
    Render: HeroModule.Render,
    Editor: HeroModule.Editor,
    defaultConfig: { tagline: "" },
    forced: false,
  },
  bioLinks: {
    label: "Bio links",
    description: "Up to 10 customisable CTA buttons (Linktree-style).",
    Render: BioLinksModule.Render,
    Editor: BioLinksModule.Editor,
    defaultConfig: { links: [] },
    forced: false,
  },
  latestVideo: {
    label: "Latest YouTube video",
    description: "Auto-pulls your most recent upload, refreshed every 30 minutes.",
    Render: LatestVideoModule.Render,
    Editor: LatestVideoModule.Editor,
    defaultConfig: { showStats: true },
    forced: false,
  },
  stats30day: {
    label: "30-day stats",
    description: "Bar chart of subs / followers / views from Shinel's daily sync.",
    Render: Stats30DayModule.Render,
    Editor: Stats30DayModule.Editor,
    defaultConfig: { metric: "subscribers" },
    forced: false,
  },
  tipJar: {
    label: "Tip jar",
    description: "UPI ID + external tip link (Razorpay, BMaC). Pure pass-through.",
    Render: TipJarModule.Render,
    Editor: TipJarModule.Editor,
    defaultConfig: { upi: "", externalUrl: "", message: "" },
    forced: false,
  },

  // ----- Phase 2 modules -----
  sponsorRates: {
    label: "Sponsor rates",
    description: "Public rate card + structured inquiry form. Brands fill the form, you get a Discord ping.",
    Render: SponsorRatesModule.Render,
    Editor: SponsorRatesModule.Editor,
    defaultConfig: { headline: "", subheadline: "", ctaLabel: "", tiers: [] },
    forced: false,
  },
  affiliateShelf: {
    label: "Affiliate gear shelf",
    description: "'What I use' grid with affiliate links. Up to 12 items.",
    Render: AffiliateShelfModule.Render,
    Editor: AffiliateShelfModule.Editor,
    defaultConfig: { headline: "", items: [], disclaimer: "" },
    forced: false,
  },
  merchShelf: {
    label: "Merch shelf",
    description: "Your merch as a tile grid. Up to 8 items.",
    Render: MerchShelfModule.Render,
    Editor: MerchShelfModule.Editor,
    defaultConfig: { headline: "", items: [] },
    forced: false,
  },
  calendly: {
    label: "Booking / Calendly",
    description: "Send fans to a paid 1:1 booking link (Calendly, Cal.com, Topmate).",
    Render: CalendlyModule.Render,
    Editor: CalendlyModule.Editor,
    defaultConfig: { url: "", headline: "", subheadline: "", ctaLabel: "" },
    forced: false,
  },
  courseLinks: {
    label: "Course / Patreon / Discord",
    description: "CTA cards for paid platforms (Patreon, courses, Discord, Telegram). Up to 6.",
    Render: CourseLinksModule.Render,
    Editor: CourseLinksModule.Editor,
    defaultConfig: { headline: "", items: [] },
    forced: false,
  },
  newsletter: {
    label: "Newsletter signup",
    description: "Email capture form. Subscribers land in your inbox; export as CSV.",
    Render: NewsletterModule.Render,
    Editor: NewsletterModule.Editor,
    defaultConfig: { headline: "", subheadline: "", ctaLabel: "" },
    forced: false,
  },
  contact: {
    label: "Contact form",
    description: "General message form (not sponsorship-specific). Pings Discord webhook + lands in inbox.",
    Render: ContactModule.Render,
    Editor: ContactModule.Editor,
    defaultConfig: { headline: "", subheadline: "", ctaLabel: "" },
    forced: false,
  },

  shinelFooter: {
    label: "Shinel footer",
    description: "Mandatory on free tier. Removable on Pro.",
    Render: ShinelFooterModule.Render,
    Editor: ShinelFooterModule.Editor,
    defaultConfig: {},
    forced: true,
  },
};

export const MODULE_TYPES = Object.keys(MODULE_REGISTRY);
