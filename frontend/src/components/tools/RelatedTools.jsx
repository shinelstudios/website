import React from "react";
import { Link } from "react-router-dom";
import { Zap, Search, Image, Type } from "lucide-react";

const TOOLS = [
    {
        icon: Image,
        title: "Thumbnail Previewer",
        desc: "Test your CTR with A/B simulations.",
        path: "/tools/thumbnail-previewer",
        color: "text-blue-400",
        bg: "bg-blue-400/10"
    },
    /* {
        icon: Type,
        title: "Auto SRT Builder",
        desc: "Create perfectly timed captions instantly.",
        path: "/tools/srt",
        color: "text-green-400",
        bg: "bg-green-400/10"
    }, */
    {
        icon: Search,
        title: "YouTube SEO Tool",
        desc: "Generate high-ranking titles & tags.",
        path: "/tools/seo",
        color: "text-purple-400",
        bg: "bg-purple-400/10"
    },
    {
        icon: Zap,
        title: "ROI Calculator",
        desc: "Estimate potential revenue growth.",
        path: "/roi-calculator",
        color: "text-yellow-400",
        bg: "bg-yellow-400/10"
    }
];

const RelatedTools = () => {
    return (
        <section className="py-20 border-t border-[var(--border)]">
            <div className="container mx-auto px-4 max-w-6xl">
                <h3 className="text-2xl font-black uppercase tracking-tighter mb-8 text-center md:text-left">
                    More Free <span className="text-[var(--orange)]">Creator Tools</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {TOOLS.map((tool) => (
                        <Link
                            key={tool.title}
                            to={tool.path}
                            className="group p-6 rounded-2xl bg-[var(--surface-alt)] border border-[var(--border)] hover:border-[var(--orange)] transition-all hover:-translate-y-1 block"
                        >
                            <div className={`w-12 h-12 rounded-xl ${tool.bg} flex items-center justify-center mb-4 transition-transform group-hover:scale-110`}>
                                <tool.icon className={tool.color} size={24} />
                            </div>
                            <h4 className="font-bold text-lg mb-2 group-hover:text-[var(--orange)] transition-colors">
                                {tool.title}
                            </h4>
                            <p className="text-sm text-[var(--text-muted)]">
                                {tool.desc}
                            </p>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default RelatedTools;
