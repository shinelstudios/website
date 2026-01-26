import React, { useState } from "react";
import { motion } from "framer-motion";
import { MessageCircle, Bot, Zap, BarChart3 } from "lucide-react";

const ProcessSection = () => {
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
      {/* ... (Header, Steps Grid, Timeline Visual, Consent Notice) ... */}
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-black mb-4 tracking-tight">The <span className="text-orange-500">Execution</span> Core.</h2>
          <p className="text-gray-400 max-w-2xl mx-auto text-lg">Four stages of precision to transform your channel into a high-retention machine.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, idx) => (
            <div key={idx} className="relative group">
              <div className="p-8 rounded-[32px] bg-white/[0.02] border border-white/5 h-full hover:bg-white/[0.05] transition-all">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white mb-6" style={{ background: step.gradient }}>
                  {step.icon}
                </div>
                <h3 className="text-xl font-bold mb-4">{step.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed mb-6">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProcessSection;