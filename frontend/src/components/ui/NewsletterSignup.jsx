import React, { useState } from 'react';
import { Mail, ArrowRight, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const NewsletterSignup = () => {
    const [email, setEmail] = useState("");
    const [status, setStatus] = useState("idle"); // idle, loading, success

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!email) return;

        setStatus("loading");
        setTimeout(() => {
            console.log(`[Newsletter] Subscribed: ${email}`);
            setStatus("success");
            setEmail("");
        }, 1500);
    };

    return (
        <div className="w-full max-w-md mx-auto">
            <AnimatePresence mode="wait">
                {status === "success" ? (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="flex items-center gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-500 font-bold"
                    >
                        <Check size={20} />
                        <span>You're on the list! Watch your inbox.</span>
                    </motion.div>
                ) : (
                    <motion.form
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onSubmit={handleSubmit}
                        className="relative group"
                    >
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--orange)] transition-colors" size={20} />
                        <input
                            type="email"
                            placeholder="Enter your email for growth tips..."
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={status === "loading"}
                            className="w-full pl-12 pr-32 py-4 bg-[var(--surface)] border border-[var(--border)] rounded-xl focus:outline-none focus:border-[var(--orange)] focus:ring-1 focus:ring-[var(--orange)] transition-all placeholder:text-[var(--text-muted)]"
                        />
                        <button
                            type="submit"
                            disabled={status === "loading"}
                            className="absolute right-2 top-2 bottom-2 px-4 bg-[var(--orange)] text-white font-bold rounded-lg hover:bg-[var(--orange-dark)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {status === "loading" ? (
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>Join <ArrowRight size={16} /></>
                            )}
                        </button>
                    </motion.form>
                )}
            </AnimatePresence>
            <p className="mt-3 text-xs text-center text-[var(--text-muted)]">
                Join 2,500+ creators. No spam, just value.
            </p>
        </div>
    );
};

export default NewsletterSignup;
