import React from "react";
import { motion } from "framer-motion";
import MetaTags, { BreadcrumbSchema } from "./MetaTags";
import { FileText, Scale, Zap, AlertCircle } from "lucide-react";

const TermsPage = () => {
    return (
        <div className="min-h-screen bg-[var(--surface)]">
            <MetaTags
                title="Terms of Service | Shinel Studios - Business Guidelines"
                description="Standard terms and conditions for partnering with Shinel Studios. Learn about our service agreements, revisions, and ownership."
            />
            <BreadcrumbSchema
                items={[
                    { name: "Home", url: "/" },
                    { name: "Terms of Service", url: "/terms" }
                ]}
            />

            <section className="pt-32 pb-20 px-4">
                <div className="max-w-4xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center mb-16"
                    >
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--orange)]/10 border border-[var(--orange)]/20 text-[var(--orange)] text-xs font-bold uppercase tracking-widest mb-6">
                            <Scale size={14} />
                            Fair Partnering
                        </div>
                        <h1 className="text-4xl sm:text-6xl font-black text-[var(--text)] mb-6 tracking-tighter">
                            TERMS OF <span className="text-[var(--orange)]">SERVICE</span>
                        </h1>
                        <p className="text-[var(--text-muted)] text-lg sm:text-xl max-w-2xl mx-auto">
                            Effective Date: January 2026. By partnering with Shinel Studios, you agree to these standard business terms.
                        </p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="space-y-12 text-[var(--text-muted)] leading-relaxed"
                    >
                        {/* Section 1 */}
                        <div className="p-8 rounded-3xl bg-[var(--surface-alt)] border border-[var(--border)]">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="h-10 w-10 rounded-xl bg-[var(--orange)]/20 flex items-center justify-center text-[var(--orange)]">
                                    <Zap size={20} />
                                </div>
                                <h2 className="text-2xl font-bold text-[var(--text)]">Service Delivery</h2>
                            </div>
                            <p className="mb-4">
                                We deliver high-end creative assets based on the packages selected during checkout or as outlined in individual service agreements.
                            </p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li>Production timelines (Standard: 48-72 hours)</li>
                                <li>Revision limits (Standard: 2 rounds of creative adjustment)</li>
                                <li>Batch delivery schedules for monthly retainers</li>
                            </ul>
                        </div>

                        {/* Section 2 */}
                        <div className="p-8 rounded-3xl bg-[var(--surface-alt)] border border-[var(--border)]">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="h-10 w-10 rounded-xl bg-[var(--orange)]/20 flex items-center justify-center text-[var(--orange)]">
                                    <FileText size={20} />
                                </div>
                                <h2 className="text-2xl font-bold text-[var(--text)]">Ownership & Rights</h2>
                            </div>
                            <p>
                                Upon final payment, full commercial usage rights to the delivered creative works (Videos, Thumbnails, Branding) are transferred to the Client.
                                Shinel Studios retains the right to display completed works in its portfolio and marketing materials unless a non-disclosure agreement is specifically requested.
                            </p>
                        </div>

                        {/* Section 3 */}
                        <div className="p-8 rounded-3xl bg-[var(--surface-alt)] border border-[var(--border)]">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="h-10 w-10 rounded-xl bg-[var(--orange)]/20 flex items-center justify-center text-[var(--orange)]">
                                    <AlertCircle size={20} />
                                </div>
                                <h2 className="text-2xl font-bold text-[var(--text)]">Client Responsibilities</h2>
                            </div>
                            <p>
                                Clients are responsible for providing high-quality raw assets and clear creative direction.
                                For AI-assisted features, clients must provide explicit consent for processing any provided likeness or proprietary AI model training.
                            </p>
                        </div>

                        <div className="text-center pt-8">
                            <p className="text-sm text-[var(--text-muted)]">
                                Need clarification on our terms? Message us at <span className="text-[var(--orange)] font-bold">legal@shinelstudios.in</span>
                            </p>
                        </div>
                    </motion.div>
                </div>
            </section>
        </div>
    );
};

export default TermsPage;
