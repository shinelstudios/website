import React from "react";
import CustomAIs from "../tools/CustomAIs";
import RelatedTools from "../tools/RelatedTools";
import MetaTags, { FAQSchema } from "../MetaTags";
import { Wand2, Zap, Shield, Cpu, Code, Coffee } from "lucide-react";

const CustomAIsPage = () => {
    const faqs = [
        {
            question: "What are Custom AIs?",
            answer: "These are specialized AI agents and automations tethered to the Shinel Studios ecosystem to help with internal workflows and creator support."
        },
        {
            question: "Can I use these for my own channel?",
            answer: "Many of our tools are public, but some 'Custom AIs' are optimized for our high-volume production clients."
        }
    ];

    return (
        <div className="min-h-screen bg-[var(--surface)] text-[var(--text)] pt-24">
            <MetaTags
                title="Custom AI Agents & Automations | Shinel Studios"
                description="Explore our suite of custom AI assistants and automation workflows designed for the modern content creator."
                keywords="custom ai agents, content automation, shinel studios ai, creator assistants"
            />
            <FAQSchema faqs={faqs} />

            <div className="container mx-auto px-4 max-w-6xl mb-20">
                <CustomAIs />

                <div className="mt-20 grid grid-cols-1 md:grid-cols-2 gap-12 border-t border-[var(--border)] pt-16">
                    <div>
                        <h2 className="text-3xl font-black uppercase tracking-tighter mb-6">
                            The Future of <span className="text-[var(--orange)]">Content Automation</span>
                        </h2>
                        <p className="text-[var(--text-muted)] leading-relaxed mb-4">
                            We don't just use AI; we build around it. Our custom agents are designed to handle the repetitive tasks that kill creator creativity.
                        </p>
                        <p className="text-[var(--text-muted)] leading-relaxed mb-8">
                            From script analysis to metadata optimization, our internal tools are now being opened to the community to help everyone edit faster and grow bigger.
                        </p>
                    </div>

                    <div className="bg-[var(--surface-alt)] p-8 rounded-3xl border border-[var(--border)]">
                        <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                            <Cpu className="text-[var(--orange)]" />
                            System Features
                        </h3>
                        <ul className="space-y-4">
                            <li className="flex items-start gap-3">
                                <div className="mt-1"><Zap size={16} className="text-[var(--orange)]" /></div>
                                <div>
                                    <span className="font-bold">Lightning Processing</span>
                                    <p className="text-sm text-[var(--text-muted)]">Built on top-tier LLMs for consistent and rapid responses.</p>
                                </div>
                            </li>
                            <li className="flex items-start gap-3">
                                <div className="mt-1"><Shield size={16} className="text-[var(--orange)]" /></div>
                                <div>
                                    <span className="font-bold">Privacy First</span>
                                    <p className="text-sm text-[var(--text-muted)]">Your data and content inputs are processed securely and never used for retraining.</p>
                                </div>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>

            <RelatedTools />
        </div>
    );
};

export default CustomAIsPage;
