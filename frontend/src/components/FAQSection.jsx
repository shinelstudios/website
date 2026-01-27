import React, { useState, useMemo, useRef, useEffect } from "react";
import { useGlobalConfig } from "../context/GlobalConfigContext";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ChevronDown, IconImage, BarChart3, Bot, Zap, HelpCircle } from "lucide-react";

const FAQSection = () => {
  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const [openFAQ, setOpenFAQ] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const searchInputRef = useRef(null);

  const { config } = useGlobalConfig();
  const stats = config?.stats || {};
  const pricing = config?.pricing || {};

  // Calculate lowest starter price dynamically
  const minPrice = useMemo(() => {
    try {
      const p = pricing;
      const prices = [p.gaming?.starter, p.vlog?.starter, p.talking?.starter].filter(n => n).map(n => Number(n));
      return prices.length ? Math.min(...prices) : 2500;
    } catch { return 2500; }
  }, [pricing]);

  const faqs = [
    {
      category: "Services",
      icon: IconImage,
      q: "What services do you offer?",
      a: "We offer comprehensive YouTube content services including video editing (long-form and shorts), thumbnail design, branding, AI-powered transcriptions, SEO optimization, and workflow automation. All services are AI-enhanced but human-perfected.",
    },
    {
      category: "Services",
      icon: IconImage,
      q: "Do you work with all niches?",
      a: "Yes! We've worked with creators across gaming, vlogging, tech, finance, education, and more. Our AI systems adapt to your specific niche and style, while our editors ensure authenticity.",
    },
    {
      category: "Pricing",
      icon: BarChart3,
      q: "What are your pricing plans?",
      a: `Pricing varies based on services and volume. We offer flexible packages starting from ₹${minPrice} for editing. Contact us for a custom quote tailored to your needs and goals.`,
    },
    {
      category: "Pricing",
      icon: BarChart3,
      q: "Do you offer monthly retainers?",
      a: "Yes! We offer monthly retainer packages with priority turnaround, dedicated editor assignment, and volume discounts. Most clients save 20-30% with retainer plans.",
    },
    {
      category: "Process",
      icon: Zap,
      q: "What's your turnaround time?",
      a: "Standard turnaround is 48-72 hours for video editing and 24-48 hours for thumbnails. Rush delivery (24 hours) is available for urgent projects at a premium.",
    },
    {
      category: "Process",
      icon: Zap,
      q: "How does the revision process work?",
      a: "We include 2 rounds of revisions in all packages. Most clients are satisfied with the first delivery. Additional revisions are available at a nominal fee.",
    },
    {
      category: "AI & Technology",
      icon: Bot,
      q: "How do you use AI in your workflow?",
      a: "We use AI for transcriptions, initial cuts, color grading suggestions, and thumbnail ideation. However, every project is reviewed and refined by experienced human editors to ensure quality and authenticity.",
    },
    {
      category: "AI & Technology",
      icon: Bot,
      q: "Is AI-generated content platform-compliant?",
      a: "Absolutely. All AI-assisted features (voice, face-swap) require explicit creator consent and comply with YouTube's policies. We prioritize transparency and ethical AI use.",
    },
    {
      category: "Results",
      icon: BarChart3,
      q: "What kind of results can I expect?",
      a: `Our clients see an average CTR improvement of ${stats.ctrBoostMax || 62}% and retention increase of 38% within the first month. Results vary by niche, but we focus on data-driven optimizations.`,
    },
    {
      category: "Results",
      icon: BarChart3,
      q: "Do you guarantee results?",
      a: "While we can't guarantee specific metrics (YouTube algorithm varies), we guarantee quality work and data-backed strategies. Most clients see measurable improvements within 30 days.",
    },
  ];

  // Filter FAQs based on search and category
  const filteredFaqs = useMemo(() => {
    let filtered = faqs;

    // Category filter
    if (selectedCategory !== "all") {
      filtered = filtered.filter((f) => f.category === selectedCategory);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (f) =>
          f.q.toLowerCase().includes(query) ||
          f.a.toLowerCase().includes(query) ||
          f.category.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [searchQuery, selectedCategory, faqs]);

  const toggleFAQ = (idx) => setOpenFAQ((cur) => (cur === idx ? null : idx));

  const categories = ["all", ...new Set(faqs.map((f) => f.category))];

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === "/" && e.target.tagName !== "INPUT") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    document.addEventListener("keydown", handleKeyPress);
    return () => document.removeEventListener("keydown", handleKeyPress);
  }, []);

  return (
    <section
      className="py-20 relative overflow-hidden"
      style={{ background: "var(--surface)" }}
      itemScope
      itemType="https://schema.org/FAQPage"
    >
      {/* Background decoration */}
      <div
        className="absolute bottom-20 left-10 w-80 h-80 rounded-full opacity-10 blur-3xl pointer-events-none"
        style={{ background: "radial-gradient(circle, var(--orange), transparent 60%)" }}
        aria-hidden="true"
      />

      <div className="container mx-auto px-4 relative z-10 max-w-4xl">
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
            }}
            whileHover={reduceMotion ? {} : { scale: 1.05, y: -2 }}
          >
            <HelpCircle size={14} />
            FAQ
          </motion.div>

          <h2
            className="text-3xl md:text-5xl font-bold font-['Poppins'] mb-3"
            style={{ color: "var(--text)" }}
          >
            Frequently Asked Questions
          </h2>
          <p className="text-base md:text-lg max-w-2xl mx-auto" style={{ color: "var(--text-muted)" }}>
            Everything you need to know about our services
          </p>
        </motion.div>

        {/* Search Bar */}
        <motion.div
          className="mb-8"
          initial={reduceMotion ? {} : { opacity: 0, y: 20 }}
          whileInView={reduceMotion ? {} : { opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="relative">
            <Search
              size={20}
              className="absolute left-4 top-1/2 transform -translate-y-1/2"
              style={{ color: "var(--text-muted)" }}
            />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search FAQs... (Press / to focus)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 rounded-xl border text-base"
              style={{
                background: "var(--surface-alt)",
                borderColor: "var(--border)",
                color: "var(--text)",
              }}
            />
          </div>
        </motion.div>

        {/* Category Pills */}
        <motion.div
          className="flex flex-wrap gap-2 mb-8 justify-center"
          initial={reduceMotion ? {} : { opacity: 0, y: 20 }}
          whileInView={reduceMotion ? {} : { opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className="px-4 py-2 rounded-full text-sm font-semibold transition-all capitalize"
              style={{
                background: selectedCategory === cat ? "var(--orange)" : "var(--surface-alt)",
                color: selectedCategory === cat ? "#fff" : "var(--text)",
                border: `1px solid ${selectedCategory === cat ? "var(--orange)" : "var(--border)"}`,
              }}
            >
              {cat}
            </button>
          ))}
        </motion.div>

        {/* FAQ Items */}
        <div className="space-y-4">
          <AnimatePresence>
            {filteredFaqs.length > 0 ? (
              filteredFaqs.map((faq, idx) => {
                const isOpen = openFAQ === idx;
                const Icon = faq.icon;

                return (
                  <motion.div
                    key={idx}
                    className="rounded-xl border overflow-hidden"
                    style={{
                      background: "var(--surface-alt)",
                      borderColor: isOpen ? "var(--orange)" : "var(--border)",
                    }}
                    initial={reduceMotion ? {} : { opacity: 0, y: 20 }}
                    animate={reduceMotion ? {} : { opacity: 1, y: 0 }}
                    exit={reduceMotion ? {} : { opacity: 0, y: -20 }}
                    transition={{ duration: 0.3, delay: idx * 0.05 }}
                    itemScope
                    itemProp="mainEntity"
                    itemType="https://schema.org/Question"
                  >
                    <button
                      onClick={() => toggleFAQ(idx)}
                      className="w-full p-5 flex items-center justify-between text-left hover:bg-opacity-50 transition-all"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ background: "rgba(232, 80, 2, 0.1)" }}
                        >
                          <Icon size={20} style={{ color: "var(--orange)" }} />
                        </div>
                        <span
                          className="font-semibold text-base md:text-lg"
                          style={{ color: "var(--text)" }}
                          itemProp="name"
                        >
                          {faq.q}
                        </span>
                      </div>
                      <motion.div
                        animate={{ rotate: isOpen ? 180 : 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <ChevronDown size={20} style={{ color: "var(--text-muted)" }} />
                      </motion.div>
                    </button>

                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          initial={reduceMotion ? {} : { height: 0, opacity: 0 }}
                          animate={reduceMotion ? {} : { height: "auto", opacity: 1 }}
                          exit={reduceMotion ? {} : { height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          itemScope
                          itemProp="acceptedAnswer"
                          itemType="https://schema.org/Answer"
                        >
                          <div
                            className="px-5 pb-5 pl-[68px]"
                            style={{ color: "var(--text-muted)" }}
                            itemProp="text"
                          >
                            {faq.a}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })
            ) : (
              <motion.div
                className="text-center py-12"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <p className="text-lg" style={{ color: "var(--text-muted)" }}>
                  No FAQs found matching "{searchQuery}"
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
};

export default FAQSection;