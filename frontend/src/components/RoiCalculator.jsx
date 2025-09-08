import React, { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";

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
 * Cleaner, high-conversion CTR lift calculator
 * Props:
 *  - onBook: () => void
 */
export default function RoiCalculator({
  onBook,
  defaults = { views: 10000, posts: 8, ctr: 4.5, lift: 30, rpm: 120 },
}) {
  // minimal inputs shown upfront
  const [views, setViews] = useState(defaults.views); // avg views / video
  const [posts, setPosts] = useState(defaults.posts); // videos / month
  const [lift, setLift] = useState(defaults.lift);    // %

  // “More options”
  const [openMore, setOpenMore] = useState(false);
  const [ctr, setCtr] = useState(defaults.ctr);       // %
  const [rpm, setRpm] = useState(defaults.rpm);       // ₹ / 1000 views

  // Advanced (impressions × CTR)
  const [advanced, setAdvanced] = useState(false);
  const [impressions, setImpressions] = useState(() =>
    Math.round((defaults.views || 0) / Math.max((defaults.ctr || 0.1) / 100, 0.001))
  );
  useEffect(() => {
    if (advanced && !impressions) {
      setImpressions(Math.round((views || 0) / Math.max(ctr / 100, 0.001)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [advanced]);

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

  return (
    <section
      aria-labelledby="roi-heading"
      className="py-14"
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
            Simple estimate using your current numbers. RPM varies by niche; impressions assumed similar.
          </p>
        </div>

        {/* Top card: single, obvious result */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-5 md:p-6 border mb-5"
          style={{ background: "var(--surface-alt)", borderColor: "var(--border)" }}
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
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
            </div>

            {/* Lift slider (only control always visible) */}
            <div className="w-full md:max-w-[420px]">
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
                <input
                  type="number"
                  value={lift}
                  onChange={(e) => setLift(clamp(Number(e.target.value) || 0, 0, 150))}
                  className="w-20 h-[42px] rounded-lg px-2 text-right"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
                  aria-label="Lift exact value"
                />
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {liftPresets.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setLift(p)}
                    className="text-[11px] px-2 py-0.5 rounded border"
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
              />
              <Field
                label="RPM (₹ per 1,000 views)"
                value={rpm}
                onChange={(v) => setRpm(intOnly(v))}
                placeholder="120"
                type="number"
              />
              <div className="rounded-2xl p-4 border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                <div className="text-sm mb-2" style={{ color: "var(--text)" }}>Quick CTR</div>
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

              <div className="rounded-2xl p-4 border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
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

        {/* Tiny summary strip (keeps context without clutter) */}
        <div className="mt-4 text-center md:text-left text-sm flex flex-col md:flex-row gap-2 md:items-center md:justify-between">
          <div style={{ color: "var(--text)" }}>
            <b>New CTR:</b> {m.newCtr.toFixed(1)}% &nbsp;|&nbsp; <b>Per-video views:</b>{" "}
            {Math.round(m.perNew).toLocaleString("en-IN")}{" "}
            <span style={{ color: "var(--text-muted)" }}>
              (from {Math.round(m.perNow).toLocaleString("en-IN")})
            </span>
          </div>
          <div style={{ color: "var(--text-muted)" }}>
            {posts} videos / month • RPM {formatINR(rpm)}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3">
          <motion.button
            onClick={() => {
              try {
                window.dispatchEvent(
                  new CustomEvent("analytics", {
                    detail: {
                      ev: "calc_cta_click",
                      views, posts, ctr, lift, rpm, advanced, impressions,
                      deltaRevenue: Math.round(m.deltaRevenue),
                    },
                  })
                );
              } catch {}
              onBook?.();
            }}
            className="rounded-xl py-3 font-semibold text-white"
            style={{ background: "linear-gradient(90deg, var(--orange), #ff9357)" }}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
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
              setImpressions(Math.round((defaults.views || 0) / Math.max((defaults.ctr || 0.1) / 100, 0.001)));
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
    </section>
  );
}

/* ---------- Reusable Field ---------- */
function Field({ label, value, onChange, placeholder, type = "text", step, min, max }) {
  return (
    <div
      className="rounded-2xl p-4 border"
      style={{ background: "var(--surface-alt)", borderColor: "var(--border)" }}
    >
      <label className="block text-sm mb-1" style={{ color: "var(--text)" }}>
        {label}
      </label>
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
        style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
      />
    </div>
  );
}