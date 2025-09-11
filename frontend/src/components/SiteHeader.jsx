// src/components/SiteHeader.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Sun, Moon, Menu, X, ChevronDown } from "lucide-react";

import logoLight from "../assets/logo_light.png";
import logoDark from "../assets/logo_dark.png";

const animations = {
  fadeDown: {
    hidden: { opacity: 0, y: -12 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.35, ease: "easeOut" },
    },
  },
};

// --- tiny jwt parser (no crypto) to read { email, role, exp } ---
function parseJwt(token) {
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decodeURIComponent(escape(json)));
  } catch {
    return null;
  }
}

// --- auth lookup (reads JWT token + stored email) ---
function getAuthState() {
  try {
    const token = localStorage.getItem("token");
    const emailLS = localStorage.getItem("userEmail");
    if (!token) return { isAuthed: false, email: null, role: null, exp: null };

    const payload = parseJwt(token) || {};
    const exp = typeof payload.exp === "number" ? payload.exp : null;
    const now = Math.floor(Date.now() / 1000);
    if (exp && exp <= now) {
      localStorage.removeItem("token");
      return { isAuthed: false, email: null, role: null, exp: null };
    }

    const email = (payload.email || emailLS || "").trim() || null;
    const role = payload.role || null;
    return { isAuthed: true, email, role, exp };
  } catch {
    return { isAuthed: false, email: null, role: null, exp: null };
  }
}

// --- favicon swapper ---
function setFaviconForTheme(isDark) {
  try {
    const light = document.querySelector('link[rel="icon"][data-theme="light"]');
    const dark = document.querySelector('link[rel="icon"][data-theme="dark"]');
    if (light && dark) {
      light.disabled = !!isDark;
      dark.disabled = !isDark;
    }
    const link =
      document.getElementById("favicon") ||
      document.querySelector('link[rel="icon"]:not([data-theme])');
    if (link)
      link.href = isDark
        ? "/favicon-dark-32x32.png"
        : "/favicon-light-32x32.png";
  } catch {}
}

const SiteHeader = ({ isDark, setIsDark }) => {
  const [workOpen, setWorkOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hovered, setHovered] = useState(null);
  const [active, setActive] = useState("Home");
  const [progress, setProgress] = useState(0);

  const [auth, setAuth] = useState(getAuthState());

  const headerRef = useRef(null);
  const menuPanelRef = useRef(null);
  const workRef = useRef(null);
  const [headerH, setHeaderH] = useState(76);

  useEffect(() => {
    setFaviconForTheme(isDark);
  }, [isDark]);

  useEffect(() => {
    const update = () => setAuth(getAuthState());
    window.addEventListener("storage", update);
    window.addEventListener("auth:changed", update);
    return () => {
      window.removeEventListener("storage", update);
      window.removeEventListener("auth:changed", update);
    };
  }, []);

  useEffect(() => {
    if (!auth.isAuthed || !auth.exp) return;
    const now = Math.floor(Date.now() / 1000);
    const ms = Math.max(0, (auth.exp - now) * 1000 + 1000);
    const t = setTimeout(() => {
      localStorage.removeItem("token");
      window.dispatchEvent(new Event("auth:changed"));
    }, ms);
    return () => clearTimeout(t);
  }, [auth.isAuthed, auth.exp]);

  const sections = useMemo(
    () => ["Home", "Services", "Testimonials", "Contact"],
    []
  );
  const workItems = useMemo(
    () => [
      { name: "Video Editing", href: "/video-editing" },
      { name: "GFX", href: "/gfx" },
      { name: "Thumbnails", href: "/thumbnails" },
      { name: "Shorts", href: "/shorts" },
    ],
    []
  );

  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

  // scroll progress
  const lastAnimFrame = useRef(null);
  useEffect(() => {
    const tick = () => {
      const y = window.scrollY || 0;
      setScrolled(y > 8);
      const doc = document.documentElement;
      const h = Math.max(1, doc.scrollHeight - window.innerHeight);
      setProgress(Math.min(100, (y / h) * 100));
      lastAnimFrame.current = null;
    };
    const onScroll = () => {
      if (lastAnimFrame.current == null)
        lastAnimFrame.current = requestAnimationFrame(tick);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    tick();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (lastAnimFrame.current) cancelAnimationFrame(lastAnimFrame.current);
    };
  }, []);

  // header height
  useEffect(() => {
    if (!headerRef.current || !("ResizeObserver" in window)) return;
    const ro = new ResizeObserver((entries) => {
      const h = Math.round(entries[0].contentRect.height) || 76;
      setHeaderH(h);
      const root = document.documentElement;
      root.style.setProperty("--header-h", `${h}px`);
      root.style.setProperty("scroll-padding-top", `${h + 8}px`);
    });
    ro.observe(headerRef.current);
    return () => ro.disconnect();
  }, []);
  useEffect(() => {
    document.documentElement.style.setProperty("--header-offset", `${headerH}px`);
  }, [headerH]);

  // section highlight
  useEffect(() => {
    const ids = sections.map((s) => s.toLowerCase());
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) {
          const id = visible.target.id || "";
          const match = sections.find((s) => s.toLowerCase() === id);
          if (match) setActive(match);
        }
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] }
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    });
    const onHash = () => {
      const hash = (location.hash || "#home").replace("#", "");
      const match = sections.find((s) => s.toLowerCase() === hash);
      if (match) setActive(match);
    };
    window.addEventListener("hashchange", onHash);
    onHash();
    return () => {
      io.disconnect();
      window.removeEventListener("hashchange", onHash);
    };
  }, [sections]);

  // close dropdown on outside / ESC (fixed double click by using pointerdown)
  useEffect(() => {
    const onDocDown = (e) => {
      if (!workOpen) return;
      if (workRef.current && !workRef.current.contains(e.target))
        setWorkOpen(false);
    };
    const onEsc = (e) => {
      if (e.key === "Escape") {
        setWorkOpen(false);
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("pointerdown", onDocDown);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("pointerdown", onDocDown);
      document.removeEventListener("keydown", onEsc);
    };
  }, [workOpen]);

  // lock body scroll
  useEffect(() => {
    const lock = (v) => {
      document.documentElement.style.overflow = v ? "hidden" : "";
      document.body.style.overscrollBehavior = v ? "contain" : "";
    };
    lock(isMenuOpen);
    if (isMenuOpen && menuPanelRef.current) {
      const first = menuPanelRef.current.querySelector(
        'a,button,[tabindex]:not([tabindex="-1"])'
      );
      first?.focus?.();
    }
    return () => lock(false);
  }, [isMenuOpen]);

  const NavLink = ({ label, to, active }) => {
    const isActive = active === label;
    return (
      <motion.div whileHover={{ y: -1 }} transition={{ duration: 0.15 }}>
        <Link
          to={to}
          className="relative px-1 text-[15px] lg:text-base focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)] rounded"
          aria-current={isActive ? "page" : undefined}
          onMouseEnter={() => setHovered(label)}
          onMouseLeave={() => setHovered(null)}
          style={{ color: isActive ? "var(--nav-hover)" : "var(--nav-link)" }}
        >
          <span
            className="absolute left-0 -bottom-1 h-0.5 bg-[var(--orange)] transition-all duration-200"
            style={{
              width: isActive || hovered === label ? "100%" : "0%",
            }}
          />
          <span>{label}</span>
        </Link>
      </motion.div>
    );
  };

  const logoSrc = isDark ? logoLight : logoDark;
  const avatarInitial = (auth.email || "?").trim().charAt(0).toUpperCase();

  return (
    <motion.div className="fixed top-0 w-full z-50">
      <motion.header
        ref={headerRef}
        variants={animations.fadeDown}
        initial="hidden"
        animate="visible"
        role="banner"
        style={{
          background: "var(--header-bg)",
          paddingTop: "max(0px, env(safe-area-inset-top))",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          borderBottom: "0",
          boxShadow: scrolled ? "0 6px 18px rgba(0,0,0,0.16)" : "none",
          transition: "box-shadow .25s ease",
          overflow: "visible",
        }}
      >
        {/* progress bar */}
        <div
          className="absolute left-0 top-0 h-[1px] origin-left"
          style={{
            width: "100%",
            transform: `scaleX(${Math.max(
              0,
              Math.min(1, progress / 100)
            ).toFixed(4)})`,
            background: "linear-gradient(90deg, var(--orange), #ff9357)",
            transition: reduceMotion ? "none" : "transform .08s linear",
          }}
          aria-hidden="true"
        />

        {/* nav row */}
        <nav
          className="container mx-auto px-4 flex items-center justify-between"
          style={{
            paddingTop: scrolled ? "4px" : "8px",
            paddingBottom: scrolled ? "4px" : "8px",
            transition: "padding .2s ease",
            position: "relative",
            zIndex: 3,
          }}
          aria-label="Primary"
        >
          {/* logo */}
          <Link
            to="/"
            className="flex items-center select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)] rounded"
          >
            <div className="h-12 flex items-center overflow-visible">
              <motion.img
                src={logoSrc}
                alt="Shinel Studios"
                className="h-full w-auto object-contain block select-none"
                style={{
                  transform: "scale(2.8)",
                  transformOrigin: "left center",
                  filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.35))",
                }}
                decoding="async"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              />
            </div>
          </Link>

          {/* desktop links */}
          <div className="hidden md:flex items-center gap-10 relative">
            <NavLink label="Home" to="/" active={active} />
            <NavLink label="Services" to="/#services" active={active} />
            <NavLink label="Testimonials" to="/#testimonials" active={active} />
            <NavLink label="Contact" to="/#contact" active={active} />

            {/* dropdown */}
            <div className="relative" ref={workRef}>
              <motion.button
                type="button"
                className="inline-flex items-center gap-1 text-[15px] lg:text-base focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)] rounded"
                aria-expanded={workOpen}
                aria-haspopup="menu"
                aria-controls="our-work-menu"
                onClick={() => setWorkOpen((v) => !v)}
                initial={false}
                style={{
                  color:
                    hovered === "Our Work" || workOpen
                      ? "var(--nav-hover)"
                      : "var(--nav-link)",
                }}
                whileHover={
                  reduceMotion ? {} : { y: -1, letterSpacing: 0.2 }
                }
                transition={{ duration: 0.22 }}
              >
                <span className="nav-label">Our Work</span>
                <ChevronDown
                  size={16}
                  className={`transition-transform ${
                    workOpen ? "rotate-180" : ""
                  }`}
                />
              </motion.button>

              <AnimatePresence>
                {workOpen && (
                  <motion.div
                    id="our-work-menu"
                    role="menu"
                    initial={{ opacity: 0, scale: 0.96, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: 8 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                    className="absolute left-0 mt-3 w-64 rounded-xl shadow-xl overflow-hidden"
                    style={{
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      zIndex: 4,
                    }}
                  >
                    {workItems.map((item) => (
                      <Link
                        key={item.name}
                        role="menuitem"
                        tabIndex={0}
                        to={item.href}
                        className="block w-full px-4 py-3 text-left font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)]"
                        style={{
                          color: "var(--orange)",
                          transition:
                            "color .15s, background-color .15s",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "var(--orange)";
                          e.currentTarget.style.color = "#fff";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "transparent";
                          e.currentTarget.style.color = "var(--orange)";
                        }}
                        onClick={() => setWorkOpen(false)}
                      >
                        {item.name}
                      </Link>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* right actions */}
          <div className="flex items-center gap-2 md:gap-3">
            {auth.isAuthed ? (
              <>
                <Link
                  to="/studio"
                  className="hidden md:inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)]"
                  style={{
                    background: "linear-gradient(90deg, var(--orange), #ff9357)",
                  }}
                >
                  Studio
                </Link>
                <div
                  className="hidden md:flex items-center gap-2 px-2 py-1 rounded-full"
                  style={{
                    background: "var(--surface-alt)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <div
                    aria-hidden
                    className="h-6 w-6 rounded-full grid place-items-center text-[11px] font-bold"
                    style={{
                      background: "var(--orange)",
                      color: "#fff",
                    }}
                  >
                    {avatarInitial || "?"}
                  </div>
                  <span
                    className="text-sm font-medium"
                    style={{ color: "var(--text)" }}
                  >
                    {auth.email || "Signed in"}
                  </span>
                  {auth.role && (
                    <span
                      className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded"
                      style={{
                        background: "var(--border)",
                        color: "var(--text-muted)",
                      }}
                    >
                      {auth.role}
                    </span>
                  )}
                  <button
                    onClick={() => {
                      localStorage.removeItem("token");
                      localStorage.removeItem("userEmail");
                      window.dispatchEvent(new Event("auth:changed"));
                    }}
                    className="ml-2 underline text-xs"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Logout
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="md:hidden inline-flex items-center rounded-full px-3 py-2 text-sm font-semibold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)]"
                  style={{
                    background: "linear-gradient(90deg, var(--orange), #ff9357)",
                  }}
                >
                  Login
                </Link>
                <motion.div className="hidden md:inline-flex">
                  <Link
                    to="/login"
                    className="inline-flex items-center rounded-full px-5 py-2.5 text-sm font-semibold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)]"
                    style={{
                      background: "linear-gradient(90deg, var(--orange), #ff9357)",
                    }}
                  >
                    Login
                  </Link>
                </motion.div>
              </>
            )}

            {/* theme toggle */}
            {typeof isDark === "boolean" &&
              typeof setIsDark === "function" && (
                <motion.button
                  onClick={() => setIsDark((v) => !v)}
                  className="p-2 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)]"
                  style={{
                    background: isDark
                      ? "rgba(255,255,255,0.1)"
                      : "rgba(0,0,0,0.06)",
                    color: "var(--text)",
                  }}
                  aria-label="Toggle theme"
                  aria-pressed={isDark}
                  whileTap={{ rotate: 180, scale: 0.9 }}
                  transition={{ duration: 0.4 }}
                >
                  {isDark ? <Sun size={20} /> : <Moon size={20} />}
                </motion.button>
              )}

            {/* mobile menu toggle */}
            <motion.button
              onClick={() => setIsMenuOpen((s) => !s)}
              className="md:hidden p-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)] rounded"
              style={{ color: "var(--text)" }}
              aria-label={isMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={isMenuOpen}
              aria-controls="mobile-menu"
              whileTap={{ scale: 0.95 }}
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </motion.button>
          </div>
        </nav>

        {/* mobile menu */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              id="mobile-menu"
              ref={menuPanelRef}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden"
              style={{
                background: "var(--surface)",
                borderTop: "1px solid var(--border)",
                paddingBottom: "max(12px, env(safe-area-inset-bottom))",
                position: "relative",
                zIndex: 3,
              }}
              role="dialog"
              aria-modal="true"
              aria-label="Main menu"
            >
              <nav className="px-4 py-3">
                <ul className="flex flex-col gap-2">
                  {[
                    { label: "Home", to: "/" },
                    { label: "Services", to: "/#services" },
                    { label: "Testimonials", to: "/#testimonials" },
                    { label: "Contact", to: "/#contact" },
                    ...(auth.isAuthed ? [{ label: "Studio", to: "/studio" }] : []),
                  ].map((item) => (
                    <li key={item.label}>
                      <Link
                        to={item.to}
                        onClick={() => setIsMenuOpen(false)}
                        className="block w-full rounded-xl px-4 py-3 text-base font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)]"
                        style={{
                          color: "var(--text)",
                          background: "var(--surface-alt)",
                          border: "1px solid var(--border)",
                        }}
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>

                <div className="mt-4">
                  <div
                    className="px-1 pb-2 text-xs font-semibold uppercase tracking-wider"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Our Work
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { name: "Video Editing", to: "/video-editing" },
                      { name: "Thumbnails", to: "/thumbnails" },
                      { name: "Shorts", to: "/shorts" },
                      { name: "GFX", to: "/gfx" },
                    ].map((item) => (
                      <Link
                        key={item.name}
                        to={item.to}
                        onClick={() => setIsMenuOpen(false)}
                        className="block rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)]"
                        style={{
                          color: "var(--text)",
                          background: "var(--surface-alt)",
                          border: "1px solid var(--border)",
                        }}
                      >
                        {item.name}
                      </Link>
                    ))}
                  </div>
                </div>

                {!auth.isAuthed ? (
                  <div className="mt-6 flex flex-col gap-2">
                    <Link
                      to="/login"
                      onClick={() => setIsMenuOpen(false)}
                      className="block w-full rounded-full px-5 py-3 text-center font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)]"
                      style={{
                        color: "var(--text)",
                        background: "transparent",
                        border: "1px solid var(--border)",
                      }}
                    >
                      Login
                    </Link>
                  </div>
                ) : (
                  <div
                    className="mt-6 flex items-center justify-between px-1 text-sm"
                    style={{ color: "var(--text)" }}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        aria-hidden
                        className="h-6 w-6 rounded-full grid place-items-center text-[11px] font-bold"
                        style={{ background: "var(--orange)", color: "#fff" }}
                      >
                        {avatarInitial || "?"}
                      </div>
                      <span className="truncate max-w-[60%]">
                        {auth.email || "Signed in"}
                      </span>
                      {auth.role && (
                        <span
                          className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded shrink-0"
                          style={{
                            background: "var(--border)",
                            color: "var(--text-muted)",
                          }}
                        >
                          {auth.role}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        localStorage.removeItem("token");
                        localStorage.removeItem("userEmail");
                        window.dispatchEvent(new Event("auth:changed"));
                        setIsMenuOpen(false);
                      }}
                      className="underline text-xs"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </nav>
            </motion.div>
          )}
        </AnimatePresence>

        <TrustBar />
      </motion.header>
    </motion.div>
  );
};

// --- TrustBar ---
const TrustBar = () => {
  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

  const lines = [
    "Rated 4.7/5 by creators",
    "20+ active clients across niches",
    "Thumbnails delivering +40% CTR",
    "Edits driving 2× watch time",
    "7M+ views driven for clients",
    "Shorts → predictable growth engine",
    "48–72 hr standard turnaround",
    "Hook-first scripts, data-backed metadata",
    "End-to-end: Long-form, Shorts, Thumbnails, GFX",
    "Brand kits & channel audits included",
    "Monetization-safe packaging (no “yellow dollar”)",
    "Dedicated PM & weekly checkpoints",
  ];

  if (reduceMotion) {
    return (
      <div
        className="w-full"
        style={{
          background: "var(--header-bg)",
          boxShadow: "inset 0 1px 0 var(--border)",
          position: "relative",
          zIndex: 2,
        }}
      >
        <div className="container mx-auto px-3 py-1.5 text-center text-[11px] md:text-sm select-none">
          <div
            className="inline-flex items-center gap-6 md:gap-10"
            style={{ color: "var(--text)" }}
          >
            {lines.map((t, i) => (
              <span key={i}>{t}</span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="w-full trustbar"
      style={{
        background: "var(--header-bg)",
        boxShadow: "inset 0 1px 0 var(--border)",
        position: "relative",
        zIndex: 2,
      }}
    >
      <div
        className="overflow-hidden select-none"
        style={{
          WebkitMaskImage:
            "linear-gradient(90deg, transparent, black 6%, black 94%, transparent)",
          maskImage:
            "linear-gradient(90deg, transparent, black 6%, black 94%, transparent)",
        }}
      >
        <div className="marquee-track">
          <div className="marquee-row">
            {lines.map((t, i) => (
              <span key={`a-${i}`} className="marquee-item">
                {t}
              </span>
            ))}
          </div>
          <div className="marquee-row" aria-hidden="true">
            {lines.map((t, i) => (
              <span key={`b-${i}`} className="marquee-item">
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        .trustbar { --marquee-speed: 26s; }
        .marquee-track { display: flex; width: max-content; }
        .marquee-row {
          display: inline-flex;
          align-items: center;
          gap: 2rem;
          padding: 0.4rem 0;
          animation: ss-marquee var(--marquee-speed) linear infinite;
          will-change: transform;
        }
        @keyframes ss-marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .trustbar:hover .marquee-row { animation-play-state: paused; }
        .marquee-item {
          font-size: 11px;
          line-height: 1;
          white-space: nowrap;
          color: var(--text);
          display: inline-flex;
          align-items: center;
          gap: .5rem;
        }
        @media (min-width: 768px) { .marquee-item { font-size: 0.875rem; } }
        @media (max-width: 420px) { .trustbar { --marquee-speed: 22s; } }
      `}</style>
    </div>
  );
};

export default SiteHeader;
