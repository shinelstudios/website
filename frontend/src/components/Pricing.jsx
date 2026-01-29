// src/components/Pricing.jsx
import React, { useState, useMemo, useCallback, useRef } from "react";
import { useGlobalConfig } from "../context/GlobalConfigContext";
import { motion, AnimatePresence } from "framer-motion";
import { formatINR, track } from "../lib/helpers";
import MetaTags, { BreadcrumbSchema } from "./MetaTags";
import { FESTIVAL_DATABASE, CONTACT, TYPOGRAPHY, COLORS } from "../config/constants";
import {
  Check, ArrowRight, Zap, Star, Shield, Clock, Sparkles, Info, MessageCircle,
  Settings as SettingsIcon, Monitor, Activity, Cpu, Layers, BarChart, HardDrive
} from "lucide-react";
import FloatingOrbs from "./animations/FloatingOrbs";

/**
 * Pricing - Elite Agency Optimized Version
 * High-contrast readability, 60fps animations, and new "Studio Pipeline" features.
 */
const Pricing = ({ onOpenCalendly }) => {
  const { config } = useGlobalConfig();
  const [cat, setCat] = useState("gaming");
  const [openIdx, setOpenIdx] = useState(null);
  const [idx, setIdx] = useState(0);

  const isMobile = typeof window !== "undefined" && window.matchMedia("(max-width: 768px)").matches;

  // 1. Detect Active Festival Offer
  const activeOffer = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    return FESTIVAL_DATABASE.find(fest => {
      const start = new Date(currentYear, fest.month, fest.day - 1);
      const end = new Date(currentYear, fest.month, fest.day + fest.durationDays);
      return now >= start && now <= end;
    });
  }, []);

  // 2. Comprehensive Data Structure
  const CATS = [
    { k: "gaming", label: "Gaming", headline: "CRACK THE ALGORITHM", sub: "Hook-first edits for creators who play to win." },
    { k: "vlog", label: "Vlogs", headline: "NARRATIVE ARCHITECTURE", sub: "Everyday moments, polished into bingeable cinema." },
    { k: "talking", label: "Talking Heads", headline: "AUTHORITY ENGINE", sub: "Studio-grade edits for podcasts, educators, and leaders." },
    { k: "others", label: "Studio Custom", headline: "BESPOKE PIPELINES", sub: "Tell us the vision; we build the production line." },
  ];

  const PLANS = {
    gaming: [
      {
        name: "Trial Sprint",
        tag: "100% QUALITY PROOF",
        key: "starter",
        cta: "Deploy Trial",
        priceInr: 599,
        billing: "one-time",
        bullets: [
          "1 Cinematic Thumbnail (A/B Ready)",
          "1 High-Octane Short (≤50s)",
          "Channel Audit & SEO Baseline",
        ],
        includes: [
          "2 Design Variations",
          "Kinetic SFX & Color Grade",
          "48h Handoff",
        ],
      },
      {
        name: "Shorts Factory",
        tag: "VIRAL FREQUENCY",
        key: "highlights",
        cta: "Scale Shorts",
        priceInr: 6999,
        billing: "monthly",
        bullets: [
          "30 Optimized Shorts / Month",
          "30 Bespoke Vertical Thumbnails",
          "Custom Platform Branding Pack",
        ],
        includes: [
          "Meme-Engine Integration",
          "Trend-First Subtitles",
          "72h Priority Queue",
        ],
      },
      {
        name: "The Vanguard",
        tag: "LONG-FORM RHYTHM",
        key: "rankup",
        cta: "Join the Vanguard",
        priceInr: 5499,
        billing: "monthly",
        bullets: [
          "2 Long-Form Masterpieces / Month",
          "2 A/B Tested Thumbnails per vid",
          "Full Video SEO Suite",
        ],
        includes: [
          "Advanced Storyboarding",
          "Soundtrack Curation",
          "Unlimited Revisions",
        ],
      },
      {
        name: "Empire Tier",
        tag: "FULL STUDIO OUTSOURCE",
        key: "pro",
        cta: "Build My Empire",
        priceInr: 13499,
        billing: "monthly",
        bullets: [
          "4 Long-Form + 20 Shorts / Month",
          "Complete Channel Management",
          "Monthly Growth & Analytics Audit",
        ],
        includes: [
          "Priority Production Lead",
          "Full Asset Handoff (PRPROJ)",
          "SLA: 48h Guaranteed",
        ],
      },
    ],
    vlog: [
      {
        name: "Spark Trial",
        tag: "SINGLE STORY PROOF",
        key: "starter",
        cta: "Start Spark",
        priceInr: 699,
        billing: "one-time",
        bullets: ["1 Premium Thumbnail", "1 Story-Driven Reel", "Narrative Structure Audit"],
        includes: ["Color Restoration", "AI Audio Cleanup", "48h SLA"],
      },
      {
        name: "Daily Driver",
        tag: "RELIABLE OUTPUT",
        key: "driver",
        cta: "Deploy Driver",
        priceInr: 9999,
        billing: "monthly",
        bullets: ["3 Narrative Vlog Edits (≤8m)", "3 Thumbnails (A/B Comps)", "9 Multi-Platform Reels"],
        includes: ["LUT Color Grading", "Audio Mastering", "Monthly Asset Library"],
      },
      {
        name: "Cinematic Suite",
        tag: "FILM-GRADE FINISH",
        key: "story",
        cta: "Go Cinematic",
        priceInr: 7499,
        billing: "monthly",
        bullets: ["2 Cinematic Story-Arcs / Month", "2 Premium Hook-Based Layouts", "6 Multi-Platform Reels"],
        includes: ["Soundscape Design", "Advanced Color Mix", "4K Processing"],
      },
      {
        name: "Auteur Pack",
        tag: "TOTAL CREATIVE CONTROL",
        key: "suite",
        cta: "Unlock Auteur",
        priceInr: 17999,
        billing: "monthly",
        bullets: ["6 Large-Scale Edits / Month", "6 A/B Thumbnail Pairs", "15 Reels + Brand Kit"],
        includes: ["Concept Pre-Production", "Dedicated Handoff Manager", "Priority Rendering"],
      },
    ],
    talking: [
      {
        name: "On-Air Sprint",
        tag: "TEST THE MIC",
        key: "starter",
        cta: "Go On-Air",
        priceInr: 999,
        billing: "one-time",
        bullets: ["1 Authority Thumbnail", "1 Information-Dense Reel"],
        includes: ["Motion Graphic Titles", "48h SLA", "SEO Title Pack"],
      },
      {
        name: "Studio Line",
        tag: "PROFESSIONAL HUB",
        key: "studio",
        cta: "Setup Studio",
        priceInr: 13999,
        billing: "monthly",
        bullets: ["2 Multi-Cam Edits / Month", "12 Knowledge-Clips", "Full Show-Notes & Chapters"],
        includes: ["Transcription Logic", "Dynamic Lower-Thirds", "72h SLA"],
      },
      {
        name: "Clips Flywheel",
        tag: "DISCOVERY MONSTER",
        key: "clips",
        cta: "Launch Flywheel",
        priceInr: 14999,
        billing: "monthly",
        bullets: ["30 High-Intensity Clips / Month", "30 Topic-Based Covers", "Automated Framing Optimization"],
        includes: ["Hook Iteration Suite", "Multi-Layout Export", "Priority Rendertrain"],
      },
      {
        name: "Enterprise Show",
        tag: "GLOBAL BROADCAST",
        key: "network",
        cta: "Build Network",
        priceInr: 24999,
        billing: "monthly",
        bullets: ["4 Multi-Cam Episodes / Month", "20 Global Clips", "Blog-Post Adaptations"],
        includes: ["Custom MOGRT Pack", "Dedicated Creative Lead", "Quarterly Brand Strategy"],
      },
    ],
    others: [
      {
        name: "Explainer Pro",
        tag: "CONVERSION MOVIE",
        key: "explainer",
        cta: "Start Pipeline",
        priceInr: null,
        billing: "quote",
        bullets: ["60s SaaS/Product Ad", "Script & Handoff Storyboard", "Premium Motion Design Suite"],
        includes: ["VO Direction", "Brand Sync", "SLA: Custom"],
      },
      {
        name: "Custom Studio",
        tag: "BESPOKE WORKFLOW",
        key: "custom",
        cta: "Build Pipeline",
        priceInr: null,
        billing: "quote",
        bullets: ["Tailored Mixed-Media Production", "Dedicated Production POD", "KPI-Driven Creative Handoff"],
        includes: ["Director Consultation", "Workflow Design", "Full IP Handoff"],
      },
    ],
  };

  const POPULAR = { gaming: "highlights", vlog: "driver", talking: "clips" };

  // 3. Logic & Helpers
  /* --- Global Price Sync --- */
  const calculateDiscountedPrice = useCallback((original) => {
    if (!original || !activeOffer) return original;
    const factor = (100 - activeOffer.discount) / 100;
    return Math.floor(original * factor);
  }, [activeOffer]);

  // Merge dynamic prices into local object if available
  const activePrices = useMemo(() => {
    const fresh = config?.pricing || {};
    const merged = JSON.parse(JSON.stringify(PLANS)); // Deep clone

    Object.keys(merged).forEach(catKey => {
      merged[catKey].forEach(plan => {
        if (fresh[catKey]?.[plan.key]) {
          plan.priceInr = fresh[catKey][plan.key];
        }
      });
    });
    return merged;
  }, [config, PLANS]);

  const handleCTA = (plan) => {
    const discounted = calculateDiscountedPrice(plan.priceInr);
    const priceStr = plan.priceInr ? formatINR(discounted) : "Custom Quote";
    const msg = `SHINEL STUDIOS // INQUIRY \n-----------------\nCAT: ${cat.toUpperCase()}\nPLAN: ${plan.name}\nVAL: ${priceStr}${plan.billing === 'monthly' ? '/mo' : ''}\nOFFER: ${activeOffer ? activeOffer.id : 'N/A'}\n-----------------\nRequesting production availability.`;
    const waUrl = `https://wa.me/${CONTACT.phone}?text=${encodeURIComponent(msg)}`;
    track("agency_pricing_cta", { plan: plan.key, cat });
    window.open(waUrl, "_blank");
  };

  const currentPlans = activePrices[cat] || [];
  const railRef = useRef(null);

  const scrollToIndex = useCallback((i) => {
    if (!railRef.current) return;
    const clamped = Math.max(0, Math.min(i, currentPlans.length - 1));
    const child = railRef.current.children[clamped];
    if (child) {
      child.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
      setIdx(clamped);
    }
  }, [currentPlans.length]);

  // 4. Sub-Components
  const MetricLabel = ({ icon: Icon, label, value }) => (
    <div className="flex items-center gap-2 opacity-40 group-hover:opacity-100 transition-opacity duration-300">
      <Icon size={12} className="text-[var(--orange)]" />
      <span className="text-[10px] font-mono leading-none tracking-widest uppercase font-bold">{label}: {value}</span>
    </div>
  );

  const StatusStage = ({ label, active, complete }) => (
    <div className="flex flex-col items-center gap-2">
      <div className={`w-2.5 h-2.5 rounded-full border ${complete ? 'bg-[var(--orange)] border-[var(--orange)]' : active ? 'bg-[var(--orange)] animate-pulse border-[var(--orange)] shadow-[0_0_10px_rgba(232,80,2,0.8)]' : 'border-white/20'}`} />
      <span className={`text-[8px] font-mono uppercase tracking-widest ${active || complete ? 'text-[var(--text)] font-black' : 'text-[var(--text-muted)]/20'}`}>{label}</span>
    </div>
  );

  return (
    <section id="pricing" className="py-24 md:py-32 relative bg-[var(--surface)] text-[var(--text)] overflow-hidden min-h-screen cursor-default selection:bg-[var(--orange)]/30">
      <MetaTags
        title="Production Pricing | Shinel Studios - Elite Video Editing Agency"
        description="Transparent production pricing for top-tier creators. AI-powered, human-directed, post-production excellence. High-contrast, 60fps experience."
      />

      {/* Cinematic Texture Layer - Fixed for Performance */}
      <div className="absolute inset-0 pointer-events-none z-50 opacity-[0.02] mix-blend-overlay" style={{ backgroundImage: "url('https://grainy-gradients.vercel.app/noise.svg')", position: 'fixed' }} />

      {/* Spotlight Lighting */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-screen h-screen bg-[radial-gradient(circle_at_50%_0%,rgba(232,80,2,0.1)_0%,transparent_70%)] pointer-events-none" />
      <div className="absolute -bottom-1/4 -right-1/4 w-[800px] h-[800px] bg-[var(--orange)]/5 blur-[150px] pointer-events-none rounded-full" />

      {/* Floating Orbs Animation */}
      <FloatingOrbs
        orbCount={12}
        color="#E85002"
        opacity={0.4}
        speed="medium"
      />

      <div className="container mx-auto px-6 max-w-7xl relative z-10">
        {/* Header Section */}
        <div className="flex flex-col items-center text-center mb-24 lg:mb-32">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex items-center gap-3 px-4 py-2 rounded-full border border-[var(--border)] bg-[var(--surface-alt)] mb-8"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--orange)] animate-pulse" />
            <span className="text-[10px] font-mono uppercase tracking-[0.4em] text-[var(--text-muted)] font-black">Production Standards v4.2 // OPTIMIZED</span>
          </motion.div>

          <motion.h1
            style={{ fontFamily: TYPOGRAPHY.display }}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="text-5xl md:text-8xl lg:text-9xl text-[var(--text)] mb-6 tracking-tight leading-none"
          >
            Elite <span className="italic text-[var(--orange)]">Value.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="text-[var(--text-muted)] text-[10px] md:text-xs font-mono uppercase tracking-[0.5em] max-w-2xl font-bold"
          >
            Tiered output pipelines for high-performance channels.
          </motion.p>
        </div>

        {/* Global Offer Alert - Enhanced Contrast */}
        <AnimatePresence>
          {activeOffer && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-20 rounded-[2.5rem] border border-[var(--orange)]/30 bg-[var(--surface-alt)] p-10 relative overflow-hidden group backdrop-blur-xl"
            >
              {/* Decorative Brackets */}
              <div className="absolute top-6 left-6 w-6 h-6 border-t-2 border-l-2 border-[var(--orange)]/40" />
              <div className="absolute top-6 right-6 w-6 h-6 border-t-2 border-r-2 border-[var(--orange)]/40" />
              <div className="absolute bottom-6 left-6 w-6 h-6 border-b-2 border-l-2 border-[var(--orange)]/40" />
              <div className="absolute bottom-6 right-6 w-6 h-6 border-b-2 border-r-2 border-[var(--orange)]/40" />

              <div className="flex flex-col md:flex-row items-center justify-between gap-10 relative z-10">
                <div className="flex items-center gap-8">
                  <div className="w-20 h-20 rounded-3xl bg-[var(--orange)]/10 flex items-center justify-center border border-[var(--orange)]/40 shadow-[0_0_50px_rgba(232,80,2,0.1)]">
                    <Zap className="text-[var(--orange)] drop-shadow-glow" size={40} />
                  </div>
                  <div>
                    <span className="text-[11px] font-mono text-[var(--orange)] uppercase tracking-widest block mb-1 font-black">Incoming Transmission // Offer Active</span>
                    <h2 className="text-3xl md:text-5xl font-black text-[var(--text)] uppercase tracking-tighter leading-none">{activeOffer.title}</h2>
                  </div>
                </div>
                <div className="text-center md:text-right border-t md:border-t-0 md:border-l border-[var(--border)] pt-8 md:pt-0 md:pl-12">
                  <div className="text-[11px] font-mono text-[var(--text-muted)] uppercase tracking-[0.3em] mb-2 font-black">Discount Multiplier</div>
                  <div className="text-6xl font-black text-[var(--text)] leading-none tracking-tighter">-{activeOffer.discount}%</div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Category Tabs - High Interactive Feedback */}
        <div className="flex flex-wrap justify-center gap-4 mb-20 px-4">
          {CATS.map((c) => (
            <button
              key={c.k}
              onClick={() => { setCat(c.k); setIdx(0); setOpenIdx(null); }}
              className={`group relative flex items-center gap-3 px-10 py-5 rounded-2xl text-[12px] font-black uppercase tracking-[0.2em] transition-all duration-500 ${cat === c.k
                ? "bg-[var(--text)] text-[var(--surface)] scale-105 shadow-[0_20px_40px_rgba(255,255,255,0.1)]"
                : "bg-[var(--surface-alt)] border border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--surface-alt)]/80 hover:text-[var(--text)] active:scale-95"
                }`}
              style={{ willChange: 'transform, opacity' }}
            >
              {cat === c.k && <motion.div layoutId="tab-dot" className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_10px_rgba(232,80,2,0.8)]" />}
              {c.label}
            </button>
          ))}
        </div>

        {/* Studio Plans Display Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl font-black text-[var(--text)] uppercase tracking-[0.2em] mb-4 drop-shadow-glow">{CATS.find(x => x.k === cat)?.headline}</h2>
          <p className="text-[var(--text-muted)] text-[11px] uppercase tracking-[0.4em] font-mono font-black">{CATS.find(x => x.k === cat)?.sub}</p>
        </div>

        <div
          className="relative"
          style={{
            contentVisibility: 'auto',
            containIntrinsicSize: '0 800px'
          }}
        >
          <div
            ref={railRef}
            className={`flex ${isMobile ? "overflow-x-auto snap-x snap-mandatory no-scrollbar pb-10 gap-6" : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"}`}
          >
            {currentPlans.map((p, i) => {
              const isPopular = POPULAR[cat] === p.key;
              const open = openIdx === i;
              const originalPrice = p.priceInr;
              const finalPrice = calculateDiscountedPrice(originalPrice);

              return (
                <motion.div
                  key={`${cat}-${p.key}`}
                  layout
                  initial={{ opacity: 0, scale: 0.98, y: 20 }}
                  whileInView={{ opacity: 1, scale: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05, type: 'spring', stiffness: 100, damping: 20 }}
                  className={`relative group shrink-0 ${isMobile ? "w-[88vw] snap-center" : "w-full"}`}
                >
                  {/* Studio Spec Card - Enhanced Hovers & Contrast */}
                  <div className={`h-full rounded-[2.5rem] p-8 border transition-all duration-500 flex flex-col relative overflow-hidden ${isPopular
                    ? "border-[var(--orange)]/40 bg-[var(--surface-alt)]"
                    : "border-[var(--border)] bg-[var(--surface-alt)]/50 hover:bg-[var(--surface-alt)] hover:border-[var(--text-muted)]/30"
                    }`}
                    style={{ willChange: 'transform' }}>

                    {/* Shadow Glow On Hover (Desktop) */}
                    {!isMobile && (
                      <div className="absolute inset-0 bg-orange-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-[80px] pointer-events-none" />
                    )}

                    {/* Sensor Data Headers - Better Readability */}
                    <div className="flex justify-between items-center mb-10 relative z-10">
                      <div className="flex items-center gap-2">
                        <Activity size={12} className="text-orange-500 animate-pulse" />
                        <span className="text-[9px] font-mono text-[var(--text-muted)] uppercase tracking-[0.2em] font-black">{p.key.padStart(8, '0')}</span>
                      </div>
                      {isPopular && (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-[var(--orange)]/40 bg-[var(--orange)]/10">
                          <Star size={8} className="text-[var(--orange)] fill-[var(--orange)]" />
                          <span className="text-[9px] font-mono text-[var(--orange)] uppercase tracking-widest font-black">Elite choice</span>
                        </div>
                      )}
                    </div>

                    <div className="mb-10 relative z-10">
                      <span className="text-[11px] font-mono uppercase tracking-[0.3em] text-[var(--orange)] font-black block mb-2">{p.tag}</span>
                      <h3 className="text-2xl font-black text-[var(--text)] uppercase tracking-tighter mb-6 leading-none">{p.name}</h3>

                      <div className="flex flex-col">
                        {originalPrice ? (
                          <>
                            <div className="flex items-baseline gap-2">
                              <span className="text-4xl font-black text-[var(--text)] tracking-tighter">{formatINR(finalPrice)}</span>
                              {p.billing === 'monthly' && <span className="text-[11px] font-mono text-[var(--text-muted)] uppercase tracking-widest font-bold">/mo</span>}
                            </div>
                            {originalPrice !== finalPrice && (
                              <div className="flex items-center gap-2 mt-1.5">
                                <span className="text-xs font-mono text-[var(--text-muted)]/50 line-through tracking-wider font-medium">{formatINR(originalPrice)}</span>
                                <span className="text-[10px] font-mono text-[var(--orange)] font-black tracking-widest">FLAT -{activeOffer.discount}%</span>
                              </div>
                            )}
                          </>
                        ) : (
                          <span className="text-xl font-black text-[var(--text)]/90 uppercase tracking-[0.2em] drop-shadow-glow">Consult Studio</span>
                        )}
                      </div>
                    </div>

                    {/* Operational Bullets - Higher Contrast */}
                    <div className="flex-1 relative z-10">
                      <ul className="space-y-4 mb-10">
                        {p.bullets.map((b, bi) => (
                          <li key={bi} className="flex items-start gap-4 group/item">
                            <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[var(--orange)] shadow-[0_0_5px_rgba(232,80,2,0.5)] group-hover/item:scale-150 transition-transform duration-300" />
                            <span className="text-xs text-[var(--text-muted)] leading-relaxed font-mono uppercase tracking-tight group-hover/item:text-[var(--text)] font-bold transition-colors duration-300">{b}</span>
                          </li>
                        ))}
                      </ul>

                      {/* Detail Expansion - Studio Spec Style */}
                      {p.includes && (
                        <div className="mt-6 pt-6 border-t border-white/10">
                          <button
                            onClick={(e) => { e.stopPropagation(); setOpenIdx(open ? null : i); }}
                            className="flex items-center justify-between w-full text-[10px] font-mono uppercase tracking-[0.3em] text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <SettingsIcon size={14} className={`transition-transform duration-500 ${open ? "rotate-90 text-[var(--orange)]" : ""}`} />
                              <span className={open ? 'text-[var(--orange)] font-black' : ''}>Technical Specs</span>
                            </div>
                            <ArrowRight size={10} className={`transition-transform duration-300 ${open ? 'rotate-90' : ''}`} />
                          </button>
                          <AnimatePresence>
                            {open && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                              >
                                <ul className="mt-6 space-y-3.5 pl-2 border-l border-white/5">
                                  {p.includes.map((inc, ii) => (
                                    <li key={ii} className="text-[10px] text-[var(--text-muted)] font-mono uppercase flex items-center gap-2 tracking-wide leading-relaxed font-medium hover:text-[var(--text)]/80 transition-colors">
                                      <div className="w-1 h-1 rotate-45 border border-[var(--orange)]/30 shrink-0" />
                                      {inc}
                                    </li>
                                  ))}
                                </ul>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}
                    </div>

                    {/* Agency Action Button - Liquid Animation */}
                    <button
                      onClick={() => handleCTA(p)}
                      className={`w-full mt-10 py-5 rounded-2xl font-black text-[12px] uppercase tracking-[0.3em] transition-all duration-500 relative overflow-hidden group/btn active:scale-95 z-20 ${isPopular
                        ? "bg-[var(--text)] text-[var(--surface)] hover:bg-[var(--brand-red)] hover:text-white shadow-[0_15px_30px_rgba(232,80,2,0.2)]"
                        : "bg-[var(--surface-alt)] text-[var(--text)] hover:bg-[var(--surface-alt)]/80 border border-[var(--border)]"
                        }`}
                      style={{ willChange: 'transform' }}
                    >
                      <span className="relative z-10 flex items-center justify-center gap-3">
                        {p.cta} <ArrowRight size={16} className="group-hover/btn:translate-x-1 transition-transform" />
                      </span>
                    </button>

                    <div className="mt-8 flex justify-between items-center px-1 relative z-10">
                      <MetricLabel icon={Cpu} label="Engine" value="v9.0a" />
                      <MetricLabel icon={Clock} label="Latency" value="&lt;48H" />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Feature 1: The Production Pipeline Visualizer */}
        <div
          className="mt-32 p-10 rounded-[3rem] border border-[var(--border)] bg-[var(--surface-alt)] backdrop-blur-md relative overflow-hidden"
          style={{
            contentVisibility: 'auto',
            containIntrinsicSize: '0 400px'
          }}
        >
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <Monitor size={100} />
          </div>

          <div className="text-center mb-12">
            <span className="text-[10px] font-mono text-[var(--orange)] font-black uppercase tracking-[0.5em] block mb-2">Live Production Logic</span>
            <h3 className="text-3xl font-black text-[var(--text)] uppercase tracking-tighter">Your Pipeline Journey</h3>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 relative px-4">
            {/* Connector Line */}
            <div className="absolute top-1.5 left-10 right-10 h-[1px] bg-[var(--border)] hidden md:block" />

            <StatusStage label="Ingestion" complete />
            <StatusStage label="A-Cut Logic" complete />
            <StatusStage label="Creative Pass" active />
            <StatusStage label="Shinel QA" />
            <StatusStage label="Master Handoff" />
          </div>

          <div className="mt-12 flex flex-col md:flex-row items-center justify-center gap-10 border-t border-[var(--border)] pt-10">
            <div className="flex items-center gap-3">
              <Shield size={20} className="text-[var(--orange)]" />
              <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-widest font-black">Secure Data Vault Included</span>
            </div>
            <div className="flex items-center gap-3">
              <HardDrive size={20} className="text-[var(--orange)]" />
              <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-widest font-black">All Project Assets Preserved</span>
            </div>
          </div>
        </div>

        {/* Studio Add-ons Hub - Better Grid & Hover */}
        <div
          className="mt-20 grid grid-cols-1 lg:grid-cols-2 gap-10"
          style={{
            contentVisibility: 'auto',
            containIntrinsicSize: '0 500px'
          }}
        >
          <motion.div
            whileHover={{ y: -5 }}
            className="p-10 rounded-[3rem] border border-[var(--border)] bg-[var(--surface-alt)] relative overflow-hidden group hover:border-[var(--orange)]/30 transition-colors duration-500"
          >
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-20 transition-opacity">
              <SettingsIcon size={60} />
            </div>
            <div className="flex items-center gap-4 mb-10">
              <div className="w-12 h-12 rounded-2xl bg-[var(--orange)]/10 flex items-center justify-center border border-[var(--orange)]/30">
                <Zap size={24} className="text-[var(--orange)]" />
              </div>
              <h4 className="text-2xl font-black text-[var(--text)] uppercase tracking-widest">Expansion Modules</h4>
            </div>
            <div className="space-y-8">
              {[
                { label: "Elite Rush Protocol (24h)", val: "+20%", desc: "Direct hardware allocation & priority rendering" },
                { label: "Motion Graphic Mastery", val: "₹200/min", desc: "Complex kinetic typography & custom VFX" },
                { label: "Global Content Adaptation", val: "₹1,000", desc: "A/B testing for multi-region performance" },
              ].map((item, idx) => (
                <div key={idx} className="flex items-center justify-between group/line border-b border-[var(--border)] pb-6 last:border-0 last:pb-0">
                  <div className="flex-1">
                    <span className="text-[12px] font-mono text-[var(--text)] uppercase tracking-widest block mb-1 group-hover/line:text-[var(--orange)] transition-colors font-black">{item.label}</span>
                    <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-tight font-medium leading-relaxed max-w-xs block">{item.desc}</span>
                  </div>
                  <span className="text-2xl font-black text-[var(--text)] ml-6">{item.val}</span>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            whileHover={{ y: -5 }}
            className="p-10 rounded-[3rem] border border-white/10 bg-white/[0.03] relative overflow-hidden group hover:border-[var(--orange)]/30 transition-colors duration-500"
          >
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-20 transition-opacity">
              <Layers size={60} />
            </div>
            <div className="flex items-center gap-4 mb-10">
              <div className="w-12 h-12 rounded-2xl bg-[var(--orange)]/10 flex items-center justify-center border border-[var(--orange)]/30">
                <BarChart size={24} className="text-[var(--orange)]" />
              </div>
              <h4 className="text-2xl font-black text-[var(--text)] uppercase tracking-widest">Standard Specs</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
              {[
                { l: "Revision Control", v: "1 MAJOR // 2 MINOR ACC" },
                { l: "Asset Delivery", v: "FULL CLOUD HANDOFF" },
                { l: "Quality Logic", v: "SHINEL 10-PT AUDIT" },
                { l: "Production Tier", v: "HUMAN-DIRECTED AI" },
                { l: "Initial Sync", v: "15 MIN STRATEGY CALL" },
                { l: "Output Opt", v: "4K / VERTICAL / HDR" },
              ].map((item, idx) => (
                <div key={idx} className="space-y-1.5 border-l-2 border-[var(--orange)]/20 pl-4 py-1">
                  <span className="text-[10px] font-mono text-[var(--orange)] uppercase tracking-widest font-black">{item.l}</span>
                  <span className="text-[11px] font-mono text-[var(--text)] uppercase tracking-tight block font-black">{item.v}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Feature 2: Standard vs Shinel Elite Comparison Overlay */}
        <div className="mt-32 border-t border-[var(--border)] pt-32">
          <div className="text-center mb-16">
            <h4 className="text-3xl font-black text-[var(--text)] uppercase tracking-tighter">Why the Industry Switches to Shinel</h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 max-w-5xl mx-auto">
            {/* Feature 1 */}
            <div className="text-center group">
              <div className="mb-6 text-[var(--text-muted)]/20 group-hover:text-[var(--orange)] transition-colors">
                <Zap size={32} />
              </div>
              <div className="text-[11px] font-mono text-[var(--text)] font-black uppercase tracking-widest mb-2">Turnaround</div>
              <div className="h-2 w-full bg-[var(--surface-alt)] rounded-full mb-3 overflow-hidden">
                <div className="h-full bg-[var(--orange)] w-[95%]" />
              </div>
              <p className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-widest">Industry: 7 Days vs Shinel: 48H</p>
            </div>
            {/* Feature 2 */}
            <div className="text-center group">
              <div className="mb-6 text-[var(--text-muted)]/20 group-hover:text-[var(--orange)] transition-colors">
                <Star size={32} />
              </div>
              <div className="text-[11px] font-mono text-[var(--text)] font-black uppercase tracking-widest mb-2">Creative Index</div>
              <div className="h-2 w-full bg-[var(--surface-alt)] rounded-full mb-3 overflow-hidden">
                <div className="h-full bg-[var(--orange)] w-[88%]" />
              </div>
              <p className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-widest">Shinel Human-in-Loop Logic</p>
            </div>
            {/* Feature 3 */}
            <div className="text-center group">
              <div className="mb-6 text-[var(--text-muted)]/20 group-hover:text-[var(--orange)] transition-colors">
                <Shield size={32} />
              </div>
              <div className="text-[11px] font-mono text-[var(--text)] font-black uppercase tracking-widest mb-2">QA Reliability</div>
              <div className="h-2 w-full bg-[var(--surface-alt)] rounded-full mb-3 overflow-hidden">
                <div className="h-full bg-[var(--orange)] w-[99%]" />
              </div>
              <p className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-widest">10-Point Internal Audit</p>
            </div>
          </div>
        </div>

        <div className="mt-40 text-center opacity-30 pb-20">
          <p className="text-[10px] font-mono uppercase tracking-[0.8em] text-[var(--text)] font-black">
            SHINEL STUDIOS // ELITE CREATIVE PRODUCTION // 2026 // ALL ANALYTICS ACTIVE
          </p>
        </div>
      </div>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        
        @keyframes glow {
          0% { filter: drop-shadow(0 0 5px rgba(232,80,2,0.4)); }
          50% { filter: drop-shadow(0 0 20px rgba(232,80,2,0.8)); }
          100% { filter: drop-shadow(0 0 5px rgba(232,80,2,0.4)); }
        }
        .drop-shadow-glow {
          animation: glow 3s infinite ease-in-out;
        }
      `}</style>
    </section>
  );
};

export default Pricing;
