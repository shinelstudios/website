/* ===================== Imports ===================== */
import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import { BarChart3, Image as IconImage } from "lucide-react";
import { useClientStats } from "../context/ClientStatsContext";
import { BeforeAfter } from './BeforeAfter'; // Assuming BeforeAfter.jsx is in the same folder
import { LazyImage } from "./ProgressiveImage";
import { SAMPLE_BEFORE, SAMPLE_AFTER } from '../lib/helpers'; // Import helpers

// --- Import available images ---
import SAMPLE_VLOG_BEFORE from '../assets/Vlog_sample_before.jpg';
import SAMPLE_VLOG_AFTER from '../assets/Vlog_sample_after.jpg';

// --- Showcase Data ---
const showcases = [
  {
    category: "Gaming (BGMI)",
    beforeImage: SAMPLE_BEFORE, // Use helper placeholder
    afterImage: SAMPLE_AFTER,   // Use helper placeholder
    stats: {
      ctrIncrease: 78,
      viewsMultiplier: "3.1x",
      turnaroundDays: "2",
    },
  },
  {
    category: "Vlog",
    beforeImage: SAMPLE_VLOG_BEFORE, // This uses your actual imported image
    afterImage: SAMPLE_VLOG_AFTER,   // This uses your actual imported image
    stats: {
      ctrIncrease: 62,
      viewsMultiplier: "2.3x",
      turnaroundDays: "3",
    },
  },
  {
    category: "Gaming (Valorant)",
    beforeImage: SAMPLE_BEFORE, // Use helper placeholder
    afterImage: SAMPLE_AFTER,   // Use helper placeholder
    stats: {
      ctrIncrease: 94,
      viewsMultiplier: "4.5x",
      turnaroundDays: "2",
    },
  },
];


/* ===================== Enhanced Proof Section ===================== */
const ProofSection = () => {
  // State to manage the currently selected showcase
  const [activeIndex, setActiveIndex] = useState(0);
  const [countUp, setCountUp] = useState(0);
  const [isInView, setIsInView] = useState(false);
  const sectionRef = useRef(null);
  const animationFrameRef = useRef(null);

  // Get the data for the currently active showcase
  const currentShowcase = showcases[activeIndex];

  // Effect to detect when the section is scrolled into view
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.2, rootMargin: "0px" }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Animated counter effect with iOS optimization
  useEffect(() => {
    if (!currentShowcase?.stats?.ctrIncrease) {
      setCountUp(0);
      return;
    };

    if (!isInView) {
      setCountUp(currentShowcase.stats.ctrIncrease);
      return;
    }

    const start = 0;
    const end = currentShowcase.stats.ctrIncrease;
    const duration = 1500;
    const startTime = Date.now();

    const animate = () => {
      const now = Date.now();
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4); // easeOutQuart
      const current = Math.floor(start + (end - start) * eased);

      setCountUp(current);

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        animationFrameRef.current = null;
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [activeIndex, isInView, currentShowcase.stats.ctrIncrease]);

  // Dynamically generate the stats array based on the current showcase
  const stats = [
    {
      icon: <BarChart3 size={20} />,
      label: "CTR Improvement",
      value: `+${currentShowcase.stats.ctrIncrease}%`,
      suffix: "CTR"
    },
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z" stroke="currentColor" strokeWidth="2" />
          <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
        </svg>
      ),
      label: "More Views",
      value: currentShowcase.stats.viewsMultiplier,
      suffix: "avg"
    },
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
      label: "Turnaround",
      value: currentShowcase.stats.turnaroundDays,
      suffix: "days"
    },
  ];

  return (
    <section
      id="proof"
      ref={sectionRef}
      className="py-20 relative overflow-hidden"
      style={{ background: "var(--surface-alt)" }}
      aria-labelledby="proof-heading"
    >
      {/* Background patterns and gradients */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `radial-gradient(circle, var(--text) 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
        aria-hidden="true"
      />
      <>
        <div
          className="absolute top-0 left-1/4 w-96 h-96 rounded-full opacity-10 blur-3xl pointer-events-none"
          style={{
            background: "radial-gradient(circle, var(--orange), transparent 60%)",
          }}
          aria-hidden="true"
        />
        <div
          className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full opacity-10 blur-3xl pointer-events-none"
          style={{
            background: "radial-gradient(circle, #ff9357, transparent 60%)",
          }}
          aria-hidden="true"
        />
      </>

      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10%" }}
          transition={{ duration: 0.5 }}
          style={{ willChange: "transform, opacity" }}
        >
          <motion.div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold mb-5"
            style={{
              color: "var(--orange)",
              border: "1px solid var(--border)",
              background: "rgba(232,80,2,0.08)",
              boxShadow: "0 4px 12px rgba(232,80,2,0.1)",
              willChange: "transform",
            }}
            whileHover={{ scale: 1.05, y: -2 }}
          >
            <IconImage size={14} />
            Real Results
          </motion.div>
          <h2
            id="proof-heading"
            className="text-3xl md:text-5xl font-bold font-['Poppins'] mb-3"
            style={{ color: "var(--text)" }}
          >
            Packaging That Lifts CTR
          </h2>
          <p className="text-base md:text-xl max-w-2xl mx-auto" style={{ color: "var(--text-muted)" }}>
            Real thumbnails revamped for higher clarity, curiosity, and clicks.
          </p>
        </motion.div>

        {/* Showcase Selector Tabs */}
        <div className="mb-8 flex justify-center flex-wrap gap-3">
          {showcases.map((showcase, index) => (
            <motion.button
              key={showcase.category}
              onClick={() => setActiveIndex(index)}
              className={`px-4 py-2 text-sm font-semibold rounded-full transition-colors duration-300 ${activeIndex === index
                ? "text-white"
                : "text-[var(--text-muted)] bg-[var(--surface)] hover:bg-[var(--surface-alt)]"
                }`}
              style={{
                border: "1px solid var(--border)",
                background: activeIndex === index ? "linear-gradient(135deg, var(--orange), #ff9357)" : "var(--surface)",
                willChange: "transform",
                WebkitTapHighlightColor: "transparent",
              }}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.95 }}
            >
              {showcase.category}
            </motion.button>
          ))}
        </div>

        {/* Before/After Comparison (Dynamic) */}
        <motion.div
          key={activeIndex}
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10%" }}
          transition={{ duration: 0.6, delay: 0.1 }}
          style={{ willChange: "transform, opacity" }}
        >
          <BeforeAfter
            before={currentShowcase.beforeImage}
            after={currentShowcase.afterImage}
            label="Drag to compare (Before → After)"
            beforeAlt={`Original thumbnail for ${currentShowcase.category}`}
            afterAlt={`Optimized thumbnail for ${currentShowcase.category}`}
            width={1280}
            height={720}
          />
        </motion.div>

        {/* Animated CTR Badge (Dynamic) */}
        <motion.div
          className="mt-8 flex justify-center"
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          style={{ willChange: "transform, opacity" }}
        >
          <motion.div
            className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl"
            style={{
              background: "linear-gradient(135deg, var(--orange), #ff9357)",
              boxShadow: "0 10px 30px rgba(232,80,2,0.3)",
              willChange: "transform",
              WebkitTapHighlightColor: "transparent",
            }}
            whileHover={{ scale: 1.05, y: -2 }}
          >
            <div className="flex items-baseline gap-1">
              <span className="text-3xl md:text-4xl font-bold text-white">
                +{countUp}%
              </span>
              <span className="text-sm text-white/90">CTR</span>
            </div>
            <div className="h-8 w-px bg-white/30" aria-hidden="true" />
            <div className="text-left">
              <div className="text-xs text-white/80">After revamp</div>
              <div className="text-sm font-semibold text-white">{currentShowcase.category}</div>
            </div>
          </motion.div>
        </motion.div>

        {/* Action CTA */}
        <motion.div
          className="mt-6 text-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <a
            href="#contact"
            className="inline-flex items-center gap-2 text-sm font-bold ss-btn-pulse"
            style={{ color: "var(--orange)" }}
          >
            Start Your Revamp
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        </motion.div>

        {/* Stats Grid (Dynamic) */}
        <motion.div
          className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto"
          key={`stats-${activeIndex}`}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          style={{ willChange: "transform, opacity" }}
        >
          {stats.map((stat, idx) => (
            <motion.div
              key={idx}
              className="p-5 rounded-xl border"
              style={{
                background: "var(--surface)",
                borderColor: "var(--border)",
                boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                willChange: "transform",
              }}
              whileHover={{ y: -4, boxShadow: "0 8px 24px rgba(0,0,0,0.1)" }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-center justify-between mb-2">
                <div style={{ color: "var(--orange)" }}>
                  {stat.icon}
                </div>
                <div className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
                  {stat.label}
                </div>
              </div>
              <div className="flex items-baseline gap-1">
                <div className="text-2xl md:text-3xl font-bold" style={{ color: "var(--text)" }}>
                  {stat.value}
                </div>
                <div className="text-sm" style={{ color: "var(--text-muted)" }}>
                  {stat.suffix}
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Trust indicators */}
        <motion.div
          className="mt-10 flex flex-wrap items-center justify-center gap-3 text-xs"
          style={{ color: "var(--text-muted)" }}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          {[
            "✓ A/B tested designs",
            "✓ Data-backed iterations",
            "✓ Real creator results",
            "✓ 48-72h turnaround"
          ].map((item, i) => (
            <span
              key={i}
              className="px-3 py-1.5 rounded-full"
              style={{
                border: "1px solid var(--border)",
                background: "var(--surface)",
              }}
            >
              {item}
            </span>
          ))}
        </motion.div>
      </div>

      {/* --- Partner Creators Grid --- */}
      <div className="container mx-auto px-4 mt-20 border-t border-white/5 pt-12">
        <div className="text-center mb-10">
          <h3 className="text-xl font-bold text-white mb-2">Trusted by Serious Creators</h3>
          <p className="text-sm text-gray-400">Driving growth for channels across every niche.</p>
        </div>

        <ClientGrid />
      </div>

    </section>
  );
};

const ClientGrid = () => {
  const { stats, loading } = useClientStats();

  if (loading) return null;
  if (!stats || stats.length === 0) return null;

  return (
    <div className="flex flex-wrap justify-center gap-6">
      {stats.map(client => (
        <div key={client.id} className="group relative flex items-center gap-3 p-3 pr-6 rounded-full border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] transition-colors">
          <div className="w-10 h-10 rounded-full overflow-hidden border border-white/10 shrink-0">
            {client.logo ? (
              <img
                src={client.logo}
                alt={client.title || "Client Logo"}
                width="40"
                height="40"
                className="w-full h-full object-cover"
                loading="lazy"
                decoding="async"
              />
            ) : (
              <div className="w-full h-full bg-orange-500/10 flex items-center justify-center text-orange-500 font-bold">
                {client.title?.charAt(0)}
              </div>
            )}
          </div>
          <div>
            <div className="text-sm font-bold text-white leading-tight group-hover:text-orange-500 transition-colors">
              {client.title}
            </div>
            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
              {client.subscribers ? new Intl.NumberFormat('en-US', { notation: "compact", maximumFractionDigits: 1 }).format(client.subscribers) : "0"} Subs
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ProofSection;