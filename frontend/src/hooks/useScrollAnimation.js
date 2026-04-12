import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from './useReducedMotion';

/**
 * Hook to trigger animations when element enters viewport
 * Uses Intersection Observer for performance
 */
export const useScrollAnimation = (options = {}) => {
    const {
        threshold = 0.1,
        rootMargin = '0px',
        triggerOnce = true,
    } = options;

    const elementRef = useRef(null);
    const [isVisible, setIsVisible] = useState(false);
    const prefersReducedMotion = useReducedMotion();

    useEffect(() => {
        const element = elementRef.current;
        if (!element) return;

        // Skip animation if user prefers reduced motion
        if (prefersReducedMotion) {
            setIsVisible(true);
            return;
        }

        // Check if IntersectionObserver is supported
        if (typeof IntersectionObserver === 'undefined') {
            setIsVisible(true);
            return;
        }

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    if (triggerOnce) {
                        observer.unobserve(element);
                    }
                } else if (!triggerOnce) {
                    setIsVisible(false);
                }
            },
            {
                threshold,
                rootMargin,
            }
        );

        observer.observe(element);

        return () => {
            if (element) {
                observer.unobserve(element);
            }
        };
    }, [threshold, rootMargin, triggerOnce, prefersReducedMotion]);

    return [elementRef, isVisible];
};

export default useScrollAnimation;
