import React, { useState } from "react";

/** Lightweight on-device title/desc/tag suggester (no API calls). */
const toSlugTags = (s) =>
  Array.from(new Set(
    s.toLowerCase()
      .replace(/[^a-z0-9\s,|#]+/gi, " ")
      .split(/[\s,|]+/g)
      .filter(Boolean)
  ));

export default function SeoTool() {
  const [topic, setTopic] = useState("");
  const [niche, setNiche] = useState("YouTube");
  const [aud, setAud] = useState("creators");
  const [tone, setTone] = useState("punchy");
  const [ideas, setIdeas] = useState([]);
  const [desc, setDesc] = useState("");
  const [tags, setTags] = useState([]);

  const gen = () => {
    const base = topic.trim();
    if (!base) return;

    const hooks = [
      "Do THIS before you upload",
      "Stop doing this wrong",
      "The simple trick nobody told you",
      "From 0 to 100K: the playbook",
      "We tested it so you don't have to",
      "What pros do differently",
      "The step you’re skipping",
      "Fix your CTR in 24 hours",
      "Secrets from top 1%",
      "The exact workflow I use",
    ];

    const styles = {
      punchy: ["", " (FAST)", " in 60 seconds", " — no fluff", " (works in 2025)"],
      helpful: [" tutorial", " guide", " for beginners", " explained", " (full walkthrough)"],
      intrigue: [": crazy results", " — revealed", " (no clickbait)", " they won’t tell you", " that actually works"],
    };

    const suffixes = styles[tone] || styles.punchy;

    const titles = hooks.slice(0, 10).map((h, i) => {
      const suf = suffixes[i % suffixes.length];
      return `${base}: ${h}${suf}`;
    });

    const d =
      `Learn **${base}** for ${aud} in the ${niche} space. In this video we cover
tools, mistakes to avoid, and a repeatable workflow. Chapters below.`;

    const t = Array.from(new Set([
      ...toSlugTags(base),
      niche.toLowerCase(),
      ...toSlugTags(hooks.join(" ")),
    ])).slice(0, 15);

    setIdeas(titles);
    setDesc(d);
    setTags(t);
  };

  return (
    <section style={{ background: "var(--surface)" }}>
      <div className="container mx-auto px-4 py-12 max-w-5xl">
        <h1 className="text-2xl md:text-3xl font-bold font-heading" style={{ color: "var(--text)" }}>
          SEO Tool (Titles • Description • Tags)
        </h1>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3">
          <Field label="Topic / core value" value={topic} onChange={setTopic} placeholder="Fix low CTR on tutorials" />
          <Select label="Platform / niche" value={niche} onChange={setNiche} options={["YouTube", "Reels", "Shorts", "B2B", "Gaming", "Education"]} />
          <Select label="Audience" value={aud} onChange={setAud} options={["creators", "editors", "beginners", "marketers", "founders"]} />
          <Select label="Tone" value={tone} onChange={setTone} options={["punchy", "helpful", "intrigue"]} />
        </div>

        <div className="mt-3 flex gap-2 flex-wrap">
          <button onClick={gen} className="rounded-xl px-4 py-2 font-semibold text-white"
            style={{ background: "linear-gradient(90deg, var(--orange), #ff9357)" }}>
            Generate
          </button>
          <button onClick={() => { setTopic(""); setIdeas([]); setDesc(""); setTags([]); }}
            className="rounded-xl px-4 py-2 font-semibold"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}>
            Reset
          </button>
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card title="Title ideas">
            <ol className="list-decimal pl-5 space-y-1">
              {ideas.map((t, i) => <li key={i}>{t}</li>)}
            </ol>
          </Card>
          <Card title="Description (markdown)">
            <textarea rows={14} value={desc} onChange={(e) => setDesc(e.target.value)}
              className="w-full rounded-xl p-3 outline-none"
              style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }} />
          </Card>
        </div>

        <Card className="mt-4" title="Tags">
          <div className="flex flex-wrap gap-2">
            {tags.map((t, i) => (
              <span key={i} className="text-xs px-2 py-1 rounded-full"
                style={{ border: "1px solid var(--border)", background: "var(--surface-alt)", color: "var(--text)" }}>
                #{t}
              </span>
            ))}
          </div>
        </Card>
      </div>
    </section>
  );
}

function Field({ label, value, onChange, placeholder }) {
  return (
    <div className="rounded-2xl p-4 border"
      style={{ background: "var(--surface-alt)", borderColor: "var(--border)" }}>
      <div className="text-sm mb-1" style={{ color: "var(--text)" }}>{label}</div>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full h-10 rounded-lg px-3"
        style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }} />
    </div>
  );
}
function Select({ label, value, onChange, options }) {
  return (
    <div className="rounded-2xl p-4 border"
      style={{ background: "var(--surface-alt)", borderColor: "var(--border)" }}>
      <div className="text-sm mb-1" style={{ color: "var(--text)" }}>{label}</div>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full h-10 rounded-lg px-3"
        style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}
function Card({ title, children, className = "" }) {
  return (
    <div className={`rounded-2xl p-4 border ${className}`}
      style={{ background: "var(--surface-alt)", borderColor: "var(--border)", color: "var(--text)" }}>
      <div className="text-sm font-medium mb-2">{title}</div>
      {children}
    </div>
  );
}
