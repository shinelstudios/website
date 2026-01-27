// src/utils/constants.js

export const VIDEO_CATEGORIES = [
    "GAMING",
    "VLOG",
    "LIFESTYLE",
    "TECH",
    "MUSIC",
    "EDUCATION",
    "OTHER"
];

export const VIDEO_KINDS = [
    "LONG",
    "SHORT",
    "REEL",
    "BRIEF"
];

export const THUMBNAIL_VARIANTS = [
    "VIDEO",
    "LIVE",
    "CONCEPT",
    "A/B TEST"
];

// Helper to validate project attribution (must be a valid email or handle format)
export const validateAttribution = (input = "") => {
    if (!input) return null; // attribution is optional
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const handleRegex = /^@?[\w.]+$/;

    if (emailRegex.test(input)) return null;
    if (handleRegex.test(input)) return null;

    return "Must be a valid email (editor@shinel.in) or handle (@editor)";
};

// Helper to auto-preview YouTube
export const extractYouTubeId = (url) => {
    if (!url) return null;
    try {
        const u = new URL(url);
        if (u.hostname.includes("youtu.be")) return u.pathname.slice(1);
        if (u.hostname.includes("youtube.com")) {
            const v = u.searchParams.get("v");
            if (v) return v;
            const m = u.pathname.match(/\/shorts\/([^/]+)/);
            if (m) return m[1];
        }
    } catch { }
    return null;
};
