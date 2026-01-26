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
    DollarSign
} from "lucide-react";
import { motion } from "framer-motion";
import { useGlobalConfig } from "../context/GlobalConfigContext";

export default function AdminSettingsPage() {
    const { config, updateConfig, loading, refreshConfig } = useGlobalConfig();
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState({ type: "", text: "" });

    // Local form state
    const [formData, setFormData] = useState({
        stats: {
            videosDelivered: 300,
            totalReach: 10000000,
            creatorsImpacted: 50,
            newsletterSubscribers: 5000,
            ctrBoostMin: 3.1,
            ctrBoostMax: 5.0
        },
        pricing: {
            gaming: { starter: 599, highlights: 6999, rankup: 5499, pro: 13499 },
            vlog: { starter: 699, driver: 9999, story: 7499, suite: 17999 },
            talking: { starter: 999, studio: 13999, clips: 14999, network: 24999 }
        }
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

    return (
        <section className="space-y-10 pb-20">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black tracking-tighter uppercase italic">Control <span className="text-orange-500">Center.</span></h1>
                    <p className="text-gray-500 text-xs font-black uppercase tracking-widest mt-1">Global Website Variables & Production Stats</p>
                </div>
                <button
                    onClick={refreshConfig}
                    className="p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors"
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

                {/* --- Production Stats --- */}
                <div className="space-y-6">
                    <div className="p-8 rounded-[32px] bg-white/[0.02] border border-white/5 space-y-8">
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
                                label="Total Reach (Subs)"
                                icon={TrendingUp}
                                value={formData.stats.totalReach}
                                onChange={v => setFormData({ ...formData, stats: { ...formData.stats, totalReach: Number(v) } })}
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

                    {/* --- CTR Optimization --- */}
                    <div className="p-8 rounded-[32px] bg-white/[0.02] border border-white/5 space-y-8">
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
                        <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">These values control the baseline CTR transformation shown in the testimonials section.</p>
                    </div>
                </div>

                {/* --- Pricing Controls --- */}
                <div className="space-y-6">
                    <div className="p-8 rounded-[32px] bg-white/[0.02] border border-white/5 space-y-8">
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
                        className="w-full py-6 bg-white text-black font-black uppercase tracking-[0.4em] rounded-[24px] hover:bg-orange-500 hover:text-white transition-all shadow-xl flex items-center justify-center gap-3 group active:scale-95"
                    >
                        {busy ? <RefreshCw className="animate-spin" /> : <Save size={20} className="group-hover:scale-110 transition-transform" />}
                        {busy ? "Applying Changes..." : "Deploy Config Site-wide"}
                    </button>
                </div>
            </form>
        </section>
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
}

function StatInput({ label, value, onChange, icon: Icon }) {
    return (
        <div className="space-y-1.5">
            <label className="text-[9px] font-black uppercase tracking-widest text-gray-600 ml-1">{label}</label>
            <div className="relative">
                {Icon && <Icon size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />}
                <input
                    type="number"
                    value={value || 0}
                    onChange={e => onChange(e.target.value)}
                    className={`w-full ${Icon ? 'pl-10' : 'px-4'} py-3.5 bg-black border border-white/10 rounded-2xl text-sm font-bold focus:border-orange-500 outline-none transition-all`}
                />
            </div>
        </div>
    );
}
