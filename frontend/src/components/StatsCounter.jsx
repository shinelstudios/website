import React, { useEffect, useState, useRef } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";

/**
 * StatsCounter - Animated number counter
 * Counts from 0 to target value when scrolled into view
 * CPU-friendly using requestAnimationFrame
 */
const StatsCounter = ({ end, duration = 2000, suffix = "", prefix = "", label }) => {
    const [count, setCount] = useState(0);
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-100px" });
    const prefersReducedMotion = useReducedMotion();

    useEffect(() => {
        if (!isInView) return;

        // Instant count for reduced motion
        if (prefersReducedMotion) {
            setCount(end);
            return;
        }

        const startTime = Date.now();
        const startValue = 0;

        const animate = () => {
            const now = Date.now();
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Easing function (easeOutCubic)
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = Math.floor(startValue + (end - startValue) * eased);

            setCount(current);

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    }, [isInView, end, duration, prefersReducedMotion]);

    return (
        <motion.div
            ref={ref}
            className="text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
        >
            <div className="text-3xl sm:text-4xl md:text-5xl font-bold mb-2" style={{ color: "var(--orange)" }}>
                {prefix}{count.toLocaleString()}{suffix}
            </div>
            <div className="text-sm sm:text-base text-[var(--text-muted)] font-medium">
                {label}
            </div>
        </motion.div>
    );
};

export default StatsCounter;
