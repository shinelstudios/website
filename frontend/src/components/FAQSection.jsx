import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { IconImage, BarChart3, Bot } from "lucide-react"; // Import necessary icons

const FAQSection = () => {
  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const [openFAQ, setOpenFAQ] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const faqs = [ /* ... (full faqs array) ... */ ];
  const filteredFaqs = useMemo(() => { /* ... */ }, [searchQuery, faqs]); // Added faqs to dep array
  const toggleFAQ = (idx) => setOpenFAQ((cur) => (cur === idx ? null : idx));
  const categories = [...new Set(faqs.map((f) => f.category))];

  return (
    <section className="py-20 relative overflow-hidden" style={{ background: 'var(--surface)' }} itemScope itemType="https://schema.org/FAQPage">
      {/* ... (full JSX for FAQSection as in the prompt) ... */}
      {/* ... (JSON-LD Script, Header, Search, Pills, FAQ Items) ... */}
    </section>
  );
};

export default FAQSection;