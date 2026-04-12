import {
  X, Play, Image as IconImage, Zap, Wand2, PenTool, Bot, Megaphone, BarChart3, Quote, ExternalLink, MessageCircle, FileText, ChevronUp
} from "lucide-react";

/**
 * Centralized asset glob (Vite)
 */
export const ALL_ASSETS = import.meta.glob(
  "../assets/*.{png,jpg,jpeg,webp,svg}",
  { eager: true, query: "?url", import: "default" }
);

/** Find first asset whose basename contains key (case-insensitive) */
export const findAssetByBase = (key, map = ALL_ASSETS) => {
  if (!key) return null;
  const search = String(key).toLowerCase();
  for (const p in map) {
    const url = map[p];
    if (typeof url !== "string") continue;
    const file = p.split("/").pop() || "";
    const base = file.replace(/\.(png|jpe?g|webp|svg)$/i, "").toLowerCase();
    if (base.includes(search)) return map[p];
  }
  return null;
};

/** Tiny inline SVG placeholder */
export const svgPlaceholder = (label = "Image") => {
  const safe = String(label).replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='800' height='450' viewBox='0 0 800 450'>` +
    `<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>` +
    `<stop offset='0%' stop-color='#FFF1E8'/><stop offset='100%' stop-color='#FFE4D6'/></linearGradient></defs>` +
    `<rect fill='url(#g)' width='800' height='450'/>` +
    `<text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='#E85002' font-family='Poppins, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial' font-size='28' font-weight='700'>${safe}</text>` +
    `</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

/** Safe INR formatter (no decimals by default) */
export const formatINR = (num, options = {}) => {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
      ...options,
    }).format(Number(num || 0));
  } catch {
    return `₹${num}`;
  }
};

/** Lightweight analytics dispatcher (no-op safe) */
export const track = (ev, detail = {}) => {
  try { window.dispatchEvent(new CustomEvent("analytics", { detail: { ev, ...detail } })); } catch { }
};

/* Motion variants (shared) */
export const animations = {
  fadeDown: { hidden: { opacity: 0, y: -12 }, visible: { opacity: 1, y: 0, transition: { duration: .35, ease: "easeOut" } } },
  fadeUp: { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: .35, ease: "easeOut" } } },
  fadeIn: { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: .35, ease: "easeOut" } } },
  staggerParent: { hidden: {}, visible: { transition: { staggerChildren: .08 } } },
  scaleIn: { hidden: { opacity: 0, scale: .96, y: 8 }, visible: { opacity: 1, scale: 1, y: 0, transition: { duration: .25, ease: "easeOut" } } },
};

// card hover polish for grids
export const tiltHover = {
  whileHover: { y: -3, rotateX: 0.6, rotateY: -0.6 },
  transition: { type: "spring", stiffness: 240, damping: 18 }
};

// --- [FIX] ADDED MISSING EXPORTS ---
/* Resolve sample images via asset glob (fallbacks if missing) */
export const SAMPLE_BEFORE = findAssetByBase("sample_before") || svgPlaceholder("Before");
export const SAMPLE_AFTER = findAssetByBase("sample_after") || svgPlaceholder("After");