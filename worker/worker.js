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
import * as Sentry from "@sentry/cloudflare";

/* ============================== tiny helpers ============================== */
const json = (obj, status = 200, headers = {}) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });

function makeCorsHeaders(origin, allowedOrigins) {
  const o = (origin || "").toLowerCase();
  if (!o) return { "Vary": "Origin" };

  const ok = allowedOrigins.some((a) => {
    const A = (a || "").trim().toLowerCase();
    if (!A || A === "*") return false; // Block wildcard * in code, must be explicit
    try {
      const urlO = new URL(o);
      const urlA = new URL(A);
      // Strict protocol + hostname match
      return urlO.protocol === urlA.protocol && urlO.hostname === urlA.hostname;
    } catch {
      return o === A;
    }
  });

  const h = {
    "Access-Control-Allow-Headers": "content-type, authorization",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Access-Control-Allow-Credentials": "true",
    "Vary": "Origin",
  };
  
  if (ok) {
    h["Access-Control-Allow-Origin"] = origin;
  }
  
  return h;
}

function pickAllowedOrigin(origin, allowedOrigins) {
  const o = (origin || "").toLowerCase();
  if (!o) return null;

  const ok = allowedOrigins.some((a) => {
    const A = (a || "").trim().toLowerCase();
    if (!A || A === "*") return false;
    try {
      const urlO = new URL(o);
      const urlA = new URL(A);
      return urlO.protocol === urlA.protocol && urlO.hostname === urlA.hostname;
    } catch {
      return o === A;
    }
  });
  return ok ? origin : null;
}

/* ============================== auth helpers ============================== */
// USERS: KV-first (SHINEL_USERS) with fallback to USERS_JSON allowlist

// Module-scope cache for /admin/users — saves a KV.list() + N KV.get() per
// admin page load. The Cloudflare Free tier caps list operations at 1000/day;
// without this cache, a few rounds of admin browsing + the daily Playwright
// run trip the limit. Cache survives within an isolate (not across cold
// starts), invalidated explicitly on every user mutation.
let _adminUsersCache = null;
let _adminUsersCacheExpiry = 0;
const ADMIN_USERS_TTL_MS = 60_000;
function invalidateAdminUsersCache() { _adminUsersCacheExpiry = 0; _adminUsersCache = null; }

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

// Attach a jti so individual tokens can be revoked in KV.
async function signAccess(payload, secret, minutes = 30) {
  const withJti = { ...payload, jti: payload.jti || crypto.randomUUID() };
  return new SignJWT(withJti)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${minutes}m`)
    .sign(secret);
}
async function signRefresh(payload, secret, days = 7) {
  const withJti = { ...payload, jti: payload.jti || crypto.randomUUID() };
  return new SignJWT(withJti)
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

// KV-backed JWT revocation list. Call isJtiRevoked(env, jti) on every auth-gated request;
// revokeJti(env, jti, ttl) on logout and refresh-token rotation. Bypass entirely when the
// JWT_REVOCATION_ENABLED env flag is absent/false for a cheap kill-switch during rollout.
async function isJtiRevoked(env, jti) {
  if (!jti || !env.SHINEL_AUDIT) return false;
  if (env.JWT_REVOCATION_ENABLED !== "1" && env.JWT_REVOCATION_ENABLED !== true) return false;
  const v = await env.SHINEL_AUDIT.get(`jwt:revoked:${jti}`);
  return !!v;
}
async function revokeJti(env, jti, ttlSeconds) {
  if (!jti || !env.SHINEL_AUDIT) return;
  const opts = ttlSeconds && ttlSeconds > 0 ? { expirationTtl: Math.min(Math.max(60, ttlSeconds), 30 * 24 * 3600) } : undefined;
  await env.SHINEL_AUDIT.put(`jwt:revoked:${jti}`, "1", opts);
}

/* ====================== Per-device session tracking ======================
 * Each row in `sessions:<email>` corresponds to one logged-in device.
 * The `jti` field tracks the CURRENT refresh-token JTI for that device —
 * /auth/refresh rotates the JTI but updates the same row, so device
 * continuity survives token rotation.
 *
 * Capped at MAX_SESSIONS_PER_USER (FIFO eviction). Oldest device gets
 * silently evicted when the cap is hit. Revoking a session adds the
 * current JTI to the global denylist so the device's bearer/refresh
 * stop working immediately.
 *
 * UA → human label is a tiny inline parser (no `ua-parser-js` dep).
 */
const MAX_SESSIONS_PER_USER = 10;

function parseUserAgent(ua = "") {
  const s = String(ua || "");
  let browser = "Browser", os = "Device";
  if (/Edg\//.test(s)) browser = "Edge";
  else if (/Chrome\//.test(s) && !/OPR\//.test(s)) browser = "Chrome";
  else if (/Firefox\//.test(s)) browser = "Firefox";
  else if (/Safari\//.test(s) && !/Chrome\//.test(s)) browser = "Safari";
  else if (/OPR\//.test(s) || /Opera/.test(s)) browser = "Opera";
  if (/iPhone/.test(s)) os = "iPhone";
  else if (/iPad/.test(s)) os = "iPad";
  else if (/Android/.test(s)) os = "Android";
  else if (/Windows NT/.test(s)) os = "Windows";
  else if (/Mac OS X/.test(s)) os = "macOS";
  else if (/Linux/.test(s)) os = "Linux";
  return `${browser} on ${os}`;
}

async function getSessions(env, email) {
  if (!email || !env.SHINEL_AUDIT) return [];
  const list = await env.SHINEL_AUDIT.get(`sessions:${email.toLowerCase()}`, "json");
  return Array.isArray(list) ? list : [];
}

async function saveSessions(env, email, list) {
  if (!email || !env.SHINEL_AUDIT) return;
  // 30-day TTL — longer than refresh TTL so we keep recent device history.
  await env.SHINEL_AUDIT.put(
    `sessions:${email.toLowerCase()}`,
    JSON.stringify(list),
    { expirationTtl: 30 * 24 * 3600 }
  );
}

async function trackNewSession(env, email, jti, request) {
  if (!jti || !email) return;
  const ua = request.headers.get("user-agent") || "";
  const ip = request.headers.get("cf-connecting-ip") || "";
  const ipHash = ip ? (await sha256Hex(ip)).slice(0, 12) : "";
  const now = Date.now();
  const list = await getSessions(env, email);
  list.push({
    jti,
    label: parseUserAgent(ua),
    ipHash,
    createdAt: now,
    lastSeenAt: now,
  });
  // FIFO trim if over cap.
  const trimmed = list.length > MAX_SESSIONS_PER_USER
    ? list.slice(list.length - MAX_SESSIONS_PER_USER)
    : list;
  await saveSessions(env, email, trimmed);
}

async function rotateSessionJti(env, email, oldJti, newJti) {
  if (!email || !oldJti || !newJti) return;
  const list = await getSessions(env, email);
  const idx = list.findIndex((s) => s.jti === oldJti);
  if (idx < 0) {
    // Old session record missing — treat the rotation as a fresh device.
    list.push({ jti: newJti, label: "Unknown device", ipHash: "", createdAt: Date.now(), lastSeenAt: Date.now() });
  } else {
    list[idx].jti = newJti;
    list[idx].lastSeenAt = Date.now();
  }
  await saveSessions(env, email, list);
}

async function removeSessionByJti(env, email, jti) {
  if (!email || !jti) return;
  const list = await getSessions(env, email);
  const next = list.filter((s) => s.jti !== jti);
  if (next.length !== list.length) await saveSessions(env, email, next);
}

async function sha256Hex(input) {
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest("SHA-256", enc.encode(input));
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/* ====================== Rate limit (KV) + Audit (KV) ====================== */
async function isRateLimited(env, ip, windowSec = 600, max = 5, bucket = "login") {
  if (!ip) return false;
  const key = `rl:${bucket}:${ip}`;
  // FAIL-OPEN on KV read or write failure (e.g. "KV put() limit exceeded
  // for the day" on the free tier). Returning `false` means "not rate
  // limited" — login + other auth paths keep working even when the
  // counter can't be persisted. The alternative (failing closed) takes
  // the whole site down whenever KV quota burns out.
  try {
    const curr = Number((await env.SHINEL_AUDIT.get(key)) || "0");
    if (curr >= max) return true;
    await env.SHINEL_AUDIT.put(key, String(curr + 1), { expirationTtl: windowSec });
    return false;
  } catch (e) {
    console.warn(`isRateLimited(${bucket}) KV failure — failing open:`, e?.message || e);
    return false;
  }
}

// Simple RFC-5322-ish email regex (mirrors frontend/QuickLeadForm.jsx:52).
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
// Clamp a string to a max length; returns "" on nullish input.
function clampStr(v, max) {
  return String(v == null ? "" : v).slice(0, max);
}

// Accepts only legitimate YouTube watch/shorts URLs. Rejects anything with credentials,
// non-standard ports, or shell-metacharacter smuggling in path/query (belt + suspenders
// for the mirror-service which previously shelled out with the raw URL).
function isSafeYouTubeUrl(input) {
  if (typeof input !== "string" || input.length === 0 || input.length > 500) return false;
  if (/[;$`\n\r|&<>]/.test(input)) return false;
  let u;
  try { u = new URL(input); } catch { return false; }
  if (u.protocol !== "https:" && u.protocol !== "http:") return false;
  if (u.username || u.password || u.port) return false;
  const ALLOWED_HOSTS = new Set([
    "youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be", "music.youtube.com",
  ]);
  return ALLOWED_HOSTS.has(u.hostname.toLowerCase());
}

// HMAC-SHA-256 over `data` keyed by `secret`, returned as lowercase hex.
async function hmacHex(secret, data) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
}
// Constant-time compare for hex strings (case-insensitive).
function timingSafeEqualHex(a, b) {
  const aa = String(a || "").toLowerCase();
  const bb = String(b || "").toLowerCase();
  if (aa.length !== bb.length) return false;
  let diff = 0;
  for (let i = 0; i < aa.length; i++) diff |= aa.charCodeAt(i) ^ bb.charCodeAt(i);
  return diff === 0;
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

// Hard cap on a single KV value (KV limit is 25MB; we stay well under so a
// single bad write can't wedge a hot key). If a caller accidentally blows this,
// we refuse the write with a clear error rather than silently truncating.
const KV_VALUE_SOFT_LIMIT_BYTES = 2 * 1024 * 1024; // 2 MB

// Guarded JSON put — use for any KV write where the payload grows over time
// (client lists, stats arrays, pulse snapshots). Single bad write won't wedge
// the hot key; instead we throw so the caller surfaces 507 to the client.
async function putJsonGuarded(ns, key, value) {
  const serialized = JSON.stringify(value);
  if (serialized.length > KV_VALUE_SOFT_LIMIT_BYTES) {
    console.error(
      `KV write refused: ${key} serialized to ${serialized.length} bytes ` +
      `(over ${KV_VALUE_SOFT_LIMIT_BYTES}). Size of value: ${Array.isArray(value) ? value.length + " items" : typeof value}.`
    );
    throw Object.assign(
      new Error(`KV value too large for ${key} (${serialized.length} bytes). Cap entries or paginate.`),
      { status: 507 }
    );
  }
  await ns.put(key, serialized);
}

async function putJsonList(env, key, list) {
  const ns = resolveKV(env, key);
  await putJsonGuarded(ns, key, list);
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

// Strip sensitive/internal fields before returning clients to anonymous callers.
// Internal UIs should hit /clients/internal for the full shape.
function sanitizeClientForPublic(c) {
  if (!c || typeof c !== "object") return c;
  return {
    id: c.id,
    name: c.name,
    displayName: c.display_name || c.displayName || c.name || "",
    displayHandle: c.displayHandle || c.handle || c.instagram_handle || "",
    youtubeId: c.youtubeId || c.youtube_id || "",
    youtubeUrl: c.youtubeUrl || (c.youtube_id ? `https://www.youtube.com/channel/${c.youtube_id}` : ""),
    instagramUrl: c.instagramUrl || (c.instagram_handle ? `https://instagram.com/${String(c.instagram_handle).replace(/^@/, "")}` : ""),
    subscribers: Number(c.subscribers || 0),
    publicSocials: c.publicSocials || null,
    avatarUrl: c.avatarUrl || c.avatar_url || "",
    // Client portal v1 fields — exposed so the sitemap script and any
    // future "Featured creators" surface can find publicly-enabled pages.
    // Sensitive portal fields (portal_email, discord_webhook_url, etc.)
    // are NEVER returned by this function.
    slug: c.slug || null,
    publicEnabled: !!c.public_enabled,
  };
}

// Public-safe keys for /config GET. Any other key written to app:config:global stays admin-only.
const PUBLIC_CONFIG_KEYS = new Set([
  "siteBrand",
  "announcement",
  "socials",
  "features",
  "branding",
  "homepage",
  "marquee",
]);
function sanitizeConfigForPublic(cfg) {
  if (!cfg || typeof cfg !== "object") return {};
  const out = {};
  for (const k of Object.keys(cfg)) {
    if (PUBLIC_CONFIG_KEYS.has(k)) out[k] = cfg[k];
  }
  return out;
}



// ETag now hashes the serialized array with FNV-1a 32-bit — cheap, non-crypto, but
// collision-resistant enough for conditional GET (fixes prior numeric-sum collision bug).
function fnv1a32Hex(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i) & 0xff;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}
function weakEtagFor(arr) {
  try {
    return `W/"${fnv1a32Hex(JSON.stringify(arr))}-${arr.length}"`;
  } catch {
    return `W/"0-${(arr && arr.length) || 0}"`;
  }
}

function readBearerToken(request) {
  const auth = request.headers.get("authorization") || "";
  return auth.startsWith("Bearer ") ? auth.slice(7) : "";
}
// Thin wrapper around jose's jwtVerify that turns any verification failure
// (expired / malformed / bad signature) into a 401 instead of an opaque 500.
async function verifyJwtOr401(token, secret) {
  try {
    return await verifyJWT(token, secret);
  } catch (e) {
    const msg = String(e?.code || e?.message || "Invalid token");
    throw Object.assign(new Error(msg.includes("exp") ? "Token expired" : "Invalid token"), { status: 401 });
  }
}

async function requireTeamOrThrow(request, secret, env) {
  const token = readBearerToken(request);
  if (!token) throw Object.assign(new Error("Missing token"), { status: 401 });
  const payload = await verifyJwtOr401(token, secret);
  if (env && await isJtiRevoked(env, payload.jti)) {
    throw Object.assign(new Error("Token revoked"), { status: 401 });
  }
  const role = String(payload.role || "").toLowerCase();
  const allowed = role === "team" || role === "admin" || role.split(",").map(s => s.trim()).includes("admin") || role.split(",").map(s => s.trim()).includes("team");
  if (!allowed) throw Object.assign(new Error("Forbidden"), { status: 403 });
  return payload;
}

// Like requireTeamOrThrow but with no role gating — verifies the JWT is
// well-formed and the JTI hasn't been revoked. Use for endpoints that
// any authenticated user (editor, artist, client) should be able to hit
// (e.g. avatar upload on /me, profile self-service).
async function requireAuthOrThrow(request, secret, env) {
  const token = readBearerToken(request);
  if (!token) throw Object.assign(new Error("Missing token"), { status: 401 });
  const payload = await verifyJwtOr401(token, secret);
  if (env && await isJtiRevoked(env, payload.jti)) {
    throw Object.assign(new Error("Token revoked"), { status: 401 });
  }
  return payload;
}

async function requireAdminOrThrow(request, secret, env) {
  const token = readBearerToken(request);
  if (!token) throw Object.assign(new Error("Missing token"), { status: 401 });
  const payload = await verifyJwtOr401(token, secret);
  if (env && await isJtiRevoked(env, payload.jti)) {
    throw Object.assign(new Error("Token revoked"), { status: 401 });
  }
  const role = String(payload.role || "").toLowerCase();
  const hasAdmin = role === "admin" || role.split(",").map(s => s.trim()).includes("admin");
  if (!hasAdmin) throw Object.assign(new Error("Admin access required"), { status: 403 });
  return payload;
}

// Client portal: requires the JWT to carry the "client" role (or "admin" so
// admins can act-as during debugging). Use with getCurrentClientFromPayload
// to fetch the owning D1 row.
async function requireClientOrThrow(request, secret, env) {
  const token = readBearerToken(request);
  if (!token) throw Object.assign(new Error("Missing token"), { status: 401 });
  const payload = await verifyJwtOr401(token, secret);
  if (env && await isJtiRevoked(env, payload.jti)) {
    throw Object.assign(new Error("Token revoked"), { status: 401 });
  }
  const roles = String(payload.role || "").toLowerCase().split(",").map(s => s.trim());
  if (!roles.includes("client") && !roles.includes("admin")) {
    throw Object.assign(new Error("Client portal access required"), { status: 403 });
  }
  return payload;
}

// Look up the clients D1 row attached to a logged-in portal user.
// Returns null for callers without an attached client (e.g. admins acting
// without ?actAs= override — endpoint handlers decide what to do then).
async function getCurrentClientFromPayload(env, payload) {
  if (!env?.DB || !payload?.email) return null;
  try {
    const email = String(payload.email).trim().toLowerCase();
    const row = await env.DB
      .prepare("SELECT * FROM clients WHERE LOWER(portal_email) = ? LIMIT 1")
      .bind(email).first();
    return row || null;
  } catch (e) {
    console.error("getCurrentClientFromPayload failed:", e?.message || e);
    return null;
  }
}

// Slug validation for /c/<slug>. Lowercase + digits + dashes, 3-30 chars,
// not starting/ending with a dash, plus a reserved-word blocklist so a
// client can't claim a path that conflicts with our SPA routes.
const CLIENT_SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])?$/;
const CLIENT_SLUG_RESERVED = new Set([
  "admin", "api", "c", "dashboard", "login", "logout", "me", "studio",
  "hub", "blog", "work", "team", "contact", "pricing", "tools", "faq",
  "about", "live", "privacy", "terms", "services", "live-templates",
  "portfolio", "portal", "settings", "leaderboard",
]);
function validateClientSlug(slug) {
  const s = String(slug || "").trim().toLowerCase();
  if (!s) return { ok: false, error: "slug required" };
  if (s.length < 3 || s.length > 30) return { ok: false, error: "slug must be 3-30 chars" };
  if (!CLIENT_SLUG_RE.test(s)) return { ok: false, error: "slug must be lowercase letters/digits/dashes" };
  if (CLIENT_SLUG_RESERVED.has(s)) return { ok: false, error: "slug is reserved" };
  return { ok: true, slug: s };
}

// Server-side module-config validation. Mirrors the frontend module
// registry. Each type validates its own config object — silently coerces
// missing fields to defaults rather than rejecting (forgiving editor UX).
const CLIENT_MODULE_TYPES = new Set([
  "hero", "bioLinks", "latestVideo", "stats30day", "tipJar", "shinelFooter",
  // Phase 2 (revenue + engagement modules)
  "sponsorRates", "affiliateShelf", "merchShelf", "calendly", "courseLinks",
  "newsletter", "contact",
  // Phase 4 (engagement loops)
  "pressKit", "fanWall", "ama", "devLog",
]);
function sanitizeClientModules(input) {
  if (!Array.isArray(input)) return [];
  const out = [];
  const seen = new Set();
  for (const m of input.slice(0, 20)) {
    if (!m || typeof m !== "object") continue;
    const type = String(m.type || "").trim();
    if (!CLIENT_MODULE_TYPES.has(type)) continue;
    if (seen.has(type)) continue; // one of each type max
    seen.add(type);
    const enabled = Boolean(m.enabled);
    const config = sanitizeModuleConfig(type, m.config);
    out.push({ type, enabled, config });
  }
  return out;
}
function sanitizeModuleConfig(type, c) {
  const cfg = (c && typeof c === "object") ? c : {};
  switch (type) {
    case "hero":
      return { tagline: clampStr(cfg.tagline, 200) };
    case "bioLinks": {
      const links = Array.isArray(cfg.links) ? cfg.links.slice(0, 10) : [];
      return {
        links: links
          .filter(l => l && typeof l === "object" && l.label && l.url)
          .map(l => ({
            label: clampStr(l.label, 60),
            url: clampStr(l.url, 500),
            icon: clampStr(l.icon || "link", 24),
          })),
      };
    }
    case "latestVideo":
      // Channel/handle resolved from the parent client row's youtube_id;
      // module config only carries display preferences.
      return { showStats: cfg.showStats !== false };
    case "stats30day":
      return { metric: ["subscribers","instagram_followers","view_count"].includes(cfg.metric) ? cfg.metric : "subscribers" };
    case "tipJar":
      return {
        upi: clampStr(cfg.upi, 80),
        externalUrl: clampStr(cfg.externalUrl, 500),
        message: clampStr(cfg.message, 200),
      };
    case "shinelFooter":
      return {}; // no config — text is fixed

    // ----- Phase 2 modules -----
    case "sponsorRates": {
      const tiers = Array.isArray(cfg.tiers) ? cfg.tiers.slice(0, 3) : [];
      return {
        headline: clampStr(cfg.headline, 80),
        subheadline: clampStr(cfg.subheadline, 200),
        ctaLabel: clampStr(cfg.ctaLabel, 60),
        tiers: tiers
          .filter(t => t && typeof t === "object")
          .map(t => ({
            name: clampStr(t.name, 40),
            price: clampStr(t.price, 40),
            deliverables: clampStr(t.deliverables, 200),
          })),
      };
    }
    case "affiliateShelf": {
      const items = Array.isArray(cfg.items) ? cfg.items.slice(0, 12) : [];
      return {
        headline: clampStr(cfg.headline, 60),
        disclaimer: clampStr(cfg.disclaimer, 200),
        items: items
          .filter(it => it && typeof it === "object" && it.name)
          .map(it => ({
            name: clampStr(it.name, 80),
            url: clampStr(it.url, 500),
            image: clampStr(it.image, 500),
            price: clampStr(it.price, 20),
          })),
      };
    }
    case "merchShelf": {
      const items = Array.isArray(cfg.items) ? cfg.items.slice(0, 8) : [];
      return {
        headline: clampStr(cfg.headline, 60),
        items: items
          .filter(it => it && typeof it === "object" && it.name)
          .map(it => ({
            name: clampStr(it.name, 80),
            url: clampStr(it.url, 500),
            image: clampStr(it.image, 500),
            price: clampStr(it.price, 20),
          })),
      };
    }
    case "calendly":
      return {
        url: clampStr(cfg.url, 500),
        headline: clampStr(cfg.headline, 80),
        subheadline: clampStr(cfg.subheadline, 200),
        ctaLabel: clampStr(cfg.ctaLabel, 40),
      };
    case "courseLinks": {
      const items = Array.isArray(cfg.items) ? cfg.items.slice(0, 6) : [];
      const platforms = new Set(["course", "patreon", "discord", "telegram", "website", "generic"]);
      return {
        headline: clampStr(cfg.headline, 60),
        items: items
          .filter(it => it && typeof it === "object" && it.label)
          .map(it => ({
            platform: platforms.has(it.platform) ? it.platform : "generic",
            label: clampStr(it.label, 60),
            description: clampStr(it.description, 120),
            url: clampStr(it.url, 500),
          })),
      };
    }
    case "newsletter":
      return {
        headline: clampStr(cfg.headline, 80),
        subheadline: clampStr(cfg.subheadline, 200),
        ctaLabel: clampStr(cfg.ctaLabel, 20),
      };
    case "contact":
      return {
        headline: clampStr(cfg.headline, 80),
        subheadline: clampStr(cfg.subheadline, 200),
        ctaLabel: clampStr(cfg.ctaLabel, 20),
      };

    // ----- Phase 4 modules -----
    case "pressKit":
      return {
        headline: clampStr(cfg.headline, 80),
        contactEmail: clampStr(cfg.contactEmail, 254),
        bio: clampStr(cfg.bio, 800),
        includeStats: cfg.includeStats !== false,
      };
    case "fanWall":
      return {
        headline: clampStr(cfg.headline, 80),
        subheadline: clampStr(cfg.subheadline, 200),
        ctaLabel: clampStr(cfg.ctaLabel, 20),
        autoPin: cfg.autoPin !== false, // default: new comments show immediately
      };
    case "ama":
      return {
        headline: clampStr(cfg.headline, 80),
        subheadline: clampStr(cfg.subheadline, 200),
        ctaLabel: clampStr(cfg.ctaLabel, 20),
      };
    case "devLog":
      return {
        headline: clampStr(cfg.headline, 80),
        subheadline: clampStr(cfg.subheadline, 200),
      };

    default:
      return {};
  }
}

// Fire-and-forget Discord webhook. Swallows all errors — the inbox row
// is the source of truth, the webhook is the convenience push.
function fireDiscordWebhook(webhookUrl, payload) {
  if (!webhookUrl || typeof webhookUrl !== "string") return;
  if (!/^https:\/\/(discord\.com|discordapp\.com|ptb\.discord\.com|canary\.discord\.com)\/api\/webhooks\//.test(webhookUrl)) return;
  try {
    fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(() => { /* silent */ });
  } catch { /* silent */ }
}

// Allowed user roles (server-side whitelist for /admin/users mutations).
const ALLOWED_ROLES = ["admin", "team", "editor", "artist", "client"];

// Specialty slugs — corresponds to the three /work/<slug> microsites.
// Inventory rows can be tagged with one of these so they auto-populate
// the specialty page strip via GET /api/specialty/:slug.
const ALLOWED_SPECIALTIES = new Set(["ai-music", "ai-tattoo", "ai-gfx"]);
function sanitizeSpecialty(value) {
  const s = String(value || "").trim().toLowerCase();
  if (!s) return null;
  return ALLOWED_SPECIALTIES.has(s) ? s : null;
}
// Accepts single role string or comma-separated multi-role. Returns sanitized comma-separated list,
// or null if nothing valid remains. Caller must check for "admin" presence separately.
function sanitizeRoleField(value) {
  if (value == null) return null;
  const parts = String(value)
    .split(",")
    .map(s => s.trim().toLowerCase())
    .filter(s => ALLOWED_ROLES.includes(s));
  if (parts.length === 0) return null;
  return Array.from(new Set(parts)).join(",");
}
function roleIncludesAdmin(roleStr) {
  if (!roleStr) return false;
  return String(roleStr).split(",").map(s => s.trim().toLowerCase()).includes("admin");
}

/* ============================= YouTube helpers ============================= */
async function fetchWithRetry(url, options = {}, maxRetries = 3) {
  let attempt = 0;
  let lastErr = null;
  while (attempt < maxRetries) {
    try {
      const resp = await fetch(url, options);
      if (resp.ok) return resp;
      if (resp.status >= 400 && resp.status < 500 && resp.status !== 429) {
        // Non-retriable 4xx (auth/quota). Return response to caller.
        return resp;
      }
      lastErr = new Error(`HTTP ${resp.status}`);
      throw lastErr;
    } catch (err) {
      lastErr = err;
      attempt++;
      if (attempt >= maxRetries) break;
      // Exponential backoff: 500ms, 1000ms, 2000ms
      await new Promise(r => setTimeout(r, 500 * Math.pow(2, attempt)));
    }
  }
  // Ensure callers always see an error object; never undefined (old bug).
  throw lastErr || new Error(`fetchWithRetry exhausted for ${url}`);
}

const ytIdFrom = (url) => {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1);
    if (u.searchParams.get("v")) return u.searchParams.get("v");
    // /shorts/<id> (vertical short) and /live/<id> (livestream archive) both
    // place the videoId directly in the path. /live/<id> matters because
    // past livestreams in inventory_thumbnails carry these URLs and
    // refresh-views was failing for them.
    const shortsMatch = u.pathname.match(/\/shorts\/([^/]+)/);
    if (shortsMatch) return shortsMatch[1];
    const liveMatch = u.pathname.match(/\/live\/([^/?]+)/);
    if (liveMatch) return liveMatch[1];
    const embedMatch = u.pathname.match(/\/embed\/([^/?]+)/);
    if (embedMatch) return embedMatch[1];
  } catch { }
  return "";
};

/**
 * Intelligent Key Rotation
 * - Support multiple comma-separated keys in YOUTUBE_API_KEYS
 * - Automatically skips keys blacklisted in KV (1 hour cooldown for quota)
 *
 * Only reads from YOUTUBE_API_KEYS (the wrangler secret). The legacy
 * VITE_YOUTUBE_API_KEY fallback was removed — VITE_-prefixed vars are
 * for the frontend bundle only and should never be set as worker
 * secrets. The git-history-leaked frontend key is no longer reachable
 * through any fallback path.
 */
async function getYoutubeKey(env) {
  const keysStr = env.YOUTUBE_API_KEYS || env.YOUTUBE_API_KEY || "";
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
        try { await env.SHINEL_AUDIT.put(`yt_key_exhausted:${await sha256Hex(key)}`, "true", { expirationTtl: 3600 }); } catch (kvErr) { console.warn("yt_key_exhausted KV write failed:", kvErr?.message || kvErr); }
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
        try { await env.SHINEL_AUDIT.put(`yt_key_exhausted:${await sha256Hex(key)}`, "true", { expirationTtl: 3600 }); } catch (kvErr) { console.warn("yt_key_exhausted KV write failed:", kvErr?.message || kvErr); }
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
          try { await env.SHINEL_AUDIT.put(`yt_key_exhausted:${await sha256Hex(key)}`, "true", { expirationTtl: 3600 }); } catch (kvErr) { console.warn("yt_key_exhausted KV write failed:", kvErr?.message || kvErr); }
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
          try { await env.SHINEL_AUDIT.put(`yt_key_exhausted:${await sha256Hex(key)}`, "true", { expirationTtl: 3600 }); } catch (kvErr) { console.warn("yt_key_exhausted KV write failed:", kvErr?.message || kvErr); }
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

    let logoUrl = imageMatch ? imageMatch[1].replace(/&amp;/g, '&') : null;

    // --- NEW: Download and Cache the Instagram DP in KV ---
    // This permanently bypasses Facebook's temporary CDN URL expiration timers
    if (logoUrl && env.THUMBNAILS) {
      try {
        const dpRes = await fetch(logoUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
            "Accept": "image/*"
          }
        });
        if (dpRes.ok) {
          const buffer = await dpRes.arrayBuffer();
          const key = `ig_dp_${cleanHandle}`;
          // Store in KV for 14 days
          await env.THUMBNAILS.put(key, buffer, { expirationTtl: 14 * 24 * 60 * 60 });
          // Return the stable internal endpoint instead of the ephemeral CDN URL
          // Uses the exact same host as the worker automatically
          logoUrl = `/api/ig-dp?handle=${encodeURIComponent(cleanHandle)}`;
        }
      } catch (kvErr) {
        console.error("Failed to cache IG DP in KV:", kvErr.message);
        // Fallback to the CDN URL safely if fetch/KV fails
      }
    }

    return {
      handle: `@${cleanHandle}`,
      followers: followers,
      logo: logoUrl
    };
  } catch (e) {
    return { error: e.message };
  }
}

// Extract the shortcode from a public Instagram Reel/Post URL.
// Accepts: instagram.com/reel/{code}/, /reels/{code}/, /p/{code}/, /tv/{code}/
// Returns null if the input doesn't match.
function extractInstagramShortcode(rawUrl) {
  if (!rawUrl || typeof rawUrl !== "string") return null;
  const m = rawUrl.match(/instagram\.com\/(?:reel|reels|p|tv)\/([A-Za-z0-9_-]{5,40})/i);
  return m ? m[1] : null;
}

// fetchInstagramReelViews — best-effort scrape of a public Reel page.
// The admin form treats this as an OPTIONAL auto-fill; the manually-typed
// instagram_views value is the source of truth. On failure we return
// { status: "scrape-failed" } and the caller leaves the prior value alone.
//
// Try priority: JSON-LD WatchAction interactionStatistic → inline JSON
// (video_view_count / play_count) → og:description meta. First hit wins.
// Cached 6h in KV under ig_reel_views:{code} since views move slowly.
async function fetchInstagramReelViews(env, reelUrl) {
  const code = extractInstagramShortcode(reelUrl);
  if (!code) return { status: "bad-url" };

  // KV cache hit
  if (env.SHINEL_AUDIT) {
    try {
      const cached = await env.SHINEL_AUDIT.get(`ig_reel_views:${code}`, "json");
      if (cached && Number.isFinite(cached.views) && cached.views > 0) {
        return { views: cached.views, status: "ok", cached: true };
      }
    } catch { /* ignore */ }
  }

  try {
    const resp = await fetch(`https://www.instagram.com/reel/${encodeURIComponent(code)}/`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html",
        "Accept-Language": "en-US,en;q=0.9"
      }
    });
    if (!resp.ok) return { status: "scrape-failed", reason: `http-${resp.status}` };

    const html = await resp.text();

    let views = 0;

    // 1) JSON-LD WatchAction (most stable).
    //    <script type="application/ld+json">{ ..., "interactionStatistic": [{ "interactionType": ".../WatchAction", "userInteractionCount": 12400 }] }</script>
    const ldMatches = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi) || [];
    for (const block of ldMatches) {
      const inner = block.replace(/<script[^>]*>/i, "").replace(/<\/script>/i, "").trim();
      try {
        const data = JSON.parse(inner);
        const arr = Array.isArray(data) ? data : [data];
        for (const node of arr) {
          const stats = node?.interactionStatistic;
          const list = Array.isArray(stats) ? stats : (stats ? [stats] : []);
          for (const s of list) {
            const type = String(s?.interactionType?.["@type"] || s?.interactionType || "");
            if (/WatchAction/i.test(type)) {
              const n = Number(s?.userInteractionCount);
              if (Number.isFinite(n) && n > views) views = n;
            }
          }
        }
      } catch { /* keep trying */ }
    }

    // 2) Inline JSON — Instagram embeds GraphQL payload with view counters.
    if (!views) {
      const fields = ["video_view_count", "play_count", "video_play_count"];
      for (const f of fields) {
        const re = new RegExp(`"${f}"\\s*:\\s*(\\d+)`, "i");
        const m = html.match(re);
        if (m) {
          const n = Number(m[1]);
          if (Number.isFinite(n) && n > views) views = n;
        }
      }
    }

    // 3) og:description (last resort, format varies).
    //    e.g. "12,400 likes, 230 comments - foo on instagram"
    //    Modern reel pages sometimes include "X views" or "X plays".
    if (!views) {
      const desc = (html.match(/<meta[^>]*property="og:description"[^>]*content="([^"]*)"/i) ||
                    html.match(/<meta[^>]*content="([^"]*)"[^>]*property="og:description"/i));
      if (desc && desc[1]) {
        const txt = desc[1];
        const m = txt.match(/([\d,.]+)\s*(?:views|plays)/i) ||
                  txt.match(/([\d.]+)\s*([KkMm])\s*(?:views|plays)/);
        if (m) {
          let raw = m[1].replace(/,/g, "");
          let n = parseFloat(raw);
          if (m[2]) {
            if (/k/i.test(m[2])) n *= 1000;
            else if (/m/i.test(m[2])) n *= 1_000_000;
          }
          if (Number.isFinite(n) && n > 0) views = Math.round(n);
        }
      }
    }

    if (!views) return { status: "scrape-failed", reason: "no-counter-found" };

    // Cache for 6h
    if (env.SHINEL_AUDIT) {
      try {
        await env.SHINEL_AUDIT.put(
          `ig_reel_views:${code}`,
          JSON.stringify({ views, at: Date.now() }),
          { expirationTtl: 6 * 60 * 60 }
        );
      } catch { /* non-fatal */ }
    }

    return { views, status: "ok" };
  } catch (e) {
    return { status: "scrape-failed", reason: e.message || "unknown" };
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


/* ============================== Pulse Sync ============================== */
/**
 * performClientSync
 * - Orchestrates deep sync for all creators (YouTube + Instagram)
 * - Can be called by manual trigger (fetch) or cron (scheduled)
 */
async function performClientSync(env, isForced = false, debug = false) {
  const lastSyncKey = "app:clients:last_sync_ts";
  const syncStateKey = "app:clients:sync_state";
  const lastSyncTs = Number(await env.SHINEL_AUDIT.get(lastSyncKey) || "0");
  const now = Date.now();
  const cooldown = 15 * 60 * 1000; // 15 mins

  if (!isForced && (now - lastSyncTs < cooldown)) {
    const remaining = Math.ceil((cooldown - (now - lastSyncTs)) / 60000);
    const err = new Error(`Sync cooldown active. Please wait ${remaining}m or use ?force=1`);
    err.status = 429;
    throw err;
  }

  // Best-effort in-progress lock. KV is eventually consistent so this isn't a strict
  // mutex, but it catches the common cron+manual collision. Cleared in the finally
  // at the bottom of this function so a thrown safety-check or YT quota error
  // doesn't strand the lock and brick all future cron runs.
  const existingLock = await env.SHINEL_AUDIT.get(syncStateKey, "json");
  if (existingLock && existingLock.status === "in_progress" && (now - Number(existingLock.startedAt || 0) < 10 * 60 * 1000)) {
    const err = new Error("Another sync is already in progress");
    err.status = 429;
    throw err;
  }
  await env.SHINEL_AUDIT.put(
    syncStateKey,
    JSON.stringify({ status: "in_progress", startedAt: now }),
    { expirationTtl: 15 * 60 }
  );

  // Wrap the rest in try/finally — anything below this line that throws must
  // still release the lock or the next cron tick will see "in_progress" and
  // bail. Past incidents: safety check at MIN_RETENTION_RATIO trips → throws
  // → lock stranded → pulse page goes stale for hours.
  try {

  const clients = await getClients(env);
  const existingStatsRaw = await env.SHINEL_AUDIT.get("app:clients:stats", "json") || [];
  const existingStatsArray = Array.isArray(existingStatsRaw) ? existingStatsRaw : (existingStatsRaw.stats || []);
  const existingStatsMap = new Map(existingStatsArray.map(s => [s.id, s]));

  const allStats = [];
  const pulseActivities = [];
  const channelMeta = {};
  const errors = [];
  let registryMutated = false;

  for (let i = 0; i < clients.length; i++) {
    const c = clients[i];
    let statsObj = null;
    let ytError = null;
    let igError = null;
    try {
      const ytIdentifier = c.youtubeId || c.handle;

      // 1. YouTube Stats
      if (ytIdentifier) {
        const result = await fetchYouTubeChannelInfo(env, ytIdentifier);
        if (result?.error) ytError = result.error;
        if (result && !result.error) {
          statsObj = { ...result, internalId: c.id };
          channelMeta[result.id] = { logo: result.logo, title: result.title };

          if (result.id && c.youtubeId !== result.id) {
            c.youtubeId = result.id;
            registryMutated = true;
            if (env.DB) {
              try {
                await env.DB.prepare("UPDATE clients SET youtube_id = ? WHERE id = ?").bind(result.id, c.id).run();
              } catch (e) { console.error("D1 Canonical ID Update Error:", e.message); }
            }
          }
          if (result.uploadsPlaylistId && c.uploadsPlaylistId !== result.uploadsPlaylistId) {
            c.uploadsPlaylistId = result.uploadsPlaylistId;
            registryMutated = true;
          }

          if (c.status !== "old") {
            const resultPulse = await fetchYouTubePulse(env, result.id, result.uploadsPlaylistId);
            const videos = resultPulse.items || [];
            if (resultPulse.error) ytError = resultPulse.error;

            const windowLimit = now - (24 * 60 * 60 * 1000);

            if (resultPulse.error || (videos.length === 0 && ytError)) {
              const oldPulseRaw = await env.SHINEL_AUDIT.get("app:clients:pulse", "json") || {};
              const oldPulseActivities = Array.isArray(oldPulseRaw.activities) ? oldPulseRaw.activities : [];
              oldPulseActivities.forEach(oa => {
                if (oa.channelId === result.id && oa.timestamp >= windowLimit) {
                  pulseActivities.push(oa);
                }
              });
            } else {
              for (const v of videos) {
                const ts = new Date(v.publishedAt).getTime();
                if (ts >= windowLimit) {
                  const act = {
                    id: `act-${v.id}-${ts}`,
                    clientName: result.title,
                    channelId: result.id,
                    title: v.title,
                    thumbnail: v.thumbnail,
                    url: `https://youtube.com/watch?v=${v.id}`,
                    type: "VIDEO",
                    timestamp: ts,
                    publishedAt: v.publishedAt
                  };
                  pulseActivities.push(act);
                  
                  // --- AUTO ARCHIVAL HOOK ---
                  // If video views > threshold (e.g., 100k for normal, 50k for hype shorts)
                  // For now, let's use a conservative 100k views for auto-archival
                  // We might need to fetch stats specifically if not available in pulse items
                  // Strategy 1 (playlistItems) doesn't always have views. Strategy 2 (RSS) doesn't have views.
                  // So we might need to skip auto-archival views check HERE unless we fetch snippet+stats.
                  // BUT, Pulse already has a concept of activity. Let's just archive EVERY video that hits Pulse
                  // OR better: ARCHIVE it if it's new and has high potential.
                  
                  if (env.DB) {
                    try {
                      await env.DB.prepare(
                        "INSERT OR IGNORE INTO pulse_activities (id, client_id, youtube_video_id, title, thumbnail, url, published_at, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
                      ).bind(act.id, result.id, v.id, v.title, v.thumbnail, act.url, v.publishedAt, ts).run();
                      
                      // Auto-Archive to Media Hub if it looks like a "Hype" video
                      // We'll tag it as 'AUTO_PULSE'
                      // Note: Status is pending_mirror for the Node backend to pick up
                      await env.DB.prepare(
                        "INSERT OR IGNORE INTO media_library (id, source_url, title, type, category, status, channel_title, thumbnail_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
                      ).bind(
                        crypto.randomUUID(), act.url, act.title, 'video', 'AUTO_PULSE', 'pending_mirror', act.clientName, act.thumbnail
                      ).run();

                    } catch (e) { console.error("D1 Pulse Insert Error:", e.message); }
                  }
                }
              }
            }
          }
        } else {
          const old = existingStatsMap.get(c.id) || existingStatsMap.get(c.youtubeId);
          if (old) {
            statsObj = { ...old, internalId: c.id, _stale: true };
            channelMeta[old.id] = { logo: old.logo, title: old.title };
          }
          const oldPulseRaw = await env.SHINEL_AUDIT.get("app:clients:pulse", "json") || {};
          const oldPulseActivities = Array.isArray(oldPulseRaw.activities) ? oldPulseRaw.activities : [];
          const windowLimit = now - (24 * 60 * 60 * 1000);
          oldPulseActivities.forEach(oa => {
            if (oa.channelId === (c.youtubeId || c.id) && oa.timestamp >= windowLimit) {
              pulseActivities.push(oa);
            }
          });
        }
      } else {
        const old = existingStatsMap.get(c.id) || existingStatsMap.get(c.youtubeId);
        if (old) {
          statsObj = { ...old, internalId: c.id, _stale: true };
          channelMeta[old.id] = { logo: old.logo, title: old.title };
        }
      }

      // 2. Instagram Stats
      if (c.instagramHandle || c.instagram_handle) {
        const igHandle = c.instagramHandle || c.instagram_handle;
        const igResult = await fetchInstagramInfo(env, igHandle);
        if (igResult?.error) igError = igResult.error;
        if (igResult && !igResult.error) {
          if (!statsObj) {
            statsObj = {
              id: c.youtubeId || igResult.handle,
              internalId: c.id,
              title: c.name,
              logo: igResult.logo,
              subscribers: 0, viewCount: 0, videoCount: 0
            };
          }
          statsObj.instagramHandle = igResult.handle;
          statsObj.instagramFollowers = igResult.followers;
          statsObj.instagramLogo = igResult.logo;
          if (!statsObj.logo) statsObj.logo = igResult.logo;
        }
      }

      // 3. Manual Overrides
      if (statsObj || c.subscribers || c.instagramFollowers || c.instagram_followers) {
        if (!statsObj) {
          statsObj = {
            id: c.youtubeId || c.instagramHandle || c.instagram_handle || c.id,
            internalId: c.id, title: c.name, logo: c.instagramLogo || c.instagram_logo || null,
            subscribers: 0, viewCount: 0, videoCount: 0
          };
        }
        if (c.subscribers != null && c.subscribers > 0) statsObj.subscribers = Number(c.subscribers);
        if ((c.instagramFollowers != null && c.instagramFollowers > 0) || (c.instagram_followers != null && c.instagram_followers > 0)) {
          statsObj.instagramFollowers = Number(c.instagramFollowers || c.instagram_followers);
        }
        if (c.instagramLogo || c.instagram_logo) statsObj.logo = c.instagramLogo || c.instagram_logo;
      }

      if (statsObj) {
        allStats.push(statsObj);
      } else {
        const parts = [];
        if (ytIdentifier && ytError) parts.push(`YT: ${ytError}`);
        else if (ytIdentifier) parts.push("YT: Failed");
        if ((c.instagramHandle || c.instagram_handle) && igError) parts.push(`IG: ${igError}`);
        const err = parts.length > 0 ? parts.join(", ") : "No successful fetches";
        errors.push({ id: c.id, name: c.name, error: err });
        const old = existingStatsMap.get(c.id) || existingStatsMap.get(c.youtubeId);
        if (old) {
          allStats.push({ ...old, _stale: true });
          if (old.id) channelMeta[old.id] = { logo: old.logo, title: old.title };
        }
      }
    } catch (err) {
      console.error(`Sync error for ${c.name}:`, err.message);
      errors.push({ id: c.id, name: c.name, error: err.message });
      const old = existingStatsMap.get(c.id) || existingStatsMap.get(c.youtubeId);
      if (old) {
        allStats.push({ ...old, _stale: true });
        if (old.id) channelMeta[old.id] = { logo: old.logo, title: old.title };
      }
    }
  }

  pulseActivities.sort((a, b) => b.timestamp - a.timestamp);

  // Safety check — only trip when we'd be writing back fewer than 80%
  // of the *current registry size* (not the last sync's size, which
  // can drift). Compare against clients.length so adding new clients
  // doesn't artificially trip the threshold. The loop already backfills
  // stale stats for failed fetches, so allStats should normally match
  // clients.length 1:1.
  const MIN_RETENTION_RATIO = 0.8;
  if (allStats.length < (clients.length * MIN_RETENTION_RATIO) && !isForced) {
    // Soft warning — log + audit but don't throw. Stranded locks from
    // a thrown safety check were causing the pulse page to go stale
    // for hours at a time.
    const errMsg = `safety-check: low retention (${allStats.length}/${clients.length}) — keeping last good snapshot`;
    console.warn("performClientSync:", errMsg);
    errors.push({ id: "_safety", name: "safety", error: errMsg });
    // Skip the writes that would clobber good data. Pulse activities
    // we DO write since they only INSERT OR IGNORE — safe additive.
    await env.SHINEL_AUDIT.put(lastSyncKey, String(now));
    return { ok: true, synced: allStats.length, total: clients.length, errors, ts: now, skipped: true };
  }

  if (registryMutated) {
    await putJsonGuarded(env.SHINEL_AUDIT, "app:clients:registry", clients);
  }

  await putJsonGuarded(env.SHINEL_AUDIT, "app:clients:stats", allStats);
  await putJsonGuarded(env.SHINEL_AUDIT, "app:clients:stats:backup", allStats);

  const historicalRaw = await env.SHINEL_AUDIT.get("app:clients:stats:historical", "json") || {};
  const historical = (typeof historicalRaw === 'object' && historicalRaw !== null) ? historicalRaw : {};
  allStats.forEach(s => {
    if (s.internalId) historical[s.internalId] = { ...s, _last_seen: now };
  });
  await putJsonGuarded(env.SHINEL_AUDIT, "app:clients:stats:historical", historical);

  await putJsonGuarded(env.SHINEL_AUDIT, "app:clients:pulse", {
    activities: pulseActivities,
    meta: channelMeta,
    ts: now,
    quotaExceeded: (await getYoutubeKey(env)) === null
  });
  await putJsonGuarded(env.SHINEL_AUDIT, "app:clients:sync_errors", { errors, ts: now });
  await env.SHINEL_AUDIT.put(lastSyncKey, String(now));
  // Clear the in-progress lock established at the top of this function.
  await env.SHINEL_AUDIT.put(syncStateKey, JSON.stringify({ status: "idle", finishedAt: now }), { expirationTtl: 24 * 3600 });

  // --- ADDITIONAL SNAPSHOTS & AUDITS ---
  const dateStr = new Date(now).toISOString().split('T')[0];
  const historyKey = `history:${dateStr}`;
  const historySnapshot = {
    ts: now,
    stats: allStats.map(s => ({
      id: s.id || s.youtubeId,
      subscribers: Number(s.subscribers || 0),
      viewCount: Number(s.viewCount || 0)
    }))
  };
  await env.SHINEL_AUDIT.put(historyKey, JSON.stringify(historySnapshot), { expirationTtl: 35 * 24 * 60 * 60 });

  const lastWeeklyAudit = await env.SHINEL_AUDIT.get("app:audits:weekly_last_ts");
  const weekInMs = 7 * 24 * 60 * 60 * 1000;
  if (!lastWeeklyAudit || (now - Number(lastWeeklyAudit)) > weekInMs) {
    const totalSubs = allStats.reduce((sum, s) => sum + (Number(s.subscribers) || 0), 0);
    const totalViews = allStats.reduce((sum, s) => sum + (Number(s.viewCount) || 0), 0);
    const totalIG = allStats.reduce((sum, s) => sum + (Number(s.instagramFollowers) || 0), 0);
    const totalReach = totalSubs + totalIG;
    const activeCreators = clients.filter(c => c.status !== 'old').length;

    const auditSummary = {
      ts: now,
      date: new Date(now).toISOString(),
      totalCreators: clients.length, activeCreators,
      totalSubscribers: totalSubs, 
      totalInstagramFollowers: totalIG,
      totalReach: totalReach,
      totalViews: totalViews,
      syncErrors: allStats.filter(s => s._stale).length
    };

    const auditHistory = await env.SHINEL_AUDIT.get("app:audits:weekly", "json") || [];
    auditHistory.unshift(auditSummary);
    await env.SHINEL_AUDIT.put("app:audits:weekly", JSON.stringify(auditHistory.slice(0, 10)));
    await env.SHINEL_AUDIT.put("app:audits:weekly_last_ts", String(now));
  }

    const responseData = {
      ok: true, synced: allStats.length, total: clients.length, errors, ts: now
    };

    if (debug) {
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

    return responseData;
  } finally {
    // Always release the lock — even if the safety check threw, even if YT
    // quota threw, even if D1 timed out. Mark as "errored" rather than
    // "idle" so the next observer can tell we crashed mid-sync.
    try {
      const existing = await env.SHINEL_AUDIT.get(syncStateKey, "json");
      const wasInProgress = existing && existing.status === "in_progress";
      await env.SHINEL_AUDIT.put(
        syncStateKey,
        JSON.stringify({
          status: wasInProgress ? "errored" : "idle",
          finishedAt: Date.now(),
        }),
        { expirationTtl: 24 * 3600 }
      );
    } catch (cleanupErr) {
      console.error("performClientSync: lock release failed:", cleanupErr?.message || cleanupErr);
    }
  }
}

/* ================================= worker ================================= */
// Worker DSN — public, safe to commit (Sentry DSNs are write-only by design).
const SENTRY_WORKER_DSN = "https://0e7298209c36b9d98569b265d3ff6a55@o4511286896951296.ingest.de.sentry.io/4511286968123472";

// Same noise-filter list as the frontend so we don't pay for false positives.
const SENTRY_IGNORE = [
  /No refresh token/i,           // expected on logged-out reload
  /Token expired/i,              // routine; happens every 30m + tab idle
  /Token revoked/i,              // expected after logout
  /Forbidden/i,                  // 403 — design-level, not a bug
  /Missing token/i,              // unauthed traffic
  /rate limited/i,               // by-design
  /Backend returned non-JSON/i,  // captions backend offline
];

const handler = {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("origin") || "";
    const allowedOrigins = (env.ALLOWED_ORIGINS || "")
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
        const isForced = url.searchParams.has("force");
        const isDebug = url.searchParams.has("debug");
        const result = await performClientSync(env, isForced, isDebug);
        return json(result, 200, cors);
      } catch (e) {
        const status = e.status || 500;
        const data = e.data || {};
        return json({ error: e.message || "Sync failed", ...data }, status, cors);
      }
    }

    /* -------------------------- YouTube Captions (proxy) -------------------------- */
    // YouTube's 2025–2026 anti-bot makes the pure-HTTP path unreliable from CF
    // Worker IPs (WEB/WEB_EMBEDDED return UNPLAYABLE; IOS requires PoToken). The
    // yt-dlp fallback in backend/server.js is the only reliable extractor, so we
    // proxy to whatever host CAPTIONS_API_URL points at (Koyeb in this setup).
    if (url.pathname === "/api/youtube-captions" && request.method === "POST") {
      try {
        const backendUrl = env.CAPTIONS_API_URL;
        if (!backendUrl) {
          return json({ error: "Captions backend not configured (CAPTIONS_API_URL)" }, 501, cors);
        }
        const contentLen = Number(request.headers.get("content-length") || 0);
        if (contentLen > 8 * 1024) return json({ error: "Payload too large" }, 413, cors);

        // Per-IP rate limit — creator tool is public-facing but we don't want
        // the worker URL abused as an open proxy against the backend quota.
        // 10 calls / 15 min is plenty for genuine tool use.
        if (await isRateLimited(env, ip, 900, 10, "captions")) {
          return json({ error: "Too many requests. Try again in a few minutes." }, 429, cors);
        }

        const body = await request.clone().json().catch((e) => {
          console.warn("POST /api/youtube-captions: bad json body:", e?.message || e);
          return null;
        });
        if (!body || typeof body !== "object") {
          return json({ error: "Invalid body" }, 400, cors);
        }

        const headers = { "Content-Type": "application/json" };
        if (env.CAPTIONS_SHARED_SECRET) {
          headers["X-Shinel-Captions-Secret"] = env.CAPTIONS_SHARED_SECRET;
        }
        const res = await fetch(`${backendUrl.replace(/\/+$/, "")}/api/youtube-captions`, {
          method: "POST",
          headers,
          body: JSON.stringify(body),
        });
        const data = await res.json().catch(() => ({ error: "Backend returned non-JSON" }));
        return json(data, res.status, cors);
      } catch (e) {
        return json({ error: "Captions proxy failed: " + e.message }, 502, cors);
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

        const body = await request.json().catch((e) => { console.warn(`bad json body @ ${url.pathname}:`, e?.message || e); return {}; });
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

        // Per-device session tracking. We hook the refresh JTI because
        // it's the long-lived one; access tokens rotate every 30m.
        try {
          const refreshPayload = await verifyJWT(refresh, secret).catch(() => null);
          if (refreshPayload?.jti) {
            await trackNewSession(env, user.email, refreshPayload.jti, request);
          }
        } catch (e) {
          console.warn("trackNewSession failed (login):", e?.message || e);
        }

        // SameSite=None (+ Secure + HttpOnly) so the cookie rides cross-site
        // POSTs from the frontend at shinelstudios.in to this worker at
        // *.workers.dev. Lax silently blocked these requests; reload logged
        // users out because /auth/refresh arrived with no cookie.
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
        console.error("POST /auth/login failed:", e?.stack || e?.message || e);
        return json({ error: e?.message || "Login error" }, 500, cors);
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
        // Reject already-revoked refresh tokens.
        if (await isJtiRevoked(env, payload.jti)) {
          throw Object.assign(new Error("Refresh token revoked"), { status: 401 });
        }
        // Rotate: revoke the old refresh jti before issuing the new pair.
        const oldExp = Number(payload.exp || 0);
        const remaining = oldExp ? Math.max(60, oldExp - Math.floor(Date.now() / 1000)) : 7 * 24 * 3600;
        if (payload.jti) await revokeJti(env, payload.jti, remaining);
        const oldJti = payload.jti;

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

        // Update the device's session row with the new refresh JTI so the
        // device record survives token rotation (createdAt preserved).
        try {
          const newPayload = await verifyJWT(newRefresh, secret).catch(() => null);
          if (newPayload?.jti && payload.email) {
            await rotateSessionJti(env, payload.email, oldJti, newPayload.jti);
          }
        } catch (e) {
          console.warn("rotateSessionJti failed:", e?.message || e);
        }

        const headers = { ...cors, "content-type": "application/json", "set-cookie": cookie };
        return new Response(JSON.stringify({ token: newAccess, role: payload.role }), {
          status: 200,
          headers,
        });
      } catch (err) {
        console.error("Refresh Error:", err.message);
        const clear = delCookie("ss_refresh", {
          httpOnly: true,
          secure: true,
          sameSite: "None",
          path: "/",
        });
        const headers = { ...cors, "content-type": "application/json", "set-cookie": clear };
        return new Response(JSON.stringify({ error: "Invalid refresh session", details: err.message }), {
          status: 401,
          headers,
        });
      }
    }

    /* ----------------------------- POST /auth/logout ----------------------------- */
    if (url.pathname === "/auth/logout" && request.method === "POST") {
      // Best-effort server-side revocation of both the bearer access token (header)
      // and the refresh token (cookie). Silently ignored if tokens are absent/invalid.
      try {
        const accessTok = readBearerToken(request);
        if (accessTok) {
          const ap = await verifyJWT(accessTok, secret).catch(() => null);
          if (ap && ap.jti) {
            const ttl = Number(ap.exp || 0) - Math.floor(Date.now() / 1000);
            await revokeJti(env, ap.jti, Math.max(60, ttl || 30 * 60));
          }
        }
        const cookies = request.headers.get("cookie") || "";
        const rm = cookies.match(/(?:^|;\s*)ss_refresh=([^;]+)/);
        if (rm) {
          const rTok = decodeURIComponent(rm[1]);
          const rp = await verifyJWT(rTok, secret).catch(() => null);
          if (rp && rp.jti) {
            const ttl = Number(rp.exp || 0) - Math.floor(Date.now() / 1000);
            await revokeJti(env, rp.jti, Math.max(60, ttl || 7 * 24 * 3600));
            // Drop this device's session row.
            if (rp.email) await removeSessionByJti(env, rp.email, rp.jti);
          }
        }
      } catch { /* best-effort: never fail logout */ }

      // Must match the SameSite=None used on set for the clear to apply.
      const clear = delCookie("ss_refresh", {
        httpOnly: true,
        secure: true,
        sameSite: "None",
        path: "/",
      });
      const headers = { ...cors, "content-type": "application/json", "set-cookie": clear };
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
    }

    /* ----------------------------- GET /auth/sessions -----------------------------
     * Returns the active per-device sessions for the logged-in user.
     * Each entry: { jti, label, ipHash, createdAt, lastSeenAt, current }.
     * `current` is true if the entry's jti is bound to the request's
     * refresh cookie — that's the device hitting this endpoint right now.
     */
    if (url.pathname === "/auth/sessions" && request.method === "GET") {
      try {
        const me = await requireAuthOrThrow(request, secret, env);
        const list = await getSessions(env, me.email);

        // Find the current device by reading the refresh cookie's jti.
        let currentJti = null;
        const cookies = request.headers.get("cookie") || "";
        const m = cookies.match(/(?:^|;\s*)ss_refresh=([^;]+)/);
        if (m) {
          const rp = await verifyJWT(decodeURIComponent(m[1]), secret).catch(() => null);
          currentJti = rp?.jti || null;
        }

        const sessions = list
          .map((s) => ({ ...s, current: s.jti === currentJti }))
          .sort((a, b) => (b.lastSeenAt || 0) - (a.lastSeenAt || 0));
        return json({ sessions, max: MAX_SESSIONS_PER_USER }, 200, cors);
      } catch (e) {
        return json({ error: e.message || "Failed" }, e.status || 500, cors);
      }
    }

    /* --------------------------- POST /auth/sessions/revoke -----------------------
     * Revoke a specific session. Body: { jti }. The user can only revoke
     * their own sessions — we look up the JTI inside the user's session
     * list and reject if it isn't there. Adds the JTI to the global
     * denylist so the device's bearer + refresh stop working immediately
     * (next /auth/refresh from that device returns 401 + clears the
     * cookie).
     *
     * Note: requires JWT_REVOCATION_ENABLED=1 in worker secrets to
     * actually evict in-flight access tokens. The session list itself is
     * always pruned regardless.
     */
    if (url.pathname === "/auth/sessions/revoke" && request.method === "POST") {
      try {
        const me = await requireAuthOrThrow(request, secret, env);
        const body = await request.json().catch((e) => { console.warn(`bad json body @ ${url.pathname}:`, e?.message || e); return {}; });
        const targetJti = String(body?.jti || "").trim();
        if (!targetJti) return json({ error: "jti required" }, 400, cors);

        const list = await getSessions(env, me.email);
        const target = list.find((s) => s.jti === targetJti);
        if (!target) return json({ error: "Session not found" }, 404, cors);

        // Revoke the JTI globally (refresh-token TTL is the cap).
        await revokeJti(env, targetJti, 7 * 24 * 3600);
        // Drop from the session list.
        await saveSessions(env, me.email, list.filter((s) => s.jti !== targetJti));

        return json({ ok: true, revoked: targetJti }, 200, cors);
      } catch (e) {
        return json({ error: e.message || "Failed" }, e.status || 500, cors);
      }
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
      try {
        // Public-safe subset only (banners, branding, feature flags).
        // Admin UIs must call /config/admin for the full object.
        const config = await env.SHINEL_AUDIT.get("app:config:global", "json") || {};
        return json({ config: sanitizeConfigForPublic(config) }, 200, cors);
      } catch (e) {
        return json({ error: e.message || "Fetch failed" }, 500, cors);
      }
    }

    // GET /config/admin - Full config (admin-only)
    if (url.pathname === "/config/admin" && request.method === "GET") {
      try {
        await requireAdminOrThrow(request, secret);
        const config = await env.SHINEL_AUDIT.get("app:config:global", "json") || {};
        return json({ config }, 200, cors);
      } catch (e) {
        return json({ error: e.message || "Fetch failed" }, e.status || 500, cors);
      }
    }

    if (url.pathname === "/config" && request.method === "PUT") {
      try {
        await requireAdminOrThrow(request, secret);
        const contentLen = Number(request.headers.get("content-length") || 0);
        if (contentLen > 64 * 1024) return json({ error: "Payload too large" }, 413, cors);
        const updates = await request.json().catch((e) => { console.warn(`bad json body @ ${url.pathname}:`, e?.message || e); return {}; });
        await env.SHINEL_AUDIT.put("app:config:global", JSON.stringify(updates));
        return json({ ok: true, config: updates }, 200, cors);
      } catch (e) {
        return json({ error: e.message || "Update failed" }, e.status || 500, cors);
      }
    }

    /* =============================== /clients ============================== */
    // GET /clients - Public-safe list (sanitized). Internal UIs must call /clients/internal.
    if (url.pathname === "/clients" && request.method === "GET") {
      const list = await getClients(env);
      const publicList = Array.isArray(list) ? list.map(sanitizeClientForPublic) : [];
      return json({ clients: publicList }, 200, cors);
    }

    // GET /clients/internal - Full client objects (team/admin only)
    if (url.pathname === "/clients/internal" && request.method === "GET") {
      try {
        await requireTeamOrThrow(request, secret);
        const list = await getClients(env);
        return json({ clients: list }, 200, cors);
      } catch (e) {
        return json({ error: e.message || "Fetch failed" }, e.status || 500, cors);
      }
    }

    /* =============================== /team + /profiles (team portfolio redesign) =============================== */

    // GET /team - Public directory of team members (editors/artists/team roles).
    // Only returns members with profilePublic !== false. Never leaks email/password.
    if (url.pathname === "/team" && request.method === "GET") {
      try {
        const list = [];
        let cursor = undefined;
        for (let i = 0; i < 50; i++) {
          let page;
          try {
            page = await env.SHINEL_USERS.list(cursor ? { prefix: "user:", cursor } : { prefix: "user:" });
          } catch (listErr) {
            console.error("GET /team SHINEL_USERS.list failed:", listErr?.message || listErr);
            break;
          }
          const { keys = [], list_complete = true, cursor: nextCursor } = page || {};
          for (const k of keys) {
            let u;
            try {
              u = await env.SHINEL_USERS.get(k.name, "json");
            } catch (getErr) {
              console.warn(`GET /team skipping bad record ${k.name}:`, getErr?.message || getErr);
              continue;
            }
            if (!u || typeof u !== "object") continue;
            if (u.profilePublic === false) continue;

            const role = String(u.role || "").toLowerCase();
            const roles = role.split(",").map(s => s.trim());
            // Show members on the team page (editors, artists, team, admin). Skip pure client accounts.
            const isTeam = roles.some(r => ["editor", "artist", "team", "admin"].includes(r));
            if (!isTeam) continue;

            list.push({
              slug: u.slug || "",
              email: u.email,
              firstName: u.firstName || "",
              lastName: u.lastName || "",
              headline: u.headline || "",
              avatarUrl: u.avatarUrl || "",
              skills: u.skills || "",
              role: u.role || "team",
              highlightVideoId: u.highlightVideoId || "",
            });
          }
          if (list_complete || !nextCursor) break;
          cursor = nextCursor;
        }
        // Prioritize members that have a slug (complete profile) first.
        list.sort((a, b) => (b.slug ? 1 : 0) - (a.slug ? 1 : 0));
        return json({ team: list }, 200, cors);
      } catch (e) {
        console.error("GET /team failed:", e?.stack || e?.message || e);
        return json({ team: [] }, 200, cors);
      }
    }

    // GET /profiles/:slug - Public profile + attributed work.
    // Looks up by slug first, falls back to matching by email (pre-slug legacy users).
    if (url.pathname.startsWith("/profiles/") && request.method === "GET" && !url.pathname.startsWith("/profiles/me")) {
      try {
        const slug = decodeURIComponent(url.pathname.split("/")[2] || "").toLowerCase();
        if (!slug) return json({ error: "slug required" }, 400, cors);

        // Find user by slug (scan KV — volume is small: <100 users).
        // Bad records (malformed JSON, missing email) must not crash the scan;
        // we just skip them and keep looking.
        let found = null;
        let cursor = undefined;
        // Hard cap iterations defensively — prevents an infinite loop if the
        // KV pager ever returns a truthy cursor with list_complete:true.
        for (let i = 0; i < 50; i++) {
          let page;
          try {
            page = await env.SHINEL_USERS.list(cursor ? { prefix: "user:", cursor } : { prefix: "user:" });
          } catch (listErr) {
            console.error("SHINEL_USERS.list failed:", listErr?.message || listErr);
            break;
          }
          const { keys = [], list_complete = true, cursor: nextCursor } = page || {};
          for (const k of keys) {
            let u;
            try {
              u = await env.SHINEL_USERS.get(k.name, "json");
            } catch (getErr) {
              console.warn(`Skipping bad user record ${k.name}:`, getErr?.message || getErr);
              continue;
            }
            if (!u || typeof u !== "object") continue;
            const uSlug = String(u.slug || "").toLowerCase();
            const uEmail = String(u.email || "").toLowerCase();
            if (uSlug === slug || uEmail === slug || (uEmail && uEmail.split("@")[0] === slug)) {
              found = u;
              break;
            }
          }
          if (found || list_complete || !nextCursor) break;
          cursor = nextCursor;
        }

        if (!found) return json({ error: "Profile not found" }, 404, cors);
        if (found.profilePublic === false) return json({ error: "Profile not found" }, 404, cors);

        // Sanitize — never expose password hash, revocation flags, etc.
        const profile = {
          slug: found.slug || "",
          email: found.email,
          firstName: found.firstName || "",
          lastName: found.lastName || "",
          headline: found.headline || "",
          bio: found.bio || "",
          avatarUrl: found.avatarUrl || "",
          showreelUrl: found.showreelUrl || "",
          skills: found.skills || "",
          experience: found.experience || "",
          role: found.role || "team",
          services: Array.isArray(found.services) ? found.services : [],
          calendlyUrl: found.calendlyUrl || "",
          whatsappNumber: found.whatsappNumber || "",
          highlightVideoId: found.highlightVideoId || "",
          socials: {
            instagram: found.socials?.instagram || found.instagram || "",
            youtube: found.socials?.youtube || found.youtube || "",
            linkedin: found.socials?.linkedin || found.linkedin || "",
            twitter: found.socials?.twitter || found.twitter || "",
            behance: found.socials?.behance || "",
            dribbble: found.socials?.dribbble || "",
            website: found.socials?.website || found.website || "",
          },
        };

        return json({ profile }, 200, cors);
      } catch (e) {
        console.error("GET /profiles/:slug failed:", e?.stack || e?.message || e);
        // Treat any internal throw as "profile not found" to the client.
        // A real error is logged; the user shouldn't get a scary 500 for this
        // specific endpoint where 404 is the honest answer for most failures.
        return json({ error: "Profile not found" }, 404, cors);
      }
    }

    // PUT /profiles/me - Authenticated self-edit.
    // Allowlist of editable fields prevents privilege escalation.
    if (url.pathname === "/profiles/me" && request.method === "PUT") {
      try {
        const payload = await verifyJwtOr401(readBearerToken(request), secret);
        if (env && await isJtiRevoked(env, payload.jti)) {
          throw Object.assign(new Error("Token revoked"), { status: 401 });
        }
        const email = String(payload.email || "").trim().toLowerCase();
        if (!email) throw Object.assign(new Error("No email in token"), { status: 401 });

        const contentLen = Number(request.headers.get("content-length") || 0);
        if (contentLen > 16 * 1024) return json({ error: "Payload too large" }, 413, cors);
        const body = await request.json().catch((e) => { console.warn(`bad json body @ ${url.pathname}:`, e?.message || e); return {}; });

        // Strict allowlist — never accept role, email, passwordHash, slug from self-edit.
        const allowed = [
          "firstName", "lastName", "headline", "bio", "avatarUrl",
          "showreelUrl", "skills", "experience", "services",
          "calendlyUrl", "whatsappNumber", "profilePublic",
          "highlightVideoId", "socials",
        ];

        const key = `user:${email}`;
        const raw = await env.SHINEL_USERS.get(key);
        if (!raw) return json({ error: "User not found" }, 404, cors);
        const user = JSON.parse(raw);

        const merged = { ...user };
        for (const k of allowed) {
          if (!(k in body)) continue;
          let v = body[k];
          if (typeof v === "string") v = v.slice(0, 4000);
          if (k === "services" && !Array.isArray(v)) continue;
          if (k === "socials") {
            if (v && typeof v === "object") {
              const socKeys = ["instagram", "youtube", "linkedin", "twitter", "behance", "dribbble", "website"];
              const clean = {};
              for (const sk of socKeys) {
                if (typeof v[sk] === "string") clean[sk] = v[sk].slice(0, 300);
              }
              merged.socials = clean;
            }
            continue;
          }
          if (k === "profilePublic") { merged[k] = !!v; continue; }
          merged[k] = v;
        }

        await env.SHINEL_USERS.put(key, JSON.stringify(merged));

        // Audit log the self-write — admin can see who edited when
        try {
          const auditKey = `audit:profile:${new Date().toISOString()}:${email}`;
          await env.SHINEL_AUDIT.put(auditKey, JSON.stringify({ email, ts: Date.now(), ip: request.headers.get("cf-connecting-ip") || "" }), { expirationTtl: 60 * 60 * 24 * 30 });
        } catch { /* best-effort */ }

        return json({ ok: true }, 200, cors);
      } catch (e) {
        return json({ error: e.message || "Update failed" }, e.status || 500, cors);
      }
    }

    // PUT /profiles/me/work-visibility - Flip isVisibleOnPersonal on a work row.
    // Only flips rows attributed to the caller (slug OR email match). Never touches rows attributed to others.
    if (url.pathname === "/profiles/me/work-visibility" && request.method === "PUT") {
      try {
        const payload = await verifyJwtOr401(readBearerToken(request), secret);
        if (env && await isJtiRevoked(env, payload.jti)) {
          throw Object.assign(new Error("Token revoked"), { status: 401 });
        }
        const email = String(payload.email || "").trim().toLowerCase();
        if (!email) throw Object.assign(new Error("No email in token"), { status: 401 });

        const body = await request.json().catch((e) => { console.warn(`bad json body @ ${url.pathname}:`, e?.message || e); return {}; });
        const type = String(body.type || "").toLowerCase();
        const id = String(body.id || "").trim();
        const visible = !!body.visible;

        if (!["video", "thumbnail"].includes(type)) return json({ error: "type must be video|thumbnail" }, 400, cors);
        if (!id) return json({ error: "id required" }, 400, cors);
        if (!env.DB) return json({ error: "DB unavailable" }, 503, cors);

        // Resolve caller's slug for dual-match
        const userRaw = await env.SHINEL_USERS.get(`user:${email}`);
        const user = userRaw ? JSON.parse(userRaw) : null;
        const slug = String(user?.slug || "").toLowerCase();

        const table = type === "video" ? "inventory_videos" : "inventory_thumbnails";

        // Verify attribution before flipping (defense-in-depth vs forged body)
        const row = await env.DB.prepare(`SELECT attributed_to FROM ${table} WHERE id = ?`).bind(id).first();
        if (!row) return json({ error: "Work not found" }, 404, cors);
        const attrib = String(row.attributed_to || "").toLowerCase();
        if (attrib !== email && (!slug || attrib !== slug)) {
          return json({ error: "You can only toggle visibility on your own work" }, 403, cors);
        }

        await env.DB.prepare(`UPDATE ${table} SET is_visible_on_personal = ? WHERE id = ?`).bind(visible ? 1 : 0, id).run();
        return json({ ok: true, id, visible }, 200, cors);
      } catch (e) {
        return json({ error: e.message || "Update failed" }, e.status || 500, cors);
      }
    }

    // ─────────────────────────────────────────────────────────────────
    // PHASE 2 · TODO — endpoints to land in Phase 2 of the redesign:
    //   GET/POST/PUT/DELETE /testimonials       — KV app:testimonials:list
    //   GET/POST/PUT/DELETE /case-studies       — D1 case_studies table
    //   POST /api/metrics/pageview              — KV counter metrics:pv:<d>:<p>
    //   POST /tools/channel-audit               — scored channel analysis
    // See CLAUDE.md "Phase 2 roadmap" for scope and column definitions.
    // ─────────────────────────────────────────────────────────────────

    // GET /clients/pulse - Activity feed
    if (url.pathname === "/clients/pulse" && request.method === "GET") {
      let feed = { activities: [], meta: {}, ts: Date.now() };

      // 1. Try D1 (Source of Truth for activities)
      if (env.DB) {
        try {
          const { results: activities } = await env.DB.prepare(
            "SELECT p.*, c.name as clientName FROM pulse_activities p JOIN clients c ON p.client_id = c.youtube_id WHERE COALESCE(c.status, 'active') != 'old' ORDER BY p.timestamp DESC LIMIT 50"
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

      // Ensure quotaExceeded is up to date if feed is present
      if (feed && !feed.quotaExceeded) {
        feed.quotaExceeded = (await getYoutubeKey(env)) === null;
      }

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

    /* =============================== /clients Registry =============================== */
    // CRITICAL DATA RULE: Creators/Youtubers added to this registry must NEVER be lost.
    // They should only be removed if EXPLICITLY deleted by an admin action.
    // Sync processes (cron/manual) must never truncate the list or remove valid entries.

    // POST /clients - Add a new creator to the registry
    if (url.pathname === "/clients" && request.method === "POST") {
      try {
        await requireTeamOrThrow(request, secret);
        const body = await request.json().catch((e) => { console.warn(`bad json body @ ${url.pathname}:`, e?.message || e); return {}; });
        const now = Date.now();
        const id = crypto.randomUUID();
        const list = await env.SHINEL_AUDIT.get("app:clients:registry", "json") || [];

        const row = {
          id,
          name: String(body.name),
          youtubeId: String(body.youtubeId || ""),
          handle: String(body.handle || ""),
          instagramHandle: String(body.instagramHandle || ""),
          category: String(body.category || "Vlogger"),
          status: String(body.status || "active"),
          subscribers: Number(body.subscribers || 0),
          instagramFollowers: Number(body.instagramFollowers || 0),
          instagramLogo: String(body.instagramLogo || ""),
          dateAdded: now,
          lastUpdated: now
        };

        list.push(row);
        await putJsonGuarded(env.SHINEL_AUDIT, "app:clients:registry", list);

        // ALSO D1
        if (env.DB) {
          try {
            await env.DB.prepare(
              "INSERT INTO clients (id, name, youtube_id, handle, instagram_handle, category, status, subscribers, instagram_followers, instagram_logo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
            ).bind(id, row.name, row.youtubeId, row.handle, row.instagramHandle, row.category, row.status, row.subscribers, row.instagramFollowers, row.instagramLogo).run();
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
        const updates = await request.json().catch((e) => { console.warn(`bad json body @ ${url.pathname}:`, e?.message || e); return {}; });

        const list = await env.SHINEL_AUDIT.get("app:clients:registry", "json") || [];
        const idx = list.findIndex((c) => c.id === id);
        if (idx < 0) return json({ error: "Not found" }, 404, cors);

        const now = Date.now();
        const merged = { ...list[idx], ...updates, lastUpdated: now };
        list[idx] = merged;

        await putJsonGuarded(env.SHINEL_AUDIT, "app:clients:registry", list);

        // ALSO D1
        if (env.DB) {
          try {
            await env.DB.prepare(
              "UPDATE clients SET name=?, youtube_id=?, handle=?, instagram_handle=?, category=?, status=?, subscribers=?, instagram_followers=?, instagram_logo=? WHERE id=?"
            ).bind(merged.name, merged.youtubeId, merged.handle, merged.instagramHandle || merged.instagram_handle, merged.category, merged.status || 'active', merged.subscribers || 0, merged.instagramFollowers || 0, merged.instagramLogo || "", id).run();
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
          await putJsonGuarded(env.SHINEL_AUDIT, "app:clients:registry", list);
        }

        // ALSO D1 (Primary Registry)
        if (env.DB) {
          try {
            await env.DB.prepare("DELETE FROM clients WHERE id = ?").bind(id).run();
          } catch (e) { console.error("D1 Client Delete Error:", e.message); }
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
        const body = await request.json().catch((e) => {
          console.warn("DELETE /clients/bulk: bad json body:", e?.message || e);
          return {};
        });
        // Filter to non-empty strings and cap at 200 per call — rejects non-string
        // ids that would otherwise bind as NULL and could collide across rows.
        const rawIds = Array.isArray(body?.ids) ? body.ids : [];
        const ids = [...new Set(rawIds.map((v) => String(v || "").trim()).filter(Boolean))].slice(0, 200);

        if (!ids.length) return json({ error: "ids array required (non-empty strings)" }, 400, cors);

        let list = await env.SHINEL_AUDIT.get("app:clients:registry", "json") || [];
        list = list.filter(c => !ids.includes(c.id));
        await putJsonGuarded(env.SHINEL_AUDIT, "app:clients:registry", list);

        // ALSO D1 (Primary Registry)
        if (env.DB && ids.length > 0) {
          try {
            const placeholders = ids.map(() => "?").join(",");
            await env.DB.prepare(`DELETE FROM clients WHERE id IN (${placeholders})`).bind(...ids).run();
          } catch (e) { console.error("D1 Bulk Delete Error:", e.message); }
        }
        return json({ ok: true, removed: ids.length }, 200, cors);
      } catch (e) {
        return json({ error: e.message || "Bulk delete failed" }, e.status || 500, cors);
      }
    }

    // GET /clients/stats - Generic stats
    if (url.pathname === "/clients/stats" && request.method === "GET") {
      let stats = await env.SHINEL_AUDIT.get("app:clients:stats", "json");

      // Fallback to backup if empty/missing
      if (!stats || !Array.isArray(stats) || stats.length === 0) {
        stats = await env.SHINEL_AUDIT.get("app:clients:stats:backup", "json") || [];
      }

      return json({ ok: true, stats: Array.isArray(stats) ? stats : [] }, 200, cors);
    }


    // GET /clients/history - Activity history (30-day window).
    // A single malformed record shouldn't 500 the whole endpoint; we skip
    // bad entries and return whatever we can parse. Public endpoint.
    if (url.pathname === "/clients/history" && request.method === "GET") {
      try {
        const historyData = {};
        let listResult;
        try {
          listResult = await env.SHINEL_AUDIT.list({ prefix: "history:" });
        } catch (listErr) {
          console.error("GET /clients/history list failed:", listErr?.message || listErr);
          return json({ ok: true, history: {} }, 200, cors);
        }
        const keys = listResult?.keys || [];

        // Parallel fetch with per-key safety — allSettled guarantees we return
        // partial data even if one KV.get rejects or a value is bad JSON.
        const settled = await Promise.allSettled(
          keys.map(async (k) => {
            const dateStr = k.name.split(":")[1];
            const data = await env.SHINEL_AUDIT.get(k.name, "json");
            return { dateStr, data };
          })
        );

        for (const s of settled) {
          if (s.status === "fulfilled" && s.value?.data && s.value?.dateStr) {
            historyData[s.value.dateStr] = s.value.data;
          } else if (s.status === "rejected") {
            console.warn("history record skipped:", s.reason?.message || s.reason);
          }
        }

        return json({ ok: true, history: historyData }, 200, cors);
      } catch (e) {
        console.error("GET /clients/history failed:", e?.stack || e?.message || e);
        return json({ ok: true, history: {} }, 200, cors);
      }
    }

    // POST /admin/snapshot - Manual trigger for history snapshot
    if (url.pathname === "/admin/snapshot" && request.method === "POST") {
      try {
        await requireAdminOrThrow(request, secret);
        const stats = await env.SHINEL_AUDIT.get("app:clients:stats", "json") || [];
        const dateStr = new Date().toISOString().split('T')[0];
        const key = `history:${dateStr}`;

        const snapshot = {
          ts: Date.now(),
          stats: Array.isArray(stats) ? stats.map(s => ({
            id: s.id || s.youtubeId,
            subscribers: Number(s.subscribers || 0),
            viewCount: Number(s.viewCount || 0)
          })) : []
        };

        await env.SHINEL_AUDIT.put(key, JSON.stringify(snapshot), { expirationTtl: 35 * 24 * 60 * 60 }); // 35 days
        return json({ ok: true, date: dateStr, key }, 200, cors);
      } catch (e) {
        return json({ error: e.message || "Snapshot failed" }, e.status || 500, cors);
      }
    }

    // GET /admin/db-export - Full backup for admin
    if (url.pathname === "/admin/db-export" && request.method === "GET") {
      try {
        await requireAdminOrThrow(request, secret);
        if (!env.DB) return json({ error: "DB missing" }, 501, cors);

        const tables = [
          "users", "clients", "inventory_videos", "inventory_thumbnails", 
          "pulse_activities", "media_library", "media_collections"
        ];
        
        const backup = {};
        for (const table of tables) {
          try {
            const { results } = await env.DB.prepare(`SELECT * FROM ${table}`).all();
            backup[table] = results;
          } catch (err) {
            backup[table] = { error: err.message };
          }
        }

        return json({ 
          ok: true, 
          timestamp: Date.now(),
          tables: backup 
        }, 200, cors);
      } catch (e) {
        return json({ error: "Export failed: " + (e.message || "Unknown error") }, e.status || 500, cors);
      }
    }

    /* =============================== /admin/users =============================== */

    // GET /admin/users - List all users (60s in-isolate cache; ?force=1 bypasses)
    if (url.pathname === "/admin/users" && request.method === "GET") {
      try {
        await requireTeamOrThrow(request, secret);
        const force = url.searchParams.get("force") === "1";
        const now = Date.now();

        if (!force && _adminUsersCache && now < _adminUsersCacheExpiry) {
          return json({ users: _adminUsersCache, cached: true }, 200, cors);
        }

        const list = [];

        // 1) From KV
        let cursor = "";
        while (true) {
          const { keys, list_complete, cursor: nextCursor } = await env.SHINEL_USERS.list({ prefix: "user:", cursor });
          for (const k of keys) {
            const val = await env.SHINEL_USERS.get(k.name, "json");
            if (val) {
              if (val.e2eTest === true) continue; // don't show CI test admin
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

        _adminUsersCache = list;
        _adminUsersCacheExpiry = now + ADMIN_USERS_TTL_MS;

        return json({ users: list, cached: false }, 200, cors);
      } catch (e) {
        return json({ error: e.message || "Fetch failed" }, e.status || 500, cors);
      }
    }

    // POST /admin/users - Create new user
    if (url.pathname === "/admin/users" && request.method === "POST") {
      try {
        const callerPayload = await requireTeamOrThrow(request, secret, env);
        const callerIsAdmin = roleIncludesAdmin(callerPayload.role);
        const contentLen = Number(request.headers.get("content-length") || 0);
        if (contentLen > 8 * 1024) return json({ error: "Payload too large" }, 413, cors);
        const body = await request.json().catch((e) => { console.warn(`bad json body @ ${url.pathname}:`, e?.message || e); return {}; });
        const email = String(body.email || "").trim().toLowerCase();
        const password = String(body.password || "");

        if (!email || !password) {
          return json({ error: "Email and password required" }, 400, cors);
        }

        const requestedRole = sanitizeRoleField(body.role) || "client";
        // Only admins can mint another admin.
        if (roleIncludesAdmin(requestedRole) && !callerIsAdmin) {
          return json({ error: "Only admins can assign the admin role" }, 403, cors);
        }

        // Standard bcrypt hash (10 rounds)
        const passwordHash = await bcrypt.hash(password, 10);
        const userData = {
          email,
          passwordHash,
          role: requestedRole,
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
        invalidateAdminUsersCache();
        return json({ ok: true, user: { email, role: userData.role } }, 200, cors);
      } catch (e) {
        return json({ error: e.message || "Creation failed" }, e.status || 500, cors);
      }
    }

    // PUT /admin/users/:email - Update user
    if (url.pathname.startsWith("/admin/users/") && request.method === "PUT") {
      try {
        const callerPayload = await requireTeamOrThrow(request, secret, env);
        const callerIsAdmin = roleIncludesAdmin(callerPayload.role);
        const contentLen = Number(request.headers.get("content-length") || 0);
        if (contentLen > 8 * 1024) return json({ error: "Payload too large" }, 413, cors);
        const email = decodeURIComponent(url.pathname.split("/")[3] || "").toLowerCase();
        const updates = await request.json().catch((e) => { console.warn(`bad json body @ ${url.pathname}:`, e?.message || e); return {}; });

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

        // Role mutations: only admins may change role. Non-admins get role updates dropped
        // silently (defense-in-depth: UI should also hide the field). Admin role escalation
        // requires the caller to already be admin.
        if (updates.role !== undefined) {
          if (!callerIsAdmin) {
            merged.role = user.role; // keep existing role untouched
          } else {
            const nextRole = sanitizeRoleField(updates.role);
            if (nextRole) merged.role = nextRole;
            else delete merged.role;
          }
        }

        await env.SHINEL_USERS.put(`user:${email}`, JSON.stringify(merged));
        invalidateAdminUsersCache();
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
        invalidateAdminUsersCache();
        return json({ ok: true }, 200, cors);
      } catch (e) {
        return json({ error: e.message || "Delete failed" }, e.status || 500, cors);
      }
    }

    /* =============================== /stats =============================== */
    if (url.pathname === "/stats" && request.method === "GET") {
      try {
        const thumbs = await getJsonList(env, KV_THUMBS_KEY);
        const videos = await getJsonList(env, KV_VIDEOS_KEY);
        const clients = await getClients(env);
        
        // Calculate total reach (sum of subscribers/followers)
        const statsRaw = await env.SHINEL_AUDIT.get("app:clients:stats", "json") || [];
        const stats = Array.isArray(statsRaw) ? statsRaw : (statsRaw.stats || []);
        
        let reach = 0;
        if (stats.length > 0) {
          reach = stats.reduce((acc, s) => acc + Number(s.subscribers || 0) + Number(s.instagramFollowers || 0), 0);
        } else {
          // Fallback to registry data if stats are missing/empty
          reach = clients.reduce((acc, c) => acc + Number(c.subscribers || 0) + Number(c.instagramFollowers || c.instagram_followers || 0), 0);
        }

        return json(
          {
            ok: true,
            time: Date.now(),
            counts: { 
              thumbnails: thumbs.length, 
              videos: videos.length,
              creators: clients.length,
              reach
            },
          },
          200,
          cors
        );
      } catch (e) {
        return json({ error: e.message }, 500, cors);
      }
    }

    /* =========================== /thumbnails/stats =========================== */
    if (url.pathname === "/thumbnails/stats" && request.method === "GET") {
      try {
        const thumbs = await getJsonList(env, KV_THUMBS_KEY);
        // Estimate size (roughly 1kb per entry metadata + cache considerations)
        const totalSize = JSON.stringify(thumbs).length;
        
        return json({
          ok: true,
          totalCount: thumbs.length,
          totalSize: totalSize,
          storageUsed: `${(totalSize / 1024 / 1024).toFixed(2)} MB`,
          lastUpdated: Date.now()
        }, 200, cors);
      } catch (e) {
        return json({ error: e.message }, 500, cors);
      }
    }

    /* =============================== /videos ============================== */
    if (url.pathname === "/videos" && request.method === "GET") {
      try {
        if (!env.DB) return json({ error: "DB missing" }, 501, cors);

        // Optional pagination (?limit=&cursor=). Backwards-compatible: default returns
        // the full list so existing clients keep working until they opt in.
        const limitParam = Number(url.searchParams.get("limit") || 0);
        const cursor = url.searchParams.get("cursor") || "";
        const paginated = limitParam > 0;
        const limit = Math.max(1, Math.min(paginated ? limitParam : 10000, 500));

        let list;
        if (paginated && cursor) {
          const res = await env.DB
            .prepare("SELECT * FROM inventory_videos WHERE last_updated < ? ORDER BY last_updated DESC LIMIT ?")
            .bind(cursor, limit)
            .all();
          list = res.results;
        } else {
          const res = await env.DB
            .prepare("SELECT * FROM inventory_videos ORDER BY last_updated DESC LIMIT ?")
            .bind(limit)
            .all();
          list = res.results;
        }

        // Map snake_case DB columns → camelCase for frontend
        const videos = list.map(v => ({
          id: v.id,
          title: v.title,
          category: v.category,
          subcategory: v.subcategory,
          kind: v.kind,
          tags: v.tags,
          primaryUrl: v.primary_url,
          creatorUrl: v.creator_url,
          mirrorUrl: v.mirror_url,
          videoId: v.video_id,
          youtubeViews: v.youtube_views,
          viewStatus: v.view_status,
          lastViewUpdate: v.last_view_update,
          attributedTo: v.attributed_to,
          isShinel: v.is_shinel === 1 || v.is_shinel === true,
          isVisibleOnPersonal: v.is_visible_on_personal === null || v.is_visible_on_personal === undefined ? true : (v.is_visible_on_personal === 1 || v.is_visible_on_personal === true),
          specialty: v.specialty || null,
          platform: v.platform || 'YOUTUBE',
          instagramUrl: v.instagram_url || "",
          instagramViews: Number(v.instagram_views || 0),
          instagramViewsStatus: v.instagram_views_status || null,
          lastIgViewUpdate: v.last_ig_view_update || null,
          dateAdded: v.date_added,
          updated: v.last_updated,
        }));

        const etag = weakEtagFor(videos);
        if (request.headers.get("if-none-match") === etag) {
          return new Response(null, { status: 304, headers: { ...cors, ETag: etag } });
        }
        const nextCursor = paginated && videos.length === limit ? videos[videos.length - 1].updated : null;
        return json({ videos, nextCursor }, 200, { ...cors, ETag: etag });
      } catch (e) { return json({ error: e.message }, 500, cors); }
    }

    if (url.pathname === "/videos" && request.method === "POST") {
      try {
        await requireTeamOrThrow(request, secret, env);
        if (!env.DB) return json({ error: "DB binding missing" }, 501, cors);
        const contentLen = Number(request.headers.get("content-length") || 0);
        if (contentLen > 32 * 1024) return json({ error: "Payload too large" }, 413, cors);

        const body = await request.json().catch((e) => { console.warn(`bad json body @ ${url.pathname}:`, e?.message || e); return {}; });
        const id = `v-${Date.now()}-${Math.random().toString(36).slice(2)}`;

        // URL model (2026-04-27): creatorUrl is the source of view counts
        // (the creator's original); mirrorUrl is what plays on the public
        // site (Shinel re-upload). primary_url is legacy — we keep the
        // column populated to creatorUrl so older read paths still work.
        const creatorUrl = String(body.creatorUrl || body.primaryUrl || "");
        const mirrorUrl  = String(body.mirrorUrl  || "");
        const videoId    = ytIdFrom(creatorUrl) || ytIdFrom(mirrorUrl) || "";

        // Coerce every optional field to a real string; D1 rejects `undefined`
        // binds with "Type 'undefined' not supported".
        const s = (v) => (v == null ? "" : String(v));
        // Defensive numeric coerce: D1 also rejects NaN/Infinity. Strings
        // like "abc" used to take down POST /videos with a 500. This
        // returns 0 for any non-finite input.
        const n = (v) => { const x = Number(v); return Number.isFinite(x) ? x : 0; };

        await env.DB.prepare(
          "INSERT INTO inventory_videos (id, title, category, subcategory, kind, tags, primary_url, creator_url, mirror_url, video_id, youtube_views, view_status, attributed_to, is_shinel, specialty, instagram_url, instagram_views) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        ).bind(
          id,
          s(body.title) || `video-${id}`,
          s(body.category) || "GAMING",
          s(body.subcategory),
          s(body.kind) || "LONG",
          s(body.tags),
          creatorUrl,    // primary_url ← legacy mirror of creator_url
          creatorUrl,    // creator_url ← source for view counts
          mirrorUrl,     // mirror_url  ← Shinel re-upload, plays on the site
          videoId,
          n(body.youtubeViews),
          s(body.viewStatus) || "unknown",
          s(body.attributedTo),
          body.isShinel === false ? 0 : 1,
          sanitizeSpecialty(body.specialty),
          s(body.instagramUrl) || null,
          n(body.instagramViews)
        ).run();

        return json({ ok: true, id }, 200, cors);
      } catch (e) {
        console.error("POST /videos failed:", e?.stack || e?.message || e);
        return json({ error: e?.message || "Video create failed" }, e?.status || 500, cors);
      }
    }

    if (url.pathname === "/api/media/migrate-kv-to-d1" && request.method === "POST") {
      try {
        await requireAdminOrThrow(request, secret);
        
        let migratedVideos = 0;
        let migratedThumbs = 0;
        const errors = [];

        // 1. Videos
        const videos = await getJsonList(env, "app:videos:list");
        for (const v of videos) {
          try {
            await env.DB.prepare(`
              INSERT OR REPLACE INTO inventory_videos 
              (id, title, category, subcategory, kind, tags, primary_url, creator_url, video_id, youtube_views, view_status, last_view_update, attributed_to, is_shinel, date_added, last_updated)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).bind(
              v.id || crypto.randomUUID(), v.title || "Untitled", v.category || null, v.subcategory || null, v.kind || null, 
              Array.isArray(v.tags) ? v.tags.join(",") : (v.tags || ""),
              v.primaryUrl || null, v.creatorUrl || null, v.videoId || null, v.youtubeViews || 0,
              v.viewStatus || "UNKNOWN", v.lastViewUpdate ? new Date(v.lastViewUpdate).toISOString() : null,
              v.attributedTo || null, v.isShinel ? 1 : 0, 
              v.dateAdded ? new Date(v.dateAdded).toISOString() : new Date().toISOString(),
              v.lastUpdated ? new Date(v.lastUpdated).toISOString() : new Date().toISOString()
            ).run();
            migratedVideos++;
          } catch (err) {
            errors.push(`Video ${v.id || 'err'}: ${err.message}`);
          }
        }

        // 2. Thumbnails
        const thumbs = await getJsonList(env, "thumbnails_public");
        for (const t of thumbs) {
          try {
            await env.DB.prepare(`
              INSERT OR REPLACE INTO inventory_thumbnails 
              (id, filename, youtube_url, category, subcategory, variant, image_url, video_id, youtube_views, view_status, last_view_update, attributed_to, is_shinel, date_added, last_updated)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).bind(
              t.id || crypto.randomUUID(), t.filename || null, t.youtubeUrl || null, t.category || null, t.subcategory || null, t.variant || null,
              t.imageUrl || null, t.videoId || null, t.youtubeViews || 0,
              t.viewStatus || "UNKNOWN", t.lastViewUpdate ? new Date(t.lastViewUpdate).toISOString() : null,
              t.attributedTo || null, t.isShinel ? 1 : 0,
              t.dateAdded ? new Date(t.dateAdded).toISOString() : new Date().toISOString(),
              t.lastUpdated ? new Date(t.lastUpdated).toISOString() : new Date().toISOString()
            ).run();
            migratedThumbs++;
          } catch (err) {
            errors.push(`Thumb ${t.id || 'err'}: ${err.message}`);
          }
        }

        return json({ ok: true, migrated: { videos: migratedVideos, thumbnails: migratedThumbs }, errors }, 200, cors);
      } catch (e) { return json({ error: e.message }, 500, cors); }
    }

    /* =============================== /videos (admin CRUD) =============================== */
    const VIDEO_FIELDS = new Set([
      "title", "category", "subcategory", "kind", "tags", "primaryUrl",
      "creatorUrl", "mirrorUrl", "videoId", "youtubeViews", "viewStatus",
      "lastViewUpdate", "attributedTo", "isShinel", "isVisibleOnPersonal",
      "specialty", "instagramUrl", "instagramViews",
    ]);

    if (url.pathname.startsWith("/videos/") && request.method === "PUT") {
      try {
        await requireTeamOrThrow(request, secret);
        const id = decodeURIComponent(url.pathname.split("/")[2] || "");
        const updates = await request.json().catch((e) => { console.warn(`bad json body @ ${url.pathname}:`, e?.message || e); return {}; });

        const fields = [];
        const params = [];
        let videoIdAlreadyPushed = false;

        for (const [key, val] of Object.entries(updates)) {
          if (!VIDEO_FIELDS.has(key)) continue; // Whitelist check

          // creatorUrl is now the canonical view-count source. When the admin
          // edits it, also (a) re-derive the videoId column and (b) mirror
          // the value into primary_url so legacy read paths stay consistent.
          if (key === "creatorUrl") {
            const vId = ytIdFrom(val);
            if (vId && !videoIdAlreadyPushed) {
              fields.push("video_id = ?");
              params.push(vId);
              videoIdAlreadyPushed = true;
            }
            fields.push("primary_url = ?");
            params.push(val);
          }
          // primaryUrl edits are still accepted (legacy callers) but only
          // touch the video_id derivation if creatorUrl wasn't also sent.
          if (key === "primaryUrl" && !updates.creatorUrl) {
            const vId = ytIdFrom(val);
            if (vId && !videoIdAlreadyPushed) {
              fields.push("video_id = ?");
              params.push(vId);
              videoIdAlreadyPushed = true;
            }
          }
          // Mirror URL is the playback source. If creatorUrl wasn't provided
          // and the row had no videoId, fall back to mirror for video_id.
          if (key === "mirrorUrl" && !updates.creatorUrl && !updates.primaryUrl) {
            const vId = ytIdFrom(val);
            if (vId && !videoIdAlreadyPushed) {
              fields.push("video_id = ?");
              params.push(vId);
              videoIdAlreadyPushed = true;
            }
          }

          const dbKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
          fields.push(`${dbKey} = ?`);
          // Sanitize specialty to one of the allowed slugs or NULL — admin
          // form picker should already enforce this, but defense-in-depth.
          // Numeric columns (instagramViews, youtubeViews) get the
          // NaN-safe coerce so D1 doesn't 500 on a malformed input.
          let bound = val;
          if (key === "specialty") {
            bound = sanitizeSpecialty(val);
          } else if (key === "instagramViews" || key === "youtubeViews") {
            const x = Number(val);
            bound = Number.isFinite(x) ? x : 0;
          }
          params.push(bound);
        }

        if (fields.length === 0) return json({ error: "No valid fields to update" }, 400, cors);

        params.push(new Date().toISOString(), id);

        await env.DB.prepare(
          `UPDATE inventory_videos SET ${fields.join(", ")}, last_updated = ? WHERE id = ?`
        ).bind(...params).run();

        return json({ ok: true }, 200, cors);
      } catch (e) {
        return json({ error: "Update failed: " + (e.message || "Unknown error") }, 500, cors);
      }
    }

    // DELETE /videos/bulk  — body: { ids: string[] }
    // Must match BEFORE the single-row /videos/:id handler below (which uses
    // `startsWith("/videos/")` and would otherwise swallow this path).
    if (url.pathname === "/videos/bulk" && request.method === "DELETE") {
      try {
        await requireTeamOrThrow(request, secret, env);
        if (!env.DB) return json({ error: "DB binding missing" }, 501, cors);

        const body = await request.json().catch((e) => { console.warn(`bad json body @ ${url.pathname}:`, e?.message || e); return {}; });
        const rawIds = Array.isArray(body?.ids) ? body.ids : [];
        // Cap per call to stay inside worker CPU + D1 plan limits.
        const ids = [...new Set(rawIds.map((v) => String(v || "").trim()).filter(Boolean))].slice(0, 200);
        if (ids.length === 0) return json({ error: "ids array required" }, 400, cors);

        const placeholders = ids.map(() => "?").join(",");

        // Cascade — best-effort join-table cleanup before the main delete.
        try {
          await env.DB.prepare(
            `DELETE FROM media_collection_items WHERE media_type = 'video' AND media_id IN (${placeholders})`
          ).bind(...ids).run();
        } catch (joinErr) {
          console.warn("bulk video delete: join cleanup failed (continuing):", joinErr?.message || joinErr);
        }

        const res = await env.DB.prepare(
          `DELETE FROM inventory_videos WHERE id IN (${placeholders})`
        ).bind(...ids).run();

        return json({ ok: true, deleted: res.meta?.changes ?? ids.length, ids }, 200, cors);
      } catch (e) {
        console.error("DELETE /videos/bulk failed:", e?.stack || e?.message || e);
        return json({ error: e?.message || "Bulk delete failed" }, e?.status || 500, cors);
      }
    }

    if (url.pathname.startsWith("/videos/") && request.method === "DELETE") {
      try {
        await requireTeamOrThrow(request, secret, env);
        const id = decodeURIComponent(url.pathname.split("/")[2] || "");
        if (!id) return json({ error: "Video id required" }, 400, cors);
        if (!env.DB) return json({ error: "DB binding missing" }, 501, cors);

        // Cascade: remove the video's join-table entries first so the main
        // delete can't be blocked by FK enforcement. Best-effort — if the
        // join-table delete itself errors (shouldn't, it's a simple WHERE),
        // we log and keep going so the primary delete still attempts.
        try {
          await env.DB.prepare(
            "DELETE FROM media_collection_items WHERE media_id = ? AND media_type = 'video'"
          ).bind(id).run();
        } catch (joinErr) {
          console.warn("DELETE /videos: join-table cleanup failed (continuing):", joinErr?.message || joinErr);
        }

        await env.DB.prepare("DELETE FROM inventory_videos WHERE id = ?").bind(id).run();
        return json({ ok: true, id }, 200, cors);
      } catch (e) {
        // Respect thrown status (e.g. 401 from requireTeamOrThrow) so the
        // client can prompt re-login instead of seeing a scary 500.
        console.error("DELETE /videos failed:", e?.stack || e?.message || e);
        return json({ error: e?.message || "Delete failed" }, e?.status || 500, cors);
      }
    }

    /* =========================== /leads (leads crm) =========================== */
    const KV_LEADS_KEY = "app:leads:list";

    // GET /leads - List all leads
    if (url.pathname === "/leads" && request.method === "GET") {
      try {
        await requireTeamOrThrow(request, secret);
        const list = await getJsonList(env, KV_LEADS_KEY);
        return json({ leads: list }, 200, cors);
      } catch (e) {
        return json({ error: e.message || "Fetch failed" }, e.status || 500, cors);
      }
    }

    // POST /leads - Create new lead (Public, rate-limited, size-capped)
    if (url.pathname === "/leads" && request.method === "POST") {
      try {
        // 1. Size gate before parsing.
        const contentLen = Number(request.headers.get("content-length") || 0);
        if (contentLen > 16 * 1024) {
          return json({ error: "Payload too large" }, 413, cors);
        }
        // 2. Rate limit: 10 submissions / hour / IP.
        if (await isRateLimited(env, ip, 3600, 10, "leads")) {
          return json({ error: "Too many submissions, please try again later" }, 429, cors);
        }
        // 3. Honeypot rejection (matches QuickLeadForm's hidden "website" field).
        const body = await request.json().catch((e) => { console.warn(`bad json body @ ${url.pathname}:`, e?.message || e); return {}; });
        if (body && typeof body.website === "string" && body.website.trim()) {
          // Silent success to confuse bots.
          return json({ ok: true, id: "lead-hp" }, 200, cors);
        }
        // 4. Validation.
        const emailRaw = String(body.email || "").trim();
        if (!EMAIL_RE.test(emailRaw) || emailRaw.length > 254) {
          return json({ error: "Invalid email" }, 400, cors);
        }
        const nameRaw = String(body.name || "").trim();
        if (nameRaw.length < 2) {
          return json({ error: "Name required" }, 400, cors);
        }
        const interests = Array.isArray(body.interests)
          ? body.interests.slice(0, 20).map(v => clampStr(v, 80))
          : [];
        // Cap quizData to 4 KB of JSON.
        let quizData = null;
        if (body.quizData != null) {
          try {
            const s = JSON.stringify(body.quizData);
            if (s.length <= 4096) quizData = JSON.parse(s);
          } catch { /* drop silently */ }
        }

        const now = Date.now();
        const id = `lead-${now}-${Math.random().toString(36).slice(2)}`;

        const lead = {
          id,
          name: clampStr(nameRaw, 120),
          email: clampStr(emailRaw.toLowerCase(), 254),
          handle: clampStr(body.handle, 80),
          source: clampStr(body.source || "wizard", 40),
          interests,
          quizData,
          status: "new",
          createdAt: now,
          lastUpdated: now
        };

        const list = await getJsonList(env, KV_LEADS_KEY);
        list.push(lead);
        await putJsonList(env, KV_LEADS_KEY, list);

        return json({ ok: true, id }, 200, cors);
      } catch (e) {
        return json({ error: e.message || "Submission failed" }, 500, cors);
      }
    }

    // PUT /leads/:id - Update lead (status, notes, etc)
    if (url.pathname.startsWith("/leads/") && request.method === "PUT") {
      try {
        await requireTeamOrThrow(request, secret);
        const id = decodeURIComponent(url.pathname.split("/")[2] || "");
        const updates = await request.json().catch((e) => { console.warn(`bad json body @ ${url.pathname}:`, e?.message || e); return {}; });

        const list = await getJsonList(env, KV_LEADS_KEY);
        const idx = list.findIndex((l) => l.id === id);
        if (idx < 0) return json({ error: "Lead not found" }, 404, cors);

        // Merge updates
        const now = Date.now();
        list[idx] = { ...list[idx], ...updates, lastUpdated: now };

        await putJsonList(env, KV_LEADS_KEY, list);
        return json({ lead: list[idx] }, 200, cors);
      } catch (e) {
        return json({ error: e.message || "Update failed" }, e.status || 500, cors);
      }
    }

    // DELETE /leads/bulk - Delete multiple leads
    if (url.pathname === "/leads/bulk" && request.method === "DELETE") {
      try {
        await requireTeamOrThrow(request, secret);
        const body = await request.json().catch((e) => {
          console.warn("DELETE /leads/bulk: bad json body:", e?.message || e);
          return {};
        });
        const rawIds = Array.isArray(body?.ids) ? body.ids : [];
        const ids = [...new Set(rawIds.map((v) => String(v || "").trim()).filter(Boolean))].slice(0, 200);
        if (!ids.length) return json({ error: "ids array required (non-empty strings)" }, 400, cors);

        const list = await getJsonList(env, KV_LEADS_KEY);
        const initialLen = list.length;
        const newList = list.filter(l => !ids.includes(l.id));

        if (newList.length !== initialLen) {
          await putJsonList(env, KV_LEADS_KEY, newList);
        }
        return json({ ok: true, deleted: initialLen - newList.length }, 200, cors);
      } catch (e) {
        return json({ error: e.message || "Bulk delete failed" }, e.status || 500, cors);
      }
    }

    // DELETE /leads/:id - Delete single lead
    if (url.pathname.startsWith("/leads/") && request.method === "DELETE") {
      try {
        await requireTeamOrThrow(request, secret);
        const id = decodeURIComponent(url.pathname.split("/")[2] || "");

        const list = await getJsonList(env, KV_LEADS_KEY);
        const idx = list.findIndex((l) => l.id === id);
        if (idx >= 0) {
          list.splice(idx, 1);
          await putJsonList(env, KV_LEADS_KEY, list);
        }
        return json({ ok: true }, 200, cors);
      } catch (e) {
        return json({ error: e.message || "Delete failed" }, e.status || 500, cors);
      }
    }

    /* ====================== videos refresh endpoints ====================== */
    // POST /videos/refresh/:id   (also /thumbnails/refresh/:id)
    // :id accepts a YouTube 11-char video id OR an inventory row id; if it's a
    // row id we resolve video_id from D1 before hitting YouTube. Frontend used
    // to pass row ids here and the whole call silently fetched 0 views.
    if ((url.pathname.startsWith("/videos/refresh/") || url.pathname.startsWith("/thumbnails/refresh/")) && request.method === "POST") {
      try {
        await requireTeamOrThrow(request, secret);
        const raw = decodeURIComponent(url.pathname.split("/")[3] || "");
        if (!raw) return json({ error: "Missing id" }, 400, cors);

        // Standard YT video ids are exactly 11 chars, [A-Za-z0-9_-]. Anything
        // else is probably our own row-prefixed id like "t-<ts>-<rand>" or
        // "v-<ts>-<rand>" — resolve through D1 before calling YouTube.
        const YT_ID_RE = /^[A-Za-z0-9_-]{11}$/;
        let videoId = YT_ID_RE.test(raw) ? raw : "";

        if (!videoId && env.DB) {
          const isThumbRoute = url.pathname.startsWith("/thumbnails/");
          const table = isThumbRoute ? "inventory_thumbnails" : "inventory_videos";
          // Pull both the explicit video_id column AND the URL columns. Some
          // older rows (notably LIVE-variant thumbnails for past livestreams)
          // carry a youtube_url like https://youtube.com/live/<id> but never
          // had video_id populated. ytIdFrom now parses /live/, /shorts/,
          // /embed/, /watch?v=, and youtu.be — so we can recover the id.
          //
          // Order matters: creator_url is the canonical source-of-truth for
          // view counts (the creator's original); primary_url is its legacy
          // mirror. Try creator_url first so a video that was deleted on
          // the creator's channel but kept on our mirror still resolves
          // correctly to the *creator's* id (where YouTube's view count
          // history lives — even after deletion the API can return the last
          // known views).
          const urlCols = isThumbRoute ? "youtube_url" : "creator_url, primary_url, mirror_url";
          try {
            const row = await env.DB.prepare(
              `SELECT video_id, ${urlCols} FROM ${table} WHERE id = ?`
            ).bind(raw).first();
            videoId = row?.video_id || "";
            if (!videoId && row) {
              for (const candidate of [row.youtube_url, row.creator_url, row.primary_url, row.mirror_url]) {
                if (candidate) {
                  const parsed = ytIdFrom(candidate);
                  if (parsed) { videoId = parsed; break; }
                }
              }
              // Backfill the column so subsequent refreshes are fast and
              // the row stops failing with "no video id".
              if (videoId) {
                try {
                  await env.DB.prepare(
                    `UPDATE ${table} SET video_id = ? WHERE id = ?`
                  ).bind(videoId, raw).run();
                } catch (backfillErr) {
                  console.warn("refresh: video_id backfill failed:", backfillErr?.message || backfillErr);
                }
              }
            }
          } catch (lookupErr) {
            console.warn("refresh: row-id lookup failed:", lookupErr?.message || lookupErr);
          }
          // Cross-check the other table if not found (frontend may call
          // /thumbnails/refresh/<video-row-id> and vice versa).
          if (!videoId) {
            try {
              const otherTable = isThumbRoute ? "inventory_videos" : "inventory_thumbnails";
              const otherUrlCols = isThumbRoute ? "creator_url, primary_url, mirror_url" : "youtube_url";
              const row = await env.DB.prepare(
                `SELECT video_id, ${otherUrlCols} FROM ${otherTable} WHERE id = ?`
              ).bind(raw).first();
              videoId = row?.video_id || "";
              if (!videoId && row) {
                for (const candidate of [row.youtube_url, row.creator_url, row.primary_url, row.mirror_url]) {
                  if (candidate) {
                    const parsed = ytIdFrom(candidate);
                    if (parsed) { videoId = parsed; break; }
                  }
                }
              }
            } catch { /* best-effort */ }
          }
        }

        if (!videoId) {
          return json({
            error: "No YouTube video id on this row. Add a YouTube URL first.",
          }, 400, cors);
        }

        const now = new Date().toISOString();
        const views = await fetchYouTubeViews(env, videoId);

        if (views == null) return json({ error: "Could not fetch views from YouTube" }, 502, cors);

        // Update in D1
        if (env.DB) {
          await env.DB.prepare(
            "UPDATE inventory_videos SET youtube_views = ?, view_status = 'ok', last_view_update = ?, last_updated = ? WHERE video_id = ?"
          ).bind(views, now, now, videoId).run();

          await env.DB.prepare(
            "UPDATE inventory_thumbnails SET youtube_views = ?, view_status = 'ok', last_view_update = ?, last_updated = ? WHERE video_id = ?"
          ).bind(views, now, now, videoId).run();
        }

        return json({ ok: true, views, videoId }, 200, cors);
      } catch (e) {
        console.error("POST /*/refresh/:id failed:", e?.stack || e?.message || e);
        return json({ error: e?.message || "Refresh failed" }, e?.status || 500, cors);
      }
    }

    // POST /api/instagram/scrape  — URL-only scrape, no persistence.
    // Used by the admin form when creating a new row (before there's
    // a row id to refresh by). Body: { url }. Response: same shape
    // as /api/instagram/refresh/:id but no DB write.
    if (url.pathname === "/api/instagram/scrape" && request.method === "POST") {
      try {
        await requireTeamOrThrow(request, secret);
        const body = await request.json().catch(() => ({}));
        const reelUrl = String(body?.url || "").trim();
        if (!reelUrl) return json({ error: "Missing url" }, 400, cors);

        const result = await fetchInstagramReelViews(env, reelUrl);
        if (result.status === "ok" && Number.isFinite(result.views) && result.views > 0) {
          return json({ ok: true, views: result.views, status: "ok", source: "instagram", cached: !!result.cached }, 200, cors);
        }
        return json({ ok: false, status: result.status || "scrape-failed", reason: result.reason || null }, 200, cors);
      } catch (e) {
        console.error("POST /api/instagram/scrape failed:", e?.stack || e?.message || e);
        return json({ error: e?.message || "Scrape failed" }, e?.status || 500, cors);
      }
    }

    // POST /api/instagram/refresh/:id   — best-effort scrape of an
    // inventory row's instagram_url. Auto-fills instagram_views on
    // success; preserves the prior value on failure (the manual entry
    // is the source of truth — see plan: "stable + robust + free").
    if (url.pathname.startsWith("/api/instagram/refresh/") && request.method === "POST") {
      try {
        await requireTeamOrThrow(request, secret);
        const rowId = decodeURIComponent(url.pathname.split("/")[4] || "");
        if (!rowId) return json({ error: "Missing id" }, 400, cors);
        if (!env.DB) return json({ error: "DB missing" }, 501, cors);

        // Probe both inventory tables — the row id is unique across both.
        let table = null;
        let row = null;
        for (const t of ["inventory_videos", "inventory_thumbnails"]) {
          try {
            const r = await env.DB.prepare(
              `SELECT id, instagram_url FROM ${t} WHERE id = ?`
            ).bind(rowId).first();
            if (r) { table = t; row = r; break; }
          } catch { /* table or column missing — skip */ }
        }
        if (!row) return json({ error: "Row not found" }, 404, cors);
        if (!row.instagram_url) return json({ error: "No Instagram URL on this row" }, 400, cors);

        const result = await fetchInstagramReelViews(env, row.instagram_url);
        const now = new Date().toISOString();

        if (result.status === "ok" && Number.isFinite(result.views) && result.views > 0) {
          try {
            await env.DB.prepare(
              `UPDATE ${table}
                  SET instagram_views = ?,
                      instagram_views_status = 'ok',
                      last_ig_view_update = ?,
                      last_updated = ?
                WHERE id = ?`
            ).bind(result.views, now, now, rowId).run();
          } catch (e) {
            console.error("ig refresh: D1 update failed:", e?.message || e);
            return json({ error: "DB update failed" }, 500, cors);
          }
          return json({ ok: true, views: result.views, status: "ok", source: "instagram", cached: !!result.cached }, 200, cors);
        }

        // Failure — record status, preserve prior count.
        try {
          await env.DB.prepare(
            `UPDATE ${table}
                SET instagram_views_status = ?,
                    last_ig_view_update = ?
              WHERE id = ?`
          ).bind(result.status || "scrape-failed", now, rowId).run();
        } catch { /* non-fatal */ }
        return json({
          ok: false,
          status: result.status || "scrape-failed",
          reason: result.reason || null,
        }, 200, cors);
      } catch (e) {
        console.error("POST /api/instagram/refresh/:id failed:", e?.stack || e?.message || e);
        return json({ error: e?.message || "Refresh failed" }, e?.status || 500, cors);
      }
    }

    // POST /videos/refresh-all (bulk, weekly)
    if (url.pathname === "/videos/refresh-all" && request.method === "POST") {
      try {
        await requireTeamOrThrow(request, secret);
        const now = new Date().toISOString();
        
        if (!env.DB) return json({ error: "DB missing" }, 501, cors);

        // Fetch videos that haven't been updated in 24 hours
        // SQLite doesn't have neat date math like Postgres, so we do it roughly or just fetch all stale ones
        const { results: staleVideos } = await env.DB.prepare(
          "SELECT video_id FROM inventory_videos WHERE last_view_update IS NULL OR last_view_update < ? LIMIT 50"
        ).bind(new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()).all();

        let updatedCount = 0;
        for (const v of staleVideos) {
          const views = await fetchYouTubeViews(env, v.video_id);
          if (views != null) {
            await env.DB.prepare(
              "UPDATE inventory_videos SET youtube_views = ?, view_status = 'ok', last_view_update = ?, last_updated = ? WHERE video_id = ?"
            ).bind(views, now, now, v.video_id).run();
            updatedCount++;
          }
        }

        return json({ ok: true, refreshed: updatedCount }, 200, cors);
      } catch (e) {
        return json({ error: "Bulk sync failed: " + e.message }, 500, cors);
      }
    }

    // POST /thumbnails/refresh-all (bulk, stale)
    if (url.pathname === "/thumbnails/refresh-all" && request.method === "POST") {
      try {
        await requireTeamOrThrow(request, secret);
        const now = new Date().toISOString();
        if (!env.DB) return json({ error: "DB missing" }, 501, cors);

        const { results: staleThumbs } = await env.DB.prepare(
          "SELECT video_id FROM inventory_thumbnails WHERE video_id IS NOT NULL AND (last_view_update IS NULL OR last_view_update < ?) LIMIT 50"
        ).bind(new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()).all();

        let updatedCount = 0;
        for (const t of staleThumbs) {
          const views = await fetchYouTubeViews(env, t.video_id);
          if (views != null) {
            await env.DB.prepare(
              "UPDATE inventory_thumbnails SET youtube_views = ?, view_status = 'ok', last_view_update = ?, last_updated = ? WHERE video_id = ?"
            ).bind(views, now, now, t.video_id).run();
            updatedCount++;
          }
        }

        return json({ ok: true, refreshed: updatedCount }, 200, cors);
      } catch (e) {
        return json({ error: "Thumbnail bulk refresh failed: " + e.message }, 500, cors);
      }
    }

    /* =========================== /notify (Discord) =========================== */
    if (url.pathname === "/notify" && request.method === "POST") {
      try {
        // Allow clients to notify, so we just verify they have a valid token
        const token = readBearerToken(request);
        if (!token) return json({ error: "Missing token" }, 401, cors);
        const payload = await verifyJWT(token, secret); // Verify signature only

        const body = await request.json().catch((e) => { console.warn(`bad json body @ ${url.pathname}:`, e?.message || e); return {}; });
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
        const body = await request.json().catch((e) => { console.warn(`bad json body @ ${url.pathname}:`, e?.message || e); return {}; });
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
      try {
        if (!env.DB) return json({ error: "DB missing" }, 501, cors);
        const { results: list } = await env.DB.prepare("SELECT * FROM inventory_thumbnails ORDER BY last_updated DESC").all();
        
        // Map snake_case DB columns → camelCase for frontend
        const thumbnails = list.map(t => ({
          id: t.id,
          filename: t.filename || t.title || t.video_id || "Untitled",
          youtubeUrl: t.youtube_url,
          category: t.category,
          subcategory: t.subcategory,
          variant: t.variant,
          imageUrl: t.image_url,
          videoId: t.video_id,
          youtubeViews: t.youtube_views,
          viewStatus: t.view_status,
          lastViewUpdate: t.last_view_update,
          attributedTo: t.attributed_to,
          isShinel: t.is_shinel === 1 || t.is_shinel === true,
          isVisibleOnPersonal: t.is_visible_on_personal === null || t.is_visible_on_personal === undefined ? true : (t.is_visible_on_personal === 1 || t.is_visible_on_personal === true),
          specialty: t.specialty || null,
          instagramUrl: t.instagram_url || "",
          instagramViews: Number(t.instagram_views || 0),
          instagramViewsStatus: t.instagram_views_status || null,
          lastIgViewUpdate: t.last_ig_view_update || null,
          dateAdded: t.date_added,
          updated: t.last_updated,
        }));

        const etag = weakEtagFor(thumbnails);
        if (request.headers.get("if-none-match") === etag) {
          return new Response(null, { status: 304, headers: { ...cors, ETag: etag } });
        }
        return json({ thumbnails }, 200, { ...cors, ETag: etag });
      } catch (e) { return json({ error: e.message }, 500, cors); }
    }

    /* ======================= /thumbnails (admin CRUD) ======================= */

    if (url.pathname === "/thumbnails" && request.method === "POST") {
      try {
        await requireTeamOrThrow(request, secret, env);
        if (!env.DB) return json({ error: "DB binding missing" }, 501, cors);

        const body = await request.json().catch((e) => { console.warn(`bad json body @ ${url.pathname}:`, e?.message || e); return {}; });
        const id = `t-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const videoId = ytIdFrom(body.youtubeUrl || "") || "";

        // D1 rejects `undefined` as a bind value ("Type 'undefined' not
        // supported"). Coerce every optional field to a real string (empty
        // is fine, columns are nullable TEXT) so a missing form field can't
        // crash the insert. Previous code was erroring intermittently when
        // admin uploaded a thumbnail without a filename.
        const s = (v) => (v == null ? "" : String(v));
        const n = (v) => { const x = Number(v); return Number.isFinite(x) ? x : 0; };
        const filename = s(body.filename) || (videoId ? `${videoId}.jpg` : `thumb-${id}`);

        await env.DB.prepare(
          "INSERT INTO inventory_thumbnails (id, filename, youtube_url, category, subcategory, variant, image_url, video_id, youtube_views, view_status, attributed_to, is_shinel, specialty, instagram_url, instagram_views) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        ).bind(
          id,
          filename,
          s(body.youtubeUrl),
          s(body.category) || "GAMING",
          s(body.subcategory),
          s(body.variant) || "VIDEO",
          s(body.imageUrl),
          videoId,
          n(body.youtubeViews),
          s(body.viewStatus) || "unknown",
          s(body.attributedTo),
          body.isShinel === false ? 0 : 1,
          sanitizeSpecialty(body.specialty),
          s(body.instagramUrl) || null,
          n(body.instagramViews)
        ).run();

        return json({ ok: true, id }, 200, cors);
      } catch (e) {
        console.error("POST /thumbnails failed:", e?.stack || e?.message || e);
        return json({ error: e?.message || "Thumbnail create failed" }, e?.status || 500, cors);
      }
    }

    /* ======================= /thumbnails (admin CRUD) ======================= */
    const THUMB_FIELDS = new Set([
      "filename", "youtubeUrl", "category", "subcategory", "variant",
      "imageUrl", "videoId", "youtubeViews", "viewStatus",
      "lastViewUpdate", "attributedTo", "isShinel", "isVisibleOnPersonal",
      "specialty", "instagramUrl", "instagramViews",
    ]);

    if (url.pathname.startsWith("/thumbnails/") && request.method === "PUT") {
      try {
        await requireTeamOrThrow(request, secret);
        const id = decodeURIComponent(url.pathname.split("/")[2] || "");
        const updates = await request.json().catch((e) => { console.warn(`bad json body @ ${url.pathname}:`, e?.message || e); return {}; });

        const fields = [];
        const params = [];
        for (const [key, val] of Object.entries(updates)) {
          if (!THUMB_FIELDS.has(key)) continue; // Whitelist check

          const dbKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
          fields.push(`${dbKey} = ?`);
          // Same NaN-safe coerce as the videos PUT handler.
          let bound = val;
          if (key === "specialty") {
            bound = sanitizeSpecialty(val);
          } else if (key === "instagramViews" || key === "youtubeViews") {
            const x = Number(val);
            bound = Number.isFinite(x) ? x : 0;
          }
          params.push(bound);
        }

        if (fields.length === 0) return json({ error: "No valid fields to update" }, 400, cors);

        params.push(new Date().toISOString(), id);

        await env.DB.prepare(
          `UPDATE inventory_thumbnails SET ${fields.join(", ")}, last_updated = ? WHERE id = ?`
        ).bind(...params).run();

        return json({ ok: true }, 200, cors);
      } catch (e) { 
        return json({ error: "Update failed: " + (e.message || "Unknown error") }, 500, cors); 
      }
    }

    // DELETE /thumbnails/bulk  — body: { ids: string[] }
    // Matched BEFORE the single-row handler below (same prefix-routing concern).
    if (url.pathname === "/thumbnails/bulk" && request.method === "DELETE") {
      try {
        await requireTeamOrThrow(request, secret, env);
        if (!env.DB) return json({ error: "DB binding missing" }, 501, cors);

        const body = await request.json().catch((e) => { console.warn(`bad json body @ ${url.pathname}:`, e?.message || e); return {}; });
        const rawIds = Array.isArray(body?.ids) ? body.ids : [];
        const ids = [...new Set(rawIds.map((v) => String(v || "").trim()).filter(Boolean))].slice(0, 200);
        if (ids.length === 0) return json({ error: "ids array required" }, 400, cors);

        const placeholders = ids.map(() => "?").join(",");

        try {
          await env.DB.prepare(
            `DELETE FROM media_collection_items WHERE media_type = 'thumbnail' AND media_id IN (${placeholders})`
          ).bind(...ids).run();
        } catch (joinErr) {
          console.warn("bulk thumbnail delete: join cleanup failed (continuing):", joinErr?.message || joinErr);
        }

        const res = await env.DB.prepare(
          `DELETE FROM inventory_thumbnails WHERE id IN (${placeholders})`
        ).bind(...ids).run();

        return json({ ok: true, deleted: res.meta?.changes ?? ids.length, ids }, 200, cors);
      } catch (e) {
        console.error("DELETE /thumbnails/bulk failed:", e?.stack || e?.message || e);
        return json({ error: e?.message || "Bulk delete failed" }, e?.status || 500, cors);
      }
    }

    if (url.pathname.startsWith("/thumbnails/") && request.method === "DELETE") {
      try {
        await requireTeamOrThrow(request, secret, env);
        const id = decodeURIComponent(url.pathname.split("/")[2] || "");
        if (!id) return json({ error: "Thumbnail id required" }, 400, cors);
        if (!env.DB) return json({ error: "DB binding missing" }, 501, cors);

        try {
          await env.DB.prepare(
            "DELETE FROM media_collection_items WHERE media_id = ? AND media_type = 'thumbnail'"
          ).bind(id).run();
        } catch (joinErr) {
          console.warn("DELETE /thumbnails: join-table cleanup failed (continuing):", joinErr?.message || joinErr);
        }

        await env.DB.prepare("DELETE FROM inventory_thumbnails WHERE id = ?").bind(id).run();
        return json({ ok: true, id }, 200, cors);
      } catch (e) {
        console.error("DELETE /thumbnails failed:", e?.stack || e?.message || e);
        return json({ error: e?.message || "Delete failed" }, e?.status || 500, cors);
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

    /* ----------------------------- GET /admin/team-activity -----------------------------
     * Per-day creation count for the last N days (default 84 = 12 weeks),
     * grouped by team-member (attributed_to). Drives the heatmap on the
     * admin dashboard.
     *
     * Returns:
     *   { days: ["YYYY-MM-DD", …], members: [{ email, total, byDay: { "YYYY-MM-DD": n } }] }
     *
     * Single roundtrip: SQL UNION across inventory_videos + inventory_thumbnails
     * grouped at the DB. Cheap; runs once per dashboard load.
     */
    if (url.pathname === "/admin/team-activity" && request.method === "GET") {
      try {
        await requireAdminOrThrow(request, secret, env);
        if (!env.DB) return json({ error: "DB binding missing" }, 501, cors);

        const days = Math.min(Math.max(Number(url.searchParams.get("days") || 84), 7), 365);
        const sinceMs = Date.now() - days * 86_400_000;
        const sinceIso = new Date(sinceMs).toISOString();

        const sql = `
          SELECT attributed_to AS who, substr(date_added, 1, 10) AS day, COUNT(*) AS n
            FROM inventory_videos
           WHERE date_added >= ? AND attributed_to IS NOT NULL AND attributed_to != ''
           GROUP BY attributed_to, day
          UNION ALL
          SELECT attributed_to AS who, substr(date_added, 1, 10) AS day, COUNT(*) AS n
            FROM inventory_thumbnails
           WHERE date_added >= ? AND attributed_to IS NOT NULL AND attributed_to != ''
           GROUP BY attributed_to, day
        `;
        const { results } = await env.DB.prepare(sql).bind(sinceIso, sinceIso).all();

        // Build the day axis (oldest → newest).
        const dayList = [];
        const startDate = new Date(sinceMs);
        startDate.setUTCHours(0, 0, 0, 0);
        for (let i = 0; i < days; i++) {
          const d = new Date(startDate);
          d.setUTCDate(d.getUTCDate() + i);
          dayList.push(d.toISOString().slice(0, 10));
        }

        // Aggregate rows by member.
        const byMember = {};
        for (const r of (results || [])) {
          const who = String(r.who || "").toLowerCase();
          const day = String(r.day || "").slice(0, 10);
          const n = Number(r.n || 0);
          if (!who || !day || !n) continue;
          if (!byMember[who]) byMember[who] = { email: who, total: 0, byDay: {} };
          byMember[who].byDay[day] = (byMember[who].byDay[day] || 0) + n;
          byMember[who].total += n;
        }

        const members = Object.values(byMember).sort((a, b) => b.total - a.total);
        return json({ ok: true, days: dayList, members }, 200, cors);
      } catch (e) {
        console.error("GET /admin/team-activity:", e?.stack || e?.message || e);
        return json({ error: e?.message || "Failed" }, e?.status || 500, cors);
      }
    }

    /* ------------------------------- blog ------------------------------- */
    // GET /blog/posts - Public list (drafts hidden unless authenticated team)
    // NOTE: Blog markdown is rendered client-side via react-markdown WITHOUT rehype-raw,
    // so HTML in `content` is sanitized by default. Any PR adding rehype-raw MUST add
    // explicit HTML sanitization (e.g. rehype-sanitize) first.
    if (url.pathname === "/blog/posts" && request.method === "GET") {
      const posts = await env.SHINEL_AUDIT.get("app:blog:posts", "json") || [];
      let isAuthedTeam = false;
      if (url.searchParams.has("admin")) {
        try {
          await requireTeamOrThrow(request, secret, env);
          isAuthedTeam = true;
        } catch { /* fall through to public */ }
      }
      const result = isAuthedTeam ? posts : posts.filter(p => p.status === 'published');
      result.sort((a, b) => new Date(b.date) - new Date(a.date));
      return json({ posts: result }, 200, cors);
    }

    // GET /blog/posts/:slug - Single post (drafts hidden from public)
    if (url.pathname.match(/^\/blog\/posts\/([^/]+)$/) && request.method === "GET") {
      const slug = url.pathname.split("/").pop();
      const posts = await env.SHINEL_AUDIT.get("app:blog:posts", "json") || [];
      const post = posts.find(p => p.slug === slug);
      if (!post) return json({ error: "Post not found" }, 404, cors);
      // Drafts are only visible to authenticated team members.
      if (post.status !== "published") {
        try {
          await requireTeamOrThrow(request, secret, env);
        } catch {
          return json({ error: "Post not found" }, 404, cors);
        }
      }
      return json({ post }, 200, cors);
    }

    // POST /blog/posts (Admin) - Create/Update
    if (url.pathname === "/blog/posts" && request.method === "POST") {
      try {
        await requireAdminOrThrow(request, secret, env);
        const contentLen = Number(request.headers.get("content-length") || 0);
        if (contentLen > 512 * 1024) return json({ error: "Payload too large" }, 413, cors);
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

    /* -------------------------- Instagram DP Cache -------------------------- */
    if (url.pathname === "/api/ig-dp" && request.method === "GET") {
      try {
        const handle = url.searchParams.get("handle");
        if (!handle) return json({ error: "No handle provided" }, 400, cors);

        const key = `ig_dp_${handle}`;
        const buffer = await env.THUMBNAILS.get(key, "arrayBuffer");

        if (!buffer) {
          // Cache miss - the sync hasn't run yet after deploy, or the TTL expired
          return json({ error: "Instagram DP not cached. Please run a sync." }, 404, cors);
        }

        const headers = new Headers(cors);
        headers.set("Content-Type", "image/jpeg"); // Assume JPEG for IG DPs
        headers.set("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800"); // 1 day aggressive edge caching
        headers.set("Cross-Origin-Resource-Policy", "cross-origin");

        return new Response(buffer, {
          status: 200,
          headers
        });
      } catch (e) {
        return json({ error: "DP Cache error: " + e.message }, 500, cors);
      }
    }

    /* -------------------------- Image Proxy -------------------------- */
    if (url.pathname === "/api/proxy-image" && request.method === "GET") {
      try {
        // Per-IP burst cap: 120 req/min to prevent bandwidth abuse.
        if (await isRateLimited(env, ip, 60, 120, "proxyimg")) {
          return json({ error: "Too many requests" }, 429, cors);
        }
        const imageUrl = url.searchParams.get("url");
        if (!imageUrl) return json({ error: "No URL provided" }, 400, cors);

        const decodedUrl = imageUrl;
        const imgUrlObj = new URL(decodedUrl);

        // Stricter allowlist: only subdomains actually used. googleusercontent.com
        // broadly would cover arbitrary user uploads (Drive/Photos); scope it down.
        const exactOrSuffixHosts = [
          "fbcdn.net", "instagram.com", "cdninstagram.com", "ggpht.com", "ytimg.com",
        ];
        const exactHosts = [
          "lh3.googleusercontent.com", "lh4.googleusercontent.com",
          "lh5.googleusercontent.com", "lh6.googleusercontent.com",
          "yt3.googleusercontent.com", "yt4.googleusercontent.com",
        ];
        const hostname = imgUrlObj.hostname.toLowerCase();
        const isSafe =
          exactHosts.includes(hostname) ||
          exactOrSuffixHosts.some(d => hostname === d || hostname.endsWith("." + d));
        if (!isSafe) {
          return json({ error: "Domain not allowed" }, 403, cors);
        }

        // Optional HMAC signature to prevent open-proxy abuse. Enabled when PROXY_SECRET is set.
        // Clients must pass ?sig=<hmac-sha256(url, PROXY_SECRET)>. Legacy callers (no secret
        // configured) continue working unchanged.
        if (env.PROXY_SECRET) {
          const sig = url.searchParams.get("sig") || "";
          const expected = await hmacHex(env.PROXY_SECRET, decodedUrl);
          if (!sig || !timingSafeEqualHex(sig, expected)) {
            return json({ error: "Invalid signature" }, 403, cors);
          }
        }

        const imgRes = await fetch(decodedUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
            "Accept": "image/*"
          },
          cf: { cacheEverything: true, cacheTtl: 86400 }
        });

        if (!imgRes.ok) {
          return json({ error: `Downstream error: ${imgRes.status}` }, imgRes.status, cors);
        }

        const headers = new Headers(imgRes.headers);
        const contentType = headers.get("content-type") || "";
        if (!contentType.startsWith("image/")) {
          return json({ error: "Not an image response" }, 400, cors);
        }
        // Cap response size at 10 MB to bound bandwidth per request.
        const upstreamLen = Number(headers.get("content-length") || 0);
        if (upstreamLen && upstreamLen > 10 * 1024 * 1024) {
          return json({ error: "Image too large" }, 413, cors);
        }

        // Security & Bypass: Use validated origin for CORS
        const allowedOrigin = pickAllowedOrigin(origin, allowedOrigins);
        if (allowedOrigin) {
          headers.set("Access-Control-Allow-Origin", allowedOrigin);
        }
        headers.set("Cross-Origin-Resource-Policy", "cross-origin");
        headers.set("Cache-Control", "public, max-age=86400"); // 1 day
        // Strip problematic headers
        headers.delete("content-security-policy");
        headers.delete("x-frame-options");

        return new Response(imgRes.body, {
          status: 200,
          headers
        });
      } catch (e) {
        return json({ error: "Proxy error: " + e.message }, 500, cors);
      }
    }

    /* -------------------------- Media Hub (R2 Storage) --------------------------
     * Auth: any authenticated user (team / admin / editor / artist / client).
     * Editors and artists need this for their /me avatar upload; team gets the
     * larger cap for editorial work. */
    if (url.pathname === "/api/media/upload" && request.method === "POST") {
      try {
        const uploader = await requireAuthOrThrow(request, secret, env);
        const role = String(uploader?.role || "").toLowerCase();
        const isTeam = role === "team" || role === "admin" ||
          role.split(",").map(s => s.trim()).some(r => r === "team" || r === "admin");
        const maxBytes = isTeam ? 10 * 1024 * 1024 : 4 * 1024 * 1024;
        const maxLabel = isTeam ? "10 MB" : "4 MB";

        // Hard cap on upload size before parsing multipart.
        const contentLen = Number(request.headers.get("content-length") || 0);
        if (contentLen > maxBytes) {
          return json({ error: `File too large (max ${maxLabel})` }, 413, cors);
        }

        const formData = await request.formData();
        const file = formData.get("file");
        if (!file) return json({ error: "No file uploaded" }, 400, cors);

        // Magic-byte sniff: don't trust client-provided file.type.
        const headBuf = new Uint8Array(await file.slice(0, 16).arrayBuffer());
        const headHex = Array.from(headBuf).map(b => b.toString(16).padStart(2, "0")).join("");
        const magic = [
          { pfx: "ffd8ff",   mime: "image/jpeg", ext: "jpg", kind: "image" },
          { pfx: "89504e47", mime: "image/png",  ext: "png", kind: "image" },
          { pfx: "47494638", mime: "image/gif",  ext: "gif", kind: "image" },
          { pfx: "52494646", mime: "image/webp", ext: "webp", kind: "image" }, // RIFF container; good enough
          { pfx: "25504446", mime: "application/pdf", ext: "pdf", kind: "other" },
          { pfx: "00000018", mime: "video/mp4",  ext: "mp4", kind: "video" },
          { pfx: "00000020", mime: "video/mp4",  ext: "mp4", kind: "video" },
          { pfx: "1a45dfa3", mime: "video/webm", ext: "webm", kind: "video" },
        ];
        const match = magic.find(m => headHex.startsWith(m.pfx));
        if (!match) {
          return json({ error: "Unsupported file type" }, 415, cors);
        }

        const id = crypto.randomUUID();
        const extension = match.ext;
        const fileName = `${id}.${extension}`;
        const key = `media/${fileName}`;

        // Sanitize provided title/filename for DB storage.
        const safeTitle = String(file.name || "")
          .replace(/[^a-zA-Z0-9._-]/g, "_")
          .slice(-120) || fileName;

        // Storage strategy: write the file bytes to the THUMBNAILS KV
        // namespace (already bound + part of the free tier). Replaces R2
        // — R2 wasn't activated on the account and the user chose not to
        // enable it. KV value cap is 25MB; we already reject >10MB above,
        // so fits comfortably. KV free tier: 1000 writes/day (= 1000 uploads/day)
        // and 100k reads/day, well above this site's traffic.
        //
        // Key format:  media:<uuid>.<ext>    (media-prefixed so we can later
        // list/GC without colliding with other THUMBNAILS entries).
        if (!env.THUMBNAILS) {
          return json({ error: "Storage namespace missing (THUMBNAILS KV unbound)" }, 503, cors);
        }

        const kvKey = `media:${fileName}`;
        try {
          const bytes = await file.arrayBuffer();
          await env.THUMBNAILS.put(kvKey, bytes, {
            metadata: {
              contentType: match.mime,
              kind: match.kind,
              originalName: safeTitle,
              uploadedAt: Date.now(),
            },
          });
        } catch (kvErr) {
          console.error("KV upload failed:", kvErr?.stack || kvErr?.message || kvErr);
          return json({ error: "Storage write failed. Please try again." }, 502, cors);
        }

        if (env.DB) {
          try {
            await env.DB.prepare(
              "INSERT INTO media_library (id, r2_key, title, type, category, status) VALUES (?, ?, ?, ?, ?, ?)"
            ).bind(id, kvKey, safeTitle, match.kind, 'UPLOAD', 'available').run();
          } catch (e) { console.error("D1 Media Insert Error:", e.message); }
        }

        return json({ ok: true, id, url: `/api/media/view/${fileName}`, key: kvKey, status: "available" }, 200, cors);
      } catch (e) {
        return json({ error: e.message }, e.status || 500, cors);
      }
    }

    if (url.pathname.startsWith("/api/media/view/") && request.method === "GET") {
      try {
        const fileName = url.pathname.replace("/api/media/view/", "");
        if (!fileName || fileName.includes("/")) {
          return json({ error: "Invalid filename" }, 400, cors);
        }

        // KV-backed serving (see /api/media/upload). Key format media:<file>.
        // Uses getWithMetadata so we recover the original Content-Type even
        // though KV has no native http metadata layer like R2. Long browser
        // cache headers keep KV read count low — CDN + browser caches absorb
        // repeat loads.
        if (!env.THUMBNAILS) {
          return json({ error: "Storage namespace missing" }, 503, cors);
        }

        const obj = await env.THUMBNAILS.getWithMetadata(`media:${fileName}`, "arrayBuffer");
        if (!obj || !obj.value) {
          // Inventory rows occasionally outlive their KV bytes (admin
          // deletes, KV write race lost, manual cleanup). Returning a JSON
          // 404 made every <img> show a broken icon and dirtied the console
          // on /work. Serve a tiny inline SVG placeholder instead — same
          // visual treatment as item.image fallbacks, and the response
          // is a real 200 so the browser stops complaining. Short TTL so
          // re-uploads under the same UUID resolve cleanly.
          const placeholder =
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400" preserveAspectRatio="xMidYMid slice">' +
            '<rect width="100%" height="100%" fill="#1a1a1a"/>' +
            '<text x="50%" y="50%" font-family="system-ui,sans-serif" font-size="22" font-weight="700" fill="#666" text-anchor="middle" dominant-baseline="middle" letter-spacing="3">NO PREVIEW</text>' +
            '</svg>';
          return new Response(placeholder, {
            status: 200,
            headers: {
              ...cors,
              "Content-Type": "image/svg+xml; charset=utf-8",
              "Cache-Control": "public, max-age=300",
              "X-Placeholder": "missing-media",
            },
          });
        }

        const contentType = obj.metadata?.contentType || "application/octet-stream";
        const headers = new Headers(cors);
        headers.set("Content-Type", contentType);
        headers.set("Cache-Control", "public, max-age=31536000, immutable");
        headers.set("Access-Control-Allow-Origin", "*");

        return new Response(obj.value, { headers });
      } catch (e) {
        console.error("GET /api/media/view failed:", e?.stack || e?.message || e);
        return json({ error: "Fetch failed" }, 500, cors);
      }
    }

    // Mirror external media to R2
    if (url.pathname === "/api/media/archive-external" && request.method === "POST") {
      try {
        await requireTeamOrThrow(request, secret, env);
        const { url: targetUrl, category } = await request.json();

        // Strict URL validation: only accept YouTube hosts, no shell-metacharacter smuggling.
        // Defense-in-depth — the mirror-service also validates, but rejecting here means a
        // bad URL never hits the D1 pending_mirror queue in the first place.
        if (!isSafeYouTubeUrl(targetUrl)) {
          return json({ error: "Only YouTube URLs are accepted" }, 400, cors);
        }
        const vId = ytIdFrom(targetUrl);
        if (!vId) return json({ error: "Invalid YouTube URL" }, 400, cors);

        // Fetch details from YouTube
        const details = await fetchYouTubeVideoDetails(env, vId);
        const id = crypto.randomUUID();

        await env.DB.prepare(
          "INSERT INTO media_library (id, source_url, title, type, category, status, channel_title, thumbnail_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        ).bind(
          id, targetUrl, details.title || `Archive: ${vId}`, 'video', category || 'UNCATEGORIZED', 'pending_mirror',
          details.channelTitle || '', details.thumbnails?.high?.url || ''
        ).run();

        return json({
          ok: true,
          id,
          status: "pending_mirror",
          title: details.title,
          thumbnailUrl: details.thumbnails?.high?.url
        }, 200, cors);
      } catch (e) { return json({ error: e.message }, e.status || 500, cors); }
    }

    // GET /api/media/library - List entries
    if (url.pathname === "/api/media/library" && request.method === "GET") {
      try {
        await requireTeamOrThrow(request, secret);
        const limit = parseInt(url.searchParams.get("limit") || "50");
        const offset = parseInt(url.searchParams.get("offset") || "0");
        const type = url.searchParams.get("type");
        const search = url.searchParams.get("search");

        if (!env.DB) return json({ error: "Database not configured" }, 501, cors);

        let query = "SELECT * FROM media_library";
        const params = [];

        const conditions = [];
        if (type && type !== "ALL") {
          conditions.push("type = ?");
          params.push(type.toLowerCase());
        }
        if (search) {
          conditions.push("(title LIKE ? OR category LIKE ?)");
          params.push(`%${search}%`, `%${search}%`);
        }

        if (conditions.length > 0) {
          query += " WHERE " + conditions.join(" AND ");
        }

        query += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
        params.push(limit, offset);

        const { results } = await env.DB.prepare(query).bind(...params).all();
        
        // Convert to camelCase
        const list = results.map(item => ({
          id: item.id,
          sourceUrl: item.source_url,
          mirrorUrl: item.mirror_url,
          r2Key: item.r2_key,
          title: item.title,
          thumbnailUrl: item.thumbnail_url,
          type: item.type,
          category: item.category,
          status: item.status,
          viewCount: item.view_count || 0,
          duration: item.duration,
          channelTitle: item.channel_title,
          createdAt: item.created_at,
          updatedAt: item.updated_at
        }));

        // Count for pagination
        let countQuery = "SELECT COUNT(*) as total FROM media_library";
        const countParams = [];
        if (conditions.length > 0) {
          countQuery += " WHERE " + conditions.join(" AND ");
          countParams.push(...params.slice(0, -2));
        }
        const { results: countResult } = await env.DB.prepare(countQuery).bind(...countParams).all();

        return json({ ok: true, items: list, total: countResult[0].total }, 200, cors);
      } catch (e) {
        return json({ error: e.message }, 500, cors);
      }
    }

    // POST /api/media/bulk-archive - Batch mirror
    if (url.pathname === "/api/media/bulk-archive" && request.method === "POST") {
      try {
        await requireTeamOrThrow(request, secret);
        const { urls, category } = await request.json();
        if (!Array.isArray(urls)) return json({ error: "Expected array of URLs" }, 400, cors);

        const results = [];
        for (const targetUrl of urls) {
          try {
            const videoId = ytIdFrom(targetUrl);
            let ytDetails = {};
            if (videoId) ytDetails = await fetchYouTubeVideoDetails(env, videoId);

            const mediaToFetch = videoId ? (ytDetails.thumbnail || targetUrl) : targetUrl;
            const res = await fetch(mediaToFetch);
            if (!res.ok) {
              results.push({ url: targetUrl, ok: false, error: `HTTP ${res.status}` });
              continue;
            }
            const contentType = res.headers.get("content-type");
            const id = crypto.randomUUID();
            const extension = contentType?.split('/')?.pop()?.split(';')?.[0] || "bin";
            const fileName = `${id}.${extension}`;
            const key = `media:${fileName}`;

            // KV-backed storage (same strategy as /api/media/upload). Skip storing
            // if the value would exceed KV's 25MB cap — fall back to pointer-only
            // mode where source_url stays the authoritative link.
            const bytes = await res.arrayBuffer();
            let stored = false;
            if (bytes.byteLength <= 24 * 1024 * 1024 && env.THUMBNAILS) {
              try {
                await env.THUMBNAILS.put(key, bytes, {
                  metadata: { contentType, kind: videoId ? 'video-thumb' : 'image', sourceUrl: targetUrl, uploadedAt: Date.now() },
                });
                stored = true;
              } catch (kvErr) {
                console.warn("bulk-archive KV write failed, storing pointer only:", kvErr?.message || kvErr);
              }
            }

            if (env.DB) {
              await env.DB.prepare(
                "INSERT INTO media_library (id, source_url, r2_key, title, type, category, status, view_count, duration, channel_title, last_metric_update) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
              ).bind(
                id, targetUrl, stored ? key : null, ytDetails.title || targetUrl.split('/').pop(), videoId ? 'video' : 'image', category || 'BULK', 'available',
                Number(ytDetails.views || 0), ytDetails.duration || null, ytDetails.channelTitle || null, videoId ? new Date().toISOString() : null
              ).run();
            }
            results.push({ url: targetUrl, ok: true, id, archivedUrl: stored ? `/api/media/view/${fileName}` : targetUrl });
          } catch (e) {
            results.push({ url: targetUrl, ok: false, error: e.message });
          }
        }
        return json({ ok: true, results }, 200, cors);
      } catch (e) {
        return json({ error: e.message }, 500, cors);
      }
    }

    // POST /api/media/refresh-metrics - Update all metrics
    if (url.pathname === "/api/media/refresh-metrics" && request.method === "POST") {
      try {
        await requireTeamOrThrow(request, secret);
        if (!env.DB) return json({ error: "DB missing" }, 501, cors);

        const { results: items } = await env.DB.prepare("SELECT id, source_url FROM media_library WHERE type = 'video'").all();
        let updated = 0;

        for (const item of items) {
          const videoId = ytIdFrom(item.source_url);
          if (videoId) {
            const stats = await fetchYouTubeVideoDetails(env, videoId);
            if (!stats.error) {
              await env.DB.prepare(
                "UPDATE media_library SET view_count = ?, duration = ?, channel_title = ?, last_metric_update = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
              ).bind(Number(stats.views || 0), stats.duration || null, stats.channelTitle || null, new Date().toISOString(), item.id).run();
              updated++;
            }
          }
        }
        return json({ ok: true, updated }, 200, cors);
      } catch (e) {
        return json({ error: e.message }, 500, cors);
      }
    }

    // --- Media Collections System ---
    if (url.pathname === "/api/collections" && request.method === "GET") {
      try {
        await requireTeamOrThrow(request, secret);
        const { results } = await env.DB.prepare("SELECT * FROM media_collections ORDER BY created_at DESC").all();
        return json({ ok: true, collections: results }, 200, cors);
      } catch (e) { return json({ error: e.message }, 500, cors); }
    }

    if (url.pathname === "/api/collections" && request.method === "POST") {
      try {
        const user = await requireTeamOrThrow(request, secret);
        const { name, description } = await request.json().catch((e) => { console.warn(`bad json body @ ${url.pathname}:`, e?.message || e); return {}; });
        if (!name) return json({ error: "Name required" }, 400, cors);

        const id = crypto.randomUUID();
        await env.DB.prepare(
          "INSERT INTO media_collections (id, name, description, created_by) VALUES (?, ?, ?, ?)"
        ).bind(id, name, description || "", user.email).run();

        return json({ ok: true, id }, 200, cors);
      } catch (e) { return json({ error: e.message }, 500, cors); }
    }

    if (url.pathname.startsWith("/api/collections/") && url.pathname.endsWith("/items") && request.method === "POST") {
      try {
        await requireTeamOrThrow(request, secret);
        const collectionId = url.pathname.split("/")[3];
        const { mediaId, mediaType } = await request.json().catch((e) => { console.warn(`bad json body @ ${url.pathname}:`, e?.message || e); return {}; });
        if (!mediaId || !mediaType) return json({ error: "mediaId and mediaType required" }, 400, cors);

        await env.DB.prepare(
          "INSERT OR IGNORE INTO media_collection_items (collection_id, media_id, media_type) VALUES (?, ?, ?)"
        ).bind(collectionId, mediaId, mediaType).run();

        return json({ ok: true }, 200, cors);
      } catch (e) { return json({ error: e.message }, 500, cors); }
    }

    if (url.pathname.match(/\/api\/collections\/([^/]+)\/items\/([^/]+)/) && request.method === "DELETE") {
      try {
        await requireTeamOrThrow(request, secret);
        const parts = url.pathname.split("/");
        const collectionId = parts[3];
        const mediaId = parts[5];

        await env.DB.prepare(
          "DELETE FROM media_collection_items WHERE collection_id = ? AND media_id = ?"
        ).bind(collectionId, mediaId).run();

        return json({ ok: true }, 200, cors);
      } catch (e) { return json({ error: e.message }, 500, cors); }
    }

    if (url.pathname.match(/\/api\/collections\/([^/]+)$/) && request.method === "GET") {
      try {
        await requireTeamOrThrow(request, secret);
        const id = url.pathname.split("/").pop();
        const collection = await env.DB.prepare("SELECT * FROM media_collections WHERE id = ?").bind(id).first();
        if (!collection) return json({ error: "Not found" }, 404, cors);

        const { results: items } = await env.DB.prepare(
          "SELECT ml.*, mci.media_type, mci.added_at FROM media_collection_items mci LEFT JOIN media_library ml ON mci.media_id = ml.id WHERE mci.collection_id = ? AND mci.media_type = 'library'"
        ).bind(id).all();

        // Add support for other media types if needed (inventory_videos, etc)
        
        return json({ ok: true, collection, items }, 200, cors);
      } catch (e) { return json({ error: e.message }, 500, cors); }
    }

    // DELETE /api/media/delete/:id - Remove item
    if (url.pathname.startsWith("/api/media/delete/") && request.method === "DELETE") {
      try {
        await requireTeamOrThrow(request, secret);
        const id = url.pathname.split("/").pop();
        if (!id) return json({ error: "Missing ID" }, 400, cors);

        if (env.DB) {
          const { results } = await env.DB.prepare("SELECT r2_key FROM media_library WHERE id = ?").bind(id).all();
          if (results && results[0]) {
            const key = results[0].r2_key;
            // Key format: "media:<file>" (new KV strategy) or legacy "media/<file>"
            // or "archived/<file>" from the old R2 writes. Delete from whichever
            // store it lives in; best-effort so a missing file doesn't block the
            // D1 row cleanup.
            try {
              if (key && key.startsWith("media:") && env.THUMBNAILS) {
                await env.THUMBNAILS.delete(key);
              } else if (env.MEDIA_STORAGE) {
                await env.MEDIA_STORAGE.delete(key);
              }
            } catch (storeErr) {
              console.warn("media delete: storage cleanup failed (continuing):", storeErr?.message || storeErr);
            }
            await env.DB.prepare("DELETE FROM media_library WHERE id = ?").bind(id).run();
            return json({ ok: true }, 200, cors);
          }
        }
        return json({ error: "Item not found" }, 404, cors);
      } catch (e) {
        return json({ error: e.message }, 500, cors);
      }
    }

    /* --------------------------- web-vitals beacon ---------------------------
     * POST /api/metrics/pageview  — public, rate-limited, append-only.
     *   Body: { path, m: { lcp, cls, inp, fcp, ttfb }, conn, dpr }
     *   Stores into KV key `metrics:YYYY-MM-DD` as a capped list (5000/day).
     *   No cookies, no PII — just path + anonymous perf numbers.
     *
     * GET /api/metrics/summary?days=7  — team-gated aggregate.
     *   Returns per-path pageview counts + p75 of each vital, plus overall.
     * ---------------------------------------------------------------------- */
    if (url.pathname === "/api/metrics/pageview" && request.method === "POST") {
      try {
        const contentLen = Number(request.headers.get("content-length") || 0);
        if (contentLen > 2 * 1024) return json({ error: "Payload too large" }, 413, cors);

        // SAMPLING — was 1:1 (one KV write per pageview), which torches the
        // free-tier 1000 writes/day quota in a few hundred visitors and
        // takes down /auth/login + /clients/pulse with "KV put() limit
        // exceeded for the day". Now: accept every beacon, persist 1 in 10
        // (10%). p75/p95 percentiles stay statistically meaningful at this
        // sample rate; the ~10x quota relief is the win. To recover from a
        // burned quota, bump SAMPLE_RATE down further or set to 0.
        const SAMPLE_RATE = 0.1;
        if (Math.random() > SAMPLE_RATE) {
          return json({ ok: true, sampled: false }, 202, cors);
        }

        // Skip the rate-limit KV write for the sampled-out 90% — only the
        // sampled-in 10% ever reach this point, which is well under the
        // 120 beacons / 10 min cap anyway.
        if (await isRateLimited(env, ip, 600, 120, "pv")) {
          return json({ ok: false, throttled: true }, 202, cors);
        }
        const body = await request.json().catch((e) => {
          console.warn(`bad json body @ ${url.pathname}:`, e?.message || e);
          return null;
        });
        if (!body || typeof body !== "object") {
          return json({ error: "Invalid body" }, 400, cors);
        }
        const path = String(body.path || "/").slice(0, 128);
        const m = (body.m && typeof body.m === "object") ? body.m : {};
        const entry = {
          ts: Date.now(),
          path,
          lcp: Number.isFinite(+m.lcp) ? Math.round(+m.lcp) : null,
          cls: Number.isFinite(+m.cls) ? +(+m.cls).toFixed(4) : null,
          inp: Number.isFinite(+m.inp) ? Math.round(+m.inp) : null,
          fcp: Number.isFinite(+m.fcp) ? Math.round(+m.fcp) : null,
          ttfb: Number.isFinite(+m.ttfb) ? Math.round(+m.ttfb) : null,
          conn: String(body.conn || "").slice(0, 8),
          dpr: Number.isFinite(+body.dpr) ? +(+body.dpr).toFixed(1) : null,
          sampleRate: SAMPLE_RATE,  // store so /metrics/summary can scale counts back up
        };
        const dateKey = `metrics:${new Date(entry.ts).toISOString().slice(0, 10)}`;
        const existing = await env.SHINEL_AUDIT.get(dateKey, "json") || { entries: [] };
        const entries = Array.isArray(existing.entries) ? existing.entries : [];
        entries.push(entry);
        // Cap per-day list so a bad day can't blow past the KV size guard.
        const capped = entries.length > 5000 ? entries.slice(-5000) : entries;
        try {
          await putJsonGuarded(env.SHINEL_AUDIT, dateKey, { entries: capped });
        } catch (e) {
          console.error("metrics put failed:", e?.message || e);
          return json({ ok: false, error: "store failed" }, 507, cors);
        }
        return json({ ok: true }, 202, cors);
      } catch (e) {
        console.error("POST /api/metrics/pageview:", e?.stack || e?.message || e);
        return json({ ok: false }, 500, cors);
      }
    }

    if (url.pathname === "/api/metrics/summary" && request.method === "GET") {
      try {
        await requireTeamOrThrow(request, secret, env);
        const days = Math.min(Math.max(Number(url.searchParams.get("days") || 7), 1), 30);
        const now = new Date();
        const dayKeys = [];
        for (let i = 0; i < days; i++) {
          const d = new Date(now);
          d.setUTCDate(d.getUTCDate() - i);
          dayKeys.push(`metrics:${d.toISOString().slice(0, 10)}`);
        }
        const results = await Promise.all(
          dayKeys.map((k) => env.SHINEL_AUDIT.get(k, "json").catch(() => null))
        );
        const all = [];
        const perDay = {};
        for (let i = 0; i < dayKeys.length; i++) {
          const dateStr = dayKeys[i].slice("metrics:".length);
          const row = results[i];
          const entries = (row && Array.isArray(row.entries)) ? row.entries : [];
          perDay[dateStr] = entries.length;
          for (const e of entries) all.push(e);
        }
        // Group by path.
        const byPath = {};
        for (const e of all) {
          const p = e.path || "/";
          if (!byPath[p]) byPath[p] = { path: p, views: 0, lcp: [], cls: [], inp: [], fcp: [], ttfb: [] };
          const b = byPath[p];
          b.views++;
          ["lcp", "cls", "inp", "fcp", "ttfb"].forEach((k) => {
            if (Number.isFinite(e[k])) b[k].push(e[k]);
          });
        }
        const p75 = (arr) => {
          if (!arr || arr.length === 0) return null;
          const sorted = [...arr].sort((a, b) => a - b);
          return sorted[Math.floor(sorted.length * 0.75)];
        };
        const paths = Object.values(byPath).map((b) => ({
          path: b.path,
          views: b.views,
          lcpP75: p75(b.lcp),
          clsP75: p75(b.cls),
          inpP75: p75(b.inp),
          fcpP75: p75(b.fcp),
          ttfbP75: p75(b.ttfb),
        })).sort((a, b) => b.views - a.views);
        const overall = {
          totalViews: all.length,
          lcpP75: p75(all.map(e => e.lcp).filter(Number.isFinite)),
          clsP75: p75(all.map(e => e.cls).filter(Number.isFinite)),
          inpP75: p75(all.map(e => e.inp).filter(Number.isFinite)),
          fcpP75: p75(all.map(e => e.fcp).filter(Number.isFinite)),
          ttfbP75: p75(all.map(e => e.ttfb).filter(Number.isFinite)),
        };
        return json({ ok: true, days, perDay, paths, overall }, 200, cors);
      } catch (e) {
        console.error("GET /api/metrics/summary:", e?.stack || e?.message || e);
        return json({ error: e?.message || "Failed" }, e?.status || 500, cors);
      }
    }

    /* ------------------------------ channel audit ------------------------------
     * GET /api/channel-audit?handle=<@handle|UC…>
     *
     * Public-ish creator tool. Pulls channel snapshot + last 20 uploads and
     * returns a structured report the frontend scores into a CTR/consistency
     * scorecard + 3 fixes.
     *
     * Quota cost: 3 YouTube API units per audit (channels + playlistItems +
     * videos). Rate-limited per-IP to 5/15min → ~60 audits/IP/day worst-case,
     * well inside the 10K daily pool.
     * -------------------------------------------------------------------- */
    if (url.pathname === "/api/channel-audit" && request.method === "GET") {
      try {
        if (await isRateLimited(env, ip, 900, 5, "audit")) {
          return json({ error: "Too many audits. Try again in a few minutes." }, 429, cors);
        }
        const handle = String(url.searchParams.get("handle") || "").trim();
        if (!handle) return json({ error: "handle required" }, 400, cors);

        const channel = await fetchYouTubeChannelInfo(env, handle);
        if (channel.error) return json({ error: channel.error }, 502, cors);
        if (!channel.uploadsPlaylistId) {
          return json({ error: "Channel has no uploads playlist" }, 404, cors);
        }

        const apiKey = await getYoutubeKey(env);
        if (!apiKey) return json({ error: "YouTube quota exhausted — try later" }, 503, cors);

        // Last 20 uploads from the uploads playlist.
        const plApi = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&maxResults=20&playlistId=${encodeURIComponent(channel.uploadsPlaylistId)}&key=${encodeURIComponent(apiKey)}`;
        const plResp = await fetchWithRetry(plApi, { headers: { accept: "application/json" } });
        if (!plResp.ok) {
          return json({ error: `playlist fetch ${plResp.status}` }, 502, cors);
        }
        const plJson = await plResp.json().catch(() => ({}));
        const items = Array.isArray(plJson.items) ? plJson.items : [];
        const videoIds = items
          .map(i => i?.contentDetails?.videoId || i?.snippet?.resourceId?.videoId)
          .filter(Boolean);

        let videos = [];
        if (videoIds.length) {
          // Batch videos.list for stats + contentDetails (duration).
          const vApi = `https://www.googleapis.com/youtube/v3/videos?part=statistics,contentDetails,snippet&id=${encodeURIComponent(videoIds.join(","))}&key=${encodeURIComponent(apiKey)}`;
          const vResp = await fetchWithRetry(vApi, { headers: { accept: "application/json" } });
          if (vResp.ok) {
            const vJson = await vResp.json().catch(() => ({}));
            videos = (vJson.items || []).map((v) => ({
              id: v.id,
              title: v.snippet?.title || "",
              thumbnail: v.snippet?.thumbnails?.high?.url || v.snippet?.thumbnails?.medium?.url || "",
              publishedAt: v.snippet?.publishedAt || null,
              views: Number(v.statistics?.viewCount || 0),
              likes: Number(v.statistics?.likeCount || 0),
              comments: Number(v.statistics?.commentCount || 0),
              duration: v.contentDetails?.duration || "",
            }));
          }
        }

        // Sort newest-first (items arrive that way already, but be safe).
        videos.sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0));

        return json({
          ok: true,
          channel: {
            id: channel.id,
            title: channel.title,
            logo: channel.logo,
            handle: channel.handle,
            subscribers: channel.subscribers,
            viewCount: channel.viewCount,
            videoCount: channel.videoCount,
          },
          videos,
        }, 200, cors);
      } catch (e) {
        console.error("GET /api/channel-audit:", e?.stack || e?.message || e);
        return json({ error: e?.message || "Audit failed" }, e?.status || 500, cors);
      }
    }

    /* ----------------------------- testimonials -----------------------------
     * Simple KV-backed testimonial list, additive to the rich hardcoded
     * carousel on the homepage. Admins can add quote-style testimonials
     * (author, role, channel, quote, avatar) without touching code.
     *
     * Key: `app:testimonials:list`  →  { items: [...] }
     *
     * GET  /api/testimonials                    (public, all published)
     * GET  /api/testimonials/all                (team, includes drafts)
     * POST /api/testimonials                    (team, body={author,role,channel,quote,avatar,published})
     * PUT  /api/testimonials/:id                (team)
     * DELETE /api/testimonials/:id              (team)
     * ---------------------------------------------------------------------- */
    if (url.pathname === "/api/testimonials" && request.method === "GET") {
      try {
        const raw = await env.SHINEL_AUDIT.get("app:testimonials:list", "json") || { items: [] };
        const items = Array.isArray(raw.items) ? raw.items : [];
        // Public feed — only published ones, sorted newest-first.
        const published = items.filter(t => t && t.published !== false).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        return json({ ok: true, testimonials: published }, 200, {
          ...cors,
          "Cache-Control": "public, max-age=300", // 5-minute edge cache
        });
      } catch (e) {
        console.error("GET /api/testimonials:", e?.message || e);
        return json({ ok: true, testimonials: [] }, 200, cors);
      }
    }

    if (url.pathname === "/api/testimonials/all" && request.method === "GET") {
      try {
        await requireTeamOrThrow(request, secret, env);
        const raw = await env.SHINEL_AUDIT.get("app:testimonials:list", "json") || { items: [] };
        const items = Array.isArray(raw.items) ? raw.items : [];
        return json({ ok: true, testimonials: items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)) }, 200, cors);
      } catch (e) {
        return json({ error: e?.message || "Failed" }, e?.status || 500, cors);
      }
    }

    if (url.pathname === "/api/testimonials" && request.method === "POST") {
      try {
        await requireTeamOrThrow(request, secret, env);
        const body = await request.json().catch((e) => {
          console.warn(`bad json body @ ${url.pathname}:`, e?.message || e);
          return null;
        });
        if (!body || typeof body !== "object") return json({ error: "Invalid body" }, 400, cors);

        const s = (v, max) => clampStr(v, max).trim();
        const author = s(body.author, 80);
        const quote  = s(body.quote, 500);
        if (!author) return json({ error: "author required" }, 400, cors);
        if (!quote)  return json({ error: "quote required" }, 400, cors);

        const raw = await env.SHINEL_AUDIT.get("app:testimonials:list", "json") || { items: [] };
        const items = Array.isArray(raw.items) ? raw.items : [];
        if (items.length >= 50) return json({ error: "Cap reached (50). Delete one first." }, 409, cors);

        const now = Date.now();
        const entry = {
          id: `t_${now}_${Math.random().toString(36).slice(2, 8)}`,
          author,
          role: s(body.role, 80),
          channel: s(body.channel, 80),
          quote,
          avatar: s(body.avatar, 500),
          link: s(body.link, 500),
          published: body.published !== false,
          createdAt: now,
          updatedAt: now,
        };
        items.push(entry);
        await putJsonGuarded(env.SHINEL_AUDIT, "app:testimonials:list", { items });
        return json({ ok: true, testimonial: entry }, 201, cors);
      } catch (e) {
        console.error("POST /api/testimonials:", e?.message || e);
        return json({ error: e?.message || "Failed" }, e?.status || 500, cors);
      }
    }

    if (url.pathname.startsWith("/api/testimonials/") && request.method === "PUT") {
      try {
        await requireTeamOrThrow(request, secret, env);
        const id = decodeURIComponent(url.pathname.split("/")[3] || "");
        if (!id) return json({ error: "id required" }, 400, cors);
        const body = await request.json().catch((e) => {
          console.warn(`bad json body @ ${url.pathname}:`, e?.message || e);
          return null;
        });
        if (!body || typeof body !== "object") return json({ error: "Invalid body" }, 400, cors);

        const raw = await env.SHINEL_AUDIT.get("app:testimonials:list", "json") || { items: [] };
        const items = Array.isArray(raw.items) ? raw.items : [];
        const idx = items.findIndex(t => t && t.id === id);
        if (idx < 0) return json({ error: "not found" }, 404, cors);

        const s = (v, max) => clampStr(v, max).trim();
        const now = Date.now();
        const merged = {
          ...items[idx],
          author:  body.author !== undefined  ? s(body.author, 80)   : items[idx].author,
          role:    body.role !== undefined    ? s(body.role, 80)     : items[idx].role,
          channel: body.channel !== undefined ? s(body.channel, 80)  : items[idx].channel,
          quote:   body.quote !== undefined   ? s(body.quote, 500)   : items[idx].quote,
          avatar:  body.avatar !== undefined  ? s(body.avatar, 500)  : items[idx].avatar,
          link:    body.link !== undefined    ? s(body.link, 500)    : items[idx].link,
          published: body.published !== undefined ? body.published !== false : items[idx].published,
          updatedAt: now,
        };
        if (!merged.author || !merged.quote) {
          return json({ error: "author and quote are required" }, 400, cors);
        }
        items[idx] = merged;
        await putJsonGuarded(env.SHINEL_AUDIT, "app:testimonials:list", { items });
        return json({ ok: true, testimonial: merged }, 200, cors);
      } catch (e) {
        console.error("PUT /api/testimonials/:id:", e?.message || e);
        return json({ error: e?.message || "Failed" }, e?.status || 500, cors);
      }
    }

    if (url.pathname.startsWith("/api/testimonials/") && request.method === "DELETE") {
      try {
        await requireTeamOrThrow(request, secret, env);
        const id = decodeURIComponent(url.pathname.split("/")[3] || "");
        if (!id) return json({ error: "id required" }, 400, cors);
        const raw = await env.SHINEL_AUDIT.get("app:testimonials:list", "json") || { items: [] };
        const items = Array.isArray(raw.items) ? raw.items : [];
        const next = items.filter(t => t && t.id !== id);
        if (next.length === items.length) return json({ error: "not found" }, 404, cors);
        await putJsonGuarded(env.SHINEL_AUDIT, "app:testimonials:list", { items: next });
        return json({ ok: true, deleted: id }, 200, cors);
      } catch (e) {
        console.error("DELETE /api/testimonials/:id:", e?.message || e);
        return json({ error: e?.message || "Failed" }, e?.status || 500, cors);
      }
    }

    /* ----------------------------------------------------------------------
     * Hidden landing pages registry
     * Internal-only admin bookmark for one-page landings that live by direct
     * URL only (e.g. /live-templates) and aren't reachable via site nav.
     * Keeps them from getting "lost" — admin can see the full list, edit
     * notes, prune dead ones.
     *
     * Key: `app:landing-pages:list`  →  { items: [...] }
     *
     * GET    /api/landing-pages       (team)
     * POST   /api/landing-pages       (team, body={url,title,internalNote})
     * PUT    /api/landing-pages/:id   (team)
     * DELETE /api/landing-pages/:id   (team)
     * ---------------------------------------------------------------------- */
    if (url.pathname === "/api/landing-pages" && request.method === "GET") {
      try {
        await requireTeamOrThrow(request, secret, env);
        const raw = await env.SHINEL_AUDIT.get("app:landing-pages:list", "json") || { items: [] };
        const items = Array.isArray(raw.items) ? raw.items : [];
        return json({ ok: true, pages: items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)) }, 200, cors);
      } catch (e) {
        return json({ error: e?.message || "Failed" }, e?.status || 500, cors);
      }
    }

    if (url.pathname === "/api/landing-pages" && request.method === "POST") {
      try {
        await requireTeamOrThrow(request, secret, env);
        const body = await request.json().catch((e) => {
          console.warn(`bad json body @ ${url.pathname}:`, e?.message || e);
          return null;
        });
        if (!body || typeof body !== "object") return json({ error: "Invalid body" }, 400, cors);

        const s = (v, max) => clampStr(v, max).trim();
        const urlValue = s(body.url, 500);
        const title = s(body.title, 120);
        if (!urlValue) return json({ error: "url required" }, 400, cors);
        if (!title) return json({ error: "title required" }, 400, cors);
        if (!/^(\/|https?:\/\/)/i.test(urlValue)) {
          return json({ error: "url must start with / or https://" }, 400, cors);
        }

        const raw = await env.SHINEL_AUDIT.get("app:landing-pages:list", "json") || { items: [] };
        const items = Array.isArray(raw.items) ? raw.items : [];
        if (items.length >= 50) return json({ error: "Cap reached (50). Delete one first." }, 409, cors);

        const now = Date.now();
        const entry = {
          id: `lp_${now}_${Math.random().toString(36).slice(2, 8)}`,
          url: urlValue,
          title,
          internalNote: s(body.internalNote, 500),
          createdAt: now,
          updatedAt: now,
        };
        items.push(entry);
        await putJsonGuarded(env.SHINEL_AUDIT, "app:landing-pages:list", { items });
        return json({ ok: true, page: entry }, 201, cors);
      } catch (e) {
        console.error("POST /api/landing-pages:", e?.message || e);
        return json({ error: e?.message || "Failed" }, e?.status || 500, cors);
      }
    }

    if (url.pathname.startsWith("/api/landing-pages/") && request.method === "PUT") {
      try {
        await requireTeamOrThrow(request, secret, env);
        const id = decodeURIComponent(url.pathname.split("/")[3] || "");
        if (!id) return json({ error: "id required" }, 400, cors);
        const body = await request.json().catch((e) => {
          console.warn(`bad json body @ ${url.pathname}:`, e?.message || e);
          return null;
        });
        if (!body || typeof body !== "object") return json({ error: "Invalid body" }, 400, cors);

        const raw = await env.SHINEL_AUDIT.get("app:landing-pages:list", "json") || { items: [] };
        const items = Array.isArray(raw.items) ? raw.items : [];
        const idx = items.findIndex(t => t && t.id === id);
        if (idx < 0) return json({ error: "not found" }, 404, cors);

        const s = (v, max) => clampStr(v, max).trim();
        const now = Date.now();
        const merged = {
          ...items[idx],
          url:          body.url !== undefined          ? s(body.url, 500)          : items[idx].url,
          title:        body.title !== undefined        ? s(body.title, 120)        : items[idx].title,
          internalNote: body.internalNote !== undefined ? s(body.internalNote, 500) : items[idx].internalNote,
          updatedAt: now,
        };
        if (!merged.url || !merged.title) {
          return json({ error: "url and title are required" }, 400, cors);
        }
        if (!/^(\/|https?:\/\/)/i.test(merged.url)) {
          return json({ error: "url must start with / or https://" }, 400, cors);
        }
        items[idx] = merged;
        await putJsonGuarded(env.SHINEL_AUDIT, "app:landing-pages:list", { items });
        return json({ ok: true, page: merged }, 200, cors);
      } catch (e) {
        console.error("PUT /api/landing-pages/:id:", e?.message || e);
        return json({ error: e?.message || "Failed" }, e?.status || 500, cors);
      }
    }

    if (url.pathname.startsWith("/api/landing-pages/") && request.method === "DELETE") {
      try {
        await requireTeamOrThrow(request, secret, env);
        const id = decodeURIComponent(url.pathname.split("/")[3] || "");
        if (!id) return json({ error: "id required" }, 400, cors);
        const raw = await env.SHINEL_AUDIT.get("app:landing-pages:list", "json") || { items: [] };
        const items = Array.isArray(raw.items) ? raw.items : [];
        const next = items.filter(t => t && t.id !== id);
        if (next.length === items.length) return json({ error: "not found" }, 404, cors);
        await putJsonGuarded(env.SHINEL_AUDIT, "app:landing-pages:list", { items: next });
        return json({ ok: true, deleted: id }, 200, cors);
      } catch (e) {
        console.error("DELETE /api/landing-pages/:id:", e?.message || e);
        return json({ error: e?.message || "Failed" }, e?.status || 500, cors);
      }
    }

    /* ----------------------------------------------------------------------
     * Live-templates registry (template-grouped: each item = base + V1 + V2)
     * Powers the /live-templates marketing page's TripleBeforeAfterSlider
     * cards. Admins add/remove/reorder full templates without a deploy.
     *
     * Key: `app:live-templates:items`  →  { items: [...] }
     * Item shape:
     *   {
     *     id, name, sortOrder,
     *     baseUrl,  baseLabel,
     *     v1Url,    v1Label,
     *     v2Url,    v2Label,
     *     createdAt, updatedAt
     *   }
     *
     * GET    /api/live-templates              (public, sorted by sortOrder asc)
     * POST   /api/live-templates              (admin)
     * PUT    /api/live-templates/:id          (admin)
     * DELETE /api/live-templates/:id          (admin)
     * ---------------------------------------------------------------------- */
    if (url.pathname === "/api/live-templates" && request.method === "GET") {
      try {
        const raw = await env.SHINEL_AUDIT.get("app:live-templates:items", "json") || { items: [] };
        const items = Array.isArray(raw.items) ? raw.items : [];
        const sorted = items.slice().sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
        return json({ ok: true, templates: sorted }, 200, {
          ...cors,
          "Cache-Control": "public, max-age=300", // 5-min edge cache
        });
      } catch (e) {
        console.error("GET /api/live-templates:", e?.message || e);
        return json({ ok: true, templates: [] }, 200, cors);
      }
    }

    if (url.pathname === "/api/live-templates" && request.method === "POST") {
      try {
        await requireTeamOrThrow(request, secret, env);
        const body = await request.json().catch((e) => {
          console.warn(`bad json body @ ${url.pathname}:`, e?.message || e);
          return null;
        });
        if (!body || typeof body !== "object") return json({ error: "Invalid body" }, 400, cors);

        const s = (v, max) => clampStr(v, max).trim();
        const baseUrl = s(body.baseUrl, 800);
        const v1Url   = s(body.v1Url, 800);
        const v2Url   = s(body.v2Url, 800);
        const name    = s(body.name, 80);

        if (!baseUrl || !v1Url || !v2Url) return json({ error: "baseUrl, v1Url, v2Url all required" }, 400, cors);
        for (const u of [baseUrl, v1Url, v2Url]) {
          if (!/^(\/|https?:\/\/)/i.test(u)) {
            return json({ error: "URLs must start with / or https://" }, 400, cors);
          }
        }

        const raw = await env.SHINEL_AUDIT.get("app:live-templates:items", "json") || { items: [] };
        const items = Array.isArray(raw.items) ? raw.items : [];
        if (items.length >= 8) return json({ error: "Cap reached (8). Delete one first." }, 409, cors);

        const now = Date.now();
        const maxSort = items.reduce((m, it) => Math.max(m, Number(it.sortOrder) || 0), 0);
        const entry = {
          id: `lt_${now}_${Math.random().toString(36).slice(2, 8)}`,
          name,
          baseUrl,  baseLabel: s(body.baseLabel, 60) || "Base",
          v1Url,    v1Label:   s(body.v1Label, 60)   || "Variation 1",
          v2Url,    v2Label:   s(body.v2Label, 60)   || "Variation 2",
          sortOrder: Number.isFinite(Number(body.sortOrder)) ? Number(body.sortOrder) : maxSort + 10,
          createdAt: now,
          updatedAt: now,
        };
        items.push(entry);
        await putJsonGuarded(env.SHINEL_AUDIT, "app:live-templates:items", { items });
        return json({ ok: true, template: entry }, 201, cors);
      } catch (e) {
        console.error("POST /api/live-templates:", e?.message || e);
        return json({ error: e?.message || "Failed" }, e?.status || 500, cors);
      }
    }

    if (url.pathname.startsWith("/api/live-templates/") && request.method === "PUT") {
      try {
        await requireTeamOrThrow(request, secret, env);
        const id = decodeURIComponent(url.pathname.split("/")[3] || "");
        if (!id) return json({ error: "id required" }, 400, cors);
        const body = await request.json().catch((e) => {
          console.warn(`bad json body @ ${url.pathname}:`, e?.message || e);
          return null;
        });
        if (!body || typeof body !== "object") return json({ error: "Invalid body" }, 400, cors);

        const raw = await env.SHINEL_AUDIT.get("app:live-templates:items", "json") || { items: [] };
        const items = Array.isArray(raw.items) ? raw.items : [];
        const idx = items.findIndex(t => t && t.id === id);
        if (idx < 0) return json({ error: "not found" }, 404, cors);

        const s = (v, max) => clampStr(v, max).trim();
        const now = Date.now();
        const merged = {
          ...items[idx],
          name:      body.name !== undefined      ? s(body.name, 80)       : items[idx].name,
          baseUrl:   body.baseUrl !== undefined   ? s(body.baseUrl, 800)   : items[idx].baseUrl,
          baseLabel: body.baseLabel !== undefined ? (s(body.baseLabel, 60) || "Base") : items[idx].baseLabel,
          v1Url:     body.v1Url !== undefined     ? s(body.v1Url, 800)     : items[idx].v1Url,
          v1Label:   body.v1Label !== undefined   ? (s(body.v1Label, 60) || "Variation 1") : items[idx].v1Label,
          v2Url:     body.v2Url !== undefined     ? s(body.v2Url, 800)     : items[idx].v2Url,
          v2Label:   body.v2Label !== undefined   ? (s(body.v2Label, 60) || "Variation 2") : items[idx].v2Label,
          sortOrder: body.sortOrder !== undefined ? (Number.isFinite(Number(body.sortOrder)) ? Number(body.sortOrder) : items[idx].sortOrder) : items[idx].sortOrder,
          updatedAt: now,
        };
        for (const u of [merged.baseUrl, merged.v1Url, merged.v2Url]) {
          if (!u) return json({ error: "baseUrl, v1Url and v2Url are required" }, 400, cors);
          if (!/^(\/|https?:\/\/)/i.test(u)) {
            return json({ error: "URLs must start with / or https://" }, 400, cors);
          }
        }
        items[idx] = merged;
        await putJsonGuarded(env.SHINEL_AUDIT, "app:live-templates:items", { items });
        return json({ ok: true, template: merged }, 200, cors);
      } catch (e) {
        console.error("PUT /api/live-templates/:id:", e?.message || e);
        return json({ error: e?.message || "Failed" }, e?.status || 500, cors);
      }
    }

    if (url.pathname.startsWith("/api/live-templates/") && request.method === "DELETE") {
      try {
        await requireTeamOrThrow(request, secret, env);
        const id = decodeURIComponent(url.pathname.split("/")[3] || "");
        if (!id) return json({ error: "id required" }, 400, cors);
        const raw = await env.SHINEL_AUDIT.get("app:live-templates:items", "json") || { items: [] };
        const items = Array.isArray(raw.items) ? raw.items : [];
        const next = items.filter(t => t && t.id !== id);
        if (next.length === items.length) return json({ error: "not found" }, 404, cors);
        await putJsonGuarded(env.SHINEL_AUDIT, "app:live-templates:items", { items: next });
        return json({ ok: true, deleted: id }, 200, cors);
      } catch (e) {
        console.error("DELETE /api/live-templates/:id:", e?.message || e);
        return json({ error: e?.message || "Failed" }, e?.status || 500, cors);
      }
    }

    /* ====================================================================== *
     * GET /api/specialty/:slug — public list of items tagged for a microsite
     *
     * Aggregates inventory_videos + inventory_thumbnails where
     * specialty = <slug>. Returns mixed items in a shape SpecialtyPageTemplate
     * can render directly. Cached 5min in KV.
     * ====================================================================== */
    // Sub-route: /api/specialty/:slug/stats — must come BEFORE the
    // generic /api/specialty/:slug catch-all below or startsWith
    // would swallow it. KV-cached 30 min. Always returns 200.
    if (url.pathname.startsWith("/api/specialty/") && url.pathname.endsWith("/stats") && request.method === "GET") {
      const slug = decodeURIComponent(url.pathname.split("/")[3] || "").toLowerCase();
      if (!ALLOWED_SPECIALTIES.has(slug)) {
        return json({ error: "Unknown specialty" }, 404, cors);
      }
      const cacheKey = `app:specialty:${slug}:stats`;
      try {
        const cached = await env.SHINEL_AUDIT.get(cacheKey, "json");
        if (cached) return json(cached, 200, { ...cors, "Cache-Control": "public, max-age=1800" });
      } catch { /* fall through */ }

      try {
        const { results: videoRows = [] } = await env.DB.prepare(
          `SELECT youtube_views, instagram_views
             FROM inventory_videos
            WHERE specialty = ? AND is_shinel = 1`
        ).bind(slug).all();

        const { results: thumbRows = [] } = await env.DB.prepare(
          `SELECT youtube_views, instagram_views
             FROM inventory_thumbnails
            WHERE specialty = ? AND is_shinel = 1`
        ).bind(slug).all();

        const allRows = [...videoRows, ...thumbRows];
        const samples = allRows.length;
        const totalViews = allRows.reduce((sum, r) => {
          const yt = Number(r.youtube_views || 0);
          const ig = Number(r.instagram_views || 0);
          return sum + Math.max(yt, ig);
        }, 0);

        const payload = {
          ok: true,
          slug,
          samples,
          totalViews,
          turnaroundDays: 2,
        };

        try {
          await env.SHINEL_AUDIT.put(cacheKey, JSON.stringify(payload), { expirationTtl: 1800 });
        } catch { /* non-fatal */ }
        return json(payload, 200, { ...cors, "Cache-Control": "public, max-age=1800" });
      } catch (e) {
        console.error(`GET /api/specialty/${slug}/stats:`, e?.message || e);
        return json({ ok: true, slug, samples: 0, totalViews: 0, turnaroundDays: 2 }, 200, cors);
      }
    }

    if (url.pathname.startsWith("/api/specialty/") && request.method === "GET") {
      const slug = decodeURIComponent(url.pathname.split("/")[3] || "").toLowerCase();
      if (!ALLOWED_SPECIALTIES.has(slug)) {
        return json({ error: "Unknown specialty" }, 404, cors);
      }
      const cacheKey = `app:specialty:${slug}:cache`;
      try {
        const cached = await env.SHINEL_AUDIT.get(cacheKey, "json");
        if (cached) return json(cached, 200, { ...cors, "Cache-Control": "public, max-age=900" });
      } catch { /* fall through */ }

      try {
        // Videos first — these get embedded by the public template (mirror →
        // primary → creator URL chain handled in the SpecialtyPageTemplate).
        const { results: videos = [] } = await env.DB.prepare(
          `SELECT id, title, category, subcategory, kind, video_id, primary_url, creator_url, mirror_url,
                  youtube_views, instagram_url, instagram_views
             FROM inventory_videos
            WHERE specialty = ? AND is_shinel = 1
            ORDER BY last_updated DESC
            LIMIT 24`
        ).bind(slug).all();

        const { results: thumbs = [] } = await env.DB.prepare(
          `SELECT id, filename, youtube_url, category, subcategory, variant, image_url, video_id,
                  youtube_views, instagram_url, instagram_views
             FROM inventory_thumbnails
            WHERE specialty = ? AND is_shinel = 1
            ORDER BY last_updated DESC
            LIMIT 24`
        ).bind(slug).all();

        const items = [
          ...videos.map(v => ({
            kind: "video",
            id: v.id,
            title: v.title || "",
            category: v.category || "",
            subcategory: v.subcategory || "",
            videoKind: v.kind || "",  // LONG / SHORT / REEL
            videoId: v.video_id || "",
            mirrorUrl: v.mirror_url || "",
            primaryUrl: v.primary_url || "",
            creatorUrl: v.creator_url || "",
            views: Number(v.youtube_views || 0),
            igUrl: v.instagram_url || "",
            igViews: Number(v.instagram_views || 0),
          })),
          ...thumbs.map(t => ({
            kind: "thumbnail",
            id: t.id,
            title: t.filename || "",
            category: t.category || "",
            subcategory: t.subcategory || "",
            variant: t.variant || "",  // VIDEO / LIVE
            imageUrl: t.image_url || "",
            videoId: t.video_id || "",
            youtubeUrl: t.youtube_url || "",
            views: Number(t.youtube_views || 0),
            igUrl: t.instagram_url || "",
            igViews: Number(t.instagram_views || 0),
          })),
        ];

        const payload = { ok: true, slug, items };
        try {
          await env.SHINEL_AUDIT.put(cacheKey, JSON.stringify(payload), { expirationTtl: 900 });
        } catch { /* non-fatal */ }
        return json(payload, 200, { ...cors, "Cache-Control": "public, max-age=900" });
      } catch (e) {
        console.error(`GET /api/specialty/${slug}:`, e?.message || e);
        return json({ ok: true, slug, items: [] }, 200, cors);
      }
    }

    /* ====================================================================== *
     * Homepage data: /api/just-shipped + /api/homepage-stats
     *
     * Both are public, KV-cached, and feed the editorial homepage strips
     * (LiveNumbersBand + JustShippedTicker). No auth, no schema deps —
     * just read-only aggregation off inventory_videos.
     * ====================================================================== */

    // GET /api/just-shipped — returns the latest 5 delivered videos
    // (Shinel-owned only) for the rotating "JUST SHIPPED" homepage strip.
    if (url.pathname === "/api/just-shipped" && request.method === "GET") {
      const cacheKey = "app:just-shipped:cache";
      try {
        const cached = await env.SHINEL_AUDIT.get(cacheKey, "json");
        if (cached) return json(cached, 200, { ...cors, "Cache-Control": "public, max-age=300" });
      } catch { /* fall through */ }
      try {
        // Filter is_shinel = 1 + exclude obvious internal entries by title pattern.
        const { results = [] } = await env.DB.prepare(
          `SELECT id, title, category, kind, video_id, last_updated
             FROM inventory_videos
            WHERE is_shinel = 1
              AND title IS NOT NULL
              AND LENGTH(title) > 4
              AND LOWER(title) NOT LIKE '%test%'
              AND LOWER(title) NOT LIKE '%demo%'
              AND LOWER(title) NOT LIKE '%wip%'
              AND LOWER(title) NOT LIKE '%draft%'
            ORDER BY last_updated DESC
            LIMIT 5`
        ).all();
        const items = results.map((r) => ({
          id: r.id,
          title: String(r.title).slice(0, 140),
          category: r.category || "",
          kind: r.kind || "",
          videoId: r.video_id || "",
          deliveredAt: r.last_updated || null,
        }));
        const payload = { ok: true, items };
        try {
          await env.SHINEL_AUDIT.put(cacheKey, JSON.stringify(payload), { expirationTtl: 300 });
        } catch { /* cache write failure is non-fatal */ }
        return json(payload, 200, { ...cors, "Cache-Control": "public, max-age=300" });
      } catch (e) {
        console.error("GET /api/just-shipped:", e?.message || e);
        return json({ ok: true, items: [] }, 200, cors);
      }
    }

    // GET /api/homepage-stats — three numbers for the LiveNumbersBand
    // (videos shipped this month, total views, hours edited estimate).
    // 30-min cache. Safe to be slightly stale.
    if (url.pathname === "/api/homepage-stats" && request.method === "GET") {
      const cacheKey = "app:homepage-stats:cache";
      try {
        const cached = await env.SHINEL_AUDIT.get(cacheKey, "json");
        if (cached) return json(cached, 200, { ...cors, "Cache-Control": "public, max-age=1800" });
      } catch { /* */ }
      try {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        // Videos shipped this month
        const monthRow = await env.DB.prepare(
          `SELECT COUNT(*) AS n FROM inventory_videos
            WHERE is_shinel = 1 AND last_updated >= ?`
        ).bind(monthStart).first();
        // Total views generated (lifetime)
        const viewsRow = await env.DB.prepare(
          `SELECT COALESCE(SUM(youtube_views), 0) AS v FROM inventory_videos WHERE is_shinel = 1`
        ).first();
        // Lifetime video count
        const totalRow = await env.DB.prepare(
          `SELECT COUNT(*) AS n FROM inventory_videos WHERE is_shinel = 1`
        ).first();
        // Hours edited estimate: roughly 4h/long-form, 1.5h/short, 1h/reel.
        // Cheap aggregate with CASE in SQL; fall back to total*2.5 if kind is null.
        const hoursRow = await env.DB.prepare(
          `SELECT COALESCE(SUM(
              CASE LOWER(COALESCE(kind, ''))
                WHEN 'long' THEN 4.0
                WHEN 'short' THEN 1.5
                WHEN 'reel' THEN 1.0
                ELSE 2.5
              END
            ), 0) AS h
             FROM inventory_videos WHERE is_shinel = 1`
        ).first();

        const payload = {
          ok: true,
          videosThisMonth: Number(monthRow?.n || 0),
          totalViews: Number(viewsRow?.v || 0),
          totalVideos: Number(totalRow?.n || 0),
          hoursEdited: Math.round(Number(hoursRow?.h || 0)),
        };
        try {
          await env.SHINEL_AUDIT.put(cacheKey, JSON.stringify(payload), { expirationTtl: 1800 });
        } catch { /* */ }
        return json(payload, 200, { ...cors, "Cache-Control": "public, max-age=1800" });
      } catch (e) {
        console.error("GET /api/homepage-stats:", e?.message || e);
        return json({
          ok: false,
          videosThisMonth: 0, totalViews: 0, totalVideos: 0, hoursEdited: 0,
        }, 200, cors);
      }
    }

    /* ====================================================================== *
     * Client Portal v1 — per-client public pages (/c/<slug>) + self-edit
     *
     * Public:
     *   GET    /api/c/:slug                  — page data (sanitized)
     *   GET    /api/c/:slug/youtube/latest   — proxy YT for latest upload
     *   GET    /api/c/:slug/stats/30day      — last 30 client_stats rows
     *   POST   /api/c/:slug/sponsor          — sponsor inquiry
     *   POST   /api/c/:slug/contact          — generic contact
     *   POST   /api/c/:slug/newsletter       — newsletter signup
     *
     * Client (require role=client or admin):
     *   GET    /portal/me                    — own client row + inbox unread count
     *   PUT    /portal/me                    — top-level fields (slug, tagline,…)
     *   PUT    /portal/me/modules            — modules array
     *   GET    /portal/me/inbox              — paginated inbox
     *   PATCH  /portal/me/inbox/:id/read     — mark read
     *   GET    /portal/me/inbox/newsletter.csv — CSV export
     *
     * Admin:
     *   POST   /admin/clients/:id/portal-access  — create/regenerate portal user
     *   DELETE /admin/clients/:id/portal-access  — revoke
     * ====================================================================== */

    // Helper used by every /api/c/:slug endpoint below — looks up the client
    // row by slug (case-insensitive). Returns null when missing or not public.
    const getPublicClientBySlug = async (rawSlug) => {
      if (!env?.DB) return null;
      const slug = String(rawSlug || "").trim().toLowerCase();
      if (!slug) return null;
      try {
        return await env.DB
          .prepare("SELECT * FROM clients WHERE LOWER(slug) = ? AND public_enabled = 1 LIMIT 1")
          .bind(slug).first();
      } catch (e) {
        console.error("getPublicClientBySlug failed:", e?.message || e);
        return null;
      }
    };

    // Sanitize a clients row for the public page response — strip auth +
    // notification fields. The `tier` field is exposed because the public
    // ShinelFooter module conditionally hides on Pro tier.
    const sanitizeClientForPortal = (c) => {
      if (!c) return null;
      let modules = [];
      try { modules = JSON.parse(c.modules_json || "[]"); } catch { modules = []; }
      return {
        id: c.id,
        slug: c.slug,
        tier: c.tier || "free",
        displayName: c.display_name || c.name || "",
        tagline: c.tagline || "",
        avatarUrl: c.avatar_url || "",
        bannerUrl: c.banner_url || "",
        youtubeId: c.youtube_id || "",
        instagramHandle: c.instagram_handle || "",
        subscribers: Number(c.subscribers || 0),
        instagramFollowers: Number(c.instagram_followers || 0),
        modules,
      };
    };

    /* ----------------------------- /api/c/:slug ----------------------------- */
    if (url.pathname.startsWith("/api/c/") && request.method === "GET") {
      const parts = url.pathname.split("/").filter(Boolean);
      // /api/c/:slug                       → parts.length === 3
      // /api/c/:slug/youtube/latest        → parts.length === 5
      // /api/c/:slug/stats/30day           → parts.length === 5
      const slug = parts[2] || "";
      const sub = parts.slice(3).join("/");

      const client = await getPublicClientBySlug(slug);
      if (!client) return json({ error: "Page not found" }, 404, cors);

      if (sub === "") {
        return json({ ok: true, client: sanitizeClientForPortal(client) }, 200, {
          ...cors,
          "Cache-Control": "public, max-age=60",
        });
      }

      if (sub === "youtube/latest") {
        if (!client.youtube_id) return json({ ok: true, video: null }, 200, cors);
        // 30-min cache per slug to stay well under the 10k YT quota/day.
        const cacheKey = `client:yt:${slug}`;
        try {
          const cached = await env.SHINEL_AUDIT.get(cacheKey, "json");
          if (cached) return json({ ok: true, video: cached, cached: true }, 200, cors);
        } catch { /* fallthrough */ }
        try {
          const key = await getYoutubeKey(env);
          if (!key) return json({ ok: true, video: null, error: "no_key" }, 200, cors);
          const playlistId = client.uploads_playlist_id || `UU${String(client.youtube_id).slice(2)}`;
          const api = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&maxResults=1&playlistId=${encodeURIComponent(playlistId)}&key=${encodeURIComponent(key)}`;
          const resp = await fetch(api, { headers: { accept: "application/json" } });
          if (!resp.ok) {
            const errBody = await resp.json().catch(() => ({}));
            if (resp.status === 403 && (errBody?.error?.message || "").toLowerCase().includes("quota")) {
              try { await env.SHINEL_AUDIT.put(`yt_key_exhausted:${await sha256Hex(key)}`, "true", { expirationTtl: 3600 }); } catch (kvErr) { console.warn("yt_key_exhausted KV write failed:", kvErr?.message || kvErr); }
            }
            return json({ ok: true, video: null, error: `yt_${resp.status}` }, 200, cors);
          }
          const data = await resp.json().catch(() => ({}));
          const item = data?.items?.[0];
          if (!item) return json({ ok: true, video: null }, 200, cors);
          const video = {
            videoId: item.contentDetails?.videoId || item.snippet?.resourceId?.videoId || "",
            title: String(item.snippet?.title || "").slice(0, 200),
            thumbnail: item.snippet?.thumbnails?.maxres?.url || item.snippet?.thumbnails?.high?.url || "",
            publishedAt: item.snippet?.publishedAt || item.contentDetails?.videoPublishedAt || "",
          };
          await env.SHINEL_AUDIT.put(cacheKey, JSON.stringify(video), { expirationTtl: 1800 });
          return json({ ok: true, video }, 200, cors);
        } catch (e) {
          console.error("api/c/:slug/youtube/latest:", e?.message || e);
          return json({ ok: true, video: null }, 200, cors);
        }
      }

      if (sub === "stats/30day") {
        try {
          const { results = [] } = await env.DB
            .prepare("SELECT subscribers, instagram_followers, view_count, video_count, captured_at FROM client_stats WHERE client_id = ? ORDER BY captured_at DESC LIMIT 30")
            .bind(client.id).all();
          // Reverse so oldest-first for charting.
          const series = results.slice().reverse();
          return json({ ok: true, series }, 200, cors);
        } catch (e) {
          console.error("api/c/:slug/stats/30day:", e?.message || e);
          return json({ ok: true, series: [] }, 200, cors);
        }
      }

      return json({ error: "Not found" }, 404, cors);
    }

    /* ----------------------- /api/c/:slug POST forms ----------------------- */
    if (url.pathname.startsWith("/api/c/") && request.method === "POST") {
      const parts = url.pathname.split("/").filter(Boolean);
      const slug = parts[2] || "";
      const sub = parts.slice(3).join("/");
      if (!["sponsor", "contact", "newsletter"].includes(sub)) {
        return json({ error: "Not found" }, 404, cors);
      }

      try {
        const contentLen = Number(request.headers.get("content-length") || 0);
        if (contentLen > 16 * 1024) return json({ error: "Payload too large" }, 413, cors);

        // Per-slug rate limit so spam targeting one client doesn't exhaust
        // another's quota. Newsletter gets a higher cap (it's just an email).
        const window = sub === "newsletter" ? 600 : 3600;
        const max = sub === "newsletter" ? 10 : 5;
        if (await isRateLimited(env, ip, window, max, `c:${sub}:${slug}`)) {
          return json({ error: "Too many submissions, please try again later" }, 429, cors);
        }

        const body = await request.json().catch(() => ({}));
        // Honeypot — silent success.
        if (body && typeof body.website === "string" && body.website.trim()) {
          return json({ ok: true }, 200, cors);
        }

        const client = await getPublicClientBySlug(slug);
        if (!client) return json({ error: "Page not found" }, 404, cors);

        // Build payload per type.
        let payload = null;
        if (sub === "newsletter") {
          const email = String(body.email || "").trim().toLowerCase();
          if (!EMAIL_RE.test(email) || email.length > 254) {
            return json({ error: "Invalid email" }, 400, cors);
          }
          payload = { email: clampStr(email, 254) };
        } else {
          // sponsor + contact share schema: name, email, message, optional brand/budget
          const name = clampStr(String(body.name || "").trim(), 120);
          const email = String(body.email || "").trim().toLowerCase();
          const message = clampStr(String(body.message || "").trim(), 2000);
          if (name.length < 2) return json({ error: "Name required" }, 400, cors);
          if (!EMAIL_RE.test(email) || email.length > 254) return json({ error: "Invalid email" }, 400, cors);
          if (message.length < 5) return json({ error: "Message too short" }, 400, cors);
          payload = {
            name, email: clampStr(email, 254), message,
            brand: clampStr(String(body.brand || "").trim(), 120),
            budget: clampStr(String(body.budget || "").trim(), 60),
          };
        }

        const now = Date.now();
        const id = `inb-${now}-${Math.random().toString(36).slice(2, 8)}`;

        try {
          await env.DB.prepare(
            "INSERT INTO client_inbox (id, client_id, type, payload_json, created_at) VALUES (?, ?, ?, ?, ?)"
          ).bind(id, client.id, sub, JSON.stringify(payload), now).run();
        } catch (e) {
          console.error("client_inbox INSERT failed:", e?.message || e);
          return json({ error: "Could not save" }, 500, cors);
        }

        // Soft cap: prune oldest READ rows when client crosses 1000 entries.
        try {
          const { results: cnt = [] } = await env.DB
            .prepare("SELECT COUNT(*) AS n FROM client_inbox WHERE client_id = ?").bind(client.id).all();
          const total = Number(cnt?.[0]?.n || 0);
          if (total > 1000) {
            await env.DB.prepare(
              "DELETE FROM client_inbox WHERE id IN (SELECT id FROM client_inbox WHERE client_id = ? AND read_at IS NOT NULL ORDER BY created_at ASC LIMIT ?)"
            ).bind(client.id, total - 1000).run();
          }
        } catch { /* non-fatal */ }

        // Best-effort Discord notification.
        if (client.discord_webhook_url) {
          fireDiscordWebhook(client.discord_webhook_url, {
            username: "Shinel Inbox",
            embeds: [{
              title: `New ${sub} on /c/${slug}`,
              description: sub === "newsletter"
                ? `Subscriber: ${payload.email}`
                : (payload.message ? payload.message.slice(0, 1500) : "(no message)"),
              fields: sub === "newsletter" ? [] : [
                { name: "From", value: `${payload.name} · ${payload.email}` },
                ...(payload.brand ? [{ name: "Brand", value: payload.brand, inline: true }] : []),
                ...(payload.budget ? [{ name: "Budget", value: payload.budget, inline: true }] : []),
              ],
              url: `https://shinelstudios.in/portal/me/inbox`,
              timestamp: new Date(now).toISOString(),
              color: sub === "sponsor" ? 0xE85002 : sub === "contact" ? 0xFFD27A : 0x9B59B6,
            }],
          });
        }

        return json({ ok: true, id }, 200, cors);
      } catch (e) {
        console.error(`POST /api/c/:slug/${parts.slice(3).join("/")}:`, e?.message || e);
        return json({ error: "Submission failed" }, 500, cors);
      }
    }

    /* ------------------------------ /portal/me ------------------------------ */
    if (url.pathname === "/portal/me" && request.method === "GET") {
      try {
        const payload = await requireClientOrThrow(request, secret, env);
        const client = await getCurrentClientFromPayload(env, payload);
        if (!client) return json({ error: "No client portal attached to this user" }, 404, cors);
        let modules = [];
        try { modules = JSON.parse(client.modules_json || "[]"); } catch { modules = []; }
        // Inbox unread count (cheap COUNT query).
        let unread = 0;
        try {
          const { results = [] } = await env.DB
            .prepare("SELECT COUNT(*) AS n FROM client_inbox WHERE client_id = ? AND read_at IS NULL")
            .bind(client.id).all();
          unread = Number(results?.[0]?.n || 0);
        } catch { /* */ }
        return json({
          ok: true,
          client: {
            id: client.id,
            slug: client.slug || "",
            publicEnabled: !!client.public_enabled,
            tier: client.tier || "free",
            displayName: client.display_name || client.name || "",
            name: client.name || "",
            tagline: client.tagline || "",
            avatarUrl: client.avatar_url || "",
            bannerUrl: client.banner_url || "",
            discordWebhookUrl: client.discord_webhook_url || "",
            youtubeId: client.youtube_id || "",
            instagramHandle: client.instagram_handle || "",
            subscribers: Number(client.subscribers || 0),
            instagramFollowers: Number(client.instagram_followers || 0),
            modules,
            inboxUnread: unread,
          },
        }, 200, cors);
      } catch (e) {
        return json({ error: e.message || "Failed" }, e.status || 500, cors);
      }
    }

    if (url.pathname === "/portal/me" && request.method === "PUT") {
      try {
        const payload = await requireClientOrThrow(request, secret, env);
        const client = await getCurrentClientFromPayload(env, payload);
        if (!client) return json({ error: "No client portal attached to this user" }, 404, cors);
        const contentLen = Number(request.headers.get("content-length") || 0);
        if (contentLen > 16 * 1024) return json({ error: "Payload too large" }, 413, cors);
        const body = await request.json().catch(() => ({}));

        const updates = {};

        if (body.slug !== undefined) {
          const v = validateClientSlug(body.slug);
          if (!v.ok) return json({ error: v.error }, 400, cors);
          // Uniqueness: exclude self.
          const conflict = await env.DB
            .prepare("SELECT id FROM clients WHERE LOWER(slug) = ? AND id != ? LIMIT 1")
            .bind(v.slug, client.id).first();
          if (conflict) return json({ error: "Slug already taken" }, 409, cors);
          updates.slug = v.slug;
        }

        if (body.publicEnabled !== undefined) updates.public_enabled = body.publicEnabled ? 1 : 0;
        if (body.displayName !== undefined) updates.display_name = clampStr(body.displayName, 120);
        if (body.tagline !== undefined) updates.tagline = clampStr(body.tagline, 200);
        if (body.avatarUrl !== undefined) updates.avatar_url = clampStr(body.avatarUrl, 500);
        if (body.bannerUrl !== undefined) updates.banner_url = clampStr(body.bannerUrl, 500);
        if (body.discordWebhookUrl !== undefined) {
          const w = String(body.discordWebhookUrl || "").trim();
          if (w && !/^https:\/\/(discord\.com|discordapp\.com|ptb\.discord\.com|canary\.discord\.com)\/api\/webhooks\//.test(w)) {
            return json({ error: "discordWebhookUrl must be a Discord webhook URL" }, 400, cors);
          }
          updates.discord_webhook_url = clampStr(w, 500);
        }

        if (Object.keys(updates).length === 0) return json({ ok: true, noop: true }, 200, cors);

        const setClause = Object.keys(updates).map(k => `${k} = ?`).join(", ");
        const values = Object.values(updates);
        try {
          await env.DB
            .prepare(`UPDATE clients SET ${setClause} WHERE id = ?`)
            .bind(...values, client.id).run();
        } catch (e) {
          console.error("PUT /portal/me UPDATE failed:", e?.message || e);
          return json({ error: "Save failed" }, 500, cors);
        }
        return json({ ok: true, updated: Object.keys(updates) }, 200, cors);
      } catch (e) {
        return json({ error: e.message || "Failed" }, e.status || 500, cors);
      }
    }

    if (url.pathname === "/portal/me/modules" && request.method === "PUT") {
      try {
        const payload = await requireClientOrThrow(request, secret, env);
        const client = await getCurrentClientFromPayload(env, payload);
        if (!client) return json({ error: "No client portal attached to this user" }, 404, cors);
        const contentLen = Number(request.headers.get("content-length") || 0);
        if (contentLen > 32 * 1024) return json({ error: "Payload too large" }, 413, cors);
        const body = await request.json().catch(() => ({}));
        const modules = sanitizeClientModules(body.modules);
        // Force shinelFooter on for free tier (mandatory branding).
        if ((client.tier || "free") !== "pro") {
          let footer = modules.find(m => m.type === "shinelFooter");
          if (!footer) {
            modules.push({ type: "shinelFooter", enabled: true, config: {} });
          } else {
            footer.enabled = true;
          }
        }
        try {
          await env.DB
            .prepare("UPDATE clients SET modules_json = ? WHERE id = ?")
            .bind(JSON.stringify(modules), client.id).run();
        } catch (e) {
          console.error("PUT /portal/me/modules UPDATE failed:", e?.message || e);
          return json({ error: "Save failed" }, 500, cors);
        }
        return json({ ok: true, modules }, 200, cors);
      } catch (e) {
        return json({ error: e.message || "Failed" }, e.status || 500, cors);
      }
    }

    if (url.pathname === "/portal/me/inbox" && request.method === "GET") {
      try {
        const payload = await requireClientOrThrow(request, secret, env);
        const client = await getCurrentClientFromPayload(env, payload);
        if (!client) return json({ error: "No client portal attached to this user" }, 404, cors);
        const unreadOnly = url.searchParams.get("unreadOnly") === "true";
        const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit") || 100)));
        const sql = unreadOnly
          ? "SELECT * FROM client_inbox WHERE client_id = ? AND read_at IS NULL ORDER BY created_at DESC LIMIT ?"
          : "SELECT * FROM client_inbox WHERE client_id = ? ORDER BY created_at DESC LIMIT ?";
        const { results = [] } = await env.DB.prepare(sql).bind(client.id, limit).all();
        const items = results.map(r => {
          let payload = {};
          try { payload = JSON.parse(r.payload_json || "{}"); } catch { /* */ }
          return { id: r.id, type: r.type, payload, readAt: r.read_at, createdAt: r.created_at };
        });
        return json({ ok: true, items }, 200, cors);
      } catch (e) {
        return json({ error: e.message || "Failed" }, e.status || 500, cors);
      }
    }

    if (url.pathname.startsWith("/portal/me/inbox/") && url.pathname.endsWith("/read") && request.method === "PATCH") {
      try {
        const payload = await requireClientOrThrow(request, secret, env);
        const client = await getCurrentClientFromPayload(env, payload);
        if (!client) return json({ error: "No client portal attached to this user" }, 404, cors);
        const id = decodeURIComponent(url.pathname.split("/")[4] || "");
        if (!id) return json({ error: "id required" }, 400, cors);
        await env.DB.prepare(
          "UPDATE client_inbox SET read_at = ? WHERE id = ? AND client_id = ?"
        ).bind(Date.now(), id, client.id).run();
        return json({ ok: true }, 200, cors);
      } catch (e) {
        return json({ error: e.message || "Failed" }, e.status || 500, cors);
      }
    }

    if (url.pathname === "/portal/me/inbox/newsletter.csv" && request.method === "GET") {
      try {
        const payload = await requireClientOrThrow(request, secret, env);
        const client = await getCurrentClientFromPayload(env, payload);
        if (!client) return json({ error: "No client portal attached to this user" }, 404, cors);
        const { results = [] } = await env.DB
          .prepare("SELECT payload_json, created_at FROM client_inbox WHERE client_id = ? AND type = 'newsletter' ORDER BY created_at ASC")
          .bind(client.id).all();
        const lines = ["email,subscribed_at"];
        for (const r of results) {
          let p = {};
          try { p = JSON.parse(r.payload_json || "{}"); } catch { /* */ }
          if (!p.email) continue;
          // CSV-escape: surround with quotes if contains comma/quote.
          const safe = (s) => /[",\r\n]/.test(s) ? `"${String(s).replace(/"/g, '""')}"` : String(s);
          lines.push(`${safe(p.email)},${new Date(r.created_at).toISOString()}`);
        }
        return new Response(lines.join("\n"), {
          status: 200,
          headers: {
            ...cors,
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="newsletter-${client.slug || client.id}.csv"`,
          },
        });
      } catch (e) {
        return json({ error: e.message || "Failed" }, e.status || 500, cors);
      }
    }

    /* ---------------- Phase 4: wall / ama / devlog ---------------- *
     * All three live in client_inbox under different `type` values:
     *   wall   — public comments, auto-pinned (visible immediately)
     *   ama    — public Q&A, hidden until creator answers + pins
     *   devLog — Shinel admin posts, public on creation
     * All POST endpoints reuse the per-slug rate-limit + honeypot pattern
     * from sponsor/contact/newsletter above.
     * ============================================================== */

    // POST /api/c/:slug/wall — fan submits a public comment
    if (url.pathname.startsWith("/api/c/") && url.pathname.endsWith("/wall") && request.method === "POST") {
      const slug = url.pathname.split("/")[3] || "";
      try {
        const contentLen = Number(request.headers.get("content-length") || 0);
        if (contentLen > 8 * 1024) return json({ error: "Payload too large" }, 413, cors);
        if (await isRateLimited(env, ip, 600, 3, `c:wall:${slug}`)) {
          return json({ error: "Too many comments — try again later" }, 429, cors);
        }
        const body = await request.json().catch(() => ({}));
        if (body && typeof body.website === "string" && body.website.trim()) {
          return json({ ok: true }, 200, cors);
        }
        const client = await getPublicClientBySlug(slug);
        if (!client) return json({ error: "Page not found" }, 404, cors);
        const name = clampStr(String(body.name || "").trim(), 60);
        const message = clampStr(String(body.message || "").trim(), 500);
        if (name.length < 2) return json({ error: "Name required" }, 400, cors);
        if (message.length < 3) return json({ error: "Message too short" }, 400, cors);

        // Read the wall module's autoPin setting from modules_json. If autoPin
        // is explicitly false, leave pinned_at NULL so creator must approve.
        let autoPin = true;
        try {
          const modules = JSON.parse(client.modules_json || "[]");
          const wall = modules.find(m => m.type === "fanWall");
          if (wall && wall.config && wall.config.autoPin === false) autoPin = false;
        } catch { /* */ }

        const now = Date.now();
        const id = `inb-${now}-${Math.random().toString(36).slice(2, 8)}`;
        await env.DB.prepare(
          "INSERT INTO client_inbox (id, client_id, type, payload_json, created_at, pinned_at) VALUES (?, ?, 'wall', ?, ?, ?)"
        ).bind(id, client.id, JSON.stringify({ name, message }), now, autoPin ? now : null).run();

        if (client.discord_webhook_url) {
          fireDiscordWebhook(client.discord_webhook_url, {
            username: "Shinel Inbox",
            embeds: [{
              title: `New wall comment on /c/${slug}`,
              description: message.slice(0, 1500),
              fields: [{ name: "From", value: name }, { name: "Status", value: autoPin ? "auto-pinned (live)" : "pending approval", inline: true }],
              color: 0x9B59B6,
              timestamp: new Date(now).toISOString(),
            }],
          });
        }
        return json({ ok: true, id, autoPinned: autoPin }, 200, cors);
      } catch (e) {
        console.error(`POST /api/c/:slug/wall:`, e?.message || e);
        return json({ error: "Submission failed" }, 500, cors);
      }
    }

    // GET /api/c/:slug/wall — public list of pinned comments (latest first, max 50)
    if (url.pathname.startsWith("/api/c/") && url.pathname.endsWith("/wall") && request.method === "GET") {
      const slug = url.pathname.split("/")[3] || "";
      const client = await getPublicClientBySlug(slug);
      if (!client) return json({ error: "Page not found" }, 404, cors);
      try {
        const { results = [] } = await env.DB
          .prepare("SELECT id, payload_json, created_at, pinned_at FROM client_inbox WHERE client_id = ? AND type = 'wall' AND pinned_at IS NOT NULL ORDER BY pinned_at DESC LIMIT 50")
          .bind(client.id).all();
        const items = results.map(r => {
          let p = {};
          try { p = JSON.parse(r.payload_json || "{}"); } catch { /* */ }
          return { id: r.id, name: p.name || "", message: p.message || "", createdAt: r.created_at };
        });
        return json({ ok: true, items }, 200, { ...cors, "Cache-Control": "public, max-age=30" });
      } catch (e) {
        console.error("GET /api/c/:slug/wall:", e?.message || e);
        return json({ ok: true, items: [] }, 200, cors);
      }
    }

    // POST /api/c/:slug/ama — fan submits a question
    if (url.pathname.startsWith("/api/c/") && url.pathname.endsWith("/ama") && request.method === "POST") {
      const slug = url.pathname.split("/")[3] || "";
      try {
        const contentLen = Number(request.headers.get("content-length") || 0);
        if (contentLen > 8 * 1024) return json({ error: "Payload too large" }, 413, cors);
        if (await isRateLimited(env, ip, 3600, 5, `c:ama:${slug}`)) {
          return json({ error: "Too many questions — try again later" }, 429, cors);
        }
        const body = await request.json().catch(() => ({}));
        if (body && typeof body.website === "string" && body.website.trim()) {
          return json({ ok: true }, 200, cors);
        }
        const client = await getPublicClientBySlug(slug);
        if (!client) return json({ error: "Page not found" }, 404, cors);
        const name = clampStr(String(body.name || "").trim(), 60);
        const question = clampStr(String(body.question || "").trim(), 500);
        if (question.length < 5) return json({ error: "Question too short" }, 400, cors);

        const now = Date.now();
        const id = `inb-${now}-${Math.random().toString(36).slice(2, 8)}`;
        await env.DB.prepare(
          "INSERT INTO client_inbox (id, client_id, type, payload_json, created_at) VALUES (?, ?, 'ama', ?, ?)"
        ).bind(id, client.id, JSON.stringify({ name, question }), now).run();

        if (client.discord_webhook_url) {
          fireDiscordWebhook(client.discord_webhook_url, {
            username: "Shinel Inbox",
            embeds: [{
              title: `New AMA question on /c/${slug}`,
              description: question.slice(0, 1500),
              fields: name ? [{ name: "From", value: name }] : [],
              color: 0xFFD27A,
              timestamp: new Date(now).toISOString(),
            }],
          });
        }
        return json({ ok: true, id }, 200, cors);
      } catch (e) {
        console.error(`POST /api/c/:slug/ama:`, e?.message || e);
        return json({ error: "Submission failed" }, 500, cors);
      }
    }

    // GET /api/c/:slug/ama — public list of ANSWERED questions (creator pinned them)
    if (url.pathname.startsWith("/api/c/") && url.pathname.endsWith("/ama") && request.method === "GET") {
      const slug = url.pathname.split("/")[3] || "";
      const client = await getPublicClientBySlug(slug);
      if (!client) return json({ error: "Page not found" }, 404, cors);
      try {
        const { results = [] } = await env.DB
          .prepare("SELECT id, payload_json, pinned_at FROM client_inbox WHERE client_id = ? AND type = 'ama' AND pinned_at IS NOT NULL ORDER BY pinned_at DESC LIMIT 30")
          .bind(client.id).all();
        const items = results.map(r => {
          let p = {};
          try { p = JSON.parse(r.payload_json || "{}"); } catch { /* */ }
          return { id: r.id, name: p.name || "", question: p.question || "", answer: p.answer || "", answeredAt: r.pinned_at };
        }).filter(it => it.answer);
        return json({ ok: true, items }, 200, { ...cors, "Cache-Control": "public, max-age=60" });
      } catch (e) {
        console.error("GET /api/c/:slug/ama:", e?.message || e);
        return json({ ok: true, items: [] }, 200, cors);
      }
    }

    // GET /api/c/:slug/devlog — public read of admin-posted timeline
    if (url.pathname.startsWith("/api/c/") && url.pathname.endsWith("/devlog") && request.method === "GET") {
      const slug = url.pathname.split("/")[3] || "";
      const client = await getPublicClientBySlug(slug);
      if (!client) return json({ error: "Page not found" }, 404, cors);
      try {
        const { results = [] } = await env.DB
          .prepare("SELECT id, payload_json, created_at FROM client_inbox WHERE client_id = ? AND type = 'devLog' ORDER BY created_at DESC LIMIT 20")
          .bind(client.id).all();
        const items = results.map(r => {
          let p = {};
          try { p = JSON.parse(r.payload_json || "{}"); } catch { /* */ }
          return { id: r.id, body: p.body || "", postedBy: p.postedBy || "Shinel team", createdAt: r.created_at };
        });
        return json({ ok: true, items }, 200, { ...cors, "Cache-Control": "public, max-age=60" });
      } catch (e) {
        console.error("GET /api/c/:slug/devlog:", e?.message || e);
        return json({ ok: true, items: [] }, 200, cors);
      }
    }

    // POST /admin/clients/:id/devlog — Shinel admin posts an update
    if (url.pathname.startsWith("/admin/clients/") && url.pathname.endsWith("/devlog") && request.method === "POST") {
      try {
        const callerPayload = await requireTeamOrThrow(request, secret, env);
        const id = decodeURIComponent(url.pathname.split("/")[3] || "");
        if (!id) return json({ error: "client id required" }, 400, cors);
        const body = await request.json().catch(() => ({}));
        const text = clampStr(String(body.body || "").trim(), 1000);
        if (text.length < 3) return json({ error: "Message too short" }, 400, cors);
        const client = await env.DB.prepare("SELECT id FROM clients WHERE id = ? LIMIT 1").bind(id).first();
        if (!client) return json({ error: "Client not found" }, 404, cors);

        const now = Date.now();
        const inboxId = `inb-${now}-${Math.random().toString(36).slice(2, 8)}`;
        const postedBy = String(body.postedBy || callerPayload.firstName || callerPayload.email || "Shinel team").slice(0, 80);
        await env.DB.prepare(
          "INSERT INTO client_inbox (id, client_id, type, payload_json, created_at, pinned_at) VALUES (?, ?, 'devLog', ?, ?, ?)"
        ).bind(inboxId, id, JSON.stringify({ body: text, postedBy }), now, now).run();
        return json({ ok: true, id: inboxId }, 200, cors);
      } catch (e) {
        return json({ error: e.message || "Failed" }, e.status || 500, cors);
      }
    }

    // PATCH /portal/me/inbox/:id — creator moderates a row
    //   { pin: true }            → set pinned_at = now (publish wall comment / dev log)
    //   { pin: false }           → set pinned_at = NULL (unpublish)
    //   { answer: "…" }          → set payload_json.answer + auto-pin (publish AMA answer)
    if (url.pathname.startsWith("/portal/me/inbox/") && !url.pathname.endsWith("/read") && request.method === "PATCH") {
      try {
        const payload = await requireClientOrThrow(request, secret, env);
        const client = await getCurrentClientFromPayload(env, payload);
        if (!client) return json({ error: "No client portal attached to this user" }, 404, cors);
        const inboxId = decodeURIComponent(url.pathname.split("/")[4] || "");
        if (!inboxId) return json({ error: "id required" }, 400, cors);
        const body = await request.json().catch(() => ({}));
        const row = await env.DB.prepare("SELECT * FROM client_inbox WHERE id = ? AND client_id = ? LIMIT 1").bind(inboxId, client.id).first();
        if (!row) return json({ error: "Not found" }, 404, cors);

        if (typeof body.answer === "string") {
          let p = {};
          try { p = JSON.parse(row.payload_json || "{}"); } catch { /* */ }
          p.answer = clampStr(body.answer, 1000);
          await env.DB.prepare(
            "UPDATE client_inbox SET payload_json = ?, pinned_at = ?, read_at = ? WHERE id = ? AND client_id = ?"
          ).bind(JSON.stringify(p), Date.now(), Date.now(), inboxId, client.id).run();
          return json({ ok: true, pinned: true }, 200, cors);
        }

        if (typeof body.pin === "boolean") {
          await env.DB.prepare(
            "UPDATE client_inbox SET pinned_at = ? WHERE id = ? AND client_id = ?"
          ).bind(body.pin ? Date.now() : null, inboxId, client.id).run();
          return json({ ok: true, pinned: body.pin }, 200, cors);
        }

        return json({ error: "No supported action in body" }, 400, cors);
      } catch (e) {
        return json({ error: e.message || "Failed" }, e.status || 500, cors);
      }
    }

    /* ----------------- /admin/clients/:id/portal-access ----------------- */
    if (url.pathname.startsWith("/admin/clients/") && url.pathname.endsWith("/portal-access") && request.method === "POST") {
      try {
        await requireAdminOrThrow(request, secret, env);
        const id = decodeURIComponent(url.pathname.split("/")[3] || "");
        if (!id) return json({ error: "client id required" }, 400, cors);
        const body = await request.json().catch(() => ({}));
        const email = String(body.email || "").trim().toLowerCase();
        if (!EMAIL_RE.test(email) || email.length > 254) return json({ error: "Invalid email" }, 400, cors);

        // Look up the client in D1. The legacy /clients endpoints write to
        // both KV and D1, but historically D1 inserts have been silently
        // failing for many records — so the KV registry is the source of
        // truth for who-exists. Lazy-migrate on portal grant: if the client
        // is in KV but missing from D1, copy the row over before continuing.
        let client = await env.DB.prepare("SELECT * FROM clients WHERE id = ? LIMIT 1").bind(id).first();
        if (!client) {
          const kvList = await env.SHINEL_AUDIT.get("app:clients:registry", "json") || [];
          const kvClient = Array.isArray(kvList) ? kvList.find(c => c?.id === id) : null;
          if (!kvClient) return json({ error: "Client not found" }, 404, cors);
          try {
            await env.DB.prepare(
              "INSERT INTO clients (id, name, youtube_id, handle, instagram_handle, uploads_playlist_id, category, status, subscribers, instagram_followers, instagram_logo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
            ).bind(
              kvClient.id,
              kvClient.name || "",
              kvClient.youtubeId || null,
              kvClient.handle || "",
              kvClient.instagramHandle || "",
              kvClient.uploadsPlaylistId || "",
              kvClient.category || "",
              kvClient.status || "active",
              Number(kvClient.subscribers || 0),
              Number(kvClient.instagramFollowers || 0),
              kvClient.instagramLogo || ""
            ).run();
            client = await env.DB.prepare("SELECT * FROM clients WHERE id = ? LIMIT 1").bind(id).first();
          } catch (e) {
            console.error("Lazy-migrate KV→D1 failed:", e?.message || e);
            return json({ error: "Could not migrate client to D1: " + (e?.message || "unknown") }, 500, cors);
          }
          if (!client) return json({ error: "Client migration succeeded but row not readable" }, 500, cors);
        }

        // Generate a strong temp password — alpha+num+symbol, 16 chars.
        const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*";
        const buf = new Uint8Array(16);
        crypto.getRandomValues(buf);
        const tempPassword = Array.from(buf, b => alphabet[b % alphabet.length]).join("");

        const passwordHash = await bcrypt.hash(tempPassword, 10);
        const userKey = `user:${email}`;

        // Read existing user (if any) so we preserve profile fields.
        let existing = null;
        try {
          const raw = await env.SHINEL_USERS.get(userKey);
          if (raw) existing = JSON.parse(raw);
        } catch { /* */ }

        const userData = {
          ...(existing || {}),
          email,
          passwordHash,
          role: "client",
          firstName: existing?.firstName || String(body.firstName || client.name || "").slice(0, 60),
          lastName: existing?.lastName || String(body.lastName || "").slice(0, 60),
          // Block this user from /team scans (they're a client, not a teammate).
          profilePublic: false,
        };

        await env.SHINEL_USERS.put(userKey, JSON.stringify(userData));
        invalidateAdminUsersCache();

        // Link client row → portal_email.
        try {
          await env.DB
            .prepare("UPDATE clients SET portal_email = ? WHERE id = ?")
            .bind(email, id).run();
        } catch (e) {
          console.error("UPDATE clients SET portal_email failed:", e?.message || e);
          return json({ error: "Could not link email to client" }, 500, cors);
        }

        await audit(env, "client_portal_access_granted", { clientId: id, portalEmail: email, ip });

        return json({
          ok: true,
          tempPassword,
          loginUrl: "https://shinelstudios.in/login",
          email,
          warning: "This password is shown ONCE. Copy it now.",
        }, 200, cors);
      } catch (e) {
        return json({ error: e.message || "Failed" }, e.status || 500, cors);
      }
    }

    if (url.pathname.startsWith("/admin/clients/") && url.pathname.endsWith("/portal-access") && request.method === "DELETE") {
      try {
        await requireAdminOrThrow(request, secret, env);
        const id = decodeURIComponent(url.pathname.split("/")[3] || "");
        if (!id) return json({ error: "client id required" }, 400, cors);
        const client = await env.DB.prepare("SELECT portal_email FROM clients WHERE id = ? LIMIT 1").bind(id).first();
        if (!client) return json({ error: "Client not found" }, 404, cors);
        if (client.portal_email) {
          try { await env.SHINEL_USERS.delete(`user:${client.portal_email}`); } catch { /* */ }
          invalidateAdminUsersCache();
        }
        try {
          await env.DB.prepare("UPDATE clients SET portal_email = NULL WHERE id = ?").bind(id).run();
        } catch (e) {
          console.error("UPDATE clients clear portal_email failed:", e?.message || e);
        }
        await audit(env, "client_portal_access_revoked", { clientId: id, ip });
        return json({ ok: true }, 200, cors);
      } catch (e) {
        return json({ error: e.message || "Failed" }, e.status || 500, cors);
      }
    }

    /* ------------------------------- not found ------------------------------- */
    return json({ error: "Not found" }, 404, cors);
  },

  async scheduled(event, env, ctx) {
    console.log("CRON TRIGGER: Starting Automatic Pulse Sync...");
    ctx.waitUntil((async () => {
      try {
        const result = await performClientSync(env, false, false);
        console.log(`CRON SUCCESS: Synced ${result.synced} creators.`);
      } catch (e) {
        if (e.status === 429) {
          console.log("CRON SKIP: Last sync too recent.");
        } else {
          console.error("CRON ERROR:", e.message);
        }
      }
    })());
  }
};

// Wrap the handler with Sentry so unhandled errors in fetch + scheduled get
// captured automatically. Free-tier safe defaults:
//   - tracesSampleRate 0.05 → ~150 transactions/mo at expected volume
//     (vs the 10k/mo perf quota). Always-on tracing on a worker that gets
//     ~3-5k requests/day would burn the quota in a week.
//   - sendDefaultPii: false — never auto-attach IPs/cookies/headers.
//   - beforeSend filter drops the routine 401/403/expected-error noise that
//     would otherwise dominate the issue list.
//
// withSentry preserves the original handler signature so existing routes
// keep working unchanged.
export default Sentry.withSentry(
  (env) => ({
    dsn: SENTRY_WORKER_DSN,
    environment: env.ENVIRONMENT || "production",
    tracesSampleRate: 0.05,
    sendDefaultPii: false,
    ignoreErrors: SENTRY_IGNORE,
    initialScope: { tags: { surface: "worker" } },
    beforeSend(event, hint) {
      // Drop expected auth/business errors — keep real bugs only.
      const msg = String(hint?.originalException?.message || event?.message || "");
      if (SENTRY_IGNORE.some((re) => re.test(msg))) return null;
      // Strip cookies on the off chance the SDK auto-collected them.
      if (event.request?.cookies) delete event.request.cookies;
      if (event.request?.headers) {
        delete event.request.headers.cookie;
        delete event.request.headers.authorization;
      }
      return event;
    },
  }),
  handler
);
