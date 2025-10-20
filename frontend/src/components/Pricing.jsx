import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { formatINR, track } from "../lib/helpers"; // Import helpers

const Pricing = ({ onOpenCalendly }) => {
  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  
  // ... (All logic and state from the prompt: isMobile, CATS, cat, RATE_CARD, PLANS, POPULAR, etc.) ...
  
  const isTouch =
     typeof window !== "undefined" &&
     window.matchMedia?.("(hover: none)").matches;

   // Detect mobile viewport (≤ 640px) for carousel mode
   const [isMobile, setIsMobile] = React.useState(() =>
     typeof window !== "undefined" ? window.matchMedia("(max-width: 640px)").matches : false
   );
   React.useEffect(() => {
     if (typeof window === "undefined") return;
     const mq = window.matchMedia("(max-width: 640px)");
     const onChange = (e) => setIsMobile(e.matches);
     mq.addEventListener?.("change", onChange);
     return () => mq.removeEventListener?.("change", onChange);
   }, []);

   /* ---------- Tabs ---------- */
   const CATS = [ /* ... */ ];
   const [cat, setCat] = React.useState("gaming");
   const RATE_CARD = { /* ... */ };
   const estimatePlan = (catKey, spec = {}) => { /* ... */ };
   const PLANS = { /* ... */ };
   const POPULAR = { /* ... */ };
   const plans = PLANS[cat] || [];
   const [openIdx, setOpenIdx] = React.useState(null);
   const handleCTA = (plan) => { /* ... */ };
   const PriceBadge = ({ priceInr, billing }) => { /* ... */ };
   const railRef = React.useRef(null);
   const [idx, setIdx] = React.useState(0);
   const scrollToIndex = (i) => { /* ... */ };
   const onPrev = () => scrollToIndex(idx - 1);
   const onNext = () => scrollToIndex(idx + 1);
   React.useEffect(() => { /* ... */ }, [isMobile, plans.length]);
   const onKeyDownCarousel = (e) => { /* ... */ };


  return (
    <section
      id="pricing"
      className="py-18 md:py-20 relative overflow-hidden"
      style={{ background: "var(--surface)" }}
      aria-labelledby="pricing-heading"
    >
      {/* ... (full JSX for Pricing section as in the prompt) ... */}
      {/* ... (Ambient glows, Header, Category Tabs, Desktop Grid, Mobile Carousel, Add-ons) ... */}
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </section>
  );
};

export default Pricing;