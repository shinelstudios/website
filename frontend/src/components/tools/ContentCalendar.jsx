/**
 * ContentCalendar — "30-day content calendar starter" tool.
 *
 * Pure frontend, template-driven. Pick a niche + cadence, get a 30-day
 * posting plan with suggested title + thumbnail concept per slot. No
 * LLM calls, no worker dependency — just a well-thought-through template
 * set per niche. This is fast, deterministic, and free.
 *
 * Design note: we rotate hook frames so the plan isn't 30 iterations
 * of the same idea. Each niche has 8+ hook archetypes and the renderer
 * cycles through them with slot-aware variations.
 */
import React, { useMemo, useState } from "react";
import { Calendar, Download, Copy, Sparkles, RefreshCw, CheckCircle2 } from "lucide-react";
import MetaTags, { BreadcrumbSchema } from "../MetaTags";
import { Kicker, Display, Lede, RevealOnScroll } from "../../design";

const NICHES = [
  {
    key: "gaming",
    label: "Gaming",
    hooks: [
      { title: "I played {GAME} for 24 hours and this happened", thumb: "Close-up reaction face + stat overlay (+N hrs)" },
      { title: "{GAME}'s hidden {FEATURE} nobody uses", thumb: "Screenshot of detail with red arrow + surprised face" },
      { title: "Every new {GAME} player does this wrong", thumb: "Split screen: wrong vs right, red X / green check" },
      { title: "The {GAME} meta just broke — here's what's next", thumb: "Big 'META' text + character tier shift" },
      { title: "I tried the worst-rated {GAME} strategy and…", thumb: "Thumbs down → thumbs up transition" },
      { title: "Ranking every {GAME} {THING} from worst to god-tier", thumb: "Tier list grid, yours ghosted in bg" },
      { title: "This {GAME} glitch will save you 10 hours", thumb: "Clock + bug icon, outlined subject" },
      { title: "{GAME} pros hate this — but it works", thumb: "Pro face covered with emoji + chart spike" },
    ],
    things: ["weapon", "map", "character", "strategy", "update"],
    game: "this game",
  },
  {
    key: "vlog",
    label: "Vlog / Lifestyle",
    hooks: [
      { title: "A day in my life as a {ROLE} in {CITY}", thumb: "Wide shot of your morning spot + time overlay" },
      { title: "I tried {HABIT} for 30 days and here's what happened", thumb: "Before/after side-by-side + big number" },
      { title: "Why I quit {THING} and what I do instead", thumb: "Strike-through old habit, arrow to new" },
      { title: "My honest review of {PRODUCT} after 6 months", thumb: "Product in hand + star rating" },
      { title: "The routine that changed my life (takes 15 minutes)", thumb: "Stopwatch + you smiling" },
      { title: "I spent a week living like {PERSON}", thumb: "Side-by-side comparison portraits" },
      { title: "Things I wish I knew at {AGE}", thumb: "Text-heavy list + you pointing at camera" },
      { title: "The cheapest {THING} I've bought — and the most expensive", thumb: "Two prices side-by-side, shocked face" },
    ],
    things: ["habit", "routine", "product", "place", "mindset"],
    game: "",
  },
  {
    key: "tech",
    label: "Tech / Reviews",
    hooks: [
      { title: "The {PRODUCT} one year later — is it still worth it?", thumb: "Product on desk + '1 YEAR' big text" },
      { title: "I stopped using {APP} — here's what I switched to", thumb: "Old app logo crossed out, new logo glowing" },
      { title: "Every {PRODUCT} creator is lying about this", thumb: "Close-up detail + red 'LIE' stamp" },
      { title: "{PRODUCT} vs {PRODUCT} — which actually wins?", thumb: "Two products facing off, VS sparks" },
      { title: "Hidden {PRODUCT} features I wish I knew sooner", thumb: "Settings screenshot + 'HIDDEN' text" },
      { title: "I built a {THING} for under $100 — and it works", thumb: "Your setup + big '$100' badge" },
      { title: "Stop buying {PRODUCT} — do this instead", thumb: "Strike-through product + arrow" },
      { title: "The truth about {TREND}", thumb: "Trend logo + pulled-back curtain" },
    ],
    things: ["phone", "laptop", "app", "setup", "accessory"],
    game: "",
  },
  {
    key: "finance",
    label: "Finance / Advisor",
    hooks: [
      { title: "How I saved ₹{AMOUNT} in {MONTHS} months", thumb: "Money stack + rising arrow" },
      { title: "The {AGE}-year-old who retired by {AGE+15} — here's the math", thumb: "Calculator + beach silhouette" },
      { title: "Why I stopped {FINANCIAL_HABIT}", thumb: "Crossed-out habit icon + new plan" },
      { title: "Every {AGE}-year-old should do this with their money", thumb: "Person pointing at 3-column chart" },
      { title: "I tried the {NAME} money method for 90 days", thumb: "Calendar grid + red/green days" },
      { title: "The mistake costing you ₹{AMOUNT}/year", thumb: "Big money leak graphic + shocked face" },
      { title: "{INSTRUMENT} vs {INSTRUMENT} — which grows your wealth faster?", thumb: "Two growth lines racing" },
      { title: "Stop saving. Start doing THIS.", thumb: "Piggy bank with red X → dollar plant" },
    ],
    things: ["SIP", "FD", "index fund", "gold", "real estate"],
    game: "",
  },
  {
    key: "education",
    label: "Educational",
    hooks: [
      { title: "Everything you need to know about {TOPIC} in 10 minutes", thumb: "Clock icon + topic visual" },
      { title: "The {TOPIC} mistake every beginner makes", thumb: "Red X on common approach + check" },
      { title: "I explained {COMPLEX_TOPIC} to my grandma — here's how", thumb: "Old-school blackboard + simple diagram" },
      { title: "{TOPIC}: the ONE thing that actually matters", thumb: "Isolated key element + glow" },
      { title: "Why {POPULAR_BELIEF} is wrong (with proof)", thumb: "Myth label + red strike-through" },
      { title: "A {PROFESSION} explains {TOPIC} in plain English", thumb: "You in role attire + speech bubble" },
      { title: "{TOPIC} timeline: how we got here", thumb: "Timeline graphic, key dates highlighted" },
      { title: "The real reason {PHENOMENON} keeps happening", thumb: "Cause → effect arrows, you pointing" },
    ],
    things: ["physics", "history", "economy", "biology", "language"],
    game: "",
  },
];

const CADENCES = [
  { key: "daily", label: "Daily (30 videos)", everyNDays: 1 },
  { key: "3x",    label: "3× per week (~13)", everyNDays: 2 },
  { key: "2x",    label: "2× per week (~9)",  everyNDays: 3 },
  { key: "weekly",label: "Weekly (~4)",       everyNDays: 7 },
];

function pickThing(things, i) {
  return things[i % things.length] || "topic";
}

function renderHook(hook, slot, niche) {
  const thing = pickThing(niche.things, slot);
  return {
    title: hook.title
      .replace(/\{GAME\}/g, niche.game || "this")
      .replace(/\{FEATURE\}/g, "feature")
      .replace(/\{THING\}/g, thing)
      .replace(/\{TOPIC\}/g, thing)
      .replace(/\{COMPLEX_TOPIC\}/g, thing)
      .replace(/\{POPULAR_BELIEF\}/g, `${thing} is simple`)
      .replace(/\{PHENOMENON\}/g, thing)
      .replace(/\{PROFESSION\}/g, "pro")
      .replace(/\{ROLE\}/g, "creator")
      .replace(/\{CITY\}/g, "your city")
      .replace(/\{HABIT\}/g, thing)
      .replace(/\{PRODUCT\}/g, thing)
      .replace(/\{APP\}/g, thing)
      .replace(/\{TREND\}/g, `the ${thing} trend`)
      .replace(/\{NAME\}/g, "50/30/20")
      .replace(/\{AMOUNT\}/g, "1,00,000")
      .replace(/\{MONTHS\}/g, "6")
      .replace(/\{AGE\+15\}/g, "35")
      .replace(/\{AGE\}/g, "25")
      .replace(/\{FINANCIAL_HABIT\}/g, thing)
      .replace(/\{INSTRUMENT\}/g, thing)
      .replace(/\{PERSON\}/g, "my favourite creator"),
    thumb: hook.thumb,
  };
}

function generatePlan(niche, cadence, startDateStr) {
  const plan = [];
  const startDate = new Date(startDateStr || Date.now());
  const target = 30;
  let day = 0;
  while (day < target) {
    if (day % cadence.everyNDays === 0) {
      const slot = plan.length;
      const hook = niche.hooks[slot % niche.hooks.length];
      const rendered = renderHook(hook, slot, niche);
      const d = new Date(startDate);
      d.setDate(d.getDate() + day);
      plan.push({
        day: day + 1,
        date: d.toISOString().slice(0, 10),
        title: rendered.title,
        thumb: rendered.thumb,
      });
    }
    day++;
  }
  return plan;
}

/* ---------- component ---------- */

export default function ContentCalendar() {
  const [nicheKey, setNicheKey] = useState("gaming");
  const [cadenceKey, setCadenceKey] = useState("3x");
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [seed, setSeed] = useState(0); // forces re-render / rotation feel
  const [copied, setCopied] = useState(false);

  const niche = NICHES.find(n => n.key === nicheKey) || NICHES[0];
  const cadence = CADENCES.find(c => c.key === cadenceKey) || CADENCES[1];

  const plan = useMemo(() => {
    // seed is only a trigger — the plan itself is deterministic off niche+cadence+date
    return generatePlan(niche, cadence, startDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nicheKey, cadenceKey, startDate, seed]);

  const asText = useMemo(() => {
    return plan.map(p => `Day ${p.day} (${p.date})\n  • ${p.title}\n  • Thumbnail: ${p.thumb}`).join("\n\n");
  }, [plan]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(asText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* noop */ }
  };

  const downloadCsv = () => {
    const header = "day,date,title,thumbnail_concept\n";
    const rows = plan.map(p =>
      [p.day, p.date, JSON.stringify(p.title), JSON.stringify(p.thumb)].join(",")
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `content-calendar-${nicheKey}-${startDate}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <main className="min-h-[100svh] bg-[var(--bg)]" style={{ color: "var(--text)" }}>
      <MetaTags
        title="Content Calendar Starter (30-day plan) — Shinel Studios"
        description="Pick a niche and cadence. Get a 30-day YouTube content calendar with title + thumbnail concept per slot. Free, no sign-up."
        path="/tools/content-calendar"
      />
      <BreadcrumbSchema
        items={[
          { name: "Tools", url: "/tools" },
          { name: "Content Calendar", url: "/tools/content-calendar" },
        ]}
      />

      <section className="pt-24 md:pt-32 pb-10">
        <div className="container mx-auto px-4 max-w-5xl">
          <RevealOnScroll><Kicker>Free creator tool</Kicker></RevealOnScroll>
          <RevealOnScroll delay="80ms">
            <Display as="h1" size="xl">
              30-day content <span style={{ color: "var(--orange)" }}>calendar starter.</span>
            </Display>
          </RevealOnScroll>
          <RevealOnScroll delay="160ms">
            <Lede>
              Pick your niche and cadence. Get a deterministic 30-day posting plan — titles and
              thumbnail concepts for every slot. Template-driven. No LLM, no fluff.
            </Lede>
          </RevealOnScroll>
        </div>
      </section>

      <section className="pb-24">
        <div className="container mx-auto px-4 max-w-5xl">
          {/* Controls */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
            <div>
              <label className="text-xs uppercase tracking-widest font-bold mb-1 block" style={{ color: "var(--text-muted)" }}>Niche</label>
              <select
                value={nicheKey}
                onChange={(e) => setNicheKey(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border bg-transparent text-sm font-bold focus-visible:ring-2 focus-visible:ring-orange-500/60 outline-none"
                style={{ borderColor: "var(--border)", color: "var(--text)" }}
              >
                {NICHES.map(n => <option key={n.key} value={n.key}>{n.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest font-bold mb-1 block" style={{ color: "var(--text-muted)" }}>Cadence</label>
              <select
                value={cadenceKey}
                onChange={(e) => setCadenceKey(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border bg-transparent text-sm font-bold focus-visible:ring-2 focus-visible:ring-orange-500/60 outline-none"
                style={{ borderColor: "var(--border)", color: "var(--text)" }}
              >
                {CADENCES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest font-bold mb-1 block" style={{ color: "var(--text-muted)" }}>Start date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border bg-transparent text-sm font-bold focus-visible:ring-2 focus-visible:ring-orange-500/60 outline-none"
                style={{ borderColor: "var(--border)", color: "var(--text)" }}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 mb-6">
            <div className="inline-flex items-center gap-2 text-sm" style={{ color: "var(--text-muted)" }}>
              <Calendar size={14} />
              {plan.length} slots over 30 days
            </div>
            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSeed(s => s + 1)}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold border hover:bg-[var(--surface-alt)] focus-visible:ring-2 focus-visible:ring-[var(--orange)]"
                style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text)" }}
                aria-label="Regenerate"
              >
                <RefreshCw size={14} />
                Refresh
              </button>
              <button
                type="button"
                onClick={copy}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold border hover:bg-[var(--surface-alt)] focus-visible:ring-2 focus-visible:ring-[var(--orange)]"
                style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text)" }}
              >
                {copied ? <CheckCircle2 size={14} style={{ color: "#22c55e" }} /> : <Copy size={14} />}
                {copied ? "Copied" : "Copy plan"}
              </button>
              <button
                type="button"
                onClick={downloadCsv}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold focus-visible:ring-2 focus-visible:ring-[var(--orange)]"
                style={{ background: "var(--orange)", color: "#fff" }}
              >
                <Download size={14} />
                Download CSV
              </button>
            </div>
          </div>

          {/* Plan */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {plan.map((p, i) => (
              <div
                key={i}
                className="p-4 rounded-2xl border"
                style={{ background: "var(--surface)", borderColor: "var(--border)" }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black uppercase tracking-widest" style={{ color: "var(--orange)" }}>
                    Day {p.day}
                  </span>
                  <span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>
                    {p.date}
                  </span>
                </div>
                <div className="text-sm font-bold mb-2" style={{ color: "var(--text)" }}>
                  {p.title}
                </div>
                <div className="text-xs flex items-start gap-1" style={{ color: "var(--text-muted)" }}>
                  <Sparkles size={11} className="mt-0.5 shrink-0" style={{ color: "var(--orange)" }} />
                  {p.thumb}
                </div>
              </div>
            ))}
          </div>

          <p className="text-xs mt-6" style={{ color: "var(--text-muted)" }}>
            Templates rotate across 8 hook archetypes per niche. Replace placeholders with your actual topics —
            this is a scaffold, not a recipe.
          </p>
        </div>
      </section>
    </main>
  );
}
