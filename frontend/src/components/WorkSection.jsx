import React from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import PortfolioItem from "./PortfolioItem";

/**
 * WorkSection - Reusable section for displaying service-specific work
 * Shows title, description, grid of projects, and link to full portfolio
 */
const WorkSection = ({ title, description, projects = [], links = [], gradient, index = 0 }) => {
    // Filter out undefined/invalid projects and limit to 6 for preview
    const displayProjects = projects
        .filter(p => p && p.id && p.image && p.title) // Only include valid projects
        .slice(0, 6);

    return (
        <section className="py-16 sm:py-20 relative overflow-hidden">
            {/* Background gradient */}
            <div
                className="absolute inset-0 opacity-5"
                style={{
                    background: gradient || "linear-gradient(135deg, rgba(232,80,2,0.1), transparent)",
                }}
            />

            <div className="container mx-auto px-4 relative z-10">
                {/* Header */}
                <motion.div
                    className="mb-12"
                    initial={{ opacity: 0, x: -30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.6 }}
                >
                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4" style={{ color: "var(--text)" }}>
                        {title}
                    </h2>
                    <p className="text-base sm:text-lg max-w-2xl" style={{ color: "var(--text-muted)" }}>
                        {description}
                    </p>
                </motion.div>

                {/* Projects Grid */}
                {displayProjects.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                        {displayProjects.map((project, i) => (
                            <motion.div
                                key={project.id}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: "-50px" }}
                                transition={{ duration: 0.5, delay: i * 0.1 }}
                            >
                                <PortfolioItem project={project} index={i} />
                            </motion.div>
                        ))}
                    </div>
                )}

                {/* View All Links */}
                {links.length > 0 && (
                    <motion.div
                        className="flex flex-wrap gap-4 justify-center"
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                    >
                        {links.map((link, i) => (
                            <Link key={i} to={link.path}>
                                <motion.button
                                    className="group relative overflow-hidden px-6 py-3 rounded-xl font-semibold text-sm sm:text-base transition-all duration-300"
                                    style={{
                                        background: "linear-gradient(135deg, var(--orange), #ff9357)",
                                        color: "#fff",
                                        border: "2px solid transparent",
                                    }}
                                    whileHover={{ scale: 1.05, y: -2 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    {/* Shimmer effect */}
                                    <motion.span
                                        className="absolute inset-0 pointer-events-none"
                                        initial={{ x: "-100%" }}
                                        whileHover={{ x: "100%" }}
                                        transition={{ duration: 0.6, ease: "linear" }}
                                        style={{
                                            background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)",
                                        }}
                                    />

                                    <span className="relative flex items-center gap-2">
                                        {link.label}
                                        <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                                    </span>
                                </motion.button>
                            </Link>
                        ))}
                    </motion.div>
                )}
            </div>
        </section>
    );
};

export default WorkSection;
