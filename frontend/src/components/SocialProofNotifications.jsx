import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Users, TrendingUp } from "lucide-react";

/**
 * Social Proof Notifications
 * Shows real-time (or simulated) booking/activity notifications
 * Appears bottom-left, non-intrusive
 */

const NOTIFICATION_TEMPLATES = [
    {
        icon: CheckCircle2,
        message: "Someone from {city} just booked a free audit",
        color: "#E85002",
    },
    {
        icon: TrendingUp,
        message: "{name} saw +{metric}% CTR improvement",
        color: "#E85002",
    },
    {
        icon: Users,
        message: "{count} creators joined this week",
        color: "#C10801",
    },
];

const CITIES = ["Mumbai", "Delhi", "Bangalore", "Hyderabad", "Pune", "Chennai", "Kolkata"];
const NAMES = ["Raj", "Priya", "Arjun", "Sneha", "Vikram", "Ananya", "Rohan"];
const METRICS = [62, 78, 45, 94, 38, 52];

const SocialProofNotifications = ({ interval = 12000, enabled = true }) => {
    const [currentNotification, setCurrentNotification] = useState(null);
    const [isVisible, setIsVisible] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    // Detect mobile
    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener("resize", checkMobile);
        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    const generateNotification = useCallback(() => {
        const template = NOTIFICATION_TEMPLATES[Math.floor(Math.random() * NOTIFICATION_TEMPLATES.length)];
        const city = CITIES[Math.floor(Math.random() * CITIES.length)];
        const name = NAMES[Math.floor(Math.random() * NAMES.length)];
        const metric = METRICS[Math.floor(Math.random() * METRICS.length)];
        const count = Math.floor(Math.random() * 15) + 5;

        let message = template.message
            .replace("{city}", city)
            .replace("{name}", name)
            .replace("{metric}", metric)
            .replace("{count}", count);

        return {
            ...template,
            message,
            id: Date.now(),
        };
    }, []);

    useEffect(() => {
        if (!enabled) return;

        // Initial delay before first notification
        const initialTimeout = setTimeout(() => {
            setCurrentNotification(generateNotification());
            setIsVisible(true);
        }, 5000);

        return () => clearTimeout(initialTimeout);
    }, [enabled, generateNotification]);

    useEffect(() => {
        if (!enabled || !isVisible) return;

        // Hide after 5 seconds
        const hideTimeout = setTimeout(() => {
            setIsVisible(false);
        }, 5000);

        // Show next notification after interval
        const nextTimeout = setTimeout(() => {
            setCurrentNotification(generateNotification());
            setIsVisible(true);
        }, interval);

        return () => {
            clearTimeout(hideTimeout);
            clearTimeout(nextTimeout);
        };
    }, [isVisible, enabled, interval, generateNotification]);

    if (!currentNotification || isMobile) return null;

    const Icon = currentNotification.icon;

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    className="fixed bottom-6 left-6 z-20 max-w-sm"
                    initial={{ opacity: 0, x: -100, y: 20 }}
                    animate={{ opacity: 1, x: 0, y: 0 }}
                    exit={{ opacity: 0, x: -100, y: 20 }}
                    transition={{ type: "spring", stiffness: 200, damping: 25 }}
                >
                    <div
                        className="flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl backdrop-blur-xl border"
                        style={{
                            background: "rgba(255, 255, 255, 0.95)",
                            borderColor: "rgba(0, 0, 0, 0.1)",
                        }}
                    >
                        {/* Icon */}
                        <div
                            className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
                            style={{
                                background: `${currentNotification.color}15`,
                            }}
                        >
                            <Icon size={20} style={{ color: currentNotification.color }} />
                        </div>

                        {/* Message */}
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 leading-tight">
                                {currentNotification.message}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">Just now</p>
                        </div>

                        {/* Pulse indicator */}
                        <div className="flex-shrink-0">
                            <motion.div
                                className="w-2 h-2 rounded-full"
                                style={{ background: currentNotification.color }}
                                animate={{ scale: [1, 1.3, 1], opacity: [1, 0.5, 1] }}
                                transition={{ duration: 2, repeat: Infinity }}
                            />
                        </div>
                    </div>

                    {/* Dark mode variant */}
                    <style dangerouslySetInnerHTML={{
                        __html: `
            @media (prefers-color-scheme: dark) {
              .fixed > div {
                background: rgba(15, 15, 15, 0.95) !important;
                border-color: rgba(255, 255, 255, 0.1) !important;
              }
              .fixed p {
                color: #fff !important;
              }
              .fixed p.text-gray-500 {
                color: #9ca3af !important;
              }
            }
          `}} />
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default SocialProofNotifications;
