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
      return o === A || o.startsWith(A);
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
      return o === A || o.startsWith(A);
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
    clockTolerance: 60,
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

async function fetchYouTubeViews(env, videoId) {
  const key = env.YOUTUBE_API_KEY || env.VITE_YOUTUBE_API_KEY || "";
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
    const allowedOrigins = (env.ALLOWED_ORIGINS || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const cors = makeCorsHeaders(origin, allowedOrigins);
    const secret = new TextEncoder().encode(env.JWT_SECRET || "change-me");
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
      return json({ ok: true, service: "shinel-auth", time: Date.now() }, 200, cors);
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
      return json({
        site: {
          name: "Shinel Studios",
          contact: "contact@shinelstudios.in"
        },
        features: {
          pulse: true,
          hub: true
        }
      }, 200, cors);
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
      const feed = await env.SHINEL_AUDIT.get("app:clients:pulse", "json") || { activities: [], meta: {}, ts: Date.now() };
      return json(feed, 200, cors);
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
          dateAdded: now,
          lastUpdated: now
        };

        list.push(row);
        await env.SHINEL_AUDIT.put("app:clients:registry", JSON.stringify(list));
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
      return json({ ok: true, stats: {} }, 200, cors);
    }

    // GET /clients/history - Activity history
    if (url.pathname === "/clients/history" && request.method === "GET") {
      return json({ ok: true, history: [] }, 200, cors);
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

    /* ------------------------------- not found ------------------------------- */
    return json({ error: "Not found" }, 404, cors);
  },
};
