// src/components/ProtectedRoute.jsx
import React from "react";
import { Navigate, useLocation } from "react-router-dom";

function parseJwt(t) {
  try {
    const [, p] = String(t).split(".");
    if (!p) return null;
    const json = atob(p.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decodeURIComponent(escape(json)));
  } catch { return null; }
}

export default function ProtectedRoute({ children }) {
  const loc = useLocation();
  const [status, setStatus] = React.useState("checking"); // checking | ok | login

  React.useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem("token") || "";
        if (!token) return setStatus("login");

        const payload = parseJwt(token) || {};
        const now = Math.floor(Date.now() / 1000);
        const exp = Number(payload.exp || 0);

        // still valid
        if (exp && exp > now + 15) {
          // keep local user fields in sync
          if (payload.email) localStorage.setItem("userEmail", payload.email);
          if (payload.firstName) localStorage.setItem("userFirstName", payload.firstName);
          if (payload.lastName) localStorage.setItem("userLastName", payload.lastName);
          if (payload.role) localStorage.setItem("userRole", payload.role);
          setStatus("ok");
          return;
        }

        // try refresh
        const res = await fetch("/auth/refresh", { method: "POST", credentials: "include" });
        if (!res.ok) return setStatus("login");
        const data = await res.json();
        if (!data?.token) return setStatus("login");

        localStorage.setItem("token", data.token);
        const p2 = parseJwt(data.token) || {};
        if (p2.email) localStorage.setItem("userEmail", p2.email);
        if (p2.firstName) localStorage.setItem("userFirstName", p2.firstName);
        if (p2.lastName) localStorage.setItem("userLastName", p2.lastName);
        if (p2.role) localStorage.setItem("userRole", p2.role);
        window.dispatchEvent(new Event("auth:changed"));
        setStatus("ok");
      } catch {
        setStatus("login");
      }
    })();
  }, []);

  if (status === "checking") {
    return (
      <div className="min-h-[40vh] grid place-items-center" style={{ color: "var(--text)" }}>
        Checking access…
      </div>
    );
  }
  if (status === "login") {
    // you asked to land on Home after login, but if you’d rather bounce back here, swap to `?next=${loc.pathname}`
    return <Navigate to="/login" replace />;
  }
  return children;
}
