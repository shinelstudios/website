// src/main.jsx
import React from "react"
import ReactDOM from "react-dom/client"
import { BrowserRouter } from "react-router-dom"
import { HelmetProvider } from "react-helmet-async"
import { ClientStatsProvider } from "./context/ClientStatsContext"
import { GlobalConfigProvider } from "./context/GlobalConfigContext"
import App from "./App.jsx"
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