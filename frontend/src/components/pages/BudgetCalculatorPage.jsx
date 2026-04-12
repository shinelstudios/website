import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calculator, Check, ArrowRight, DollarSign, Mail, Sparkles, Sliders } from "lucide-react";
import MetaTags from "../MetaTags";

const ServiceToggle = ({ label, active, onClick, icon: Icon }) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-3 px-6 py-4 rounded-xl border transition-all duration-300 w-full md:w-auto justify-center ${active
            ? "bg-[var(--orange)] border-[var(--orange)] text-white shadow-lg shadow-[var(--orange)]/20"
            : "bg-[var(--surface-alt)] border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--orange)]/50 hover:text-[var(--text)]"
            }`}
    >
        {Icon && <Icon size={20} />}
        <span className="font-bold tracking-wide uppercase text-sm">{label}</span>
        {active && <Check size={18} className="ml-2" />}
    </button>
);

const VolumeSlider = ({ label, value, setValue, max = 30, unit = "videos" }) => (
    <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
            <span className="text-[var(--text)] font-bold">{label}</span>
            <span className="text-[var(--orange)] font-black text-xl">
                {value} <span className="text-sm text-[var(--text-muted)] font-medium uppercase">{unit}</span>
            </span>
        </div>
        <input
            type="range"
            min="0"
            max={max}
            value={value}
            onChange={(e) => setValue(parseInt(e.target.value))}
            className="w-full h-2 bg-[var(--border)] rounded-lg appearance-none cursor-pointer accent-[var(--orange)]"
        />
        <div className="flex justify-between mt-2 text-xs text-[var(--text-muted)] font-medium uppercase tracking-wider">
            <span>0</span>
            <span>{max}+</span>
        </div>
    </div>
);

export default function BudgetCalculatorPage() {
    const [services, setServices] = useState({
        editing: true,
        thumbnails: true,
        strategy: false,
    });

    const [volumes, setVolumes] = useState({
        shorts: 8,
        long: 2,
        thumbnails: 10,
    });

    const [email, setEmail] = useState("");
    const [submitted, setSubmitted] = useState(false);

    // Pricing Logic (Estimates)
    const estimate = useMemo(() => {
        let min = 0;
        let max = 0;

        if (services.editing) {
            // Shorts: $40-60
            min += volumes.shorts * 40;
            max += volumes.shorts * 60;

            // Long: $150-250
            min += volumes.long * 150;
            max += volumes.long * 350;
        }

        if (services.thumbnails) {
            // Thumbs: $25-45
            min += volumes.thumbnails * 25;
            max += volumes.thumbnails * 60;
        }

        if (services.strategy) {
            min += 500;
            max += 1000;
        }

        // Apply bulk discount logic (10% if > $1000)
        if (min > 1000) {
            min *= 0.9;
            max *= 0.9;
        }

        return { min: Math.round(min), max: Math.round(max) };
    }, [services, volumes]);

    const handleQuoteRequest = (e) => {
        e.preventDefault();
        // Here you would send this to your backend/email
        // console.log({ email, estimate, services, volumes });
        setSubmitted(true);
    };

    const toggleService = (key) => {
        setServices(prev => ({ ...prev, [key]: !prev[key] }));
    };

    return (
        <div className="min-h-screen bg-[var(--surface)] text-[var(--text)] pt-32 pb-24 relative overflow-hidden">
            <MetaTags
                title="Pricing Calculator - Shinel Studios"
                description="Estimate your monthly content production costs. Get a custom quote for video editing, thumbnails, and growth strategy."
            />

            {/* Background Ambience */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full pointer-events-none opacity-20">
                <div className="absolute top-20 right-0 w-96 h-96 bg-[var(--orange)]/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[120px]" />
            </div>

            <div className="container mx-auto px-6 relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-16"
                >
                    <div className="inline-flex items-center gap-2 text-[var(--orange)] font-bold text-sm tracking-widest uppercase mb-4">
                        <Calculator size={16} />
                        Get Your Estimate
                    </div>
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-black mb-6">
                        Build Your <span className="text-[var(--orange)]">Plan</span>
                    </h1>
                    <p className="text-xl text-[var(--text-muted)] max-w-2xl mx-auto">
                        Customize your package to see an estimated monthly investment range.
                    </p>
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 max-w-6xl mx-auto">
                    {/* LEFT COLUMN: Inputs */}
                    <div className="lg:col-span-7 space-y-12">
                        {/* 1. Services */}
                        <section>
                            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                                <span className="w-8 h-8 rounded-full bg-[var(--surface-alt)] border border-[var(--border)] flex items-center justify-center text-sm font-black">1</span>
                                Select Services
                            </h3>
                            <div className="flex flex-wrap gap-4">
                                <ServiceToggle
                                    label="Video Editing"
                                    active={services.editing}
                                    onClick={() => toggleService('editing')}
                                    icon={Sliders}
                                />
                                <ServiceToggle
                                    label="Thumbnails"
                                    active={services.thumbnails}
                                    onClick={() => toggleService('thumbnails')}
                                    icon={Sparkles}
                                />
                                <ServiceToggle
                                    label="Growth Strategy"
                                    active={services.strategy}
                                    onClick={() => toggleService('strategy')}
                                    icon={ArrowUpRight}
                                />
                            </div>
                        </section>

                        {/* 2. Volume */}
                        <section className="bg-[var(--surface-alt)] p-8 rounded-3xl border border-[var(--border)]">
                            <h3 className="text-xl font-bold mb-8 flex items-center gap-2">
                                <span className="w-8 h-8 rounded-full bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center text-sm font-black">2</span>
                                Monthly Volume
                            </h3>

                            <AnimatePresence>
                                {services.editing && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto" }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <VolumeSlider
                                            label="Short Form (Reels/TikToks)"
                                            value={volumes.shorts}
                                            setValue={(v) => setVolumes(prev => ({ ...prev, shorts: v }))}
                                            unit="videos/mo"
                                        />
                                        <VolumeSlider
                                            label="Long Form (YouTube)"
                                            value={volumes.long}
                                            setValue={(v) => setVolumes(prev => ({ ...prev, long: v }))}
                                            max={15}
                                            unit="videos/mo"
                                        />
                                    </motion.div>
                                )}

                                {services.thumbnails && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto" }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <VolumeSlider
                                            label="Thumbnails"
                                            value={volumes.thumbnails}
                                            setValue={(v) => setVolumes(prev => ({ ...prev, thumbnails: v }))}
                                            max={50}
                                            unit="designs/mo"
                                        />
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {!services.editing && !services.thumbnails && !services.strategy && (
                                <p className="text-[var(--text-muted)] italic">Please select a service above to configure volume.</p>
                            )}
                        </section>
                    </div>

                    {/* RIGHT COLUMN: Estimate */}
                    <div className="lg:col-span-5">
                        <div className="sticky top-32">
                            <motion.div
                                layout
                                className="bg-[var(--card-bg)] border border-[var(--orange)]/30 rounded-3xl p-8 shadow-2xl shadow-[var(--orange)]/10 backdrop-blur-xl relative overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 p-3 opacity-10">
                                    <DollarSign size={120} />
                                </div>

                                <h3 className="text-lg text-[var(--text-muted)] font-bold uppercase tracking-wider mb-2">Estimated Investment</h3>
                                <div className="text-4xl sm:text-5xl font-black text-[var(--text)] mb-2 flex items-baseline gap-2">
                                    <span>${estimate.min.toLocaleString()}</span>
                                    {estimate.min !== estimate.max && (
                                        <>
                                            <span className="text-2xl text-[var(--text-muted)]">-</span>
                                            <span>${estimate.max.toLocaleString()}</span>
                                        </>
                                    )}
                                </div>
                                <p className="text-xs text-[var(--text-muted)] mb-8 font-medium">
                                    *Monthly estimate. Final quote may vary based on complexity and raw footage length.
                                </p>

                                {!submitted ? (
                                    <form onSubmit={handleQuoteRequest} className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-bold uppercase text-[var(--text-muted)] mb-2">Email Address</label>
                                            <div className="relative">
                                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
                                                <input
                                                    type="email"
                                                    required
                                                    placeholder="creator@example.com"
                                                    value={email}
                                                    onChange={(e) => setEmail(e.target.value)}
                                                    className="w-full pl-12 pr-4 py-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] focus:outline-none focus:border-[var(--orange)] transition-colors"
                                                />
                                            </div>
                                        </div>
                                        <button
                                            type="submit"
                                            className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-[var(--orange)] text-white font-black uppercase tracking-wide hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-[var(--orange)]/25"
                                        >
                                            Get Exact Quote
                                            <ArrowRight size={20} />
                                        </button>
                                    </form>
                                ) : (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="bg-green-500/10 border border-green-500/20 rounded-xl p-6 text-center"
                                    >
                                        <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center text-white mx-auto mb-3">
                                            <Check size={24} strokeWidth={4} />
                                        </div>
                                        <h4 className="font-bold text-green-500 mb-1">Quote Requested!</h4>
                                        <p className="text-sm text-[var(--text-muted)]">We'll be in touch with a detailed breakdown shortly.</p>
                                    </motion.div>
                                )}
                            </motion.div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
