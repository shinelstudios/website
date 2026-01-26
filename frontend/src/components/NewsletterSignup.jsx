import React, { useState } from "react";
import { useGlobalConfig } from "../context/GlobalConfigContext";
import { motion } from "framer-motion";
import { Mail, ArrowRight, CheckCircle2, Sparkles } from "lucide-react";

/**
 * Newsletter Signup Component
 * Email capture for lead magnet (weekly YouTube tips)
 * Positioned above footer for low-friction conversion
 */
const NewsletterSignup = () => {
    const [email, setEmail] = useState("");
    const [status, setStatus] = useState("idle"); // idle, loading, success, error
    const [message, setMessage] = useState("");
    const { config } = useGlobalConfig();

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!email || !email.includes("@")) {
            setStatus("error");
            setMessage("Please enter a valid email address");
            return;
        }

        setStatus("loading");

        try {
            // Track analytics
            if (typeof window !== "undefined") {
                window.dispatchEvent(
                    new CustomEvent("analytics", {
                        detail: { ev: "newsletter_signup", email },
                    })
                );
            }

            // TODO: Replace with actual API endpoint (Mailchimp, ConvertKit, etc.)
            await new Promise((resolve) => setTimeout(resolve, 1000));

            setStatus("success");
            setMessage("You're subscribed! Check your inbox.");
            setEmail("");

            // Reset after 5 seconds
            setTimeout(() => {
                setStatus("idle");
                setMessage("");
            }, 5000);
        } catch (error) {
            setStatus("error");
            setMessage("Something went wrong. Please try again.");
        }
    };

    return (
        <section className="py-16 relative overflow-hidden" style={{ background: "var(--surface-alt)" }}>
            {/* Background decoration */}
            <div
                className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-5 blur-3xl pointer-events-none"
                style={{ background: "radial-gradient(circle, var(--orange), transparent 60%)" }}
                aria-hidden="true"
            />

            <div className="container mx-auto px-4 relative z-10 max-w-4xl">
                <motion.div
                    className="text-center"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                >
                    {/* Icon */}
                    <motion.div
                        className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-6"
                        style={{
                            background: "linear-gradient(135deg, var(--orange), #ff6b35)",
                            boxShadow: "0 10px 30px rgba(232, 80, 2, 0.3)",
                        }}
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        transition={{ type: "spring", stiffness: 300 }}
                    >
                        <Mail size={28} className="text-white" />
                    </motion.div>

                    {/* Heading */}
                    <h2 className="text-3xl md:text-4xl font-bold font-['Poppins'] mb-3" style={{ color: "var(--text)" }}>
                        Get Weekly YouTube Growth Tips
                    </h2>
                    <p className="text-base md:text-lg mb-8 max-w-2xl mx-auto" style={{ color: "var(--text-muted)" }}>
                        Join {config?.stats?.newsletterSubscribers ? config.stats.newsletterSubscribers.toLocaleString() : "5,000"}+ creators getting actionable strategies, AI tools, and insider tips delivered every Tuesday.
                    </p>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="max-w-md mx-auto">
                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="flex-1 relative">
                                <Mail
                                    size={20}
                                    className="absolute left-4 top-1/2 transform -translate-y-1/2"
                                    style={{ color: "var(--text-muted)" }}
                                />
                                <input
                                    type="email"
                                    placeholder="Enter your email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    disabled={status === "loading" || status === "success"}
                                    className="w-full pl-12 pr-4 py-4 rounded-xl border text-base transition-all"
                                    style={{
                                        background: "var(--surface)",
                                        borderColor: status === "error" ? "#DC2626" : "var(--border)",
                                        color: "var(--text)",
                                    }}
                                    required
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={status === "loading" || status === "success"}
                                className="group px-8 py-4 rounded-xl font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                style={{
                                    background: "linear-gradient(135deg, var(--orange), #ff6b35)",
                                    boxShadow: "0 4px 15px rgba(232, 80, 2, 0.3)",
                                }}
                            >
                                {status === "loading" ? (
                                    "Subscribing..."
                                ) : status === "success" ? (
                                    <>
                                        <CheckCircle2 size={20} />
                                        Subscribed!
                                    </>
                                ) : (
                                    <>
                                        Subscribe
                                        <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>
                        </div>

                        {/* Status message */}
                        {message && (
                            <motion.p
                                className="mt-3 text-sm"
                                style={{ color: status === "error" ? "#DC2626" : "#10B981" }}
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                            >
                                {message}
                            </motion.p>
                        )}
                    </form>

                    {/* Trust indicators */}
                    <div className="flex flex-wrap items-center justify-center gap-6 mt-8 text-xs" style={{ color: "var(--text-muted)" }}>
                        <div className="flex items-center gap-2">
                            <CheckCircle2 size={16} className="text-green-500" />
                            <span>No spam, ever</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <CheckCircle2 size={16} className="text-green-500" />
                            <span>Unsubscribe anytime</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Sparkles size={16} style={{ color: "var(--orange)" }} />
                            <span>{config?.stats?.newsletterSubscribers ? config.stats.newsletterSubscribers.toLocaleString() : "5,000"}+ subscribers</span>
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    );
};

export default NewsletterSignup;
