import React from "react";
import { motion } from "framer-motion";
import { Award, TrendingUp, Users, Star } from "lucide-react";

/**
 * Media Mentions / "As Seen On" Component
 * Displays platform badges and recognition
 */
const MediaMentions = () => {
    const mentions = [
        {
            name: "Top Rated",
            icon: Star,
            description: "4.9/5 Rating",
            color: "#F16001",
        },
        {
            name: "Trusted by 100+",
            icon: Users,
            description: "Active Creators",
            color: "#E85002",
        },
        {
            name: "Proven Results",
            icon: TrendingUp,
            description: "+62% Avg CTR",
            color: "#E85002",
        },
        {
            name: "Professional",
            icon: Award,
            description: "Certified Team",
            color: "#C10801",
        },
    ];

    return (
        <section className="py-12 relative overflow-hidden" style={{ background: "var(--surface)" }}>
            <div className="container mx-auto px-4 relative z-10">
                <motion.div
                    className="text-center mb-8"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                >
                    <p className="text-sm font-semibold uppercase tracking-wider mb-6" style={{ color: "var(--text-muted)" }}>
                        Trusted & Recognized
                    </p>
                </motion.div>

                {/* Badges Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-5xl mx-auto">
                    {mentions.map((mention, idx) => {
                        const Icon = typeof mention.icon === "string" ? null : mention.icon;

                        return (
                            <motion.div
                                key={idx}
                                className="flex flex-col items-center text-center p-6 rounded-xl border"
                                style={{
                                    background: "var(--surface-alt)",
                                    borderColor: "var(--border)",
                                }}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: idx * 0.1 }}
                                whileHover={{ y: -4, borderColor: mention.color }}
                            >
                                {/* Icon */}
                                <div
                                    className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
                                    style={{ background: `${mention.color}15` }}
                                >
                                    {Icon ? (
                                        <Icon size={24} style={{ color: mention.color }} />
                                    ) : (
                                        <span className="text-2xl">{mention.icon}</span>
                                    )}
                                </div>

                                {/* Text */}
                                <h3 className="text-sm font-bold mb-1" style={{ color: "var(--text)" }}>
                                    {mention.name}
                                </h3>
                                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                                    {mention.description}
                                </p>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
};

export default MediaMentions;
