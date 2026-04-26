/**
 * ClientPortalEditor — /clients/me/edit. The self-serve editor.
 *
 * Two halves:
 *   1. Top-level fields (slug, displayName, tagline, avatar, banner,
 *      Discord webhook, public toggle) — saved via PUT /portal/me.
 *   2. Modules list — toggle on/off, reorder, edit per-module config —
 *      saved via PUT /portal/me/modules.
 *
 * Saves are explicit (no debounced auto-save) to keep server load
 * predictable and let the user batch many edits into one save.
 */
import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronUp, ChevronDown, ChevronLeft, Eye, EyeOff, AlertTriangle, Check } from "lucide-react";
import { Section, HairlineCard } from "../../design";
import { authedFetch } from "../../utils/tokenStore";
import { AUTH_BASE } from "../../config/constants";
import MetaTags from "../MetaTags.jsx";
import { MODULE_REGISTRY, MODULE_TYPES } from "../c/modules/index.js";

const TOP_FIELDS = [
  { key: "displayName", label: "Display name", placeholder: "e.g. Kamz Inkzone", maxLength: 120 },
  { key: "tagline",     label: "One-line tagline (overall)", placeholder: "e.g. BGMI player. Daily uploads.", maxLength: 200 },
  { key: "avatarUrl",   label: "Avatar URL (paste from Cloudinary / Imgur / your CDN)", placeholder: "https://res.cloudinary.com/…", maxLength: 500 },
  { key: "bannerUrl",   label: "Banner URL (3:1 ratio recommended)", placeholder: "https://…", maxLength: 500 },
];

export default function ClientPortalEditor() {
  const nav = useNavigate();
  const [loading, setLoading] = React.useState(true);
  const [client, setClient] = React.useState(null);
  const [topFields, setTopFields] = React.useState({});
  const [slug, setSlug] = React.useState("");
  const [publicEnabled, setPublicEnabled] = React.useState(false);
  const [discordWebhook, setDiscordWebhook] = React.useState("");
  const [modules, setModules] = React.useState([]);
  const [savingTop, setSavingTop] = React.useState(false);
  const [savingModules, setSavingModules] = React.useState(false);
  const [topMsg, setTopMsg] = React.useState(null);
  const [modMsg, setModMsg] = React.useState(null);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    authedFetch(AUTH_BASE, "/portal/me")
      .then(async (r) => {
        if (r.status === 401) { nav("/login?next=/clients/me/edit"); return null; }
        if (!r.ok) {
          const data = await r.json().catch(() => ({}));
          throw new Error(data?.error || `HTTP ${r.status}`);
        }
        return r.json();
      })
      .then((d) => {
        if (!d) return;
        const c = d.client;
        setClient(c);
        setSlug(c.slug || "");
        setPublicEnabled(!!c.publicEnabled);
        setDiscordWebhook(c.discordWebhookUrl || "");
        setTopFields({
          displayName: c.displayName || c.name || "",
          tagline: c.tagline || "",
          avatarUrl: c.avatarUrl || "",
          bannerUrl: c.bannerUrl || "",
        });
        // Backfill modules — ensure every available type has an entry, default disabled.
        // ShinelFooter is forced enabled.
        const saved = Array.isArray(c.modules) ? c.modules : [];
        const byType = Object.fromEntries(saved.map(m => [m.type, m]));
        const merged = MODULE_TYPES.map(type => {
          if (byType[type]) return byType[type];
          return {
            type,
            enabled: type === "shinelFooter",
            config: { ...MODULE_REGISTRY[type].defaultConfig },
          };
        });
        setModules(merged);
        setLoading(false);
      })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, [nav]);

  const saveTop = async () => {
    setSavingTop(true);
    setTopMsg(null);
    try {
      const body = { ...topFields, slug, publicEnabled, discordWebhookUrl: discordWebhook };
      const res = await authedFetch(AUTH_BASE, "/portal/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setTopMsg({ ok: true, text: "Saved." });
      setTimeout(() => setTopMsg(null), 3000);
    } catch (e) {
      setTopMsg({ ok: false, text: e.message || "Save failed" });
    } finally {
      setSavingTop(false);
    }
  };

  const saveModules = async () => {
    setSavingModules(true);
    setModMsg(null);
    try {
      const res = await authedFetch(AUTH_BASE, "/portal/me/modules", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modules }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      // Server may have re-injected forced modules — sync back.
      if (Array.isArray(data?.modules)) {
        const byType = Object.fromEntries(data.modules.map(m => [m.type, m]));
        const merged = MODULE_TYPES.map(type => byType[type] || {
          type,
          enabled: type === "shinelFooter",
          config: { ...MODULE_REGISTRY[type].defaultConfig },
        });
        setModules(merged);
      }
      setModMsg({ ok: true, text: "Modules saved." });
      setTimeout(() => setModMsg(null), 3000);
    } catch (e) {
      setModMsg({ ok: false, text: e.message || "Save failed" });
    } finally {
      setSavingModules(false);
    }
  };

  const updateModuleAt = (idx, patch) => {
    setModules(prev => prev.map((m, i) => i === idx ? { ...m, ...patch } : m));
  };
  const moveModule = (idx, dir) => {
    setModules(prev => {
      const next = prev.slice();
      const swapWith = idx + dir;
      if (swapWith < 0 || swapWith >= next.length) return prev;
      [next[idx], next[swapWith]] = [next[swapWith], next[idx]];
      return next;
    });
  };

  if (loading) {
    return (
      <Section size="lg" className="pt-12 pb-20">
        <div className="max-w-3xl mx-auto h-40 rounded-xl animate-pulse" style={{ background: "var(--surface)" }} />
      </Section>
    );
  }
  if (error || !client) {
    return (
      <Section size="md" className="pt-12 pb-20">
        <HairlineCard className="p-8 text-center">
          <AlertTriangle size={28} className="mx-auto mb-3" style={{ color: "var(--orange)" }} />
          <p className="font-bold">{error || "Could not load editor"}</p>
        </HairlineCard>
      </Section>
    );
  }

  return (
    <>
      <MetaTags title="Edit your page" noIndex />
      <Section size="lg" className="pt-10 md:pt-14 pb-24">
        <div className="max-w-3xl mx-auto">
          <Link to="/clients/me" className="text-xs font-black uppercase tracking-widest inline-flex items-center gap-1 mb-4" style={{ color: "var(--text-muted)" }}>
            <ChevronLeft size={14} /> Back to dashboard
          </Link>

          {/* TOP-LEVEL FIELDS */}
          <HairlineCard className="p-5 md:p-7 mb-6">
            <h2 className="text-lg md:text-xl font-black mb-4" style={{ color: "var(--text)" }}>Profile</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs font-black uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>
                  Slug (your URL: /c/<strong>slug</strong>)
                </label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                  maxLength={30}
                  placeholder="yourhandle"
                  className="w-full rounded p-2 text-sm font-mono"
                  style={{ background: "var(--surface)", border: "1px solid var(--hairline)", color: "var(--text)" }}
                />
                <p className="text-[10px] mt-1 opacity-60">3–30 chars · letters, digits, dashes</p>
              </div>
              <div className="flex items-end pb-1">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={publicEnabled}
                    onChange={(e) => setPublicEnabled(e.target.checked)}
                    className="w-4 h-4 accent-orange-500"
                  />
                  <span className="text-sm font-bold inline-flex items-center gap-1" style={{ color: "var(--text)" }}>
                    {publicEnabled ? <Eye size={14} /> : <EyeOff size={14} />}
                    Make my page public
                  </span>
                </label>
              </div>
            </div>

            {TOP_FIELDS.map((f) => (
              <div key={f.key} className="mb-3">
                <label className="block text-xs font-black uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>
                  {f.label}
                </label>
                <input
                  type={f.key.includes("Url") ? "url" : "text"}
                  value={topFields[f.key] || ""}
                  onChange={(e) => setTopFields({ ...topFields, [f.key]: e.target.value })}
                  maxLength={f.maxLength}
                  placeholder={f.placeholder}
                  className="w-full rounded p-2 text-sm"
                  style={{ background: "var(--surface)", border: "1px solid var(--hairline)", color: "var(--text)" }}
                />
              </div>
            ))}

            <div className="mb-3">
              <label className="block text-xs font-black uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>
                Discord webhook URL (where inquiries get pushed in real time)
              </label>
              <input
                type="password"
                value={discordWebhook}
                onChange={(e) => setDiscordWebhook(e.target.value)}
                maxLength={500}
                placeholder="https://discord.com/api/webhooks/…"
                className="w-full rounded p-2 text-sm"
                style={{ background: "var(--surface)", border: "1px solid var(--hairline)", color: "var(--text)" }}
              />
              <p className="text-[10px] mt-1 opacity-60">
                Optional. Inquiries always also land in your inbox here. Discord guide:{" "}
                <a href="https://support.discord.com/hc/en-us/articles/228383668" target="_blank" rel="noopener noreferrer" style={{ color: "var(--orange)" }}>
                  How to create a webhook
                </a>.
              </p>
            </div>

            <div className="flex items-center gap-3 mt-4">
              <button
                type="button"
                onClick={saveTop}
                disabled={savingTop}
                className="px-5 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest disabled:opacity-50"
                style={{ background: "var(--orange)", color: "#fff", minHeight: 44 }}
              >
                {savingTop ? "Saving…" : "Save profile"}
              </button>
              {topMsg && (
                <span className={`text-xs font-bold ${topMsg.ok ? "" : ""}`} style={{ color: topMsg.ok ? "#16a34a" : "#dc2626" }}>
                  {topMsg.ok ? <span className="inline-flex items-center gap-1"><Check size={12} /> {topMsg.text}</span> : topMsg.text}
                </span>
              )}
            </div>
          </HairlineCard>

          {/* MODULES */}
          <HairlineCard className="p-5 md:p-7 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg md:text-xl font-black" style={{ color: "var(--text)" }}>Modules</h2>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                Drag the arrows to reorder · toggle to enable
              </p>
            </div>

            <div className="space-y-3">
              {modules.map((m, idx) => {
                const reg = MODULE_REGISTRY[m.type];
                if (!reg) return null;
                const Editor = reg.Editor;
                return (
                  <div
                    key={m.type}
                    className="rounded-xl p-4"
                    style={{
                      background: m.enabled ? "rgba(232,80,2,0.04)" : "var(--surface)",
                      border: `1px solid ${m.enabled ? "rgba(232,80,2,0.3)" : "var(--hairline)"}`,
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex flex-col gap-1 pt-1">
                        <button type="button" onClick={() => moveModule(idx, -1)} disabled={idx === 0} className="opacity-50 hover:opacity-100 disabled:opacity-20">
                          <ChevronUp size={16} />
                        </button>
                        <button type="button" onClick={() => moveModule(idx, 1)} disabled={idx === modules.length - 1} className="opacity-50 hover:opacity-100 disabled:opacity-20">
                          <ChevronDown size={16} />
                        </button>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="text-base font-black" style={{ color: "var(--text)" }}>{reg.label}</h3>
                            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{reg.description}</p>
                          </div>
                          <label className="inline-flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={m.enabled}
                              onChange={(e) => updateModuleAt(idx, { enabled: e.target.checked })}
                              disabled={reg.forced}
                              className="w-4 h-4 accent-orange-500"
                            />
                            <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                              {m.enabled ? "ON" : "OFF"}
                            </span>
                          </label>
                        </div>
                        {m.enabled && Editor ? (
                          <div className="mt-4 pt-4 border-t" style={{ borderColor: "var(--hairline)" }}>
                            <Editor
                              config={m.config || reg.defaultConfig}
                              onChange={(cfg) => updateModuleAt(idx, { config: cfg })}
                            />
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-3 mt-5">
              <button
                type="button"
                onClick={saveModules}
                disabled={savingModules}
                className="px-5 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest disabled:opacity-50"
                style={{ background: "var(--orange)", color: "#fff", minHeight: 44 }}
              >
                {savingModules ? "Saving…" : "Save modules"}
              </button>
              {modMsg && (
                <span className="text-xs font-bold" style={{ color: modMsg.ok ? "#16a34a" : "#dc2626" }}>
                  {modMsg.ok ? <span className="inline-flex items-center gap-1"><Check size={12} /> {modMsg.text}</span> : modMsg.text}
                </span>
              )}
            </div>
          </HairlineCard>
        </div>
      </Section>
    </>
  );
}
