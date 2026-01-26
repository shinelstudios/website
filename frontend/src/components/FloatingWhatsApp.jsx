import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, ChevronUp } from "lucide-react";

/**
 * FloatingWhatsApp
 * - Mobile only floating button.
 * - Dynamic positioning: shifts up if QuickQuoteBar is visible.
 * - Smart visibility: hides on ROI calculator, near footer, and on keyboard active.
 */
const FloatingWhatsApp = () => {
  const [visible, setVisible] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [qqbVisible, setQqbVisible] = useState(false);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

  // Listen for QuickQuoteBar visibility to adjust offset
  useEffect(() => {
    const onQqb = (e) => setQqbVisible(Boolean(e?.detail?.visible));
    document.addEventListener("qqb:visible", onQqb);
    return () => document.removeEventListener("qqb:visible", onQqb);
  }, []);

  // Smart visibility logic
  useEffect(() => {
    const handleScroll = () => {
      if (!ticking.current) {
        window.requestAnimationFrame(() => {
          const y = window.scrollY;
          // Show after 300px scroll
          if (y > 300) {
            setVisible(true);
          } else {
            setVisible(false);
          }

          // Minimize on scroll down, maximize on scroll up
          if (y > lastScrollY.current + 50) {
            setMinimized(true);
            lastScrollY.current = y;
          } else if (y < lastScrollY.current - 50) {
            setMinimized(false);
            lastScrollY.current = y;
          }

          ticking.current = false;
        });
        ticking.current = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const whatsappUrl = "https://wa.me/918968141585?text=" + encodeURIComponent("Hi Shinel Studios! I want to grow my channel. Can we talk?");

  if (!visible) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="md:hidden fixed z-[60]"
        style={{
          right: '16px',
          bottom: qqbVisible ? '92px' : '20px',
          willChange: 'transform, bottom',
        }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{
          scale: minimized ? 0.8 : 1,
          opacity: 1,
          bottom: qqbVisible ? '92px' : '20px'
        }}
        exit={{ scale: 0, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
      >
        <motion.a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center w-14 h-14 rounded-full shadow-2xl relative group"
          style={{
            background: "#25D366",
            boxShadow: "0 8px 24px rgba(37, 211, 102, 0.4)"
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <MessageCircle size={28} color="white" fill="white" />

          <AnimatePresence>
            {!minimized && (
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="absolute right-16 bg-white py-2 px-4 rounded-xl shadow-xl whitespace-nowrap text-sm font-bold border border-gray-100"
                style={{ color: "#25D366" }}
              >
                Chat on WhatsApp
                <div className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-3 h-3 bg-white rotate-45 border-t border-r border-gray-100" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Pulse effect */}
          {!reduceMotion && (
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-[#25D366]"
              animate={{ scale: [1, 1.4], opacity: [0.5, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          )}
        </motion.a>
      </motion.div>
    </AnimatePresence>
  );
};

export default FloatingWhatsApp;