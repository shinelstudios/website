import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Quote, BarChart3, Wand2, X, Play, ExternalLink } from "lucide-react";
import { findAssetByBase } from "../lib/helpers"; // Import helper

const TestimonialsSection = ({ isDark }) => {
  const reduceMotion = false;

  const TESTIMONIALS = [ /* ... (full TESTIMONIALS array) ... */];
  const getAvatar = (key) => findAssetByBase(key);
  const [openVideo, setOpenVideo] = useState(null);
  const [tab, setTab] = useState("all");
  const items = useMemo(
    () => (tab === "all" ? TESTIMONIALS : TESTIMONIALS.filter((t) => t.type === tab)),
    [tab, TESTIMONIALS] // Added TESTIMONIALS to dep array
  );

  const AIPill = ({ children }) => { /* ... */ };
  const MetricPill = ({ label, value, color }) => { /* ... */ };
  const HeaderRow = ({ name, tag, avatarKey, color }) => { /* ... */ };
  const VideoCard = ({ item, i }) => { /* ... */ };
  const AnalyticsCard = ({ item, i }) => { /* ... */ };

  if (!items || items.length === 0) return null; // Safety check

  return (
    <section
      id="testimonials"
      className="py-24 relative overflow-hidden"
      style={{
        background: "var(--surface-alt)",
        contentVisibility: "auto",
        containIntrinsicSize: "900px",
      }}
    >
      {/* ... (full JSX for TestimonialsSection as in the prompt) ... */}
      {/* ... (Heading, Tabs, Grid, Modal Player) ... */}
    </section>
  );
};

export default TestimonialsSection;