import React from "react";
import { motion } from "framer-motion";
import MetaTags, { BreadcrumbSchema } from "./MetaTags";
import { Shield, Lock, Eye, FileText } from "lucide-react";

const PrivacyPage = () => {
    return (
        <div className="min-h-screen bg-[var(--surface)]">
            <MetaTags
                title="Privacy Policy | Shinel Studios - Data Protection"
                description="Learn how Shinel Studios protects your data and maintains your privacy. Our commitment to transparency and security."
            />
            <BreadcrumbSchema
                items={[
                    { name: "Home", url: "/" },
                    { name: "Privacy Policy", url: "/privacy" }
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
                            <Shield size={14} />
                            Trust & Security
                        </div>
                        <h1 className="text-4xl sm:text-6xl font-black text-[var(--text)] mb-6 tracking-tighter">
                            PRIVACY <span className="text-[var(--orange)]">POLICY</span>
                        </h1>
                        <p className="text-[var(--text-muted)] text-lg sm:text-xl max-w-2xl mx-auto">
                            Last Updated: January 2026. Your privacy is paramount to us. This policy outlines how we handle your digital presence.
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
                                    <Eye size={20} />
                                </div>
                                <h2 className="text-2xl font-bold text-[var(--text)]">Information We Collect</h2>
                            </div>
                            <p className="mb-4">
                                We collect information necessary to provide our creative services, including:
                            </p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li>Contact details (Name, email, social media handles)</li>
                                <li>Content assets (Video footage, images, branding guidelines)</li>
                                <li>Payment information (Processed securely via third-party partners)</li>
                                <li>Usage data (How you interact with our platform and tools)</li>
                            </ul>
                        </div>

                        {/* Section 2 */}
                        <div className="p-8 rounded-3xl bg-[var(--surface-alt)] border border-[var(--border)]">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="h-10 w-10 rounded-xl bg-[var(--orange)]/10 flex items-center justify-center text-[var(--orange)]">
                                    <Lock size={20} />
                                </div>
                                <h2 className="text-2xl font-bold text-[var(--text)]">Data Security</h2>
                            </div>
                            <p>
                                Shinel Studios employs industry-standard encryption and security protocols to protect your creative assets.
                                We use secure Cloudflare Workers and global CDN edge nodes to ensure that your data is handled with the highest level of technical integrity.
                            </p>
                        </div>

                        {/* Section 3 */}
                        <div className="p-8 rounded-3xl bg-[var(--surface-alt)] border border-[var(--border)]">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="h-10 w-10 rounded-xl bg-[var(--orange)]/10 flex items-center justify-center text-[var(--orange)]">
                                    <FileText size={20} />
                                </div>
                                <h2 className="text-2xl font-bold text-[var(--text)]">Your Rights</h2>
                            </div>
                            <p>
                                You have the right to access, correct, or delete your personal information at any time.
                                For creators using our AI tools, you maintain ownership of your likeness and can request the removal of any processed assets from our temporary processing buffers.
                            </p>
                        </div>

                        <div className="text-center pt-8">
                            <p className="text-sm text-[var(--text-muted)]">
                                Questions about our privacy practices? Contact us at <span className="text-[var(--orange)] font-bold">privacy@shinelstudios.in</span>
                            </p>
                        </div>
                    </motion.div>
                </div>
            </section>
        </div>
    );
};

export default PrivacyPage;
