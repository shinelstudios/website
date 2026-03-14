import React, { useState } from "react";
import { motion } from "framer-motion";
import { MessageCircle, Bot, BarChart3, Image as IconImage } from "lucide-react";
import { FAQSchema } from './MetaTags';

/* ===================== Enhanced FAQ Section ===================== */
const FAQSection = () => {
  const reduceMotion = false;

  const [openFAQ, setOpenFAQ] = useState(null);

  const faqs = [
    {
      question: 'What video editing services does Shinel Studios offer?',
      answer: 'Shinel Studios specializes in professional video editing, AI-powered thumbnail design, YouTube SEO optimization, and data-driven content strategy for creators and brands. We help gaming channels, lifestyle vloggers, and educational content creators grow their audience.',
      category: 'Services',
      icon: <IconImage size={20} />,
    },
    {
      question: 'Who are some creators Shinel Studios has worked with?',
      answer: 'We have had the privilege to collaborate with leading YouTube creators like Kamz Inkzone, Deadlox Gaming, Manav Sukhija, and Gamer Mummy, providing them with professional video editing and growth strategy.',
      category: 'Clients',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      question: 'How long does video editing take?',
      answer: 'Our video editing turnaround time is 24-48 hours for thumbnail design, 48-72 hours for short-form content (YouTube Shorts, Instagram Reels), and 5-10 days for long-form video projects. Rush delivery is available for urgent projects.',
      category: 'Timeline',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
          <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      question: 'Do you work with small YouTube channels?',
      answer: 'Yes! We work with YouTube creators of all sizes - from new channels under 1K subscribers to established creators with 100K+ subscribers. Our pricing packages are flexible and designed to fit different budgets and growth stages.',
      category: 'Pricing',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      question: "What's included in YouTube content strategy?",
      answer: 'Our YouTube content strategy includes keyword research, competitor analysis, content calendar planning, optimal posting schedules, thumbnail A/B testing, and performance analytics. We focus on improving CTR (click-through rate), watch time, and subscriber growth.',
      category: 'Services',
      icon: <BarChart3 size={20} />,
    },
    {
      question: 'How do you ensure video editing quality?',
      answer: "Our quality assurance process includes multiple review stages with client feedback loops. Every project includes 1 major revision and 2 minor revisions to ensure you're completely satisfied with the final video.",
      category: 'Process',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      question: 'What AI tools do you use for video editing?',
      answer: 'We use AI for automatic transcription, thumbnail concept generation, title optimization, and retention analytics. All AI-generated content receives human review and editing to ensure quality, brand consistency, and platform compliance.',
      category: 'AI Features',
      icon: <Bot size={20} />,
    },
    {
      question: 'Do you offer video editing revisions?',
      answer: "Yes! Every video editing package includes 1 major revision and 2 minor revision rounds per video to ensure you're completely satisfied. Additional revisions are available at standard hourly rates.",
      category: 'Process',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      question: 'What payment methods do you accept for video editing services?',
      answer: 'We accept Indian bank transfers (NEFT/RTGS/IMPS), UPI payments, credit/debit cards, and international wire transfers. Payment terms are flexible - 50% upfront for new clients, with monthly retainers available for ongoing projects.',
      category: 'Pricing',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <rect x="1" y="4" width="22" height="16" rx="2" stroke="currentColor" strokeWidth="2" />
          <path d="M1 10h22" stroke="currentColor" strokeWidth="2" />
        </svg>
      ),
    },
  ];


  const toggleFAQ = (idx) => setOpenFAQ((cur) => (cur === idx ? null : idx));

  return (
    <section id="faq" className="py-20 relative overflow-hidden" style={{ background: 'var(--surface)' }}>
      {/* Centralized FAQ Schema */}
      <FAQSchema faqs={faqs} />
      {/* Background decoration */}
      {!reduceMotion && (
        <div
          className="absolute bottom-20 left-20 w-96 h-96 rounded-full opacity-10 blur-3xl pointer-events-none"
          style={{
            background: "radial-gradient(circle, var(--orange), transparent 60%)",
          }}
          aria-hidden="true"
        />
      )}

      <div className="container mx-auto px-4 max-w-4xl relative z-10">
        {/* Header */}
        <motion.div
          initial={reduceMotion ? {} : { opacity: 0, y: 20 }}
          whileInView={reduceMotion ? {} : { opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
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
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Got Questions?
          </motion.div>

          <h2
            className="text-4xl md:text-5xl font-bold mb-4 font-['Poppins']"
            style={{ color: 'var(--text)' }}
          >
            Frequently Asked Questions
          </h2>
          <p className="text-base md:text-lg" style={{ color: 'var(--text-muted)' }}>
            Get answers to common questions about our services
          </p>
        </motion.div>

        {/* FAQ Items */}
        <div className="space-y-4">
          {faqs.map((f, i) => {
            const open = openFAQ === i;
            return (
              <motion.div
                key={i}
                initial={reduceMotion ? {} : { opacity: 0, y: 10 }}
                whileInView={reduceMotion ? {} : { opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                className="rounded-xl overflow-hidden"
                style={{
                  border: `2px solid ${open ? "var(--orange)" : "var(--border)"}`,
                  background: 'var(--surface-alt)',
                  boxShadow: open ? "0 8px 20px rgba(232,80,2,0.15)" : "none",
                  transition: "all 0.3s ease",
                }}
              >
                <button
                  type="button"
                  onClick={() => toggleFAQ(i)}
                  aria-expanded={open}
                  aria-controls={`faq-panel-${i}`}
                  className="w-full flex items-center justify-between gap-4 p-5 text-left group"
                  style={{ color: 'var(--text)' }}
                >
                  <div className="flex items-start gap-3 flex-1">
                    <div
                      className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{
                        background: open
                          ? "var(--orange)"
                          : "color-mix(in oklab, var(--orange) 10%, transparent)",
                        color: open ? "#fff" : "var(--orange)",
                        transition: "all 0.3s ease",
                      }}
                    >
                      {f.icon}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-base mb-1">{f.question}</div>
                      <div
                        className="text-xs px-2 py-0.5 rounded-full inline-block"
                        style={{
                          background: "color-mix(in oklab, var(--orange) 10%, transparent)",
                          color: "var(--orange)",
                        }}
                      >
                        {f.category}
                      </div>
                    </div>
                  </div>

                  <motion.div
                    className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center border-2 font-bold text-lg"
                    style={{
                      borderColor: open ? "var(--orange)" : "var(--border)",
                      background: open ? 'var(--orange)' : 'transparent',
                      color: open ? '#fff' : 'var(--text-muted)',
                    }}
                    animate={{ rotate: open ? 45 : 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    +
                  </motion.div>
                </button>

                <motion.div
                  id={`faq-panel-${i}`}
                  initial={false}
                  animate={{
                    height: open ? "auto" : 0,
                    opacity: open ? 1 : 0,
                  }}
                  transition={{ duration: 0.3 }}
                  style={{ overflow: "hidden" }}
                >
                  <div className="px-5 pb-5 pl-[4.25rem]" style={{ color: 'var(--text-muted)' }}>
                    {f.answer}
                  </div>
                </motion.div>
              </motion.div>
            );
          })}
        </div>

        {/* Still have questions CTA */}
        <motion.div
          className="mt-12 text-center p-6 rounded-xl"
          style={{
            background: "var(--surface-alt)",
            border: "1px solid var(--border)",
          }}
          initial={reduceMotion ? {} : { opacity: 0, y: 10 }}
          whileInView={reduceMotion ? {} : { opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <div className="text-lg font-semibold mb-2" style={{ color: "var(--text)" }}>
            Still have questions?
          </div>
          <div className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
            We're here to help! Reach out and we'll get back to you within 24 hours.
          </div>
          <a
            href="#contact"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-white"
            style={{
              background: "linear-gradient(90deg, var(--orange), #F16001)",
            }}
          >
            <MessageCircle size={18} />
            Contact Us
          </a>
        </motion.div>
      </div>
    </section>
  );
};

export default FAQSection;
