/**
 * ClientPortalDashboard — /clients/me. Landing surface for logged-in clients.
 *
 * Shows: a "your page is live at /c/<slug>" card, an inbox-unread badge,
 * quick actions (edit, view public, copy share URL), and the tier banner.
 * Polls /portal/me on mount.
 */
import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { ExternalLink, Pencil, Inbox, Copy, Check, AlertTriangle, LogOut } from "lucide-react";
import { Section, HairlineCard } from "../../design";
import { authedFetch } from "../../utils/tokenStore";
import { AUTH_BASE } from "../../config/constants";
import MetaTags from "../MetaTags.jsx";

export default function ClientPortalDashboard() {
  const nav = useNavigate();
  const [state, setState] = React.useState({ loading: true, client: null, error: null });
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    authedFetch(AUTH_BASE, "/portal/me")
      .then(async (r) => {
        if (r.status === 401) { nav("/login?next=/clients/me"); return null; }
        if (!r.ok) {
          const data = await r.json().catch(() => ({}));
          throw new Error(data?.error || `HTTP ${r.status}`);
        }
        return r.json();
      })
      .then((d) => { if (d && !cancelled) setState({ loading: false, client: d.client, error: null }); })
      .catch((e) => { if (!cancelled) setState({ loading: false, client: null, error: e.message }); });
    return () => { cancelled = true; };
  }, [nav]);

  if (state.loading) {
    return (
      <Section size="md" className="pt-12 pb-20">
        <div className="max-w-3xl mx-auto h-40 rounded-xl animate-pulse" style={{ background: "var(--surface)" }} />
      </Section>
    );
  }
  if (state.error || !state.client) {
    return (
      <Section size="md" className="pt-12 pb-20">
        <HairlineCard className="p-8 text-center">
          <AlertTriangle size={28} className="mx-auto mb-3" style={{ color: "var(--orange)" }} />
          <p className="font-bold mb-2">{state.error || "No client portal attached to this account"}</p>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Ask your Shinel admin to set up portal access for your client record.
          </p>
        </HairlineCard>
      </Section>
    );
  }

  const c = state.client;
  const publicUrl = c.slug ? `https://shinelstudios.in/c/${c.slug}` : null;

  const onCopy = async () => {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* */ }
  };

  return (
    <>
      <MetaTags title="Your portal" noIndex />
      <Section size="md" className="pt-10 md:pt-14 pb-20">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: "var(--orange)" }}>
                Welcome back
              </p>
              <h1 className="text-2xl md:text-4xl font-black tracking-tight" style={{ color: "var(--text)" }}>
                {c.displayName || c.name}
              </h1>
            </div>
            <Link to="/logout" className="text-xs font-black uppercase tracking-widest inline-flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
              <LogOut size={14} /> Sign out
            </Link>
          </div>

          {!c.publicEnabled && (
            <HairlineCard className="p-5 mb-5" style={{ background: "rgba(232,80,2,0.06)" }}>
              <p className="text-sm font-bold" style={{ color: "var(--orange)" }}>
                Your page is not public yet.
              </p>
              <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
                Open the editor, set a slug, and toggle "Public" to make /c/{c.slug || "your-handle"} live.
              </p>
            </HairlineCard>
          )}

          <HairlineCard className="p-5 md:p-6 mb-5">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: "var(--text-muted)" }}>
                  Your public URL
                </p>
                {publicUrl ? (
                  <p className="mt-1 font-mono text-sm md:text-base break-all" style={{ color: "var(--text)" }}>
                    {publicUrl}
                  </p>
                ) : (
                  <p className="mt-1 text-sm italic" style={{ color: "var(--text-muted)" }}>
                    Set a slug in the editor to claim your /c/ URL.
                  </p>
                )}
              </div>
              {publicUrl && (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={onCopy}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest"
                    style={{ background: "var(--surface)", border: "1px solid var(--hairline)", color: "var(--text)", minHeight: 44 }}
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    {copied ? "Copied" : "Copy"}
                  </button>
                  <a
                    href={publicUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest"
                    style={{ background: "var(--orange)", color: "#fff", minHeight: 44 }}
                  >
                    <ExternalLink size={14} /> View
                  </a>
                </div>
              )}
            </div>
          </HairlineCard>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
            <Link to="/clients/me/edit" className="block">
              <HairlineCard className="p-5 hover:translate-y-[-2px] transition-transform">
                <Pencil size={20} style={{ color: "var(--orange)" }} />
                <p className="mt-3 text-base font-black" style={{ color: "var(--text)" }}>Edit your page</p>
                <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
                  Toggle modules, set links, change tagline.
                </p>
              </HairlineCard>
            </Link>
            <Link to="/clients/me/inbox" className="block">
              <HairlineCard className="p-5 hover:translate-y-[-2px] transition-transform">
                <div className="flex items-center justify-between">
                  <Inbox size={20} style={{ color: "var(--orange)" }} />
                  {c.inboxUnread > 0 ? (
                    <span className="text-[10px] font-black px-2 py-1 rounded-full" style={{ background: "var(--orange)", color: "#fff" }}>
                      {c.inboxUnread} NEW
                    </span>
                  ) : null}
                </div>
                <p className="mt-3 text-base font-black" style={{ color: "var(--text)" }}>Inbox</p>
                <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
                  Sponsor inquiries, contact messages, newsletter signups.
                </p>
              </HairlineCard>
            </Link>
          </div>

          <p className="text-xs text-center" style={{ color: "var(--text-muted)" }}>
            Tier: <strong>{c.tier || "free"}</strong>
            {" · "}
            <Link to="/contact" style={{ color: "var(--orange)" }}>Need help?</Link>
          </p>
        </div>
      </Section>
    </>
  );
}
