import React from "react";
import { HairlineCard } from "../../../design";
import { Heart, Copy, ExternalLink, Check } from "lucide-react";

function Render({ config }) {
  const [copied, setCopied] = React.useState(false);
  if (!config?.upi && !config?.externalUrl) return null;
  const onCopy = async () => {
    if (!config?.upi) return;
    try {
      await navigator.clipboard.writeText(config.upi);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* clipboard unavailable */ }
  };
  return (
    <HairlineCard className="p-5 md:p-6">
      <div className="flex items-center gap-3 mb-3">
        <span
          className="w-10 h-10 rounded-full grid place-items-center"
          style={{ background: "rgba(232,80,2,0.15)", color: "var(--orange)" }}
        >
          <Heart size={20} fill="currentColor" />
        </span>
        <h3 className="text-lg md:text-xl font-black" style={{ color: "var(--text)" }}>
          Tip jar
        </h3>
      </div>
      {config?.message ? (
        <p className="mb-4 text-sm" style={{ color: "var(--text-muted)" }}>{config.message}</p>
      ) : null}
      <div className="flex flex-col sm:flex-row gap-2">
        {config?.upi ? (
          <button
            type="button"
            onClick={onCopy}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-bold text-sm"
            style={{ background: "var(--orange)", color: "#fff", minHeight: 48 }}
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? "Copied!" : `UPI: ${config.upi}`}
          </button>
        ) : null}
        {config?.externalUrl ? (
          <a
            href={config.externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-bold text-sm"
            style={{ background: "transparent", border: "1px solid var(--orange)", color: "var(--orange)", minHeight: 48 }}
          >
            <ExternalLink size={16} />
            Tip on the web
          </a>
        ) : null}
      </div>
    </HairlineCard>
  );
}

function Editor({ config, onChange }) {
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-black uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>
          UPI ID
        </label>
        <input
          type="text"
          value={config?.upi || ""}
          onChange={(e) => onChange({ ...config, upi: e.target.value })}
          maxLength={80}
          placeholder="yourhandle@upi"
          className="w-full rounded p-2 text-sm"
          style={{ background: "var(--surface)", border: "1px solid var(--hairline)", color: "var(--text)" }}
        />
      </div>
      <div>
        <label className="block text-xs font-black uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>
          External tip URL (Razorpay page, Buy Me A Coffee, etc.)
        </label>
        <input
          type="url"
          value={config?.externalUrl || ""}
          onChange={(e) => onChange({ ...config, externalUrl: e.target.value })}
          maxLength={500}
          placeholder="https://razorpay.me/@yourhandle"
          className="w-full rounded p-2 text-sm"
          style={{ background: "var(--surface)", border: "1px solid var(--hairline)", color: "var(--text)" }}
        />
      </div>
      <div>
        <label className="block text-xs font-black uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>
          Short message (optional)
        </label>
        <input
          type="text"
          value={config?.message || ""}
          onChange={(e) => onChange({ ...config, message: e.target.value })}
          maxLength={200}
          placeholder="Helps me make better content."
          className="w-full rounded p-2 text-sm"
          style={{ background: "var(--surface)", border: "1px solid var(--hairline)", color: "var(--text)" }}
        />
      </div>
    </div>
  );
}

export default { Render, Editor };
