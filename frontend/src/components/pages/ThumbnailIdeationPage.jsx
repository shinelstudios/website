import React from "react";
import ThumbnailIdeation from "../tools/ThumbnailIdeation";
import RelatedTools from "../tools/RelatedTools";
import MetaTags, { FAQSchema } from "../MetaTags";
import { Lightbulb, TrendingUp, Zap, Image as ImageIcon, Search, CheckCircle2 } from "lucide-react";

const ThumbnailIdeationPage = () => {
    const faqs = [
        {
            question: "How does the AI generate thumbnail ideas?",
            answer: "Our engine uses proven CTR frameworks (Big Bold, Before/After, Checklist) to suggest both the text and the layout composition that works best for your topic."
        },
        {
            question: "Are these ideas copyright-free?",
            answer: "Yes, these are creative concepts intended to spark your imagination and help you design better thumbnails for your channel."
        },
        {
            question: "What is the best CTR for a YouTube thumbnail?",
            answer: "While it varies by niche, aiming for 5-10% is generally considered high performance. Our tool helps you move toward that goal with punchy hooks."
        }
    ];

    return (
        <div className="min-h-screen bg-[var(--surface)] text-[var(--text)] pt-24">
            <MetaTags
                title="Viral YouTube Thumbnail Idea Generator | Shinel Studios"
                description="Stop staring at a blank canvas. Get instant high-CTR concepts for your YouTube thumbnails. Generate punchy text and visual compostion ideas for free."
                keywords="thumbnail ideas, youtube thumbnail generator, ctr boost, viral thumbnail concepts, shinel studios creator tools"
            />
            <FAQSchema faqs={faqs} />

            <div className="container mx-auto px-4 max-w-6xl mb-20">
                <ThumbnailIdeation />

                <div className="mt-20 grid grid-cols-1 md:grid-cols-2 gap-12 border-t border-[var(--border)] pt-16">
                    <div>
                        <h2 className="text-3xl font-black uppercase tracking-tighter mb-6">
                            Master the <span className="text-[var(--orange)]">Click-Through</span> Rate
                        </h2>
                        <p className="text-[var(--text-muted)] leading-relaxed mb-4">
                            Your thumbnail is 90% of the reason someone clicks your video. If your visual strategy is weak, your views will suffer regardless of how good the content is.
                        </p>
                        <p className="text-[var(--text-muted)] leading-relaxed mb-8">
                            We've analyzed thousands of top-performing videos to build these frameworks. From "Big Bold" crops to "Checklist" clarity, our tool gives you a professional head start.
                        </p>

                        <div className="bg-[var(--surface-alt)] p-6 rounded-2xl border border-[var(--border)]">
                            <h4 className="font-bold mb-4 flex items-center gap-2">
                                <TrendingUp className="text-[var(--orange)]" size={18} />
                                Why CTR Matters:
                            </h4>
                            <ul className="space-y-3 text-sm text-[var(--text-muted)]">
                                <li className="flex gap-2">
                                    <span className="text-[var(--orange)] font-bold">1.</span>
                                    <span>Higher CTR tells the algorithm your video is satisfying.</span>
                                </li>
                                <li className="flex gap-2">
                                    <span className="text-[var(--orange)] font-bold">2.</span>
                                    <span>It decreases your cost-per-view if you run ads.</span>
                                </li>
                                <li className="flex gap-2">
                                    <span className="text-[var(--orange)] font-bold">3.</span>
                                    <span>Better thumbnails build a recognizable brand identity.</span>
                                </li>
                            </ul>
                        </div>
                    </div>

                    <div className="bg-[var(--surface-alt)] p-8 rounded-3xl border border-[var(--border)]">
                        <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                            <Zap className="text-[var(--orange)]" />
                            Creator Optimization
                        </h3>
                        <ul className="space-y-4">
                            <li className="flex items-start gap-3">
                                <div className="mt-1"><ImageIcon size={16} className="text-[var(--orange)]" /></div>
                                <div>
                                    <span className="font-bold">Composition Guides</span>
                                    <p className="text-sm text-[var(--text-muted)]">Don't just get text; get layout advice on where to place faces, arrows, and graphics.</p>
                                </div>
                            </li>
                            <li className="flex items-start gap-3">
                                <div className="mt-1"><Lightbulb size={16} className="text-[var(--orange)]" /></div>
                                <div>
                                    <span className="font-bold">Unlimited Variation</span>
                                    <p className="text-sm text-[var(--text-muted)]">Generate as many ideas as you want. Test different angles like 'Education' vs 'Entertainment'.</p>
                                </div>
                            </li>
                            <li className="flex items-start gap-3">
                                <div className="mt-1"><Search size={16} className="text-[var(--orange)]" /></div>
                                <div>
                                    <span className="font-bold">Data-Backed Hooks</span>
                                    <p className="text-sm text-[var(--text-muted)]">The text phrases are based on linguistic patterns that trigger curiosity and urgency.</p>
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

export default ThumbnailIdeationPage;
