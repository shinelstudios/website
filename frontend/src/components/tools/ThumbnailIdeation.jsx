import React, { useState } from "react";

const STYLES = [
  { name: "Big Bold", desc: "2–3 word punch, large contrast, face crop optional" },
  { name: "Before/After", desc: "Left vs right, arrow or split, dramatic change" },
  { name: "Checklist", desc: "3 ticks / crosses, clean icons, bright accent" },
];

export default function ThumbnailIdeation() {
  const [topic, setTopic] = useState("");
  const [angle, setAngle] = useState("Fix CTR");
  const [out, setOut] = useState([]);

  const gen = () => {
    const t = topic.trim() || "Your topic";
    const a = angle.trim() || "Fix CTR";
    const bank = [
      [`${a}`, "Do THIS", "No Fluff", "It Works", "Why It Fails", "The Fix", "From 0 → 1"],
      ["Stop That", "The Truth", "We Tested", "Real Results", "1% Secrets", "Copy This", "The Play"],
      ["Step 1", "You're Wrong", "Game Changer", "Easier Way", "No More Guessing", "New Method", "Do it Right"],
    ];
    const ideas = STYLES.map((s, idx) => ({
      style: s.name,
      desc: s.desc,
      texts: bank[idx].map((w) => `${t}: ${w}`),
      composition:
        idx === 0 ? "Tight crop face on the right, big 2-3 word text left, strong outline."
      : idx === 1 ? "Split panel: BEFORE (dull) vs AFTER (bright). Add arrow & % lift."
      : "Clean white/black background with 3 concise ticks. Use brand orange as accent.",
    }));
    setOut(ideas);
  };

  return (
    <section style={{ background: "var(--surface)" }}>
      <div className="container mx-auto px-4 py-12 max-w-5xl">
        <h1 className="text-2xl md:text-3xl font-bold font-['Poppins']" style={{ color: "var(--text)" }}>
          Thumbnail Ideation
        </h1>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-[2fr_1fr_auto] gap-3">
          <Field label="Video topic" value={topic} onChange={setTopic} placeholder="Speed up editing workflow" />
          <Field label="Angle / promise" value={angle} onChange={setAngle} placeholder="Fix CTR" />
          <button onClick={gen}
                  className="rounded-xl px-4 py-2 font-semibold text-white self-end h-11"
                  style={{ background: "linear-gradient(90deg, var(--orange), #ff9357)" }}>
            Generate
          </button>
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
          {out.map(({ style, desc, texts, composition }) => (
            <div key={style} className="rounded-2xl p-4 border"
                 style={{ background:"var(--surface-alt)", borderColor:"var(--border)", color:"var(--text)" }}>
              <div className="font-semibold">{style}</div>
              <div className="text-xs mb-2" style={{ color:"var(--text-muted)" }}>{desc}</div>
              <ul className="list-disc pl-5 space-y-1">
                {texts.map((t,i)=> <li key={i}>{t}</li>)}
              </ul>
              <div className="mt-3 text-sm" style={{ color:"var(--text-muted)" }}>
                Composition: {composition}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Field({ label, value, onChange, placeholder }) {
  return (
    <div className="rounded-2xl p-4 border"
         style={{ background:"var(--surface-alt)", borderColor:"var(--border)" }}>
      <div className="text-sm mb-1" style={{ color:"var(--text)" }}>{label}</div>
      <input value={value} onChange={(e)=>onChange(e.target.value)} placeholder={placeholder}
             className="w-full h-11 rounded-lg px-3"
             style={{ background:"var(--surface)", border:"1px solid var(--border)", color:"var(--text)" }} />
    </div>
  );
}
