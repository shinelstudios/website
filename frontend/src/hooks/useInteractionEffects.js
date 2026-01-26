import { useEffect, useState, useRef } from "react";

/**
 * Custom hook for magnetic cursor effect
 * Attracts cursor towards element on proximity
 * Desktop only for better UX
 * 
 * @param {number} strength - Attraction strength (default: 0.3)
 * @param {number} radius - Attraction radius in pixels (default: 100)
 * @returns {[React.RefObject, Object]} Ref and transform style
 */
export const useMagneticCursor = (strength = 0.3, radius = 100) => {
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isHovered, setIsHovered] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        // Only enable on desktop
        if (window.matchMedia("(max-width: 768px)").matches) {
            return;
        }

        const element = ref.current;
        if (!element) return;

        const handleMouseMove = (e) => {
            const rect = element.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;

            const distanceX = e.clientX - centerX;
            const distanceY = e.clientY - centerY;
            const distance = Math.sqrt(distanceX ** 2 + distanceY ** 2);

            if (distance < radius) {
                setIsHovered(true);
                const pullX = distanceX * strength;
                const pullY = distanceY * strength;
                setPosition({ x: pullX, y: pullY });
            } else {
                setIsHovered(false);
                setPosition({ x: 0, y: 0 });
            }
        };

        const handleMouseLeave = () => {
            setIsHovered(false);
            setPosition({ x: 0, y: 0 });
        };

        document.addEventListener("mousemove", handleMouseMove);
        element.addEventListener("mouseleave", handleMouseLeave);

        return () => {
            document.removeEventListener("mousemove", handleMouseMove);
            element.removeEventListener("mouseleave", handleMouseLeave);
        };
    }, [strength, radius]);

    const transform = {
        transform: `translate(${position.x}px, ${position.y}px)`,
        transition: isHovered ? "transform 0.2s ease-out" : "transform 0.4s ease-out",
    };

    return [ref, transform];
};

/**
 * Custom hook for parallax scroll effect
 * Moves element at different speed than scroll
 * 
 * @param {number} speed - Parallax speed multiplier (default: 0.5)
 * @returns {[React.RefObject, Object]} Ref and transform style
 */
export const useParallax = (speed = 0.5) => {
    const [offset, setOffset] = useState(0);
    const ref = useRef(null);

    useEffect(() => {
        const handleScroll = () => {
            if (!ref.current) return;

            const rect = ref.current.getBoundingClientRect();
            const scrolled = window.scrollY;
            const elementTop = rect.top + scrolled;
            const windowHeight = window.innerHeight;

            // Only calculate parallax when element is in viewport
            if (scrolled + windowHeight > elementTop && scrolled < elementTop + rect.height) {
                const parallaxOffset = (scrolled - elementTop) * speed;
                setOffset(parallaxOffset);
            }
        };

        window.addEventListener("scroll", handleScroll, { passive: true });
        handleScroll(); // Initial call

        return () => window.removeEventListener("scroll", handleScroll);
    }, [speed]);

    const transform = {
        transform: `translateY(${offset}px)`,
        willChange: "transform",
    };

    return [ref, transform];
};

export default { useMagneticCursor, useParallax };
