// src/components/pages/ComparisonToolPage.jsx
import React from "react";
import ComparisonCalculator from "../ComparisonCalculator";
import MetaTags from "../MetaTags";
import { TrendingUp, Clock, DollarSign, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

const ComparisonToolPage = () => {
    const handleBook = () => {
        window.dispatchEvent(new Event("calendly:open"));
    };

    return (
        <div className="min-h-screen bg-[var(--surface)] text-[var(--text)] pt-24 pb-20">
            <MetaTags
                title="DIY vs Shinel Studios ROI Calculator | Shinel Studios"
                description="Compare the cost and growth impact of DIY video editing versus outsourcing to professional editors at Shinel Studios."
                keywords="video editing roi, diy vs outsourcing, youtube growth, content strategy, shinel studios tools"
            />

            <div className="container mx-auto px-4 max-w-6xl">
                <ComparisonCalculator onBook={handleBook} />

                {/* Additional context for SEO */}
                <div className="mt-20 grid grid-cols-1 md:grid-cols-2 gap-12 border-t border-[var(--border)] pt-16">
                    <div>
                        <h2 className="text-3xl font-black uppercase tracking-tighter mb-6">
                            Stop Trading <span className="text-[var(--orange)]">Time</span> for Growth
                        </h2>
                        <p className="text-[var(--text-muted)] leading-relaxed mb-4">
                            Many creators start as one-man bands, handling everything from scripting to editing. But as you scale, your time becomes your most expensive asset.
                        </p>
                        <p className="text-[var(--text-muted)] leading-relaxed">
                            Outsourcing to professional editors doesn't just save you hours—it brings back the high-level focus you need for strategy and creativity. Our ROI calculator shows the tangible difference in both efficiency and performance.
                        </p>
                    </div>

                    <div className="space-y-6">
                        <div className="bg-[var(--surface-alt)] p-6 rounded-2xl border border-[var(--border)]">
                            <h4 className="font-bold flex items-center gap-2 mb-2">
                                <Clock className="text-[var(--orange)]" size={18} />
                                Reclaim 40+ Hours/Month
                            </h4>
                            <p className="text-sm text-[var(--text-muted)]">Focus on filming and branding while we handle the technical heavy lifting.</p>
                        </div>
                        <div className="bg-[var(--surface-alt)] p-6 rounded-2xl border border-[var(--border)]">
                            <h4 className="font-bold flex items-center gap-2 mb-2">
                                <TrendingUp className="text-[var(--orange)]" size={18} />
                                Professional Retention
                            </h4>
                            <p className="text-sm text-[var(--text-muted)]">Experts-level editing that keeps viewers engaged longer, directly impacting the algorithm.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ComparisonToolPage;
