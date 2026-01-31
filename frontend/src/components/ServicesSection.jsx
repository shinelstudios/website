import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Image as IconImage,
  Play,
  Zap,
  Wand2,
  PenTool,
  Bot,
  Megaphone,
  BarChart3,
} from "lucide-react";
import { Link } from "react-router-dom";
import { animations } from "../lib/helpers"; // Assuming helpers are in src/lib/helpers.js

import { useGlobalConfig } from "../context/GlobalConfigContext";

/* ===================== Enhanced Services Section ===================== */
const ServicesSection = () => {
  const { config } = useGlobalConfig();
  const [activeService, setActiveService] = useState(null);

  const services = [
    {
      icon: <IconImage size={40} />,
      title: "AI Thumbnail Design",
      outcome: "Boost CTR with concept & layout exploration.",
      proof: "Multivariate iterations • A/B-ready exports",
      gradient: "linear-gradient(135deg, #ff6b6b, #ff8787)",
      path: "/thumbnails",
      features: [
        "AI-powered concept generation",
        "A/B testing ready",
        "Multi-variant exports",
        "Brand consistency",
      ],
    },
    {
      icon: <Play size={40} />,
      title: "Retention-Led Editing",
      outcome: "Style-matched transitions and pacing that hold attention.",
      proof: "Kamz Inkzone (173K+): +38% avg view duration in 30 days",
      gradient: "linear-gradient(135deg, #4ecdc4, #44a8a3)",
      path: "/video-editing",
      features: [
        "Smart pacing analysis",
        "Hook optimization",
        "Retention graphs",
        "Style matching",
      ],
    },
    {
      icon: <Zap size={40} />,
      title: "Shorts Production",
      outcome: "Hook-first highlights, auto-captions, meme timing.",
      proof: "Manav: +9.4k subs from Shorts in Q2",
      gradient: "linear-gradient(135deg, #f7b731, #f39c12)",
      path: "/shorts",
      features: [
        "Hook-first structure",
        "Auto captions",
        "Platform optimization",
        "Viral timing",
      ],
    },
    {
      icon: <Wand2 size={40} />,
      title: "Transcriptions & Captions",
      outcome: "Auto transcripts with clean, on-brand subtitles.",
      proof: "Faster edits • Better accessibility • Higher retention",
      gradient: "linear-gradient(135deg, #45b7d1, #3498db)",
      path: "/services/growth/captions",
      features: [
        "99% accuracy AI",
        "Multi-language support",
        "Brand-matched styling",
        "SEO optimization",
      ],
    },
    {
      icon: <PenTool size={40} />,
      title: "Script Drafts & Research",
      outcome: "AI outlines + beat sheets → human punch-up.",
      proof: "Hook retention +18% in A/B tests (first 8s)",
      gradient: "linear-gradient(135deg, #5f27cd, #341f97)",
      path: "/services/growth/seo",
      features: [
        "Research assistance",
        "Hook templates",
        "Beat sheet creation",
        "Script optimization",
      ],
    },
    {
      icon: <Wand2 size={40} />,
      title: "Face-Safe Swap & Cleanup",
      outcome: "Consent-first face replacement & object removal.",
      proof: "Creator-approved only • Review-gated workflow",
      gradient: "linear-gradient(135deg, #ff9ff3, #f368e0)",
      path: "/services/editing/long",
      features: [
        "Consent verification",
        "Review workflow",
        "Quality assurance",
        "Policy compliant",
      ],
    },
    {
      icon: <Megaphone size={40} />,
      title: "Voice Generation / Cleanup",
      outcome: "Natural voice pickups, noise cleanup, alt takes.",
      proof: "Consent-first cloning • Platform-policy compliant",
      gradient: "linear-gradient(135deg, #ee5a6f, #c44569)",
      path: "/services/editing/long",
      features: [
        "Voice cloning (consent)",
        "Noise reduction",
        "Alternative takes",
        "Natural quality",
      ],
    },
    {
      icon: <Bot size={40} />,
      title: "Workflow Automations & SEO",
      outcome: "Auto-posting, asset handoff, titles, tags, descriptions.",
      proof: "+27% browse/search traffic after metadata revamp",
      gradient: "linear-gradient(135deg, #48dbfb, #0abde3)",
      path: "/services/growth/seo",
      features: [
        "Auto-scheduling",
        "Metadata optimization",
        "Asset management",
        "Analytics tracking",
      ],
    },
  ];

  if (!services || services.length === 0) return null;

  return (
    <section
      id="services"
      className="py-20 relative overflow-hidden"
      style={{ background: "var(--surface-alt)" }}
    >
      {/* Ambient background effects */}
      <div
        className="absolute top-20 left-10 w-72 h-72 rounded-full opacity-20 blur-3xl pointer-events-none"
        style={{
          background: "radial-gradient(circle, var(--orange), transparent 70%)",
          animation: "ss-float-slow 20s ease-in-out infinite",
        }}
        aria-hidden="true"
      />
      <div
        className="absolute bottom-20 right-10 w-80 h-80 rounded-full opacity-15 blur-3xl pointer-events-none"
        style={{
          background: "radial-gradient(circle, #ff9357, transparent 70%)",
          animation: "ss-float-slow 18s ease-in-out infinite 2s",
        }}
        aria-hidden="true"
      />

      <div className="container mx-auto px-4 relative z-10">
        {/* Section Heading */}
        <motion.div
          variants={animations.fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-10%" }}
          className="text-center mb-16"
        >
          <motion.div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold mb-4"
            style={{
              color: "var(--orange)",
              border: "1px solid var(--border)",
              background: "rgba(232,80,2,0.08)",
              boxShadow: "0 4px 12px rgba(232,80,2,0.1)",
            }}
            whileHover={{ scale: 1.05, y: -2 }}
          >
            <Zap size={14} />
            AI-first
          </motion.div>

          <h2
            className="text-4xl md:text-5xl font-bold mb-4 font-['Poppins']"
            style={{ color: "var(--text)" }}
          >
            Our Services
          </h2>

          <p
            className="text-lg md:text-xl max-w-2xl mx-auto"
            style={{ color: "var(--text-muted)" }}
          >
            Human editors × AI systems — outcomes over deliverables, built to
            convert
          </p>

          {/* Stats row */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm">
            {[
              { label: "Average CTR Lift", value: `+${config?.stats?.ctrBoostMax || 62}%` },
              { label: "Faster Turnaround", value: "48-72h" },
              { label: "Client Retention", value: "94%" },
            ].map((stat, i) => (
              <motion.div
                key={i}
                className="flex items-center gap-2 px-4 py-2 rounded-full"
                style={{
                  border: "1px solid var(--border)",
                  background: "var(--surface)",
                }}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <BarChart3 size={16} style={{ color: "var(--orange)" }} />
                <span style={{ color: "var(--text-muted)" }}>{stat.label}:</span>
                <strong style={{ color: "var(--orange)" }}>{stat.value}</strong>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Services Grid */}
        <motion.div
          variants={animations.staggerParent}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-10%" }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {services.map((s, i) => {
            const isActive = activeService === i;
            return (
              <Link
                key={i}
                to={s.path}
                className="group relative p-6 rounded-2xl shadow-lg border block"
                style={{
                  background: "var(--surface)",
                  borderColor: "var(--border)",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  willChange: "transform, box-shadow",
                }}
                onMouseEnter={() => setActiveService(i)}
                onMouseLeave={() => setActiveService(null)}
              >
                {/* Gradient glow on hover */}
                <motion.div
                  className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 pointer-events-none"
                  style={{
                    background: s.gradient,
                    filter: "blur(20px)",
                    zIndex: -1,
                  }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: isActive ? 0.15 : 0 }}
                  transition={{ duration: 0.3 }}
                  aria-hidden="true"
                />

                {/* Icon with animated background */}
                <motion.div
                  className="relative mb-4 w-16 h-16 rounded-2xl flex items-center justify-center"
                  style={{
                    background: `color-mix(in oklab, var(--orange) 10%, transparent)`,
                    border:
                      "1px solid color-mix(in oklab, var(--orange) 20%, transparent)",
                  }}
                  animate={
                    isActive
                      ? {
                        scale: [1, 1.05, 1],
                        rotate: [0, 5, -5, 0],
                      }
                      : {}
                  }
                  transition={{ duration: 0.6 }}
                >
                  <div style={{ color: "var(--orange)" }}>{s.icon}</div>

                  {/* Pulse effect */}
                  {isActive && (
                    <motion.div
                      className="absolute inset-0 rounded-2xl"
                      style={{
                        border: "2px solid var(--orange)",
                      }}
                      initial={{ scale: 1, opacity: 0.8 }}
                      animate={{ scale: 1.3, opacity: 0 }}
                      transition={{ duration: 1, repeat: Infinity }}
                      aria-hidden="true"
                    />
                  )}
                </motion.div>

                <h3
                  className="text-lg md:text-xl font-bold mb-2 font-['Poppins']"
                  style={{ color: "var(--text)" }}
                >
                  {s.title}
                </h3>

                <p
                  className="mb-3 text-sm md:text-base font-medium"
                  style={{ color: "var(--text)" }}
                >
                  {s.outcome}
                </p>

                <p
                  className="text-xs md:text-sm mb-4"
                  style={{ color: "var(--text-muted)" }}
                >
                  {s.proof}
                </p>

                {/* Feature pills - show on hover */}
                <motion.div
                  className="space-y-1.5 overflow-hidden"
                  initial={{ height: 0, opacity: 0 }}
                  animate={
                    isActive
                      ? { height: "auto", opacity: 1 }
                      : { height: 0, opacity: 0 }
                  }
                  transition={{ duration: 0.3 }}
                >
                  <div
                    className="text-xs font-semibold mb-2"
                    style={{ color: "var(--orange)" }}
                  >
                    Key Features:
                  </div>
                  {s.features?.map((feature, fi) => (
                    <motion.div
                      key={fi}
                      className="flex items-center gap-2 text-xs"
                      style={{ color: "var(--text-muted)" }}
                      initial={{ x: -10, opacity: 0 }}
                      animate={
                        isActive ? { x: 0, opacity: 1 } : { x: -10, opacity: 0 }
                      }
                      transition={{ delay: fi * 0.05 }}
                    >
                      <span
                        className="w-1 h-1 rounded-full"
                        style={{ background: "var(--orange)" }}
                        aria-hidden="true"
                      />
                      {feature}
                    </motion.div>
                  ))}
                </motion.div>

                {/* Hover indicator */}
                <motion.div
                  className="mt-4 pt-4 border-t flex items-center justify-between text-xs font-semibold"
                  style={{
                    borderColor: "var(--border)",
                    color: "var(--orange)",
                  }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: isActive ? 1 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <span>Learn more</span>
                  <motion.svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    animate={isActive ? { x: [0, 4, 0] } : {}}
                    transition={{ duration: 1, repeat: Infinity }}
                  >
                    <path
                      d="M5 12h14M12 5l7 7-7 7"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </motion.svg>
                </motion.div>
              </Link>
            );
          })}
        </motion.div>

        {/* Enhanced consent note */}
        <motion.div
          className="mt-12 p-4 rounded-xl max-w-3xl mx-auto flex items-start gap-3"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
          }}
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            className="flex-shrink-0 mt-0.5"
            style={{ color: "var(--orange)" }}
          >
            <path
              d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div
            className="text-xs md:text-sm"
            style={{ color: "var(--text-muted)" }}
          >
            <strong style={{ color: "var(--text)" }}>
              Privacy & Consent Policy:
            </strong>{" "}
            Face-swap and voice generation are available only with explicit
            creator consent and in strict compliance with platform policies. All
            AI-assisted features include human review.
          </div>
        </motion.div>
      </div>

      {/* Keyframe animations */}
      <style>{`
        @keyframes ss-float-slow {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          33% { transform: translate3d(30px, -30px, 0) scale(1.05); }
          66% { transform: translate3d(-25px, 25px, 0) scale(0.95); }
        }
        @-webkit-keyframes ss-float-slow {
          0%, 100% { -webkit-transform: translate3d(0, 0, 0) scale(1); }
          33% { -webkit-transform: translate3d(30px, -30px, 0) scale(1.05); }
          66% { -webkit-transform: translate3d(-25px, 25px, 0) scale(0.95); }
        }
      `}</style>
    </section>
  );
};

export default ServicesSection;