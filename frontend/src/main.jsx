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
import * as Sentry from "@sentry/react"
import { ClientStatsProvider } from "./context/ClientStatsContext"
import { GlobalConfigProvider } from "./context/GlobalConfigContext"
import App from "./App.jsx"
// Initialise Sentry as the very first thing so it can capture errors that
// happen during the React render below. No-ops in dev / on localhost / for
// bots / for DNT users — see utils/sentry.js for the guardrails.
import { initSentry, SentryErrorBoundary } from "./utils/sentry"
initSentry()

// Async-error safety net — catch errors that escape the React tree
// (setTimeout callbacks, promise rejections from fetch().then chains,
// event handlers). The Sentry boundary only catches React render errors,
// so without these listeners async failures vanish silently. Tagged
// `[shinel:unhandled]` so they're greppable in DevTools.
if (typeof window !== "undefined") {
  window.addEventListener("error", (event) => {
    const err = event.error || new Error(event.message || "Unknown error");
    console.error("[shinel:unhandled]", err.stack || err.message || err, {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
    try { Sentry.captureException(err); } catch { /* Sentry init may have no-op'd */ }
  });
  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    const err = reason instanceof Error ? reason : new Error(String(reason));
    console.error("[shinel:unhandled-rejection]", err.stack || err.message || err);
    try { Sentry.captureException(err); } catch { /* */ }
  });
}

// Self-hosted variable fonts (woff2). Replaces the Google Fonts @import.
// These packages ship only woff2 — smallest payload possible, every browser
// we care about supports it. No DNS hop to fonts.gstatic.com on first load.
import "@fontsource-variable/outfit"
import "@fontsource-variable/inter"
import "@fontsource-variable/space-grotesk"

import "./index.css"

// Sentry's ErrorBoundary at the root. Past behaviour: fallback was a static
// JSX element so the error/eventId/resetError props from Sentry were
// dropped — visitors saw "SOMETHING BROKE" with no clue what had broken
// and no way to recover without a full reload. Now the fallback receives
// the error and renders message + collapsible stack + Copy button + a
// "Try again" that calls resetError. Reload stays as the safe fallback.
function CrashFallback({ error, reset, eventId }) {
  const [copied, setCopied] = React.useState(false);
  const message = error?.message || "Unknown error";
  const stack = error?.stack || "(no stack available)";
  const path = typeof window !== "undefined" ? window.location.pathname + window.location.search : "";
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const fullText = `${message}\n\n${stack}\n\nPath: ${path}\nUA: ${ua}\nEvent: ${eventId || "—"}`;

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback for older browsers / non-secure contexts: select-into-textarea.
      try {
        const ta = document.createElement("textarea");
        ta.value = fullText;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      } catch { /* nothing more we can do — user can manually select the <pre> */ }
    }
  };

  const onTryAgain = () => {
    try { reset && reset(); } catch (e) { console.warn("resetError failed:", e); }
  };

  return (
    <main style={{
      minHeight: "100vh",
      display: "grid",
      placeItems: "center",
      background: "#0a0a0a",
      color: "#f5f5f5",
      fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
      padding: "2rem 1rem",
      textAlign: "center",
    }}>
      <div style={{ maxWidth: 640, width: "100%" }}>
        <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: "0.25em", color: "#E85002", marginBottom: 16 }}>SOMETHING BROKE</div>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 800, marginBottom: 12 }}>This page hit an unexpected error.</h1>

        <p style={{
          color: "#fca5a5",
          marginBottom: 20,
          padding: "0.75rem 1rem",
          background: "rgba(239,68,68,0.08)",
          border: "1px solid rgba(239,68,68,0.25)",
          borderRadius: 12,
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          fontSize: 13,
          textAlign: "left",
          wordBreak: "break-word",
        }}>
          {message}
        </p>

        <details style={{
          marginBottom: 20,
          textAlign: "left",
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 12,
          padding: "0.5rem 0.75rem",
        }}>
          <summary style={{ cursor: "pointer", fontSize: 11, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "#a3a3a3" }}>
            Stack trace
          </summary>
          <pre style={{
            marginTop: 8,
            fontSize: 11,
            lineHeight: 1.5,
            color: "#d4d4d4",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            maxHeight: 240,
            overflowY: "auto",
          }}>
            {stack}
          </pre>
          {eventId && (
            <div style={{ fontSize: 10, color: "#737373", marginTop: 8 }}>
              Event ID: <code>{eventId}</code>
            </div>
          )}
        </details>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
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
          {reset && (
            <button
              type="button"
              onClick={onTryAgain}
              style={{
                background: "transparent",
                color: "#f5f5f5",
                border: "1px solid rgba(255,255,255,0.2)",
                padding: "0.85rem 1.5rem",
                borderRadius: 999,
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              Try again
            </button>
          )}
          <button
            type="button"
            onClick={onCopy}
            style={{
              background: "transparent",
              color: "#a3a3a3",
              border: "1px solid rgba(255,255,255,0.1)",
              padding: "0.85rem 1.25rem",
              borderRadius: 999,
              fontWeight: 700,
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            {copied ? "Copied ✓" : "Copy details"}
          </button>
        </div>

        <p style={{ color: "#737373", marginTop: 20, fontSize: 12 }}>
          Tap "Copy details" and paste it to support — that's the fastest way for us to fix it.
        </p>
      </div>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <SentryErrorBoundary
      fallback={({ error, resetError, eventId }) => (
        <CrashFallback error={error} reset={resetError} eventId={eventId} />
      )}
      showDialog={false}
    >
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
