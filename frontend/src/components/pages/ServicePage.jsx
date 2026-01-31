import React, { useMemo } from 'react';
import { useParams, Navigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { NICHES } from '../../data/niches';
import { ArrowRight, CheckCircle, Play, Star, Sparkles, Target, Zap } from 'lucide-react';
import NewsletterSignup from '../ui/NewsletterSignup';
import MetaTags from '../MetaTags';

const ServicePage = () => {
    const { niche } = useParams();
    const data = NICHES[niche];

    // Redirect to home if niche doesn't exist
    if (!data) return <Navigate to="/" replace />;

    return (
        <div className="min-h-screen bg-[var(--background)] pt-24 pb-12">
            <MetaTags
                title={data.title}
                description={data.subtitle}
                keywords={data.keywords}
                ogImage={data.heroImage}
            />
            {/* Hero Section */}
            <section className="container mx-auto px-4 mb-20">
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-12">
                    <div className="flex-1 space-y-6">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--orange)]/10 text-[var(--orange)] text-sm font-bold border border-[var(--orange)]/20"
                        >
                            <Star size={14} fill="currentColor" /> Specialized Video Editing
                        </motion.div>

                        <motion.h1
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="text-4xl md:text-6xl font-black leading-tight tracking-tight"
                        >
                            {data.title}
                        </motion.h1>

                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="text-xl text-[var(--text-muted)] leading-relaxed max-w-lg"
                        >
                            {data.subtitle}
                        </motion.p>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="flex flex-col sm:flex-row gap-4 pt-4"
                        >
                            <Link
                                to="/contact"
                                className="px-8 py-4 bg-[var(--orange)] text-white font-bold rounded-xl hover:bg-[var(--orange-dark)] transition-all flex items-center justify-center gap-2 group"
                            >
                                {data.cta} <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                            </Link>
                            <Link
                                to="/work"
                                className="px-8 py-4 bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] font-bold rounded-xl hover:bg-[var(--surface-alt)] transition-all flex items-center justify-center gap-2"
                            >
                                View Portfolio
                            </Link>
                        </motion.div>

                        <div className="pt-8 flex flex-wrap gap-4">
                            {data.features.map((feat, i) => (
                                <div key={i} className="flex items-center gap-2 text-sm font-medium text-[var(--text-muted)]">
                                    <CheckCircle size={16} className="text-[var(--orange)]" />
                                    {feat}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1 relative">
                        <div className="aspect-video rounded-3xl overflow-hidden shadow-2xl border border-[var(--border)] relative bg-[var(--surface)]">
                            <img
                                src={data.heroImage}
                                alt={data.title}
                                className="w-full h-full object-cover opacity-80 hover:opacity-100 transition-opacity duration-700"
                            />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Link to="/work" className="w-20 h-20 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center hover:scale-110 transition-transform cursor-pointer border border-white/20">
                                    <Play size={32} fill="white" className="text-white ml-2" />
                                </Link>
                            </div>
                        </div>
                        {/* Decorative Blur */}
                        <div className="absolute -inset-4 bg-[var(--orange)]/20 blur-3xl -z-10 rounded-full opacity-50" />
                    </div>
                </div>
            </section>

            {/* Why Us Section */}
            <section className="container mx-auto px-4 py-20 bg-[var(--surface-2)]/30 border-y border-[var(--border)]">
                <div className="max-w-4xl mx-auto text-center">
                    <h2 className="text-3xl font-black mb-12">Why Creators Trust Shinel Studios</h2>
                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border)]">
                            <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center mx-auto mb-4">
                                <Star size={24} />
                            </div>
                            <h3 className="text-lg font-bold mb-2">Platform Optimized</h3>
                            <p className="text-sm text-[var(--text-muted)]">We understand the specific pacing and style required for your niche.</p>
                        </div>
                        <div className="p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border)]">
                            <div className="w-12 h-12 rounded-xl bg-[var(--orange)]/10 text-[var(--orange)] flex items-center justify-center mx-auto mb-4">
                                <Play size={24} />
                            </div>
                            <h3 className="text-lg font-bold mb-2">High Retention</h3>
                            <p className="text-sm text-[var(--text-muted)]">Edits designed to keep viewers watching until the very end.</p>
                        </div>
                        <div className="p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border)]">
                            <div className="w-12 h-12 rounded-xl bg-green-500/10 text-green-500 flex items-center justify-center mx-auto mb-4">
                                <CheckCircle size={24} />
                            </div>
                            <h3 className="text-lg font-bold mb-2">Fast Turnaround</h3>
                            <p className="text-sm text-[var(--text-muted)]">Consistent delivery so you never miss an upload schedule.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Newsletter Section */}
            <section className="container mx-auto px-4 py-20">
                <div className="max-w-2xl mx-auto text-center space-y-8">
                    <h2 className="text-3xl font-black">Level Up Your Content Game</h2>
                    <p className="text-[var(--text-muted)]">
                        Get weekly insights on video editing trends, retention hacks, and YouTube growth strategies.
                    </p>
                    <NewsletterSignup />
                </div>
            </section>

        </div>
    );
};

export default ServicePage;
