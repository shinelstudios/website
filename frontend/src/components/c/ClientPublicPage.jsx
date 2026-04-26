/**
 * ClientPublicPage — /c/<slug>. Public, no auth.
 *
 * Fetches `/api/c/:slug` then iterates the saved `modules` array, looking
 * each up in MODULE_REGISTRY for its Render component. Bio-link feel:
 * narrow column, card-stacked, mobile-first.
 *
 * The ShinelFooter module is server-forced for free tier so it always
 * renders (the footer is what monetises the free distribution).
 */
import React from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import MetaTags from "../MetaTags.jsx";
import { Section } from "../../design";
import { AUTH_BASE } from "../../config/constants";
import { MODULE_REGISTRY } from "./modules/index.js";

export default function ClientPublicPage() {
  const { slug } = useParams();
  const [state, setState] = React.useState({ loading: true, client: null, error: null });

  React.useEffect(() => {
    let cancelled = false;
    setState({ loading: true, client: null, error: null });
    fetch(`${AUTH_BASE}/api/c/${encodeURIComponent(slug)}`)
      .then(async (r) => {
        if (!r.ok) {
          const data = await r.json().catch(() => ({}));
          throw new Error(data?.error || `HTTP ${r.status}`);
        }
        return r.json();
      })
      .then((d) => { if (!cancelled) setState({ loading: false, client: d?.client || null, error: null }); })
      .catch((e) => { if (!cancelled) setState({ loading: false, client: null, error: e.message || "Could not load page" }); });
    return () => { cancelled = true; };
  }, [slug]);

  if (state.loading) {
    return (
      <Section size="md" className="pt-12 md:pt-20 pb-20">
        <div className="max-w-xl mx-auto space-y-4">
          <div className="h-32 rounded-xl animate-pulse" style={{ background: "var(--surface)" }} />
          <div className="h-16 rounded-xl animate-pulse" style={{ background: "var(--surface)" }} />
          <div className="h-16 rounded-xl animate-pulse" style={{ background: "var(--surface)" }} />
        </div>
      </Section>
    );
  }

  if (state.error || !state.client) {
    return (
      <>
        <MetaTags title="Page not found" noIndex />
        <Section size="md" className="pt-20 pb-20 text-center">
          <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-4" style={{ color: "var(--text)" }}>
            Page not found
          </h1>
          <p className="text-base mb-6" style={{ color: "var(--text-muted)" }}>
            We couldn't find a creator at <code>/c/{slug}</code>.
          </p>
          <Link to="/" className="text-sm font-black uppercase tracking-widest" style={{ color: "var(--orange)" }}>
            ← Back to Shinel Studios
          </Link>
        </Section>
      </>
    );
  }

  const client = state.client;
  const modules = Array.isArray(client.modules) ? client.modules : [];
  const renderableModules = modules.filter(m => m.enabled !== false && MODULE_REGISTRY[m.type]);

  // Make sure shinelFooter renders LAST and only once even if it's somewhere
  // in the middle of the saved order (server forces it for free tier).
  const footerIdx = renderableModules.findIndex(m => m.type === "shinelFooter");
  const footer = footerIdx >= 0 ? renderableModules.splice(footerIdx, 1)[0] : null;

  const ogImage = client.bannerUrl || client.avatarUrl || undefined;
  const titleStr = `${client.displayName || client.slug} · ${client.tagline || "Bio links"}`;
  const descStr = client.tagline || `Creator page for ${client.displayName || client.slug}.`;

  return (
    <>
      <MetaTags
        title={titleStr}
        description={descStr}
        ogImage={ogImage}
        canonicalUrl={`https://shinelstudios.in/c/${client.slug}`}
      />
      <Section size="md" className="pt-10 md:pt-16 pb-20">
        <div className="max-w-xl mx-auto space-y-5">
          {renderableModules.map((m, i) => {
            const reg = MODULE_REGISTRY[m.type];
            const Render = reg?.Render;
            if (!Render) return null;
            return (
              <motion.div
                key={`${m.type}-${i}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.06, ease: [0.4, 0, 0.2, 1] }}
              >
                <Render client={client} config={m.config || reg.defaultConfig} />
              </motion.div>
            );
          })}
          {footer ? (
            <MODULE_REGISTRY.shinelFooter.Render client={client} config={footer.config || {}} />
          ) : null}
        </div>
      </Section>
    </>
  );
}
