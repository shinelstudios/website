/**
 * RoiCalculatorPage.jsx
 * 
 * About: SEO landing page for the YouTube ROI and CTR calculator.
 * Features: Interactive sliders, Revenue projections, Conversion lift analysis.
 */
// src/components/pages/RoiCalculatorPage.jsx
import React from "react";
import RoiCalculator from "../RoiCalculator";
import MetaTags from "../MetaTags";
import { Zap, TrendingUp, Search, Target, ShieldCheck, Mail } from "lucide-react";
import { motion } from "framer-motion";

const RoiCalculatorPage = ({ onBook }) => {
    return (
        <div className="min-h-screen bg-[var(--surface)] text-[var(--text)] pt-24 pb-20">
            <MetaTags
                title="YouTube ROI & CTR Calculator | Shinel Studios"
                description="Calculate your potential views and revenue increase with better click-through rates. Free ROI calculator for YouTube creators and agencies."
                keywords="youtube roi calculator, ctr calculator, youtube revenue estimator, youtube growth tools, shinel studios tools"
            />

            <div className="container mx-auto px-4 max-w-6xl">
                {/* Breadcrumbs or Back Link could go here */}

                <RoiCalculator onBook={onBook} />

                {/* Content Section for SEO */}
                <div className="mt-20 grid grid-cols-1 md:grid-cols-2 gap-12 border-t border-[var(--border)] pt-16">
                    <div>
                        <h2 className="text-3xl font-black uppercase tracking-tighter mb-6">
                            Why <span className="text-[var(--orange)]">CTR</span> is the Most Important Metric for Growth
                        </h2>
                        <p className="text-[var(--text-muted)] leading-relaxed mb-4">
                            On YouTube, your CTR (Click-Through Rate) is the gatekeeper to your views. Even a 1% increase in CTR can exponentially increase your reach because it signals to the algorithm that your content is high-value.
                        </p>
                        <p className="text-[var(--text-muted)] leading-relaxed">
                            Our calculator helps you visualize the direct link between a better thumbnail design and your bottom line. By optimizing your packaging, you aren't just getting more clicks—you're accelerating your channel's velocity.
                        </p>
                    </div>

                    <div className="space-y-8">
                        <FeatureItem
                            icon={<Target className="text-[var(--orange)]" />}
                            title="Data-Driven Decisions"
                            desc="Stop guessing which thumbnails work. Use our ROI metrics to justify your design investment."
                        />
                        <FeatureItem
                            icon={<TrendingUp className="text-[var(--orange)]" />}
                            title="Predictable Scaling"
                            desc="Understand how many impressions you need to reach your revenue goals based on current RPM."
                        />
                        <FeatureItem
                            icon={<ShieldCheck className="text-[var(--orange)]" />}
                            title="Agency-Grade Tools"
                            desc="We used the same logic to drive 7M+ views for our clients. Now it's available for you."
                        />
                    </div>
                </div>

                {/* CTA Section */}
                <motion.div
                    className="mt-20 bg-[var(--surface-alt)] border border-[var(--border)] rounded-3xl p-8 text-center"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                >
                    <h3 className="text-2xl font-black uppercase mb-4">Ready to fix your <span className="text-[var(--orange)]">Analytics?</span></h3>
                    <p className="text-[var(--text-muted)] mb-8 max-w-2xl mx-auto">
                        Calculators are great for planning, but execution is what matters. Book a free 15-minute audit where we'll look at your actual data and tell you exactly where your CTR leak is.
                    </p>
                    <button
                        onClick={() => window.dispatchEvent(new Event("calendly:open"))}
                        className="px-8 py-4 rounded-2xl bg-[var(--orange)] text-white font-bold shadow-lg hover:shadow-orange-500/20 transition-all flex items-center gap-2 mx-auto"
                    >
                        <Mail size={18} /> Schedule My Audit
                    </button>
                </motion.div>
            </div>
        </div>
    );
};

function FeatureItem({ icon, title, desc }) {
    return (
        <div className="flex gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[var(--surface-alt)] border border-[var(--border)] flex items-center justify-center flex-shrink-0">
                {icon}
            </div>
            <div>
                <h4 className="font-bold text-lg mb-1">{title}</h4>
                <p className="text-sm text-[var(--text-muted)] leading-relaxed">{desc}</p>
            </div>
        </div>
    );
}

export default RoiCalculatorPage;
