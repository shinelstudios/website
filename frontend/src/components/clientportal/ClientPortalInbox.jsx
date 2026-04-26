/**
 * ClientPortalInbox — /clients/me/inbox. Sponsor inquiries, contact
 * messages, newsletter signups in one chronological list. Tab filter.
 */
import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronLeft, AlertTriangle, Download, Mail, Pin, PinOff, MessageCircle } from "lucide-react";
import { Section, HairlineCard } from "../../design";
import { authedFetch, getAccessToken } from "../../utils/tokenStore";
import { AUTH_BASE } from "../../config/constants";
import MetaTags from "../MetaTags.jsx";

const TYPE_LABELS = {
  sponsor: "Sponsor", contact: "Contact", newsletter: "Newsletter",
  wall: "Fan wall", ama: "AMA", devLog: "Devlog",
};
const TYPE_COLORS = {
  sponsor: "#E85002", contact: "#FFD27A", newsletter: "#9B59B6",
  wall: "#9B59B6", ama: "#FFD27A", devLog: "#16a34a",
};

function fmtTime(ms) {
  if (!ms) return "";
  const d = new Date(Number(ms));
  return d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

export default function ClientPortalInbox() {
  const nav = useNavigate();
  const [loading, setLoading] = React.useState(true);
  const [items, setItems] = React.useState([]);
  const [filter, setFilter] = React.useState("all");
  const [error, setError] = React.useState(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await authedFetch(AUTH_BASE, "/portal/me/inbox?limit=200");
      if (res.status === 401) { nav("/login?next=/clients/me/inbox"); return; }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setItems(Array.isArray(data?.items) ? data.items : []);
      setError(null);
    } catch (e) {
      setError(e.message || "Load failed");
    } finally {
      setLoading(false);
    }
  }, [nav]);

  React.useEffect(() => { load(); }, [load]);

  const markRead = async (id) => {
    setItems(prev => prev.map(it => it.id === id ? { ...it, readAt: Date.now() } : it));
    try {
      await authedFetch(AUTH_BASE, `/portal/me/inbox/${encodeURIComponent(id)}/read`, { method: "PATCH" });
    } catch { /* */ }
  };

  const togglePin = async (id, pin) => {
    setItems(prev => prev.map(it => it.id === id ? { ...it, pinnedAt: pin ? Date.now() : null } : it));
    try {
      await authedFetch(AUTH_BASE, `/portal/me/inbox/${encodeURIComponent(id)}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pin }),
      });
    } catch { /* */ }
  };

  const submitAnswer = async (id, answer) => {
    setItems(prev => prev.map(it => it.id === id ? { ...it, payload: { ...it.payload, answer }, pinnedAt: Date.now(), readAt: Date.now() } : it));
    try {
      await authedFetch(AUTH_BASE, `/portal/me/inbox/${encodeURIComponent(id)}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answer }),
      });
    } catch { /* */ }
  };

  const downloadNewsletterCsv = async () => {
    try {
      const token = getAccessToken();
      const res = await fetch(`${AUTH_BASE}/portal/me/inbox/newsletter.csv`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "newsletter.csv";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      alert("Could not download CSV: " + (e.message || "unknown"));
    }
  };

  const filtered = items.filter(it => filter === "all" || it.type === filter);

  return (
    <>
      <MetaTags title="Inbox" noIndex />
      <Section size="lg" className="pt-10 md:pt-14 pb-24">
        <div className="max-w-3xl mx-auto">
          <Link to="/clients/me" className="text-xs font-black uppercase tracking-widest inline-flex items-center gap-1 mb-4" style={{ color: "var(--text-muted)" }}>
            <ChevronLeft size={14} /> Back to dashboard
          </Link>

          <div className="flex items-center justify-between gap-4 mb-5 flex-wrap">
            <h1 className="text-2xl md:text-4xl font-black" style={{ color: "var(--text)" }}>Inbox</h1>
            <button
              type="button"
              onClick={downloadNewsletterCsv}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest"
              style={{ background: "var(--surface)", border: "1px solid var(--hairline)", color: "var(--text)" }}
            >
              <Download size={14} /> Newsletter CSV
            </button>
          </div>

          <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
            {["all", "sponsor", "contact", "newsletter", "wall", "ama", "devLog"].map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setFilter(t)}
                className="px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest whitespace-nowrap"
                style={{
                  background: filter === t ? "var(--orange)" : "var(--surface)",
                  color: filter === t ? "#fff" : "var(--text-muted)",
                  border: "1px solid " + (filter === t ? "var(--orange)" : "var(--hairline)"),
                }}
              >
                {t === "all" ? "All" : TYPE_LABELS[t]} {t !== "all" ? `(${items.filter(i => i.type === t).length})` : `(${items.length})`}
              </button>
            ))}
          </div>

          {loading ? (
            <HairlineCard className="p-8 text-center text-sm" style={{ color: "var(--text-muted)" }}>Loading…</HairlineCard>
          ) : error ? (
            <HairlineCard className="p-8 text-center">
              <AlertTriangle size={28} className="mx-auto mb-3" style={{ color: "var(--orange)" }} />
              <p className="font-bold">{error}</p>
            </HairlineCard>
          ) : filtered.length === 0 ? (
            <HairlineCard className="p-8 text-center text-sm" style={{ color: "var(--text-muted)" }}>
              <Mail size={28} className="mx-auto mb-3 opacity-50" />
              No {filter === "all" ? "messages" : TYPE_LABELS[filter].toLowerCase() + " messages"} yet.
            </HairlineCard>
          ) : (
            <div className="space-y-3">
              {filtered.map(it => (
                <HairlineCard
                  key={it.id}
                  className="p-4 md:p-5"
                  style={{
                    background: it.readAt ? "var(--surface)" : "rgba(232,80,2,0.04)",
                    borderColor: it.readAt ? "var(--hairline)" : "rgba(232,80,2,0.25)",
                  }}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] px-2 py-1 rounded-full" style={{ background: TYPE_COLORS[it.type], color: "#fff" }}>
                      {TYPE_LABELS[it.type] || it.type}
                    </span>
                    <span className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>{fmtTime(it.createdAt)}</span>
                  </div>
                  {it.type === "newsletter" ? (
                    <p className="font-bold text-sm" style={{ color: "var(--text)" }}>{it.payload?.email}</p>
                  ) : it.type === "wall" ? (
                    <>
                      <p className="text-sm" style={{ color: "var(--text)" }}>
                        <strong>{it.payload?.name || "Anonymous"}</strong> says:
                      </p>
                      <p className="mt-1 text-sm whitespace-pre-wrap" style={{ color: "var(--text-muted)" }}>
                        {it.payload?.message}
                      </p>
                    </>
                  ) : it.type === "ama" ? (
                    <AmaInboxRow it={it} onAnswer={submitAnswer} />
                  ) : it.type === "devLog" ? (
                    <>
                      <p className="text-[10px] font-mono mb-1" style={{ color: "var(--text-muted)" }}>
                        Posted by {it.payload?.postedBy || "Shinel team"}
                      </p>
                      <p className="text-sm whitespace-pre-wrap" style={{ color: "var(--text)" }}>{it.payload?.body}</p>
                    </>
                  ) : (
                    <>
                      <div className="text-sm" style={{ color: "var(--text)" }}>
                        <strong>{it.payload?.name || "Anonymous"}</strong>{" · "}
                        <a href={`mailto:${it.payload?.email || ""}`} style={{ color: "var(--orange)" }}>{it.payload?.email}</a>
                        {it.payload?.brand ? <> · brand: <strong>{it.payload.brand}</strong></> : null}
                        {it.payload?.budget ? <> · budget: <strong>{it.payload.budget}</strong></> : null}
                      </div>
                      {it.payload?.message ? (
                        <p className="mt-2 text-sm whitespace-pre-wrap" style={{ color: "var(--text-muted)" }}>
                          {it.payload.message}
                        </p>
                      ) : null}
                    </>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {!it.readAt && it.type !== "ama" && (
                      <button
                        type="button"
                        onClick={() => markRead(it.id)}
                        className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded"
                        style={{ background: "transparent", border: "1px solid var(--hairline)", color: "var(--text-muted)" }}
                      >
                        Mark read
                      </button>
                    )}
                    {it.type === "wall" && (
                      <button
                        type="button"
                        onClick={() => togglePin(it.id, !it.pinnedAt)}
                        className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded inline-flex items-center gap-1"
                        style={{
                          background: it.pinnedAt ? "var(--orange)" : "transparent",
                          color: it.pinnedAt ? "#fff" : "var(--text-muted)",
                          border: it.pinnedAt ? "1px solid var(--orange)" : "1px solid var(--hairline)",
                        }}
                      >
                        {it.pinnedAt ? <><Pin size={10} /> Pinned</> : <><PinOff size={10} /> Pin to wall</>}
                      </button>
                    )}
                  </div>
                </HairlineCard>
              ))}
            </div>
          )}
        </div>
      </Section>
    </>
  );
}

// AMA inbox row — shows the question, lets the creator type and submit
// an answer. The answer auto-pins (i.e. publishes) the row.
function AmaInboxRow({ it, onAnswer }) {
  const [answer, setAnswer] = React.useState(it.payload?.answer || "");
  const [editing, setEditing] = React.useState(!it.payload?.answer);
  const submit = () => {
    if (!answer.trim()) return;
    onAnswer(it.id, answer.trim());
    setEditing(false);
  };
  return (
    <>
      <p className="text-xs font-bold mb-1" style={{ color: "var(--orange)" }}>
        {it.payload?.name ? `${it.payload.name} asks:` : "Someone asks:"}
      </p>
      <p className="text-sm mb-2" style={{ color: "var(--text)" }}>{it.payload?.question}</p>
      {editing ? (
        <div className="space-y-2">
          <textarea
            rows={2}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            maxLength={1000}
            placeholder="Type your answer (publishes immediately)…"
            className="w-full rounded p-2.5 text-sm"
            style={{ background: "var(--surface-alt)", border: "1px solid var(--hairline)", color: "var(--text)" }}
          />
          <button
            type="button"
            onClick={submit}
            disabled={!answer.trim()}
            className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded disabled:opacity-40"
            style={{ background: "var(--orange)", color: "#fff" }}
          >
            Answer & publish
          </button>
        </div>
      ) : (
        <>
          <p className="text-xs font-mono mb-1" style={{ color: "var(--text-muted)" }}>Your answer (live):</p>
          <p className="text-sm whitespace-pre-wrap" style={{ color: "var(--text-muted)" }}>{answer}</p>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="mt-2 text-[10px] font-black uppercase tracking-widest"
            style={{ color: "var(--orange)" }}
          >
            Edit answer
          </button>
        </>
      )}
    </>
  );
}
