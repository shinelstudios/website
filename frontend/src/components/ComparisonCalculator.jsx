import React, { useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, DollarSign, Clock, ArrowRight } from "lucide-react";

/**
 * DIY vs Shinel Studios Comparison Calculator
 * Interactive ROI calculator showing value proposition
 */
const ComparisonCalculator = ({ onBook }) => {
    const [videosPerMonth, setVideosPerMonth] = useState(4);
    const [currentCTR, setCurrentCTR] = useState(5);

    // Calculations
    const hoursPerVideo = 8;
    const hourlyRate = 500; // INR
    const diyMonthlyCost = videosPerMonth * hoursPerVideo * hourlyRate;
    const shinelMonthlyCost = videosPerMonth * 2500; // Average per video

    const ctrImprovement = 62; // Average improvement %
    const newCTR = currentCTR * (1 + ctrImprovement / 100);
    const viewsIncrease = ((newCTR - currentCTR) / currentCTR) * 100;

    const timeSaved = videosPerMonth * hoursPerVideo;

    return (
        <section className="py-20 relative overflow-hidden" style={{ background: "var(--surface-alt)" }}>
            {/* Background decoration */}
            <div
                className="absolute top-20 right-10 w-96 h-96 rounded-full opacity-10 blur-3xl pointer-events-none"
                style={{ background: "radial-gradient(circle, var(--orange), transparent 60%)" }}
                aria-hidden="true"
            />

            <div className="container mx-auto px-4 relative z-10 max-w-6xl">
                {/* Header */}
                <motion.div
                    className="text-center mb-12"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                >
                    <motion.div
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold mb-4"
                        style={{
                            color: "var(--orange)",
                            border: "1px solid var(--border)",
                            background: "rgba(232,80,2,0.08)",
                        }}
                        whileHover={{ scale: 1.05, y: -2 }}
                    >
                        <TrendingUp size={14} />
                        ROI Calculator
                    </motion.div>

                    <h2
                        className="text-3xl md:text-5xl font-bold font-['Poppins'] mb-3"
                        style={{ color: "var(--text)" }}
                    >
                        DIY vs Shinel Studios
                    </h2>
                    <p className="text-base md:text-lg max-w-2xl mx-auto" style={{ color: "var(--text-muted)" }}>
                        See how much time and money you save while getting better results
                    </p>
                </motion.div>

                {/* Calculator */}
                <div className="grid md:grid-cols-2 gap-8 mb-12">
                    {/* Input Controls */}
                    <motion.div
                        className="space-y-6 p-6 rounded-2xl border"
                        style={{
                            background: "var(--surface)",
                            borderColor: "var(--border)",
                        }}
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                    >
                        <h3 className="text-xl font-bold mb-4" style={{ color: "var(--text)" }}>
                            Your Current Situation
                        </h3>

                        {/* Videos per month */}
                        <div>
                            <label className="block text-sm font-medium mb-2" style={{ color: "var(--text)" }}>
                                Videos per month: <span className="text-[var(--orange)] font-bold">{videosPerMonth}</span>
                            </label>
                            <input
                                type="range"
                                min="1"
                                max="20"
                                value={videosPerMonth}
                                onChange={(e) => setVideosPerMonth(Number(e.target.value))}
                                className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                                style={{
                                    background: `linear-gradient(to right, var(--orange) 0%, var(--orange) ${(videosPerMonth / 20) * 100}%, var(--border) ${(videosPerMonth / 20) * 100}%, var(--border) 100%)`,
                                }}
                            />
                        </div>

                        {/* Current CTR */}
                        <div>
                            <label className="block text-sm font-medium mb-2" style={{ color: "var(--text)" }}>
                                Current CTR: <span className="text-[var(--orange)] font-bold">{currentCTR}%</span>
                            </label>
                            <input
                                type="range"
                                min="1"
                                value={currentCTR}
                                onChange={(e) => setCurrentCTR(Number(e.target.value))}
                                className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                                style={{
                                    background: `linear-gradient(to right, var(--orange) 0%, var(--orange) ${(currentCTR / 15) * 100}%, var(--border) ${(currentCTR / 15) * 100}%, var(--border) 100%)`,
                                }}
                            />
                        </div>
                    </motion.div>

                    {/* Results */}
                    <motion.div
                        className="space-y-4"
                        initial={{ opacity: 0, x: 20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                    >
                        {/* Time Saved */}
                        <div
                            className="p-6 rounded-2xl border"
                            style={{
                                background: "var(--surface)",
                                borderColor: "var(--border)",
                            }}
                        >
                            <div className="flex items-center gap-3 mb-2">
                                <div
                                    className="w-10 h-10 rounded-full flex items-center justify-center"
                                    style={{ background: "rgba(16, 185, 129, 0.1)" }}
                                >
                                    <Clock size={20} style={{ color: "#10B981" }} />
                                </div>
                                <div>
                                    <div className="text-sm" style={{ color: "var(--text-muted)" }}>
                                        Time Saved
                                    </div>
                                    <div className="text-2xl font-bold" style={{ color: "var(--text)" }}>
                                        {timeSaved} hours/month
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* CTR Improvement */}
                        <div
                            className="p-6 rounded-2xl border"
                            style={{
                                background: "var(--surface)",
                                borderColor: "var(--border)",
                            }}
                        >
                            <div className="flex items-center gap-3 mb-2">
                                <div
                                    className="w-10 h-10 rounded-full flex items-center justify-center"
                                    style={{ background: "rgba(232, 80, 2, 0.1)" }}
                                >
                                    <TrendingUp size={20} style={{ color: "var(--orange)" }} />
                                </div>
                                <div>
                                    <div className="text-sm" style={{ color: "var(--text-muted)" }}>
                                        Expected CTR
                                    </div>
                                    <div className="text-2xl font-bold" style={{ color: "var(--text)" }}>
                                        {newCTR.toFixed(1)}% <span className="text-sm text-green-500">(+{ctrImprovement}%)</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Cost Comparison */}
                        <div
                            className="p-6 rounded-2xl border"
                            style={{
                                background: "var(--surface)",
                                borderColor: "var(--border)",
                            }}
                        >
                            <div className="flex items-center gap-3 mb-2">
                                <div
                                    className="w-10 h-10 rounded-full flex items-center justify-center"
                                    style={{ background: "rgba(59, 130, 246, 0.1)" }}
                                >
                                    <DollarSign size={20} style={{ color: "#3B82F6" }} />
                                </div>
                                <div className="w-full">
                                    <div className="text-sm mb-2" style={{ color: "var(--text-muted)" }}>
                                        Monthly Investment
                                    </div>
                                    <div className="flex items-baseline gap-2">
                                        <div className="text-2xl font-bold" style={{ color: "var(--text)" }}>
                                            ₹{shinelMonthlyCost.toLocaleString()}
                                        </div>
                                        <div className="text-sm line-through" style={{ color: "var(--text-muted)" }}>
                                            ₹{diyMonthlyCost.toLocaleString()}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* CTA */}
                <motion.div
                    className="text-center"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                >
                    <button
                        onClick={onBook}
                        className="group inline-flex items-center gap-2 px-8 py-4 rounded-full font-bold text-white transition-all"
                        style={{
                            background: "linear-gradient(135deg, #E85002, #ff6b35)",
                            boxShadow: "0 10px 30px rgba(232, 80, 2, 0.3)",
                        }}
                    >
                        Get Your Free Audit
                        <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                    <p className="text-sm mt-3" style={{ color: "var(--text-muted)" }}>
                        See exactly how we can improve your channel
                    </p>
                </motion.div>
            </div>

            {/* Custom range slider styles */}
            <style dangerouslySetInnerHTML={{
                __html: `
        input[type="range"] {
          -webkit-appearance: none;
          appearance: none;
        }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: var(--orange);
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(232, 80, 2, 0.3);
        }
        input[type="range"]::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: var(--orange);
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 8px rgba(232, 80, 2, 0.3);
        }
        input[type="range"]:focus {
          outline: none;
        }
      `}} />
        </section>
    );
};

export default ComparisonCalculator;
