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
