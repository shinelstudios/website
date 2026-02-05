// src/components/ResourcesSection.jsx
import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Calculator, Layout, FileText, Search, ArrowRight, Shield } from "lucide-react";

const RESOURCES = [
    {
        title: "ROI & CTR Calculator",
        desc: "Calculate potential views and revenue lift from better packaging.",
        to: "/roi-calculator",
        icon: Calculator,
        color: "var(--orange)",
    },
    {
        title: "A/B Thumbnail Previewer",
        desc: "Test your designs in a simulated YouTube feed before uploading.",
        to: "/tools/thumbnail-previewer",
        icon: Layout,
        color: "#ff9357",
    },
    /* {
        title: "Caption/SRT Builder",
        desc: "Fast, local tool to build perfectly timed subtitles for your edits.",
        to: "/tools/srt",
        icon: FileText,
        color: "#4ade80",
    }, */
    {
        title: "YouTube SEO Optimizer",
        desc: "Generate high-CTR titles, tags, and semantic descriptions.",
        to: "/tools/seo",
        icon: Search,
        color: "#60a5fa",
    }
];

export default function ResourcesSection() {
    return (
        <section className="py-24 bg-[var(--surface-alt)]">
            <div className="container mx-auto px-4 max-w-6xl">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                    <div className="max-w-xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest bg-orange-500/10 text-[var(--orange)] border border-orange-500/20 mb-4">
                            <Shield size={12} /> Creator Essentials
                        </div>
                        <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter leading-none mb-4">
                            Free <span className="text-[var(--orange)]">Growth</span> Tools
                        </h2>
                        <p className="text-[var(--text-muted)] text-lg">
                            We build tools to help our clients scale. Now, we're making them public for the creator community to use for free.
                        </p>
                    </div>
                    <Link
                        to="/tools"
                        className="group flex items-center gap-2 text-sm font-bold uppercase tracking-tight hover:text-[var(--orange)] transition-colors"
                    >
                        Explore All Tools <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                    </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {RESOURCES.map((item, idx) => (
                        <motion.div
                            key={item.title}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: idx * 0.1 }}
                        >
                            <Link
                                to={item.to}
                                className="group block h-full p-6 bg-[var(--surface)] border border-[var(--border)] rounded-3xl hover:border-[var(--orange)] transition-all duration-300"
                            >
                                <div
                                    className="w-12 h-12 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300"
                                    style={{ background: `${item.color}15`, color: item.color }}
                                >
                                    <item.icon size={24} />
                                </div>
                                <h3 className="text-lg font-bold mb-2 group-hover:text-[var(--orange)] transition-colors line-clamp-1">
                                    {item.title}
                                </h3>
                                <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-6">
                                    {item.desc}
                                </p>
                                <div className="mt-auto pt-4 flex items-center gap-2 text-xs font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                                    Try Now <ArrowRight size={14} />
                                </div>
                            </Link>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
