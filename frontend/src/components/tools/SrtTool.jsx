import React, { useState } from "react";

/**
 * Local “Auto SRT” builder:
 * - Paste text or upload .txt
 * - Choose start time + seconds per caption
 * - Exports .srt
 * NOTE: This is offline & instant; swap the generator with your AI endpoint later.
 */

const pad = (n, w = 2) => String(n).padStart(w, "0");
const msToSrtTime = (ms) => {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const msR = ms % 1000;
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad(msR, 3)}`;
};

export default function SrtTool() {
  const [text, setText] = useState("");
  const [start, setStart] = useState(0);          // ms
  const [secPerCap, setSecPerCap] = useState(3);  // seconds
  const [fileName, setFileName] = useState("captions.srt");
  const [result, setResult] = useState("");

  const onFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const t = await f.text();
    setText(t);
    if (!fileName || fileName === "captions.srt") {
      setFileName(f.name.replace(/\.(txt|md)$/i, "") + ".srt");
    }
  };

  const generate = () => {
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    let out = [];
    let t = Number(start) || 0;
    const step = Math.max(1, Number(secPerCap) || 3) * 1000;

    lines.forEach((line, i) => {
      const from = t;
      const to = t + step;
      out.push(String(i + 1));
      out.push(`${msToSrtTime(from)} --> ${msToSrtTime(to)}`);
      out.push(line);
      out.push(""); // blank
      t += step;
    });

    setResult(out.join("\n"));
  };

  const download = () => {
    const blob = new Blob([result], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = fileName || "captions.srt";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section style={{ background: "var(--surface)" }}>
      <div className="container mx-auto px-4 py-12 max-w-5xl">
        <h1 className="text-2xl md:text-3xl font-bold font-['Poppins']" style={{ color: "var(--text)" }}>
          Auto SRT (Local)
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
          Paste transcript (one caption per line) or upload .txt. Pick timing and export .srt.
        </p>

        <div className="mt-5 grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 rounded-2xl p-4 border"
               style={{ background: "var(--surface-alt)", borderColor: "var(--border)" }}>
            <div className="flex items-center justify-between gap-2 mb-2">
              <label className="text-sm font-medium" style={{ color: "var(--text)" }}>Transcript</label>
              <input type="file" accept=".txt,.md,text/plain"
                     onChange={onFile}
                     className="text-xs" />
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={12}
              className="w-full rounded-xl p-3 outline-none"
              style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
              placeholder="Each line will become one caption…"
            />
            <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2">
              <div>
                <div className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>Start time (ms)</div>
                <input type="number" value={start} onChange={(e)=>setStart(Number(e.target.value)||0)}
                  className="w-full h-10 rounded-lg px-2"
                  style={{ background:"var(--surface)", border:"1px solid var(--border)", color:"var(--text)" }} />
              </div>
              <div>
                <div className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>Seconds / caption</div>
                <input type="number" value={secPerCap} onChange={(e)=>setSecPerCap(Number(e.target.value)||3)}
                  className="w-full h-10 rounded-lg px-2"
                  style={{ background:"var(--surface)", border:"1px solid var(--border)", color:"var(--text)" }} />
              </div>
              <div className="md:col-span-2">
                <div className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>File name</div>
                <input type="text" value={fileName} onChange={(e)=>setFileName(e.target.value)}
                  className="w-full h-10 rounded-lg px-2"
                  style={{ background:"var(--surface)", border:"1px solid var(--border)", color:"var(--text)" }} />
              </div>
            </div>
            <div className="mt-3 flex gap-2 flex-wrap">
              <button onClick={generate}
                      className="rounded-xl px-4 py-2 font-semibold text-white"
                      style={{ background: "linear-gradient(90deg, var(--orange), #ff9357)" }}>
                Generate SRT
              </button>
              <button onClick={() => { setText(""); setResult(""); }}
                      className="rounded-xl px-4 py-2 font-semibold"
                      style={{ background: "var(--surface)", border: "1px solid var(--border)", color:"var(--text)" }}>
                Reset
              </button>
            </div>
          </div>

          <div className="rounded-2xl p-4 border"
               style={{ background: "var(--surface-alt)", borderColor: "var(--border)" }}>
            <div className="text-sm font-medium" style={{ color: "var(--text)" }}>Preview / Export</div>
            <textarea readOnly value={result} rows={16}
              className="mt-2 w-full rounded-xl p-3 outline-none"
              style={{ background:"var(--surface)", border:"1px solid var(--border)", color:"var(--text)", fontFamily:"ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }} />
            <button disabled={!result} onClick={download}
                    className="mt-2 w-full rounded-xl px-4 py-2 font-semibold text-white disabled:opacity-60"
                    style={{ background: "linear-gradient(90deg, var(--orange), #ff9357)" }}>
              Download .srt
            </button>
            <div className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
              Tip: swap this generator with your AI endpoint later for real timestamps.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
