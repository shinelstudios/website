import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, X } from "lucide-react";

/**
 * Sticky Floating CTA Button
 * Appears after user scrolls past hero section
 * Minimizes to icon on mobile for better UX
 */
const StickyFloatingCTA = ({ onBook, scrollThreshold = 0.5 }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [isDismissed, setIsDismissed] = useState(false);

    useEffect(() => {
        // Check if user previously dismissed
        const dismissed = sessionStorage.getItem("sticky-cta-dismissed");
        if (dismissed) {
            setIsDismissed(true);
            return;
        }

        const handleScroll = () => {
            const scrollPercentage = window.scrollY / (document.documentElement.scrollHeight - window.innerHeight);

            // Hide when near footer
            const footer = document.querySelector("footer");
            if (footer) {
                const footerRect = footer.getBoundingClientRect();
                const isNearFooter = footerRect.top < window.innerHeight;
                setIsVisible(scrollPercentage > scrollThreshold && !isNearFooter);
            } else {
                setIsVisible(scrollPercentage > scrollThreshold);
            }
        };

        window.addEventListener("scroll", handleScroll, { passive: true });
        handleScroll(); // Initial check
        return () => window.removeEventListener("scroll", handleScroll);
    }, [scrollThreshold]);

    const handleDismiss = (e) => {
        e.stopPropagation();
        setIsDismissed(true);
        sessionStorage.setItem("sticky-cta-dismissed", "true");
    };

    const handleClick = () => {
        // Dispatch event in next tick to avoid state update warnings
        setTimeout(() => {
            if (typeof window !== "undefined") {
                window.dispatchEvent(new Event("calendly:open"));
            }
        }, 0);

        // Track analytics
        if (typeof window !== "undefined") {
            window.dispatchEvent(
                new CustomEvent("analytics", {
                    detail: { ev: "sticky_cta_click", scrollDepth: window.scrollY },
                })
            );
        }
        onBook?.();
    };

    const [isQQBVisible, setIsQQBVisible] = useState(false);

    useEffect(() => {
        const onQQB = (e) => setIsQQBVisible(e.detail.visible);
        document.addEventListener("qqb:visible", onQQB);
        return () => document.removeEventListener("qqb:visible", onQQB);
    }, []);

    if (isDismissed) return null;

    // Only show if scrolled past threshold AND QuickQuoteBar is NOT visible
    const shouldShow = isVisible && !isQQBVisible;

    return (
        <AnimatePresence>
            {shouldShow && (
                <motion.div
                    className="fixed bottom-32 right-4 z-30 md:bottom-6 md:right-6"
                    initial={{ opacity: 0, y: 100, scale: 0.8 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 100, scale: 0.8 }}
                    transition={{ type: "spring", stiffness: 260, damping: 20 }}
                >
                    {/* Desktop: Full Button */}
                    <div className="hidden md:block relative pt-4">
                        <motion.button
                            onClick={handleClick}
                            className="group relative px-8 py-4 rounded-full font-bold font-heading text-white shadow-2xl overflow-hidden"
                            style={{
                                background: "linear-gradient(135deg, #E85002, #F16001)",
                                boxShadow: "0 10px 40px rgba(232, 80, 2, 0.4)",
                            }}
                            whileHover={{ scale: 1.05, boxShadow: "0 15px 50px rgba(232, 80, 2, 0.5)" }}
                            whileTap={{ scale: 0.95 }}
                        >
                            {/* Shimmer effect */}
                            <div
                                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"
                                style={{
                                    willChange: "transform",
                                    transform: "translate3d(-100%, 0, 0)",
                                    WebkitTransform: "translate3d(-100%, 0, 0)",
                                }}
                                aria-hidden="true"
                            />

                            <span className="relative flex items-center gap-2">
                                Get Free Audit
                                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                            </span>
                        </motion.button>

                        {/* Dismiss button - outside main button */}
                        <button
                            onClick={handleDismiss}
                            className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-gray-800 text-white flex items-center justify-center hover:bg-gray-700 transition-colors z-10"
                            aria-label="Dismiss"
                        >
                            <X size={14} />
                        </button>

                        {/* Urgency badge - Repositioned to prevent overlap */}
                        <motion.div
                            className="absolute -top-4 left-4 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.15em] text-white whitespace-nowrap shadow-lg"
                            style={{
                                background: "linear-gradient(135deg, #C10801, #F16001)",
                                boxShadow: "0 4px 15px rgba(193, 8, 1, 0.4)"
                            }}
                            initial={{ y: -10, opacity: 0 }}
                            animate={{
                                y: [0, -4, 0],
                                opacity: 1
                            }}
                            transition={{
                                y: { duration: 3, repeat: Infinity, ease: "easeInOut" },
                                opacity: { delay: 0.3 }
                            }}
                        >
                            Limited Spots Left
                        </motion.div>
                    </div>

                    {/* Mobile: Minimized Icon Button */}
                    <div className="md:hidden relative">
                        <motion.button
                            onClick={isMinimized ? () => setIsMinimized(false) : handleClick}
                            className="relative w-16 h-16 rounded-full font-bold text-white shadow-2xl flex items-center justify-center"
                            style={{
                                background: "linear-gradient(135deg, #E85002, #F16001)",
                                boxShadow: "0 8px 30px rgba(232, 80, 2, 0.4)",
                            }}
                            whileTap={{ scale: 0.9 }}
                        >
                            <ArrowRight size={24} />

                            {/* Pulse animation */}
                            <motion.div
                                className="absolute inset-0 rounded-full"
                                style={{ border: "2px solid #E85002" }}
                                animate={{ scale: [1, 1.3, 1], opacity: [0.8, 0, 0.8] }}
                                transition={{ duration: 2, repeat: Infinity }}
                                aria-hidden="true"
                            />
                        </motion.button>

                        {/* Dismiss button - outside main button */}
                        <button
                            onClick={handleDismiss}
                            className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-gray-800 text-white flex items-center justify-center z-10"
                            aria-label="Dismiss"
                        >
                            <X size={12} />
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default StickyFloatingCTA;
