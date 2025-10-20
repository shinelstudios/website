import React, { useState } from "react";
import { motion } from "framer-motion";
import { MessageCircle, Bot, Zap, BarChart3 } from "lucide-react";

const ProcessSection = () => {
  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const [activeStep, setActiveStep] = useState(null);

  const steps = [
    {
      n: 1,
      title: "Discovery Call (15–20 min)",
      desc: "Rapid channel audit, goals, constraints, and assets. We align on north-star metrics (CTR, Retention, Subs/Upload) and success criteria.",
      icon: <MessageCircle size={24} />,
      gradient: "linear-gradient(135deg, #ff6b6b, #ee5a6f)",
      deliverables: ["Channel audit report", "Success metrics defined", "Asset inventory", "Timeline roadmap"],
    },
    {
      n: 2,
      title: "AI Setup & Guardrails (1–2 days)",
      desc: "Brand kit, motion/pacing presets, auto-transcriptions, metadata assistant, and thumbnail ideation loops. Consent-first voice/face features with review gates.",
      icon: <Bot size={24} />,
      gradient: "linear-gradient(135deg, #4ecdc4, #45b7d1)",
      deliverables: ["Brand style guide", "AI workflow setup", "Consent documentation", "Quality review gates"],
    },
    {
      n: 3,
      title: "Pilot Sprint (7–10 days)",
      desc: "2–3 edited videos + thumbnails/shorts. Hook testing, clean cuts, captioning. Structured A/B for title/thumbnail. 48–72 hr standard turnaround.",
      icon: <Zap size={24} />,
      gradient: "linear-gradient(135deg, #f7b731, #f39c12)",
      deliverables: ["2-3 full edits delivered", "A/B thumbnail variants", "Hook performance data", "Feedback integration"],
    },
    {
      n: 4,
      title: "Measure → Systemize",
      desc: "CTR/retention dashboard, weekly iteration loop, and workflow automations (handoff, posts, assets). Scale what wins; sunset what doesn't.",
      icon: <BarChart3 size={24} />,
      gradient: "linear-gradient(135deg, #5f27cd, #341f97)",
      deliverables: ["Analytics dashboard", "Automated workflows", "Weekly optimization", "Continuous improvement"],
    },
  ];

  return (
    <section className="py-20 relative overflow-hidden" style={{ background: "var(--surface)" }}>
      {/* ... (full JSX for ProcessSection as in the prompt) ... */}
      {/* ... (Header, Steps Grid, Timeline Visual, Consent Notice) ... */}
    </section>
  );
};

export default ProcessSection;