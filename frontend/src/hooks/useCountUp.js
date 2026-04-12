import { useState, useEffect, useRef } from "react";

/**
 * Custom hook for animated number counter
 * Counts from 0 to target value with easing
 * 
 * @param {number} target - Target number to count to
 * @param {number} duration - Animation duration in ms (default: 2000)
 * @param {boolean} trigger - When true, starts animation
 * @returns {number} Current count value
 */
export const useCountUp = (target, duration = 2000, trigger = false) => {
    const [count, setCount] = useState(0);
    const animationFrameRef = useRef(null);

    useEffect(() => {
        if (!trigger || target === 0) {
            setCount(target);
            return;
        }

        const startTime = Date.now();
        const startValue = 0;

        const animate = () => {
            const now = Date.now();
            const progress = Math.min((now - startTime) / duration, 1);

            // easeOutQuart easing function
            const eased = 1 - Math.pow(1 - progress, 4);
            const current = Math.floor(startValue + (target - startValue) * eased);

            setCount(current);

            if (progress < 1) {
                animationFrameRef.current = requestAnimationFrame(animate);
            } else {
                setCount(target);
                animationFrameRef.current = null;
            }
        };

        animationFrameRef.current = requestAnimationFrame(animate);

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [target, duration, trigger]);

    return count;
};

/**
 * Format number with suffix (K, M, B)
 * @param {number} num - Number to format
 * @returns {string} Formatted number
 */
export const formatNumber = (num) => {
    if (num >= 1_000_000_000) {
        return `${(num / 1_000_000_000).toFixed(1)}B`;
    }
    if (num >= 1_000_000) {
        return `${(num / 1_000_000).toFixed(1)}M`;
    }
    if (num >= 1_000) {
        return `${(num / 1_000).toFixed(1)}K`;
    }
    return num.toString();
};

/**
 * Hook to detect when element is in viewport
 * @param {Object} options - IntersectionObserver options
 * @returns {[React.RefObject, boolean]} Ref and isInView state
 */
export const useInView = (options = {}) => {
    const [isInView, setIsInView] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsInView(true);
                    // Once in view, stop observing
                    if (ref.current) {
                        observer.unobserve(ref.current);
                    }
                }
            },
            {
                threshold: 0.2,
                rootMargin: "0px",
                ...options,
            }
        );

        if (ref.current) {
            observer.observe(ref.current);
        }

        return () => {
            if (ref.current) {
                observer.unobserve(ref.current);
            }
        };
    }, [options]);

    return [ref, isInView];
};
