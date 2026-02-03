import React from "react";
import AutoSRTTool from "../tools/AutoSRTTool";
import RelatedTools from "../tools/RelatedTools";
import MetaTags, { FAQSchema } from "../MetaTags";
import { Youtube, Languages, Zap, Shield, Globe, Download } from "lucide-react";

const YoutubeCaptionsPage = () => {
    const faqs = [
        {
            question: "Is this YouTube caption extractor free?",
            answer: "Yes, our automated caption tool is free and simple to use. Just paste a YouTube URL and get the text instantly."
        },
        {
            question: "Can I extract auto-generated captions?",
            answer: "Absolutely. Our tool fetches both manual (human-written) and auto-generated captions provided by YouTube."
        },
        {
            question: "Is there a limit on video length?",
            answer: "No. Unlike other tools that might charge per minute, our tool works for any video regardless of its length."
        }
    ];

    return (
        <div className="min-h-screen bg-[var(--surface)] text-[var(--text)] pt-24">
            <MetaTags
                title="Free YouTube Automated Captions Extractor | Shinel Studios"
                description="Instantly extract manual and auto-generated captions from any YouTube video URL. Free online tool for creators to get transcripts in seconds."
                keywords="youtube caption extractor, get youtube transcript, download youtube subtitles, free youtube captions tool, shinel studios"
            />
            <FAQSchema faqs={faqs} />

            <div className="container mx-auto px-4 max-w-6xl mb-20">
                <AutoSRTTool />

                <div className="mt-20 grid grid-cols-1 md:grid-cols-2 gap-12 border-t border-[var(--border)] pt-16">
                    <div>
                        <h2 className="text-3xl font-black uppercase tracking-tighter mb-6">
                            Unlock Your <span className="text-[var(--orange)]">Video Data</span> with One Click
                        </h2>
                        <p className="text-[var(--text-muted)] leading-relaxed mb-4">
                            Manually transcribing videos is a thing of the past. Our automated tool connects directly to YouTube's caption engine to pull exactly what you need in seconds.
                        </p>
                        <p className="text-[var(--text-muted)] leading-relaxed mb-8">
                            Whether you're looking for manual transcripts for high-quality editing or auto-generated ones for quick SEO sweeps, this tool is the fastest way to get your text.
                        </p>

                        <div className="bg-[var(--surface-alt)] p-6 rounded-2xl border border-[var(--border)]">
                            <h4 className="font-bold mb-4 flex items-center gap-2">
                                <Youtube className="text-[var(--orange)]" size={18} />
                                Simple Workflow:
                            </h4>
                            <ul className="list-disc pl-5 space-y-2 text-sm text-[var(--text-muted)]">
                                <li>Paste any YouTube video link (Long form or Shorts).</li>
                                <li>Select your target language (default is English).</li>
                                <li>Click "Fetch Captions" and preview the result.</li>
                                <li>Copy or download the text for your project.</li>
                            </ul>
                        </div>
                    </div>

                    <div className="bg-[var(--surface-alt)] p-8 rounded-3xl border border-[var(--border)]">
                        <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                            <Zap className="text-[var(--orange)]" />
                            Premium Features for Free
                        </h3>
                        <ul className="space-y-4">
                            <li className="flex items-start gap-3">
                                <div className="mt-1"><Languages size={16} className="text-[var(--orange)]" /></div>
                                <div>
                                    <span className="font-bold">Multi-Language Support</span>
                                    <p className="text-sm text-[var(--text-muted)]">Extract captions in any language the video supports, including auto-translated versions.</p>
                                </div>
                            </li>
                            <li className="flex items-start gap-3">
                                <div className="mt-1"><Download size={16} className="text-[var(--orange)]" /></div>
                                <div>
                                    <span className="font-bold">Clean Text Output</span>
                                    <p className="text-sm text-[var(--text-muted)]">We strip out the timestamps and formatting so you get a clean, readable script immediately.</p>
                                </div>
                            </li>
                            <li className="flex items-start gap-3">
                                <div className="mt-1"><Shield size={16} className="text-[var(--orange)]" /></div>
                                <div>
                                    <span className="font-bold">No Login Required</span>
                                    <p className="text-sm text-[var(--text-muted)]">While other tools hide their functionality behind paywalls, ours is built for the creator community.</p>
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

export default YoutubeCaptionsPage;
