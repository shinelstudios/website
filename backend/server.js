import express from "express";
import cors from "cors";
import fs from "fs";
import os from "os";
import path from "path";
import { spawn } from "child_process";

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

/**
 * REQUIREMENTS:
 * - Node 18+
 * - yt-dlp installed (recommended) OR set env YTDLP_PATH to your yt-dlp.exe / yt-dlp path.
 *
 * Why fallback?
 * Some networks / IPs get 200 responses from timedtext endpoints but with empty bodies (bytes=0).
 * yt-dlp is far more resilient for captions extraction.
 */

/* ---------------------------
   Helpers
----------------------------*/

function extractVideoId(input) {
  if (!input) return null;

  const s = String(input).trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(s)) return s;

  try {
    const url = new URL(s);

    if (url.hostname.includes("youtu.be")) {
      const id = url.pathname.split("/").filter(Boolean)[0];
      return id && id.length === 11 ? id : null;
    }

    const v = url.searchParams.get("v");
    if (v && v.length === 11) return v;

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
      if (escape) escape = false;
      else if (ch === "\\") escape = true;
      else if (ch === '"') inString = false;
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

    const tIdx = parts.findIndex((l) => l.includes("-->"));
    if (tIdx === -1) continue;

    const text = parts
      .slice(tIdx + 1)
      .join(" ")
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .trim();

    if (text) lines.push(text);
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

function decodeHtmlEntities(s) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function toPlainTextFromSrv3(xml) {
  const out = [];
  const pRe = /<p\b[^>]*>([\s\S]*?)<\/p>/g;
  let m;
  while ((m = pRe.exec(xml))) {
    const raw = m[1]
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, " ");

    const clean = decodeHtmlEntities(raw).replace(/\s+/g, " ").trim();
    if (clean) out.push(clean);
  }
  return out.join("\n");
}

function withFmt(trackBaseUrl, fmt) {
  try {
    const u = new URL(trackBaseUrl);
    u.searchParams.set("fmt", fmt);
    return u.toString();
  } catch {
    const sep = trackBaseUrl.includes("?") ? "&" : "?";
    return `${trackBaseUrl}${sep}fmt=${encodeURIComponent(fmt)}`;
  }
}

function getCaptionTracksFromPlayer(playerJson) {
  return playerJson?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
}

function pickTracksFromCaptionTracks(captionTracks, lang = "en") {
  const manual = captionTracks.filter((t) => t && t.kind !== "asr");
  const auto = captionTracks.filter((t) => t && t.kind === "asr");

  const manualBest =
    manual.find((t) => (t.languageCode || "").toLowerCase() === lang.toLowerCase()) || manual[0] || null;

  const autoBest =
    auto.find((t) => (t.languageCode || "").toLowerCase() === lang.toLowerCase()) || auto[0] || null;

  return { manualBest, autoBest, manualAll: manual, autoAll: auto };
}

/* ---------------------------
   Robust fetch (bytes + decode)
----------------------------*/

async function fetchBytes(url, headers) {
  const r = await fetch(url, { headers });
  const ab = await r.arrayBuffer();
  const bytes = ab?.byteLength || 0;
  const body = bytes > 0 ? new TextDecoder("utf-8", { fatal: false }).decode(ab) : "";
  return { r, bytes, body };
}

async function fetchTextWithVariants(url, headerVariants, debugArr) {
  for (let i = 0; i < headerVariants.length; i++) {
    const headers = headerVariants[i];
    try {
      const { r, bytes, body } = await fetchBytes(url, headers);
      debugArr.push({ url: url.slice(0, 240), variant: i, status: r.status, bytes });
      if (r.ok && bytes > 0) return { ok: true, body };
    } catch (e) {
      debugArr.push({
        url: url.slice(0, 240),
        variant: i,
        status: "ERROR",
        bytes: 0,
        error: e?.message || String(e),
      });
    }
  }
  return { ok: false, body: "" };
}

/* ---------------------------
   Caption download (youtubei baseUrl + timedtext)
----------------------------*/

async function fetchCaptionContent(trackBaseUrl, videoId, lang, isAuto, ytHeaders, ttHeaders) {
  const debug = [];

  const variants = [
    ytHeaders,
    {
      "User-Agent": ytHeaders["User-Agent"],
      "Accept": "*/*",
      "Accept-Encoding": "identity",
      "Accept-Language": ytHeaders["Accept-Language"],
      "Referer": ytHeaders["Referer"],
      "Origin": ytHeaders["Origin"],
    },
    { "User-Agent": ytHeaders["User-Agent"], "Accept-Encoding": "identity" },
  ];

  // Try baseUrl: json3 -> srv3 -> vtt
  for (const fmt of ["json3", "srv3", "vtt"]) {
    const url = withFmt(trackBaseUrl, fmt);
    const { ok, body } = await fetchTextWithVariants(url, variants, debug);
    if (!ok) continue;

    if (fmt === "json3" && body.trim().startsWith("{")) {
      try {
        const json = JSON.parse(body);
        const text = toPlainTextFromJson3(json);
        if (text) return { format: "json3", text, download: url, debug };
      } catch {}
    }

    if (fmt === "srv3" && body.includes("<transcript")) {
      const text = toPlainTextFromSrv3(body);
      if (text) return { format: "srv3", text, download: url, debug };
    }

    if (fmt === "vtt" && body.includes("-->")) {
      const text = toPlainTextFromVtt(body);
      if (text) return { format: "vtt", text, download: url, debug };
    }
  }

  // Try timedtext direct: json3 -> srv3 -> vtt
  {
    const base = new URL("https://video.google.com/timedtext");
    base.searchParams.set("v", videoId);
    base.searchParams.set("lang", lang || "en");
    if (isAuto) base.searchParams.set("kind", "asr");

    const ttVariants = [
      ttHeaders,
      { "User-Agent": ttHeaders["User-Agent"], "Accept-Encoding": "identity" },
    ];

    for (const fmt of ["json3", "srv3", "vtt"]) {
      const u = new URL(base.toString());
      u.searchParams.set("fmt", fmt);

      const { ok, body } = await fetchTextWithVariants(u.toString(), ttVariants, debug);
      if (!ok) continue;

      if (fmt === "json3" && body.trim().startsWith("{")) {
        try {
          const json = JSON.parse(body);
          const text = toPlainTextFromJson3(json);
          if (text) return { format: "json3", text, download: u.toString(), debug };
        } catch {}
      }
      if (fmt === "srv3" && body.includes("<transcript")) {
        const text = toPlainTextFromSrv3(body);
        if (text) return { format: "srv3", text, download: u.toString(), debug };
      }
      if (fmt === "vtt" && body.includes("-->")) {
        const text = toPlainTextFromVtt(body);
        if (text) return { format: "vtt", text, download: u.toString(), debug };
      }
    }
  }

  return { format: null, text: "", download: null, debug };
}

/* ---------------------------
   youtubei player (WEB)
----------------------------*/

async function fetchWatchHtml(videoId, hl, gl) {
  const watchUrl = `https://www.youtube.com/watch?v=${videoId}&hl=${hl}&gl=${gl}`;
  const r = await fetch(watchUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!r.ok) throw new Error(`Failed to load watch page (${r.status})`);
  const html = await r.text();
  return { html, watchUrl };
}

function extractInnertubeFromHtml(html) {
  const keyMatch = html.match(/"INNERTUBE_API_KEY":"([^"]+)"/);
  const versionMatch = html.match(/"INNERTUBE_CLIENT_VERSION":"([^"]+)"/);
  const apiKey = keyMatch?.[1];
  const clientVersion = versionMatch?.[1] || "2.20241219.01.00";
  const context = extractJsonByBrace(html, "INNERTUBE_CONTEXT");
  if (!apiKey || !context) return null;
  return { apiKey, clientVersion, context };
}

async function youtubeiPlayerWeb(videoId, hl = "en", gl = "IN") {
  const { html, watchUrl } = await fetchWatchHtml(videoId, hl, gl);
  const cfg = extractInnertubeFromHtml(html);
  if (!cfg) throw new Error("Could not extract INNERTUBE config from watch page.");

  const playerUrl = `https://www.youtube.com/youtubei/v1/player?key=${cfg.apiKey}`;
  const pr = await fetch(playerUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0",
      Origin: "https://www.youtube.com",
      Referer: watchUrl,
      "x-youtube-client-name": "1",
      "x-youtube-client-version": cfg.clientVersion,
    },
    body: JSON.stringify({ context: cfg.context, videoId }),
  });

  if (!pr.ok) throw new Error(`WEB player failed (${pr.status})`);
  const json = await pr.json();
  return {
    json,
    meta: {
      client: "WEB",
      hl,
      gl,
      watchUrl,
      clientVersion: cfg.clientVersion,
      apiKeyFound: true,
    },
  };
}

async function getPlayerResponseWithRetry(videoId, hl = "en", glPreferred = "IN") {
  const regions = [glPreferred, "IN", "US", "GB", "CA", "AU", "SG", "AE"].filter(
    (v, i, a) => v && a.indexOf(v) === i
  );

  const attempts = [];
  let last = null;

  for (const gl of regions) {
    try {
      const resp = await youtubeiPlayerWeb(videoId, hl, gl);
      const status = resp.json?.playabilityStatus?.status || null;
      const reason = resp.json?.playabilityStatus?.reason || null;
      const tracks = getCaptionTracksFromPlayer(resp.json);

      attempts.push({ client: "WEB", gl, status, reason, tracks: tracks.length });

      // accept if playable OR tracks exist
      if (status !== "UNPLAYABLE" || tracks.length > 0) return { ...resp, attempts };

      last = { ...resp, attempts };
    } catch (e) {
      attempts.push({ client: "WEB", gl, status: "ERROR", reason: e?.message || String(e), tracks: 0 });
      last = { error: e?.message || String(e), attempts };
    }
  }

  if (last?.json) return last;
  throw new Error(last?.error || "All region attempts failed");
}

/* ---------------------------
   yt-dlp fallback (FINAL FIX)
----------------------------*/

function getYtDlpCmd() {
  // If you set YTDLP_PATH, we use it. Otherwise we try "yt-dlp" in PATH.
  return process.env.YTDLP_PATH || "yt-dlp";
}

function runProcess(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"], ...opts });

    let out = "";
    let err = "";
    p.stdout.on("data", (d) => (out += d.toString()));
    p.stderr.on("data", (d) => (err += d.toString()));

    p.on("error", reject);
    p.on("close", (code) => resolve({ code, out, err }));
  });
}

function pickVttFile(dir, lang) {
  const files = fs.readdirSync(dir).filter((f) => f.toLowerCase().endsWith(".vtt"));

  // Prefer exact lang file: ".en.vtt", then any vtt.
  const langLower = (lang || "en").toLowerCase();
  const exact = files.find((f) => f.toLowerCase().includes(`.${langLower}.vtt`));
  if (exact) return path.join(dir, exact);

  return files.length ? path.join(dir, files[0]) : null;
}

async function ytDlpFetchCaptions(url, lang = "en") {
  const cmd = getYtDlpCmd();

  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ytcap-"));
  const manualDir = path.join(tmpRoot, "manual");
  const autoDir = path.join(tmpRoot, "auto");
  fs.mkdirSync(manualDir, { recursive: true });
  fs.mkdirSync(autoDir, { recursive: true });

  // 1) Try MANUAL subtitles
  const manualArgs = [
    "--skip-download",
    "--write-subs",
    "--sub-lang",
    lang,
    "--sub-format",
    "vtt",
    "-o",
    path.join(manualDir, "%(id)s.%(ext)s"),
    url,
  ];

  const manual = await runProcess(cmd, manualArgs);
  const manualFile = pickVttFile(manualDir, lang);

  if (manualFile && fs.existsSync(manualFile)) {
    const vtt = fs.readFileSync(manualFile, "utf8");
    const text = toPlainTextFromVtt(vtt);
    return {
      mode: "manual",
      format: "vtt",
      text,
      file: manualFile,
      debug: { cmd, manual: { code: manual.code, out: manual.out, err: manual.err } },
    };
  }

  // 2) Fallback to AUTO subtitles
  const autoArgs = [
    "--skip-download",
    "--write-auto-subs",
    "--sub-lang",
    lang,
    "--sub-format",
    "vtt",
    "-o",
    path.join(autoDir, "%(id)s.%(ext)s"),
    url,
  ];

  const auto = await runProcess(cmd, autoArgs);
  const autoFile = pickVttFile(autoDir, lang);

  if (autoFile && fs.existsSync(autoFile)) {
    const vtt = fs.readFileSync(autoFile, "utf8");
    const text = toPlainTextFromVtt(vtt);
    return {
      mode: "auto",
      format: "vtt",
      text,
      file: autoFile,
      debug: { cmd, auto: { code: auto.code, out: auto.out, err: auto.err } },
    };
  }

  return {
    mode: null,
    format: null,
    text: "",
    file: null,
    debug: {
      cmd,
      manual: { code: manual.code, out: manual.out, err: manual.err },
      auto: { code: auto.code, out: auto.out, err: auto.err },
      note:
        "yt-dlp did not produce a .vtt file. Ensure yt-dlp is installed and can access YouTube on this machine/network.",
    },
  };
}

/* ---------------------------
   API route
----------------------------*/

app.post("/api/youtube-captions", async (req, res) => {
  try {
    const { url, lang = "en", hl = "en", gl = "IN" } = req.body || {};
    const videoId = extractVideoId(url);

    if (!videoId) return res.status(400).json({ error: "Invalid YouTube URL or video id" });

    const { json: player, meta: playerMeta, attempts } = await getPlayerResponseWithRetry(videoId, hl, gl);

    const playability = player?.playabilityStatus || {};
    const captionTracks = getCaptionTracksFromPlayer(player);

    const { manualBest, autoBest, manualAll, autoAll } = pickTracksFromCaptionTracks(captionTracks, lang);

    const watchUrl =
      playerMeta?.watchUrl ||
      `https://www.youtube.com/watch?v=${videoId}&hl=${hl}&gl=${playerMeta?.gl || gl}`;

    const ytHeaders = {
      "User-Agent": "Mozilla/5.0",
      "Accept": "*/*",
      "Accept-Encoding": "identity",
      "Accept-Language": `${hl}-${playerMeta?.gl || gl},${hl};q=0.9,en;q=0.8`,
      "Referer": watchUrl,
      "Origin": "https://www.youtube.com",
    };

    const ttHeaders = {
      "User-Agent": "Mozilla/5.0",
      "Accept": "*/*",
      "Accept-Encoding": "identity",
      "Accept-Language": `${hl}-${playerMeta?.gl || gl},${hl};q=0.9,en;q=0.8`,
    };

    const manualData = manualBest
      ? await fetchCaptionContent(manualBest.baseUrl, videoId, manualBest.languageCode, false, ytHeaders, ttHeaders)
      : { format: null, text: "", download: null, debug: [] };

    const autoData = autoBest
      ? await fetchCaptionContent(autoBest.baseUrl, videoId, autoBest.languageCode, true, ytHeaders, ttHeaders)
      : { format: null, text: "", download: null, debug: [] };

    const manualOk = !!(manualData?.text && manualData.text.length > 0);
    const autoOk = !!(autoData?.text && autoData.text.length > 0);

    // ✅ FINAL FIX: if track exists but downloads are empty, fallback to yt-dlp
    let ytdlp = null;
    let finalManual = manualBest
      ? {
          languageCode: manualBest.languageCode,
          name: manualBest.name?.simpleText || "Manual",
          format: manualData.format || null,
          text: manualOk ? manualData.text : "",
          download: manualData.download || null,
        }
      : null;

    let finalAuto = autoBest
      ? {
          languageCode: autoBest.languageCode,
          name: autoBest.name?.simpleText || "Auto",
          format: autoData.format || null,
          text: autoOk ? autoData.text : "",
          download: autoData.download || null,
        }
      : null;

    const trackFoundButEmpty = (!!autoBest || !!manualBest) && !manualOk && !autoOk;

    if (trackFoundButEmpty) {
      const ytUrl = url?.startsWith("http") ? url : `https://www.youtube.com/watch?v=${videoId}`;
      ytdlp = await ytDlpFetchCaptions(ytUrl, lang);

      if (ytdlp?.text) {
        if (ytdlp.mode === "manual") {
          finalManual = {
            languageCode: lang,
            name: "Manual (yt-dlp)",
            format: ytdlp.format,
            text: ytdlp.text,
            download: null,
          };
        } else {
          finalAuto = {
            languageCode: lang,
            name: "Auto (yt-dlp)",
            format: ytdlp.format,
            text: ytdlp.text,
            download: null,
          };
        }
      }
    }

    const finalManualOk = !!(finalManual?.text && finalManual.text.length > 0);
    const finalAutoOk = !!(finalAuto?.text && finalAuto.text.length > 0);

    return res.json({
      videoId,
      requestedLang: lang,
      trackSource: "youtubei",
      tracks: { manualCount: manualAll.length, autoCount: autoAll.length },
      manual: finalManualOk ? finalManual : finalManual, // keep object even if empty for debugging
      auto: finalAutoOk ? finalAuto : finalAuto,
      meta: {
        noCaptions: !(manualBest || autoBest),
        playabilityStatus: playability?.status || null,
        playabilityReason: playability?.reason || null,
        hl,
        glRequested: gl,
        usedClient: playerMeta?.client || null,
        usedGl: playerMeta?.gl || null,
        watchUrl,
        clientVersion: playerMeta?.clientVersion || null,
        apiKeyFound: playerMeta?.apiKeyFound ?? null,
        attempts: attempts || [],
        captionDownloadDebug: {
          manualTried: manualBest ? manualData.debug : [],
          autoTried: autoBest ? autoData.debug : [],
        },
        ytdlpUsed: !!(ytdlp && ytdlp.text),
        ytdlpMode: ytdlp?.mode || null,
        ytdlpDebug: ytdlp?.debug || null,
      },
      message:
        finalAutoOk || finalManualOk
          ? (ytdlp && ytdlp.text ? "Captions fetched (yt-dlp fallback)." : "Captions fetched.")
          : "Track found but caption download returned empty/blocked.",
    });
  } catch (e) {
    return res.status(500).json({ error: e?.message || "Unknown error" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Captions API running on http://localhost:${PORT}`));
