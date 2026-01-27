// src/components/pages/ThumbnailPreviewerPage.jsx
import React from "react";
import ThumbnailPreviewer from "../tools/ThumbnailPreviewer";
import MetaTags, { FAQSchema } from "../MetaTags";
import { Youtube, Search, Layout, Sparkles, Smartphone, Monitor, Zap, Target, Eye } from "lucide-react";
import { motion } from "framer-motion";

const ThumbnailPreviewerPage = () => {
    const structuredData = {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": "YouTube Thumbnail Previewer & CTR Tester",
        "operatingSystem": "Web",
        "applicationCategory": "DesignApplication",
        "description": "Professional YouTube thumbnail mockup and A/B testing tool. Optimize your click-through rate with blur tests, grayscale analysis, and layout simulations.",
        "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "USD"
        },
        "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": "4.9",
            "ratingCount": "120"
        }
    };

    const faqs = [
        {
            question: "What is a YouTube thumbnail previewer?",
            answer: "A YouTube thumbnail previewer is a specialized mockup tool that allows video creators to visualize how their thumbnail designs will look in the real YouTube interface (Home, Search, and Sidebar) before they upload."
        },
        {
            question: "How do I increase my YouTube Click-Through Rate (CTR)?",
            answer: "To increase CTR, focus on high-contrast colors, expressive faces, and large, readable text. Use our mockup tool's blur and grayscale tests to ensure your main subject stands out."
        },
        {
            question: "Why use a thumbnail mockup tool instead of just uploading?",
            answer: "Uploading directly doesn't allow you to compare variations side-by-side or see how your design competes with other trending videos in a simulated live feed."
        },
        {
            question: "Is this YouTube thumbnail tester free?",
            answer: "Yes, the Shinel Studios Thumbnail Previewer is 100% free for all creators to use to improve their content strategy."
        }
    ];

    return (
        <div className="min-h-screen bg-[var(--surface)] text-[var(--text)] pt-24 pb-20">
            <MetaTags
                title="Free YouTube Thumbnail Previewer & A/B Tester | Shinel Studios"
                description="The ultimate YouTube thumbnail mockup tool. Test your CTR with simulated Home, Search, and Sidebar views. Free A/B testing, blur tests, and grayscale analysis."
                keywords="youtube thumbnail previewer, youtube mockup tool, ab test thumbnails, youtube thumbnail tester, youtube ctr tool, thumbnail optimization, shinel studios tool"
                structuredData={structuredData}
            />
            <FAQSchema faqs={faqs} />

            <div className="container mx-auto px-4 max-w-7xl">
                <ThumbnailPreviewer />

                {/* SEO Optimization Section */}
                <div className="mt-28 space-y-32">
                    {/* Value Proposition */}
                    <section className="text-center max-w-4xl mx-auto">
                        <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter mb-6">
                            Master the Art of the <span className="text-[var(--orange)]">Perfect Click</span>
                        </h2>
                        <p className="text-xl text-[var(--text-muted)] leading-relaxed">
                            Stop guessing how your thumbnails will perform. Use professional-grade simulation tools to see exactly what your viewers see on Desktop and Mobile.
                        </p>
                    </section>

                    {/* Features Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {[
                            { icon: Target, title: "A/B Testing", text: "Compare two variations side-by-side to determine which design captures more attention." },
                            { icon: Zap, title: "CTR Analytics", text: "Simulated heatmaps and contrast scores help identify the focal points of your design." },
                            { icon: Eye, title: "Simulated Feeds", text: "Preview your thumbnail in Home, Search, and Sidebar layouts with Dark and Light mode support." }
                        ].map((f, i) => (
                            <div key={i} className="p-8 rounded-[32px] bg-[var(--surface-alt)] border border-[var(--border)] hover:border-[var(--orange)] transition-colors group">
                                <f.icon className="text-[var(--orange)] mb-6 group-hover:scale-110 transition-transform" size={40} />
                                <h3 className="text-xl font-bold mb-3">{f.title}</h3>
                                <p className="text-[var(--text-muted)] leading-relaxed">{f.text}</p>
                            </div>
                        ))}
                    </div>

                    {/* The Guide */}
                    <section className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                        <div className="order-2 lg:order-1">
                            <h2 className="text-4xl font-black uppercase tracking-tighter mb-8 leading-none">
                                Expert <span className="text-[var(--orange)]">Thumbnail</span> Strategies
                            </h2>
                            <div className="space-y-6 text-[var(--text-muted)] text-lg">
                                <div className="p-6 rounded-2xl bg-[var(--surface-alt)] border border-[var(--border)]">
                                    <h4 className="font-bold text-[var(--text)] mb-2">The Squint Test</h4>
                                    <p className="text-sm">Squint your eyes while looking at the preview. If you can still tell what the video is about, your composition is strong.</p>
                                </div>
                                <div className="p-6 rounded-2xl bg-[var(--surface-alt)] border border-[var(--border)]">
                                    <h4 className="font-bold text-[var(--text)] mb-2">Subject "Pop"</h4>
                                    <p className="text-sm">Ensure your subject has a high contrast with the background. Using a subtle outer glow or drop shadow can help.</p>
                                </div>
                                <div className="p-6 rounded-2xl bg-[var(--surface-alt)] border border-[var(--border)]">
                                    <h4 className="font-bold text-[var(--text)] mb-2">Mobile First</h4>
                                    <p className="text-sm">Over 70% of YouTube views are on mobile. Large text and bold subjects are non-negotiable for smartphone users.</p>
                                </div>
                            </div>
                        </div>
                        <div className="order-1 lg:order-2 bg-gradient-to-br from-[var(--orange)]/10 to-red-600/10 p-12 rounded-[48px] border border-[var(--orange)]/20 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:rotate-12 transition-transform">
                                <Search size={160} />
                            </div>
                            <h3 className="text-3xl font-bold mb-6 relative z-10 font-black tracking-tighter uppercase italic">Dominating the <br /><span className="text-[var(--orange)]">Search Results</span></h3>
                            <p className="relative z-10 text-[var(--text-muted)] text-lg leading-relaxed mb-8">
                                In a sea of content, you have 0.3 seconds to win a click. Our Search Previewer tool helps you analyze how your thumbnail stacks up against the top ranking videos for your keywords.
                            </p>
                            <ul className="space-y-3 relative z-10">
                                {['Check competing colors', 'Optimize for small screens', 'Test readability against competitors'].map(item => (
                                    <li key={item} className="flex items-center gap-2 text-sm font-bold">
                                        <Zap size={14} className="text-[var(--orange)]" /> {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </section>

                    {/* SEO FAQ SECTION */}
                    <section className="bg-[var(--surface-alt)] p-12 rounded-[48px] border border-[var(--border)]">
                        <h2 className="text-3xl font-black uppercase tracking-tighter mb-12 text-center">
                            Thumbnail Optimization <span className="text-[var(--orange)]">Knowledge Base</span>
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-10">
                            {faqs.map((faq, idx) => (
                                <div key={idx} className="space-y-3">
                                    <h4 className="font-bold text-xl text-[var(--text)] flex items-center gap-3">
                                        <span className="text-[var(--orange)] text-xs font-black px-2 py-1 bg-[var(--orange)]/10 rounded-md">Q</span>
                                        {faq.question}
                                    </h4>
                                    <p className="text-[var(--text-muted)] text-md leading-relaxed pl-10 border-l border-[var(--border)]">{faq.answer}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default ThumbnailPreviewerPage;

