import { useState, useEffect } from 'react';

/**
 * Hook to detect if user prefers reduced motion
 * Respects system accessibility settings
 */
export const useReducedMotion = () => {
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

    useEffect(() => {
        // Check if matchMedia is supported
        if (typeof window === 'undefined' || !window.matchMedia) {
            return;
        }

        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

        // Set initial value
        setPrefersReducedMotion(mediaQuery.matches);

        // Listen for changes
        const handleChange = (event) => {
            setPrefersReducedMotion(event.matches);
        };

        // Add listener (with fallback for older browsers)
        if (mediaQuery.addEventListener) {
            mediaQuery.addEventListener('change', handleChange);
        } else {
            mediaQuery.addListener(handleChange);
        }

        // Cleanup
        return () => {
            if (mediaQuery.removeEventListener) {
                mediaQuery.removeEventListener('change', handleChange);
            } else {
                mediaQuery.removeListener(handleChange);
            }
        };
    }, []);

    return prefersReducedMotion;
};

export default useReducedMotion;
