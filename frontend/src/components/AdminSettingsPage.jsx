import React, { useState, useEffect } from "react";
import {
    Settings,
    Zap,
    BarChart3,
    Activity,
    Save,
    RefreshCw,
    AlertCircle,
    CheckCircle2,
    TrendingUp,
    Users,
    Video,
    DollarSign,
    Plus,
    Trash2,
    Image as IconImage,
    Sparkles,
    Search,
    Instagram,
    Youtube,
    Twitter,
    Linkedin,
    Facebook,
    Music,
    MessageCircle,
    Twitch as TwitchIcon,
    Github,
    Dribbble,
    Globe,
    ShieldCheck
} from "lucide-react";
import { motion } from "framer-motion";
import { useGlobalConfig } from "../context/GlobalConfigContext";

// Platform icon mapping
const PLATFORM_ICONS = {
    instagram: Instagram,
    youtube: Youtube,
    twitter: Twitter,
    linkedin: Linkedin,
    facebook: Facebook,
    tiktok: Music,
    discord: MessageCircle,
    twitch: TwitchIcon,
    github: Github,
    behance: IconImage,
    dribbble: Dribbble,
    other: Globe
};

/* ---------------- helpers: safe base64url + jwt ---------------- */
function base64UrlDecode(str) {
    try {
        if (!str) return "";
        const b64 = str.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((str.length + 3) % 4);
        return decodeURIComponent(escape(atob(b64)));
    } catch { return ""; }
}
function parseJwt(token) {
    try {
        const parts = String(token || "").split(".");
        if (parts.length < 2) return null;
        return JSON.parse(base64UrlDecode(parts[1]));
    } catch { return null; }
}

export default function AdminSettingsPage() {
    const { config, updateConfig, loading, refreshConfig } = useGlobalConfig();
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState({ type: "", text: "" });

    const [ytKeys, setYtKeys] = useState([]);
    const [ytLoading, setYtLoading] = useState(false);

    const fetchYtHealth = async () => {
        setYtLoading(true);
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${AUTH_BASE}/admin/yt-quota`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) setYtKeys(data.keys || []);
        } catch (err) {
            console.error("Failed to fetch YT health:", err);
        } finally {
            setYtLoading(false);
        }
    };

    useEffect(() => {
        if (isAdmin) fetchYtHealth();
    }, [isAdmin]);

    // Role detection
    const token = localStorage.getItem("token") || "";
    const payload = parseJwt(token);
    const rawRole = (payload?.role || localStorage.getItem("role") || "client").toLowerCase();
    const userRoles = rawRole.split(",").map(r => r.trim()).filter(Boolean);
    const isAdmin = userRoles.includes('admin');
    const isStaff = userRoles.some(r => ['admin', 'staff', 'editor'].includes(r));

    // Local form state
    const [formData, setFormData] = useState({
        // === SOCIAL LINKS ===
        socialLinks: [
            // Example: { platform: "instagram", label: "Main Account", url: "https://instagram.com/shinelstudios" }
        ],

        // === STATS ===
        stats: {
            videosDelivered: 300,
            totalReach: 10000000,
            creatorsImpacted: 50,
            newsletterSubscribers: 5000,
            ctrBoostMin: 3.1,
            ctrBoostMax: 5.0
        },
        workPageStats: {
            projectsDelivered: 0,
            happyClients: 0,
            viewsGenerated: 0,
            useCalculated: true
        },

        // === PRICING ===
        pricing: {
            gaming: { starter: 599, highlights: 6999, rankup: 5499, pro: 13499 },
            vlog: { starter: 699, driver: 9999, story: 7499, suite: 17999 },
            talking: { starter: 999, studio: 13999, clips: 14999, network: 24999 }
        },

        // === SOCIAL PROOF ===
        proofShowcases: [],
        caseStudies: []
    });

    useEffect(() => {
        if (config && Object.keys(config).length > 0) {
            setFormData(prev => ({
                ...prev,
                ...config
            }));
        }
    }, [config]);

    const handleSave = async (e) => {
        e.preventDefault();
        setBusy(true);
        setMsg({ type: "", text: "" });

        const res = await updateConfig(formData);
        if (res.success) {
            setMsg({ type: "success", text: "Global configuration updated successfully!" });
        } else {
            setMsg({ type: "error", text: res.error || "Update failed" });
        }
        setBusy(false);
    };

    if (loading) return (
        <div className="flex items-center justify-center py-32">
            <RefreshCw className="animate-spin text-orange-500" size={32} />
        </div>
    );

    if (!isAdmin) return (
        <div className="flex flex-col items-center justify-center py-32 text-center space-y-4">
            <ShieldCheck size={48} className="text-red-500" />
            <h1 className="text-2xl font-black uppercase tracking-tighter italic">Access <span className="text-red-500">Denied.</span></h1>
            <p className="text-[var(--text-muted)] text-xs font-black uppercase tracking-widest max-w-md">
                Only administrators can modify global website variables and production statistics.
            </p>
        </div>
    );

    return (
        <section className="space-y-10 pb-20">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black tracking-tighter uppercase italic text-[var(--text)]">Control <span className="text-orange-500">Center.</span></h1>
                    <p className="text-[var(--text-muted)] text-xs font-black uppercase tracking-widest mt-1">Global Website Variables & Production Stats</p>
                </div>
                <button
                    onClick={refreshConfig}
                    className="p-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl hover:bg-[var(--surface-alt)] transition-colors text-[var(--text)]"
                    title="Refresh from server"
                >
                    <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
                </button>
            </div>

            {msg.text && (
                <div className={`p-4 rounded-2xl flex items-center gap-3 text-sm font-bold border ${msg.type === "success" ? "bg-green-500/10 border-green-500/20 text-green-500" : "bg-red-500/10 border-red-500/20 text-red-500"
                    }`}>
                    {msg.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                    {msg.text}
                </div>
            )}

            <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-2 gap-10">

                {/* LEFT COLUMN */}
                <div className="space-y-6">
                    {/* --- Social Links --- */}
                    <div className="p-8 rounded-[32px] bg-[var(--surface)] border border-[var(--border)] space-y-8">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
                                    <Users size={20} />
                                </div>
                                <h2 className="text-lg font-black uppercase tracking-widest">Social Links</h2>
                            </div>
                            <button
                                type="button"
                                onClick={() => setFormData({
                                    ...formData,
                                    socialLinks: [...formData.socialLinks, { platform: "instagram", label: "", url: "" }]
                                })}
                                className="p-2 rounded-xl bg-green-500/10 text-green-500 hover:bg-green-500/20 transition-all"
                            >
                                <Plus size={18} />
                            </button>
                        </div>

                        {formData.socialLinks.length === 0 ? (
                            <div className="text-center py-8 text-[var(--text-muted)] text-sm">
                                No social links added. Click + to add one.
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {formData.socialLinks.map((link, idx) => {
                                    const PlatformIcon = PLATFORM_ICONS[link.platform] || Globe;
                                    return (
                                        <div key={idx} className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] space-y-3 relative z-10">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className="p-1.5 rounded-lg bg-orange-500/10 text-orange-500">
                                                        <PlatformIcon size={16} />
                                                    </div>
                                                    <h3 className="text-[9px] font-black uppercase tracking-widest text-orange-500">
                                                        Link #{idx + 1}
                                                    </h3>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData({
                                                        ...formData,
                                                        socialLinks: formData.socialLinks.filter((_, i) => i !== idx)
                                                    })}
                                                    className="p-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>

                                            <div className="grid grid-cols-3 gap-3">
                                                <div className="space-y-1.5 relative">
                                                    <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Platform</label>
                                                    <select
                                                        value={link.platform}
                                                        onChange={e => {
                                                            const updated = [...formData.socialLinks];
                                                            updated[idx].platform = e.target.value;
                                                            setFormData({ ...formData, socialLinks: updated });
                                                        }}
                                                        className="w-full px-4 py-3.5 bg-[var(--surface)] border border-[var(--border)] rounded-2xl text-sm font-bold text-[var(--text)] focus:border-orange-500 outline-none transition-all appearance-none cursor-pointer"
                                                        style={{
                                                            position: 'relative',
                                                            zIndex: 50,
                                                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='${encodeURIComponent(getComputedStyle(document.documentElement).getPropertyValue('--text').trim() || 'white')}'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                                                            backgroundRepeat: 'no-repeat',
                                                            backgroundPosition: 'right 1rem center',
                                                            backgroundSize: '1.25rem',
                                                            paddingRight: '3rem'
                                                        }}
                                                    >
                                                        <option value="instagram" className="bg-[#1A1A1A] text-[var(--text)]">Instagram</option>
                                                        <option value="youtube" className="bg-[#1A1A1A] text-[var(--text)]">YouTube</option>
                                                        <option value="twitter" className="bg-[#1A1A1A] text-[var(--text)]">Twitter</option>
                                                        <option value="linkedin" className="bg-[#1A1A1A] text-[var(--text)]">LinkedIn</option>
                                                        <option value="facebook" className="bg-[#1A1A1A] text-[var(--text)]">Facebook</option>
                                                        <option value="tiktok" className="bg-[#1A1A1A] text-[var(--text)]">TikTok</option>
                                                        <option value="discord" className="bg-[#1A1A1A] text-[var(--text)]">Discord</option>
                                                        <option value="twitch" className="bg-[#1A1A1A] text-[var(--text)]">Twitch</option>
                                                        <option value="github" className="bg-[#1A1A1A] text-[var(--text)]">GitHub</option>
                                                        <option value="behance" className="bg-[#1A1A1A] text-[var(--text)]">Behance</option>
                                                        <option value="dribbble" className="bg-[#1A1A1A] text-[var(--text)]">Dribbble</option>
                                                        <option value="other" className="bg-[#1A1A1A] text-[var(--text)]">Other</option>
                                                    </select>
                                                </div>

                                                <div className="space-y-1.5">
                                                    <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Label</label>
                                                    <input
                                                        type="text"
                                                        placeholder="e.g. Main Account"
                                                        value={link.label}
                                                        onChange={e => {
                                                            const updated = [...formData.socialLinks];
                                                            updated[idx].label = e.target.value;
                                                            setFormData({ ...formData, socialLinks: updated });
                                                        }}
                                                        className="w-full px-4 py-3.5 bg-[var(--input-bg)] border border-[var(--border)] rounded-2xl text-sm font-bold text-[var(--text)] placeholder:text-[var(--text-muted)] focus:border-orange-500 outline-none transition-all"
                                                    />
                                                </div>

                                                <div className="space-y-1.5 col-span-1">
                                                    <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">URL</label>
                                                    <input
                                                        type="url"
                                                        placeholder="https://..."
                                                        value={link.url}
                                                        onChange={e => {
                                                            const updated = [...formData.socialLinks];
                                                            updated[idx].url = e.target.value;
                                                            setFormData({ ...formData, socialLinks: updated });
                                                        }}
                                                        className="w-full px-4 py-3.5 bg-[var(--input-bg)] border border-[var(--border)] rounded-2xl text-sm font-bold text-[var(--text)] placeholder:text-[var(--text-muted)] focus:border-orange-500 outline-none transition-all"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* --- Production Stats --- */}
                    <div className="p-8 rounded-[32px] bg-[var(--surface)] border border-[var(--border)] space-y-8">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-orange-500/10 text-orange-500">
                                <Activity size={20} />
                            </div>
                            <h2 className="text-lg font-black uppercase tracking-widest">Public Production Stats</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <StatInput
                                label="Videos Delivered"
                                icon={Video}
                                value={formData.stats.videosDelivered}
                                onChange={v => setFormData({ ...formData, stats: { ...formData.stats, videosDelivered: Number(v) } })}
                            />
                            <StatInput
                                label="Total Reach (Display Text)"
                                icon={TrendingUp}
                                value={formData.stats.totalReach}
                                onChange={v => setFormData({ ...formData, stats: { ...formData.stats, totalReach: v } })}
                                type="text"
                            />
                            <StatInput
                                label="Creators Impacted"
                                icon={Users}
                                value={formData.stats.creatorsImpacted}
                                onChange={v => setFormData({ ...formData, stats: { ...formData.stats, creatorsImpacted: Number(v) } })}
                            />
                            <StatInput
                                label="Newsletter Subs"
                                icon={TrendingUp}
                                value={formData.stats.newsletterSubscribers}
                                onChange={v => setFormData({ ...formData, stats: { ...formData.stats, newsletterSubscribers: Number(v) } })}
                            />
                        </div>
                    </div>

                    {/* --- Work Page Stats --- */}
                    <div className="p-8 rounded-[32px] bg-[var(--surface)] border border-[var(--border)] space-y-8">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-orange-500/10 text-orange-500">
                                <BarChart3 size={20} />
                            </div>
                            <h2 className="text-lg font-black uppercase tracking-widest">Work Page Stats</h2>
                        </div>

                        {/* Toggle for Manual vs Calculated */}
                        <div className="flex items-center justify-between p-4 rounded-2xl bg-[var(--surface-alt)] border border-[var(--border)]">
                            <div>
                                <p className="text-sm font-bold text-[var(--text)]">Use Calculated Stats</p>
                                <p className="text-[9px] text-[var(--text-muted)] font-black uppercase tracking-widest mt-1">
                                    Auto-calculate from project data
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setFormData({
                                    ...formData,
                                    workPageStats: {
                                        ...formData.workPageStats,
                                        useCalculated: !formData.workPageStats.useCalculated
                                    }
                                })}
                                className={`relative w-14 h-7 rounded-full transition-colors ${formData.workPageStats.useCalculated ? 'bg-orange-500' : 'bg-[var(--surface)] border border-[var(--border)]'
                                    }`}
                            >
                                <div className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform ${formData.workPageStats.useCalculated ? 'translate-x-7' : ''
                                    }`} />
                            </button>
                        </div>

                        {!formData.workPageStats.useCalculated && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <StatInput
                                    label="Projects Delivered"
                                    icon={Video}
                                    value={formData.workPageStats.projectsDelivered}
                                    onChange={v => setFormData({
                                        ...formData,
                                        workPageStats: { ...formData.workPageStats, projectsDelivered: Number(v) }
                                    })}
                                />
                                <StatInput
                                    label="Happy Clients"
                                    icon={Users}
                                    value={formData.workPageStats.happyClients}
                                    onChange={v => setFormData({
                                        ...formData,
                                        workPageStats: { ...formData.workPageStats, happyClients: Number(v) }
                                    })}
                                />
                                <StatInput
                                    label="Views Generated (Millions)"
                                    icon={TrendingUp}
                                    value={formData.workPageStats.viewsGenerated}
                                    onChange={v => setFormData({
                                        ...formData,
                                        workPageStats: { ...formData.workPageStats, viewsGenerated: Number(v) }
                                    })}
                                />
                            </div>
                        )}

                        {formData.workPageStats.useCalculated && (
                            <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20">
                                <p className="text-xs text-blue-600 dark:text-blue-400 font-bold">
                                    ✓ Stats will be automatically calculated from your project data (videos + thumbnails with isShinel=true)
                                </p>
                            </div>
                        )}
                    </div>

                    {/* --- CTR Optimization --- */}
                    <div className="p-8 rounded-[32px] bg-[var(--surface)] border border-[var(--border)] space-y-8">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
                                <Zap size={20} />
                            </div>
                            <h2 className="text-lg font-black uppercase tracking-widest">CTR Performance (Testimonials)</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <StatInput
                                label="Min Boost (%)"
                                value={formData.stats.ctrBoostMin}
                                onChange={v => setFormData({ ...formData, stats: { ...formData.stats, ctrBoostMin: Number(v) } })}
                            />
                            <StatInput
                                label="Max Boost (%)"
                                value={formData.stats.ctrBoostMax}
                                onChange={v => setFormData({ ...formData, stats: { ...formData.stats, ctrBoostMax: Number(v) } })}
                            />
                        </div>

                        <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest">These values control the baseline CTR transformation shown in the testimonials section.</p>
                    </div>

                    {/* --- YouTube API Health --- */}
                    {isAdmin && (
                        <div className="p-8 rounded-[32px] bg-[var(--surface)] border border-[var(--border)] space-y-8">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-xl bg-red-500/10 text-red-500">
                                        <Youtube size={20} />
                                    </div>
                                    <h2 className="text-lg font-black uppercase tracking-widest">YouTube API Health</h2>
                                </div>
                                <button
                                    onClick={fetchYtHealth}
                                    disabled={ytLoading}
                                    className="p-2 rounded-xl border border-[var(--border)] hover:bg-[var(--surface-alt)] transition-colors disabled:opacity-50"
                                >
                                    <RefreshCw size={16} className={ytLoading ? "animate-spin" : ""} />
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {ytKeys.length > 0 ? ytKeys.map((k, i) => (
                                    <div key={i} className="p-5 rounded-2xl bg-[var(--surface-alt)]/50 border border-[var(--border)] flex items-center justify-between">
                                        <div className="space-y-1">
                                            <p className="text-xs font-black uppercase tracking-widest opacity-40">Key {i + 1}</p>
                                            <code className="text-[10px] font-mono opacity-80">{k.masked}</code>
                                        </div>
                                        <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${k.status === 'ACTIVE'
                                            ? 'bg-green-500/10 text-green-500'
                                            : 'bg-red-500/10 text-red-500'
                                            }`}>
                                            {k.status}
                                        </div>
                                    </div>
                                )) : (
                                    <p className="text-xs text-[var(--text-muted)] font-bold italic col-span-2">
                                        No API keys configured or healthy status unavailable.
                                    </p>
                                )}
                            </div>
                            <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest leading-relaxed">
                                Shinel uses intelligent key rotation. Exhausted keys are automatically blacklisted for 1 hour to prevent sync failures.
                            </p>
                        </div>
                    )}
                </div>

                {/* RIGHT COLUMN */}
                <div className="space-y-6">
                    <div className="p-8 rounded-[32px] bg-[var(--surface)] border border-[var(--border)] space-y-8">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-500">
                                    <IconImage size={20} />
                                </div>
                                <h2 className="text-lg font-black uppercase tracking-widest">Proof Showcases</h2>
                            </div>
                            <button
                                type="button"
                                onClick={addShowcase}
                                className="p-2 rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition-colors flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
                            >
                                <Plus size={14} /> Add Showcase
                            </button>
                        </div>

                        <div className="space-y-6">
                            {(formData.proofShowcases || []).map((s, idx) => (
                                <div key={idx} className="p-6 rounded-2xl bg-[var(--surface-alt)] border border-[var(--border)] relative group">
                                    <button
                                        type="button"
                                        onClick={() => removeShowcase(idx)}
                                        className="absolute -top-2 -right-2 p-2 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-xl hover:bg-red-600"
                                    >
                                        <Trash2 size={14} />
                                    </button>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="md:col-span-2">
                                            <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Category & Hook</label>
                                            <input
                                                type="text"
                                                value={s.category}
                                                placeholder="e.g. Gaming (BGMI - Rank Push)"
                                                onChange={e => updateShowcase(idx, 'category', e.target.value)}
                                                className="w-full px-4 py-3.5 bg-[var(--input-bg)] border border-[var(--border)] rounded-2xl text-sm font-bold text-[var(--text)] placeholder:text-[var(--text-muted)] focus:border-orange-500 outline-none transition-all mt-1"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Before Image URL</label>
                                            <input
                                                type="text"
                                                value={s.beforeImage}
                                                placeholder="Asset path or URL"
                                                onChange={e => updateShowcase(idx, 'beforeImage', e.target.value)}
                                                className="w-full px-4 py-3.5 bg-[var(--input-bg)] border border-[var(--border)] rounded-2xl text-sm font-bold text-[var(--text)] placeholder:text-[var(--text-muted)] focus:border-orange-500 outline-none transition-all mt-1"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">After Image URL</label>
                                            <input
                                                type="text"
                                                value={s.afterImage}
                                                placeholder="Asset path or URL"
                                                onChange={e => updateShowcase(idx, 'afterImage', e.target.value)}
                                                className="w-full px-4 py-3.5 bg-[var(--input-bg)] border border-[var(--border)] rounded-2xl text-sm font-bold text-[var(--text)] placeholder:text-[var(--text-muted)] focus:border-orange-500 outline-none transition-all mt-1"
                                            />
                                        </div>
                                        <div className="grid grid-cols-3 gap-3 md:col-span-2">
                                            <div>
                                                <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">CTR %</label>
                                                <input
                                                    type="number"
                                                    value={s.stats?.ctrIncrease}
                                                    onChange={e => updateShowcase(idx, 'stats', { ...s.stats, ctrIncrease: Number(e.target.value) })}
                                                    className="w-full px-4 py-3.5 bg-[var(--input-bg)] border border-[var(--border)] rounded-2xl text-sm font-bold text-[var(--text)] placeholder:text-[var(--text-muted)] focus:border-orange-500 outline-none transition-all mt-1"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Views</label>
                                                <input
                                                    type="text"
                                                    value={s.stats?.viewsMultiplier}
                                                    placeholder="e.g. 3.1x"
                                                    onChange={e => updateShowcase(idx, 'stats', { ...s.stats, viewsMultiplier: e.target.value })}
                                                    className="w-full px-4 py-3.5 bg-[var(--input-bg)] border border-[var(--border)] rounded-2xl text-sm font-bold text-[var(--text)] placeholder:text-[var(--text-muted)] focus:border-orange-500 outline-none transition-all mt-1"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Days</label>
                                                <input
                                                    type="text"
                                                    value={s.stats?.turnaroundDays}
                                                    placeholder="e.g. 2"
                                                    onChange={e => updateShowcase(idx, 'stats', { ...s.stats, turnaroundDays: e.target.value })}
                                                    className="w-full px-4 py-3.5 bg-[var(--input-bg)] border border-[var(--border)] rounded-2xl text-sm font-bold text-[var(--text)] placeholder:text-[var(--text-muted)] focus:border-orange-500 outline-none transition-all mt-1"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {(formData.proofShowcases || []).length === 0 && (
                                <div className="text-center py-10 border border-dashed border-[var(--border)] rounded-2xl">
                                    <p className="text-gray-600 text-[10px] font-black uppercase tracking-widest">No active showcases. Defaults will be used site-wide.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* --- Case Studies Management --- */}
                    <div className="p-8 rounded-[32px] bg-[var(--surface)] border border-[var(--border)] space-y-8">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
                                    <BarChart3 size={20} />
                                </div>
                                <h2 className="text-lg font-black uppercase tracking-widest">Recent Wins (Case Studies)</h2>
                            </div>
                            <button
                                type="button"
                                onClick={addCaseStudy}
                                className="p-2 rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition-colors flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
                            >
                                <Plus size={14} /> Add Case Study
                            </button>
                        </div>

                        <div className="space-y-6">
                            {(formData.caseStudies || []).map((cs, idx) => (
                                <div key={idx} className="p-6 rounded-2xl bg-[var(--surface-alt)] border border-[var(--border)] relative group">
                                    <button
                                        type="button"
                                        onClick={() => removeCaseStudy(idx)}
                                        className="absolute -top-2 -right-2 p-2 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-xl hover:bg-red-600"
                                    >
                                        <Trash2 size={14} />
                                    </button>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="md:col-span-2">
                                            <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Title</label>
                                            <input
                                                type="text"
                                                value={cs.title}
                                                placeholder="e.g. Packaging revamp for Kamz Inkzone"
                                                onChange={e => updateCaseStudy(idx, 'title', e.target.value)}
                                                className="w-full px-4 py-3.5 bg-[var(--input-bg)] border border-[var(--border)] rounded-2xl text-sm font-bold text-[var(--text)] placeholder:text-[var(--text-muted)] focus:border-orange-500 outline-none transition-all mt-1"
                                            />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Description</label>
                                            <textarea
                                                value={cs.description}
                                                onChange={e => updateCaseStudy(idx, 'description', e.target.value)}
                                                className="w-full px-4 py-3.5 bg-[var(--input-bg)] border border-[var(--border)] rounded-2xl text-sm font-bold text-[var(--text)] placeholder:text-[var(--text-muted)] focus:border-orange-500 outline-none transition-all mt-1 min-h-[80px]"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Metric (High-level)</label>
                                            <input
                                                type="text"
                                                value={cs.metric}
                                                placeholder="+62% CTR"
                                                onChange={e => updateCaseStudy(idx, 'metric', e.target.value)}
                                                className="w-full px-4 py-3.5 bg-[var(--input-bg)] border border-[var(--border)] rounded-2xl text-sm font-bold text-[var(--text)] placeholder:text-[var(--text-muted)] focus:border-orange-500 outline-none transition-all mt-1"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Period</label>
                                            <input
                                                type="text"
                                                value={cs.period}
                                                placeholder="in 6 weeks"
                                                onChange={e => updateCaseStudy(idx, 'period', e.target.value)}
                                                className="w-full px-4 py-3.5 bg-[var(--input-bg)] border border-[var(--border)] rounded-2xl text-sm font-bold text-[var(--text)] placeholder:text-[var(--text-muted)] focus:border-orange-500 outline-none transition-all mt-1"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Asset Key (Thumbnail)</label>
                                            <input
                                                type="text"
                                                value={cs.keys?.thumb}
                                                placeholder="e.g. creator3"
                                                onChange={e => updateCaseStudy(idx, 'keys', { ...cs.keys, thumb: e.target.value })}
                                                className="w-full px-4 py-3.5 bg-[var(--input-bg)] border border-[var(--border)] rounded-2xl text-sm font-bold text-[var(--text)] placeholder:text-[var(--text-muted)] focus:border-orange-500 outline-none transition-all mt-1"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Category</label>
                                            <input
                                                type="text"
                                                value={cs.category}
                                                placeholder="Thumbnails"
                                                onChange={e => updateCaseStudy(idx, 'category', e.target.value)}
                                                className="w-full px-4 py-3.5 bg-[var(--input-bg)] border border-[var(--border)] rounded-2xl text-sm font-bold text-[var(--text)] placeholder:text-[var(--text-muted)] focus:border-orange-500 outline-none transition-all mt-1"
                                            />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Highlights (comma separated)</label>
                                            <input
                                                type="text"
                                                value={cs.highlights?.join(', ')}
                                                onChange={e => updateCaseStudy(idx, 'highlights', e.target.value.split(',').map(h => h.trim()))}
                                                className="w-full px-4 py-3.5 bg-[var(--input-bg)] border border-[var(--border)] rounded-2xl text-sm font-bold text-[var(--text)] placeholder:text-[var(--text-muted)] focus:border-orange-500 outline-none transition-all mt-1"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {(formData.caseStudies || []).length === 0 && (
                                <div className="text-center py-10 border border-dashed border-[var(--border)] rounded-2xl">
                                    <p className="text-gray-600 text-[10px] font-black uppercase tracking-widest">No custom case studies. Defaults will be used site-wide.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* --- Pricing Controls --- */}
                <div className="space-y-6">
                    <div className="p-8 rounded-[32px] bg-[var(--surface)] border border-[var(--border)] space-y-8">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-green-500/10 text-green-500">
                                <DollarSign size={20} />
                            </div>
                            <h2 className="text-lg font-black uppercase tracking-widest">Pricing Modules (INR)</h2>
                        </div>

                        {/* Gaming Category */}
                        <div className="space-y-4">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-500 border-b border-orange-500/10 pb-2">Gaming Category</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <StatInput label="Trial" value={formData.pricing.gaming.starter} onChange={v => setPrice('gaming', 'starter', v)} />
                                <StatInput label="Shorts Factory" value={formData.pricing.gaming.highlights} onChange={v => setPrice('gaming', 'highlights', v)} />
                                <StatInput label="Vanguard" value={formData.pricing.gaming.rankup} onChange={v => setPrice('gaming', 'rankup', v)} />
                                <StatInput label="Empire" value={formData.pricing.gaming.pro} onChange={v => setPrice('gaming', 'pro', v)} />
                            </div>
                        </div>

                        {/* Vlog Category */}
                        <div className="space-y-4">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-500 border-b border-blue-500/10 pb-2 flex items-center justify-between">Vlog Category</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <StatInput label="Spark" value={formData.pricing.vlog.starter} onChange={v => setPrice('vlog', 'starter', v)} />
                                <StatInput label="Daily Driver" value={formData.pricing.vlog.driver} onChange={v => setPrice('vlog', 'driver', v)} />
                                <StatInput label="Cinematic" value={formData.pricing.vlog.story} onChange={v => setPrice('vlog', 'story', v)} />
                                <StatInput label="Auteur" value={formData.pricing.vlog.suite} onChange={v => setPrice('vlog', 'suite', v)} />
                            </div>
                        </div>

                        {/* Talking Heads Category */}
                        <div className="space-y-4">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-purple-500 border-b border-purple-500/10 pb-2">Talking Heads</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <StatInput label="On-Air" value={formData.pricing.talking.starter} onChange={v => setPrice('talking', 'starter', v)} />
                                <StatInput label="Studio" value={formData.pricing.talking.studio} onChange={v => setPrice('talking', 'studio', v)} />
                                <StatInput label="Flywheel" value={formData.pricing.talking.clips} onChange={v => setPrice('talking', 'clips', v)} />
                                <StatInput label="Enterprise" value={formData.pricing.talking.network} onChange={v => setPrice('talking', 'network', v)} />
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={busy}
                        className="w-full py-6 bg-orange-600 text-white font-black uppercase tracking-[0.4em] rounded-[24px] hover:bg-orange-500 transition-all shadow-xl shadow-orange-600/20 flex items-center justify-center gap-3 group active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
                    >
                        {busy ? <RefreshCw className="animate-spin" /> : <Save size={20} className="group-hover:scale-110 transition-transform" />}
                        {busy ? "Applying Changes..." : "Deploy Config Site-wide"}
                    </button>
                </div>
            </form>
        </section >
    );

    function setPrice(cat, key, val) {
        setFormData({
            ...formData,
            pricing: {
                ...formData.pricing,
                [cat]: {
                    ...formData.pricing[cat],
                    [key]: Number(val)
                }
            }
        });
    }

    function addShowcase() {
        setFormData(prev => ({
            ...prev,
            proofShowcases: [
                ...(prev.proofShowcases || []),
                {
                    category: "",
                    beforeImage: "",
                    afterImage: "",
                    stats: { ctrIncrease: 0, viewsMultiplier: "", turnaroundDays: "" }
                }
            ]
        }));
    }

    function updateShowcase(idx, key, val) {
        setFormData(prev => {
            const next = [...(prev.proofShowcases || [])];
            next[idx] = { ...next[idx], [key]: val };
            return { ...prev, proofShowcases: next };
        });
    }

    function removeShowcase(idx) {
        setFormData(prev => ({
            ...prev,
            proofShowcases: (prev.proofShowcases || []).filter((_, i) => i !== idx)
        }));
    }

    function addCaseStudy() {
        setFormData(prev => ({
            ...prev,
            caseStudies: [
                ...(prev.caseStudies || []),
                {
                    title: "",
                    description: "",
                    metric: "",
                    period: "",
                    category: "",
                    gradient: "linear-gradient(135deg, #ff6b6b, #ee5a6f)",
                    keys: { thumb: "", hook: "", edit: "" },
                    highlights: []
                }
            ]
        }));
    }

    function updateCaseStudy(idx, key, val) {
        setFormData(prev => {
            const next = [...(prev.caseStudies || [])];
            next[idx] = { ...next[idx], [key]: val };
            return { ...prev, caseStudies: next };
        });
    }

    function removeCaseStudy(idx) {
        setFormData(prev => ({
            ...prev,
            caseStudies: (prev.caseStudies || []).filter((_, i) => i !== idx)
        }));
    }
}

function StatInput({ label, value, onChange, icon: Icon, type = "number" }) {
    return (
        <div className="space-y-1.5">
            <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">{label}</label>
            <div className="relative">
                {Icon && <Icon size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />}
                <input
                    type={type}
                    value={value || ""}
                    onChange={e => onChange(e.target.value)}
                    className={`w-full ${Icon ? 'pl-10' : 'px-4'} py-3.5 bg-[var(--input-bg)] border border-[var(--border)] rounded-2xl text-sm font-bold text-[var(--text)] placeholder:text-[var(--text-muted)] focus:border-orange-500 outline-none transition-all`}
                />
            </div>
        </div>
    );
}
