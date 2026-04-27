// src/components/PortfolioPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
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
    Filter,
    Linkedin,
    Twitter,
    Globe,
    Star,
    Briefcase,
    Instagram,
    Youtube,
    PlayCircle,
    Pencil
} from "lucide-react";
import PortfolioItem from "./PortfolioItem";
import MetaTags from "./MetaTags";
import { AUTH_BASE } from "../config/constants";
import { getAuth } from "../utils/auth";
import { resolveMediaUrl } from "../utils/formatters";
import { extractYouTubeId } from "../utils/youtube";
import { Img, GrainOverlay } from "../design";

function normalizeWork(item, type) {
    const isVideo = type === 'video';
    const KNOWN_BAD_IDS = ["t-vPWTJUIO4", "R2jcaMDAvOU"];
    // Playback URL priority: mirror (our backup, no ads, never deleted) →
    // primary (legacy mirror of creator) → creator (last resort, may be
    // deleted by the creator). View counts come pre-cached on the row, so
    // they keep showing even when the creator deletes the original.
    const shinelUrl =
      item.mirror_url || item.mirrorUrl ||
      item.primaryUrl || item.primary_url ||
      item.creatorUrl || item.creator_url ||
      "";
    const ytId = extractYouTubeId(shinelUrl) || extractYouTubeId(item.creatorUrl || item.creator_url) || item.youtubeId || item.videoId || "";
    const useMq = KNOWN_BAD_IDS.includes(ytId);

    return {
        id: item.id || ytId || item.filename,
        title: item.title || item.filename,
        description: isVideo ? `Video Project · ${item.category}` : `Thumbnail Art · ${item.category}`,
        category: item.category || "OTHER",
        image: isVideo
            ? (ytId ? `https://img.youtube.com/vi/${ytId}/${useMq ? 'mqdefault' : 'maxresdefault'}.jpg` : "https://placehold.co/600x400/202020/white?text=No+Preview")
            // Absolute-ify /api/media/view/* paths \u2014 see formatters.js:resolveMediaUrl.
            : resolveMediaUrl(item.imageUrl || item.image_url || item.image || item.thumb, AUTH_BASE),
        link: isVideo ? "/video-editing" : "/thumbnails",
        kind: isVideo ? "video" : "gfx",
        isShinel: item.isShinel !== false,
        attributedTo: item.attributedTo,
        isVisibleOnPersonal: item.isVisibleOnPersonal !== false,
        views: Number(item.views || 0)
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
                    (w.attributedTo === user.email || w.attributedTo === slug) &&
                    w.isVisibleOnPersonal
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

    // Impact calculation
    const impactStats = useMemo(() => {
        const totalViews = projects.reduce((sum, p) => sum + (p.views || 0), 0);
        const count = projects.length;
        return {
            totalReach: totalViews > 1000000 ? `${(totalViews / 1000000).toFixed(1)}M+` :
                totalViews > 1000 ? `${(totalViews / 1000).toFixed(1)}K+` : totalViews,
            avgReach: count ? Math.round(totalViews / count).toLocaleString() : 0,
            projectCount: count
        };
    }, [projects]);

    if (loading && !profile) {
        return (
            <div className="min-h-screen bg-[var(--surface)] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 border-4 border-[var(--orange)]/20 border-t-[var(--orange)] rounded-full animate-spin" />
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--orange)]">Initializing Portfolio</span>
                </div>
            </div>
        );
    }

    if (!profile && !loading) {
        // If the viewer is logged in AND the slug they hit matches their own
        // identity (slug, full email, or local-part), bounce them to /me to
        // set up their portfolio first. This is the "Suyash hits My Public
        // Portfolio before saving anything" path — a dead-end 404 was the
        // wrong UX. The /me editor's first save creates the profile record;
        // next visit to /portfolio/<them> works.
        const viewer = getAuth();
        const slugLc = String(slug || "").toLowerCase();
        const viewerEmail = String(viewer?.email || "").toLowerCase();
        const viewerLocal = viewerEmail.split("@")[0];
        const isOwnSlug = !!viewer?.isAuthed && slugLc && (
            slugLc === viewerEmail ||
            slugLc === viewerLocal ||
            slugLc === String(viewer?.slug || "").toLowerCase()
        );
        if (isOwnSlug) {
            return <Navigate to="/me?seed=1" replace />;
        }
        return (
            <div className="min-h-screen bg-[var(--surface)] flex items-center justify-center text-center p-6">
                <div className="max-w-md">
                    <h2 className="text-4xl font-black mb-4 text-[var(--text)]">Profile not published</h2>
                    <p className="text-[var(--text-muted)] mb-8 mx-auto">
                        This portfolio hasn't been set up yet — or it's private.
                        Browse the rest of the team meanwhile.
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-3">
                        <Link to="/team" className="inline-flex items-center gap-2 text-[var(--orange)] font-bold uppercase tracking-widest text-xs">
                            <ArrowLeft size={16} /> See the team
                        </Link>
                        <span className="text-[var(--text-muted)]">·</span>
                        <Link to="/work" className="inline-flex items-center gap-2 text-[var(--text-muted)] font-bold uppercase tracking-widest text-xs hover:text-[var(--text)]">
                            Studio work
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // Normalize socials — API now returns nested profile.socials{...}; older payloads
    // had flat keys. Read both so this page works against the new endpoint and
    // any legacy data still in KV.
    const s = profile.socials || {};
    const socials = {
      instagram: s.instagram || profile.instagram || "",
      youtube: s.youtube || profile.youtube || "",
      linkedin: s.linkedin || profile.linkedin || "",
      twitter: s.twitter || profile.twitter || "",
      behance: s.behance || "",
      dribbble: s.dribbble || "",
      website: s.website || profile.website || "",
    };

    // Is the viewer this same user? Show "Edit my page" button if so.
    const viewerAuth = getAuth();
    const viewerEmail = String(viewerAuth.email || "").toLowerCase();
    const profileEmail = String(profile.email || "").toLowerCase();
    const isSelfView = viewerAuth.isAuthed && viewerEmail === profileEmail;

    return (
        <div className="min-h-screen bg-[var(--surface)] text-[var(--text)] selection:bg-[var(--orange)]/30 relative">
            <MetaTags
                title={`${profile.firstName} ${profile.lastName} | Creative Portfolio · Shinel Studios`}
                description={profile.headline || `Showcasing the creative impact of ${profile.firstName} at Shinel Studios. Explore high-end video edits and thumbnail designs.`}
            />

            <GrainOverlay />

            {/* --- HERO / PROFILE --- */}
            <section className="relative pt-32 pb-20 overflow-hidden hairline-b">
                <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
                    <div className="absolute top-0 left-1/4 w-96 h-96 bg-[var(--orange)]/10 rounded-full blur-[120px]" />
                    <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px]" />
                </div>

                <div className="container mx-auto px-6 relative z-10">
                    <div className="flex items-center justify-between mb-12 flex-wrap gap-3">
                        <Link to="/team" className="inline-flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--text)] transition-colors text-kicker">
                            <ArrowLeft size={14} /> Back to team
                        </Link>
                        {isSelfView && (
                            <Link to="/me" className="btn-editorial-ghost">
                                <Pencil size={14} /> Edit my page
                            </Link>
                        )}
                    </div>

                    <div className="flex flex-col md:flex-row items-end gap-8 mb-12">
                        <div className="w-32 h-32 md:w-48 md:h-48 rounded-[40px] bg-[var(--surface-alt)] hairline flex items-center justify-center text-[var(--orange)] relative group overflow-hidden">
                            {profile.avatarUrl ? (
                                <Img
                                    src={profile.avatarUrl}
                                    alt={`${profile.firstName} ${profile.lastName}`}
                                    width={192}
                                    height={192}
                                    aspect="1/1"
                                    eager
                                    className="w-full h-full object-cover ken-burns"
                                    style={{ objectFit: "cover" }}
                                />
                            ) : (
                                <>
                                    <User size={64} className="group-hover:scale-110 transition-transform duration-500" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-[var(--orange)]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                </>
                            )}
                        </div>

                        <div className="flex-grow">
                            <div className="flex items-center gap-3 mb-4">
                                <span className="text-kicker px-3 py-1 rounded-full" style={{ background: "var(--orange-soft)", color: "var(--orange)" }}>
                                    {(profile.role || "Creator").split(",")[0]}
                                </span>
                                {profile.isTeam && (
                                    <span className="flex items-center gap-1.5 text-[var(--text-muted)] text-kicker">
                                        <Shield size={12} className="text-[var(--orange)]" />
                                        Verified member
                                    </span>
                                )}
                            </div>
                            <h1 className="text-display-xl tracking-tighter mb-4 text-[var(--text)]">
                                {profile.firstName} <span className="text-[var(--orange)] italic">{profile.lastName}.</span>
                            </h1>
                            {profile.headline && (
                                <p className="text-[var(--text)] text-lg md:text-xl max-w-xl font-medium leading-relaxed mb-4">
                                    {profile.headline}
                                </p>
                            )}
                            <p className="text-[var(--text-muted)] text-base md:text-lg max-w-xl leading-relaxed mb-6">
                                {profile.bio || `Professional ${(profile.role || "Creative").split(",")[0]} focused on high-retention viral storytelling and visual brand dominance at Shinel Studios.`}
                            </p>

                            {profile.skills && (
                                <div className="flex flex-wrap gap-2 mb-6">
                                    {profile.skills.split(",").map(sk => sk.trim()).filter(Boolean).map(sk => (
                                        <span key={sk} className="text-meta px-3 py-1 rounded-full hairline" style={{ color: "var(--text-muted)" }}>
                                            {sk}
                                        </span>
                                    ))}
                                </div>
                            )}

                            {Array.isArray(profile.services) && profile.services.length > 0 && (
                                <div className="mb-6">
                                    <div className="text-eyebrow mb-2">Services offered</div>
                                    <div className="flex flex-wrap gap-2">
                                        {profile.services.map(sv => (
                                            <span key={sv} className="text-sm px-3 py-1.5 rounded-full" style={{ background: "var(--orange-soft)", color: "var(--orange)", border: "1px solid color-mix(in oklab, var(--orange) 25%, transparent)" }}>
                                                {sv}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {profile.experience && (
                                <div className="flex items-start gap-3 p-4 rounded-2xl surface-card max-w-xl mb-8">
                                    <Briefcase size={18} className="text-[var(--orange)] shrink-0 mt-1" />
                                    <div>
                                        <h4 className="text-eyebrow mb-1">Professional background</h4>
                                        <p className="text-sm font-medium leading-relaxed italic" style={{ color: "var(--text-muted)" }}>{profile.experience}</p>
                                    </div>
                                </div>
                            )}

                            {profile.showreelUrl && (
                                <a
                                    href={profile.showreelUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-2 text-kicker mb-6 hover:gap-3 transition-all"
                                    style={{ color: "var(--orange)" }}
                                >
                                    <PlayCircle size={16} /> Watch showreel <ExternalLink size={12} />
                                </a>
                            )}

                            {impactStats.projectCount > 0 && (
                                <div className="flex gap-8 mt-8 hairline-t pt-8">
                                    <div className="flex flex-col">
                                        <span className="text-eyebrow mb-1" style={{ color: "var(--orange)" }}>Total reach</span>
                                        <span className="text-display-md text-mono-num">{impactStats.totalReach}</span>
                                    </div>
                                    <div className="flex flex-col border-l border-[var(--hairline)] pl-8">
                                        <span className="text-eyebrow mb-1">Avg per project</span>
                                        <span className="text-display-md text-mono-num">{impactStats.avgReach}</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col gap-3 min-w-[200px]">
                            <SocialButton
                                icon={<Zap size={16} />}
                                label={`Hire ${profile.firstName || "them"}`}
                                href={
                                    profile.calendlyUrl ||
                                    `https://wa.me/${(profile.whatsappNumber || "918968141585").replace(/\D/g, "")}?text=${encodeURIComponent(`Hi ${profile.firstName || ""}, I'm interested in working with you on a project via Shinel Studios.`)}`
                                }
                                primary
                            />
                            <div className="grid grid-cols-2 gap-3">
                                {socials.instagram && <SocialButton icon={<Instagram size={16} />} label="Instagram" href={socials.instagram} />}
                                {socials.youtube && <SocialButton icon={<Youtube size={16} />} label="YouTube" href={socials.youtube} />}
                                {socials.linkedin && <SocialButton icon={<Linkedin size={16} />} label="LinkedIn" href={socials.linkedin} />}
                                {socials.twitter && <SocialButton icon={<Twitter size={16} />} label="X" href={socials.twitter} />}
                                {socials.behance && <SocialButton icon={<Globe size={16} />} label="Behance" href={socials.behance} />}
                                {socials.dribbble && <SocialButton icon={<Globe size={16} />} label="Dribbble" href={socials.dribbble} />}
                                {socials.website && <SocialButton icon={<Globe size={16} />} label="Website" href={socials.website} />}
                                <SocialButton icon={<MessageSquare size={16} />} label="Inquiry" href={`https://wa.me/${(profile.whatsappNumber || "918968141585").replace(/\D/g, "")}`} />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- CONTROLS --- */}
            <section className="sticky top-20 z-40 bg-[var(--surface)]/80 backdrop-blur-xl border-y border-[var(--border)] py-4"
                style={{ WebkitBackdropFilter: "blur(32px)" }}>
                <div className="container mx-auto px-6">
                    <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-2">
                            <FilterBtn label="All Work" active={activeFilter === "ALL"} onClick={() => setActiveFilter("ALL")} />
                            <FilterBtn label="Shinel Projects" active={activeFilter === "SHINEL"} onClick={() => setActiveFilter("SHINEL")} />
                            <FilterBtn label="Individual" active={activeFilter === "PERSONAL"} onClick={() => setActiveFilter("PERSONAL")} />
                        </div>

                        <div className="relative w-full lg:w-80">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
                            <input
                                type="text"
                                placeholder="Search by title..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full bg-[var(--surface-alt)] border border-[var(--border)] rounded-2xl py-3 pl-12 pr-4 text-sm font-medium outline-none focus:border-[var(--orange)]/50 transition-all text-[var(--text)]"
                            />
                        </div>
                    </div>
                </div>
            </section>

            {/* --- PROJECT GRID --- */}
            <main className="py-20 lg:py-32">
                <div className="container mx-auto px-6">
                    <div className="flex items-center justify-between mb-12">
                        <h2 className="text-2xl font-black tracking-tight flex items-center gap-3 lowercase text-[var(--text)]">
                            <LayoutGrid size={24} className="text-[var(--orange)]" />
                            projects_{slug}
                        </h2>
                        <div className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em]">
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
                        <div className="py-40 text-center border-2 border-dashed border-[var(--border)] rounded-[40px]">
                            <Sparkles size={48} className="mx-auto text-[var(--text-muted)]/20 mb-6" />
                            <h3 className="text-2xl font-bold text-[var(--text-muted)]">Silence in the folder</h3>
                            <p className="text-[var(--text-muted)] mt-2 max-w-xs mx-auto">No matching projects found for this filter combination.</p>
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
                ? "bg-[var(--orange)] border-[var(--orange)] text-white shadow-xl shadow-[var(--orange)]/20"
                : "bg-[var(--surface-alt)] border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] hover:border-[var(--text)]/20"
                }`}
        >
            {label}
        </button>
    );
}

function SocialButton({ icon, label, href, primary }) {
    return (
        <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className={`flex items-center justify-center gap-3 px-6 py-3 rounded-2xl border transition-all group ${primary
                ? "bg-[var(--orange)] border-[var(--orange)] text-white shadow-lg shadow-[var(--orange)]/20 hover:scale-[1.02]"
                : "bg-[var(--surface-alt)] border-[var(--border)] hover:bg-[var(--surface)] hover:border-[var(--orange)]/30 text-[var(--text-muted)]"
                }`}
        >
            <span className={`${primary ? "text-white" : "group-hover:text-[var(--orange)]"} transition-colors`}>
                {icon}
            </span>
            <span className={`text-[10px] font-black uppercase tracking-widest ${primary ? "text-white" : "group-hover:text-[var(--text)]"} transition-colors`}>
                {label}
            </span>
        </a>
    );
}
