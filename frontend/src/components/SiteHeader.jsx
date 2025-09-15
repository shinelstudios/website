import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Sun, Moon, Menu, X, ChevronDown, Lock, Wand2, Search, Languages, Lightbulb, Brain, UserCog } from "lucide-react";
import logoLight from "../assets/logo_light.png";
import logoDark from "../assets/logo_dark.png";

/* ---------------- helpers: auth + theme favicon ---------------- */
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

function getAuthState() {
  try {
    const token = localStorage.getItem("token");
    const payload = token ? parseJwt(token) : null;
    const now = Math.floor(Date.now() / 1000);
    const expired = payload?.exp && payload.exp <= now;

    const email = (payload?.email || localStorage.getItem("userEmail") || "").trim();
    const role = (payload?.role || localStorage.getItem("userRole") || "").trim().toLowerCase();
    const firstName = (payload?.firstName || localStorage.getItem("userFirstName") || "").trim();
    const lastName = (payload?.lastName || localStorage.getItem("userLastName") || "").trim();

    return {
      isAuthed: Boolean(token) && !expired,
      email: email || null,
      role: role || null,
      firstName: firstName || null,
      lastName: lastName || null,
      exp: payload?.exp || null,
    };
  } catch {
    return { isAuthed: false, email: null, role: null, firstName: null, lastName: null, exp: null };
  }
}

function initialsFrom(first, last, email) {
  const a = (first || "").trim();
  const b = (last || "").trim();
  if (a || b) return `${a.charAt(0)}${b.charAt(0)}`.toUpperCase() || "?";
  const nameFromEmail = (email || "").split("@")[0] || "";
  return (nameFromEmail.charAt(0) || "?").toUpperCase();
}

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
    if (link) link.href = isDark ? "/favicon-dark-32x32.png" : "/favicon-light-32x32.png";
  } catch {}
}

/* ---------------- tools matrix (role-gated) ---------------- */
const toolsCatalog = [
  { name: "Auto SRT Files (Multi-Language)", path: "/tools/srt", icon: Languages, roles: ["admin", "editor"] },
  { name: "SEO Tool (Titles, Descriptions, Tags)", path: "/tools/seo", icon: Search, roles: ["admin", "editor", "client"] },
  { name: "Viral Thumbnail Ideation", path: "/tools/thumbnail-ideation", icon: Lightbulb, roles: ["admin", "editor", "client"] },
  { name: "Custom AIs", path: "/tools/custom-ais", icon: Brain, roles: ["admin"] },
  { name: "Admin • Users", path: "/admin/users", icon: UserCog, roles: ["admin"] },
];

const animations = {
  fadeDown: {
    hidden: { opacity: 0, y: -12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
  },
};

const SiteHeader = ({ isDark, setIsDark }) => {
  const [auth, setAuth] = useState(getAuthState());
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [workOpen, setWorkOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [hovered, setHovered] = useState(null);
  const [active, setActive] = useState("Home");
  const [scrolled, setScrolled] = useState(false);
  const [progress, setProgress] = useState(0);
  const [headerH, setHeaderH] = useState(76);

  const location = useLocation();
  const headerRef = useRef(null);
  const menuPanelRef = useRef(null);
  const workRef = useRef(null);
  const toolsRef = useRef(null);

  useEffect(() => setFaviconForTheme(isDark), [isDark]);

  // react to auth changes / storage events
  useEffect(() => {
    const update = () => setAuth(getAuthState());
    window.addEventListener("storage", update);
    window.addEventListener("auth:changed", update);
    return () => {
      window.removeEventListener("storage", update);
      window.removeEventListener("auth:changed", update);
    };
  }, []);

  // auto logout when exp passes (client side)
  useEffect(() => {
    if (!auth.isAuthed || !auth.exp) return;
    const now = Math.floor(Date.now() / 1000);
    const ms = Math.max(0, (auth.exp - now) * 1000 + 1000);
    const t = setTimeout(() => {
      try {
        localStorage.removeItem("token");
      } catch {}
      window.dispatchEvent(new Event("auth:changed"));
    }, ms);
    return () => clearTimeout(t);
  }, [auth.isAuthed, auth.exp]);

  // header height css var
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

  // scroll progress + shadow
  useEffect(() => {
    const tick = () => {
      const y = window.scrollY || 0;
      setScrolled(y > 6);
      const doc = document.documentElement;
      const h = Math.max(1, doc.scrollHeight - window.innerHeight);
      setProgress(Math.min(100, (y / h) * 100));
    };
    const onScroll = () => requestAnimationFrame(tick);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    tick();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  // active nav based on route/hash
  useEffect(() => {
    const hash = (location.hash || "#home").replace("#", "");
    const map = { "": "Home", home: "Home", services: "Services", work: "Work", contact: "Contact" };
    setActive(map[hash] || "Home");
  }, [location.pathname, location.hash]);

  // close popovers on outside / ESC
  useEffect(() => {
    const onDocDown = (e) => {
      if (workOpen && workRef.current && !workRef.current.contains(e.target)) setWorkOpen(false);
      if (toolsOpen && toolsRef.current && !toolsRef.current.contains(e.target)) setToolsOpen(false);
    };
    const onEsc = (e) => {
      if (e.key === "Escape") {
        setWorkOpen(false);
        setToolsOpen(false);
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("pointerdown", onDocDown);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("pointerdown", onDocDown);
      document.removeEventListener("keydown", onEsc);
    };
  }, [workOpen, toolsOpen]);

  // lock scroll when mobile menu open
  useEffect(() => {
    const lock = (v) => {
      document.documentElement.style.overflow = v ? "hidden" : "";
      document.body.style.overscrollBehavior = v ? "contain" : "";
    };
    lock(isMenuOpen);
    return () => lock(false);
  }, [isMenuOpen]);

  const role = (auth.role || "client").toLowerCase();
  const availableTools = toolsCatalog.filter((t) => t.roles.includes(role));
  const allToolsForMenu = auth.isAuthed ? availableTools : toolsCatalog; // show all with locks when logged out
  const logoSrc = isDark ? logoLight : logoDark;
  const initials = initialsFrom(auth.firstName, auth.lastName, auth.email);

  const NavLink = ({ label, to }) => {
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
            className="absolute left-0 -bottom-1 h-[2px] bg-[var(--orange)] transition-all duration-200 rounded-full"
            style={{ width: isActive || hovered === label ? "100%" : "0%" }}
          />
          <span>{label}</span>
        </Link>
      </motion.div>
    );
  };

  return (
    <motion.div className="fixed top-0 w-full z-50">
      <motion.header
        ref={headerRef}
        variants={animations.fadeDown}
        initial="hidden"
        animate="visible"
        role="banner"
        style={{
          background:
            "color-mix(in oklab, var(--header-bg) 88%, transparent) 0% / cover",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          borderBottom: "0",
          boxShadow: scrolled ? "0 10px 28px rgba(0,0,0,0.18)" : "none",
          transition: "box-shadow .25s ease, background-color .25s ease",
          overflow: "visible",
        }}
      >
        {/* progress hairline */}
        <div
          className="absolute left-0 top-0 h-[2px] origin-left"
          style={{
            width: "100%",
            transform: `scaleX(${Math.max(0, Math.min(1, progress / 100)).toFixed(4)})`,
            background: "linear-gradient(90deg, var(--orange), #ff9357)",
            transition: "transform .08s linear",
            opacity: scrolled ? 1 : 0.9,
          }}
          aria-hidden="true"
        />

        {/* nav row */}
        <nav
          className="container mx-auto px-4 flex items-center justify-between"
          style={{
            paddingTop: scrolled ? "6px" : "10px",
            paddingBottom: scrolled ? "6px" : "10px",
            transition: "padding .2s ease",
            position: "relative",
            zIndex: 3,
          }}
          aria-label="Primary"
        >
          {/* logo + badge */}
          <Link
            to="/"
            className="flex items-center select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)] rounded"
          >
            <div className="h-12 flex items-center overflow-visible">
              <motion.img
                src={logoSrc}
                alt="Shinel Studios"
                className="h-auto w-36 sm:w-44 object-contain block select-none"
                style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.35))" }}
                decoding="async"
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              />
            </div>
            <span
              className="ml-2 hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
              style={{
                color: "var(--orange)",
                border: "1px solid var(--border)",
                background: "rgba(232,80,2,0.08)",
              }}
            >
              <Wand2 size={12} />
              AI-first
            </span>
          </Link>

          {/* desktop nav */}
          <div className="hidden md:flex items-center gap-8 relative">
            <NavLink label="Home" to="/" />
            <NavLink label="Services" to="/#services" />

            {/* Our Work (simple anchor to section) */}
            <NavLink label="Work" to="/#work" />

            {/* Tools dropdown */}
            <div className="relative" ref={toolsRef}>
              <motion.button
                type="button"
                className="inline-flex items-center gap-1 text-[15px] lg:text-base focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)] rounded"
                aria-expanded={toolsOpen}
                aria-haspopup="menu"
                aria-controls="ai-tools-menu"
                onClick={() => setToolsOpen((v) => !v)}
                initial={false}
                style={{
                  color:
                    hovered === "Tools" || toolsOpen
                      ? "var(--nav-hover)"
                      : "var(--nav-link)",
                }}
                whileHover={{ y: -1, letterSpacing: 0.2 }}
                transition={{ duration: 0.22 }}
              >
                <span className="nav-label">Tools</span>
                {!auth.isAuthed && <Lock size={14} className="ml-1 opacity-70" />}
                <ChevronDown
                  size={16}
                  className={`ml-1 transition-transform ${toolsOpen ? "rotate-180" : ""}`}
                />
              </motion.button>

              <AnimatePresence>
                {toolsOpen && (
                  <motion.div
                    id="ai-tools-menu"
                    role="menu"
                    initial={{ opacity: 0, scale: 0.96, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: 8 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                    className="absolute left-0 mt-3 w-[320px] rounded-2xl shadow-xl overflow-hidden"
                    style={{
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      zIndex: 4,
                    }}
                  >
                    <div
                      className="px-4 py-2 text-[11px] font-semibold tracking-wide uppercase"
                      style={{ color: "var(--text-muted)", borderBottom: "1px solid var(--border)" }}
                    >
                      {auth.isAuthed ? `Your tools • ${role}` : "AI Tools · Login required"}
                    </div>

                    {(auth.isAuthed ? allToolsForMenu : toolsCatalog).map((t, i) => {
                      const Icon = t.icon;
                      const allowed = auth.isAuthed && t.roles.includes(role);
                      const to = allowed ? t.path : "/login?next=/studio";
                      return (
                        <Link
                          key={t.name}
                          role="menuitem"
                          tabIndex={0}
                          to={to}
                          className="flex items-center gap-2 w-full px-4 py-3 text-left font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)]"
                          style={{
                            color: "var(--text)",
                            transition: "color .15s, background-color .15s",
                            borderBottom: i === toolsCatalog.length - 1 ? "0" : "1px solid var(--border)",
                            opacity: auth.isAuthed ? (allowed ? 1 : 0.6) : 1,
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-alt)"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                          onClick={() => setToolsOpen(false)}
                          aria-label={allowed ? t.name : `${t.name} (login required)`}
                        >
                          <div
                            className="w-8 h-8 rounded-lg grid place-items-center shrink-0"
                            style={{ background: "rgba(232,80,2,0.10)", border: "1px solid var(--border)" }}
                            aria-hidden="true"
                          >
                            <Icon size={18} style={{ color: "var(--orange)" }} />
                          </div>
                          <span className="flex-1">{t.name}</span>
                          {!allowed && <Lock size={14} className="opacity-70" />}
                        </Link>
                      );
                    })}
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
                  style={{ background: "linear-gradient(90deg, var(--orange), #ff9357)" }}
                >
                  Studio
                </Link>
                <div
                  className="hidden md:flex items-center gap-2 px-2 py-1 rounded-full"
                  style={{ background: "var(--surface-alt)", border: "1px solid var(--border)" }}
                >
                  <div
                    aria-hidden
                    className="h-6 w-6 rounded-full grid place-items-center text-[11px] font-bold"
                    style={{ background: "var(--orange)", color: "#fff" }}
                    title={`${auth.firstName || ""} ${auth.lastName || ""}`.trim() || auth.email || ""}
                  >
                    {initials}
                  </div>
                  <span className="text-sm font-medium" style={{ color: "var(--text)" }}>
                    {auth.firstName || auth.email || "Signed in"}
                  </span>
                  {role && (
                    <span
                      className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded"
                      style={{ background: "var(--border)", color: "var(--text-muted)" }}
                    >
                      {role}
                    </span>
                  )}
                  <button
                    onClick={() => {
                      ["token","refresh","userEmail","userFirstName","userLastName","userRole","rememberMe"].forEach((k)=>localStorage.removeItem(k));
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
                  style={{ background: "linear-gradient(90deg, var(--orange), #ff9357)" }}
                >
                  Login
                </Link>
                <motion.div className="hidden md:inline-flex">
                  <Link
                    to="/login"
                    className="inline-flex items-center rounded-full px-5 py-2.5 text-sm font-semibold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)]"
                    style={{ background: "linear-gradient(90deg, var(--orange), #ff9357)" }}
                  >
                    Login
                  </Link>
                </motion.div>
              </>
            )}

            {/* theme toggle */}
            {typeof isDark === "boolean" && typeof setIsDark === "function" && (
              <motion.button
                onClick={() => setIsDark((v) => !v)}
                className="p-2 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)]"
                style={{
                  background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
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
                  {[{ label: "Home", to: "/" }, { label: "Services", to: "/#services" }, { label: "Work", to: "/#work" }].map(
                    (item) => (
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
                    )
                  )}
                </ul>

                {/* Tools quick links */}
                <div className="mt-4">
                  <div
                    className="px-1 pb-2 text-xs font-semibold uppercase tracking-wider"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {auth.isAuthed ? `Your tools • ${role}` : "AI Tools (login)"}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {toolsCatalog.map((t) => {
                      const Icon = t.icon;
                      const allowed = auth.isAuthed && t.roles.includes(role);
                      const to = allowed ? t.path : "/login?next=/studio";
                      return (
                        <Link
                          key={t.name}
                          to={to}
                          onClick={() => setIsMenuOpen(false)}
                          className="flex items-center gap-2 rounded-xl px-3 py-3 text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)]"
                          style={{
                            color: "var(--text)",
                            background: "var(--surface-alt)",
                            border: "1px solid var(--border)",
                            opacity: auth.isAuthed ? (allowed ? 1 : 0.6) : 1,
                          }}
                        >
                          <Icon size={16} style={{ color: "var(--orange)" }} />
                          <span className="flex-1">{t.name}</span>
                          {!allowed && <Lock size={12} className="opacity-70" />}
                        </Link>
                      );
                    })}
                  </div>
                </div>

                {/* auth summary / actions */}
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
                  <div className="mt-6 flex items-center justify-between px-1 text-sm" style={{ color: "var(--text)" }}>
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        aria-hidden
                        className="h-6 w-6 rounded-full grid place-items-center text-[11px] font-bold"
                        style={{ background: "var(--orange)", color: "#fff" }}
                      >
                        {initials}
                      </div>
                      <span className="truncate max-w-[60%]">{auth.firstName || auth.email || "Signed in"}</span>
                      {role && (
                        <span
                          className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded shrink-0"
                          style={{ background: "var(--border)", color: "var(--text-muted)" }}
                        >
                          {role}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        ["token","refresh","userEmail","userFirstName","userLastName","userRole","rememberMe"].forEach((k)=>localStorage.removeItem(k));
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

/* ---------------- Trust Bar (compact, AI-first) ---------------- */
const TrustBar = () => {
  const items = [
    "AI-first studio • human-directed quality",
    "20+ active clients across niches",
    "Thumbnails delivering +40% CTR",
    "Edits driving 2× watch time",
    "7M+ views driven for clients",
    "Auto-captions & multi-language subs",
    "Consent-first face/voice features",
    "Hook scoring & title testing",
    "Script co-pilot for ideation",
    "48–72 hr standard turnaround",
    "Dedicated PM & weekly checkpoints",
  ];

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
            {items.map((t, i) => (
              <span key={`a-${i}`} className="marquee-item">
                {t}
              </span>
            ))}
          </div>
          <div className="marquee-row" aria-hidden="true">
            {items.map((t, i) => (
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
          padding: 0.45rem 0;
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
