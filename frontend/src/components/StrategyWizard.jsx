import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, Target, Rocket, Users, BadgeDollarSign, Mail, Phone, User, Send, CheckCircle2, Youtube, Sparkles } from 'lucide-react';
import { COLORS, AUTH_BASE } from '../config/constants';

/**
 * StrategyWizard Component
 * A multi-step interactive quiz to help users find the right service.
 */
const StrategyWizard = () => {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        goal: '',
        volume: '',
        niche: '',
        name: '',
        email: '',
        handle: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const goals = [
        { id: 'views', label: 'Explode Views', icon: <Rocket size={20} />, desc: 'Focus on virality and reach' },
        { id: 'retention', label: 'Higher Retention', icon: <Target size={20} />, desc: 'Keep viewers watched till the end' },
        { id: 'branding', label: 'Brand Authority', icon: <Users size={20} />, desc: 'Look premium and professional' },
        { id: 'revenue', label: 'Maximize Revenue', icon: <BadgeDollarSign size={20} />, desc: 'Convert viewers into customers' }
    ];

    const volumes = ['1-3 Videos/mo', '4-8 Videos/mo', '10+ Videos/mo', 'Daily Uploads'];
    const niches = ['Gaming', 'Vlog / Lifestyle', 'Edu-tech / Finance', 'Podcast / Longform', 'Other'];

    const nextStep = () => setStep(s => s + 1);
    const prevStep = () => setStep(s => s - 1);

    const updateData = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (step < 4) setTimeout(nextStep, 300); // Auto-advance on selection for early steps
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const res = await fetch(`${AUTH_BASE}/leads`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: formData.name,
                    email: formData.email,
                    handle: formData.handle,
                    interests: [formData.goal, formData.volume, formData.niche].filter(Boolean),
                    message: `Strategy Wizard Lead\nGoal: ${formData.goal}\nVolume: ${formData.volume}\nNiche: ${formData.niche}`,
                    source: 'strategy_wizard'
                })
            });
            if (res.ok) {
                setIsSuccess(true);
            }
        } catch (err) {
            console.error('Wizard submit failed', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const containerVariants = {
        hidden: { opacity: 0, x: 20 },
        visible: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -20 }
    };

    if (isSuccess) {
        return (
            <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-[40px] p-12 text-center shadow-2xl">
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-20 h-20 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center mx-auto mb-6"
                >
                    <CheckCircle2 size={40} />
                </motion.div>
                <h3 className="text-3xl font-black text-white italic tracking-tighter mb-4">BLUEPRINT LOCKED IN.</h3>
                <p className="text-gray-400 font-medium mb-8 max-w-sm mx-auto">
                    We've captured your vision. An expert strategist will reach out within 24 hours with your custom growth roadmap.
                </p>
                <button
                    onClick={() => { setStep(1); setIsSuccess(false); setFormData({ goal: '', volume: '', niche: '', name: '', email: '', handle: '' }); }}
                    className="px-8 py-3 rounded-full bg-white/5 border border-white/10 text-white font-black text-xs uppercase tracking-widest hover:bg-white/10 transition-all"
                >
                    Start Over
                </button>
            </div>
        );
    }

    return (
        <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-[40px] overflow-hidden shadow-2xl min-h-[500px] flex flex-col">
            {/* Progress Bar */}
            <div className="bg-white/5 h-1.5 w-full">
                <motion.div
                    className="h-full bg-orange-600"
                    animate={{ width: `${(step / 4) * 100}%` }}
                />
            </div>

            <div className="p-8 md:p-12 flex-grow flex flex-col">
                <div className="mb-8">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-500 mb-2 block">
                        Step {step} of 4
                    </span>
                    <h3 className="text-3xl font-black text-white italic tracking-tighter uppercase leading-none">
                        {step === 1 && "What's your primary goal?"}
                        {step === 2 && "How much do you produce?"}
                        {step === 3 && "What's your arena?"}
                        {step === 4 && "Where should we send your plan?"}
                    </h3>
                </div>

                <AnimatePresence mode="wait">
                    <motion.div
                        key={step}
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="flex-grow"
                    >
                        {step === 1 && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {goals.map((g) => (
                                    <button
                                        key={g.id}
                                        onClick={() => updateData('goal', g.label)}
                                        className={`p-6 rounded-3xl border text-left transition-all group ${formData.goal === g.label
                                                ? 'bg-orange-600/20 border-orange-500 shadow-lg shadow-orange-500/10'
                                                : 'bg-white/5 border-white/10 hover:border-white/30'
                                            }`}
                                    >
                                        <div className={`w-10 h-10 rounded-xl mb-4 flex items-center justify-center transition-colors ${formData.goal === g.label ? 'bg-orange-500 text-white' : 'bg-gray-800 text-gray-400 group-hover:bg-gray-700'
                                            }`}>
                                            {g.icon}
                                        </div>
                                        <h4 className="text-white font-bold mb-1">{g.label}</h4>
                                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{g.desc}</p>
                                    </button>
                                ))}
                            </div>
                        )}

                        {step === 2 && (
                            <div className="flex flex-col gap-3">
                                {volumes.map((v) => (
                                    <button
                                        key={v}
                                        onClick={() => updateData('volume', v)}
                                        className={`p-5 rounded-2xl border text-left transition-all ${formData.volume === v
                                                ? 'bg-orange-600/20 border-orange-500'
                                                : 'bg-white/5 border-white/10 hover:border-white/20'
                                            }`}
                                    >
                                        <span className="text-white font-bold tracking-tight">{v}</span>
                                    </button>
                                ))}
                            </div>
                        )}

                        {step === 3 && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {niches.map((n) => (
                                    <button
                                        key={n}
                                        onClick={() => updateData('niche', n)}
                                        className={`p-5 rounded-2xl border text-left transition-all ${formData.niche === n
                                                ? 'bg-orange-600/20 border-orange-500'
                                                : 'bg-white/5 border-white/10 hover:border-white/20'
                                            }`}
                                    >
                                        <span className="text-white font-bold tracking-tight">{n}</span>
                                    </button>
                                ))}
                            </div>
                        )}

                        {step === 4 && (
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-3">
                                    <div className="relative">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                        <input
                                            required
                                            type="text"
                                            placeholder="Your Name"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-gray-600 outline-none focus:border-orange-500/50 transition-all"
                                        />
                                    </div>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                        <input
                                            required
                                            type="email"
                                            placeholder="Your Email"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-gray-600 outline-none focus:border-orange-500/50 transition-all"
                                        />
                                    </div>
                                    <div className="relative">
                                        <Youtube className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                        <input
                                            type="text"
                                            placeholder="@handle or Channel URL"
                                            value={formData.handle}
                                            onChange={(e) => setFormData({ ...formData, handle: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-gray-600 outline-none focus:border-orange-500/50 transition-all"
                                        />
                                    </div>
                                </div>

                                <motion.button
                                    type="submit"
                                    disabled={isSubmitting || !formData.name || !formData.email}
                                    className="w-full bg-orange-600 text-white rounded-2xl py-4 font-black uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-2 shadow-xl shadow-orange-600/20 disabled:opacity-50"
                                    whileHover={{ y: -2 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    {isSubmitting ? "Locking in..." : "Finalize Blueprint"} <Sparkles size={14} />
                                </motion.button>
                            </form>
                        )}
                    </motion.div>
                </AnimatePresence>

                {/* Footer Controls */}
                <div className="mt-8 pt-8 border-t border-white/5 flex items-center justify-between">
                    {step > 1 ? (
                        <button
                            onClick={prevStep}
                            className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors text-[10px] font-black uppercase tracking-widest"
                        >
                            <ChevronLeft size={16} /> Back
                        </button>
                    ) : (
                        <div />
                    )}

                    {step < 4 && (
                        <button
                            onClick={nextStep}
                            className="flex items-center gap-2 text-orange-500 hover:text-orange-400 transition-colors text-[10px] font-black uppercase tracking-widest"
                        >
                            Next Step <ChevronRight size={16} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StrategyWizard;
