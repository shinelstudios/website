// src/components/AnimationWrapper.jsx
import React from 'react';
import { motion } from 'framer-motion';

/**
 * AnimationWrapper Component
 * 
 * Wraps Framer Motion animations with respect for user preferences:
 * - Respects prefers-reduced-motion
 * - Uses GPU-accelerated properties only
 * - Optimizes performance with will-change
 * 
 * @param {object} children - Child components to animate
 * @param {object} initial - Initial animation state
 * @param {object} animate - Animate to state
 * @param {object} exit - Exit animation state
 * @param {object} transition - Animation transition config
 * @param {boolean} disableReducedMotion - Force animation even if user prefers reduced motion
 */
export default function AnimationWrapper({
    children,
    initial,
    animate,
    exit,
    transition,
    disableReducedMotion = false,
    ...props
}) {
    const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false);

    React.useEffect(() => {
        // Check if user prefers reduced motion
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        setPrefersReducedMotion(mediaQuery.matches);

        // Listen for changes
        const handleChange = (e) => setPrefersReducedMotion(e.matches);
        mediaQuery.addEventListener('change', handleChange);

        return () => mediaQuery.removeEventListener('change', handleChange);
    }, []);

    // If user prefers reduced motion and we're not forcing animation
    if (prefersReducedMotion && !disableReducedMotion) {
        // Return children without animation
        return <div {...props}>{children}</div>;
    }

    // Optimize transition for performance
    const optimizedTransition = {
        ...transition,
        // Use GPU-accelerated properties
        type: transition?.type || 'tween',
        ease: transition?.ease || 'easeOut',
    };

    return (
        <motion.div
            initial={initial}
            animate={animate}
            exit={exit}
            transition={optimizedTransition}
            {...props}
        >
            {children}
        </motion.div>
    );
}

/**
 * Hook to check if user prefers reduced motion
 */
export function usePrefersReducedMotion() {
    const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false);

    React.useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        setPrefersReducedMotion(mediaQuery.matches);

        const handleChange = (e) => setPrefersReducedMotion(e.matches);
        mediaQuery.addEventListener('change', handleChange);

        return () => mediaQuery.removeEventListener('change', handleChange);
    }, []);

    return prefersReducedMotion;
}

/**
 * Optimized animation variants for common use cases
 */
export const optimizedVariants = {
    // Fade in/out (opacity only)
    fade: {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
    },

    // Slide up (transform only)
    slideUp: {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -20 },
    },

    // Slide down (transform only)
    slideDown: {
        initial: { opacity: 0, y: -20 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: 20 },
    },

    // Scale (transform only)
    scale: {
        initial: { opacity: 0, scale: 0.95 },
        animate: { opacity: 1, scale: 1 },
        exit: { opacity: 0, scale: 0.95 },
    },

    // Slide from left (transform only)
    slideLeft: {
        initial: { opacity: 0, x: -20 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: 20 },
    },

    // Slide from right (transform only)
    slideRight: {
        initial: { opacity: 0, x: 20 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -20 },
    },
};

/**
 * Optimized transition presets
 */
export const optimizedTransitions = {
    // Fast transition
    fast: {
        type: 'tween',
        duration: 0.2,
        ease: 'easeOut',
    },

    // Default transition
    default: {
        type: 'tween',
        duration: 0.3,
        ease: 'easeOut',
    },

    // Smooth transition
    smooth: {
        type: 'tween',
        duration: 0.4,
        ease: [0.4, 0, 0.2, 1], // Custom easing
    },

    // Spring transition (use sparingly)
    spring: {
        type: 'spring',
        stiffness: 300,
        damping: 30,
    },
};
