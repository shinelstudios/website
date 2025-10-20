import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart3, X, Play } from "lucide-react";
import { findAssetByBase } from "../lib/helpers"; // Import helper

const CaseStudies = () => {
  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const MEDIA = import.meta.glob("../assets/case_studies/*.{png,jpg,jpeg,webp,avif,mp4,webm}", { 
    eager: true, 
    query: "?url", 
    import: "default" 
  });
  
  const [open, setOpen] = useState(null);
  const [hoveredCard, setHoveredCard] = useState(null);

  const items = [ /* ... (full items array) ... */ ].map((it) => {
    const hook = findAssetByBase(it.keys.hook, MEDIA);
    const edit = findAssetByBase(it.keys.edit, MEDIA);
    const thumb = findAssetByBase(it.keys.thumb, MEDIA);
    return { ...it, media: { hook, edit, thumb } };
  });

  if (!items || items.length === 0) return null; // Safety check

  return (
    <section id="work" className="py-20 relative overflow-hidden" style={{ background: "var(--surface)" }}>
      {/* ... (full JSX for CaseStudies as in the prompt) ... */}
      {/* ... (Header, Cards, Modal) ... */}
    </section>
  );
};

export default CaseStudies;