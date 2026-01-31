import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, ChevronUp } from "lucide-react";

import { useLocation } from "react-router-dom";

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
  const location = useLocation();

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
      // Check path on every scroll (or better, use location prop)
      // If we are on dashboard, force hidden
      if (location.pathname.startsWith("/dashboard")) {
        setVisible(false);
        return;
      }

      if (!ticking.current) {
        window.requestAnimationFrame(() => {
          const y = window.scrollY;
          // Show after 100px scroll (faster)
          if (y > 100) {
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

    // Initial check on mount/route change
    if (location.pathname.startsWith("/dashboard")) {
      setVisible(false);
    } else {
      handleScroll(); // Check if we are already scrolled
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [location.pathname]); // Re-run when path changes

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
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            style={{
              transition: 'all 0.3s ease',
            }}
          >
            <path
              d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"
              fill="white"
            />
          </svg>

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