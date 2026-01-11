// src/data/servicesConfig.js
import {
  Image as ImageIcon,
  Palette,
  Film,
  Clapperboard,
  Scissors,
  Search as SearchIcon,
  BarChart3,
  Captions,
  LayoutTemplate,
  Sparkles,
  Zap,
  BadgeCheck,
} from "lucide-react";

export const services = [
  {
    key: "gfx",
    title: "GFX",
    icon: Palette,
    tagline: "High-CTR visuals. Brand-consistent, premium, mobile-first.",
    categoryPath: "/services/gfx",
    gradient: "linear-gradient(135deg, rgba(232,80,2,.26), rgba(255,147,87,.12))",
    items: [
      {
        key: "thumbnails",
        title: "Thumbnails",
        icon: ImageIcon,
        path: "/services/gfx/thumbnails",
        sub: "CTR-first thumbnail system",
        subcategories: [
          { key: "youtube", title: "YouTube Thumbnails", icon: ImageIcon, path: "/services/gfx/thumbnails/youtube" },
          { key: "gaming", title: "Gaming Thumbnails", icon: Zap, path: "/services/gfx/thumbnails/gaming" },
          { key: "podcast", title: "Podcast Thumbnails", icon: BadgeCheck, path: "/services/gfx/thumbnails/podcast" },
        ],
      },
      {
        key: "branding",
        title: "Branding",
        icon: LayoutTemplate,
        path: "/services/gfx/branding",
        sub: "Channel + social brand kit",
        subcategories: [
          { key: "channel", title: "Channel Branding", icon: LayoutTemplate, path: "/services/gfx/branding/channel" },
          { key: "social", title: "Social Templates", icon: Sparkles, path: "/services/gfx/branding/social" },
          { key: "banners", title: "Banners + Covers", icon: ImageIcon, path: "/services/gfx/branding/banners" },
        ],
      },
    ],
  },

  {
    key: "editing",
    title: "Editing",
    icon: Scissors,
    tagline: "Retention-focused edits for Shorts + long-form.",
    categoryPath: "/services/editing",
    gradient: "linear-gradient(135deg, rgba(2,132,199,.20), rgba(2,132,199,.10))",
    items: [
      {
        key: "shorts",
        title: "Shorts / Reels",
        icon: Clapperboard,
        path: "/services/editing/shorts",
        sub: "Hook + pacing + captions",
        subcategories: [
          { key: "gaming", title: "Gaming Shorts", icon: Zap, path: "/services/editing/shorts/gaming" },
          { key: "vlog", title: "Vlog Shorts", icon: Sparkles, path: "/services/editing/shorts/vlog" },
          { key: "podcast", title: "Podcast Clips", icon: BadgeCheck, path: "/services/editing/shorts/podcast" },
        ],
      },
      {
        key: "long",
        title: "Long-form Editing",
        icon: Film,
        path: "/services/editing/long",
        sub: "Structure + retention patterns",
        subcategories: [
          { key: "gaming", title: "Gaming Long-form", icon: Zap, path: "/services/editing/long/gaming" },
          { key: "vlog", title: "Vlog Long-form", icon: Sparkles, path: "/services/editing/long/vlog" },
          { key: "podcast", title: "Podcast Long-form", icon: BadgeCheck, path: "/services/editing/long/podcast" },
        ],
      },
    ],
  },

  {
    key: "growth",
    title: "Growth",
    icon: SearchIcon,
    tagline: "Packaging + SEO that improves clicks and watch time.",
    categoryPath: "/services/growth",
    gradient: "linear-gradient(135deg, rgba(34,197,94,.16), rgba(34,197,94,.08))",
    items: [
      {
        key: "seo",
        title: "YouTube SEO",
        icon: SearchIcon,
        path: "/services/growth/seo",
        sub: "Titles, descriptions, tags",
        subcategories: [
          { key: "titles", title: "Titles + Hooks", icon: BarChart3, path: "/services/growth/seo/titles" },
          { key: "desc", title: "Descriptions", icon: BadgeCheck, path: "/services/growth/seo/descriptions" },
          { key: "tags", title: "Tags + Keywords", icon: SearchIcon, path: "/services/growth/seo/keywords" },
        ],
      },
      {
        key: "captions",
        title: "Captions / Subtitles",
        icon: Captions,
        path: "/services/growth/captions",
        sub: "Clean captions that boost retention",
        subcategories: [
          { key: "srt", title: "SRT + Timing", icon: Captions, path: "/services/growth/captions/srt" },
          { key: "styles", title: "Caption Styles", icon: Sparkles, path: "/services/growth/captions/styles" },
        ],
      },
    ],
  },
];

export const findCategory = (key) => services.find((s) => s.key === key);
export const findItem = (categoryKey, itemKey) =>
  services.find((s) => s.key === categoryKey)?.items.find((i) => i.key === itemKey);

export const findSubcategory = (categoryKey, itemKey, subKey) =>
  services
    .find((s) => s.key === categoryKey)
    ?.items.find((i) => i.key === itemKey)
    ?.subcategories.find((sc) => sc.key === subKey);
