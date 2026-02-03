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
    const resp = await fetch(api, { headers: { accept: "application/json" } });
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
  if (!key) return [];

  // HIGH EFFICIENCY SYNC (2 Units)
  // If we have the uploads playlist ID, we use playlistItems (1 unit) instead of search (100 units)
  if (uploadsPlaylistId) {
    const api = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${encodeURIComponent(uploadsPlaylistId)}&maxResults=5&key=${encodeURIComponent(key)}`;
    const resp = await fetch(api, { headers: { accept: "application/json" } });
    if (resp.ok) {
      const j = await resp.json().catch(() => ({}));
      return (j?.items || []).map(item => ({
        id: item.snippet.resourceId.videoId,
        title: item.snippet.title,
        thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.medium?.url,
        publishedAt: item.snippet.publishedAt,
        type: "VIDEO"
      }));
    }
  }

  // Fallback to Search (100 units) if playlist ID is missing or failed
  const api = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${encodeURIComponent(channelId)}&maxResults=5&order=date&type=video&key=${encodeURIComponent(key)}`;
  const resp = await fetch(api, { headers: { accept: "application/json" } });
  if (!resp.ok) return [];
  const j = await resp.json().catch(() => []);
  return (j?.items || []).map(item => ({
    id: item.id.videoId,
    title: item.snippet.title,
    thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.medium?.url,
    publishedAt: item.snippet.publishedAt,
    type: "upload"
  }));
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
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("origin") || "";
    const allowedOrigins = (env.ALLOWED_ORIGINS || "*")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const cors = makeCorsHeaders(origin, allowedOrigins);
    const secret = new TextEncoder().encode(env.JWT_SECRET);
    if (!env.JWT_SECRET) {
      console.error("CRITICAL: JWT_SECRET environment variable is missing.");
      return json({ error: "Internal Server Error (Auth Config)" }, 500, cors);
    }
    const ALLOW = loadUsers(env); // back-compat allowlist
    const ip =
      request.headers.get("CF-Connecting-IP") ||
      request.headers.get("x-forwarded-for") ||
      "";

    // Preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    // Health
    if (
      (url.pathname === "/" || url.pathname === "/health") &&
      request.method === "GET"
    ) {
      return json({ ok: true, v: "1.0.1", service: "shinel-auth", time: Date.now() }, 200, cors);
    }

    // POST /clients/sync or /clients/pulse/refresh - PERFORM DEEP SYNC
    const isSync = (url.pathname === "/clients/sync" || url.pathname === "/clients/pulse/refresh") && request.method === "POST";
    if (isSync) {
      try {
        await requireTeamOrThrow(request, secret);

        // --- COOLDOWN CHECK ---
        const lastSyncKey = "app:clients:last_sync_ts";
        const lastSyncTs = Number(await env.SHINEL_AUDIT.get(lastSyncKey) || "0");
        const now = Date.now();
        const cooldown = 15 * 60 * 1000; // 15 mins
        const isForced = url.searchParams.has("force"); // Admin can force if needed

        if (!isForced && (now - lastSyncTs < cooldown)) {
          const remaining = Math.ceil((cooldown - (now - lastSyncTs)) / 60000);
          return json({ error: `Sync cooldown active. Please wait ${remaining}m or use ?force=1` }, 429, cors);
        }

        const clients = await getClients(env);
        const existingStatsRaw = await env.SHINEL_AUDIT.get("app:clients:stats", "json") || [];
        // handle case where existingStatsRaw might be the array itself or {stats:[]}
        const existingStatsArray = Array.isArray(existingStatsRaw) ? existingStatsRaw : (existingStatsRaw.stats || []);
        const existingStatsMap = new Map(existingStatsArray.map(s => [s.id, s]));

        const allStats = [];
        const pulseActivities = [];
        const channelMeta = {};
        const errors = [];
        let registryMutated = false;

        for (let i = 0; i < clients.length; i++) {
          const c = clients[i];
          try {
            const identifier = c.youtubeId || c.handle;
            if (!identifier) {
              errors.push({ id: c.id, name: c.name, error: "No YouTube ID or Handle provided" });
              continue;
            }

            const result = await fetchYouTubeChannelInfo(env, identifier);
            if (result && !result.error) {
              allStats.push(result);
              channelMeta[result.id] = { logo: result.logo, title: result.title };

              // Cache uploadsPlaylistId in registry if missing
              if (result.uploadsPlaylistId && c.uploadsPlaylistId !== result.uploadsPlaylistId) {
                c.uploadsPlaylistId = result.uploadsPlaylistId;
                registryMutated = true;
              }

              const videos = await fetchYouTubePulse(env, result.id, result.uploadsPlaylistId);
              const windowLimit = now - (24 * 60 * 60 * 1000); // 24h Window

              videos.forEach(v => {
                const ts = new Date(v.publishedAt).getTime();
                // ONLY ADD CONTENT FROM LAST 24 HOURS
                if (ts >= windowLimit) {
                  pulseActivities.push({
                    id: `act-${v.id}-${ts}`,
                    clientName: result.title,
                    channelId: result.id,
                    title: v.title,
                    thumbnail: v.thumbnail,
                    url: `https://youtube.com/watch?v=${v.id}`,
                    type: "VIDEO",
                    timestamp: ts,
                    publishedAt: v.publishedAt
                  });
                }
              });
            } else {
              const err = result?.error || "Unknown error";
              errors.push({ id: c.id, name: c.name, error: err });

              // STICKY STATS: If fetch failed (e.g. Quota), try to preserve old stats
              const old = existingStatsMap.get(c.id) || existingStatsMap.get(c.youtubeId);
              if (old) {
                allStats.push({ ...old, _stale: true });
                channelMeta[old.id] = { logo: old.logo, title: old.title };
              }
            }
          } catch (err) {
            console.error(`Sync error for ${c.name}:`, err.message);
            errors.push({ id: c.id, name: c.name, error: err.message });

            const old = existingStatsMap.get(c.id) || existingStatsMap.get(c.youtubeId);
            if (old) {
              allStats.push({ ...old, _stale: true });
              channelMeta[old.id] = { logo: old.logo, title: old.title };
            }
          }
        }

        pulseActivities.sort((a, b) => b.timestamp - a.timestamp);

        if (registryMutated) {
          await env.SHINEL_AUDIT.put("app:clients:registry", JSON.stringify(clients));
        }

        await env.SHINEL_AUDIT.put("app:clients:stats", JSON.stringify(allStats));
        await env.SHINEL_AUDIT.put("app:clients:pulse", JSON.stringify({
          activities: pulseActivities,
          meta: channelMeta,
          ts: now
        }));
        await env.SHINEL_AUDIT.put(lastSyncKey, String(now));

        const responseData = {
          ok: true,
          synced: allStats.length,
          total: clients.length,
          errors,
          ts: now
        };

        if (url.searchParams.has("debug")) {
          responseData.debug = {
            trace: [
              ...allStats.map(s => ({ name: s.title, id: s.id, status: 'success', count: s.videoCount })),
              ...errors.map(e => ({ name: e.name, id: e.id, status: 'error', error: e.error }))
            ],
            keyPresent: !!(env.YOUTUBE_API_KEYS || env.YOUTUBE_API_KEY || env.VITE_YOUTUBE_API_KEY),
            keyCount: (env.YOUTUBE_API_KEYS || env.YOUTUBE_API_KEY || env.VITE_YOUTUBE_API_KEY || "").split(",").filter(Boolean).length,
            keyValid: true
          };
        }

        return json(responseData, 200, cors);
      } catch (e) {
        return json({ error: e.message || "Sync failed" }, e.status || 500, cors);
      }
    }

    /* -------------------------- YouTube Captions Proxy -------------------------- */
    if (url.pathname === "/api/youtube-captions" && request.method === "POST") {
      try {
        const backendUrl = env.CAPTIONS_API_URL;
        if (!backendUrl) {
          return json({ error: "Backend Captions API URL not configured in Worker secrets (CAPTIONS_API_URL)" }, 501, cors);
        }

        const body = await request.clone().json();
        const res = await fetch(`${backendUrl}/api/youtube-captions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        const data = await res.json();
        return json(data, res.status, cors);
      } catch (e) {
        return json({ error: "Proxy failed: " + e.message }, 502, cors);
      }
    }

    /* ----------------------------- POST /auth/login ----------------------------- */
    if (url.pathname === "/auth/login" && request.method === "POST") {
      try {
        if (await isRateLimited(env, ip)) {
          await audit(env, "login", {
            email: null,
            success: false,
            ip,
            reason: "rate_limited",
          });
          return json({ error: "Too many attempts. Try again later." }, 429, cors);
        }

        const body = await request.json().catch(() => ({}));
        const email = String(body.email || "").trim().toLowerCase();
        const password = String(body.password || "");

        if (!email || !password) {
          return json({ error: "Email and password required" }, 400, cors);
        }

        // 1) Try KV user
        let user = await getUserFromKV(env, email);

        // 2) Fallback to USERS_JSON allowlist
        if (!user) {
          user = ALLOW.find((u) => u.email === email) || null;
        }

        if (!user) {
          await audit(env, "login", {
            email,
            success: false,
            ip,
            reason: "not_allowlisted",
          });
          return json({ error: "Invalid email or password" }, 401, cors);
        }

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) {
          await audit(env, "login", {
            email,
            success: false,
            ip,
            reason: "bad_password",
          });
          return json({ error: "Invalid email or password" }, 401, cors);
        }

        const payload = {
          email: user.email,
          role: user.role, // "team" or "admin" → admin access
          firstName: user.firstName || "",
          lastName: user.lastName || "",
        };

        const access = await signAccess(payload, secret, 30); // 30m
        const refresh = await signRefresh({ ...payload, kind: "refresh" }, secret, 7); // 7d

        const refreshCookie = setCookie("ss_refresh", refresh, {
          httpOnly: true,
          secure: true,
          sameSite: "None",
          path: "/",
          maxAge: 60 * 60 * 24 * 7,
        });

        await audit(env, "login", { email, success: true, ip });

        const headers = {
          ...cors,
          "content-type": "application/json",
          "set-cookie": refreshCookie,
        };
        return new Response(
          JSON.stringify({ token: access, role: user.role }),
          { status: 200, headers }
        );
      } catch (e) {
        return json({ error: "Login error" }, 500, cors);
      }
    }

    /* ----------------------------- POST /auth/refresh ----------------------------- */
    if (url.pathname === "/auth/refresh" && request.method === "POST") {
      const cookies = request.headers.get("cookie") || "";
      const m = cookies.match(/(?:^|;\s*)ss_refresh=([^;]+)/);
      const refresh = m ? decodeURIComponent(m[1]) : null;
      if (!refresh) return json({ error: "No refresh token" }, 401, cors);

      try {
        const payload = await verifyJWT(refresh, secret);
        if (payload.kind !== "refresh") throw new Error("not refresh");

        const newAccess = await signAccess(
          {
            email: payload.email,
            role: payload.role,
            firstName: payload.firstName || "",
            lastName: payload.lastName || "",
          },
          secret,
          30
        );
        const newRefresh = await signRefresh(
          {
            email: payload.email,
            role: payload.role,
            firstName: payload.firstName || "",
            lastName: payload.lastName || "",
            kind: "refresh",
          },
          secret,
          7
        );
        const cookie = setCookie("ss_refresh", newRefresh, {
          httpOnly: true,
          secure: true,
          sameSite: "None",
          path: "/",
          maxAge: 60 * 60 * 24 * 7,
        });

        const headers = { ...cors, "content-type": "application/json", "set-cookie": cookie };
        return new Response(JSON.stringify({ token: newAccess, role: payload.role }), {
          status: 200,
          headers,
        });
      } catch {
        const clear = delCookie("ss_refresh", {
          httpOnly: true,
          secure: true,
          sameSite: "None",
          path: "/",
        });
        const headers = { ...cors, "content-type": "application/json", "set-cookie": clear };
        return new Response(JSON.stringify({ error: "Invalid refresh" }), {
          status: 403,
          headers,
        });
      }
    }

    /* ----------------------------- POST /auth/logout ----------------------------- */
    if (url.pathname === "/auth/logout" && request.method === "POST") {
      const clear = delCookie("ss_refresh", {
        httpOnly: true,
        secure: true,
        sameSite: "None",
        path: "/",
      });
      const headers = { ...cors, "content-type": "application/json", "set-cookie": clear };
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
    }

    /* ----------------------------- GET /protected (sample) ----------------------------- */
    if (url.pathname === "/protected" && request.method === "GET") {
      const token = readBearerToken(request);
      if (!token) return json({ error: "Missing token" }, 401, cors);
      try {
        const payload = await verifyJWT(token, secret);
        return json(
          {
            message: `Welcome ${payload.email}, you have access!`,
            email: payload.email,
            role: payload.role,
          },
          200,
          cors
        );
      } catch {
        return json({ error: "Invalid or expired token" }, 403, cors);
      }
    }

    /* =============================== /config ============================== */
    if (url.pathname === "/config" && request.method === "GET") {
      const config = await env.SHINEL_AUDIT.get("app:config:global", "json") || {};
      return json({ config }, 200, cors);
    }

    if (url.pathname === "/config" && request.method === "PUT") {
      try {
        await requireAdminOrThrow(request, secret);
        const updates = await request.json().catch(() => ({}));
        await env.SHINEL_AUDIT.put("app:config:global", JSON.stringify(updates));
        return json({ ok: true, config: updates }, 200, cors);
      } catch (e) {
        return json({ error: e.message || "Update failed" }, e.status || 500, cors);
      }
    }

    /* =============================== /clients ============================== */
    // GET /clients - List all registered client channels
    if (url.pathname === "/clients" && request.method === "GET") {
      // In a real scenario, this would pull from SHINEL_AUDIT or SHINEL_USERS
      // For now, return an empty list or mock data to avoid 404
      const list = await env.SHINEL_AUDIT.get("app:clients:registry", "json") || [];
      return json({ clients: list }, 200, cors);
    }

    // GET /clients/pulse - Activity feed
    if (url.pathname === "/clients/pulse" && request.method === "GET") {
      let feed = { activities: [], meta: {}, ts: Date.now() };

      // 1. Try D1 (Source of Truth for activities)
      if (env.DB) {
        try {
          const { results: activities } = await env.DB.prepare(
            "SELECT p.*, c.name as clientName FROM pulse_activities p JOIN clients c ON p.client_id = c.youtube_id WHERE c.status = 'active' ORDER BY p.timestamp DESC LIMIT 50"
          ).all();

          if (activities && activities.length > 0) {
            feed.activities = activities.map(a => ({
              ...a,
              clientName: a.clientName || "Shinel Partner"
            }));
            // Get meta for these channels
            const statsRaw = await env.SHINEL_AUDIT.get("app:clients:stats", "json") || [];
            const stats = Array.isArray(statsRaw) ? statsRaw : (statsRaw.stats || []);
            const meta = {};
            stats.forEach(s => { meta[s.id] = { logo: s.logo, title: s.title }; });
            feed.meta = meta;
            feed.ts = Number(await env.SHINEL_AUDIT.get("app:clients:last_sync_ts") || Date.now());
            return json(feed, 200, cors);
          }
        } catch (e) {
          console.error("D1 Pulse Read Error:", e.message);
        }
      }

      // 2. Fallback to KV (aggregated cache)
      feed = await env.SHINEL_AUDIT.get("app:clients:pulse", "json") || feed;

      // Support debug mode from AdminStats.jsx
      if (url.searchParams.has("debug")) {
        const syncErrors = await env.SHINEL_AUDIT.get("app:clients:sync_errors", "json") || { errors: [] };
        feed.debug = {
          trace: syncErrors.errors.map(e => ({ name: e.name, id: e.id, status: 'error', error: e.error })),
          keyPresent: !!(env.YOUTUBE_API_KEYS || env.YOUTUBE_API_KEY || env.VITE_YOUTUBE_API_KEY),
          keyCount: (env.YOUTUBE_API_KEYS || env.YOUTUBE_API_KEY || env.VITE_YOUTUBE_API_KEY || "").split(",").filter(Boolean).length,
          keyValid: true // Basic assumption for now
        };
      }
      return json(feed, 200, cors);
    }

    // GET /clients/sync/errors - Retrieve latest sync errors
    if (url.pathname === "/clients/sync/errors" && request.method === "GET") {
      const data = await env.SHINEL_AUDIT.get("app:clients:sync_errors", "json") || { errors: [], ts: Date.now() };
      return json(data, 200, cors);
    }

    // POST /clients - Add a new creator to the registry
    if (url.pathname === "/clients" && request.method === "POST") {
      try {
        await requireTeamOrThrow(request, secret);
        const body = await request.json().catch(() => ({}));
        const now = Date.now();

        if (!body.name || !body.youtubeId) {
          return json({ error: "Name and YouTube ID required" }, 400, cors);
        }

        const list = await env.SHINEL_AUDIT.get("app:clients:registry", "json") || [];
        const id = `c-${now}-${Math.random().toString(36).slice(2)}`;

        const row = {
          id,
          name: String(body.name),
          youtubeId: String(body.youtubeId),
          handle: String(body.handle || ""),
          category: String(body.category || "Vlogger"),
          status: String(body.status || "active"),
          subscribers: Number(body.subscribers || 0),
          dateAdded: now,
          lastUpdated: now
        };

        list.push(row);
        await env.SHINEL_AUDIT.put("app:clients:registry", JSON.stringify(list));

        // ALSO D1
        if (env.DB) {
          try {
            await env.DB.prepare(
              "INSERT INTO clients (id, name, youtube_id, handle, category, status, subscribers) VALUES (?, ?, ?, ?, ?, ?, ?)"
            ).bind(id, row.name, row.youtubeId, row.handle, row.category, row.status, row.subscribers).run();
          } catch (e) { console.error("D1 Client Insert Error:", e.message); }
        }

        return json({ client: row }, 200, cors);
      } catch (e) {
        return json({ error: e.message || "Save failed" }, e.status || 500, cors);
      }
    }

    // PUT /clients/:id - Update creator details
    if (url.pathname.startsWith("/clients/") && request.method === "PUT") {
      try {
        await requireTeamOrThrow(request, secret);
        const id = decodeURIComponent(url.pathname.split("/")[2] || "");
        const updates = await request.json().catch(() => ({}));

        const list = await env.SHINEL_AUDIT.get("app:clients:registry", "json") || [];
        const idx = list.findIndex((c) => c.id === id);
        if (idx < 0) return json({ error: "Not found" }, 404, cors);

        const now = Date.now();
        const merged = { ...list[idx], ...updates, lastUpdated: now };
        list[idx] = merged;

        await env.SHINEL_AUDIT.put("app:clients:registry", JSON.stringify(list));

        // ALSO D1
        if (env.DB) {
          try {
            await env.DB.prepare(
              "UPDATE clients SET name=?, youtube_id=?, handle=?, category=?, status=?, subscribers=? WHERE id=?"
            ).bind(merged.name, merged.youtubeId, merged.handle, merged.category, merged.status || 'active', merged.subscribers || 0, id).run();
          } catch (e) { console.error("D1 Client Update Error:", e.message); }
        }

        return json({ client: merged }, 200, cors);
      } catch (e) {
        return json({ error: e.message || "Update failed" }, e.status || 500, cors);
      }
    }

    // DELETE /clients/:id - Remove a creator
    if (url.pathname.startsWith("/clients/") && request.method === "DELETE") {
      try {
        await requireTeamOrThrow(request, secret);
        const id = decodeURIComponent(url.pathname.split("/")[2] || "");

        const list = await env.SHINEL_AUDIT.get("app:clients:registry", "json") || [];
        const idx = list.findIndex((c) => c.id === id);
        if (idx >= 0) {
          list.splice(idx, 1);
          await env.SHINEL_AUDIT.put("app:clients:registry", JSON.stringify(list));
        }

        return json({ ok: true }, 200, cors);
      } catch (e) {
        return json({ error: e.message || "Delete failed" }, e.status || 500, cors);
      }
    }

    // DELETE /clients/bulk - Bulk remove
    if (url.pathname === "/clients/bulk" && request.method === "DELETE") {
      try {
        await requireTeamOrThrow(request, secret);
        const body = await request.json().catch(() => ({}));
        const ids = Array.isArray(body.ids) ? body.ids : [];

        if (!ids.length) return json({ error: "No IDs provided" }, 400, cors);

        let list = await env.SHINEL_AUDIT.get("app:clients:registry", "json") || [];
        list = list.filter(c => !ids.includes(c.id));

        await env.SHINEL_AUDIT.put("app:clients:registry", JSON.stringify(list));
        return json({ ok: true, removed: ids.length }, 200, cors);
      } catch (e) {
        return json({ error: e.message || "Bulk delete failed" }, e.status || 500, cors);
      }
    }

    // GET /clients/stats - Generic stats
    if (url.pathname === "/clients/stats" && request.method === "GET") {
      const stats = await env.SHINEL_AUDIT.get("app:clients:stats", "json") || [];
      return json({ ok: true, stats: Array.isArray(stats) ? stats : [] }, 200, cors);
    }


    // GET /clients/history - Activity history
    if (url.pathname === "/clients/history" && request.method === "GET") {
      return json({ ok: true, history: [] }, 200, cors);
    }

    /* =============================== /admin/users =============================== */

    // GET /admin/users - List all users
    if (url.pathname === "/admin/users" && request.method === "GET") {
      try {
        await requireTeamOrThrow(request, secret);
        const list = [];

        // 1) From KV
        let cursor = "";
        while (true) {
          const { keys, list_complete, cursor: nextCursor } = await env.SHINEL_USERS.list({ prefix: "user:", cursor });
          for (const k of keys) {
            const val = await env.SHINEL_USERS.get(k.name, "json");
            if (val) {
              list.push({
                firstName: val.firstName || "",
                lastName: val.lastName || "",
                email: val.email,
                role: val.role || "client"
              });
            }
          }
          if (list_complete) break;
          cursor = nextCursor;
        }

        // 2) From USERS_JSON static list (fallback/allowlist)
        const staticUsers = loadUsers(env);
        for (const su of staticUsers) {
          if (!list.find(u => u.email === su.email)) {
            list.push({
              firstName: su.firstName || "",
              lastName: su.lastName || "",
              email: su.email,
              role: su.role || "client"
            });
          }
        }

        return json({ users: list }, 200, cors);
      } catch (e) {
        return json({ error: e.message || "Fetch failed" }, e.status || 500, cors);
      }
    }

    // POST /admin/users - Create new user
    if (url.pathname === "/admin/users" && request.method === "POST") {
      try {
        await requireTeamOrThrow(request, secret);
        const body = await request.json().catch(() => ({}));
        const email = String(body.email || "").trim().toLowerCase();
        const password = String(body.password || "");

        if (!email || !password) {
          return json({ error: "Email and password required" }, 400, cors);
        }

        // Standard bcrypt hash (10 rounds)
        const passwordHash = await bcrypt.hash(password, 10);
        const userData = {
          email,
          passwordHash,
          role: String(body.role || "client"),
          firstName: String(body.firstName || ""),
          lastName: String(body.lastName || ""),
          bio: String(body.bio || ""),
          slug: String(body.slug || ""),
          linkedin: String(body.linkedin || ""),
          twitter: String(body.twitter || ""),
          website: String(body.website || ""),
          skills: String(body.skills || ""),
          experience: String(body.experience || "")
        };

        await env.SHINEL_USERS.put(`user:${email}`, JSON.stringify(userData));
        return json({ ok: true, user: { email, role: userData.role } }, 200, cors);
      } catch (e) {
        return json({ error: e.message || "Creation failed" }, e.status || 500, cors);
      }
    }

    // PUT /admin/users/:email - Update user
    if (url.pathname.startsWith("/admin/users/") && request.method === "PUT") {
      try {
        await requireTeamOrThrow(request, secret);
        const email = decodeURIComponent(url.pathname.split("/")[3] || "").toLowerCase();
        const updates = await request.json().catch(() => ({}));

        const raw = await env.SHINEL_USERS.get(`user:${email}`);
        let user = raw ? JSON.parse(raw) : null;

        // If not in KV, try to find in USERS_JSON static list
        if (!user) {
          const staticUsers = loadUsers(env);
          user = staticUsers.find(u => u.email === email) || null;
        }

        if (!user) return json({ error: "User not found" }, 404, cors);

        const merged = { ...user, ...updates };
        if (updates.password) {
          merged.passwordHash = await bcrypt.hash(updates.password, 10);
          delete merged.password;
        }

        merged.email = email; // Ensure email doesn't change
        if (updates.role) merged.role = String(updates.role);

        await env.SHINEL_USERS.put(`user:${email}`, JSON.stringify(merged));
        return json({ ok: true }, 200, cors);
      } catch (e) {
        return json({ error: e.message || "Update failed" }, e.status || 500, cors);
      }
    }

    // DELETE /admin/users/:email - Delete user
    if (url.pathname.startsWith("/admin/users/") && request.method === "DELETE") {
      try {
        await requireTeamOrThrow(request, secret);
        const email = decodeURIComponent(url.pathname.split("/")[3] || "").toLowerCase();
        await env.SHINEL_USERS.delete(`user:${email}`);
        return json({ ok: true }, 200, cors);
      } catch (e) {
        return json({ error: e.message || "Delete failed" }, e.status || 500, cors);
      }
    }

    /* =============================== /stats =============================== */
    if (url.pathname === "/stats" && request.method === "GET") {
      const thumbs = await getJsonList(env, KV_THUMBS_KEY);
      const videos = await getJsonList(env, KV_VIDEOS_KEY);
      return json(
        {
          ok: true,
          time: Date.now(),
          counts: { thumbnails: thumbs.length, videos: videos.length },
        },
        200,
        cors
      );
    }

    /* =============================== /videos ============================== */
    if (url.pathname === "/videos" && request.method === "GET") {
      // Backfill hype if missing, in-place
      const list = await getJsonList(env, KV_VIDEOS_KEY);
      const now = Date.now();
      let mutated = false;
      for (let i = 0; i < list.length; i++) {
        const row = list[i];
        if (typeof row.hype !== "number") {
          row.hype = computeHype(
            Number(row.youtubeViews || 0),
            row.lastViewUpdate || null,
            row.dateAdded || null,
            now
          );
          mutated = true;
        }
      }
      if (mutated) await putJsonList(env, KV_VIDEOS_KEY, list);

      const etag = weakEtagFor(list);
      if (request.headers.get("if-none-match") === etag) {
        return new Response(null, { status: 304, headers: { ...cors, ETag: etag } });
      }
      return json({ videos: list }, 200, { ...cors, ETag: etag });
    }

    if (url.pathname === "/videos" && request.method === "POST") {
      try {
        await requireTeamOrThrow(request, secret);
        const body = await request.json().catch(() => ({}));
        const now = Date.now();

        const primaryId = ytIdFrom(body.primaryUrl || "");
        const creatorId = ytIdFrom(body.creatorUrl || "");
        const id = `v-${now}-${Math.random().toString(36).slice(2)}`;

        const list = await getJsonList(env, KV_VIDEOS_KEY);
        const row = {
          id,
          title: String(body.title || ""),
          category: String(body.category || ""),
          subcategory: String(body.subcategory || ""),
          kind: String(body.kind || "LONG"), // LONG | SHORT | REEL | BRIEF
          tags: Array.isArray(body.tags) ? body.tags : [],
          primaryUrl: String(body.primaryUrl || ""),
          creatorUrl: String(body.creatorUrl || ""),
          // Prefer CREATOR for view id
          videoId: creatorId || primaryId || null,
          youtubeViews: 0,
          viewStatus: "unknown",
          lastViewUpdate: null,
          dateAdded: now,
          lastUpdated: now,
          // Initialize hype (0 until first refresh)
          hype: 0,
        };
        list.push(row);
        await putJsonList(env, KV_VIDEOS_KEY, list);
        return json({ video: row }, 200, cors);
      } catch (e) {
        return json({ error: e.message || "Save failed" }, e.status || 500, cors);
      }
    }

    if (url.pathname.startsWith("/videos/") && request.method === "PUT") {
      try {
        await requireTeamOrThrow(request, secret);
        const id = decodeURIComponent(url.pathname.split("/")[2] || "");
        const updates = await request.json().catch(() => ({}));

        const list = await getJsonList(env, KV_VIDEOS_KEY);
        const idx = list.findIndex((v) => v.id === id);
        if (idx < 0) return json({ error: "Not found" }, 404, cors);

        const now = Date.now();
        const merged = { ...list[idx], ...updates, lastUpdated: now };
        const newPrimaryId = ytIdFrom(merged.primaryUrl || "");
        const newCreatorId = ytIdFrom(merged.creatorUrl || "");
        // Prefer CREATOR on updates as well
        merged.videoId = newCreatorId || newPrimaryId || merged.videoId || null;

        // Recompute hype if views changed or timestamps changed
        merged.hype = computeHype(
          Number(merged.youtubeViews || 0),
          merged.lastViewUpdate || null,
          merged.dateAdded || null,
          now
        );

        list[idx] = merged;
        await putJsonList(env, KV_VIDEOS_KEY, list);
        return json({ video: merged }, 200, cors);
      } catch (e) {
        return json({ error: e.message || "Update failed" }, e.status || 500, cors);
      }
    }

    if (url.pathname.startsWith("/videos/") && request.method === "DELETE") {
      try {
        await requireTeamOrThrow(request, secret);
        const id = decodeURIComponent(url.pathname.split("/")[2] || "");
        const list = await getJsonList(env, KV_VIDEOS_KEY);
        const idx = list.findIndex((v) => v.id === id);
        if (idx >= 0) {
          list.splice(idx, 1);
          await putJsonList(env, KV_VIDEOS_KEY, list);
        }
        return json({ ok: true }, 200, cors);
      } catch (e) {
        return json({ error: e.message || "Delete failed" }, e.status || 500, cors);
      }
    }

    /* ====================== views refresh endpoints ====================== */
    // POST /views/refresh/:videoId
    if (url.pathname.startsWith("/views/refresh/") && request.method === "POST") {
      try {
        await requireTeamOrThrow(request, secret);
        const videoId = decodeURIComponent(url.pathname.split("/")[3] || "");
        if (!videoId) return json({ error: "Missing videoId" }, 400, cors);

        const now = Date.now();
        let updated = 0;

        // Videos list
        const vids = await getJsonList(env, KV_VIDEOS_KEY);
        for (let i = 0; i < vids.length; i++) {
          if (vids[i].videoId === videoId) {
            const v = await fetchYouTubeViews(env, videoId);
            if (v != null) {
              vids[i].youtubeViews = v;
              vids[i].lastViewUpdate = now;
              vids[i].viewStatus = "ok";
              vids[i].lastUpdated = now; // <-- bump for ETag
              // Recompute hype on refresh
              vids[i].hype = computeHype(v, vids[i].lastViewUpdate, vids[i].dateAdded, now);
              updated++;
            } else {
              vids[i].viewStatus = "error";
            }
          }
        }
        if (updated) await putJsonList(env, KV_VIDEOS_KEY, vids);

        // Thumbnails list (best-effort)
        const thumbs = await getJsonList(env, KV_THUMBS_KEY);
        let tUpdated = 0;
        for (let i = 0; i < thumbs.length; i++) {
          if (thumbs[i].videoId === videoId) {
            const v = await fetchYouTubeViews(env, videoId);
            if (v != null) {
              thumbs[i].youtubeViews = v;
              thumbs[i].lastViewUpdate = now;
              thumbs[i].lastUpdated = now; // keep ETag consistent if you show thumbs via same rule
              tUpdated++;
            }
          }
        }
        if (tUpdated) await putJsonList(env, KV_THUMBS_KEY, thumbs);

        return json({ ok: true, updated: updated + tUpdated }, 200, cors);
      } catch (e) {
        return json({ error: e.message || "Refresh failed" }, e.status || 500, cors);
      }
    }

    // POST /views/refresh  (bulk, weekly)
    if (url.pathname === "/views/refresh" && request.method === "POST") {
      try {
        await requireTeamOrThrow(request, secret);
        const now = Date.now();

        const doRefreshSet = async (key, max = 20) => {
          const list = await getJsonList(env, key);
          let n = 0;
          for (let i = 0; i < list.length; i++) {
            const row = list[i];
            const vid = row.videoId || ytIdFrom(row.youtubeUrl || "");
            if (!vid) continue;
            if (!isStale(row.lastViewUpdate, now)) continue;

            const v = await fetchYouTubeViews(env, vid);
            if (v != null) {
              row.youtubeViews = v;
              row.lastViewUpdate = now;
              row.viewStatus = "ok";
              row.lastUpdated = now; // <-- bump for ETag
              // Recompute hype for any object that has views (videos have dateAdded; thumbs may not)
              if (key === KV_VIDEOS_KEY) {
                row.hype = computeHype(v, row.lastViewUpdate, row.dateAdded, now);
              }
              n++;
            } else {
              row.viewStatus = "error";
            }
            if (n >= max) break; // be gentle with API quota
          }
          if (n) await putJsonList(env, key, list);
          return n;
        };

        const nVideos = await doRefreshSet(KV_VIDEOS_KEY, 20);
        const nThumbs = await doRefreshSet(KV_THUMBS_KEY, 20);
        return json({ ok: true, refreshed: { videos: nVideos, thumbnails: nThumbs } }, 200, cors);
      } catch (e) {
        return json({ error: e.message || "Bulk refresh failed" }, e.status || 500, cors);
      }
    }

    /* =========================== /notify (Discord) =========================== */
    if (url.pathname === "/notify" && request.method === "POST") {
      try {
        // Allow clients to notify, so we just verify they have a valid token
        const token = readBearerToken(request);
        if (!token) return json({ error: "Missing token" }, 401, cors);
        const payload = await verifyJWT(token, secret); // Verify signature only

        const body = await request.json().catch(() => ({}));
        const webhookUrl = env.DISCORD_WEBHOOK_URL || "";

        if (!webhookUrl) {
          return json({ error: "Notification service not configured" }, 503, cors);
        }

        const message = String(body.message || "Update from client");
        const type = String(body.type || "info"); // info, upload, urgent

        // Map type to color
        const colors = {
          info: 3447003, // Blue
          upload: 5763719, // Green
          urgent: 15548997 // Red
        };

        const discordPayload = {
          embeds: [{
            title: `Client Notification: ${type.toUpperCase()}`,
            description: message,
            color: colors[type] || 3447003,
            footer: {
              text: `User: ${payload.email} (${payload.role})`
            },
            timestamp: new Date().toISOString()
          }]
        };

        const discRes = await fetch(webhookUrl, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(discordPayload)
        });

        if (!discRes.ok) {
          return json({ error: "Failed to send to Discord" }, 502, cors);
        }

        return json({ ok: true }, 200, cors);

      } catch (e) {
        return json({ error: e.message || "Notification failed" }, 500, cors);
      }
    }

    /* =========================== /thumbnails (proxies) =========================== */
    if (url.pathname === "/thumbnails/fetch-youtube" && request.method === "POST") {
      try {
        await requireTeamOrThrow(request, secret);
        const body = await request.json().catch(() => ({}));
        const videoUrl = String(body.url || body.youtubeUrl || "").trim();
        if (!videoUrl) return json({ error: "Missing URL" }, 400, cors);

        const videoId = ytIdFrom(videoUrl);
        if (!videoId) return json({ error: "Invalid YouTube URL" }, 400, cors);

        const details = await fetchYouTubeVideoDetails(env, videoId);
        if (details.error) return json({ error: details.error }, 400, cors);

        return json({ ok: true, details }, 200, cors);
      } catch (e) {
        return json({ error: e.message || "Fetch failed" }, e.status || 500, cors);
      }
    }

    /* =========================== /thumbnails (public) =========================== */

    if (url.pathname === "/thumbnails" && request.method === "GET") {
      const list = await getJsonList(env, KV_THUMBS_KEY);

      const etag = weakEtagFor(list);
      if (request.headers.get("if-none-match") === etag) {
        return new Response(null, { status: 304, headers: { ...cors, ETag: etag } });
      }

      return json({ thumbnails: list }, 200, { ...cors, ETag: etag });
    }

    /* ======================= /thumbnails (admin CRUD) ======================= */

    if (url.pathname === "/thumbnails" && request.method === "POST") {
      try {
        await requireTeamOrThrow(request, secret);
        const body = await request.json().catch(() => ({}));
        const now = Date.now();

        const list = await getJsonList(env, KV_THUMBS_KEY);
        const id = `t-${now}-${Math.random().toString(36).slice(2)}`;

        const autoVideoId = ytIdFrom(body.youtubeUrl || "");

        const row = {
          id,
          filename: String(body.filename || ""),
          youtubeUrl: String(body.youtubeUrl || ""),
          category: String(body.category || "OTHER"),
          subcategory: String(body.subcategory || ""),
          variant: String(body.variant || "VIDEO"),
          imageUrl: String(body.imageUrl || ""),
          videoId: body.videoId || autoVideoId || null,
          youtubeViews: Number(body.youtubeViews || 0),
          viewStatus: body.viewStatus || "unknown",
          lastViewUpdate: body.lastViewUpdate || null,
          dateAdded: now,
          lastUpdated: now,
        };

        list.push(row);
        await putJsonList(env, KV_THUMBS_KEY, list);
        return json({ thumbnail: row }, 200, cors);
      } catch (e) {
        return json({ error: e.message || "Save failed" }, e.status || 500, cors);
      }
    }

    if (url.pathname.startsWith("/thumbnails/") && request.method === "PUT") {
      try {
        await requireTeamOrThrow(request, secret);
        const id = decodeURIComponent(url.pathname.split("/")[2] || "");
        const updates = await request.json().catch(() => ({}));

        const list = await getJsonList(env, KV_THUMBS_KEY);
        const idx = list.findIndex((t) => t.id === id);
        if (idx < 0) return json({ error: "Not found" }, 404, cors);

        const now = Date.now();
        const merged = { ...list[idx], ...updates, lastUpdated: now };
        list[idx] = merged;

        await putJsonList(env, KV_THUMBS_KEY, list);
        return json({ thumbnail: merged }, 200, cors);
      } catch (e) {
        return json({ error: e.message || "Update failed" }, e.status || 500, cors);
      }
    }

    if (url.pathname.startsWith("/thumbnails/") && request.method === "DELETE") {
      try {
        await requireTeamOrThrow(request, secret);
        const id = decodeURIComponent(url.pathname.split("/")[2] || "");

        const list = await getJsonList(env, KV_THUMBS_KEY);
        const idx = list.findIndex((t) => t.id === id);
        if (idx >= 0) {
          list.splice(idx, 1);
          await putJsonList(env, KV_THUMBS_KEY, list);
        }

        return json({ ok: true }, 200, cors);
      } catch (e) {
        return json({ error: e.message || "Delete failed" }, e.status || 500, cors);
      }
    }

    /* ------------------------------- config ------------------------------- */
    if (url.pathname === "/config/stats" && request.method === "GET") {
      const stats = await env.SHINEL_AUDIT.get("app:config:stats", "json") || { totalReach: null, creatorsImpacted: null };
      return json({ stats }, 200, cors);
    }

    if (url.pathname === "/config/stats" && request.method === "POST") {
      try {
        await requireAdminOrThrow(request, secret);
        const body = await request.json();
        const stats = {
          totalReach: body.totalReach,
          creatorsImpacted: body.creatorsImpacted,
          updatedAt: Date.now()
        };
        await env.SHINEL_AUDIT.put("app:config:stats", JSON.stringify(stats));
        return json({ ok: true, stats }, 200, cors);
      } catch (e) {
        return json({ error: e.message || "Update failed" }, e.status || 500, cors);
      }
    }

    /* ------------------------------- yt-quota ------------------------------- */
    // GET /admin/yt-quota - List health status of all pooled keys
    if (url.pathname === "/admin/yt-quota" && request.method === "GET") {
      try {
        await requireAdminOrThrow(request, secret);
        const keysStr = env.YOUTUBE_API_KEYS || env.YOUTUBE_API_KEY || env.VITE_YOUTUBE_API_KEY || "";
        const keys = keysStr.split(",").map(k => k.trim()).filter(Boolean);

        const health = [];
        for (const k of keys) {
          const keyHash = await sha256Hex(k);
          const isExhausted = await env.SHINEL_AUDIT.get(`yt_key_exhausted:${keyHash}`);
          health.push({
            masked: k.slice(0, 4) + "..." + k.slice(-4),
            hash: keyHash,
            status: isExhausted ? "EXHAUSTED" : "ACTIVE",
            cooldown: isExhausted ? "Up to 1 hour" : "None"
          });
        }

        return json({ keys: health }, 200, cors);
      } catch (e) {
        return json({ error: e.message || "Fetch failed" }, e.status || 500, cors);
      }
    }

    /* ------------------------------- audits ------------------------------- */
    if (url.pathname === "/audits/weekly" && request.method === "GET") {
      try {
        await requireAdminOrThrow(request, secret);
        const audits = await env.SHINEL_AUDIT.get("app:audits:weekly", "json") || [];
        return json({ audits }, 200, cors);
      } catch (e) {
        return json({ error: e.message || "Fetch failed" }, e.status || 500, cors);
      }
    }

    /* ------------------------------- blog ------------------------------- */
    // GET /blog/posts - Public list
    if (url.pathname === "/blog/posts" && request.method === "GET") {
      const posts = await env.SHINEL_AUDIT.get("app:blog:posts", "json") || [];
      // Filter drafts if not admin? For now public sees published.
      // If admin param ?admin=1, show all.
      // Simplest: Public gets everything marked 'published'.
      const isPublic = !url.searchParams.has("admin");
      const result = isPublic ? posts.filter(p => p.status === 'published') : posts;
      // Sort by date desc
      result.sort((a, b) => new Date(b.date) - new Date(a.date));
      return json({ posts: result }, 200, cors);
    }

    // GET /blog/posts/:slug - Single post
    if (url.pathname.match(/^\/blog\/posts\/([^/]+)$/) && request.method === "GET") {
      const slug = url.pathname.split("/").pop();
      const posts = await env.SHINEL_AUDIT.get("app:blog:posts", "json") || [];
      const post = posts.find(p => p.slug === slug);
      if (!post) return json({ error: "Post not found" }, 404, cors);
      return json({ post }, 200, cors);
    }

    // POST /blog/posts (Admin) - Create/Update
    if (url.pathname === "/blog/posts" && request.method === "POST") {
      try {
        await requireAdminOrThrow(request, secret);
        const body = await request.json();
        const { slug, title, content, excerpt, coverImage, author, status, date } = body;

        if (!slug || !title) return json({ error: "Slug and Title required" }, 400, cors);

        let posts = await env.SHINEL_AUDIT.get("app:blog:posts", "json") || [];
        const existingIdx = posts.findIndex(p => p.slug === slug);

        const newPost = {
          slug,
          title,
          content, // Markdown/HTML
          excerpt,
          coverImage,
          author: author || "Shinel Studios",
          status: status || "draft",
          date: date || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        if (existingIdx >= 0) {
          posts[existingIdx] = { ...posts[existingIdx], ...newPost };
        } else {
          posts.push(newPost);
        }

        await env.SHINEL_AUDIT.put("app:blog:posts", JSON.stringify(posts));
        return json({ ok: true, post: newPost }, 200, cors);
      } catch (e) {
        return json({ error: e.message || "Save failed" }, e.status || 500, cors);
      }
    }

    // DELETE /blog/posts/:slug (Admin)
    if (url.pathname.match(/^\/blog\/posts\/([^/]+)$/) && request.method === "DELETE") {
      try {
        await requireAdminOrThrow(request, secret);
        const slug = url.pathname.split("/").pop();
        let posts = await env.SHINEL_AUDIT.get("app:blog:posts", "json") || [];
        const newPosts = posts.filter(p => p.slug !== slug);

        if (posts.length === newPosts.length) return json({ error: "Post not found" }, 404, cors);

        await env.SHINEL_AUDIT.put("app:blog:posts", JSON.stringify(newPosts));
        return json({ ok: true }, 200, cors);
      } catch (e) {
        return json({ error: e.message || "Delete failed" }, e.status || 500, cors);
      }
    }

    /* ------------------------------- not found ------------------------------- */
    return json({ error: "Not found" }, 404, cors);
  },

  async scheduled(event, env, ctx) {
    console.log("CRON TRIGGER: Starting Pulse Sync...");
    ctx.waitUntil((async () => {
      try {
        const lastSyncKey = "app:clients:last_sync_ts";
        const clients = await getClients(env);
        const existingStatsRaw = await env.SHINEL_AUDIT.get("app:clients:stats", "json") || [];
        const existingStatsArray = Array.isArray(existingStatsRaw) ? existingStatsRaw : (existingStatsRaw.stats || []);
        const existingStatsMap = new Map(existingStatsArray.map(s => [s.id, s]));

        const allStats = [];
        const pulseActivities = [];
        const channelMeta = {};
        const now = Date.now();
        let registryMutated = false;

        for (const c of clients) {
          try {
            const identifier = c.youtubeId || c.handle;
            if (!identifier) continue;

            // --- STATUS FILTER ---
            // If client is 'old', skip YouTube fetch but keep their stats for marquee
            if (c.status === "old") {
              const old = existingStatsMap.get(c.id) || existingStatsMap.get(c.youtubeId);
              if (old) {
                allStats.push({ ...old, _stale: true, _source: 'legacy_status' });
                channelMeta[old.id] = { logo: old.logo, title: old.title };
              } else {
                // If no stats exist, push a placeholder so they stay in registry
                allStats.push({ id: c.youtubeId || c.id, title: c.name, logo: c.logo || null, subscribers: c.subscribers || 0, _stale: true });
              }
              continue;
            }

            const result = await fetchYouTubeChannelInfo(env, identifier);
            if (result && !result.error) {
              allStats.push(result);
              channelMeta[result.id] = { logo: result.logo, title: result.title };

              if (result.uploadsPlaylistId && c.uploadsPlaylistId !== result.uploadsPlaylistId) {
                c.uploadsPlaylistId = result.uploadsPlaylistId;
                registryMutated = true;
              }

              const videos = await fetchYouTubePulse(env, result.id, result.uploadsPlaylistId);
              const windowLimit = now - (24 * 60 * 60 * 1000);

              for (const v of videos) {
                const ts = new Date(v.publishedAt).getTime();
                if (ts >= windowLimit) {
                  pulseActivities.push({
                    id: `act-${v.id}-${ts}`,
                    clientName: result.title,
                    channelId: result.id,
                    title: v.title,
                    thumbnail: v.thumbnail,
                    url: `https://youtube.com/watch?v=${v.id}`,
                    type: "VIDEO",
                    timestamp: ts,
                    publishedAt: v.publishedAt
                  });

                  // ALSO PIPELINE TO D1 IF AVAILABLE
                  if (env.DB) {
                    try {
                      await env.DB.prepare(
                        "INSERT OR IGNORE INTO pulse_activities (id, client_id, youtube_video_id, title, thumbnail, url, published_at, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
                      ).bind(`act-${v.id}-${ts}`, result.id, v.id, v.title, v.thumbnail, `https://youtube.com/watch?v=${v.id}`, v.publishedAt, ts).run();
                    } catch (e) { console.error("D1 Pulse Insert Error:", e.message); }
                  }
                }
              }
            } else {
              const old = existingStatsMap.get(c.id) || existingStatsMap.get(c.youtubeId);
              if (old) {
                allStats.push({ ...old, _stale: true });
                channelMeta[old.id] = { logo: old.logo, title: old.title };
              }
            }
          } catch (err) {
            console.error(`Scheduled Sync Error for ${c.name}:`, err.message);
            const old = existingStatsMap.get(c.id) || existingStatsMap.get(c.youtubeId);
            if (old) {
              allStats.push({ ...old, _stale: true });
              channelMeta[old.id] = { logo: old.logo, title: old.title };
            }
          }
        }

        pulseActivities.sort((a, b) => b.timestamp - a.timestamp);

        if (registryMutated) {
          await env.SHINEL_AUDIT.put("app:clients:registry", JSON.stringify(clients));
        }

        await env.SHINEL_AUDIT.put("app:clients:stats", JSON.stringify(allStats));
        await env.SHINEL_AUDIT.put("app:clients:pulse", JSON.stringify({
          activities: pulseActivities,
          meta: channelMeta,
          ts: now
        }));
        await env.SHINEL_AUDIT.put(lastSyncKey, String(now));

        // --- WEEKLY AUDIT AGGREGATION ---
        const lastWeeklyAudit = await env.SHINEL_AUDIT.get("app:audits:weekly_last_ts");
        const weekInMs = 7 * 24 * 60 * 60 * 1000;
        if (!lastWeeklyAudit || (now - Number(lastWeeklyAudit)) > weekInMs) {
          const totalSubs = allStats.reduce((sum, s) => sum + (Number(s.subscribers) || 0), 0);
          const totalViews = allStats.reduce((sum, s) => sum + (Number(s.viewCount) || 0), 0);
          const activeCreators = clients.filter(c => c.status !== 'old').length;

          const auditSummary = {
            ts: now,
            date: new Date(now).toISOString(),
            totalCreators: clients.length,
            activeCreators,
            totalSubscribers: totalSubs,
            totalViews: totalViews,
            syncErrors: allStats.filter(s => s._stale).length
          };

          const auditHistory = await env.SHINEL_AUDIT.get("app:audits:weekly", "json") || [];
          auditHistory.unshift(auditSummary);
          await env.SHINEL_AUDIT.put("app:audits:weekly", JSON.stringify(auditHistory.slice(0, 10))); // Keep last 10 weeks
          await env.SHINEL_AUDIT.put("app:audits:weekly_last_ts", String(now));
          console.log("WEEKLY AUDIT GENERATED:", auditSummary);
        }

        console.log(`CRON SUCCESS: Synced ${allStats.length} creators.`);
      } catch (e) {
        console.error("CRON ERROR:", e.message);
      }
    })());
  }
};
