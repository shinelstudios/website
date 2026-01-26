import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";

/**
 * Scroll Progress Indicator
 * Shows reading progress as a thin bar at the top of the page
 */
const ScrollProgressBar = () => {
    const [scrollProgress, setScrollProgress] = useState(0);

    useEffect(() => {
        const updateScrollProgress = () => {
            const scrollPx = window.scrollY;
            const winHeightPx = document.documentElement.scrollHeight - document.documentElement.clientHeight;
            const scrolled = (scrollPx / winHeightPx) * 100;
            setScrollProgress(scrolled);
        };

        window.addEventListener("scroll", updateScrollProgress, { passive: true });
        updateScrollProgress(); // Initial call

        return () => window.removeEventListener("scroll", updateScrollProgress);
    }, []);

    return (
        <motion.div
            className="fixed top-0 left-0 right-0 h-1 z-50 origin-left"
            style={{
                background: "linear-gradient(90deg, #E85002, #ff6b35)",
                scaleX: scrollProgress / 100,
                transformOrigin: "0%",
            }}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: scrollProgress / 100 }}
            transition={{ duration: 0.1, ease: "linear" }}
        />
    );
};

export default ScrollProgressBar;
