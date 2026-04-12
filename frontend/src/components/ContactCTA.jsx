import React from "react";
import { motion } from "framer-motion";
import { track } from "../lib/helpers"; // Import helper

const ContactCTA = ({ onBook }) => {
  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

  const buildWhatsApp = () => { /* ... */ };
  const buildMailto = () => { /* ... */ };
  const handleBook = () => {
    track("cta_click_audit", { src: "contact" });
    onBook?.();
  };

  return (
    <section
      id="contact"
      className="w-full py-16 md:py-20 relative overflow-hidden"
      style={{
        backgroundImage: "linear-gradient(90deg, var(--orange), #ff9357)",
      }}
      aria-labelledby="contact-heading"
    >
      {/* ... (full JSX for ContactCTA as in the prompt) ... */}
    </section>
  );
};

export default ContactCTA;