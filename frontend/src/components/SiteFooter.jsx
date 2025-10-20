import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Facebook, Twitter, Instagram, Linkedin, Mail, MessageCircle,
  Send, Heart, Sparkles, TrendingUp, Users, Award, Clock,
  CheckCircle2, ArrowUpRight, ExternalLink, MapPin, AlertTriangle,
} from "lucide-react";
import { motion } from "framer-motion";
import logoLight from "../assets/logo_light.png"; // WHITE logo (dark bg)
import logoDark from "../assets/logo_dark.png";   // DARK logo (light bg)

/* -------------------------------- analytics (no-op safe) ------------------------------- */
const track = (ev, detail = {}) => {
  try { window.dispatchEvent(new CustomEvent("analytics", { detail: { ev, ...detail } })); } catch {}
};

/* -------------------------------- theme sync helper ------------------------------------ */
/**
 * [IMPROVED] Lightweight theme hook.
 * Avoids observers and excessive listeners for better performance.
 * Checks prop, html.dark class, and media query.
 */
function useThemeMode(isDarkProp) {
  const compute = useCallback(() => {
    try {
      if (typeof isDarkProp === "boolean") return isDarkProp ? "dark" : "light";
      if (document.documentElement.classList.contains("dark")) return "dark";
      if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) return "dark";
    } catch {}
    return "light";
  }, [isDarkProp]);

  const [mode, setMode] = useState("light");

  useEffect(() => {
    setMode(compute());
    
    // Listen to media query changes if prop isn't set
    if (typeof isDarkProp === "boolean") return;
    
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    const onMedia = () => setMode(compute());
    try { mq?.addEventListener?.("change", onMedia); } catch { mq?.addListener?.(onMedia); }
    
    return () => {
      try { mq?.removeEventListener?.("change", onMedia); } catch { mq?.removeListener?.(onMedia); }
    };
  }, [isDarkProp, compute]);

  return mode;
}

/* =======================================================================================
    Footer
======================================================================================= */
const SiteFooter = ({
  isDark,
  forceCompact = false,
  reserveForSticky = true,
}) => {
  const theme = useThemeMode(isDark);
  const isDarkMode = theme === "dark";

  const location = useLocation?.() || { pathname: window.location.pathname || "/" };
  const onHome = location.pathname === "/";
  const compact = forceCompact || onHome;

  // [IMPROVED] Newsletter form state
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // 'idle' | 'loading' | 'success' | 'error'
  const [msg, setMsg] = useState("");

  const [isMobile, setIsMobile] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const footerRef = useRef(null);

  /* single IntersectionObserver (fast) */
  useEffect(() => {
    if (!footerRef.current || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setIsVisible(true), { threshold: 0.06 });
    io.observe(footerRef.current);
    return () => io.disconnect();
  }, []);

  /* screen size for sticky spacing */
  useEffect(() => {
    const mq = window.matchMedia?.("(max-width: 767px)");
    const on = () => setIsMobile(!!mq?.matches);
    on(); mq?.addEventListener?.("change", on);
    return () => mq?.removeEventListener?.("change", on);
  }, []);

  const reservedPad = reserveForSticky && isMobile ? "calc(64px + env(safe-area-inset-bottom,0))" : "0";
  const logoSrc = isDarkMode ? logoLight : logoDark;

  const SOCIALS = useMemo(() => ([
    { label: "Instagram", href: "https://www.instagram.com/shinel.studios/", Icon: Instagram, color: "#E4405F" },
    { label: "LinkedIn",  href: "https://www.linkedin.com/company/shinel-studios/", Icon: Linkedin,  color: "#0A66C2" },
    { label: "Facebook",  href: "https://www.facebook.com/", Icon: Facebook, color: "#1877F2" },
    { label: "Twitter / X", href: "https://twitter.com/", Icon: Twitter, color: "#1DA1F2" },
  ]), []);

  const FEATURES = useMemo(() => ([
    { icon: Users,      text: "20+ Active Clients" },
    { icon: TrendingUp, text: "7M+ Views Driven" },
    { icon: Award,      text: "+40% CTR Boost" },
    { icon: Clock,      text: "48–72 hr Turnaround" },
  ]), []);

  // [IMPROVED] Newsletter submission logic
  const onSubscribe = async (e) => {
    e.preventDefault();
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test((email || "").trim());
    if (!ok) {
      setStatus("error");
      setMsg("Please enter a valid email.");
      return;
    }
    
    setStatus("loading"); setMsg("");
    try {
      track("cta_click_subscribe", { src: "footer", email });
      const endpoint = import.meta?.env?.VITE_NEWSLETTER_ENDPOINT;
      
      if (endpoint) {
        // API endpoint logic
        const res = await fetch(endpoint, { 
          method: "POST", 
          headers: { "Content-Type": "application/json" }, 
          body: JSON.stringify({ email, source: "footer" }) 
        });
        if (!res.ok) throw new Error("Server error");
        
      } else {
        // Fallback mailto: logic
        console.warn("VITE_NEWSLETTER_ENDPOINT not set, using mailto: fallback.");
        const to = "hello@shinelstudiosofficial.com";
        window.open(`mailto:${to}?subject=${encodeURIComponent("Newsletter Subscribe")}&body=${encodeURIComponent(`Please subscribe me.\nEmail: ${email}\nSource: footer`)}`, "_blank");
        // Simulate success for mailto
        await new Promise(res => setTimeout(res, 500)); 
      }
      
      setStatus("success");
      setMsg("Thanks for subscribing! ✨");
      setEmail("");
      
    } catch (err) {
      setStatus("error");
      setMsg("Could not subscribe. Please try again.");
      console.error("Subscription error:", err);
      
    }
  };

  /* theme vars */
  const vars = {
    "--orange": "var(--orange, #E85002)",
    "--footer-bg": isDarkMode ? "var(--bg, #0B0B0B)" : "var(--bg, #FFFFFF)",
    "--footer-text": isDarkMode ? "rgba(255,255,255,0.92)" : "rgba(15,15,15,0.92)",
    "--footer-muted": isDarkMode ? "rgba(255,255,255,0.66)" : "rgba(15,15,15,0.66)",
    "--card-bg": isDarkMode ? "rgba(255,255,255,0.04)" : "rgba(15,15,15,0.05)",
    "--card-border": isDarkMode ? "rgba(255,255,255,0.10)" : "rgba(15,15,15,0.10)",
    "--divider": isDarkMode ? "rgba(255,255,255,0.12)" : "rgba(15,15,15,0.12)",
  };

  /* right column shown in compact (balances the grid on home) */
  const CompactRight = () => (
    <aside className={isVisible ? "fade-in-delay-1" : ""}>
      <h3 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ color: "var(--footer-text)" }}>
        <ArrowUpRight size={18} style={{ color: "var(--orange)" }} />
        Reach Us
      </h3>
      <div className="rounded-xl p-4" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
        <a
          href="mailto:hello@shinelstudiosofficial.com"
          className="flex items-center gap-2 text-sm mb-3"
          style={{ color: "var(--footer-muted)" }}
          onClick={() => track("cta_click_contact", { via: "email", place: "footer_compact_right" })}
        >
          <Mail size={16} style={{ color: "var(--orange)" }} />
          hello@shinelstudiosofficial.com
        </a>
        <a
          href="https://wa.me/918838179165"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 text-sm mb-3"
          style={{ color: "var(--footer-muted)" }}
          onClick={() => track("cta_click_contact", { via: "whatsapp", place: "footer_compact_right" })}
        >
          <MessageCircle size={16} style={{ color: "#25D366" }} />
          WhatsApp Us
        </a>
        <div className="flex items-center gap-2 text-sm" style={{ color: "var(--footer-muted)" }}>
          <MapPin size={16} style={{ color: "var(--orange)" }} />
          Punjab, India
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          {/* [FIX] Use React Router Link for hash links */}
          <Link to="/#contact" className="text-center px-3 py-2 rounded-lg text-sm font-semibold btn-elevate"
             style={{ background: "linear-gradient(135deg, var(--orange) 0%, #ff6b35 100%)", color: "#fff" }}>
            Get Free Audit
          </Link>
          <Link to="/#contact" className="text-center px-3 py-2 rounded-lg text-sm font-semibold"
             style={{ background: "var(--card-bg)", color: "var(--orange)", border: "1px solid var(--card-border)" }}>
            Get Quote
          </Link>
        </div>
      </div>
    </aside>
  );

  return (
    <footer
      ref={footerRef}
      role="contentinfo"
      style={{
        ...vars,
        background:
          "radial-gradient(1200px 400px at 10% -10%, rgba(232,80,2,0.08), transparent 60%), radial-gradient(1200px 400px at 90% -10%, rgba(255,147,87,0.05), transparent 60%), var(--footer-bg)",
        color: "var(--footer-text)",
        paddingBottom: reservedPad,
        position: "relative",
        overflow: "hidden",
        backgroundPosition: "0% 0%", // [NEW] Base for animation
        animation: "footerShimmer 25s ease-in-out infinite alternate", // [NEW]
      }}
    >
      {/* top accent (no glow to keep it light on GPU) */}
      <div style={{ height: 2, background: "linear-gradient(90deg, transparent, var(--orange), transparent)" }} />

      <div className={`container mx-auto px-4 ${compact ? "pt-12 pb-10" : "pt-20 pb-16"}`} style={{ position: "relative", zIndex: 1 }}>
        {/* Balanced grids */}
        <div className={compact ? "grid grid-cols-1 md:grid-cols-2 gap-12"
                                : "grid grid-cols-1 md:grid-cols-[1.2fr_.8fr_1fr] gap-16 lg:gap-20"}>
          {/* BRAND / LEFT */}
          <div className={isVisible ? "fade-in" : ""}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
              <motion.img
                src={logoSrc}
                alt="Shinel Studios"
                className="w-48 sm:w-56 md:w-64 h-auto object-contain"
                style={{ 
                  maxWidth: "100%",
                  imageRendering: "-webkit-optimize-contrast" // [NEW]
                }}
                loading="lazy"   // [NEW]
                decoding="async" // [NEW]
                initial={{ opacity: 0, scale: 0.96 }}
                animate={isVisible ? { opacity: 1, scale: 1 } : {}}
                transition={{ duration: 0.45, ease: "easeOut" }}
                whileHover={{ scale: 1.03 }}
                draggable="false"
              />
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
                style={{
                  background: "rgba(232,80,2,0.15)",
                  color: "var(--orange)",
                  border: "1px solid rgba(232,80,2,0.3)",
                  backdropFilter: "blur(6px)",
                  WebkitBackdropFilter: "blur(6px)", // [NEW]
                }}
              >
                <Sparkles size={14} /> AI-first Studio
              </span>
            </div>

            <p className="text-base mb-3" style={{ color: "var(--footer-muted)" }}>
              We help creators & brands shine through unforgettable visuals and smart strategy.
            </p>

            <p className="text-lg font-semibold mb-6 flex items-center gap-2" style={{ color: "var(--orange)" }}>
              <Heart size={18} /> <em>Where Ideas Shine</em>
            </p>

            {!compact && (
              <div className="grid grid-cols-2 gap-3 mb-6">
                {FEATURES.map((f, i) => (
                  <motion.div
                    key={f.text}
                    className="flex items-center gap-2 p-2 rounded-lg"
                    style={{ 
                      background: "var(--card-bg)", 
                      border: "1px solid var(--card-border)",
                      willChange: "transform, opacity", // [NEW]
                    }}
                    initial={{ opacity: 0, y: 10 }}
                    animate={isVisible ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.35, delay: i * 0.06 }}
                  >
                    <f.icon size={16} style={{ color: "var(--orange)" }} />
                    <span className="text-xs" style={{ color: "var(--footer-muted)" }}>{f.text}</span>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Socials (hover state now in CSS) */}
            <div className="flex gap-3 mb-6">
              {SOCIALS.map(({ label, href, Icon, color }, i) => (
                <motion.a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={label}
                  title={label}
                  className="social-link"
                  data-hover-color={color} // [NEW] Pass color to CSS
                  onClick={() => track("cta_click_social", { src: "footer", label })}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={isVisible ? { opacity: 1, scale: 1 } : {}}
                  transition={{ duration: 0.25, delay: i * 0.04 }}
                  whileHover={{ y: -2, scale: 1.06 }}
                  whileTap={{ scale: 0.97 }}
                  style={{
                    width: 44,
                    height: 44,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 12,
                    background: "var(--card-bg)",
                    border: "1px solid var(--card-border)",
                    color: "var(--footer-text)",
                  }}
                >
                  <Icon size={20} />
                </motion.a>
              ))}
            </div>
          </div>

          {/* RIGHT column for COMPACT (balances layout on home) */}
          {compact && <CompactRight />}

          {/* QUICK LINKS */}
          {!compact && (
            <nav aria-label="Footer navigation" className={isVisible ? "fade-in-delay-1" : ""}>
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2" style={{ color: "var(--footer-text)" }}>
                <ArrowUpRight size={20} style={{ color: "var(--orange)" }} /> Quick Links
              </h3>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { t: "Home", href: "/#home", icon: Sparkles },
                  { t: "Services", href: "/#services", icon: Award },
                  { t: "Our Work", href: "/#work", icon: TrendingUp },
                  { t: "Contact", href: "/#contact", icon: Mail },
                  { t: "Video Editing", href: "/video-editing" },
                  { t: "GFX", href: "/gfx" },
                  { t: "Thumbnails", href: "/thumbnails" },
                  { t: "Shorts", href: "/shorts" },
                ].map((l) => (
                  <li key={l.t}>
                    <Link
                      to={l.href}
                      className="inline-flex items-center gap-2 group py-1.5" // [MODIFIED] Added py-1.5
                      style={{ color: "var(--footer-muted)" }}
                      onClick={() => track("cta_click_footer_link", { label: l.t })}
                    >
                      {l.icon && <l.icon size={14} style={{ color: "var(--orange)" }} />}
                      <span className="group-hover:translate-x-1 transition-transform duration-200">{l.t}</span>
                      <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "var(--orange)" }} />
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}

          {/* NEWSLETTER */}
          {!compact && (
            <div className={isVisible ? "fade-in-delay-2" : ""}>
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2" style={{ color: "var(--footer-text)" }}>
                <Send size={20} style={{ color: "var(--orange)" }} /> Stay Updated
              </h3>
              <p className="mb-4" style={{ color: "var(--footer-muted)" }}>
                Fresh ideas, thumbnail tests, tools & case studies. 1–2× / month.
              </p>

              <form className="space-y-3" onSubmit={onSubscribe} noValidate>
                <div className="relative">
                  <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--orange)", opacity: 0.85 }} />
                  <input
                    id="newsletter-email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setStatus("idle"); setMsg(""); }}
                    className="w-full pl-11 pr-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--orange)] transition-all duration-200"
                    style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", color: "var(--footer-text)" }}
                    autoComplete="email"
                    aria-describedby="newsletter-help"
                  />
                </div>
                <motion.button
                  type="submit"
                  disabled={status === "loading"}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full px-5 py-3 rounded-xl text-white font-semibold disabled:opacity-70 flex items-center justify-center gap-2 transition-transform duration-150"
                  style={{ background: "linear-gradient(135deg, var(--orange) 0%, #ff6b35 100%)" }}
                >
                  {status === "loading" ? "Subscribing..." : (<><CheckCircle2 size={18} /> Subscribe Now</>)}
                </motion.button>
              </form>

              {/* [IMPROVED] Newsletter status/helper text */}
              <div id="newsletter-help" className="mt-3 text-xs" role="status" aria-live="polite">
                {status === "idle" && (
                  <span className="flex items-center gap-1" style={{ color: "var(--footer-muted)" }}>
                    <CheckCircle2 size={12} style={{ color: "var(--orange)" }} /> No spam. Unsubscribe anytime.
                  </span>
                )}
                {status === "success" && (
                  <span className="flex items-center gap-1" style={{ color: "var(--orange)" }}>
                    <CheckCircle2 size={12} /> {msg}
                  </span>
                )}
                {status === "error" && (
                  <span className="flex items-center gap-1" style={{ color: "#ff6b6b" }}>
                    <AlertTriangle size={12} /> {msg}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* LEGAL BAR */}
        <div className="mt-16 pt-8" style={{ borderTop: "1px solid var(--divider)" }}>
          <div className="flex flex-col md:flex-row items-center justify-center md:justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3 flex-wrap justify-center">
              <p className="text-sm" style={{ color: "var(--footer-muted)" }}>© {new Date().getFullYear()} Shinel Studios™</p>
              <span className="hidden md:inline" style={{ color: "var(--footer-muted)" }}>·</span>
              <p className="text-sm" style={{ color: "var(--footer-muted)" }}>All rights reserved</p>
              <span className="hidden md:inline" style={{ color: "var(--footer-muted)" }}>·</span>
              <p className="text-sm" style={{ color: "var(--footer-muted)" }}>Where Ideas Shine</p>
            </div>

            <nav aria-label="Legal pages" className="flex items-center gap-3 justify-center">
              <Link
                to="/privacy"
                className="text-sm hover:translate-y-[-2px] transition-transform duration-150"
                style={{ color: "var(--footer-muted)" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--footer-text)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--footer-muted)")}
                onClick={() => track("cta_click_legal", { page: "privacy" })}
              >
                Privacy
              </Link>
              <span style={{ color: "var(--footer-muted)" }}>·</span>
              <Link
                to="/terms"
                className="text-sm hover:translate-y-[-2px] transition-transform duration-150"
                style={{ color: "var(--footer-muted)" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--footer-text)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--footer-muted)")}
                onClick={() => track("cta_click_legal", { page: "terms" })}
              >
                Terms
              </Link>
            </nav>
          </div>
        </div>
      </div>

      {/* Animations (transform/opacity only) */}
      <style>{`
        /* [NEW] Footer background shimmer */
        @keyframes footerShimmer {
          from { background-position: 0% 0%; }
          to   { background-position: 100% 100%; }
        }
      
        /* [MODIFIED] Added will-change */
        .fade-in { 
          animation: fadeIn .5s ease-out forwards; 
          will-change: transform, opacity;
        }
        .fade-in-delay-1 { 
          animation: fadeIn .5s ease-out .15s forwards; 
          opacity: 0; 
          will-change: transform, opacity;
        }
        .fade-in-delay-2 { 
          animation: fadeIn .5s ease-out .30s forwards; 
          opacity: 0; 
          will-change: transform, opacity;
        }
        @keyframes fadeIn { 
          from { opacity:0; transform: translateY(14px); } 
          to   { opacity:1; transform: translateY(0); } 
        }
        
        /* [MODIFIED] CSS-driven social icon hover state */
        .social-link { 
          will-change: transform; /* opacity is not changing */
          transform: translateZ(0); 
          transition: background-color .18s ease, color .18s ease, border-color .18s ease;
        }
        .social-link:hover {
          background: var(--hover-color, var(--orange)) !important;
          border-color: var(--hover-color, var(--orange)) !important;
          color: #fff !important;
        }
        /* [NEW] Set --hover-color from data attribute */
        .social-link[data-hover-color] {
          --hover-color: var(--data-hover-color);
        }

        .btn-elevate { 
          will-change: transform; 
          transform: translateZ(0); 
        }
        
        @media (prefers-reduced-motion: reduce) {
          footer { animation: none !important; }
          .fade-in, .fade-in-delay-1, .fade-in-delay-2 { 
            animation: none !important; 
            opacity: 1 !important; 
          }
          .social-link, .btn-elevate, a { 
            transition: none !important; 
          }
        }
      `}</style>
    </footer>
  );
};

export default SiteFooter;