import React from "react";
import { Wand2, ShieldCheck, Cpu } from "lucide-react";

/** Admin-only placeholder page to list/launch internal assistants. */
const items = [
  {
    title: "Client Intake AI",
    desc: "Collects briefs, pulls example links, summarizes goals.",
    icon: Wand2,
  },
  {
    title: "Editor QA Assistant",
    desc: "Checks deliverables against checklists and style rules.",
    icon: ShieldCheck,
  },
  {
    title: "Idea Coach",
    desc: "Generates hooks, first 30 seconds, and B-roll ideas.",
    icon: Cpu,
  },
];

export default function CustomAIs() {
  return (
    <section style={{ background: "var(--surface)" }}>
      <div className="container mx-auto px-4 py-12 max-w-5xl">
        <h1 className="text-2xl md:text-3xl font-bold font-['Poppins']" style={{ color: "var(--text)" }}>
          Custom AIs (Admin)
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
          Internal assistants to speed up intake, QA, and ideation. Wire these to your preferred LLM later.
        </p>

        <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
          {items.map(({ title, desc, icon: Icon }) => (
            <div key={title}
                 className="rounded-2xl p-5 border"
                 style={{ background:"var(--surface-alt)", borderColor:"var(--border)", color:"var(--text)" }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl grid place-items-center"
                     style={{ background:"rgba(232,80,2,0.10)", border:"1px solid var(--border)" }}>
                  <Icon size={18} style={{ color:"var(--orange)" }} />
                </div>
                <div className="font-semibold">{title}</div>
              </div>
              <div className="mt-2 text-sm" style={{ color:"var(--text-muted)" }}>{desc}</div>
              <button
                className="mt-3 w-full rounded-xl px-4 py-2 font-semibold text-white"
                style={{ background: "linear-gradient(90deg, var(--orange), #ff9357)" }}
                onClick={()=>alert("Hook up to your internal chatbot URL or flow")}
              >
                Launch
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
