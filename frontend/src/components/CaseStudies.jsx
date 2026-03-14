import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart3, X } from "lucide-react";
import { useGlobalConfig } from "../context/GlobalConfigContext";
import { findAssetByBase } from "./ShinelStudiosHomepage";

/* ===================== Enhanced Case Studies (metric-first) ===================== */
const CaseStudies = () => {
  const reduceMotion = false;

  const MEDIA = import.meta.glob("../assets/*.{png,jpg,jpeg,webp,avif,mp4,webm}", {
    eager: true,
    query: "?url",
    import: "default"
  });

  const [open, setOpen] = useState(null);
  const [hoveredCard, setHoveredCard] = useState(null);

  const DEFAULT_CASE_STUDIES = [
    {
      metric: "+62% CTR",
      metricNum: 62,
      period: "in 6 weeks",
      title: "Packaging revamp for Kamz Inkzone",
      description: "Complete thumbnail redesign with A/B testing framework",
      category: "Thumbnails",
      gradient: "linear-gradient(135deg, #E85002, #C10801)",
      keys: { hook: "creator3", edit: "creator3", thumb: "creator3" },
      highlights: [
        "15 design iterations tested",
        "Color psychology optimization",
        "Face + emotion focus",
        "Platform-specific formats"
      ],
    },
    {
      metric: "+38% retention",
      metricNum: 38,
      period: "in 4 weeks",
      title: "Hook-first strategy for Manav Sukhija",
      description: "Restructured content opening for immediate engagement",
      category: "Editing",
      gradient: "linear-gradient(135deg, #F16001, #E85002)",
      keys: { hook: "creator4", edit: "creator4", thumb: "creator4" },
      highlights: [
        "First 3s hook optimization",
        "Pattern interrupt technique",
        "Pacing analysis",
        "Music sync timing"
      ],
    },
    {
      metric: "3.1x views",
      metricNum: 210,
      period: "in 8 weeks",
      title: "Growth alignment for Deadlox Gaming",
      description: "Systematic content strategy with consistent posting schedule",
      category: "Strategy",
      gradient: "linear-gradient(135deg, #E85002, #F16001)",
      keys: { hook: "base2", edit: "base2", thumb: "base2" },
      highlights: [
        "Title-thumbnail consistency",
        "Upload schedule optimization",
        "SEO keyword integration",
        "Cross-platform distribution"
      ],
    },
  ];

  const { config } = useGlobalConfig();

  const caseStudies = useMemo(() => {
    return (config?.caseStudies && config.caseStudies.length > 0)
      ? config.caseStudies
      : DEFAULT_CASE_STUDIES;
  }, [config.caseStudies]);

  const items = caseStudies.map((it) => {
    const hook = findAssetByBase(it.keys.hook, MEDIA);
    const edit = findAssetByBase(it.keys.edit, MEDIA);
    const thumb = findAssetByBase(it.keys.thumb, MEDIA);
    return { ...it, media: { hook, edit, thumb } };
  });

  return (
    <section
      id="work"
      className="py-20 relative overflow-hidden"
      style={{
        background: "var(--surface)",
        contentVisibility: "auto",
        containIntrinsicSize: "600px"
      }}
    >
      {/* Background decoration */}
      {!reduceMotion && (
        <>
          <div
            className="absolute top-20 right-10 w-80 h-80 rounded-full opacity-10 blur-3xl pointer-events-none"
            style={{
              background: "radial-gradient(circle, var(--orange), transparent 60%)",
            }}
            aria-hidden="true"
          />
          <div
            className="absolute bottom-20 left-10 w-80 h-80 rounded-full opacity-10 blur-3xl pointer-events-none"
            style={{
              background: "radial-gradient(circle, #C10801, transparent 60%)",
            }}
            aria-hidden="true"
          />
        </>
      )}

      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <motion.div
          className="text-center mb-12"
          initial={reduceMotion ? {} : { opacity: 0, y: 20 }}
          whileInView={reduceMotion ? {} : { opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <motion.div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold mb-4"
            style={{
              color: "var(--orange)",
              border: "1px solid var(--border)",
              background: "rgba(232,80,2,0.08)",
              boxShadow: "0 4px 12px rgba(232,80,2,0.1)",
            }}
            whileHover={reduceMotion ? {} : { scale: 1.05, y: -2 }}
          >
            <BarChart3 size={14} />
            Case Studies
          </motion.div>

          <h2
            className="text-3xl md:text-5xl font-bold font-heading mb-3"
            style={{ color: "var(--text)" }}
          >
            Recent Wins
          </h2>
          <p
            className="text-base md:text-lg max-w-2xl mx-auto"
            style={{ color: "var(--text-muted)" }}
          >
            Outcome first. Click any card to see the complete breakdown.
          </p>
        </motion.div>

        {/* Case study cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {items.map((it, i) => {
            const isHovered = hoveredCard === i;
            return (
              <motion.article
                key={i}
                className="group relative rounded-2xl border overflow-hidden cursor-pointer"
                style={{
                  background: "var(--surface-alt)",
                  borderColor: isHovered ? "var(--orange)" : "var(--border)",
                  boxShadow: isHovered
                    ? "0 20px 40px rgba(232,80,2,0.15)"
                    : "0 8px 20px rgba(0,0,0,.08)",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                }}
                initial={reduceMotion ? {} : { opacity: 0, y: 20 }}
                whileInView={reduceMotion ? {} : { opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                whileHover={reduceMotion ? {} : { y: -8 }}
                onClick={() => setOpen(i)}
                onMouseEnter={() => setHoveredCard(i)}
                onMouseLeave={() => setHoveredCard(null)}
              >
                {/* Thumbnail */}
                <div className="aspect-[16/9] relative overflow-hidden">
                  {it.media.thumb ? (
                    <motion.img
                      src={it.media.thumb}
                      alt={it.title}
                      width="400"
                      height="225"
                      className="absolute inset-0 w-full h-full object-cover"
                      loading="lazy"
                      decoding="async"
                      whileHover={reduceMotion ? {} : { scale: 1.05 }}
                      transition={{ duration: 0.4 }}
                    />
                  ) : (
                    <div
                      className="absolute inset-0"
                      style={{ background: "linear-gradient(135deg, #2c3e50, #34495e)" }}
                    />
                  )}

                  {/* Gradient overlay */}
                  <div
                    className="absolute inset-0"
                    style={{
                      background: "linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 50%)",
                    }}
                    aria-hidden="true"
                  />

                  {/* Metric badge */}
                  <motion.div
                    className="absolute top-3 left-3 rounded-full text-xs font-bold px-3 py-1.5"
                    style={{
                      background: "rgba(0,0,0,.75)",
                      color: "#fff",
                      backdropFilter: "blur(8px)",
                      WebkitBackdropFilter: "blur(8px)",
                      border: "1px solid rgba(255,255,255,.2)",
                    }}
                    whileHover={reduceMotion ? {} : { scale: 1.05 }}
                  >
                    {it.metric} <span style={{ opacity: 0.7 }}>({it.period})</span>
                  </motion.div>

                  {/* Category pill */}
                  <div
                    className="absolute top-3 right-3 text-[10px] font-semibold px-2.5 py-1 rounded-full"
                    style={{
                      background: it.gradient,
                      color: "#fff",
                    }}
                  >
                    {it.category}
                  </div>

                  {/* Play icon overlay */}
                  <motion.div
                    className="absolute inset-0 flex items-center justify-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: isHovered ? 1 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div
                      className="w-14 h-14 rounded-full flex items-center justify-center"
                      style={{
                        background: "rgba(232,80,2,0.9)",
                        backdropFilter: "blur(8px)",
                        WebkitBackdropFilter: "blur(8px)",
                      }}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </motion.div>
                </div>

                {/* Content */}
                <div className="p-5">
                  <h3
                    className="text-lg font-bold mb-2 font-heading"
                    style={{ color: "var(--text)" }}
                  >
                    {it.title}
                  </h3>

                  <p
                    className="text-sm mb-3"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {it.description}
                  </p>

                  {/* Deliverables */}
                  <div className="flex items-center gap-2 text-xs mb-4" style={{ color: "var(--text-muted)" }}>
                    <span className="font-medium" style={{ color: "var(--text)" }}>Delivered:</span>
                    <span>Hook • Edit • Thumbnail</span>
                  </div>

                  {/* View details CTA */}
                  <motion.div
                    className="flex items-center gap-2 text-sm font-semibold"
                    style={{ color: "var(--orange)" }}
                    aria-label={`View breakdown for ${it.title}`}
                    animate={isHovered && !reduceMotion ? { x: [0, 4, 0] } : {}}
                    transition={{ duration: 1, repeat: Infinity }}
                  >
                    View breakdown
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M5 12h14M12 5l7 7-7 7"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </motion.div>
                </div>

                {/* Hover gradient accent */}
                {!reduceMotion && (
                  <motion.div
                    className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100"
                    style={{
                      background: it.gradient,
                      mixBlendMode: "overlay",
                    }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: isHovered ? 0.1 : 0 }}
                    transition={{ duration: 0.3 }}
                    aria-hidden="true"
                  />
                )}
              </motion.article>
            );
          })}
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {open != null && (
          <motion.div
            className="fixed inset-0 z-50 grid place-items-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ background: "rgba(0,0,0,.7)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)" }}
            onClick={() => setOpen(null)}
          >
            <motion.div
              className="w-full max-w-4xl rounded-2xl overflow-hidden border-2"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              style={{
                background: "var(--surface)",
                borderColor: "var(--orange)",
                boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div
                className="p-6 border-b relative"
                style={{
                  borderColor: "var(--border)",
                  background: items[open].gradient,
                }}
              >
                <div className="text-xl font-bold text-white mb-1">
                  {items[open].title}
                </div>
                <div className="text-sm text-white/90 mb-3">
                  {items[open].description}
                </div>
                <div className="flex items-center gap-4 text-white/90">
                  <span className="text-2xl font-bold">{items[open].metric}</span>
                  <span className="text-sm">{items[open].period}</span>
                </div>

                {/* Close button */}
                <button
                  onClick={() => setOpen(null)}
                  className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
                  aria-label="Close modal"
                >
                  <X size={20} color="white" />
                </button>
              </div>

              {/* Media grid */}
              <div className="grid grid-cols-1 md:grid-cols-3">
                {["hook", "edit", "thumb"].map((k, idx) => {
                  const src = items[open].media[k];
                  return (
                    <div
                      key={k}
                      className="aspect-[4/3] relative border-r md:last:border-r-0 group"
                      style={{ borderColor: "var(--border)" }}
                    >
                      {src ? (
                        <img
                          src={src}
                          alt={`${k} preview`}
                          className="absolute inset-0 w-full h-full object-cover"
                          decoding="async"
                        />
                      ) : (
                        <div
                          className="absolute inset-0"
                          style={{ background: "linear-gradient(135deg, #2c3e50, #34495e)" }}
                        />
                      )}

                      {/* Label */}
                      <div
                        className="absolute bottom-3 left-3 text-xs font-semibold px-3 py-1.5 rounded-full capitalize"
                        style={{
                          background: "rgba(0,0,0,.75)",
                          color: "#fff",
                          backdropFilter: "blur(8px)",
                          border: "1px solid rgba(255,255,255,.2)",
                        }}
                      >
                        {k}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Details */}
              <div className="p-6 bg-[var(--surface-alt)]">
                <h4 className="text-sm font-semibold mb-3" style={{ color: "var(--text)" }}>
                  Key Optimizations:
                </h4>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {items[open].highlights?.map((h, idx) => (
                    <li
                      key={idx}
                      className="flex items-center gap-2 text-sm"
                      style={{ color: "var(--text-muted)" }}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ background: "var(--orange)" }}
                        aria-hidden="true"
                      />
                      {h}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Footer */}
              <div className="p-4 border-t flex justify-end" style={{ borderColor: "var(--border)" }}>
                <button
                  className="px-5 py-2.5 rounded-xl font-semibold transition-all"
                  style={{
                    color: "var(--text)",
                    border: "1px solid var(--border)",
                    background: "var(--surface-alt)",
                  }}
                  onClick={() => setOpen(null)}
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};

export default CaseStudies;
