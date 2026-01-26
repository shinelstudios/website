/**
 * Centralized configuration constants for Shinel Studios
 * All hardcoded values should be imported from here for easy maintenance
 */

// Contact Information
export const CONTACT = {
    email: 'hello@shinelstudiosofficial.com',
    phone: '918968141585',
    whatsappUrl: 'https://wa.me/918968141585',
    whatsappUrl: 'https://wa.me/918968141585',
    whatsappDefaultMessage: 'Hi Shinel Studios! I want to grow my channel. Can we talk?',
};

// API Configuration
export const AUTH_BASE = import.meta.env.VITE_API_URL || "https://shinel-auth.raghav-ka.workers.dev"; // Fallback to production worker

// Client Activity Registry (Pulse)
export const CLIENT_REGISTRY = [
    { id: 'kamz', name: 'Kamz Inkzone', youtubeId: 'UC_x5XG1OV2P6uZZ5FSM9Ttw' },
    { id: 'deadlox', name: 'Deadlox Gaming', youtubeId: 'UCbnkpVSNsBwET7mt1tgqEPQ' },
    { id: 'manav', name: 'Manav Sukhija', youtubeId: 'UCaQ_GBZe5lVZjXA_DkdTzKA' },
    { id: 'gamermummy', name: 'Gamer Mummy', youtubeId: 'UCj-L_n7qM9cO67bYkFzQyQ' },
    { id: 'c1', name: 'Client 1', youtubeId: 'UC_N0eSX2RI_ah-6MjJIAyzA' },
    { id: 'c2', name: 'Client 2', youtubeId: 'UCgA5LtJYZu7Y0AA3UpNxetw' },
    { id: 'c3', name: 'Client 3', youtubeId: 'UCxCm7PrHUc5yk7rJ' },
    { id: 'c4', name: 'Client 4', youtubeId: 'UCeKuPHM9XtsxORIliF5rc-Q' },
    { id: 'c5', name: 'Client 5', youtubeId: 'UC5SBHYm8lHaRd-nwJRNWkrA' },
    { id: 'vibnric', name: 'VibnRic', handle: '@VibnRic' },
    { id: 'c6', name: 'Client 6', youtubeId: 'UCi88JinGRWdVWQPFscNUgOw' }
];

export const CLIENT_PULSE_CONFIG = {
    expirationMs: 24 * 60 * 60 * 1000, // 24 hours
    pollIntervalMs: 30 * 60 * 1000,   // 30 minutes
};

// Social Media Links
export const SOCIAL_LINKS = {
    instagram: 'https://www.instagram.com/shinel.studios/',
    linkedin: 'https://www.linkedin.com/company/shinel-studios/',
    linktree: 'https://linktr.ee/ShinelStudios',
};

// Brand Information
export const BRAND = {
    name: 'Shinel Studios',
    tagline: 'AI-powered video editing for creators',
    domain: 'shinelstudiosofficial.com',
    logoLight: '/assets/logo_light.png',
    logoDark: '/assets/logo_dark.png',
};

// Timing Constants (in milliseconds)
export const TIMING = {
    exitIntentDwell: 45000, // 45 seconds (was 10 min)
    whatsappAutoMinimize: 3000, // 3 seconds
    scrollThrottle: 100, // 100ms
    animationDuration: 350, // 350ms
    userCooldownDays: 7,
};

// Scroll & Visibility Thresholds
export const THRESHOLDS = {
    whatsappShowScroll: 0.15, // Show after 15% scroll
    intersectionRatio: 0.05,
    touchTargetMinSize: 44, // 44px minimum for accessibility
};

// Turnaround Times (in hours/days)
export const TURNAROUND = {
    thumbnail: '24-48 hours',
    shortForm: '48-72 hours',
    longForm: '5-10 days',
    discoveryCall: '15-20 min',
    aiSetup: '1-2 days',
    pilotSprint: '7-10 days',
};

// Service Categories
export const SERVICES = {
    editing: 'Video Editing',
    thumbnails: 'Thumbnail Design',
    seo: 'SEO & Marketing',
    strategy: 'Content Strategy',
    aiTools: 'AI-Powered Tools',
};

// Color Palette - Cinematic Post-Production Theme
export const COLORS = {
    // Primary brand colors
    orange: '#E85002',
    orangeLight: '#ff9357',
    orangeRgb: '232, 80, 2',

    // Cinematic palette
    filmNoir: '#0A0A0A',        // Deep black backgrounds
    slate: '#1A1A1A',            // Dark slate for cards
    charcoal: '#2A2A2A',         // Lighter charcoal
    silver: '#C0C0C0',           // Film silver accents
    gold: '#D4AF37',             // Award gold
    crimson: '#DC143C',          // Director's cut red
    midnight: '#191970',         // Midnight blue

    // Gradients
    cinematic: 'linear-gradient(135deg, #0A0A0A 0%, #1A1A1A 100%)',
    spotlight: 'radial-gradient(circle at center, rgba(212,175,55,0.1) 0%, transparent 70%)',
    filmStrip: 'repeating-linear-gradient(90deg, #1A1A1A 0px, #1A1A1A 10px, #0A0A0A 10px, #0A0A0A 20px)',

    // WhatsApp
    whatsappGreen: '#25D366',
    whatsappGreenDark: '#128C7E',
};

// Typography System
export const TYPOGRAPHY = {
    display: "'Playfair Display', serif",  // Cinematic headers
    heading: "'Poppins', sans-serif",      // Section headings
    body: "'Inter', sans-serif",           // Body text
    mono: "'JetBrains Mono', monospace",   // Technical specs/code
};

// Responsive Breakpoints (Mobile-First)
export const BREAKPOINTS = {
    mobile: 375,      // iPhone SE
    mobileLg: 428,    // iPhone Pro Max
    tablet: 768,      // iPad
    desktop: 1024,    // Desktop
    wide: 1440,       // Wide desktop
    ultraWide: 1920,  // Ultra-wide
};

// Animation Configurations (CPU-Friendly)
export const ANIMATIONS = {
    // Fade animations (opacity only)
    fadeIn: {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.3, ease: 'easeOut' }
    },

    fadeInUp: {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: 20 },
        transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] }
    },

    fadeInDown: {
        initial: { opacity: 0, y: -20 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -20 },
        transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] }
    },

    // Scale animations (transform only)
    scaleIn: {
        initial: { opacity: 0, scale: 0.95 },
        animate: { opacity: 1, scale: 1 },
        exit: { opacity: 0, scale: 0.95 },
        transition: { duration: 0.3, ease: 'easeOut' }
    },

    // Slide animations
    slideInLeft: {
        initial: { opacity: 0, x: -30 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -30 },
        transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] }
    },

    slideInRight: {
        initial: { opacity: 0, x: 30 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: 30 },
        transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] }
    },

    // Stagger children
    staggerContainer: {
        animate: {
            transition: {
                staggerChildren: 0.1,
                delayChildren: 0.1
            }
        }
    },

    staggerFast: {
        animate: {
            transition: {
                staggerChildren: 0.05,
                delayChildren: 0.05
            }
        }
    },

    // Hover effects (desktop only)
    hoverLift: {
        whileHover: { y: -4, transition: { duration: 0.2 } },
        whileTap: { scale: 0.98 }
    },

    hoverScale: {
        whileHover: { scale: 1.02, transition: { duration: 0.2 } },
        whileTap: { scale: 0.98 }
    },
};

// Z-Index Scale
export const Z_INDEX = {
    base: 0,
    dropdown: 1000,
    sticky: 1020,
    fixed: 1030,
    modalBackdrop: 1040,
    modal: 1050,
    popover: 1060,
    tooltip: 1070,
};

// Spacing Scale (Mobile-First)
export const SPACING = {
    xs: '0.25rem',    // 4px
    sm: '0.5rem',     // 8px
    md: '1rem',       // 16px
    lg: '1.5rem',     // 24px
    xl: '2rem',       // 32px
    '2xl': '3rem',    // 48px
    '3xl': '4rem',    // 64px
    '4xl': '6rem',    // 96px
};

// Shadow System
export const SHADOWS = {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
    '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    cinematic: '0 30px 60px -15px rgba(10, 10, 10, 0.5)',
    glow: '0 0 20px rgba(232, 80, 2, 0.3)',
};

// Trust Badges
export const TRUST_BADGES = [
    'Reply in 24h',
    'Consent-first AI',
    'No spam',
    'Project files on request',
];

// Meta Tags
export const META = {
    title: 'Shinel Studios - AI-Powered Video Editing for YouTube Creators',
    description: 'Professional video editing, thumbnail design, and content strategy for YouTube creators. AI-assisted workflow with human creativity. Grow your channel with data-driven results.',
    keywords: 'video editing, youtube editing, thumbnail design, content strategy, AI video editing, youtube growth, creator services',
    ogImage: '/assets/og-image.jpg',
    twitterCard: 'summary_large_image',
    twitterSite: '@shinelstudios',
};

// Asset Paths
export const ASSETS = {
    testimonials: '/assets/testimonials/',
    caseStudies: '/assets/case_studies/',
    creators: '/assets/creators/',
    logos: '/assets/logos/',
    proofs: '/assets/proofs/',
};

// Error Messages
export const ERRORS = {
    generic: 'Something went wrong. Please try again.',
    network: 'Network error. Please check your connection.',
    assetLoad: 'Failed to load content. Please refresh the page.',
    formSubmit: 'Failed to submit form. Please try again.',
};

// Success Messages
export const SUCCESS = {
    formSubmit: 'Thank you! We\'ll get back to you within 24 hours.',
    calendlyBooked: 'Audit booked successfully! Check your email for confirmation.',
};

// Analytics Events
export const ANALYTICS_EVENTS = {
    ctaClickWhatsapp: 'cta_click_whatsapp',
    ctaClickEmail: 'cta_click_email',
    ctaClickAudit: 'cta_click_audit',
    videoPlay: 'video_play',
    formSubmit: 'form_submit',
    exitIntent: 'exit_intent_shown',
};

// Festival Database (Max 30% discount rule applied)
export const FESTIVAL_DATABASE = [
    {
        id: 'republic_day',
        name: 'Republic Day',
        month: 0, // Jan
        day: 26,
        durationDays: 2,
        discount: 26,
        code: 'JAIHIND',
        title: '77th Republic Day Special!',
        description: 'Celebrate Indian content with a massive boost.',
        theme: 'linear-gradient(90deg, #FF9933, #FFFFFF, #138808)',
        textColor: '#000',
        badgeColor: '#138808'
    },
    {
        id: 'valentines',
        name: 'Valentines Week',
        month: 1, // Feb
        day: 14,
        durationDays: 7,
        discount: 14,
        code: 'LOVE14',
        title: 'Share the Love!',
        description: 'Make your viewers fall in love with your videos.',
        theme: 'linear-gradient(90deg, #ff4d6d, #c9184a)',
        textColor: '#fff',
        badgeColor: '#590d22'
    },
    {
        id: 'holi',
        name: 'Holi Festival',
        month: 2, // March (approx for 2026)
        day: 3,
        durationDays: 3,
        discount: 30,
        code: 'COLOURS',
        title: 'Festival of Colours!',
        description: 'Add vibrant edits to your content library.',
        theme: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        textColor: '#fff',
        badgeColor: '#800080'
    },
    {
        id: 'independence_day',
        name: 'Independence Day',
        month: 7, // Aug
        day: 15,
        durationDays: 3,
        discount: 30,
        code: 'FREEDOM30',
        title: 'Independence Day Offer!',
        description: 'Free yourself from the stress of editing.',
        theme: 'linear-gradient(90deg, #FF9933, #FFFFFF, #138808)',
        textColor: '#000',
        badgeColor: '#138808'
    },
    {
        id: 'diwali',
        name: 'Diwali',
        month: 10, // Nov
        day: 8,
        durationDays: 5,
        discount: 30,
        code: 'DIWALI30',
        title: 'Festival of Lights!',
        description: 'Illuminating your channel with premium quality.',
        theme: 'linear-gradient(135deg, #FFD700, #FF8C00)',
        textColor: '#000',
        badgeColor: '#8B0000'
    },
    {
        id: 'halloween',
        name: 'Halloween',
        month: 9, // Oct
        day: 31,
        durationDays: 2,
        discount: 20,
        code: 'SPOOKY',
        title: 'Spooky Sharp Edits!',
        description: 'Quality so good it\'s scary. Limited slots.',
        theme: 'linear-gradient(90deg, #f97316, #000000)',
        textColor: '#fff',
        badgeColor: '#f97316'
    },
    {
        id: 'christmas',
        name: 'Christmas',
        month: 11, // Dec
        day: 25,
        durationDays: 4,
        discount: 25,
        code: 'XMAS25',
        title: 'Merry Content Creation!',
        description: 'A gift for your channel this holiday season.',
        theme: 'linear-gradient(90deg, #d42426, #165b33)',
        textColor: '#fff',
        badgeColor: '#ffffff'
    }
];

// Revision Policy
export const REVISIONS = {
    major: 1,
    minor: 2,
    description: 'Every video editing package includes 1 major revision and 2 minor revision rounds per video to ensure you\'re completely satisfied.',
};

export default {
    CONTACT,
    SOCIAL_LINKS,
    BRAND,
    TIMING,
    THRESHOLDS,
    TURNAROUND,
    SERVICES,
    COLORS,
    TYPOGRAPHY,
    BREAKPOINTS,
    ANIMATIONS,
    Z_INDEX,
    SPACING,
    SHADOWS,
    TRUST_BADGES,
    META,
    ASSETS,
    ERRORS,
    SUCCESS,
    ANALYTICS_EVENTS,
    REVISIONS,
    CLIENT_REGISTRY,
    CLIENT_PULSE_CONFIG,
};
