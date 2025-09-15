import React, { useMemo, useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

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
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const intOnly = (s) => Math.max(0, Number(String(s).replace(/[^0-9]/g, "")) || 0);
const decOnly = (s) => {
  const v = Number(String(s).replace(/[^0-9.]/g, ""));
  return Number.isFinite(v) ? v : 0;
};

/**
 * ROI / CTR Uplift Calculator (mobile-first, high-conversion)
 * Props:
 *  - onBook: () => void
 *  - defaults?: { views, posts, ctr, lift, rpm }
 */
export default function RoiCalculator({
  onBook,
  defaults = { views: 10000, posts: 8, ctr: 4.5, lift: 30, rpm: 120 },
}) {
  // minimal inputs shown upfront
  const [views, setViews] = useState(defaults.views); // avg views / video
  const [posts, setPosts] = useState(defaults.posts); // videos / month
  const [lift, setLift] = useState(defaults.lift); // %

  // “More options”
  const [openMore, setOpenMore] = useState(false);
  const [ctr, setCtr] = useState(defaults.ctr); // %
  const [rpm, setRpm] = useState(defaults.rpm); // ₹ / 1000 views

  // Advanced (impressions × CTR)
  const [advanced, setAdvanced] = useState(false);
  const [impressions, setImpressions] = useState(() =>
    Math.round((defaults.views || 0) / Math.max((defaults.ctr || 0.1) / 100, 0.001))
  );

  // sticky mobile CTA (shows when main CTA is offscreen)
  const mainCtaRef = useRef(null);
  const [ctaOffscreen, setCtaOffscreen] = useState(false);

  useEffect(() => {
    if (!advanced && (views || 0) && (ctr || 0)) {
      // keep impressions roughly in sync when not in advanced mode
      setImpressions(Math.round((views || 0) / Math.max(ctr / 100, 0.001)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [views, ctr]);

  useEffect(() => {
    if (advanced && !impressions) {
      setImpressions(Math.round((views || 0) / Math.max(ctr / 100, 0.001)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [advanced]);

  useEffect(() => {
    const el = mainCtaRef.current;
    if (!el || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(
      (ents) => {
        const e = ents[0];
        setCtaOffscreen(!e.isIntersecting);
      },
      { threshold: 0.01 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  /* ---------- Quick presets (based on typical YT ranges) ---------- */
  const stagePresets = [
    { label: "Starter", views: 5000, posts: 4, ctr: 3.5, rpm: 80 },
    { label: "Growing", views: 10000, posts: 8, ctr: 4.5, rpm: 120 },
    { label: "Established", views: 25000, posts: 12, ctr: 5.5, rpm: 180 },
  ];
  const liftPresets = [10, 25, 50, 100]; // simple, clear marks

  /* ---------- Model ---------- */
  const m = useMemo(() => {
    const n = clamp(Number(posts) || 0, 0, 120);
    const C = clamp(Number(ctr) || 0, 0.1, 50);
    const L = clamp(Number(lift) || 0, 0, 200);
    const R = Math.max(0, Number(rpm) || 0);

    let basePerVideo, nextPerVideo, newCtr = C * (1 + L / 100);

    if (advanced) {
      const I = Math.max(0, Number(impressions) || 0);
      basePerVideo = I * (C / 100);
      nextPerVideo = I * (newCtr / 100);
    } else {
      basePerVideo = Math.max(0, Number(views) || 0);
      nextPerVideo = basePerVideo * (1 + L / 100);
    }

    const monthNow = basePerVideo * n;
    const monthNew = nextPerVideo * n;
    const revNow = (monthNow / 1000) * R;
    const revNew = (monthNew / 1000) * R;

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
    };
  }, [views, posts, ctr, lift, rpm, advanced, impressions]);

  const annualDelta = m.deltaRevenue * 12;

  const handleBook = () => {
    try {
      window.dispatchEvent(
        new CustomEvent("analytics", {
          detail: {
            ev: "calc_cta_click",
            views,
            posts,
            ctr,
            lift,
            rpm,
            advanced,
            impressions,
            deltaRevenue: Math.round(m.deltaRevenue),
          },
        })
      );
    } catch {}
    onBook?.();
  };

  const copySummary = async () => {
    const text = [
      `CTR Uplift Estimate`,
      `Current CTR: ${ctr}%`,
      `Expected CTR lift: +${lift}% → New CTR ≈ ${m.newCtr.toFixed(1)}%`,
      `Avg views/video: ${Math.round(views).toLocaleString("en-IN")} • Posts/month: ${posts}`,
      `RPM: ${formatINR(rpm)} • Extra views/month: ${Math.round(m.deltaViews).toLocaleString("en-IN")}`,
      `Δ Revenue (monthly): ${formatINR(m.deltaRevenue)}`,
      `Δ Revenue (annualized): ${formatINR(annualDelta)}`,
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
    } catch {}
  };

  return (
    <section
      aria-labelledby="roi-heading"
      className="py-12 md:py-14"
      style={{ background: "var(--surface)" }}
    >
      <div className="container mx-auto px-4 max-w-5xl">
        {/* Header */}
        <div className="text-center mb-6">
          <h2
            id="roi-heading"
            className="text-2xl md:text-4xl font-bold font-['Poppins'] tracking-tight"
            style={{ color: "var(--text)" }}
          >
            What a higher CTR could be worth each month
          </h2>
          <p className="mt-2 text-sm md:text-base" style={{ color: "var(--text-muted)" }}>
            Plug in your current numbers. We’ll estimate uplift based on CTR improvement and RPM.
          </p>
        </div>

        {/* Top card: single, obvious result */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-5 md:p-6 border mb-5"
          style={{ background: "var(--surface-alt)", borderColor: "var(--border)" }}
          aria-live="polite"
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
                Potential uplift
              </div>
              <div className="text-3xl md:text-4xl font-bold font-['Poppins']" style={{ color: "var(--text)" }}>
                {formatINR(m.deltaRevenue)} / mo
              </div>
              <div className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
                ≈ {Math.round(m.deltaViews).toLocaleString("en-IN")} extra views / month
              </div>
              <div className="text-xs mt-2 md:mt-3" style={{ color: "var(--text-muted)" }}>
                Annualized impact: <b style={{ color: "var(--text)" }}>{formatINR(annualDelta)}</b>
              </div>
            </div>

            {/* Lift slider (only control always visible) */}
            <div className="w-full md:max-w-[480px]">
              <label className="block text-sm mb-1" style={{ color: "var(--text)" }}>
                Expected CTR lift
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={0}
                  max={150}
                  step={1}
                  value={lift}
                  onChange={(e) => setLift(Number(e.target.value))}
                  className="w-full"
                  aria-label="Expected CTR lift percentage"
                />
                <div className="relative">
                  <input
                    type="number"
                    value={lift}
                    onChange={(e) => setLift(clamp(Number(e.target.value) || 0, 0, 150))}
                    className="w-20 h-[42px] rounded-lg px-2 text-right"
                    style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
                    aria-label="Lift exact value"
                  />
                  <span
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-xs"
                    style={{ color: "var(--text-muted)" }}
                  >
                    %
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {liftPresets.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setLift(p)}
                    className="text-[11px] px-2 py-1 rounded-full border"
                    style={{
                      borderColor: p === lift ? "var(--orange)" : "var(--border)",
                      color: p === lift ? "var(--orange)" : "var(--text-muted)",
                      background: p === lift ? "rgba(232,80,2,.10)" : "transparent",
                    }}
                  >
                    +{p}%
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Compact visual comparison */}
          <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-3">
            <CompareStat
              label="CTR"
              now={`${ctr.toFixed(1)}%`}
              next={`${m.newCtr.toFixed(1)}%`}
              pct={clamp((m.newCtr || 0) / Math.max(ctr || 0.1, 0.1), 0, 4)}
            />
            <CompareStat
              label="Per-video views"
              now={Math.round(m.perNow).toLocaleString("en-IN")}
              next={Math.round(m.perNew).toLocaleString("en-IN")}
              pct={clamp((m.perNew || 0) / Math.max(m.perNow || 1, 1), 0, 4)}
            />
          </div>
        </motion.div>

        {/* Minimal inputs row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-2">
          <Field
            label="Avg views / video"
            value={views}
            onChange={(v) => setViews(intOnly(v))}
            placeholder="10,000"
            type="number"
          />
          <Field
            label="Videos / month"
            value={posts}
            onChange={(v) => setPosts(clamp(intOnly(v), 0, 120))}
            placeholder="8"
            type="number"
          />

          {/* Quick channel-size presets */}
          <div
            className="rounded-2xl p-4 border"
            style={{ background: "var(--surface-alt)", borderColor: "var(--border)" }}
          >
            <div className="block text-sm mb-2" style={{ color: "var(--text)" }}>
              Prefill (typical YouTube ranges)
            </div>
            <div className="flex flex-wrap gap-2">
              {stagePresets.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => {
                    setViews(p.views);
                    setPosts(p.posts);
                    setCtr(p.ctr);
                    setRpm(p.rpm);
                    setImpressions(Math.round(p.views / Math.max(p.ctr / 100, 0.001)));
                  }}
                  className="px-3 py-2 rounded-full border text-sm"
                  style={{ color: "var(--text)", borderColor: "var(--border)", background: "var(--surface)" }}
                  aria-label={`Use ${p.label} preset`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* “More options” drawer */}
        <details
          open={openMore}
          onToggle={(e) => setOpenMore(e.currentTarget.open)}
          className="rounded-2xl border"
          style={{ background: "var(--surface-alt)", borderColor: "var(--border)" }}
        >
          <summary
            className="cursor-pointer list-none px-4 py-3 font-medium flex items-center justify-between"
            style={{ color: "var(--text)" }}
          >
            More options
            <span
              className="text-xs rounded-full px-2 py-1 border"
              style={{ color: "var(--text-muted)", borderColor: "var(--border)", background: "var(--surface)" }}
            >
              CTR, RPM & Advanced
            </span>
          </summary>

          <div className="px-4 pb-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <Field
                label="Current CTR (%)"
                value={ctr}
                onChange={(v) => setCtr(clamp(decOnly(v), 0.1, 50))}
                placeholder="4.5"
                step="0.1"
                min="0.1"
                max="50"
                type="number"
                suffix="%"
              />
              <Field
                label="RPM (₹ per 1,000 views)"
                value={rpm}
                onChange={(v) => setRpm(intOnly(v))}
                placeholder="120"
                type="number"
                prefix="₹"
              />
              <div
                className="rounded-2xl p-4 border"
                style={{ background: "var(--surface)", borderColor: "var(--border)" }}
              >
                <div className="text-sm mb-2" style={{ color: "var(--text)" }}>
                  Quick CTR
                </div>
                <div className="flex flex-wrap gap-2">
                  {[3, 4.5, 6].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCtr(c)}
                      className="px-3 py-1.5 rounded-full border text-sm"
                      style={{ color: "var(--text)", borderColor: "var(--border)" }}
                    >
                      {c}%
                    </button>
                  ))}
                </div>
                <div className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
                  Many channels sit ~3–6% on long-form; shorts vary.
                </div>
              </div>

              <div
                className="rounded-2xl p-4 border"
                style={{ background: "var(--surface)", borderColor: "var(--border)" }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium" style={{ color: "var(--text)" }}>
                    Advanced: use impressions
                  </div>
                  <label className="inline-flex items-center gap-2 text-sm" style={{ color: "var(--text)" }}>
                    <input
                      type="checkbox"
                      checked={advanced}
                      onChange={(e) => setAdvanced(e.target.checked)}
                    />
                    Enable
                  </label>
                </div>
                <fieldset disabled={!advanced} aria-disabled={!advanced} className={!advanced ? "opacity-60" : ""}>
                  <Field
                    label="Impressions / video"
                    value={impressions}
                    onChange={(v) => setImpressions(intOnly(v))}
                    placeholder={String(Math.max(1, Math.round(views / Math.max(ctr / 100, 0.001))))}
                    type="number"
                  />
                </fieldset>
              </div>
            </div>
          </div>
        </details>

        {/* Tiny summary strip */}
        <div className="mt-4 flex flex-col md:flex-row gap-2 md:items-center md:justify-between">
          <div className="text-sm" style={{ color: "var(--text)" }}>
            <b>New CTR:</b> {m.newCtr.toFixed(1)}% &nbsp;|&nbsp; <b>Per-video views:</b>{" "}
            {Math.round(m.perNew).toLocaleString("en-IN")}{" "}
            <span style={{ color: "var(--text-muted)" }}>
              (from {Math.round(m.perNow).toLocaleString("en-IN")})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm" style={{ color: "var(--text-muted)" }}>
              {posts} videos / month • RPM {formatINR(rpm)}
            </span>
            <button
              type="button"
              onClick={copySummary}
              className="text-xs px-3 py-1.5 rounded-full border"
              style={{ color: "var(--text)", borderColor: "var(--border)", background: "var(--surface-alt)" }}
            >
              Copy summary
            </button>
          </div>
        </div>

        {/* CTA */}
        <div ref={mainCtaRef} className="mt-6 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3">
          <motion.button
            onClick={handleBook}
            className="rounded-xl py-3 font-semibold text-white"
            style={{ background: "linear-gradient(90deg, var(--orange), #ff9357)" }}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            aria-label="Book an audit to see how we’d reach this uplift"
          >
            See how we’d reach this → Book audit
          </motion.button>

          <button
            type="button"
            onClick={() => {
              setViews(defaults.views);
              setPosts(defaults.posts);
              setCtr(defaults.ctr);
              setLift(defaults.lift);
              setRpm(defaults.rpm);
              setImpressions(
                Math.round((defaults.views || 0) / Math.max((defaults.ctr || 0.1) / 100, 0.001))
              );
              setAdvanced(false);
              setOpenMore(false);
            }}
            className="rounded-xl py-3 font-semibold"
            style={{ color: "var(--text)", border: "1px solid var(--border)", background: "var(--surface-alt)" }}
          >
            Reset
          </button>
        </div>

        {/* Footnote */}
        <p className="mt-3 text-xs text-center" style={{ color: "var(--text-muted)" }}>
          Estimates only. Actuals vary by topic, metadata, audience mix, and seasonality.
        </p>
      </div>

      {/* Sticky mobile CTA (appears when main CTA is offscreen) */}
      <AnimatePresence>
        {ctaOffscreen && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="fixed md:hidden left-0 right-0"
            style={{
              bottom: "max(12px, env(safe-area-inset-bottom))",
              zIndex: 40,
            }}
            aria-live="polite"
          >
            <div
              className="mx-3 rounded-2xl shadow-xl border px-4 py-3 flex items-center justify-between gap-3"
              style={{ background: "var(--surface-alt)", borderColor: "var(--border)" }}
            >
              <div className="min-w-0">
                <div className="text-[11px] uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
                  Potential uplift
                </div>
                <div className="text-lg font-bold" style={{ color: "var(--text)" }}>
                  {formatINR(m.deltaRevenue)} / mo
                </div>
              </div>
              <button
                onClick={handleBook}
                className="shrink-0 rounded-full px-4 py-2 text-sm font-semibold text-white"
                style={{ background: "linear-gradient(90deg, var(--orange), #ff9357)" }}
              >
                Book audit
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

/* ---------- Reusable Field ---------- */
function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  step,
  min,
  max,
  prefix,
  suffix,
}) {
  return (
    <div
      className="rounded-2xl p-4 border"
      style={{ background: "var(--surface-alt)", borderColor: "var(--border)" }}
    >
      <label className="block text-sm mb-1" style={{ color: "var(--text)" }}>
        {label}
      </label>
      <div className="relative">
        {prefix && (
          <span
            className="absolute left-2 top-1/2 -translate-y-1/2 text-sm"
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
          placeholder={placeholder}
          step={step}
          min={min}
          max={max}
          className="w-full h-[44px] rounded-lg px-3 outline-none"
          style={{
            paddingLeft: prefix ? "1.6rem" : undefined,
            paddingRight: suffix ? "1.6rem" : undefined,
            background: "var(--surface)",
            border: "1px solid var(--border)",
            color: "var(--text)",
          }}
        />
        {suffix && (
          <span
            className="absolute right-2 top-1/2 -translate-y-1/2 text-sm"
            style={{ color: "var(--text-muted)" }}
          >
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

/* ---------- Compact comparison bar ---------- */
function CompareStat({ label, now, next, pct }) {
  const pctClamped = clamp((pct || 0) * 25, 0, 100); // map 0–4× to 0–100%
  const nowWidth = clamp(100 / Math.max(pct || 1, 1), 10, 100); // ensure visible
  return (
    <div
      className="rounded-2xl p-4 border"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-medium" style={{ color: "var(--text)" }}>
          {label}
        </div>
        <div className="text-xs" style={{ color: "var(--text-muted)" }}>
          Now → With lift
        </div>
      </div>
      <div className="space-y-2">
        <Bar label={now} widthPct={nowWidth} muted />
        <Bar label={next} widthPct={pctClamped} highlight />
      </div>
    </div>
  );
}

function Bar({ label, widthPct, highlight, muted }) {
  return (
    <div className="w-full h-8 rounded-xl overflow-hidden border" style={{ borderColor: "var(--border)" }}>
      <div
        className="h-full flex items-center justify-between px-3 whitespace-nowrap"
        style={{
          width: `${clamp(widthPct, 8, 100)}%`,
          background: highlight
            ? "linear-gradient(90deg, var(--orange), #ff9357)"
            : "color-mix(in oklab, var(--surface-alt) 90%, transparent)",
          color: highlight ? "#fff" : "var(--text)",
          transition: "width .35s ease",
        }}
      >
        <span className="text-xs font-semibold">{label}</span>
      </div>
    </div>
  );
}
