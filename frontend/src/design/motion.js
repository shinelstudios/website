/**
 * motion.js — shared framer-motion presets for the redesign.
 * All timings and easings used across the editorial system live here.
 * Single source of truth: changing a value here propagates everywhere.
 */

export const easeEditorial = [0.22, 1, 0.36, 1];
export const easeSmooth = [0.4, 0, 0.2, 1];
export const easeSnap = [0.33, 1, 0.68, 1];

export const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, ease: easeEditorial },
};

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { duration: 0.6, ease: easeSmooth },
};

export const scaleIn = {
  initial: { opacity: 0, scale: 0.96 },
  animate: { opacity: 1, scale: 1 },
  transition: { duration: 0.5, ease: easeEditorial },
};

export const staggerParent = (childStagger = 0.08, delayChildren = 0.05) => ({
  initial: {},
  animate: {
    transition: { staggerChildren: childStagger, delayChildren },
  },
});

export const staggerChild = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: easeEditorial },
};

export const tapSpring = {
  whileTap: { scale: 0.98 },
  transition: { type: "spring", stiffness: 400, damping: 25 },
};

export const hoverLift = {
  whileHover: { y: -2 },
  transition: { duration: 0.2, ease: easeSmooth },
};

/**
 * viewportOnce — sensible default for scroll-reveal once-only animations.
 * 200px rootMargin ensures animations start before element fully visible,
 * so content is "ready" by the time user scrolls to it.
 */
export const viewportOnce = { once: true, margin: "0px 0px -100px 0px" };
