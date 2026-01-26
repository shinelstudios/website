// src/components/PortfolioPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
    Sparkles,
    ArrowLeft,
    ExternalLink,
    LayoutGrid,
    Zap,
    User,
    Shield,
    Heart,
    MessageSquare,
    Link as LinkIcon,
    Search,
    Filter
} from "lucide-react";
import PortfolioItem from "./PortfolioItem";
import MetaTags from "./MetaTags";

const AUTH_BASE = import.meta.env.VITE_AUTH_BASE || "";

function normalizeWork(item, type) {
    const isVideo = type === 'video';
    return {
        id: item.id || (isVideo ? item.videoId : item.filename),
        title: item.title || item.filename,
        description: isVideo ? `Video Project · ${item.category}` : `Thumbnail Art · ${item.category}`,
        category: item.category || "OTHER",
        image: isVideo
            ? `https://img.youtube.com/vi/${item.videoId}/maxresdefault.jpg`
            : item.imageUrl,
        link: isVideo ? "/video-editing" : "/thumbnails",
        kind: isVideo ? "video" : "gfx",
        isShinel: item.isShinel !== false,
        attributedTo: item.attributedTo
    };
}

export default function PortfolioPage() {
    const { slug } = useParams();
    const [profile, setProfile] = useState(null);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState("ALL"); // ALL, SHINEL, PERSONAL
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        async function loadPortfolio() {
            setLoading(true);
            try {
                // 1. Fetch Profile
                const pRes = await fetch(`${AUTH_BASE}/profiles/${encodeURIComponent(slug)}`);
                const pData = await pRes.json();
                if (!pRes.ok) throw new Error(pData.error || "Profile not found");
                const user = pData.profile;
                setProfile(user);

                // 2. Fetch All Work
                const [vRes, tRes] = await Promise.all([
                    fetch(`${AUTH_BASE}/videos`),
                    fetch(`${AUTH_BASE}/thumbnails`)
                ]);
                const vData = await vRes.json();
                const tData = await tRes.json();

                const vMapped = (vData.videos || []).map(v => normalizeWork(v, 'video'));
                const tMapped = (tData.thumbnails || []).map(t => normalizeWork(t, 'gfx'));

                // 3. Filter for this user
                const userWork = [...vMapped, ...tMapped].filter(w =>
                    w.attributedTo === user.email ||
                    w.attributedTo === slug
                );
                setProjects(userWork);

            } catch (e) {
                console.error("Portfolio load failed:", e);
            } finally {
                setLoading(false);
            }
        }
        loadPortfolio();
    }, [slug]);

    const filtered = useMemo(() => {
        return projects.filter(p => {
            const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesFilter =
                activeFilter === "ALL" ||
                (activeFilter === "SHINEL" && p.isShinel) ||
                (activeFilter === "PERSONAL" && !p.isShinel);
            return matchesSearch && matchesFilter;
        });
    }, [projects, activeFilter, searchQuery]);

    if (loading && !profile) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" />
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-500">Initializing Portfolio</span>
                </div>
            </div>
        );
    }

    if (!profile && !loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center text-center p-6">
                <div>
                    <h2 className="text-4xl font-black mb-4">PROFILE NOT FOUND</h2>
                    <p className="text-gray-500 mb-8 max-w-sm mx-auto">This specific creative engine hasn't been registered in our registry yet.</p>
                    <Link to="/work" className="inline-flex items-center gap-2 text-orange-500 font-bold hover:gap-3 transition-all uppercase tracking-widest text-xs">
                        <ArrowLeft size={16} /> Back to Studio Work
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white selection:bg-orange-500/30">
            <MetaTags
                title={`${profile.firstName} ${profile.lastName} | Creative Portfolio · Shinel Studios`}
                description={`Showcasing the creative impact of ${profile.firstName} at Shinel Studios. Explore high-end video edits and thumbnail designs.`}
            />

            {/* --- HERO / PROFILE --- */}
            <section className="relative pt-32 pb-20 overflow-hidden border-b border-white/5">
                <div className="absolute inset-0 z-0">
                    <div className="absolute top-0 left-1/4 w-96 h-96 bg-orange-600/10 rounded-full blur-[120px]" />
                    <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px]" />
                </div>

                <div className="container mx-auto px-6 relative z-10">
                    <Link to="/work" className="inline-flex items-center gap-2 text-gray-500 hover:text-white transition-colors mb-12 text-xs font-black uppercase tracking-widest">
                        <ArrowLeft size={14} /> Back to Main Work
                    </Link>

                    <div className="flex flex-col md:flex-row items-end gap-8 mb-12">
                        <div className="w-32 h-32 md:w-48 md:h-48 rounded-[40px] bg-white/[0.03] border border-white/10 flex items-center justify-center text-orange-500 relative group overflow-hidden">
                            <User size={64} className="group-hover:scale-110 transition-transform duration-500" />
                            <div className="absolute inset-0 bg-gradient-to-t from-orange-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>

                        <div className="flex-grow">
                            <div className="flex items-center gap-3 mb-4">
                                <span className="px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-500 text-[10px] font-black uppercase tracking-widest">
                                    {profile.role}
                                </span>
                                {profile.isTeam && (
                                    <span className="flex items-center gap-1.5 text-gray-500 text-[10px] font-bold uppercase tracking-widest">
                                        <Shield size={12} className="text-orange-500" />
                                        Verified Member
                                    </span>
                                )}
                            </div>
                            <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-none mb-4">
                                {profile.firstName} <span className="text-orange-500 italic">{profile.lastName}.</span>
                            </h1>
                            <p className="text-gray-400 text-lg md:text-xl max-w-xl font-medium leading-relaxed">
                                Professional {profile.role} focused on high-retention viral storytelling and visual brand dominance at Shinel Studios.
                            </p>
                        </div>

                        <div className="flex flex-wrap md:flex-col gap-4">
                            <SocialButton icon={<MessageSquare size={16} />} label="Inquiry" href="https://wa.me/918968141585" />
                            <SocialButton icon={<LinkIcon size={16} />} label="Socials" href="#" />
                        </div>
                    </div>
                </div>
            </section>

            {/* --- CONTROLS --- */}
            <section className="sticky top-20 z-40 bg-black/60 backdrop-blur-xl border-y border-white/5 py-4">
                <div className="container mx-auto px-6">
                    <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-2">
                            <FilterBtn label="All Work" active={activeFilter === "ALL"} onClick={() => setActiveFilter("ALL")} />
                            <FilterBtn label="Shinel Projects" active={activeFilter === "SHINEL"} onClick={() => setActiveFilter("SHINEL")} />
                            <FilterBtn label="Individual" active={activeFilter === "PERSONAL"} onClick={() => setActiveFilter("PERSONAL")} />
                        </div>

                        <div className="relative w-full lg:w-80">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                            <input
                                type="text"
                                placeholder="Search by title..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-sm font-medium outline-none focus:border-orange-500/50 transition-all"
                            />
                        </div>
                    </div>
                </div>
            </section>

            {/* --- PROJECT GRID --- */}
            <main className="py-20 lg:py-32">
                <div className="container mx-auto px-6">
                    <div className="flex items-center justify-between mb-12">
                        <h2 className="text-2xl font-black tracking-tight flex items-center gap-3 lowercase">
                            <LayoutGrid size={24} className="text-orange-500" />
                            projects_{slug}
                        </h2>
                        <div className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">
                            Displaying {filtered.length} Deliverables
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        <AnimatePresence mode="popLayout">
                            {filtered.map((project, idx) => (
                                <PortfolioItem key={project.id} project={project} index={idx} />
                            ))}
                        </AnimatePresence>
                    </div>

                    {filtered.length === 0 && (
                        <div className="py-40 text-center border-2 border-dashed border-white/5 rounded-[40px]">
                            <Sparkles size={48} className="mx-auto text-gray-800 mb-6" />
                            <h3 className="text-2xl font-bold text-gray-500">Silence in the folder</h3>
                            <p className="text-gray-600 mt-2 max-w-xs mx-auto">No matching projects found for this filter combination.</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}

function FilterBtn({ label, active, onClick }) {
    return (
        <button
            onClick={onClick}
            className={`px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all duration-300 ${active
                    ? "bg-orange-500 border-orange-500 text-white shadow-xl shadow-orange-500/20"
                    : "bg-white/5 border-white/10 text-gray-500 hover:text-white hover:border-white/20"
                }`}
        >
            {label}
        </button>
    );
}

function SocialButton({ icon, label, href }) {
    return (
        <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-3 px-6 py-3 rounded-2xl bg-white/[0.03] border border-white/10 hover:bg-white/[0.06] hover:border-orange-500/30 transition-all group"
        >
            <span className="text-gray-400 group-hover:text-orange-500 transition-colors">
                {icon}
            </span>
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 group-hover:text-white transition-colors">
                {label}
            </span>
        </a>
    );
}
