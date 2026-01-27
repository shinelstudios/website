import React from "react";
import SrtTool from "../tools/SrtTool";
import RelatedTools from "../tools/RelatedTools";
import MetaTags, { FAQSchema } from "../MetaTags";
import { FileText, Clock, Globe, Zap, Languages, CheckCircle2 } from "lucide-react";

const SrtToolPage = () => {
    const faqs = [
        {
            question: "Is this SRT generator free?",
            answer: "Yes, this tool is 100% free and runs entirely in your browser. There are no limits on video length or file size."
        },
        {
            question: "Do I need to upload my video file?",
            answer: "No. This tool works by formatting your text transcript. You paste your text, set the timing, and we generate the .srt file instantly without needing your heavy video file."
        },
        {
            question: "Will these captions work on YouTube?",
            answer: "Absolutely. The .srt format is the industry standard for YouTube, Facebook, LinkedIn, and Premiere Pro."
        }
    ];

    return (
        <div className="min-h-screen bg-[var(--surface)] text-[var(--text)] pt-24">
            <MetaTags
                title="Free YouTube SRT & Caption Builder | Shinel Studios"
                description="Convert your video transcripts into perfectly timed .srt files for YouTube, Premiere Pro, and Final Cut. Simple, fast, and 100% free tool for creators."
                keywords="srt builder, youtube caption tool, free srt generator, video subtitle tool, shinel studios tool"
            />
            <FAQSchema faqs={faqs} />

            <div className="container mx-auto px-4 max-w-6xl mb-20">
                <SrtTool />

                {/* Content Section for SEO */}
                <div className="mt-20 grid grid-cols-1 md:grid-cols-2 gap-12 border-t border-[var(--border)] pt-16">
                    <div>
                        <h2 className="text-3xl font-black uppercase tracking-tighter mb-6">
                            Captions are <span className="text-[var(--orange)]">Essential</span> for Modern Viewers
                        </h2>
                        <p className="text-[var(--text-muted)] leading-relaxed mb-4">
                            Over 80% of videos on social platforms are watched on mute. Without captions, you are losing a massive portion of your potential audience before they even hear your first words.
                        </p>
                        <p className="text-[var(--text-muted)] leading-relaxed mb-8">
                            Our SRT builder allows you to take any transcript and turn it into professional, timed subtitles. Native YouTube captions (SRT files) also help with SEO as Google indexes the text within your video.
                        </p>

                        <div className="bg-[var(--surface-alt)] p-6 rounded-2xl border border-[var(--border)]">
                            <h4 className="font-bold mb-4 flex items-center gap-2">
                                <CheckCircle2 className="text-[var(--orange)]" size={18} />
                                How to use:
                            </h4>
                            <ol className="list-decimal pl-5 space-y-2 text-sm text-[var(--text-muted)] marker:text-[var(--orange)] marker:font-bold">
                                <li>Paste your full video transcript into the text box.</li>
                                <li>Ensure each new line corresponds to a new caption segment.</li>
                                <li>Set the <strong>Seconds / caption</strong> (usually 3-4s is best).</li>
                                <li>Click <strong>Generate SRT</strong> and download your file.</li>
                            </ol>
                        </div>
                    </div>

                    <div className="bg-[var(--surface-alt)] p-8 rounded-3xl border border-[var(--border)]">
                        <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                            <Zap className="text-[var(--orange)]" />
                            Workflow Optimization
                        </h3>
                        <ul className="space-y-4">
                            <li className="flex items-start gap-3">
                                <div className="mt-1"><Languages size={16} className="text-[var(--orange)]" /></div>
                                <div>
                                    <span className="font-bold">Multi-Platform Compatibility</span>
                                    <p className="text-sm text-[var(--text-muted)]">Works with YouTube, Facebook, LinkedIn, and major editing software like Premiere Pro and DaVinci Resolve.</p>
                                </div>
                            </li>
                            <li className="flex items-start gap-3">
                                <div className="mt-1"><Clock size={16} className="text-[var(--orange)]" /></div>
                                <div>
                                    <span className="font-bold">Lightning Fast Timing</span>
                                    <p className="text-sm text-[var(--text-muted)]">Just paste your lines and set your timing. No complex software or monthly subscriptions required.</p>
                                </div>
                            </li>
                            <li className="flex items-start gap-3">
                                <div className="mt-1"><FileText size={16} className="text-[var(--orange)]" /></div>
                                <div>
                                    <span className="font-bold">Local & Secure</span>
                                    <p className="text-sm text-[var(--text-muted)]">All processing happens in your browser. Your scripts never leave your computer.</p>
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

export default SrtToolPage;
