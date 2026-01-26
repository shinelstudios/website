import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { TrendingUp, Zap, Star, Settings, Target, Eye, Video, Calendar, DollarSign } from "lucide-react";

/* ---------- Formatters ---------- */
const formatINR = (n) => {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(Number(n || 0));
  } catch {
    const v = Math.round(Number(n || 0));
    return `₹${v.toLocaleString("en-IN")}`;
  }
};

const formatNumber = (n) => Math.round(n).toLocaleString("en-IN");
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const intOnly = (s) => Math.max(0, Number(String(s).replace(/[^0-9]/g, "")) || 0);
const decOnly = (s) => {
  const v = Number(String(s).replace(/[^0-9.]/g, ""));
  return Number.isFinite(v) ? v : 0;
};

/* ---------- Device Detection ---------- */
const useDeviceType = () => {
  const [deviceType, setDeviceType] = useState({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    isLowEnd: false,
  });

  useEffect(() => {
    const checkDevice = () => {
      const width = window.innerWidth;
      const isMobile = width < 640;
      const isTablet = width >= 640 && width < 1024;
      const isDesktop = width >= 1024;

      // Detect low-end device
      const isLowEnd = navigator.hardwareConcurrency <= 4 ||
        /Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

      setDeviceType({ isMobile, isTablet, isDesktop, isLowEnd });
    };

    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  return deviceType;
};

/* ---------- Debounced Value Hook ---------- */
const useDebounce = (value, delay = 300) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
};

/**
 * Enhanced ROI Calculator - Mobile-first, Performance-optimized
 */
export default function RoiCalculator({
  onBook,
  defaults = { views: 10000, posts: 8, ctr: 4.5, lift: 30, rpm: 120 },
}) {
  const device = useDeviceType();

  // Core inputs
  const [views, setViews] = useState(defaults.views);
  const [posts, setPosts] = useState(defaults.posts);
  const [lift, setLift] = useState(defaults.lift);

  // Advanced options
  const [openMore, setOpenMore] = useState(false);
  const [ctr, setCtr] = useState(defaults.ctr);
  const [rpm, setRpm] = useState(defaults.rpm);
  const [advanced, setAdvanced] = useState(false);
  const [impressions, setImpressions] = useState(() =>
    Math.round((defaults.views || 0) / Math.max((defaults.ctr || 0.1) / 100, 0.001))
  );

  // UI State
  const [copied, setCopied] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const mainCtaRef = useRef(null);
  const [ctaOffscreen, setCtaOffscreen] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  // Debounce calculations for better performance
  const debouncedViews = useDebounce(views, 150);
  const debouncedPosts = useDebounce(posts, 150);
  const debouncedLift = useDebounce(lift, 100);

  /* ---------- Quick presets ---------- */
  const stagePresets = useMemo(() => [
    {
      label: "Starter",
      icon: "Seedling",
      desc: "Starting out",
      views: 5000,
      posts: 4,
      ctr: 3.5,
      rpm: 80,
      color: "#10b981"
    },
    {
      label: "Growing",
      icon: TrendingUp,
      desc: "Building audience",
      views: 10000,
      posts: 8,
      ctr: 4.5,
      rpm: 120,
      color: "#3b82f6"
    },
    {
      label: "Established",
      icon: "Star",
      desc: "Consistent creator",
      views: 25000,
      posts: 12,
      ctr: 5.5,
      rpm: 180,
      color: "#f59e0b"
    },
    {
      label: "Pro",
      icon: Zap,
      desc: "High performer",
      views: 50000,
      posts: 16,
      ctr: 6.5,
      rpm: 250,
      color: "#8b5cf6"
    },
  ], []);

  const liftPresets = [10, 25, 50, 75, 100];

  /* ---------- Sync impressions ---------- */
  useEffect(() => {
    if (!advanced && (views || 0) && (ctr || 0)) {
      setImpressions(Math.round((views || 0) / Math.max(ctr / 100, 0.001)));
    }
  }, [views, ctr, advanced]);

  useEffect(() => {
    if (advanced && !impressions) {
      setImpressions(Math.round((views || 0) / Math.max(ctr / 100, 0.001)));
    }
  }, [advanced, views, ctr, impressions]);

  /* ---------- CTA visibility detection ---------- */
  useEffect(() => {
    const el = mainCtaRef.current;
    if (!el || !("IntersectionObserver" in window)) return;

    const io = new IntersectionObserver(
      (ents) => setCtaOffscreen(!ents[0].isIntersecting),
      { threshold: 0.01, rootMargin: "0px" }
    );

    io.observe(el);
    return () => io.disconnect();
  }, []);

  /* ---------- Calculation Model ---------- */
  const m = useMemo(() => {
    setIsCalculating(true);

    const n = clamp(Number(debouncedPosts) || 0, 0, 120);
    const C = clamp(Number(ctr) || 0, 0.1, 50);
    const L = clamp(Number(debouncedLift) || 0, 0, 200);
    const R = Math.max(0, Number(rpm) || 0);

    let basePerVideo, nextPerVideo, newCtr = C * (1 + L / 100);

    if (advanced) {
      const I = Math.max(0, Number(impressions) || 0);
      basePerVideo = I * (C / 100);
      nextPerVideo = I * (newCtr / 100);
    } else {
      basePerVideo = Math.max(0, Number(debouncedViews) || 0);
      nextPerVideo = basePerVideo * (1 + L / 100);
    }

    const monthNow = basePerVideo * n;
    const monthNew = nextPerVideo * n;
    const revNow = (monthNow / 1000) * R;
    const revNew = (monthNew / 1000) * R;

    setTimeout(() => setIsCalculating(false), 100);

    return {
      newCtr,
      perNow: basePerVideo,
      perNew: nextPerVideo,
      monthNow,
      monthNew,
      deltaViews: monthNew - monthNow,
      deltaRevenue: revNew - revNow,
      revNow,
      revNew,
      liftMultiplier: (nextPerVideo / Math.max(basePerVideo, 1)) - 1,
    };
  }, [debouncedViews, debouncedPosts, ctr, debouncedLift, rpm, advanced, impressions]);

  const annualDelta = m.deltaRevenue * 12;

  /* ---------- Handlers ---------- */
  const handleBook = useCallback(() => {
    if (!hasInteracted) setHasInteracted(true);

    try {
      window.dispatchEvent(
        new CustomEvent("analytics", {
          detail: {
            ev: "calc_cta_click",
            views: debouncedViews,
            posts: debouncedPosts,
            ctr,
            lift: debouncedLift,
            rpm,
            advanced,
            impressions,
            deltaRevenue: Math.round(m.deltaRevenue),
          },
        })
      );
    } catch { }

    onBook?.();
  }, [hasInteracted, debouncedViews, debouncedPosts, ctr, debouncedLift, rpm, advanced, impressions, m.deltaRevenue, onBook]);

  const copySummary = useCallback(async () => {
    const text = [
      `CTR Uplift Estimate`,
      ``,
      `Current Performance:`,
      `• CTR: ${ctr.toFixed(1)}%`,
      `• Avg views/video: ${formatNumber(views)}`,
      `• Videos/month: ${posts}`,
      `• RPM: ${formatINR(rpm)}`,
      ``,
      `Expected with +${debouncedLift}% CTR lift:`,
      `• New CTR: ${m.newCtr.toFixed(1)}%`,
      `• New views/video: ${formatNumber(m.perNew)}`,
      `• Extra views/month: ${formatNumber(m.deltaViews)}`,
      ``,
      `Revenue Impact:`,
      `• Monthly: ${formatINR(m.deltaRevenue)}`,
      `• Annual: ${formatINR(annualDelta)}`,
      ``,
      `Generated via CTR Calculator`,
    ].join("\n");

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { }
  }, [ctr, views, posts, rpm, debouncedLift, m, annualDelta]);

  const resetCalculator = useCallback(() => {
    setViews(defaults.views);
    setPosts(defaults.posts);
    setCtr(defaults.ctr);
    setLift(defaults.lift);
    setRpm(defaults.rpm);
    setImpressions(Math.round((defaults.views || 0) / Math.max((defaults.ctr || 0.1) / 100, 0.001)));
    setAdvanced(false);
    setOpenMore(false);
    setHasInteracted(false);
  }, [defaults]);

  const applyPreset = useCallback((preset) => {
    setViews(preset.views);
    setPosts(preset.posts);
    setCtr(preset.ctr);
    setRpm(preset.rpm);
    setImpressions(Math.round(preset.views / Math.max(preset.ctr / 100, 0.001)));
    setHasInteracted(true);
  }, []);

  /* ---------- Animation Variants ---------- */
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: device.isLowEnd ? 0 : 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: device.isLowEnd ? 0 : 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.3, ease: "easeOut" },
    },
  };

  return (
    <section
      aria-labelledby="roi-heading"
      className="py-8 sm:py-12 md:py-16"
      style={{
        background: "var(--surface)",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      <motion.div
        className="container mx-auto px-4 max-w-6xl"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header - Improved mobile typography */}
        <motion.div
          className="text-center mb-6 sm:mb-8"
          variants={itemVariants}
        >
          <h2
            id="roi-heading"
            className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold font-['Poppins'] tracking-tight leading-tight"
            style={{ color: "var(--text)" }}
          >
            Calculate Your CTR Uplift
          </h2>
          <p
            className="mt-3 text-sm sm:text-base md:text-lg max-w-2xl mx-auto leading-relaxed"
            style={{ color: "var(--text-muted)" }}
          >
            See how higher click-through rates translate to views and revenue
          </p>
        </motion.div>

        {/* Quick Channel Presets - Mobile Optimized */}
        <motion.div
          className="mb-6"
          variants={itemVariants}
        >
          <div className="text-sm font-medium mb-3 text-center sm:text-left" style={{ color: "var(--text)" }}>
            Choose your channel size:
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            {stagePresets.map((preset) => (
              <motion.button
                key={preset.label}
                type="button"
                onClick={() => applyPreset(preset)}
                className="p-3 sm:p-4 rounded-xl border-2 transition-all text-left"
                style={{
                  borderColor: "var(--border)",
                  background: "var(--surface-alt)",
                  WebkitTapHighlightColor: "transparent",
                }}
                whileHover={!device.isLowEnd ? {
                  scale: 1.02,
                  borderColor: preset.color,
                } : {}}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-start justify-between mb-2">
                  <span className="text-lg">{preset.label.split(' ')[0]}</span>
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ background: preset.color }}
                  />
                </div>
                <div className="text-xs font-semibold mb-1" style={{ color: "var(--text)" }}>
                  {preset.label.split(' ').slice(1).join(' ')}
                </div>
                <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {formatNumber(preset.views)} views
                </div>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Main Result Card - Enhanced Mobile Layout */}
        <motion.div
          variants={itemVariants}
          className="rounded-2xl p-4 sm:p-6 md:p-8 border-2 mb-5 relative overflow-hidden"
          style={{
            background: "var(--surface-alt)",
            borderColor: "var(--border)",
            willChange: "transform",
          }}
          aria-live="polite"
          aria-atomic="true"
        >
          {/* Background gradient accent */}
          <div
            className="absolute inset-0 opacity-5 pointer-events-none"
            style={{
              background: `radial-gradient(circle at 30% 50%, var(--orange), transparent 70%)`,
            }}
            aria-hidden="true"
          />

          <div className="relative z-10">
            {/* Result Display */}
            <div className="mb-6">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <div
                    className="text-xs sm:text-sm uppercase tracking-wide mb-2"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Monthly Revenue Increase
                  </div>
                  <motion.div
                    className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold font-['Poppins']"
                    style={{ color: "var(--orange)" }}
                    key={m.deltaRevenue}
                    initial={!device.isLowEnd ? { scale: 1.1, opacity: 0.5 } : {}}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    {formatINR(m.deltaRevenue)}
                  </motion.div>
                </div>

                {/* Quick stat badge */}
                {device.isDesktop && (
                  <div
                    className="px-4 py-3 rounded-xl border text-center"
                    style={{
                      background: "var(--surface)",
                      borderColor: "var(--border)",
                    }}
                  >
                    <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                      Per year
                    </div>
                    <div className="text-lg font-bold" style={{ color: "var(--text)" }}>
                      {formatINR(annualDelta)}
                    </div>
                  </div>
                )}
              </div>

              {/* Secondary stats */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div
                  className="p-3 sm:p-4 rounded-xl border"
                  style={{
                    background: "var(--surface)",
                    borderColor: "var(--border)",
                  }}
                >
                  <div className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>
                    Extra views/month
                  </div>
                  <div className="text-lg sm:text-xl font-bold" style={{ color: "var(--text)" }}>
                    {formatNumber(m.deltaViews)}
                  </div>
                </div>

                <div
                  className="p-3 sm:p-4 rounded-xl border"
                  style={{
                    background: "var(--surface)",
                    borderColor: "var(--border)",
                  }}
                >
                  <div className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>
                    Growth multiplier
                  </div>
                  <div className="text-lg sm:text-xl font-bold" style={{ color: "var(--text)" }}>
                    {(m.liftMultiplier * 100).toFixed(0)}%
                  </div>
                </div>
              </div>

              {/* Annual projection - Mobile */}
              {!device.isDesktop && (
                <div
                  className="p-3 rounded-xl border text-center"
                  style={{
                    background: "var(--surface)",
                    borderColor: "var(--border)",
                  }}
                >
                  <div className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>
                    Annualized impact
                  </div>
                  <div className="text-xl font-bold" style={{ color: "var(--text)" }}>
                    {formatINR(annualDelta)}
                  </div>
                </div>
              )}
            </div>

            {/* Lift Control - Enhanced Mobile UX */}
            <div className="w-full">
              <div className="flex items-center justify-between mb-3">
                <label
                  className="text-sm sm:text-base font-semibold"
                  style={{ color: "var(--text)" }}
                  htmlFor="lift-slider"
                >
                  Expected CTR Lift
                </label>
                <div className="relative">
                  <input
                    id="lift-input"
                    type="number"
                    value={lift}
                    onChange={(e) => {
                      const val = clamp(Number(e.target.value) || 0, 0, 200);
                      setLift(val);
                      setHasInteracted(true);
                    }}
                    className="w-20 sm:w-24 h-10 sm:h-12 rounded-lg px-2 sm:px-3 text-right text-base sm:text-lg font-bold"
                    style={{
                      background: "var(--surface)",
                      border: "2px solid var(--border)",
                      color: "var(--text)",
                    }}
                    aria-label="Lift exact value"
                  />
                  <span
                    className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 text-sm font-medium"
                    style={{ color: "var(--text-muted)" }}
                  >
                    %
                  </span>
                </div>
              </div>

              {/* Enhanced Slider with better mobile touch */}
              <div className="relative mb-4">
                <input
                  id="lift-slider"
                  type="range"
                  min={0}
                  max={200}
                  step={1}
                  value={lift}
                  onChange={(e) => {
                    setLift(Number(e.target.value));
                    setHasInteracted(true);
                  }}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer lift-slider"
                  style={{
                    background: `linear-gradient(to right, var(--orange) 0%, var(--orange) ${(lift / 200) * 100}%, var(--border) ${(lift / 200) * 100}%, var(--border) 100%)`,
                  }}
                  aria-label="Expected CTR lift percentage"
                />

                {/* Slider markers */}
                <div className="flex justify-between mt-2 px-1">
                  {[0, 50, 100, 150, 200].map((mark) => (
                    <div
                      key={mark}
                      className="text-xs"
                      style={{
                        color: lift >= mark ? "var(--orange)" : "var(--text-muted)",
                        fontWeight: lift === mark ? "bold" : "normal",
                      }}
                    >
                      {mark}%
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick lift presets - Mobile optimized */}
              <div className="flex flex-wrap gap-2">
                {liftPresets.map((p) => (
                  <motion.button
                    key={p}
                    type="button"
                    onClick={() => {
                      setLift(p);
                      setHasInteracted(true);
                    }}
                    className="px-3 sm:px-4 py-2 rounded-full border-2 text-xs sm:text-sm font-semibold transition-all"
                    style={{
                      borderColor: p === lift ? "var(--orange)" : "var(--border)",
                      color: p === lift ? "#fff" : "var(--text)",
                      background: p === lift
                        ? "linear-gradient(135deg, var(--orange), #ff9357)"
                        : "var(--surface)",
                      WebkitTapHighlightColor: "transparent",
                    }}
                    whileTap={{ scale: 0.95 }}
                  >
                    +{p}%
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Visual Comparison - Enhanced */}
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <CompareStatEnhanced
                label="Click-Through Rate"
                icon="Target"
                now={`${ctr.toFixed(1)}%`}
                next={`${m.newCtr.toFixed(1)}%`}
                pct={clamp((m.newCtr || 0) / Math.max(ctr || 0.1, 0.1), 0, 4)}
                prefersReducedMotion={false}
              />
              <CompareStatEnhanced
                label="Views per Video"
                icon="Eye"
                now={formatNumber(m.perNow)}
                next={formatNumber(m.perNew)}
                pct={clamp((m.perNew || 0) / Math.max(m.perNow || 1, 1), 0, 4)}
                prefersReducedMotion={false}
              />
            </div>
          </div>

          {/* Loading indicator */}
          <AnimatePresence>
            {isCalculating && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute top-4 right-4"
                style={{ color: "var(--orange)" }}
              >
                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Core Inputs - Improved Mobile Layout */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4"
          variants={itemVariants}
        >
          <FieldEnhanced
            label="Avg views per video"
            icon="Video"
            value={views}
            onChange={(v) => {
              setViews(intOnly(v));
              setHasInteracted(true);
            }}
            placeholder="10,000"
            type="number"
            isMobile={device.isMobile}
          />
          <FieldEnhanced
            label="Videos per month"
            icon="Calendar"
            value={posts}
            onChange={(v) => {
              setPosts(clamp(intOnly(v), 0, 120));
              setHasInteracted(true);
            }}
            placeholder="8"
            type="number"
            max={120}
            isMobile={device.isMobile}
            helper="Max 120/month"
          />
          <div className="sm:col-span-2 lg:col-span-1">
            <FieldEnhanced
              label="Revenue per 1K views (RPM)"
              icon="DollarSign"
              value={rpm}
              onChange={(v) => {
                setRpm(intOnly(v));
                setHasInteracted(true);
              }}
              placeholder="120"
              type="number"
              prefix="₹"
              isMobile={device.isMobile}
            />
          </div>
        </motion.div>

        {/* Advanced Options - Improved Disclosure */}
        <motion.details
          variants={itemVariants}
          open={openMore}
          onToggle={(e) => setOpenMore(e.currentTarget.open)}
          className="rounded-2xl border-2 mb-4 overflow-hidden"
          style={{
            background: "var(--surface-alt)",
            borderColor: "var(--border)",
          }}
        >
          <summary
            className="cursor-pointer list-none px-4 sm:px-5 py-3 sm:py-4 font-semibold flex items-center justify-between select-none"
            style={{
              color: "var(--text)",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            <span className="flex items-center gap-2 text-sm sm:text-base">
              <Settings size={16} className="inline" /> Advanced Options
              <span
                className="text-xs px-2 py-1 rounded-full"
                style={{
                  background: "var(--surface)",
                  color: "var(--text-muted)",
                }}
              >
                CTR & Impressions
              </span>
            </span>
            <motion.span
              animate={{ rotate: openMore ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="text-xl"
            >
              ▼
            </motion.span>
          </summary>

          <motion.div
            initial={false}
            animate={{
              height: openMore ? "auto" : 0,
              opacity: openMore ? 1 : 0,
            }}
            className="px-4 sm:px-5 pb-4 sm:pb-5"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {/* CTR Input */}
              <div>
                <FieldEnhanced
                  label="Current CTR"
                  icon="Target"
                  value={ctr}
                  onChange={(v) => {
                    setCtr(clamp(decOnly(v), 0.1, 50));
                    setHasInteracted(true);
                  }}
                  placeholder="4.5"
                  step="0.1"
                  min="0.1"
                  max="50"
                  type="number"
                  suffix="%"
                  isMobile={device.isMobile}
                />

                {/* Quick CTR presets */}
                <div className="mt-2 flex flex-wrap gap-2">
                  {[3, 4.5, 6, 8].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        setCtr(c);
                        setHasInteracted(true);
                      }}
                      className="px-2 py-1 rounded-full border text-xs"
                      style={{
                        color: ctr === c ? "var(--orange)" : "var(--text)",
                        borderColor: ctr === c ? "var(--orange)" : "var(--border)",
                        background: ctr === c ? "rgba(232,80,2,0.1)" : "transparent",
                      }}
                    >
                      {c}%
                    </button>
                  ))}
                </div>
              </div>

              {/* CTR Explanation */}
              <div
                className="p-4 rounded-xl border"
                style={{
                  background: "var(--surface)",
                  borderColor: "var(--border)",
                }}
              >
                <div className="text-sm font-medium mb-2" style={{ color: "var(--text)" }}>
                  Typical CTR Ranges
                </div>
                <div className="space-y-1 text-xs" style={{ color: "var(--text-muted)" }}>
                  <div>• 3-6%: Long-form content</div>
                  <div>• 8-12%: Shorts/Reels</div>
                  <div>• 10%+: Highly optimized</div>
                </div>
              </div>

              {/* Advanced: Impressions */}
              <div
                className="p-4 rounded-xl border"
                style={{
                  background: "var(--surface)",
                  borderColor: "var(--border)",
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-medium" style={{ color: "var(--text)" }}>
                    🔬 Use Impressions
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={advanced}
                      onChange={(e) => {
                        setAdvanced(e.target.checked);
                        setHasInteracted(true);
                      }}
                      className="sr-only peer"
                    />
                    <div
                      className="w-11 h-6 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"
                      style={{
                        background: advanced ? "var(--orange)" : "var(--border)",
                      }}
                    />
                  </label>
                </div>

                <fieldset disabled={!advanced} className={!advanced ? "opacity-50" : ""}>
                  <FieldEnhanced
                    label="Impressions/video"
                    value={impressions}
                    onChange={(v) => {
                      setImpressions(intOnly(v));
                      setHasInteracted(true);
                    }}
                    placeholder={String(Math.max(1, Math.round(views / Math.max(ctr / 100, 0.001))))}
                    type="number"
                    isMobile={device.isMobile}
                    disabled={!advanced}
                  />
                </fieldset>
              </div>
            </div>
          </motion.div>
        </motion.details>

        {/* Summary Bar - Mobile Optimized */}
        <motion.div
          variants={itemVariants}
          className="mb-4 p-3 sm:p-4 rounded-xl border"
          style={{
            background: "var(--surface-alt)",
            borderColor: "var(--border)",
          }}
        >
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm">
              <div style={{ color: "var(--text)" }}>
                <b>New CTR:</b> {m.newCtr.toFixed(1)}%
              </div>
              <div className="hidden sm:block" style={{ color: "var(--text-muted)" }}>•</div>
              <div style={{ color: "var(--text)" }}>
                <b>Views/video:</b> {formatNumber(m.perNew)}
              </div>
              <div className="hidden sm:block" style={{ color: "var(--text-muted)" }}>•</div>
              <div style={{ color: "var(--text-muted)" }}>
                {posts} videos/mo · RPM {formatINR(rpm)}
              </div>
            </div>

            <motion.button
              type="button"
              onClick={copySummary}
              className="px-3 sm:px-4 py-2 rounded-full border text-xs sm:text-sm font-medium flex items-center justify-center gap-2"
              style={{
                color: copied ? "var(--orange)" : "var(--text)",
                borderColor: copied ? "var(--orange)" : "var(--border)",
                background: "var(--surface)",
              }}
              whileTap={{ scale: 0.95 }}
            >
              {copied ? (
                <>
                  <span>✓</span>
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <span>📋</span>
                  <span>Copy Summary</span>
                </>
              )}
            </motion.button>
          </div>
        </motion.div>

        {/* CTA Section - Enhanced Mobile */}
        <motion.div
          ref={mainCtaRef}
          variants={itemVariants}
          className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3"
        >
          <motion.button
            onClick={handleBook}
            className="rounded-xl sm:rounded-2xl py-3 sm:py-4 px-6 font-bold text-white text-base sm:text-lg shadow-lg"
            style={{
              background: "linear-gradient(135deg, var(--orange), #ff9357)",
              willChange: "transform",
            }}
            whileHover={!device.isLowEnd ? {
              scale: 1.02,
              boxShadow: "0 12px 24px rgba(232,80,2,0.3)"
            } : {}}
            whileTap={{ scale: 0.98 }}
            aria-label="Book an audit to achieve this uplift"
          >
            <span className="flex items-center justify-center gap-2">
              <Zap size={18} className="inline" />
              <span>Book Strategy Call</span>
              <span>→</span>
            </span>
          </motion.button>

          <motion.button
            type="button"
            onClick={resetCalculator}
            className="rounded-xl sm:rounded-2xl py-3 sm:py-4 px-6 font-semibold text-sm sm:text-base"
            style={{
              color: "var(--text)",
              border: "2px solid var(--border)",
              background: "var(--surface-alt)",
            }}
            whileTap={{ scale: 0.95 }}
          >
            ↺ Reset
          </motion.button>
        </motion.div>

        {/* Disclaimer */}
        <motion.p
          variants={itemVariants}
          className="mt-4 text-xs text-center leading-relaxed px-4"
          style={{ color: "var(--text-muted)" }}
        >
          💡 <b>Note:</b> Estimates based on input values. Actual results vary by niche, content quality,
          audience, and market conditions.
        </motion.p>
      </motion.div>

      {/* Floating Mobile CTA - Coordinated with WhatsApp button */}
      <AnimatePresence>
        {ctaOffscreen && hasInteracted && device.isMobile && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            onAnimationStart={() => {
              // Notify WhatsApp button to hide
              window.dispatchEvent(
                new CustomEvent("roi:cta:visible", { detail: { visible: true } })
              );
            }}
            onAnimationComplete={(definition) => {
              if (definition.opacity === 0) {
                // Notify WhatsApp button it can show again
                window.dispatchEvent(
                  new CustomEvent("roi:cta:visible", { detail: { visible: false } })
                );
              }
            }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 30,
              mass: 0.8
            }}
            className="fixed left-0 right-0 z-45"
            style={{
              bottom: "max(16px, calc(env(safe-area-inset-bottom, 16px) + 8px))",
              paddingLeft: "16px",
              paddingRight: "16px",
            }}
          >
            <motion.div
              className="max-w-md mx-auto rounded-2xl shadow-2xl p-3 flex items-center justify-between gap-3"
              style={{
                background: "var(--surface)",
                border: "2px solid var(--orange)",
                boxShadow: "0 12px 40px rgba(232,80,2,0.35), 0 0 0 1px rgba(255,255,255,0.1)",
                willChange: "transform",
                transform: "translate3d(0, 0, 0)",
                WebkitTransform: "translate3d(0, 0, 0)",
                WebkitTapHighlightColor: "transparent",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
              }}
              whileHover={!device.isLowEnd ? { scale: 1.02 } : {}}
            >
              <div className="min-w-0 flex-1">
                <div className="text-[10px] uppercase tracking-wide mb-1" style={{ color: "var(--text-muted)" }}>
                  Monthly Potential
                </div>
                <div className="text-lg font-bold leading-tight" style={{ color: "var(--orange)" }}>
                  {formatINR(m.deltaRevenue)}
                </div>
              </div>

              <motion.button
                onClick={handleBook}
                className="shrink-0 rounded-xl px-4 py-2.5 text-sm font-bold text-white shadow-lg"
                style={{
                  background: "linear-gradient(135deg, var(--orange), #ff9357)",
                  willChange: "transform",
                  transform: "translate3d(0, 0, 0)",
                  WebkitTransform: "translate3d(0, 0, 0)",
                }}
                whileTap={{ scale: 0.95 }}
                aria-label="Book strategy call"
              >
                Book Call →
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Enhanced Slider Styles */}
      <style>{`
        /* Custom range slider - iOS-optimized */
        .lift-slider {
          -webkit-appearance: none;
          appearance: none;
        }
        
        .lift-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: var(--orange);
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(232,80,2,0.4);
          transition: transform 0.2s, box-shadow 0.2s;
        }
        
        .lift-slider::-webkit-slider-thumb:hover {
          transform: scale(1.15);
          box-shadow: 0 4px 12px rgba(232,80,2,0.6);
        }
        
        .lift-slider::-webkit-slider-thumb:active {
          transform: scale(1.05);
        }
        
        .lift-slider::-moz-range-thumb {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: var(--orange);
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 8px rgba(232,80,2,0.4);
          transition: transform 0.2s, box-shadow 0.2s;
        }
        
        .lift-slider::-moz-range-thumb:hover {
          transform: scale(1.15);
          box-shadow: 0 4px 12px rgba(232,80,2,0.6);
        }
        
        /* Mobile touch optimization */
        @media (max-width: 640px) {
          .lift-slider::-webkit-slider-thumb {
            width: 28px;
            height: 28px;
          }
          
          .lift-slider::-moz-range-thumb {
            width: 28px;
            height: 28px;
          }
        }
        
        /* Smooth animations with hardware acceleration */
        @media (prefers-reduced-motion: no-preference) {
          * {
            transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
          }
        }
        
        /* Low-end device optimizations */
        @media (max-width: 640px) and (prefers-reduced-motion: reduce) {
          * {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>
    </section>
  );
}

/* ---------- Enhanced Field Component ---------- */
function FieldEnhanced({
  label,
  icon,
  value,
  onChange,
  placeholder,
  type = "text",
  step,
  min,
  max,
  prefix,
  suffix,
  helper,
  disabled,
  isMobile,
}) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div
      className="rounded-xl sm:rounded-2xl p-3 sm:p-4 border-2 transition-all"
      style={{
        background: disabled ? "var(--surface)" : "var(--surface-alt)",
        borderColor: isFocused ? "var(--orange)" : "var(--border)",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <label className="block text-xs sm:text-sm font-medium mb-2 flex items-center gap-2" style={{ color: "var(--text)" }}>
        {icon && <span>{icon}</span>}
        <span>{label}</span>
        {helper && (
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            ({helper})
          </span>
        )}
      </label>
      <div className="relative">
        {prefix && (
          <span
            className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium"
            style={{ color: "var(--text-muted)" }}
          >
            {prefix}
          </span>
        )}
        <input
          type={type}
          inputMode={type === "number" ? "numeric" : undefined}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          step={step}
          min={min}
          max={max}
          disabled={disabled}
          className="w-full h-11 sm:h-12 rounded-lg px-3 outline-none text-base sm:text-lg font-semibold"
          style={{
            paddingLeft: prefix ? "2rem" : undefined,
            paddingRight: suffix ? "2rem" : undefined,
            background: "var(--surface)",
            border: "1px solid var(--border)",
            color: "var(--text)",
            WebkitAppearance: "none",
          }}
        />
        {suffix && (
          <span
            className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium"
            style={{ color: "var(--text-muted)" }}
          >
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

/* ---------- Enhanced Comparison Component ---------- */
function CompareStatEnhanced({ label, icon, now, next, pct }) {
  const pctClamped = clamp((pct || 0) * 25, 0, 100);
  const nowWidth = clamp(100 / Math.max(pct || 1, 1), 15, 100);

  return (
    <div
      className="rounded-xl sm:rounded-2xl p-3 sm:p-4 border-2"
      style={{
        background: "var(--surface)",
        borderColor: "var(--border)",
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs sm:text-sm font-semibold flex items-center gap-2" style={{ color: "var(--text)" }}>
          <span>{icon}</span>
          <span>{label}</span>
        </div>
        <div className="text-xs px-2 py-1 rounded-full" style={{
          background: "rgba(232,80,2,0.1)",
          color: "var(--orange)"
        }}>
          {((pct - 1) * 100).toFixed(0)}% ↑
        </div>
      </div>

      <div className="space-y-2">
        <BarEnhanced label={now} widthPct={nowWidth} muted />
        <BarEnhanced label={next} widthPct={pctClamped} highlight />
      </div>
    </div>
  );
}

function BarEnhanced({ label, widthPct, highlight, muted }) {
  return (
    <div
      className="w-full h-10 sm:h-12 rounded-lg overflow-hidden border-2"
      style={{ borderColor: "var(--border)" }}
    >
      <motion.div
        className="h-full flex items-center justify-between px-3 whitespace-nowrap"
        initial={{ width: 0 }}
        animate={{ width: `${clamp(widthPct, 10, 100)}%` }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        style={{
          background: highlight
            ? "linear-gradient(135deg, var(--orange), #ff9357)"
            : "var(--surface-alt)",
          color: highlight ? "#fff" : "var(--text)",
        }}
      >
        <span className="text-xs sm:text-sm font-bold">{label}</span>
      </motion.div>
    </div>
  );
}