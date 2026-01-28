import React from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

/**
 * ServiceCard - Large service overview card
 * Shows service icon, title, tagline, and link
 * Includes hover animations and gradient background
 */
const ServiceCard = ({ service, onClick, index = 0 }) => {
    const Icon = service.icon;

    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            whileHover={{ y: -8, scale: 1.02 }}
            onClick={onClick}
            className="group relative overflow-hidden rounded-2xl p-8 cursor-pointer border-2 transition-all duration-300"
            style={{
                background: service.gradient || "var(--surface)",
                borderColor: "var(--border)",
            }}
        >
            {/* Hover glow effect */}
            <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                style={{
                    background: `radial-gradient(circle at center, ${service.gradient || "rgba(232,80,2,0.1)"}, transparent 70%)`,
                    filter: "blur(20px)",
                }}
            />

            {/* Content */}
            <div className="relative z-10">
                {/* Icon */}
                <motion.div
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center mb-6"
                    style={{
                        background: "rgba(255,255,255,0.1)",
                        backdropFilter: "blur(10px)",
                    }}
                    whileHover={{ rotate: 5 }}
                    transition={{ duration: 0.3 }}
                >
                    <Icon size={40} style={{ color: "var(--orange)" }} />
                </motion.div>

                {/* Title */}
                <h3 className="text-2xl sm:text-3xl font-bold mb-3" style={{ color: "var(--text)" }}>
                    {service.title}
                </h3>

                {/* Tagline */}
                <p className="text-sm sm:text-base mb-6" style={{ color: "var(--text-muted)" }}>
                    {service.tagline}
                </p>

                {/* Services list */}
                <div className="flex flex-wrap gap-2 mb-6">
                    {service.items?.map((item, i) => (
                        <span
                            key={i}
                            className="px-3 py-1 rounded-full text-xs font-medium"
                            style={{
                                background: "rgba(255,255,255,0.1)",
                                color: "var(--text)",
                                border: "1px solid rgba(255,255,255,0.2)",
                            }}
                        >
                            {item.title}
                        </span>
                    ))}
                </div>

                {/* View button */}
                <motion.div
                    className="flex items-center gap-2 text-sm font-semibold"
                    style={{ color: "var(--orange)" }}
                    whileHover={{ gap: "12px" }}
                >
                    <span>View Work</span>
                    <ArrowRight size={16} />
                </motion.div>
            </div>

            {/* Shimmer effect on hover */}
            <motion.div
                className="absolute inset-0 pointer-events-none"
                initial={{ x: "-100%" }}
                whileHover={{ x: "100%" }}
                transition={{ duration: 0.6, ease: "easeInOut" }}
                style={{
                    background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)",
                }}
            />
        </motion.div>
    );
};

export default ServiceCard;
