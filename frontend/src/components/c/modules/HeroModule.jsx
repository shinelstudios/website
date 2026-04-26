import React from "react";
import { HairlineCard } from "../../../design";

function Render({ client, config }) {
  return (
    <HairlineCard className="p-6 md:p-10 text-center">
      {client.bannerUrl ? (
        <div
          className="w-full aspect-[3/1] mb-6 rounded-xl bg-cover bg-center"
          style={{ backgroundImage: `url(${client.bannerUrl})` }}
          aria-hidden="true"
        />
      ) : null}
      {client.avatarUrl ? (
        <img
          src={client.avatarUrl}
          alt={client.displayName || ""}
          className="w-24 h-24 md:w-32 md:h-32 rounded-full mx-auto mb-4 object-cover ring-2"
          style={{ boxShadow: "0 4px 24px rgba(232,80,2,0.2)", "--tw-ring-color": "var(--orange)" }}
          loading="lazy"
          decoding="async"
        />
      ) : null}
      <h1 className="text-3xl md:text-5xl font-black tracking-tight" style={{ color: "var(--text)" }}>
        {client.displayName}
      </h1>
      {config?.tagline ? (
        <p className="mt-3 max-w-xl mx-auto text-base md:text-lg" style={{ color: "var(--text-muted)" }}>
          {config.tagline}
        </p>
      ) : null}
    </HairlineCard>
  );
}

function Editor({ config, onChange }) {
  return (
    <div>
      <label className="block text-xs font-black uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>
        Tagline
      </label>
      <textarea
        value={config?.tagline || ""}
        onChange={(e) => onChange({ ...config, tagline: e.target.value })}
        rows={2}
        maxLength={200}
        placeholder="One sentence that says who you are."
        className="w-full rounded-lg p-3 text-sm"
        style={{ background: "var(--surface)", border: "1px solid var(--hairline)", color: "var(--text)" }}
      />
      <p className="mt-1 text-xs opacity-60">{(config?.tagline || "").length}/200 — banner and avatar are set on the main profile fields above.</p>
    </div>
  );
}

export default { Render, Editor };
