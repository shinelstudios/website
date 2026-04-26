/**
 * main.jsx
 * 
 * About: Entry point for the React application.
 * Used in: index.html
 * Features: React DOM rendering, Context Providers (GlobalConfig, ClientStats), Router, Helmet (SEO).
 */
import React from "react"
import ReactDOM from "react-dom/client"
import { BrowserRouter } from "react-router-dom"
import { HelmetProvider } from "react-helmet-async"
import { ClientStatsProvider } from "./context/ClientStatsContext"
import { GlobalConfigProvider } from "./context/GlobalConfigContext"
import App from "./App.jsx"
// Initialise Sentry as the very first thing so it can capture errors that
// happen during the React render below. No-ops in dev / on localhost / for
// bots / for DNT users — see utils/sentry.js for the guardrails.
import { initSentry, SentryErrorBoundary } from "./utils/sentry"
initSentry()

// Self-hosted variable fonts (woff2). Replaces the Google Fonts @import.
// These packages ship only woff2 — smallest payload possible, every browser
// we care about supports it. No DNS hop to fonts.gstatic.com on first load.
import "@fontsource-variable/outfit"
import "@fontsource-variable/inter"
import "@fontsource-variable/space-grotesk"

import "./index.css"

// Sentry's ErrorBoundary at the root. Its fallback is intentionally minimal —
// any user-facing crash should be RARE, and once it happens we want them to
// reload rather than try to interact with a half-broken tree. Sentry captures
// the original error before this fallback renders.
function CrashFallback() {
  return (
    <main style={{
      minHeight: "100vh",
      display: "grid",
      placeItems: "center",
      background: "#0a0a0a",
      color: "#f5f5f5",
      fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
      padding: "2rem",
      textAlign: "center",
    }}>
      <div style={{ maxWidth: 480 }}>
        <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: "0.25em", color: "#E85002", marginBottom: 16 }}>SOMETHING BROKE</div>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 800, marginBottom: 12 }}>This page hit an unexpected error.</h1>
        <p style={{ color: "#a3a3a3", marginBottom: 24 }}>
          We've been notified. Reload the page — most of the time that's all it takes.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{
            background: "#E85002",
            color: "#fff",
            border: 0,
            padding: "0.85rem 1.5rem",
            borderRadius: 999,
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          Reload
        </button>
      </div>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <SentryErrorBoundary fallback={<CrashFallback />}>
      <HelmetProvider>
        <BrowserRouter>
          <GlobalConfigProvider>
            <ClientStatsProvider>
              <App />
            </ClientStatsProvider>
          </GlobalConfigProvider>
        </BrowserRouter>
      </HelmetProvider>
    </SentryErrorBoundary>
  </React.StrictMode>
)