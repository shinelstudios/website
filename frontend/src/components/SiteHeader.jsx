// src/components/SiteHeader.jsx
import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, ChevronDown, Sun, Moon } from "lucide-react";
import logoLight from "../assets/logo_light.png";

const cats = [
  { name: "Video Editing", sub: ["Gaming", "Vlogging", "Documentary"] },
  { name: "GFX", sub: [] }, // direct link to /gfx
  { name: "Thumbnails", sub: [] },
  { name: "Shorts", sub: ["Gaming", "IRL", "Motion Graphics"] },
];

/**
 * SiteHeader
 * Props:
 * - isDark?: boolean
 * - setIsDark?: (v:boolean)=>void
 * If provided, shows a Sun/Moon button that toggles theme (same as homepage).
 */
const SiteHeader = ({ isDark, setIsDark }) => {
  const { pathname } = useLocation();

  // desktop dropdown
  const [workOpen, setWorkOpen] = useState(false);
  const [openCat, setOpenCat] = useState(null);
  const workRef = useRef(null);

  // mobile
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileOpenIdx, setMobileOpenIdx] = useState(null);

  // close dropdown on outside-click & Esc
  useEffect(() => {
    const closeAll = () => {
      setWorkOpen(false);
      setOpenCat(null);
    };
    const onDoc = (e) => {
      if (!workOpen) return;
      if (workRef.current && !workRef.current.contains(e.target)) closeAll();
    };
    const onEsc = (e) => e.key === "Escape" && closeAll();
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("touchstart", onDoc, { passive: true });
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("touchstart", onDoc);
      document.removeEventListener("keydown", onEsc);
    };
  }, [workOpen]);

  const NavLink = ({ href, children }) => (
    <a href={href} className="hover:opacity-80">
      {children}
    </a>
  );

  return (
    <header
      className="fixed top-0 inset-x-0 z-50 backdrop-blur-lg"
      style={{
        background: "var(--header-bg, rgba(0,0,0,.65))",
        borderBottom: "1px solid var(--border, rgba(255,255,255,.12))",
      }}
    >
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo (visually bigger, header size unchanged) */}
        <Link to="/" className="flex items-center gap-3">
          <div className="h-12 flex items-center overflow-visible">
            <img
              src={logoLight}
              alt="Shinel Studios"
              className="h-full w-auto object-contain select-none"
              style={{
                transform: "scale(2.8)",
                transformOrigin: "left center",
                filter: "drop-shadow(0 1px 2px rgba(0,0,0,.35))",
              }}
            />
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav
          className="hidden md:flex items-center gap-7"
          style={{ color: "var(--text, #fff)" }}
        >
          <NavLink href="/#home">Home</NavLink>

          {/* Our Work dropdown */}
          <div className="relative" ref={workRef}>
            <button
              onClick={() => setWorkOpen((v) => !v)}
              className="inline-flex items-center gap-1 hover:opacity-80"
              aria-expanded={workOpen}
              aria-controls="work-menu"
            >
              Our Work
              <ChevronDown
                size={16}
                className={`transition-transform ${workOpen ? "rotate-180" : ""}`}
              />
            </button>

            {workOpen && (
              <div
                id="work-menu"
                className="absolute left-0 mt-3 w-64 rounded-xl shadow-xl overflow-hidden"
                style={{
                  background: "var(--surface, #0F0F0F)",
                  border: "1px solid var(--border, rgba(255,255,255,.12))",
                }}
                onMouseLeave={() => {
                  setWorkOpen(false);
                  setOpenCat(null);
                }}
              >
                {cats.map((cat, idx) => (
                  <div
                    key={cat.name}
                    className="border-b last:border-none"
                    style={{ borderColor: "var(--border, rgba(255,255,255,.12))" }}
                  >
                    {/* Direct GFX link (visible orange, white on hover) */}
                    {cat.name === "GFX" && cat.sub.length === 0 ? (
                      <a
                        href="/gfx"
                        className="block w-full px-4 py-3 text-left font-semibold"
                        style={{ color: "var(--orange,#E85002)" }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "var(--orange,#E85002)";
                          e.currentTarget.style.color = "#fff";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "transparent";
                          e.currentTarget.style.color = "var(--orange,#E85002)";
                        }}
                        onClick={() => {
                          setWorkOpen(false);
                          setOpenCat(null);
                        }}
                      >
                        GFX
                      </a>
                    ) : (
                      <>
                        <button
                          className="w-full flex items-center justify-between px-4 py-3 text-left"
                          style={{ color: "var(--text, #fff)" }}
                          onClick={() => setOpenCat(openCat === idx ? null : idx)}
                        >
                          <span className="font-semibold text-[var(--orange,#E85002)]">
                            {cat.name}
                          </span>
                          {cat.sub.length > 0 && (
                            <ChevronDown
                              size={16}
                              className={`transition-transform ${
                                openCat === idx ? "rotate-180" : ""
                              }`}
                              style={{ color: "var(--text-muted, rgba(255,255,255,.7))" }}
                            />
                          )}
                        </button>

                        {openCat === idx && cat.sub.length > 0 && (
                          <div style={{ background: "var(--surface-alt, #0B0B0B)" }}>
                            {cat.sub.map((s) => (
                              <a
                                key={s}
                                href={
                                  s === "Gaming"
                                    ? "/gaming"
                                    : s === "GFX"
                                    ? "/gfx"
                                    : `/#${s.toLowerCase().replace(/\s+/g, "-")}`
                                }
                                className="block px-6 py-2 text-sm"
                                style={{
                                  color:
                                    s === "GFX" ? "var(--orange,#E85002)" : "var(--text,#fff)",
                                  fontWeight: s === "GFX" ? 600 : "normal",
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = "var(--orange,#E85002)";
                                  e.currentTarget.style.color = "#fff";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = "transparent";
                                  e.currentTarget.style.color =
                                    s === "GFX"
                                      ? "var(--orange,#E85002)"
                                      : "var(--text,#fff)";
                                }}
                                onClick={() => {
                                  setWorkOpen(false);
                                  setOpenCat(null);
                                }}
                              >
                                {s}
                              </a>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <NavLink href="/#services">Services</NavLink>
          <NavLink href="/#testimonials">Testimonials</NavLink>
          <NavLink href="/#contact">Contact</NavLink>
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-3">
          {/* Theme toggle (only if props provided) */}
          {typeof isDark === "boolean" && typeof setIsDark === "function" && (
            <button
              onClick={() => setIsDark((v) => !v)}
              className="p-2 rounded-lg hover:opacity-90"
              style={{
                background: isDark
                  ? "rgba(255,255,255,0.1)"
                  : "rgba(0,0,0,0.06)",
                color: "var(--text, #fff)",
              }}
              aria-label="Toggle theme"
              title="Toggle theme"
            >
              {isDark ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          )}

          {pathname === "/login" ? (
            <Link
              to="/register"
              className="hidden md:block text-white px-5 py-2 rounded-lg font-medium"
              style={{ background: "var(--orange, #E85002)" }}
            >
              Register
            </Link>
          ) : (
            <Link
              to="/login"
              className="hidden md:block text-white px-5 py-2 rounded-lg font-medium"
              style={{ background: "var(--orange, #E85002)" }}
            >
              Login
            </Link>
          )}

          <button
            className="md:hidden p-2"
            style={{ color: "var(--text, #fff)" }}
            aria-label="Menu"
            onClick={() => setMobileOpen(true)}
          >
            <Menu size={22} />
          </button>
        </div>
      </div>

      {/* Mobile sheet */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-[60]"
          style={{ background: "rgba(0,0,0,.6)" }}
          onClick={() => setMobileOpen(false)}
        >
          <div
            className="absolute right-0 top-0 h-full w-[80vw] max-w-xs p-4"
            style={{ background: "var(--surface, #0F0F0F)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <img src={logoLight} alt="Shinel Studios" className="h-9 w-auto" />
              <button
                className="p-2"
                style={{ color: "var(--text, #fff)" }}
                onClick={() => setMobileOpen(false)}
                aria-label="Close"
              >
                <X size={22} />
              </button>
            </div>

            <nav className="space-y-2" style={{ color: "var(--text, #fff)" }}>
              <a href="/#home" className="block px-2 py-2" onClick={() => setMobileOpen(false)}>
                Home
              </a>

              {/* Our Work accordion */}
              <div
                className="rounded-lg overflow-hidden"
                style={{ border: "1px solid var(--border, rgba(255,255,255,.12))" }}
              >
                {cats.map((cat, idx) => (
                  <div
                    key={cat.name}
                    className="border-b last:border-none"
                    style={{ borderColor: "var(--border, rgba(255,255,255,.12))" }}
                  >
                    {/* Direct GFX link on mobile */}
                    {cat.name === "GFX" && cat.sub.length === 0 ? (
                      <a
                        href="/gfx"
                        className="block px-3 py-3 text-left font-semibold"
                        style={{ color: "var(--orange,#E85002)" }}
                        onClick={() => setMobileOpen(false)}
                      >
                        GFX
                      </a>
                    ) : (
                      <>
                        <button
                          className="w-full flex items-center justify-between px-3 py-3 text-left"
                          onClick={() =>
                            setMobileOpenIdx(mobileOpenIdx === idx ? null : idx)
                          }
                          style={{ color: "var(--orange, #E85002)" }}
                        >
                          <span>{cat.name}</span>
                          {cat.sub.length > 0 && (
                            <ChevronDown
                              size={16}
                              className={`transition-transform ${
                                mobileOpenIdx === idx ? "rotate-180" : ""
                              }`}
                            />
                          )}
                        </button>

                        {mobileOpenIdx === idx && cat.sub.length > 0 && (
                          <div>
                            {cat.sub.map((s) => (
                              <a
                                key={s}
                                href={
                                  s === "Gaming"
                                    ? "/gaming"
                                    : s === "GFX"
                                    ? "/gfx"
                                    : `/#${s.toLowerCase().replace(/\s+/g, "-")}`
                                }
                                className="block px-6 py-2 text-sm"
                                style={{
                                  color:
                                    s === "GFX" ? "var(--orange,#E85002)" : "var(--text,#fff)",
                                  fontWeight: s === "GFX" ? 600 : "normal",
                                }}
                                onClick={() => setMobileOpen(false)}
                              >
                                {s}
                              </a>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>

              <a href="/#services" className="block px-2 py-2" onClick={() => setMobileOpen(false)}>
                Services
              </a>
              <a href="/#testimonials" className="block px-2 py-2" onClick={() => setMobileOpen(false)}>
                Testimonials
              </a>
              <a href="/#contact" className="block px-2 py-2" onClick={() => setMobileOpen(false)}>
                Contact
              </a>
            </nav>

            <div className="mt-4">
              {pathname === "/login" ? (
                <Link
                  to="/register"
                  className="block text-center text-white px-5 py-3 rounded-lg font-medium"
                  style={{ background: "var(--orange, #E85002)" }}
                  onClick={() => setMobileOpen(false)}
                >
                  Register
                </Link>
              ) : (
                <Link
                  to="/login"
                  className="block text-center text-white px-5 py-3 rounded-lg font-medium"
                  style={{ background: "var(--orange, #E85002)" }}
                  onClick={() => setMobileOpen(false)}
                >
                  Login
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default SiteHeader;
