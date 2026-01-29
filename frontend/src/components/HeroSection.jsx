import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useSpring, useMotionValue, useTransform } from "framer-motion";
import {
  ArrowRight,
  Sparkles,
  TrendingUp,
  Users,
  Check,
  Play,
  Zap
} from "lucide-react";
import { useClientStats } from "../context/ClientStatsContext";
import { useGlobalConfig } from "../context/GlobalConfigContext";
import ParticleNetwork from "./animations/ParticleNetwork";

/* ------------------------------ Helpers ------------------------------ */

function useMediaQuery(query) {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia(query);
    const listener = () => setMatches(media.matches);
    listener();
    media.addEventListener?.("change", listener);
    return () => media.removeEventListener?.("change", listener);
  }, [query]);
  return matches;
}

function emitAnalytics(payload) {
  try {
    window.dispatchEvent(new CustomEvent("ss_analytics", { detail: payload }));
  } catch { }
}

/* ------------------------------ Visual Components ------------------------------ */

// Bright Stars
const Star = ({ delay, size, top, left }) => (
  <motion.div
    className="absolute rounded-full bg-[var(--orange)] dark:bg-[var(--text)]"
    style={{
      width: size,
      height: size,
      top,
      left,
      boxShadow: `0 0 ${size * 3}px var(--orange)`
    }}
    animate={{
      opacity: [0.2, 0.8, 0.2],
      scale: [0.8, 1.2, 0.8]
    }}
    transition={{
      duration: 3 + delay,
      repeat: Infinity,
      ease: "easeInOut",
      delay: delay
    }}
    will-change="opacity, scale"
  />
);

const Starfield = () => {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const stars = useMemo(() => {
    const count = isMobile ? 12 : 30;
    return Array.from({ length: count }).map((_, i) => ({
      id: i,
      size: Math.random() * 2.5 + 1,
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      delay: Math.random() * 2
    }));
  }, [isMobile]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {stars.map(star => (
        <Star key={star.id} {...star} />
      ))}
    </div>
  );
};

const AuroraBackground = () => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden select-none bg-white dark:bg-black">
    <Starfield />

    {/* Brand Orange Aurora - Theme Aware */}
    <motion.div
      className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[100px]"
      style={{
        background: 'radial-gradient(circle, var(--orange), transparent 70%)',
        opacity: 0.08,
        willChange: 'transform'
      }}
      animate={{
        scale: [1, 1.1, 1],
        x: [0, 20, 0],
        y: [0, -20, 0]
      }}
      transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
    />
    <motion.div
      className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[100px]"
      style={{
        background: 'radial-gradient(circle, var(--orange), transparent 70%)',
        opacity: 0.08,
        willChange: 'transform'
      }}
      animate={{
        scale: [1, 1.1, 1],
        x: [0, -20, 0],
        y: [0, 15, 0]
      }}
      transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
    />

    {/* Subtle Grid */}
    <div className="absolute inset-0 opacity-[0.03]"
      style={{
        backgroundImage: `
          linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px',
      }}
    />
  </div>
);

const GlassCard = ({ children, className = "", style = {}, noBorder = false }) => (
  <div
    className={`relative overflow-hidden rounded-xl ${noBorder ? '' : 'border border-[var(--border)]'} bg-[var(--surface-alt)]/80 backdrop-blur-xl shadow-2xl ${className}`}
    style={{
      boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25), inset 0 1px 0 0 rgba(255, 255, 255, 0.05)",
      ...style
    }}
  >
    <div className="absolute inset-0 bg-gradient-to-br from-[var(--text)]/[0.03] via-transparent to-transparent pointer-events-none" />
    {children}
  </div>
);

/* Professional NLE Timeline - Brand Colors Only */
const MockTimeline = () => (
  <div className="w-full h-full flex flex-col bg-[#0a0a0a] relative font-mono text-[9px] overflow-hidden">
    {/* Toolbar */}
    <div className="h-9 border-b border-[var(--border)] flex items-center justify-between px-3 bg-gradient-to-b from-[var(--surface-alt)] to-[var(--surface)]">
      <div className="flex items-center gap-3">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[var(--orange)]" />
          <div className="w-2.5 h-2.5 rounded-full bg-gray-400" />
          <div className="w-2.5 h-2.5 rounded-full bg-gray-500" />
        </div>
        <div className="text-[var(--text-muted)] text-[10px] font-semibold">Final_Edit_v4.mp4</div>
      </div>
      <div className="flex items-center gap-2 px-2.5 py-1 bg-[var(--orange)]/10 rounded border border-[var(--orange)]/30">
        <div className="w-1.5 h-1.5 rounded-full bg-[var(--orange)] animate-pulse" />
        <span className="text-[var(--orange)] font-bold tracking-wider text-[10px]">00:04:32:18</span>
      </div>
    </div>

    {/* Timeline Tracks */}
    <div className="flex-1 p-2.5 space-y-2 relative bg-[#0f0f0f]">
      {/* Playhead */}
      <div className="absolute top-0 bottom-0 left-[45%] w-[2px] bg-[#E85002] z-20 shadow-[0_0_12px_rgba(232,80,2,0.6)]">
        <div className="absolute -top-1 -left-[6px] w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[10px] border-t-[#E85002]" />
      </div>

      {/* V2: Graphics */}
      <div className="h-10 w-full bg-[#1a1a1a] rounded border border-white/5 relative overflow-hidden">
        <div className="absolute left-[28%] w-[32%] h-full bg-[#E85002]/20 border border-[#E85002]/30 flex items-center justify-center">
          <span className="text-[#E85002] uppercase font-bold tracking-wider text-[8px]">Intro Graphics</span>
        </div>
      </div>

      {/* V1: Main Footage - Brand Colors */}
      <div className="h-14 w-full bg-[#1a1a1a] rounded border border-white/5 relative overflow-hidden">
        <div className="absolute left-0 w-[45%] h-full bg-white/10 border-r border-white/10 flex items-center px-2.5">
          <span className="text-white font-semibold text-[9px]">Main_Camera_A.mp4</span>
        </div>
        <div className="absolute left-[45%] w-[22%] h-full bg-[#E85002]/15 border-x border-[#E85002]/20 flex items-center justify-center">
          <span className="text-[#E85002] font-semibold text-[8px]">B-ROLL</span>
        </div>
        <div className="absolute left-[67%] w-[33%] h-full bg-white/10 flex items-center px-2.5">
          <span className="text-white font-semibold text-[9px]">Main_Camera_B.mp4</span>
        </div>
      </div>

      {/* A1: Audio Waveform */}
      <div className="h-11 w-full bg-[#1a1a1a] rounded border border-white/5 relative overflow-hidden flex items-center px-2">
        <div className="w-full h-7 flex items-end gap-[1px]">
          {Array.from({ length: 70 }).map((_, i) => (
            <div
              key={i}
              className="flex-1 bg-[#E85002] opacity-60 rounded-sm"
              style={{ height: `${25 + Math.random() * 75}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  </div>
);

/* Analytics - Brand Colors */
const MockAnalytics = () => (
  <div className="w-full h-full p-5 relative overflow-hidden bg-gradient-to-br from-[#0f0f0f] to-black">
    <div className="flex justify-between items-start mb-4">
      <div>
        <div className="text-[9px] text-gray-500 uppercase tracking-widest font-bold mb-1">Retention Rate</div>
        <div className="text-4xl font-black text-[#E85002]">72.4%</div>
      </div>
      <div className="px-2.5 py-1.5 bg-[#E85002]/10 border border-[#E85002]/30 rounded-lg flex items-center gap-1.5">
        <TrendingUp size={12} className="text-[#E85002]" />
        <span className="text-[10px] font-bold text-[#E85002]">+18%</span>
      </div>
    </div>

    <div className="relative h-28 w-full">
      <svg viewBox="0 0 100 40" className="w-full h-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="orangeGlow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#E85002" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#E85002" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d="M0,40 L0,28 C15,28 20,22 30,18 S45,15 55,22 S75,18 85,10 L95,6 L100,40 Z" fill="url(#orangeGlow)" />
        <path d="M0,28 C15,28 20,22 30,18 S45,15 55,22 S75,18 85,10 L95,6" fill="none" stroke="#E85002" strokeWidth="3" strokeLinecap="round" />
        <circle cx="55" cy="22" r="5" fill="#E85002" className="drop-shadow-[0_0_10px_rgba(232,80,2,0.8)]" />
      </svg>
    </div>
  </div>
);

/* 3D Stack */
const ThreeDVisuals = () => {
  const ref = useRef(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const springConfig = { damping: 35, stiffness: 180 };
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [5, -5]), springConfig);
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-5, 5]), springConfig);

  useEffect(() => {
    const handleMove = (e) => {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      x.set((e.clientX - rect.left) / rect.width - 0.5);
      y.set((e.clientY - rect.top) / rect.height - 0.5);
    };
    const el = ref.current;
    el?.addEventListener("mousemove", handleMove);
    el?.addEventListener("mouseleave", () => { x.set(0); y.set(0); });
    return () => {
      el?.removeEventListener("mousemove", handleMove);
      el?.removeEventListener("mouseleave", () => { x.set(0); y.set(0); });
    };
  }, [x, y]);

  return (
    <motion.div
      ref={ref}
      className="relative w-full aspect-[4/3] flex items-center justify-center select-none"
      style={{ perspective: 1400 }}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.9, delay: 0.4 }}
    >
      <motion.div
        className="relative w-full max-w-[540px] h-[380px]"
        style={{
          rotateX: rotateX,
          rotateY: rotateY,
          transformStyle: "preserve-3d"
        }}
      >
        {/* Back: Analytics */}
        <GlassCard
          className="absolute top-0 right-0 w-[300px] h-[180px]"
          style={{ transform: "translateZ(-60px) translateX(40px) translateY(-50px) rotateZ(2deg)" }}
        >
          <MockAnalytics />
        </GlassCard>

        {/* Main: Timeline */}
        <GlassCard
          className="absolute inset-0 !border-white/15"
          style={{ transform: "translateZ(30px)" }}
        >
          <MockTimeline />
        </GlassCard>

        {/* Front: Success Badge - FULLY VISIBLE */}
        <motion.div
          className="absolute -left-14 bottom-16 z-30"
          style={{ transform: "translateZ(100px)" }}
          animate={{ y: [0, -12, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        >
          <GlassCard className="px-7 py-5 flex items-center gap-4 !bg-[#E85002] !border-[#E85002] shadow-[0_25px_50px_-10px_rgba(232,80,2,0.6)]">
            <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-xl">
              <Check className="w-7 h-7 text-[#E85002]" strokeWidth={3} />
            </div>
            <div>
              <div className="text-[10px] text-white/80 font-bold uppercase tracking-wider">Client Result</div>
              <div className="text-xl font-black text-white">+3.2M Views</div>
            </div>
          </GlassCard>
        </motion.div>

        {/* Additional Element: Metrics Badge */}
        <motion.div
          className="absolute -right-8 top-12 z-20"
          style={{ transform: "translateZ(70px)" }}
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        >
          <GlassCard className="px-5 py-4 !bg-[var(--surface)]/90 !border-[var(--border)]">
            <div className="text-[9px] text-[var(--text-muted)] font-bold uppercase tracking-widest mb-1">Avg CTR</div>
            <div className="text-2xl font-black text-[var(--text)]">12.8%</div>
            <div className="flex items-center gap-1 mt-1">
              <Zap size={10} className="text-[var(--orange)]" />
              <span className="text-[9px] text-[var(--orange)] font-bold">+4.2%</span>
            </div>
          </GlassCard>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

/* Client Avatar Component - Fixes Hooks violation */
const ClientAvatar = ({ client, gradient, zIndex }) => {
  const [imageError, setImageError] = useState(false);

  return (
    <div
      className="relative w-11 h-11 rounded-full border-[3px] border-[var(--surface)] ring-2 ring-[var(--border)] overflow-hidden shadow-xl flex items-center justify-center text-[10px] font-bold text-white transition-all duration-500"
      style={{ background: gradient, zIndex }}
    >
      {client.logo && !imageError && (
        <img
          src={client.logo}
          alt={client.title || "Creator"}
          width="44"
          height="44"
          loading="eager"
          decoding="async"
          className="w-full h-full object-cover"
          onError={() => setImageError(true)}
        />
      )}
      {(!client.logo || imageError) && (
        <span className="relative z-10 drop-shadow-md">{client.title?.charAt(0) || 'C'}</span>
      )}
    </div>
  );
};

/* ------------------------------ Main Component ------------------------------ */

export default function HeroSection({ isDark, onAudit, workTargetId = "work" }) {
  const { totalSubscribers, stats, loading } = useClientStats();
  const { config } = useGlobalConfig();
  const sectionRef = useRef(null);
  const navigate = useNavigate();

  const formatCompactNumber = (number) => {
    return new Intl.NumberFormat('en-US', {
      notation: "compact",
      maximumFractionDigits: 1
    }).format(number);
  };

  const reachValue = useMemo(() => {
    const combined = (totalSubscribers || 0) || (config?.stats?.totalReach || 0);
    return combined > 0 ? formatCompactNumber(combined) : "3M+";
  }, [totalSubscribers, config]);

  const handleSeeWork = useCallback((e) => {
    e.preventDefault();
    emitAnalytics({ ev: "see_work", src: "hero" });
    navigate("/work");
  }, [navigate]);

  const displayClients = useMemo(() => {
    if (loading || !stats || stats.length === 0) return [];
    return [...stats].sort(() => 0.5 - Math.random()).slice(0, 3);
  }, [stats, loading]);

  // Brand color gradients for avatars
  const gradients = [
    'linear-gradient(135deg, #E85002 0%, #DC3A0B 100%)',
    'linear-gradient(135deg, #F16001 0%, #E85002 100%)',
    'linear-gradient(135deg, #DC3A0B 0%, #C10B01 100%)'
  ];

  const container = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15, delayChildren: 0.3 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 40 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", stiffness: 80, damping: 20 }
    }
  };

  return (
    <section
      id="home"
      ref={sectionRef}
      className="relative min-h-screen flex items-center justify-center overflow-hidden bg-white dark:bg-black text-[var(--text)]"
      aria-label="Shinel Studios Hero"
    >
      <AuroraBackground />
      <ParticleNetwork
        particleCount={40}
        color="#E85002"
        connectionDistance={120}
        speed={0.3}
        opacity={0.25}
      />

      <div className="container mx-auto px-6 relative z-10 grid lg:grid-cols-2 gap-20 lg:gap-32 items-center py-32 lg:py-0">

        {/* LEFT: Content */}
        <motion.div
          className="text-center lg:text-left space-y-12 max-w-2xl mx-auto lg:mx-0"
          variants={container}
          initial="hidden"
          animate="visible"
        >

          {/* Trust Pill */}
          <motion.div variants={item} className="inline-block relative group">
            <div className="absolute inset-0 bg-[#E85002] rounded-full blur-3xl opacity-20 group-hover:opacity-35 transition-all duration-500" />

            <div className="relative inline-flex items-center gap-4 pl-3 pr-7 py-3 rounded-full border border-white/10 bg-black/70 backdrop-blur-2xl shadow-2xl ring-1 ring-white/5 hover:scale-105 transition-transform duration-300">
              <div className="flex -space-x-4">
                {displayClients.length > 0 ? (
                  displayClients.map((client, i) => (
                    <ClientAvatar
                      key={client.id || i}
                      client={client}
                      gradient={gradients[i % gradients.length]}
                      zIndex={10 - i}
                    />
                  ))
                ) : (
                  [0, 1, 2].map(i => (
                    <div
                      key={i}
                      className="w-11 h-11 rounded-full border-[3px] border-[var(--surface)] ring-2 ring-[var(--border)] shadow-xl animate-pulse"
                      style={{ background: gradients[i % gradients.length], zIndex: 10 - i, opacity: 0.3 }}
                    />
                  ))
                )}
              </div>
              <div className="h-7 w-px bg-white/10" />
              <div className="flex flex-col items-start">
                <span className="text-lg font-black text-white tabular-nums leading-none">
                  {reachValue}
                </span>
                <span className="text-xs text-gray-400 font-semibold leading-none mt-1">Active Subs Managed</span>
              </div>
            </div>
          </motion.div>

          {/* Headline */}
          <motion.h1
            variants={item}
            className="text-6xl lg:text-8xl font-black tracking-tighter leading-[0.9] drop-shadow-2xl text-[var(--text)]"
          >
            We <span className="animated-gradient-text">Engineer</span>
            <br />YouTube Growth
          </motion.h1>

          {/* Add gradient animation styles */}
          <style dangerouslySetInnerHTML={{
            __html: `
            .animated-gradient-text {
              background: linear-gradient(
                90deg,
                #E85002 0%,
                #ff6b35 25%,
                #E85002 50%,
                #ff6b35 75%,
                #E85002 100%
              );
              background-size: 200% auto;
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
              background-clip: text;
              animation: gradient-shift 3s ease infinite;
              filter: drop-shadow(0 0 40px rgba(232, 80, 2, 0.4));
            }

            /* Fallback for browsers that don't support background-clip: text */
            @supports not (-webkit-background-clip: text) {
              .animated-gradient-text {
                color: #E85002;
                -webkit-text-fill-color: #E85002;
              }
            }

            @keyframes gradient-shift {
              0%, 100% {
                background-position: 0% center;
              }
              50% {
                background-position: 100% center;
              }
            }

            /* Reduce motion for accessibility */
            @media (prefers-reduced-motion: reduce) {
              .animated-gradient-text {
                animation: none;
                background-position: 0% center;
              }
            }
          `}} />

          {/* Subheadline */}
          <motion.p
            variants={item}
            className="text-xl lg:text-2xl text-[var(--text-muted)] leading-relaxed max-w-xl mx-auto lg:mx-0"
          >
            Premium editing & strategy that drives measurable results.
            <span className="block opacity-60 text-lg mt-3 font-light">Data-backed. Performance-focused. No templates.</span>
          </motion.p>

          {/* CTAs */}
          <motion.div
            variants={item}
            className="space-y-6 pt-8"
          >
            <div className="flex flex-col sm:flex-row items-center gap-5 justify-center lg:justify-start">
              <button
                onClick={onAudit}
                className="group relative px-12 py-6 text-lg font-black text-white rounded-full bg-[#E85002] shadow-[0_20px_60px_-15px_rgba(232,80,2,0.7)] hover:shadow-[0_30px_70px_-10px_rgba(232,80,2,0.9)] hover:scale-105 active:scale-100 transition-all duration-300 w-full sm:w-auto overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/25 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                <span className="relative flex items-center justify-center gap-2.5">
                  Get Free Audit
                  <ArrowRight size={22} className="group-hover:translate-x-1 transition-transform" />
                </span>
              </button>

              <button
                onClick={handleSeeWork}
                className="px-12 py-6 text-lg font-bold rounded-full border-2 border-white/20 hover:border-white/40 hover:bg-white/5 transition-all duration-300 w-full sm:w-auto backdrop-blur-sm"
              >
                View Our Work
              </button>
            </div>

            {/* Trust micro-copy - Now properly aligned under buttons */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-8 gap-y-3 px-2">
              <div className="flex items-center gap-4 text-xs text-[var(--text-muted)] font-medium">
                <div className="flex items-center gap-1.5">
                  <Check size={14} className="text-[var(--orange)]" />
                  <span>No credit card</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Check size={14} className="text-[var(--orange)]" />
                  <span>15-min call</span>
                </div>
              </div>

              {/* Urgency indicator - Integrated with trust items */}
              <div className="flex items-center gap-2.5">
                <div className="relative flex items-center justify-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#C10801] animate-ping absolute" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#C10801] relative" />
                </div>
                <span className="text-xs text-[var(--text-muted)] font-medium">
                  <span className="text-[var(--orange)] font-extrabold uppercase tracking-widest text-[10px] mr-1">Limited:</span>
                  Only 3 spots left this week
                </span>
              </div>
            </div>
          </motion.div>

          {/* Trust Markers */}
          <motion.div
            variants={item}
            className="flex items-center justify-center lg:justify-start gap-12 pt-6"
          >
            <div className="flex items-center gap-2.5">
              <Sparkles size={18} className="text-[var(--orange)]" />
              <span className="text-sm text-[var(--text-muted)] font-semibold">AI-Enhanced</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Users size={18} className="text-[var(--orange)]" />
              <span className="text-sm text-[var(--text-muted)] font-semibold">Human Perfected</span>
            </div>
          </motion.div>
        </motion.div>

        {/* RIGHT: 3D Visuals */}
        <div className="hidden lg:flex items-center justify-center">
          <ThreeDVisuals />
        </div>

      </div>
    </section>
  );
}
