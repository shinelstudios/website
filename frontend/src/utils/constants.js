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

// Canonical extractYouTubeId now lives in utils/youtube.js. Re-exported here
// so existing `import { extractYouTubeId } from ".../constants"` keeps working.
// Note: the new implementation returns "" instead of null when no id is found.
export { extractYouTubeId } from "./youtube";
