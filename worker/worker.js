// worker.js (Cloudflare Workers, Modules syntax)
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";

/* ============================== helpers ============================== */
const json = (obj, status = 200, headers = {}) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });

// CORS: return a credentials-enabled header set when origin is allowed
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
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
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

// Parse USERS_JSON -> [{ email, passwordHash, role }]
function loadUsers(env) {
  try {
    const arr = JSON.parse(env.USERS_JSON || "[]");
    if (!Array.isArray(arr)) return [];
    return arr
      .map((u) => ({
        email: String(u.email || "").trim().toLowerCase(),
        passwordHash: String(u.passwordHash || ""),
        role: u.role === "team" ? "team" : "client",
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
  if (opts.sameSite) parts.push(`SameSite=${opts.sameSite}`); // "None" | "Lax" | "Strict"
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
async function verifyJWT(token, secret) {
  const { payload } = await jwtVerify(token, secret);
  return payload;
}

async function sha256Hex(input) {
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest("SHA-256", enc.encode(input));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/* ====================== Rate limit (KV) + Audit (KV) ====================== */
// Simple counter per IP with TTL (windowSec), returns true if limited
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
    // keep for 30 days
    await env.SHINEL_AUDIT.put(key, value, { expirationTtl: 60 * 60 * 24 * 30 });
  } catch {}
}

/* ============================== worker ============================== */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("origin") || "";
    const allowedOrigins = (env.ALLOWED_ORIGINS || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const cors = makeCorsHeaders(origin, allowedOrigins);
    const allowedOriginValue = pickAllowedOrigin(origin, allowedOrigins); // for Set-Cookie safety
    const secret = new TextEncoder().encode(env.JWT_SECRET || "change-me");
    const USERS = loadUsers(env);
    const ip =
      request.headers.get("CF-Connecting-IP") ||
      request.headers.get("x-forwarded-for") ||
      "";

    // Preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    // Health/simple root
    if ((url.pathname === "/" || url.pathname === "/health") && request.method === "GET") {
      return json({ ok: true, service: "shinel-auth", time: Date.now() }, 200, cors);
    }

    /* ----------------------------- POST /auth/login ----------------------------- */
    if (url.pathname === "/auth/login" && request.method === "POST") {
      try {
        // rate limit
        if (await isRateLimited(env, ip)) {
          await audit(env, "login", { email: null, success: false, ip, reason: "rate_limited" });
          return json({ error: "Too many attempts. Try again later." }, 429, cors);
        }

        const body = await request.json().catch(() => ({}));
        const email = String(body.email || "").trim().toLowerCase();
        const password = String(body.password || "");

        if (!email || !password) {
          return json({ error: "Email and password required" }, 400, cors);
        }

        const user = USERS.find((u) => u.email === email);
        if (!user) {
          await audit(env, "login", { email, success: false, ip, reason: "not_allowlisted" });
          return json({ error: "Not authorized: email not in allowlist" }, 401, cors);
        }

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) {
          await audit(env, "login", { email, success: false, ip, reason: "bad_password" });
          return json({ error: "Invalid password" }, 401, cors);
        }

        // access + refresh
        const access = await signAccess({ email: user.email, role: user.role }, secret, 30); // 30m access
        const refresh = await signRefresh({ email: user.email, role: user.role, kind: "refresh" }, secret, 7); // 7d refresh

        // HttpOnly refresh cookie (credentials mode)
        const refreshCookie = setCookie("ss_refresh", refresh, {
          httpOnly: true,
          secure: true,
          sameSite: "None",
          path: "/",
          maxAge: 60 * 60 * 24 * 7,
        });

        await audit(env, "login", { email, success: true, ip });

        // Note: for browsers to accept cookie with CORS, Access-Control-Allow-Origin must be the *exact* origin
        const headers = {
          ...cors,
          "content-type": "application/json",
          "set-cookie": refreshCookie,
        };
        return new Response(JSON.stringify({ token: access, role: user.role }), {
          status: 200,
          headers,
        });
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

        // rotate
        const newAccess = await signAccess({ email: payload.email, role: payload.role }, secret, 30);
        const newRefresh = await signRefresh({ email: payload.email, role: payload.role, kind: "refresh" }, secret, 7);
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
        const clear = delCookie("ss_refresh", { httpOnly: true, secure: true, sameSite: "None", path: "/" });
        const headers = { ...cors, "content-type": "application/json", "set-cookie": clear };
        return new Response(JSON.stringify({ error: "Invalid refresh" }), { status: 403, headers });
      }
    }

    /* ----------------------------- POST /auth/logout ----------------------------- */
    if (url.pathname === "/auth/logout" && request.method === "POST") {
      const clear = delCookie("ss_refresh", { httpOnly: true, secure: true, sameSite: "None", path: "/" });
      const headers = { ...cors, "content-type": "application/json", "set-cookie": clear };
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
    }

    /* ----------------------------- GET /protected (sample) ----------------------------- */
    if (url.pathname === "/protected" && request.method === "GET") {
      const auth = request.headers.get("authorization") || "";
      const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
      if (!token) return json({ error: "Missing token" }, 401, cors);

      try {
        const payload = await verifyJWT(token, secret);
        return json(
          { message: `Welcome ${payload.email}, you have access!`, email: payload.email, role: payload.role },
          200,
          cors
        );
      } catch {
        return json({ error: "Invalid or expired token" }, 403, cors);
      }
    }

    return json({ error: "Not found" }, 404, cors);
  },
};
