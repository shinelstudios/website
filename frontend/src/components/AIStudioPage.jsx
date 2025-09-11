// src/pages/AIStudioPage.jsx
import React, { useEffect, useState } from "react";
import { LogOut, ChevronDown, ChevronUp } from "lucide-react";

// Helper: decode JWT payload (no verification, client-side only)
function parseJwt(token) {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

const AIStudioPage = () => {
  const [token, setToken] = useState(() => localStorage.getItem("token") || "");
  const [payload, setPayload] = useState(null);
  const [showDebug, setShowDebug] = useState(false);

  useEffect(() => {
    if (token) {
      setPayload(parseJwt(token));
    }
  }, [token]);

  const handleLogout = () => {
    try {
      localStorage.removeItem("token");
      localStorage.removeItem("userEmail");
      localStorage.removeItem("rememberMe");
    } catch {}
    window.dispatchEvent(new Event("auth:changed"));
    window.location.href = "/"; // redirect home
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-start bg-[#0F0F0F] text-white px-4 py-10">
      {/* Top Banner */}
      <div className="w-full max-w-3xl mb-8 p-4 rounded-xl flex items-center justify-between"
           style={{ background: "linear-gradient(90deg,#E85002,#ff9357)" }}>
        <div>
          <p className="font-medium text-white">Logged in as</p>
          <p className="text-lg font-semibold">
            {payload?.email || localStorage.getItem("userEmail") || "Unknown"}
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm"
          style={{ background: "rgba(0,0,0,.25)", color: "#fff" }}
        >
          <LogOut size={18} /> Logout
        </button>
      </div>

      {/* Studio Content */}
      <h1 className="text-3xl font-bold mb-3">🎬 Shinel Studios AI Studio</h1>
      <p className="mb-6 text-white/80 text-center max-w-xl">
        Welcome to the AI Studio. From here, you’ll soon be able to manage edits,
        generate drafts, and explore new content tools tailored for Shinel Studios.
      </p>

      {/* Debug Token Section */}
      <div className="w-full max-w-2xl">
        <button
          onClick={() => setShowDebug((v) => !v)}
          className="flex items-center gap-2 text-sm text-white/70 hover:text-white transition"
        >
          {showDebug ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          {showDebug ? "Hide Debug Info" : "Show Debug Info"}
        </button>

        {showDebug && (
          <div className="mt-3 p-4 rounded-lg bg-gray-900 border border-gray-700 text-sm overflow-x-auto">
            <p className="mb-2 text-white/70">Access Token:</p>
            <code className="block break-all">{token}</code>
            <p className="mt-3 mb-1 text-white/70">Decoded Payload:</p>
            <pre className="bg-black/40 p-2 rounded text-xs">
              {JSON.stringify(payload, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIStudioPage;
