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

// Self-hosted variable fonts (woff2). Replaces the Google Fonts @import.
// These packages ship only woff2 — smallest payload possible, every browser
// we care about supports it. No DNS hop to fonts.gstatic.com on first load.
import "@fontsource-variable/outfit"
import "@fontsource-variable/inter"
import "@fontsource-variable/space-grotesk"

import "./index.css"

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <GlobalConfigProvider>
          <ClientStatsProvider>
            <App />
          </ClientStatsProvider>
        </GlobalConfigProvider>
      </BrowserRouter>
    </HelmetProvider>
  </React.StrictMode>
)