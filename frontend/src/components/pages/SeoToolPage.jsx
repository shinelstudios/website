// src/components/pages/SeoToolPage.jsx
import React from "react";
import SeoTool from "../tools/SeoTool";
import MetaTags from "../MetaTags";
import { Search, Youtube, TrendingUp, Target, Sparkles } from "lucide-react";

const SeoToolPage = () => {
    return (
        <div className="min-h-screen bg-[var(--surface)] text-[var(--text)] pt-24 pb-20">
            <MetaTags
                title="YouTube SEO Title & Tag Generator | Shinel Studios"
                description="Optimize your YouTube videos for search and discovery. Generate high-CTR titles, perfectly formatted descriptions, and relevant tags with our free SEO tool."
                keywords="youtube seo tool, youtube tag generator, youtube title generator, video seo, shinel studios tool"
            />

            <div className="container mx-auto px-4 max-w-6xl">
                <SeoTool />

                {/* Content Section for SEO */}
                <div className="mt-20 grid grid-cols-1 md:grid-cols-2 gap-12 border-t border-[var(--border)] pt-16">
                    <div>
                        <h2 className="text-3xl font-black uppercase tracking-tighter mb-6">
                            Master the YouTube <span className="text-[var(--orange)]">Algorithm</span>
                        </h2>
                        <p className="text-[var(--text-muted)] leading-relaxed mb-4">
                            Metadata still matters. While the algorithm is smarter than ever at understanding video content, your titles and descriptions provide the initial context for indexing and reaching the right audience.
                        </p>
                        <p className="text-[var(--text-muted)] leading-relaxed">
                            Our SEO tool helps you find the sweet spot between "Clickworthy" and "Search-Friendly". Use our suggested hooks to stop the scroll and our tag grouping to ensure you're appearing in the right suggested feeds.
                        </p>
                    </div>

                    <div className="bg-[var(--surface-alt)] p-8 rounded-3xl border border-[var(--border)]">
                        <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                            <Sparkles className="text-[var(--orange)]" />
                            Optimization Pillars
                        </h3>
                        <ul className="space-y-4">
                            <li className="flex items-start gap-3">
                                <div className="mt-1"><Target size={16} className="text-[var(--orange)]" /></div>
                                <div>
                                    <span className="font-bold">Hook-Focused Titles</span>
                                    <p className="text-sm text-[var(--text-muted)]">We generate 10+ title variations based on psychological hooks used by the top 1% of creators.</p>
                                </div>
                            </li>
                            <li className="flex items-start gap-3">
                                <div className="mt-1"><Search size={16} className="text-[var(--orange)]" /></div>
                                <div>
                                    <span className="font-bold">Semantic Tag Clustering</span>
                                    <p className="text-sm text-[var(--text-muted)]">Automatically generate a mix of broad, specific, and semantic tags to satisfy both search and suggestion algorithms.</p>
                                </div>
                            </li>
                            <li className="flex items-start gap-3">
                                <div className="mt-1"><TrendingUp size={16} className="text-[var(--orange)]" /></div>
                                <div>
                                    <span className="font-bold">Conversion-Ready Descriptions</span>
                                    <p className="text-sm text-[var(--text-muted)]">Pre-formatted markdown descriptions that include keyword-rich intros and organized structures.</p>
                                </div>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SeoToolPage;
