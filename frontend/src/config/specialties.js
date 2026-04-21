/**
 * specialties.js — shared data source for the 3 AI specialty sub-pages.
 *
 * Each specialty drives:
 *   - A tile on the Work page (SpecialtiesBand)
 *   - A full microsite at /work/<slug> (SpecialtyPageTemplate)
 *   - Sitemap generation
 *
 * To add a sample, drop a JPG/MP4 into
 * `frontend/public/assets/specialties/<slug>/` and append the path
 * to SPECIALTY_SAMPLES[slug]. No rebuild of the route needed.
 *
 * Editing copy here requires a deploy; migrate to KV later if that
 * becomes a bottleneck (see plan tradeoffs).
 */

export const SPECIALTIES = [
  {
    slug: "ai-music",
    path: "/work/ai-music",
    title: "AI Music Videos",
    shortLabel: "Music / Bhajans",
    tagline: "Bhajans, visualisers, lyric edits, devotional shorts — AI-assisted, hand-finished.",
    verb: "compose",
    palette: {
      accent: "#c084fc",        // purple-400
      accentDeep: "#9333ea",    // purple-600
      accentSoft: "rgba(192,132,252,0.12)",
      glow: "rgba(168,85,247,0.35)",
    },
    services: [
      "AI music videos",
      "Bhajans & devotional",
      "Lyric visualisers",
      "Beat-synced shorts",
      "Album cover motion",
      "Concert recap edits",
    ],
    heroCopy: {
      kicker: "Specialty · Music",
      headline: "Devotional, lyrical, viral — the music we help creators",
      lede:
        "From Bhajans and Kirtans to shorts that ride a beat drop, we combine AI scaffolding with human taste to turn raw audio into rewatchable moments.",
    },
    processSteps: [
      { title: "Brief the track", body: "Share the song + reference vibe. We map mood, tempo and target platform." },
      { title: "Generate + refine", body: "AI-assisted scene sketching, then frame-by-frame polish by our editors." },
      { title: "Master + ship", body: "Colour, captions, platform-native exports. Ready for YT Shorts, Reels, and long-form." },
    ],
    pricingAnchor: "Projects start at ₹4,500 per short · custom quote on long-form",
    meta: {
      title: "AI Music Videos, Bhajans & Visualisers — Shinel Studios",
      description:
        "AI-assisted music video editing: bhajans, lyric visualisers, devotional shorts, beat-synced edits. Built for YouTube Shorts, Reels and long-form.",
      path: "/work/ai-music",
    },
  },

  {
    slug: "ai-tattoo",
    path: "/work/ai-tattoo",
    title: "Tattoo Videos",
    shortLabel: "Tattoo · Shorts + Long",
    tagline: "Shorts, reels, B-rolls, and long-form — built around the ink and the story.",
    verb: "document",
    palette: {
      accent: "#f97316",        // orange-500 (matches brand)
      accentDeep: "#c2410c",    // orange-700
      accentSoft: "rgba(249,115,22,0.12)",
      glow: "rgba(234,88,12,0.35)",
    },
    services: [
      "Tattoo shorts",
      "Tattoo reels",
      "Studio B-roll reels",
      "Client story long-form",
      "Healing journey docs",
      "Artist portfolio edits",
    ],
    heroCopy: {
      kicker: "Specialty · Tattoo",
      headline: "Every needle movement, every story — we",
      lede:
        "We shoot, cut, and post tattoo content that brings the artist's portfolio to life. Shorts that travel, long-form that books.",
    },
    processSteps: [
      { title: "Capture", body: "On-site B-roll capture guide so you shoot exactly what cuts clean." },
      { title: "Edit for intent", body: "Shorts tuned for discovery, long-form for retention. Captions baked in." },
      { title: "Post + iterate", body: "Weekly cadence plan. We track which hooks convert to bookings and sharpen the next batch." },
    ],
    pricingAnchor: "Retainers start at ₹18,000/month · one-off shorts from ₹2,500",
    meta: {
      title: "Tattoo Shorts, Reels & Long-form Content — Shinel Studios",
      description:
        "Tattoo artists get more bookings with content that travels: shorts, reels, studio B-roll, long-form healing + portfolio docs. AI-enhanced, human-edited.",
      path: "/work/ai-tattoo",
    },
  },

  {
    slug: "ai-gfx",
    path: "/work/ai-gfx",
    title: "AI Graphics",
    shortLabel: "AI GFX",
    tagline: "Logos, Instagram posts, thumbnails, reel covers — designed with AI, finished by humans.",
    verb: "design",
    palette: {
      accent: "#22d3ee",        // cyan-400
      accentDeep: "#0891b2",    // cyan-600
      accentSoft: "rgba(34,211,238,0.12)",
      glow: "rgba(6,182,212,0.35)",
    },
    services: [
      "AI logo concepts",
      "Instagram post sets",
      "Thumbnail concepts",
      "Shorts / Reel covers",
      "Channel banners",
      "Community post graphics",
    ],
    heroCopy: {
      kicker: "Specialty · AI Graphics",
      headline: "AI does the draft. We",
      lede:
        "AI gets us to the first usable frame in minutes. Human taste makes it brand-accurate, high-CTR, and ready to ship across your channel.",
    },
    processSteps: [
      { title: "Brief the brand", body: "Palette, voice, references. We lock the design system for your channel." },
      { title: "AI drafts, we refine", body: "Midjourney / Flux for scaffolding; layout, typography, and exports by hand." },
      { title: "Deliver the set", body: "Full set: logo + post + thumbnails + covers + banner. Editable source files included." },
    ],
    pricingAnchor: "Post sets start at ₹3,500 · thumbnail retainers from ₹12,000/month",
    meta: {
      title: "AI Graphics: Logos, Instagram Posts, Thumbnails — Shinel Studios",
      description:
        "AI-assisted brand graphics: logos, Instagram posts, YouTube thumbnails, reel covers, channel banners. Draft speed of AI, human-level quality.",
      path: "/work/ai-gfx",
    },
  },
];

export const SPECIALTY_BY_SLUG = SPECIALTIES.reduce((acc, s) => {
  acc[s.slug] = s;
  return acc;
}, {});

/**
 * Sample media per specialty. Drop real JPG/MP4 files into
 * `frontend/public/assets/specialties/<slug>/` and append to these
 * arrays. The component reads the list; you don't touch JSX to add
 * a piece.
 *
 * ratio: CSS aspect-ratio string (e.g. "16/9", "9/16", "1/1").
 * kind:  "image" | "video"  — video uses <video muted playsInline loop>.
 */
export const SPECIALTY_SAMPLES = {
  "ai-music": [
    // Example shape (replace with real files in public/assets/specialties/ai-music/):
    // { src: "/assets/specialties/ai-music/bhajan-01.jpg", alt: "Bhajan visualiser 1", kind: "image", ratio: "16/9" },
  ],
  "ai-tattoo": [
    // { src: "/assets/specialties/ai-tattoo/studio-broll-01.mp4", alt: "Studio B-roll", kind: "video", ratio: "9/16" },
  ],
  "ai-gfx": [
    // { src: "/assets/specialties/ai-gfx/logo-set-01.jpg", alt: "AI logo concept", kind: "image", ratio: "1/1" },
  ],
};
