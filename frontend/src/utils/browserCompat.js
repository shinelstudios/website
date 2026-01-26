/**
 * Cross-Browser Compatibility Utilities
 * Ensures consistent behavior across all browsers and devices
 */

/**
 * Check if browser supports a CSS feature
 * @param {string} property - CSS property to check
 * @param {string} value - CSS value to check
 * @returns {boolean}
 */
export const supportsCSSFeature = (property, value) => {
    if (typeof window === "undefined" || !window.CSS || !window.CSS.supports) {
        return false;
    }
    return window.CSS.supports(property, value);
};

/**
 * Get safe transform value with vendor prefixes
 * @param {string} transform - Transform value
 * @returns {Object} Style object with vendor prefixes
 */
export const getSafeTransform = (transform) => {
    return {
        transform,
        WebkitTransform: transform,
        MozTransform: transform,
        msTransform: transform,
    };
};

/**
 * Check if user prefers reduced motion
 * @returns {boolean}
 */
export const prefersReducedMotion = () => {
    if (typeof window === "undefined") return false;
    return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches || false;
};

/**
 * Get safe backdrop filter with fallback
 * @param {string} filter - Filter value
 * @returns {Object} Style object
 */
export const getSafeBackdropFilter = (filter) => {
    const supportsBackdrop = supportsCSSFeature("backdrop-filter", filter);

    if (supportsBackdrop) {
        return {
            backdropFilter: filter,
            WebkitBackdropFilter: filter,
        };
    }

    // Fallback for browsers that don't support backdrop-filter
    return {
        background: "rgba(255, 255, 255, 0.9)",
    };
};

/**
 * Detect iOS device
 * @returns {boolean}
 */
export const isIOS = () => {
    if (typeof window === "undefined") return false;
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
};

/**
 * Detect Safari browser
 * @returns {boolean}
 */
export const isSafari = () => {
    if (typeof window === "undefined") return false;
    return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
};

/**
 * Get safe animation duration based on user preferences
 * @param {number} duration - Desired duration in ms
 * @returns {number} Safe duration
 */
export const getSafeAnimationDuration = (duration) => {
    return prefersReducedMotion() ? 0 : duration;
};

/**
 * Add passive event listener with fallback
 * @param {Element} element - DOM element
 * @param {string} event - Event name
 * @param {Function} handler - Event handler
 * @param {Object} options - Event options
 */
export const addPassiveEventListener = (element, event, handler, options = {}) => {
    let passiveSupported = false;

    try {
        const opts = Object.defineProperty({}, "passive", {
            get() {
                passiveSupported = true;
                return true;
            },
        });
        window.addEventListener("test", null, opts);
        window.removeEventListener("test", null, opts);
    } catch (e) {
        passiveSupported = false;
    }

    element.addEventListener(
        event,
        handler,
        passiveSupported ? { passive: true, ...options } : false
    );
};

/**
 * Request animation frame with fallback
 * @param {Function} callback - Animation callback
 * @returns {number} Request ID
 */
export const safeRequestAnimationFrame = (callback) => {
    if (typeof window === "undefined") return 0;

    return (
        window.requestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        function (cb) {
            return window.setTimeout(cb, 1000 / 60);
        }
    )(callback);
};

/**
 * Cancel animation frame with fallback
 * @param {number} id - Request ID
 */
export const safeCancelAnimationFrame = (id) => {
    if (typeof window === "undefined") return;

    (
        window.cancelAnimationFrame ||
        window.webkitCancelAnimationFrame ||
        window.mozCancelAnimationFrame ||
        window.clearTimeout
    )(id);
};

/**
 * Get viewport dimensions safely
 * @returns {Object} Width and height
 */
export const getViewportDimensions = () => {
    if (typeof window === "undefined") {
        return { width: 0, height: 0 };
    }

    return {
        width: Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0),
        height: Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0),
    };
};

/**
 * Check if element is in viewport
 * @param {Element} element - DOM element
 * @param {number} threshold - Visibility threshold (0-1)
 * @returns {boolean}
 */
export const isElementInViewport = (element, threshold = 0) => {
    if (!element) return false;

    const rect = element.getBoundingClientRect();
    const windowHeight = window.innerHeight || document.documentElement.clientHeight;
    const windowWidth = window.innerWidth || document.documentElement.clientWidth;

    const vertInView = rect.top <= windowHeight && rect.top + rect.height * threshold >= 0;
    const horInView = rect.left <= windowWidth && rect.left + rect.width * threshold >= 0;

    return vertInView && horInView;
};

export default {
    supportsCSSFeature,
    getSafeTransform,
    prefersReducedMotion,
    getSafeBackdropFilter,
    isIOS,
    isSafari,
    getSafeAnimationDuration,
    addPassiveEventListener,
    safeRequestAnimationFrame,
    safeCancelAnimationFrame,
    getViewportDimensions,
    isElementInViewport,
};
