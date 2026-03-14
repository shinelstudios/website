
/**
 * worker.js (Cloudflare Worker)
 * 
 * About: Backend API and authentication logic for Shinel Studios.
 * Features: KV/D1 storage, JWT authentication, YouTube API integration, Client Sync, Audit logging, Rate limiting.
 */
// worker.js — Cloudflare Workers (Modules syntax)
//
// ✅ What’s included
// - KV-first login (SHINEL_USERS) + fallback to USERS_JSON
// - Auth: rate-limit, audit logs, JWT access + refresh cookie
// - /stats                    -> counts for admin UIs
// - /videos   (GET, POST)     -> list + create
// - /videos/:id (PUT,DELETE)  -> update + delete
// - /views/refresh            -> bulk weekly view refresh (videos + thumbs)
// - /views/refresh/:videoId   -> refresh a single YouTube videoId
//
// Uses SHINEL_AUDIT KV to store:
//   * app:thumbnails:list   (legacy/optional; refreshed if present)
//   * app:videos:list       (new admin videos list)
//   * rl:login:<ip>         (rate limiting counter)
//   * audit:*               (login audits)

import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";

/* ============================== tiny helpers ============================== */
const json = (obj, status = 200, headers = {}) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });

function makeCorsHeaders(origin, allowedOrigins) {
  const lower = (s) => (s || "").toLowerCase();
  const o = lower(origin);
  const ok =
    o &&
    allowedOrigins.some((a) => {
      const A = lower(a.trim());
      if (!A) return false;
      if (A === "*") return true;
      try {
        const urlO = new URL(o);
        const urlA = new URL(A);
        return urlO.hostname === urlA.hostname && urlO.protocol === urlA.protocol;
      } catch {
        return o === A;
      }
    });

  const allowOrigin = ok ? origin : null;
  const h = {
    "Access-Control-Allow-Headers": "content-type, authorization",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Access-Control-Allow-Credentials": "true",
    Vary: "Origin",
  };
  if (allowOrigin) h["Access-Control-Allow-Origin"] = allowOrigin;
  return h;
}

function pickAllowedOrigin(origin, allowedOrigins) {
  const lower = (s) => (s || "").toLowerCase();
  const o = lower(origin);
  const ok =
    o &&
    allowedOrigins.some((a) => {
      const A = lower(a.trim());
      if (!A) return false;
      if (A === "*") return true;
      try {
        const urlO = new URL(o);
        const urlA = new URL(A);
        return urlO.hostname === urlA.hostname && urlO.protocol === urlA.protocol;
      } catch {
        return o === A;
      }
    });
  return ok ? origin : null;
}

/* ============================== auth helpers ============================== */
// USERS: KV-first (SHINEL_USERS) with fallback to USERS_JSON allowlist

async function getUserFromKV(env, email) {
  const key = `user:${String(email || "").trim().toLowerCase()}`;
  const raw = await env.SHINEL_USERS.get(key);
  if (!raw) return null;
  try {
    const u = JSON.parse(raw);
    return {
      email: String(u.email || "").trim().toLowerCase(),
      passwordHash: String(u.passwordHash || ""),
      role: String(u.role || "client").toLowerCase(),
      firstName: String(u.firstName || ""),
      lastName: String(u.lastName || ""),
    };
  } catch {
    return null;
  }
}

// Back-compat: static allowlist in secret
function loadUsers(env) {
  try {
    const arr = JSON.parse(env.USERS_JSON || "[]");
    if (!Array.isArray(arr)) return [];
    return arr
      .map((u) => ({
        email: String(u.email || "").trim().toLowerCase(),
        passwordHash: String(u.passwordHash || ""),
        role: String(u.role || "client").toLowerCase(),
        firstName: String(u.firstName || ""),
        lastName: String(u.lastName || ""),
      }))
      .filter((u) => u.email && u.passwordHash);
  } catch {
    return [];
  }
}

function setCookie(name, value, opts = {}) {
  const parts = [`${name}=${value ?? ""}`];
  if (opts.maxAge != null) parts.push(`Max-Age=${opts.maxAge}`);
  if (opts.expires) parts.push(`Expires=${opts.expires.toUTCString()}`);
  parts.push(`Path=${opts.path ?? "/"}`);
  if (opts.sameSite) parts.push(`SameSite=${opts.sameSite}`);
  if (opts.secure) parts.push("Secure");
  if (opts.httpOnly) parts.push("HttpOnly");
  if (opts.domain) parts.push(`Domain=${opts.domain}`);
  return parts.join("; ");
}
function delCookie(name, opts = {}) {
  return setCookie(name, "", { ...opts, expires: new Date(0), maxAge: 0 });
}

async function signAccess(payload, secret, minutes = 30) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${minutes}m`)
    .sign(secret);
}
async function signRefresh(payload, secret, days = 7) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${days}d`)
    .sign(secret);
}
async function verifyJWT(token, secret, opts = {}) {
  // 👇 allow clock skew so "exp" claim won't fail due to tiny drifts
  const { payload } = await jwtVerify(token, secret, {
    algorithms: ["HS256"],
    clockTolerance: 300,
    ...opts,
  });
  return payload;
}

async function sha256Hex(input) {
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest("SHA-256", enc.encode(input));
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/* ====================== Rate limit (KV) + Audit (KV) ====================== */
async function isRateLimited(env, ip, windowSec = 600, max = 5) {
  if (!ip) return false;
  const key = `rl:login:${ip}`;
  const curr = Number((await env.SHINEL_AUDIT.get(key)) || "0");
  if (curr >= max) return true;
  await env.SHINEL_AUDIT.put(key, String(curr + 1), { expirationTtl: windowSec });
  return false;
}

async function audit(env, kind, { email, success, ip, reason }) {
  try {
    const when = new Date().toISOString();

    // 1. Try D1 (Modern)
    if (env.DB) {
      try {
        await env.DB.prepare(
          "INSERT INTO audit_logs (action, user_id, details, ip) VALUES (?, ?, ?, ?)"
        ).bind(kind, email || null, JSON.stringify({ success, reason }), ip || null).run();
      } catch (e) { console.error("D1 Audit Error:", e.message); }
    }

    // 2. Fallback to KV (Legacy)
    const ipHash = ip ? await sha256Hex(ip) : "unknown";
    const key = `audit:${kind}:${when}:${ipHash}`;
    const value = JSON.stringify({
      when,
      kind,
      email: email || null,
      success: !!success,
      ipHash,
      reason: reason || null,
    });
    await env.SHINEL_AUDIT.put(key, value, { expirationTtl: 60 * 60 * 24 * 30 });
  } catch { }
}

/* =========================== App data in KV =========================== */
const KV_THUMBS_KEY = "thumbnails_public";
const KV_VIDEOS_KEY = "app:videos:list";

function resolveKV(env, key) {
  if (key === KV_THUMBS_KEY) return env.THUMBNAILS;
  if (key === KV_VIDEOS_KEY) return env.SHINEL_AUDIT;
  return env.SHINEL_AUDIT;
}

async function getJsonList(env, key) {
  const ns = resolveKV(env, key);
  const raw = await ns.get(key, "json");
  return Array.isArray(raw) ? raw : [];
}

async function putJsonList(env, key, list) {
  const ns = resolveKV(env, key);
  await ns.put(key, JSON.stringify(list));
}

// D1 Helper: Get all clients
async function getClients(env) {
  // 1. Try D1
  if (env.DB) {
    try {
      const { results } = await env.DB.prepare("SELECT * FROM clients").all();
      if (results && results.length > 0) return results;
    } catch (e) { console.error("D1 Clients Error:", e.message); }
  }
  // 2. Fallback to KV
  return await env.SHINEL_AUDIT.get("app:clients:registry", "json") || [];
}



// 👇 ETag must reflect changes to views/lastViewUpdate as well as lastUpdated & hype.
function weakEtagFor(arr) {
  const base = JSON.stringify({
    n: arr.length,
    t: arr.reduce(
      (a, x) =>
        a +
        Number(x.lastUpdated || 0) +
        Number(x.lastViewUpdate || 0) +
        Number(x.youtubeViews || 0) +
        Number(x.hype || 0),
      0
    ),
  });
  return `"W/${base.length.toString(16)}-${arr.length}"`;
}

function readBearerToken(request) {
  const auth = request.headers.get("authorization") || "";
  return auth.startsWith("Bearer ") ? auth.slice(7) : "";
}
async function requireTeamOrThrow(request, secret) {
  const token = readBearerToken(request);
  if (!token) throw Object.assign(new Error("Missing token"), { status: 401 });
  const payload = await verifyJWT(token, secret);
  const role = String(payload.role || "").toLowerCase();
  const allowed = role === "team" || role === "admin";
  if (!allowed) throw Object.assign(new Error("Forbidden"), { status: 403 });
  return payload;
}

async function requireAdminOrThrow(request, secret) {
  const token = readBearerToken(request);
  if (!token) throw Object.assign(new Error("Missing token"), { status: 401 });
  const payload = await verifyJWT(token, secret);
  const role = String(payload.role || "").toLowerCase();
  if (role !== "admin") throw Object.assign(new Error("Admin access required"), { status: 403 });
  return payload;
}

/* ============================= YouTube helpers ============================= */
async function fetchWithRetry(url, options = {}, maxRetries = 3) {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      const resp = await fetch(url, options);
      if (resp.ok) return resp;
      if (resp.status >= 400 && resp.status < 500 && resp.status !== 429) {
        // If it's a 4xx error (other than 429 Too Many Requests), it's likely a auth/quota error.
        // Don't retry API quota errors redundantly.
        return resp;
      }
      throw new Error(`HTTP ${resp.status}`);
    } catch (err) {
      attempt++;
      if (attempt >= maxRetries) throw err;
      // Exponential backoff: 500ms, 1000ms, 2000ms
      await new Promise(r => setTimeout(r, 500 * Math.pow(2, attempt)));
    }
  }
}

const ytIdFrom = (url) => {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1);
    if (u.searchParams.get("v")) return u.searchParams.get("v");
    const m = u.pathname.match(/\/shorts\/([^/]+)/);
    if (m) return m[1];
  } catch { }
  return "";
};

/**
 * Intelligent Key Rotation
 * - Support multiple comma-separated keys in YOUTUBE_API_KEYS
 * - Automatically skips keys blacklisted in KV (1 hour cooldown for quota)
 */
async function getYoutubeKey(env) {
  const keysStr = env.YOUTUBE_API_KEYS || env.YOUTUBE_API_KEY || env.VITE_YOUTUBE_API_KEY || "";
  const keys = keysStr.split(",").map(k => k.trim()).filter(Boolean);

  for (const k of keys) {
    const keyHash = await sha256Hex(k);
    const isExhausted = await env.SHINEL_AUDIT.get(`yt_key_exhausted:${keyHash}`);
    if (!isExhausted) {
      return k;
    }
  }
  return null;
}

async function fetchYouTubeViews(env, videoId) {
  const key = await getYoutubeKey(env);
  if (!key) return null;
  const api = `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${encodeURIComponent(
    videoId
  )}&key=${encodeURIComponent(key)}`;
  const resp = await fetch(api, { headers: { accept: "application/json" } });
  if (!resp.ok) return null;
  const j = await resp.json().catch(() => null);
  const views = Number(j?.items?.[0]?.statistics?.viewCount ?? 0);
  return Number.isFinite(views) ? views : null;
}

async function fetchYouTubeVideoDetails(env, videoId) {
  const key = await getYoutubeKey(env);
  if (!key) return { error: "No available API key" };

  const api = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${encodeURIComponent(videoId)}&key=${encodeURIComponent(key)}`;
  try {
    const resp = await fetch(api, { headers: { accept: "application/json" } });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      if (resp.status === 403 && (err?.error?.message || "").toLowerCase().includes("quota")) {
        await env.SHINEL_AUDIT.put(`yt_key_exhausted:${await sha256Hex(key)}`, "true", { expirationTtl: 3600 });
      }
      return { error: err?.error?.message || `HTTP ${resp.status}` };
    }
    const j = await resp.json().catch(() => ({}));
    const item = j?.items?.[0];
    if (!item) return { error: "Video not found" };

    return {
      title: item.snippet.title,
      thumbnails: item.snippet.thumbnails,
      viewCount: item.statistics.viewCount,
      publishedAt: item.snippet.publishedAt
    };
  } catch (e) {
    return { error: e.message };
  }
}

async function fetchYouTubeChannelInfo(env, identifier) {
  const key = await getYoutubeKey(env);
  if (!key) return { error: "All YouTube API keys have exhausted their daily quota." };

  const id = String(identifier || "").trim();
  if (!id) return { error: "Empty identifier" };

  const isId = id.startsWith("UC");
  // For handles, YouTube API expects it WITHOUT the @ if using forHandle, 
  // but some users might provide it. Let's handle both.
  const handleVal = id.startsWith('@') ? id.slice(1) : id;
  const param = isId ? `id=${encodeURIComponent(id)}` : `forHandle=${encodeURIComponent(handleVal)}`;

  const api = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&${param}&key=${encodeURIComponent(key)}`;

  try {
    const resp = await fetchWithRetry(api, { headers: { accept: "application/json" } });
    if (!resp.ok) {
      const errJson = await resp.json().catch(() => ({}));
      const message = errJson?.error?.message || "Unknown error";

      // If quota exceeded, blacklist this key for 1 hour (enough to stop immediate retry spam)
      if (resp.status === 403 && message.toLowerCase().includes("quota")) {
        await env.SHINEL_AUDIT.put(`yt_key_exhausted:${await sha256Hex(key)}`, "true", { expirationTtl: 3600 });
      }

      return { error: `YouTube API ${resp.status}: ${message}` };
    }
    const j = await resp.json().catch(() => null);
    const item = j?.items?.[0];
    if (!item) return { error: "Channel not found" };

    return {
      id: item.id,
      title: item.snippet.title,
      logo: item.snippet.thumbnails?.default?.url || item.snippet.thumbnails?.medium?.url,
      subscribers: Number(item.statistics.subscriberCount || 0),
      viewCount: Number(item.statistics.viewCount || 0),
      videoCount: Number(item.statistics.videoCount || 0),
      handle: id.startsWith('@') ? id : (isId ? null : `@${handleVal}`),
      uploadsPlaylistId: item.contentDetails?.relatedPlaylists?.uploads || null
    };
  } catch (e) {
    return { error: `Fetch failed: ${e.message}` };
  }
}

async function fetchYouTubePulse(env, channelId, uploadsPlaylistId = null) {
  const key = await getYoutubeKey(env);

  // Strategy 1: HIGH EFFICIENCY SYNC (1 Unit API Quota)
  // This is preferred over RSS because RSS often omits YouTube Shorts completely or is cached for days.
  if (key && uploadsPlaylistId) {
    try {
      const api = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${encodeURIComponent(uploadsPlaylistId)}&maxResults=5&key=${encodeURIComponent(key)}`;
      const resp = await fetchWithRetry(api, { headers: { accept: "application/json" } }, 3);
      if (resp.ok) {
        const j = await resp.json().catch(() => ({}));
        if (j && j.items && j.items.length > 0) {
          return {
            items: j.items.map(item => ({
              id: item.snippet.resourceId.videoId,
              title: item.snippet.title,
              thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.medium?.url,
              publishedAt: item.snippet.publishedAt,
              type: "VIDEO"
            }))
          };
        }
      } else if (resp.status === 403) {
        const errJson = await resp.json().catch(() => ({}));
        if (errJson?.error?.message?.toLowerCase().includes("quota")) {
          // Temporarily blacklist key to prevent spam
          await env.SHINEL_AUDIT.put(`yt_key_exhausted:${await sha256Hex(key)}`, "true", { expirationTtl: 3600 });
        }
      }
    } catch (e) { console.error("Strategy 1 API Failed:", e.message); }
  }

  // Strategy 2: Fast & Free RSS parsing (0 API Quota)
  // Fallback if API fails, key is exhausted, or playlist ID is missing
  try {
    const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`;
    const rssResp = await fetchWithRetry(rssUrl, { headers: { accept: "application/xml" } }, 3);

    if (rssResp.ok) {
      const text = await rssResp.text();
      const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
      const items = [];
      let match;

      while ((match = entryRegex.exec(text)) !== null && items.length < 5) {
        const entryBlock = match[1];
        const videoIdMatch = entryBlock.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
        const titleMatch = entryBlock.match(/<title>([^<]+)<\/title>/);
        const publishedMatch = entryBlock.match(/<published>([^<]+)<\/published>/);
        const thumbMatch = entryBlock.match(/<media:thumbnail[^>]+url="([^"]+)"/);

        if (videoIdMatch && titleMatch && publishedMatch) {
          items.push({
            id: videoIdMatch[1],
            title: titleMatch[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'"),
            thumbnail: thumbMatch ? thumbMatch[1] : `https://i.ytimg.com/vi/${videoIdMatch[1]}/hqdefault.jpg`,
            publishedAt: publishedMatch[1],
            type: "upload"
          });
        }
      }

      if (items.length > 0) {
        return { items };
      }
    }
  } catch (e) {
    console.error(`RSS fetch failed for ${channelId}:`, e.message);
  }

  // Strategy 3: VERY EXPENSIVE YouTube Search API (100 units per request)
  // Absolute last resort if RSS is completely broken and playlist ID is missing
  if (key) {
    try {
      const api = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${encodeURIComponent(channelId)}&maxResults=5&order=date&type=video&key=${encodeURIComponent(key)}`;
      const resp = await fetchWithRetry(api, { headers: { accept: "application/json" } }, 3);
      if (!resp.ok) {
        const errJson = await resp.json().catch(() => ({}));
        const msg = errJson?.error?.message || `HTTP ${resp.status}`;
        if (resp.status === 403 && msg.toLowerCase().includes("quota")) {
          await env.SHINEL_AUDIT.put(`yt_key_exhausted:${await sha256Hex(key)}`, "true", { expirationTtl: 3600 });
        }
        return { error: `YouTube API Error (Search): ${msg}`, items: [] };
      }
      const j = await resp.json().catch(() => ({}));
      return {
        items: (j?.items || []).map(item => ({
          id: item.id.videoId,
          title: item.snippet.title,
          thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.medium?.url,
          publishedAt: item.snippet.publishedAt,
          type: "upload"
        }))
      };
    } catch (e) { }
  }

  return { error: "All fetch strategies failed for pulse data.", items: [] };
}

/**
 * fetchInstagramInfo
 * - Scrapes public Instagram profile for followers and profile picture.
 * - Uses og Meta tags for robustness.
 */
async function fetchInstagramInfo(env, handle) {
  if (!handle) return null;
  const cleanHandle = handle.startsWith('@') ? handle.slice(1) : handle;
  const url = `https://www.instagram.com/${encodeURIComponent(cleanHandle)}/`;

  try {
    const resp = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html",
        "Accept-Language": "en-US,en;q=0.9"
      }
    });

    if (!resp.ok) return { error: `Instagram HTTP ${resp.status}` };

    const html = await resp.text();

    // Parse Followers from og:description
    // Example: <meta content="100 Followers, 50 Following, 10 Posts - See Instagram photos and videos from ..." property="og:description">
    const descMatch = html.match(/<meta[^>]*property="og:description"[^>]*content="([^"]*)"/i) ||
      html.match(/<meta[^>]*content="([^"]*)"[^>]*property="og:description"/i);

    let followers = 0;
    if (descMatch && descMatch[1]) {
      const content = descMatch[1];
      const parts = content.split('Followers');
      if (parts.length > 1) {
        const followerPart = parts[0].trim();
        let val = followerPart.replace(/,/g, '');
        if (val.toLowerCase().endsWith('k')) {
          followers = Math.round(parseFloat(val) * 1000);
        } else if (val.toLowerCase().endsWith('m')) {
          followers = Math.round(parseFloat(val) * 1000000);
        } else {
          followers = parseInt(val) || 0;
        }
      }
    }

    // Parse Image from og:image
    const imageMatch = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]*)"/i) ||
      html.match(/<meta[^>]*content="([^"]*)"[^>]*property="og:image"/i);

    return {
      handle: `@${cleanHandle}`,
      followers: followers,
      logo: imageMatch ? imageMatch[1].replace(/&amp;/g, '&') : null
    };
  } catch (e) {
    return { error: e.message };
  }
}

function isStale(ts, now = Date.now()) {
  if (!ts) return true;
  return now - Number(ts) > 7 * 24 * 60 * 60 * 1000; // 7 days
}

/* ============================== Hype helpers ============================== */
/**
 * computeHype
 * - Cheap & bounded (0–999), no extra API quota.
 * - Based on log(views) and freshness (days since lastViewUpdate/dateAdded).
 */
function computeHype(views = 0, lastViewUpdate = null, dateAdded = null, now = Date.now()) {
  if (!views) return 0;
  const baseTs = lastViewUpdate || dateAdded || now;
  const days = Math.max(0, (now - Number(baseTs)) / 86400000); // days since last update/add
  // 0.5–1 freshness (recent videos score higher, but never below 0.5)
  const freshness = Math.max(0.5, Math.min(1, 1 - days / 30));
  const raw = Math.log10(views + 1) * 100 * freshness; // ~0–(300+) typical
  return Math.round(Math.min(999, raw));
}

/* ================================= worker ================================= */


async function test() {
  const env = { 
    YOUTUBE_API_KEYS: process.env.YOUTUBE_API_KEY 
  };
  
  // Kamz Inkzone ID
  const channelId = "UC_N0eSX2RI_ah-6MjJIAyzA";
  const playlistId = "UU_N0eSX2RI_ah-6MjJIAyzA";
  
  try {
    const result = await fetchYouTubePulse(env, channelId, playlistId);
    console.log("Result:", JSON.stringify(result, null, 2));
  } catch (e) {
    console.error(e);
  }
}

test();
