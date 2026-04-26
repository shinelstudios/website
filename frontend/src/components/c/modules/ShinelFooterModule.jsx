import React from "react";
import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";

function Render({ client }) {
  return (
    <div className="mt-12 pt-8 border-t" style={{ borderColor: "var(--hairline)" }}>
      <div className="text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] mb-3" style={{ color: "var(--text-muted)" }}>
          Edited by
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-base font-black tracking-tight"
          style={{ color: "var(--text)" }}
        >
          <Sparkles size={16} style={{ color: "var(--orange)" }} />
          Shinel <span style={{ color: "var(--orange)" }}>Studios</span>
        </Link>
        <div className="mt-5">
          <Link
            to={`/contact?via=clientpage&slug=${encodeURIComponent(client?.slug || "")}`}
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-widest"
            style={{ background: "var(--orange)", color: "#fff", minHeight: 44 }}
          >
            Hire my editor →
          </Link>
        </div>
        <p className="mt-3 text-[10px] opacity-50" style={{ color: "var(--text-muted)" }}>
          Get the same edits, thumbnails, and channel strategy that {client?.displayName || "this creator"} trusts.
        </p>
      </div>
    </div>
  );
}

function Editor() {
  return (
    <div className="text-sm" style={{ color: "var(--text-muted)" }}>
      <p>This footer is part of the free tier — it can't be turned off.</p>
      <p className="mt-2">Upgrade to <strong style={{ color: "var(--orange)" }}>Pro</strong> to remove the Shinel branding (coming soon).</p>
    </div>
  );
}

export default { Render, Editor };
