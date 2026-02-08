/**
 * Centralized configuration constants for Shinel Studios
 * All hardcoded values should be imported from here for easy maintenance
 */

// Contact Information
export const CONTACT = {
    email: 'shinelstudioofficial@gmail.com',
    phone: '918968141585',
    phoneFormatted: '+91 89681 41585',
    whatsappUrl: 'https://wa.me/918968141585',
    whatsappDefaultMessage: 'Hi Shinel Studios! I want to grow my channel. Can we talk?',
};

// API Configuration
export const AUTH_BASE = import.meta.env.VITE_AUTH_BASE || "https://shinel-auth.shinelstudioofficial.workers.dev";
export const CAPTIONS_API_BASE = import.meta.env.VITE_CAPTIONS_API_BASE || AUTH_BASE;

// Client Activity Registry (Pulse)
export const CLIENT_REGISTRY = [
    { id: 'kamz', name: 'Kamz Inkzone', youtubeId: 'UC_N0eSX2RI_ah-6MjJIAyzA', subscribers: 173445, creatorEmail: 'kamz@shinelstudios.com' },
    { id: 'deadlox', name: 'Deadlox Gaming', youtubeId: 'UCi88JinGRWdVWQPFscNUgOw', subscribers: 7600, creatorEmail: 'deadlox@shinelstudios.com' },
    { id: 'maggielive', name: 'Maggie Live', youtubeId: 'UCaQ_GBZe5lVZjXA_DkdTzKA', subscribers: 21300, creatorEmail: 'maggie@shinelstudios.com' },
    { id: 'gamermummy', name: 'Gamer Mummy', youtubeId: 'UCDLYqESVrBFdTDE8O_Z4Ysg', subscribers: 15500, creatorEmail: 'mummy@shinelstudios.com' },
    { id: 'aishislive', name: 'Aish is Live', youtubeId: 'UC5SBHYm8lHaRd-nwJRNWkrA', subscribers: 17100, creatorEmail: 'aishi@shinelstudios.com' },
    { id: 'katkagaming', name: 'Katka Gaming', youtubeId: 'UCxCm7PrHUc5yk7rJIh9j72A', subscribers: 38600, creatorEmail: 'katka@shinelstudios.com' },
    { id: 'anchit', name: 'Gamify With Anchit', youtubeId: 'UCeKuPHM9XtsxORIliF5rc-Q', subscribers: 1420, creatorEmail: 'anchit@shinelstudios.com' },
    { id: 'kundan', name: 'Kundan Parashar', youtubeId: 'UCgA5LtJYZu7Y0AA3UpNxetw', subscribers: 8490, creatorEmail: 'kundan@shinelstudios.com' },
    { id: 'manav', name: 'Manav Sukhija', youtubeId: 'UCaQ_GBZe5lVZjXA_DkdTzKA', subscribers: 21300, creatorEmail: 'manav@shinelstudios.com' },
    { id: 'vibnric', name: 'VibnRic', youtubeId: 'UC5XTxQsO3KapW09nOVE1TJQ', subscribers: 5850, creatorEmail: 'vibnric@shinelstudios.com' }
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
    domain: 'www.shinelstudios.in',
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

// Color Palette - Official Shinel Studios Brand Palette
export const COLORS = {
    // Primary brand colors
    orange: '#E85002',
    black: '#000000',
    white: '#F9F9F9',
    gray: '#646464',
    lightGray: '#A7A7A7',
    darkGray: '#333333',

    // Functional theme-aware exports
    text: 'var(--text)',
    textMuted: 'var(--text-muted)',
    surface: 'var(--surface)',
    surfaceAlt: 'var(--surface-alt)',
    border: 'var(--border)',

    // Gradients
    brandGradient: 'linear-gradient(90deg, #000000, #C10801, #F16001, #D9C3AB)',
    cinematic: 'var(--gradient-cinematic)',
    spotlight: 'var(--gradient-spotlight)',
    filmStrip: 'var(--gradient-film-strip)',

    // WhatsApp
    whatsappGreen: '#25D366',
    whatsappGreenDark: '#128C7E',
};

// Typography System - Three Creative Fonts with Variations
export const TYPOGRAPHY = {
    display: "'Outfit', sans-serif",        // Display text and main headings (bold, impactful)
    heading: "'Outfit', sans-serif",        // Section headings (same as display for consistency)
    body: "'Inter', sans-serif",            // Body text and UI elements (readable, clean)
    accent: "'Space Grotesk', sans-serif",  // Accent text and special elements (modern, geometric)
    mono: "'Space Grotesk', monospace",     // Technical specs (using Space Grotesk for consistency)
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
    keywords: 'video editing, youtube editing, thumbnail design, content strategy, AI video editing, youtube growth, creator services, Kamz Inkzone video editor, Deadlox Gaming thumbnails, Manav Sukhija editing, Gamer Mummy visuals, youtube growth agency India',
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
// Expanded with major Hindu and Indian festivals
export const FESTIVAL_DATABASE = [
    {
        id: 'makar_sankranti',
        name: 'Makar Sankranti',
        month: 0, // Jan
        day: 14,
        durationDays: 2,
        discount: 20,
        code: 'HARVEST20',
        title: 'Harvest Festival Special!',
        description: 'Celebrate the harvest season with fresh content.',
        theme: 'linear-gradient(135deg, #FFD700, #FFA500, #FF8C00)',
        textColor: '#000',
        badgeColor: '#8B4513'
    },
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
        id: 'maha_shivratri',
        name: 'Maha Shivratri',
        month: 1, // Feb
        day: 15,
        durationDays: 2,
        discount: 25,
        code: 'SHIVA25',
        title: 'Maha Shivratri Blessings!',
        description: 'Divine content for your channel.',
        theme: 'linear-gradient(135deg, #4A148C, #7B1FA2, #9C27B0)',
        textColor: '#fff',
        badgeColor: '#FFD700'
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
        id: 'ram_navami',
        name: 'Ram Navami',
        month: 3, // April (approx April 6 in 2026)
        day: 6,
        durationDays: 2,
        discount: 20,
        code: 'RAM20',
        title: 'Ram Navami Special!',
        description: 'Victory of good over evil in your content.',
        theme: 'linear-gradient(135deg, #FF6B6B, #FFD93D, #6BCB77)',
        textColor: '#000',
        badgeColor: '#C70039'
    },
    {
        id: 'raksha_bandhan',
        name: 'Raksha Bandhan',
        month: 7, // Aug (approx Aug 3 in 2026)
        day: 3,
        durationDays: 2,
        discount: 20,
        code: 'RAKHI20',
        title: 'Raksha Bandhan Offer!',
        description: 'Protect your channel with quality content.',
        theme: 'linear-gradient(135deg, #FF6B9D, #C06C84, #F67280)',
        textColor: '#fff',
        badgeColor: '#FFD700'
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
        id: 'janmashtami',
        name: 'Janmashtami',
        month: 7, // Aug (approx Aug 26 in 2026)
        day: 26,
        durationDays: 2,
        discount: 25,
        code: 'KRISHNA25',
        title: 'Janmashtami Special!',
        description: 'Divine creativity for your channel.',
        theme: 'linear-gradient(135deg, #1E3A8A, #3B82F6, #60A5FA)',
        textColor: '#fff',
        badgeColor: '#FFD700'
    },
    {
        id: 'ganesh_chaturthi',
        name: 'Ganesh Chaturthi',
        month: 8, // Sep (approx Sep 7 in 2026)
        day: 7,
        durationDays: 3,
        discount: 25,
        code: 'GANESH25',
        title: 'Ganesh Chaturthi Blessings!',
        description: 'Remove obstacles from your content journey.',
        theme: 'linear-gradient(135deg, #FF6B35, #F7931E, #FDC830)',
        textColor: '#000',
        badgeColor: '#C70039'
    },
    {
        id: 'navratri',
        name: 'Navratri',
        month: 9, // Oct (approx Oct 3 in 2026)
        day: 3,
        durationDays: 9,
        discount: 30,
        code: 'NAVRATRI30',
        title: '9 Nights of Savings!',
        description: 'Celebrate with divine discounts.',
        theme: 'linear-gradient(135deg, #FF0080, #FF8C00, #FFD700)',
        textColor: '#fff',
        badgeColor: '#8B0000'
    },
    {
        id: 'diwali',
        name: 'Diwali',
        month: 10, // Nov (approx Nov 8 in 2026)
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
        id: 'guru_nanak_jayanti',
        name: 'Guru Nanak Jayanti',
        month: 10, // Nov (approx Nov 15 in 2026)
        day: 15,
        durationDays: 2,
        discount: 20,
        code: 'GURUPURAB',
        title: 'Guru Nanak Jayanti Special!',
        description: 'Wisdom and creativity for your content.',
        theme: 'linear-gradient(135deg, #FF9933, #FFFFFF, #138808)',
        textColor: '#000',
        badgeColor: '#000080'
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
