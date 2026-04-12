import React, { useState } from "react";
import { motion } from "framer-motion";
import { MessageCircle, Bot, Zap, BarChart3, Wand2 } from "lucide-react";
import ParticleNetwork from './animations/ParticleNetwork';

/* ===================== Enhanced Process Section (AI-first) ===================== */
const ProcessSection = () => {
  const reduceMotion = false;

  const [activeStep, setActiveStep] = useState(null);

  const steps = [
    {
      n: 1,
      title: "Discovery Call (15–20 min)",
      desc: "Rapid channel audit, goals, constraints, and assets. We align on north-star metrics (CTR, Retention, Subs/Upload) and success criteria.",
      icon: <MessageCircle size={24} />,
      gradient: "linear-gradient(135deg, #E85002, #C10801)",
      deliverables: [
        "Channel audit report",
        "Success metrics defined",
        "Asset inventory",
        "Timeline roadmap"
      ],
    },
    {
      n: 2,
      title: "AI Setup & Guardrails (1–2 days)",
      desc: "Brand kit, motion/pacing presets, auto-transcriptions, metadata assistant, and thumbnail ideation loops. Consent-first voice/face features with review gates.",
      icon: <Bot size={24} />,
      gradient: "linear-gradient(135deg, #F16001, #E85002)",
      deliverables: [
        "Brand style guide",
        "AI workflow setup",
        "Consent documentation",
        "Quality review gates"
      ],
    },
    {
      n: 3,
      title: "Pilot Sprint (7–10 days)",
      desc: "2–3 edited videos + thumbnails/shorts. Hook testing, clean cuts, captioning. Structured A/B for title/thumbnail. 48–72 hr standard turnaround.",
      icon: <Zap size={24} />,
      gradient: "linear-gradient(135deg, #E85002, #F16001)",
      deliverables: [
        "2-3 full edits delivered",
        "A/B thumbnail variants",
        "Hook performance data",
        "Feedback integration"
      ],
    },
    {
      n: 4,
      title: "Measure → Systemize",
      desc: "CTR/retention dashboard, weekly iteration loop, and workflow automations (handoff, posts, assets). Scale what wins; sunset what doesn't.",
      icon: <BarChart3 size={24} />,
      gradient: "linear-gradient(135deg, #C10801, #E85002)",
      deliverables: [
        "Analytics dashboard",
        "Automated workflows",
        "Weekly optimization",
        "Continuous improvement"
      ],
    },
  ];

  return (
    <section
      id="process"
      className="py-20 relative overflow-hidden"
      style={{
        background: "var(--surface)",
        contentVisibility: "auto",
        containIntrinsicSize: "800px",
      }}
    >
      {/* Background elements */}
      {!reduceMotion && (
        <>
          {/* ParticleNetwork - relocated from Hero */}
          <ParticleNetwork
            particleCount={30}
            color="#E85002"
            connectionDistance={100}
            speed={0.2}
            opacity={0.15}
          />
          <div
            className="absolute top-1/4 left-10 w-72 h-72 rounded-full opacity-10 blur-3xl pointer-events-none"
            style={{
              background: "radial-gradient(circle, var(--orange), transparent 60%)",
            }}
            aria-hidden="true"
          />
          <div
            className="absolute bottom-1/4 right-10 w-72 h-72 rounded-full opacity-10 blur-3xl pointer-events-none"
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
          className="text-center mb-16"
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
            <Wand2 size={14} />
            AI-first Workflow
          </motion.div>

          <h2
            className="text-4xl md:text-5xl font-bold font-heading mb-3"
            style={{ color: "var(--text)" }}
          >
            How We Work
          </h2>
          <p className="text-base md:text-lg max-w-2xl mx-auto" style={{ color: "var(--text-muted)" }}>
            A simple path to results — human craft × AI speed, no fluff.
          </p>
        </motion.div>

        {/* Steps grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {steps.map((s, idx) => {
            const isActive = activeStep === idx;
            return (
              <motion.div
                key={s.n}
                initial={reduceMotion ? {} : { opacity: 0, y: 30 }}
                whileInView={reduceMotion ? {} : { opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                className="group relative p-6 rounded-2xl cursor-pointer"
                style={{
                  background: "var(--surface-alt)",
                  border: `2px solid ${isActive ? "var(--orange)" : "var(--border)"}`,
                  boxShadow: isActive
                    ? "0 12px 30px rgba(232,80,2,0.2)"
                    : "0 4px 12px rgba(0,0,0,0.05)",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                }}
                onMouseEnter={() => setActiveStep(idx)}
                onMouseLeave={() => setActiveStep(null)}
                whileHover={reduceMotion ? {} : { y: -8 }}
              >
                {/* Gradient background on hover */}
                {!reduceMotion && (
                  <motion.div
                    className="absolute inset-0 rounded-2xl opacity-0 pointer-events-none"
                    style={{
                      background: s.gradient,
                      filter: "blur(20px)",
                      zIndex: -1,
                    }}
                    animate={{ opacity: isActive ? 0.15 : 0 }}
                    transition={{ duration: 0.3 }}
                    aria-hidden="true"
                  />
                )}

                {/* Number badge with icon */}
                <div className="flex items-center gap-3 mb-4">
                  <motion.div
                    className="w-12 h-12 rounded-xl flex items-center justify-center font-bold relative overflow-hidden"
                    style={{
                      background: s.gradient,
                      color: "#fff",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                    }}
                    animate={
                      isActive && !reduceMotion
                        ? {
                          scale: [1, 1.05, 1],
                          rotate: [0, 5, -5, 0],
                        }
                        : {}
                    }
                    transition={{ duration: 0.6 }}
                  >
                    <span className="relative z-10">{s.n}</span>

                    {/* Pulse effect */}
                    {isActive && !reduceMotion && (
                      <motion.div
                        className="absolute inset-0"
                        style={{ background: "rgba(255,255,255,0.3)" }}
                        initial={{ scale: 0, opacity: 1 }}
                        animate={{ scale: 2, opacity: 0 }}
                        transition={{ duration: 1, repeat: Infinity }}
                        aria-hidden="true"
                      />
                    )}
                  </motion.div>

                  <div
                    className="p-2 rounded-lg"
                    style={{
                      background: `color-mix(in oklab, var(--orange) 10%, transparent)`,
                      color: "var(--orange)",
                    }}
                  >
                    {s.icon}
                  </div>
                </div>

                {/* Title */}
                <h3
                  className="text-lg md:text-xl font-semibold mb-2 font-['Poppins']"
                  style={{ color: "var(--text)" }}
                >
                  {s.title}
                </h3>

                {/* Description */}
                <p
                  className="text-sm mb-4 leading-relaxed"
                  style={{ color: "var(--text-muted)" }}
                >
                  {s.desc}
                </p>

                {/* Deliverables - expand on hover */}
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={
                    isActive
                      ? { height: "auto", opacity: 1 }
                      : { height: 0, opacity: 0 }
                  }
                  transition={{ duration: 0.3 }}
                  style={{ overflow: "hidden" }}
                >
                  <div
                    className="pt-4 mt-4 border-t"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <div
                      className="text-xs font-semibold mb-2"
                      style={{ color: "var(--orange)" }}
                    >
                      Deliverables:
                    </div>
                    <ul className="space-y-1.5">
                      {s.deliverables.map((d, di) => (
                        <motion.li
                          key={di}
                          className="flex items-center gap-2 text-xs"
                          style={{ color: "var(--text-muted)" }}
                          initial={{ x: -10, opacity: 0 }}
                          animate={
                            isActive
                              ? { x: 0, opacity: 1 }
                              : { x: -10, opacity: 0 }
                          }
                          transition={{ delay: di * 0.05 }}
                        >
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                          >
                            <path
                              d="M20 6L9 17l-5-5"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                          {d}
                        </motion.li>
                      ))}
                    </ul>
                  </div>
                </motion.div>

                {/* Arrow indicator */}
                {idx < steps.length - 1 && (
                  <div
                    className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 z-20"
                    aria-hidden="true"
                  >
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      style={{ color: "var(--orange)" }}
                    >
                      <path
                        d="M5 12h14M12 5l7 7-7 7"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Timeline visual */}
        <motion.div
          className="max-w-3xl mx-auto mb-12"
          initial={reduceMotion ? {} : { opacity: 0, y: 20 }}
          whileInView={reduceMotion ? {} : { opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <div className="flex items-center justify-between relative">
            {/* Progress line */}
            <div
              className="absolute top-1/2 left-0 right-0 h-1 -translate-y-1/2"
              style={{
                background: "var(--border)",
              }}
              aria-hidden="true"
            >
              <motion.div
                className="h-full"
                style={{
                  background: "linear-gradient(90deg, var(--orange), #F16001)",
                }}
                initial={{ width: "0%" }}
                whileInView={{ width: "100%" }}
                viewport={{ once: true }}
                transition={{ duration: 2, ease: "easeInOut" }}
              />
            </div>

            {/* Time markers */}
            {["Day 1", "Day 2", "Day 10", "Ongoing"].map((time, i) => (
              <div
                key={i}
                className="relative z-10 text-center"
              >
                <div
                  className="w-3 h-3 rounded-full mx-auto mb-2"
                  style={{
                    background: "var(--orange)",
                    boxShadow: "0 0 0 4px var(--surface)",
                  }}
                />
                <div
                  className="text-xs font-medium"
                  style={{ color: "var(--text-muted)" }}
                >
                  {time}
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Enhanced consent notice */}
        <motion.div
          className="max-w-3xl mx-auto p-5 rounded-xl flex items-start gap-3"
          style={{
            background: "var(--surface-alt)",
            border: "1px solid var(--border)",
          }}
          initial={reduceMotion ? {} : { opacity: 0, y: 10 }}
          whileInView={reduceMotion ? {} : { opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.5 }}
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
          <div className="text-xs md:text-sm" style={{ color: "var(--text-muted)" }}>
            <strong style={{ color: "var(--text)" }}>Privacy & Consent:</strong> Voice generation and
            face-swap are available only with explicit creator consent and in strict compliance with
            platform policies. All AI features include human review gates.
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default ProcessSection;
