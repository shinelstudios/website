// app/api/youtube-captions/route.js
// Next.js App Router API route (Node runtime)
export const runtime = "nodejs";

function extractVideoId(input) {
  if (!input) return null;

  // If user pasted only ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(input.trim())) return input.trim();

  try {
    const url = new URL(input.trim());
    // youtu.be/<id>
    if (url.hostname.includes("youtu.be")) {
      const id = url.pathname.split("/").filter(Boolean)[0];
      return id && id.length === 11 ? id : null;
    }
    // youtube.com/watch?v=<id>
    const v = url.searchParams.get("v");
    if (v && v.length === 11) return v;

    // /shorts/<id> or /embed/<id>
    const parts = url.pathname.split("/").filter(Boolean);
    const shortsIdx = parts.indexOf("shorts");
    if (shortsIdx !== -1 && parts[shortsIdx + 1]?.length === 11) return parts[shortsIdx + 1];
    const embedIdx = parts.indexOf("embed");
    if (embedIdx !== -1 && parts[embedIdx + 1]?.length === 11) return parts[embedIdx + 1];

    return null;
  } catch {
    return null;
  }
}

function extractJsonByBrace(html, marker) {
  const idx = html.indexOf(marker);
  if (idx === -1) return null;
  const start = html.indexOf("{", idx);
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < html.length; i++) {
    const ch = html[i];

    if (inString) {
      if (escape) {
        escape = false;
      } else if (ch === "\\") {
        escape = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') inString = true;
    if (ch === "{") depth++;
    if (ch === "}") depth--;

    if (depth === 0) {
      const jsonStr = html.slice(start, i + 1);
      try {
        return JSON.parse(jsonStr);
      } catch {
        return null;
      }
    }
  }
  return null;
}

function toPlainTextFromVtt(vtt) {
  const blocks = vtt.split(/\n\n+/);
  const lines = [];
  for (const b of blocks) {
    const parts = b.split("\n").filter(Boolean);
    if (!parts.length) continue;

    // detect timing line
    const tIdx = parts.findIndex((l) => l.includes("-->"));
    if (tIdx === -1) continue;

    const textLines = parts.slice(tIdx + 1).join(" ");
    const cleaned = textLines
      .replace(/<[^>]+>/g, "")         // strip tags
      .replace(/\s+/g, " ")
      .trim();

    if (cleaned) lines.push(cleaned);
  }
  return lines.join("\n");
}

function toPlainTextFromJson3(json3) {
  const events = json3?.events || [];
  const out = [];
  for (const ev of events) {
    if (!ev?.segs) continue;
    const txt = ev.segs.map((s) => s.utf8 || "").join("").replace(/\s+/g, " ").trim();
    if (txt) out.push(txt);
  }
  return out.join("\n");
}

async function fetchCaptionContent(trackBaseUrl, videoId, lang, isAuto) {
  // 1) JSON3
  const json3Url = `${trackBaseUrl}&fmt=json3`;
  try {
    const r = await fetch(json3Url, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (r.ok) {
      const txt = await r.text();
      // sometimes returns xml/vtt; ensure JSON
      if (txt.trim().startsWith("{")) {
        const json = JSON.parse(txt);
        return { format: "json3", raw: json, text: toPlainTextFromJson3(json), download: json3Url };
      }
    }
  } catch {}

  // 2) VTT
  const vttUrl = `${trackBaseUrl}&fmt=vtt`;
  try {
    const r = await fetch(vttUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (r.ok) {
      const vtt = await r.text();
      if (vtt.includes("-->")) {
        return { format: "vtt", raw: vtt, text: toPlainTextFromVtt(vtt), download: vttUrl };
      }
    }
  } catch {}

  // 3) timedtext fallback
  const timedText = new URL("https://video.google.com/timedtext");
  timedText.searchParams.set("v", videoId);
  timedText.searchParams.set("lang", lang || "en");
  timedText.searchParams.set("fmt", "vtt");
  if (isAuto) timedText.searchParams.set("kind", "asr");

  try {
    const r = await fetch(timedText.toString(), { headers: { "User-Agent": "Mozilla/5.0" } });
    if (r.ok) {
      const vtt = await r.text();
      if (vtt.includes("-->")) {
        return { format: "vtt", raw: vtt, text: toPlainTextFromVtt(vtt), download: timedText.toString() };
      }
    }
  } catch {}

  return null;
}

async function getPlayerResponse(videoId, hl = "en", gl = "US") {
  // Watch HTML
  const watchUrl = `https://www.youtube.com/watch?v=${videoId}&hl=${hl}&gl=${gl}`;
  const htmlRes = await fetch(watchUrl, {
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  if (!htmlRes.ok) throw new Error(`Failed to load watch page (${htmlRes.status})`);
  const html = await htmlRes.text();

  // Extract innertube config
  const keyMatch = html.match(/"INNERTUBE_API_KEY":"([^"]+)"/);
  const versionMatch = html.match(/"INNERTUBE_CLIENT_VERSION":"([^"]+)"/);
  const apiKey = keyMatch?.[1];
  const clientVersion = versionMatch?.[1] || "2.20241219.01.00";
  const context = extractJsonByBrace(html, "INNERTUBE_CONTEXT");

  if (!apiKey || !context) {
    throw new Error("Could not extract YouTube client config (INNERTUBE_*). Video may be gated/consent/region blocked.");
  }

  // Call youtubei player endpoint
  const playerUrl = `https://www.youtube.com/youtubei/v1/player?key=${apiKey}`;
  const body = JSON.stringify({ context, videoId });

  const pr = await fetch(playerUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0",
      "Origin": "https://www.youtube.com",
      "Referer": watchUrl,
      "x-youtube-client-name": "1",
      "x-youtube-client-version": clientVersion,
    },
    body,
  });

  if (!pr.ok) throw new Error(`player endpoint failed (${pr.status})`);
  return pr.json();
}

function pickTracks(playerJson, lang = "en") {
  const tracks =
    playerJson?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];

  const manual = tracks.filter((t) => t && t.kind !== "asr");
  const auto = tracks.filter((t) => t && t.kind === "asr");

  // prefer requested lang, else first
  const manualBest =
    manual.find((t) => (t.languageCode || "").toLowerCase() === lang.toLowerCase()) ||
    manual[0] ||
    null;

  const autoBest =
    auto.find((t) => (t.languageCode || "").toLowerCase() === lang.toLowerCase()) ||
    auto[0] ||
    null;

  return { manualBest, autoBest, manualAll: manual, autoAll: auto };
}

export async function POST(req) {
  try {
    const { url, lang = "en", hl = "en", gl = "US" } = await req.json();
    const videoId = extractVideoId(url);
    if (!videoId) {
      return Response.json({ error: "Invalid YouTube URL or video id" }, { status: 400 });
    }

    const player = await getPlayerResponse(videoId, hl, gl);
    const { manualBest, autoBest, manualAll, autoAll } = pickTracks(player, lang);

    const hasAny = Boolean(manualBest || autoBest);
    if (!hasAny) {
      return Response.json(
        { videoId, lang, manual: null, auto: null, message: "No captions available for this video." },
        { status: 200 }
      );
    }

    const manualData = manualBest
      ? await fetchCaptionContent(manualBest.baseUrl, videoId, manualBest.languageCode, false)
      : null;

    const autoData = autoBest
      ? await fetchCaptionContent(autoBest.baseUrl, videoId, autoBest.languageCode, true)
      : null;

    return Response.json({
      videoId,
      requestedLang: lang,
      tracks: {
        manualCount: manualAll.length,
        autoCount: autoAll.length,
        manualAvailable: manualAll.map((t) => ({ languageCode: t.languageCode, name: t.name?.simpleText || "" })),
        autoAvailable: autoAll.map((t) => ({ languageCode: t.languageCode, name: t.name?.simpleText || "" })),
      },
      manual: manualBest
        ? {
            languageCode: manualBest.languageCode,
            name: manualBest.name?.simpleText || "Manual",
            ...manualData,
          }
        : null,
      auto: autoBest
        ? {
            languageCode: autoBest.languageCode,
            name: autoBest.name?.simpleText || "Auto",
            ...autoData,
          }
        : null,
    });
  } catch (e) {
    return Response.json({ error: e?.message || "Unknown error" }, { status: 500 });
  }
}
