// src/App.jsx
import React from "react";
import { Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom";

import SiteHeader from "./components/SiteHeader.jsx";
import SiteFooter from "./components/SiteFooter.jsx";

import ShinelStudiosHomepage from "./components/ShinelStudiosHomepage.jsx";
import VideoEditing from "./components/VideoEditing.jsx";
import GFX from "./components/GFX.jsx";
import Thumbnails from "./components/Thumbnails.jsx";
import Shorts from "./components/Shorts.jsx";
import LoginPage from "./components/LoginPage.jsx";

/* Scroll to hash targets (e.g., /#services) with header offset */
function ScrollToHash() {
  const location = useLocation();

  React.useEffect(() => {
    const MAX_TRIES = 10;
    const INTERVAL = 50;
    let tries = 0;

    const timer = setInterval(() => {
      const hash = (location.hash || "").replace("#", "");
      const el = hash ? document.getElementById(hash) : null;
      const headerH =
        parseInt(getComputedStyle(document.documentElement).getPropertyValue("--header-h")) || 76;

      if (el) {
        const top = window.scrollY + el.getBoundingClientRect().top - (headerH + 8);
        window.scrollTo({ top, behavior: "smooth" });
        clearInterval(timer);
      } else if (++tries >= MAX_TRIES) {
        if (location.pathname === "/" && !hash) {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
        clearInterval(timer);
      }
    }, INTERVAL);

    return () => clearInterval(timer);
  }, [location.pathname, location.hash]);

  return null;
}

/* Layout with global header/footer and site-wide theme toggle */
function Layout() {
  const [isDark, setIsDark] = React.useState(() => {
    try {
      const saved = localStorage.getItem("theme");
      if (saved) return saved === "dark";
    } catch {}
    // Prepaint script may have set .dark already; otherwise fall back to system
    if (document.documentElement.classList.contains("dark")) return true;
    return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ?? false;
  });

  React.useEffect(() => {
    requestAnimationFrame(() => {
      document.documentElement.classList.toggle("dark", isDark);
      try { localStorage.setItem("theme", isDark ? "dark" : "light"); } catch {}

      // Update plain theme-color (mobile address bar)
      let metaTheme = document.querySelector('meta[name="theme-color"]:not([media])');
      if (!metaTheme) {
        metaTheme = document.createElement("meta");
        metaTheme.setAttribute("name", "theme-color");
        document.head.appendChild(metaTheme);
      }
      metaTheme.setAttribute("content", isDark ? "#0F0F0F" : "#ffffff");

      // Swap favicons if present
      const lightIcon = document.querySelector('link[rel="icon"][data-theme="light"]');
      const darkIcon  = document.querySelector('link[rel="icon"][data-theme="dark"]');
      if (lightIcon && darkIcon) {
        lightIcon.disabled = !!isDark;
        darkIcon.disabled  = !isDark;
      }
      const fallback = document.getElementById("favicon");
      if (fallback) fallback.href = isDark ? "/favicon-dark-32x32.png" : "/favicon-light-32x32.png";
    });
  }, [isDark]);

  return (
    <>
      <SiteHeader isDark={isDark} setIsDark={setIsDark} />
      <ScrollToHash />
      <main
        style={{
          paddingTop: "var(--header-h, 76px)",
          transition: "padding-top .2s ease",
        }}
      >
        <Outlet />
      </main>
      <SiteFooter />
    </>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<ShinelStudiosHomepage />} />
        <Route path="/video-editing" element={<VideoEditing />} />
        <Route path="/gfx" element={<GFX />} />
        <Route path="/thumbnails" element={<Thumbnails />} />
        <Route path="/shorts" element={<Shorts />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
