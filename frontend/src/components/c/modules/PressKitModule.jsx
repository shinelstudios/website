import React from "react";
import { HairlineCard } from "../../../design";
import { Download, FileText } from "lucide-react";

function fmtNum(n) {
  const v = Number(n || 0);
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + "M";
  if (v >= 1_000) return (v / 1_000).toFixed(1) + "k";
  return String(v);
}

function Render({ client, config }) {
  const [busy, setBusy] = React.useState(false);

  const generate = async () => {
    setBusy(true);
    try {
      // Lazy-load jsPDF only when the button is clicked — keeps it out of
      // the main bundle (dep weighs ~300KB).
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const W = doc.internal.pageSize.getWidth();

      // Header bar
      doc.setFillColor(232, 80, 2);
      doc.rect(0, 0, W, 56, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.text("PRESS KIT", 40, 35);
      doc.setFontSize(10);
      doc.text("shinelstudios.in/c/" + (client.slug || ""), W - 40, 35, { align: "right" });

      // Avatar (try to load, skip if CORS-blocked)
      let y = 100;
      if (client.avatarUrl) {
        try {
          const dataUrl = await fetch(client.avatarUrl).then(r => r.blob()).then(b => new Promise(res => {
            const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(b);
          }));
          doc.addImage(dataUrl, "PNG", 40, y, 110, 110);
        } catch { /* skip image, layout still works */ }
      }

      // Headline + tagline
      doc.setTextColor(15, 15, 15);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(28);
      doc.text(client.displayName || "Creator", 170, y + 30);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);
      doc.setTextColor(80, 80, 80);
      const tagline = client.tagline || "";
      const taglineLines = doc.splitTextToSize(tagline, W - 210);
      doc.text(taglineLines, 170, y + 55);

      // Stats band
      y = 230;
      if (config?.includeStats !== false) {
        doc.setFillColor(245, 245, 245);
        doc.rect(40, y, W - 80, 70, "F");
        doc.setTextColor(232, 80, 2);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.text("AT A GLANCE", 56, y + 20);
        doc.setTextColor(15, 15, 15);
        doc.setFontSize(20);
        doc.text(fmtNum(client.subscribers) + " subscribers", 56, y + 45);
        if (client.instagramFollowers > 0) {
          doc.text(fmtNum(client.instagramFollowers) + " IG followers", 280, y + 45);
        }
        y += 90;
      }

      // Bio
      if (config?.bio) {
        doc.setTextColor(232, 80, 2);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.text("ABOUT", 40, y);
        doc.setTextColor(40, 40, 40);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        const bioLines = doc.splitTextToSize(config.bio, W - 80);
        doc.text(bioLines, 40, y + 18);
        y += 18 + bioLines.length * 14 + 16;
      }

      // Channels
      doc.setTextColor(232, 80, 2);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text("CHANNELS", 40, y);
      doc.setTextColor(40, 40, 40);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      let cy = y + 18;
      if (client.youtubeId) { doc.text(`YouTube: youtube.com/channel/${client.youtubeId}`, 40, cy); cy += 14; }
      if (client.instagramHandle) { doc.text(`Instagram: instagram.com/${String(client.instagramHandle).replace(/^@/, "")}`, 40, cy); cy += 14; }
      if (config?.contactEmail) { doc.text(`Contact: ${config.contactEmail}`, 40, cy); cy += 14; }

      // Footer
      doc.setTextColor(150, 150, 150);
      doc.setFontSize(8);
      doc.text(`Generated ${new Date().toLocaleDateString("en-IN")} · Edited by Shinel Studios`, 40, doc.internal.pageSize.getHeight() - 30);

      doc.save(`presskit-${client.slug || "creator"}.pdf`);
    } catch (e) {
      alert("Could not generate PDF: " + (e.message || "unknown"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <HairlineCard className="p-5 md:p-6">
      <div className="flex items-center gap-3 mb-3">
        <span className="w-10 h-10 rounded-full grid place-items-center" style={{ background: "rgba(232,80,2,0.15)", color: "var(--orange)" }}>
          <FileText size={20} />
        </span>
        <h3 className="text-lg md:text-xl font-black" style={{ color: "var(--text)" }}>
          {config?.headline || "Press kit"}
        </h3>
      </div>
      <p className="mb-4 text-sm" style={{ color: "var(--text-muted)" }}>
        Auto-generated 1-page PDF for journalists, sponsors, and event organisers.
      </p>
      <button
        type="button"
        onClick={generate}
        disabled={busy}
        className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-bold disabled:opacity-50"
        style={{ background: "var(--orange)", color: "#fff", minHeight: 48 }}
      >
        <Download size={16} /> {busy ? "Generating…" : "Download press kit (PDF)"}
      </button>
    </HairlineCard>
  );
}

function Editor({ config, onChange }) {
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-black uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>Headline</label>
        <input type="text" value={config?.headline || ""} onChange={(e) => onChange({ ...config, headline: e.target.value })} maxLength={80} placeholder="Press kit"
          className="w-full rounded p-2 text-sm" style={{ background: "var(--surface)", border: "1px solid var(--hairline)", color: "var(--text)" }} />
      </div>
      <div>
        <label className="block text-xs font-black uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>Bio (appears on the PDF)</label>
        <textarea rows={4} value={config?.bio || ""} onChange={(e) => onChange({ ...config, bio: e.target.value })} maxLength={800} placeholder="Short bio (1-3 paragraphs) for journalists and sponsors."
          className="w-full rounded p-2 text-sm" style={{ background: "var(--surface)", border: "1px solid var(--hairline)", color: "var(--text)" }} />
      </div>
      <div>
        <label className="block text-xs font-black uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>Contact email for press inquiries</label>
        <input type="email" value={config?.contactEmail || ""} onChange={(e) => onChange({ ...config, contactEmail: e.target.value })} maxLength={254} placeholder="press@yourbrand.com"
          className="w-full rounded p-2 text-sm" style={{ background: "var(--surface)", border: "1px solid var(--hairline)", color: "var(--text)" }} />
      </div>
      <label className="inline-flex items-center gap-2 text-sm font-bold cursor-pointer" style={{ color: "var(--text)" }}>
        <input type="checkbox" checked={config?.includeStats !== false} onChange={(e) => onChange({ ...config, includeStats: e.target.checked })} className="w-4 h-4 accent-orange-500" />
        Show stats band on the PDF
      </label>
    </div>
  );
}

export default { Render, Editor };
