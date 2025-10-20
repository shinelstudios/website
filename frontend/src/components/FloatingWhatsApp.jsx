import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

const FloatingWhatsApp = () => {
  const [visible, setVisible] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [hideFromROI, setHideFromROI] = useState(false);
  const lastScrollY = useRef(0);
  const hideTimeout = useRef(null);
  const ticking = useRef(false);

  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

  // ... (All useEffects and handlers from the prompt) ...
  // Smart visibility logic
  useEffect(() => { /* ... */ }, [hideFromROI]);
  // Hide near footer
  useEffect(() => { /* ... */ }, []);
  // Hide on keyboard
  useEffect(() => { /* ... */ }, []);
  // Listen to modal events
  useEffect(() => { /* ... */ }, []);

  const whatsappUrl = "https://wa.me/918968141585?text=" + encodeURIComponent("Hi Shinel Studios! I want to grow my channel. Can we talk?");
  
  const handleClick = () => { /* ... */ };
  const handleMouseEnter = () => { /* ... */ };

  if (!visible) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="md:hidden fixed z-50"
        style={{
          right: 'max(16px, env(safe-area-inset-right, 16px))',
          bottom: 'max(20px, calc(env(safe-area-inset-bottom, 16px) + 4px))',
          willChange: 'transform, opacity',
          transform: 'translate3d(0, 0, 0)',
        }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: minimized ? 0.9 : 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 25, mass: 0.8 }}
      >
        {/* ... (full JSX for FloatingWhatsApp button as in the prompt) ... */}
      </motion.div>
    </AnimatePresence>
  );
};

export default FloatingWhatsApp;