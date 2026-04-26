/**
 * Single source of truth for static routes shared between build scripts
 * AND the React app at runtime.
 *
 * Build-time consumers:
 *   - scripts/prerender.js — renders each into dist/<route>/index.html
 *   - scripts/generate-og-images.js — emits a 1200×630 PNG per route
 *
 * Runtime consumer:
 *   - components/MetaTags.jsx — uses OG_SLUG_SET to know whether a
 *     per-route OG PNG was pre-generated for the current pathname
 *     (dynamic pages like /blog/:slug or /team/:slug fall back to the
 *     static default).
 *
 * Each entry: { path, title, kicker }
 *   - path: the URL pathname
 *   - title: used as the headline on the OG card AND fed to OG/Twitter meta
 *   - kicker: small uppercase label above the title on the card
 *
 * If you add a new public route, add it here. Dynamic routes (case-study
 * slugs, blog post slugs, team-member slugs) are NOT in this file —
 * they're fetched at build time by their respective generators.
 *
 * Browser-safe: this file imports nothing and uses no Node APIs.
 */
export const STATIC_ROUTES = [
  { path: "/",                kicker: "Shinel Studios",        title: "We edit videos that convert." },
  { path: "/about",           kicker: "About",                  title: "The studio behind your next hit." },
  { path: "/work",            kicker: "The Work",               title: "Channels we built. Videos that landed." },
  { path: "/pricing",         kicker: "Pricing",                title: "Pay per video or pay per month." },
  { path: "/faq",             kicker: "FAQ",                    title: "Quick answers, in plain English." },
  { path: "/contact",         kicker: "Contact",                title: "One reply, one project, one calendar slot." },
  { path: "/live",            kicker: "Pulse",                  title: "Live channel metrics for our roster." },

  // Specialty service pages
  { path: "/video-editing",   kicker: "Service",                title: "Video editing that makes the algorithm hit." },
  { path: "/shorts",          kicker: "Service",                title: "Shorts. Clipped, captioned, ready." },
  { path: "/thumbnails",      kicker: "Service",                title: "Thumbnails that earn the click." },
  { path: "/branding",        kicker: "Service",                title: "Channel branding, end to end." },
  { path: "/graphic-design",  kicker: "Service",                title: "Graphic design for creators + brands." },

  // /work AI series
  { path: "/work/ai-music",   kicker: "AI Series",              title: "AI music videos." },
  { path: "/work/ai-tattoo",  kicker: "AI Series",              title: "AI tattoo concept reels." },
  { path: "/work/ai-gfx",     kicker: "AI Series",              title: "AI-assisted GFX work." },

  // Tools hub + each tool
  { path: "/tools",                          kicker: "Free Tools",  title: "Free creator tools." },
  { path: "/tools/thumbnail-previewer",      kicker: "Tool",        title: "Preview your thumbnail at YouTube sizes." },
  { path: "/tools/thumbnail-clickability",   kicker: "Tool",        title: "Score your thumbnail in 10 seconds." },
  { path: "/tools/thumbnail-ideation",       kicker: "Tool",        title: "AI-powered thumbnail concepts." },
  { path: "/tools/channel-audit",            kicker: "Tool",        title: "60-second YouTube channel audit." },
  { path: "/tools/content-calendar",         kicker: "Tool",        title: "Starter content calendar by niche." },
  { path: "/tools/srt",                      kicker: "Tool",        title: "Local SRT subtitle builder." },
  { path: "/tools/seo",                      kicker: "Tool",        title: "YouTube SEO companion." },
  { path: "/tools/comparison",               kicker: "Tool",        title: "Compare two thumbnails side-by-side." },
  { path: "/roi-calculator",                 kicker: "Tool",        title: "Edit ROI calculator." },

  // Industries (programmatic SEO)
  { path: "/industries/real-estate",         kicker: "Industry",    title: "Editing for real-estate creators." },
  { path: "/industries/tech-creators",       kicker: "Industry",    title: "Editing for tech creators." },
  { path: "/industries/financial-advisors",  kicker: "Industry",    title: "Editing for financial advisors." },
  { path: "/industries/podcast-clips",       kicker: "Industry",    title: "Podcast clipping & shorts." },

  // Service taxonomy buckets (left for prerender; OG can fall through)
  { path: "/services/gfx",                   kicker: "Service",     title: "GFX." },
  { path: "/services/editing",               kicker: "Service",     title: "Editing." },
  { path: "/services/growth",                kicker: "Service",     title: "Growth." },
  { path: "/services/growth/seo",            kicker: "Service",     title: "SEO." },
  { path: "/services/growth/captions",       kicker: "Service",     title: "Captions." },

  // Legal + odds-and-ends
  { path: "/privacy",         kicker: "Legal",                  title: "Privacy policy." },
  { path: "/terms",           kicker: "Legal",                  title: "Terms of service." },
  { path: "/blog",            kicker: "Blog",                   title: "Notes from the studio." },
  { path: "/team",            kicker: "Team",                   title: "Meet the makers." },
  { path: "/live-templates",  kicker: "Direct",                 title: "BGMI livestream thumbnail templates." },
];

/**
 * Convert a route pathname to an OG image filename slug.
 *   "/"                              → "home"
 *   "/work"                          → "work"
 *   "/team/raghav"                   → "team-raghav"
 *   "/services/gfx/thumbnails/youtube" → "services-gfx-thumbnails-youtube"
 */
export function ogSlugForPath(pathname) {
  if (!pathname || pathname === "/") return "home";
  return pathname
    .replace(/^\//, "")
    .replace(/\/$/, "")
    .replace(/[^a-zA-Z0-9-]+/g, "-")
    .toLowerCase() || "home";
}

/**
 * Pre-computed set of OG slugs we know exist on disk after build. MetaTags
 * uses this to decide whether to emit `/og/<slug>.png` or fall back to the
 * static default. Updated automatically when STATIC_ROUTES changes.
 */
export const OG_SLUG_SET = new Set(STATIC_ROUTES.map((r) => ogSlugForPath(r.path)));
