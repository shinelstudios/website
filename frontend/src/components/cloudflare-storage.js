/**
 * Cloudflare Workers · View Storage Helper (Worker-compatible)
 * ------------------------------------------------------------
 * Works with your Worker that exposes:
 *  - GET  /thumbnails            (public or auth; includes videoId, youtubeViews, status, lastViewUpdate)
 *  - GET  /stats                 (public or auth)
 *  - POST /views/refresh         (admin; bulk)
 *  - POST /views/refresh/:id     (admin; single)
 *
 * Notes:
 * - There is no "direct set" endpoint for views (they're derived from YouTube).
 *   set()/markDeleted() return a safe error result.
 * - Pass a token via constructor or setToken() for admin endpoints.
 * - Lightweight ETag cache for GET endpoints, with optional retries & timeouts.
 */

export class CloudflareViewStorage {
  /**
   * @param {string} workerUrl - e.g. https://shinel-auth.<acct>.workers.dev
   * @param {string | (() => string)} [tokenOrGetter] - Bearer token or getter fn for admin ops
   * @param {Object} [opts]
   * @param {number}  [opts.timeoutMs=70000]           - request timeout
   * @param {number}  [opts.retries=2]                - retry attempts for 429/5xx/timeouts
   * @param {number}  [opts.baseRetryDelayMs=450]     - base backoff (exponential + jitter)
   * @param {boolean} [opts.enableEtagCache=true]     - cache GET responses using ETag
   * @param {boolean} [opts.forceAuthForReads=false]  - include Authorization on GETs
   */
  constructor(workerUrl, tokenOrGetter = null, opts = {}) {
    if (!workerUrl || typeof workerUrl !== "string") {
      throw new Error("Worker URL is required");
    }
    this.workerUrl = workerUrl.replace(/\/$/, "");
    this._tokenGetter =
      typeof tokenOrGetter === "function"
        ? tokenOrGetter
        : () => (typeof tokenOrGetter === "string" ? tokenOrGetter : "");

    this._opts = {
      timeoutMs: opts.timeoutMs ?? 70000,
      retries: opts.retries ?? 2,
      baseRetryDelayMs: opts.baseRetryDelayMs ?? 450,
      enableEtagCache: opts.enableEtagCache ?? true,
      forceAuthForReads: opts.forceAuthForReads ?? false,
    };

    /** @type {Map<string, { etag: string, payload: any }>} */
    this._etags = new Map(); // url -> { etag, payload }
  }

  setToken(token) {
    this._tokenGetter = () => token || "";
  }

  clearCache() {
    this._etags.clear();
  }

  // ---------- internals ----------
  _authHeaders(json = true) {
    const h = {};
    const token = this._tokenGetter?.() || "";
    if (token) h.authorization = `Bearer ${token}`;
    if (json) h["content-type"] = "application/json";
    return h;
  }

  _sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  _calcBackoff(attempt) {
    // exponential (attempt starts at 1) + jitter
    const base = this._opts.baseRetryDelayMs;
    const expo = base * Math.pow(2, attempt - 1);
    const jitter = Math.floor(Math.random() * 150);
    return expo + jitter;
  }

  async _fetchWithTimeout(url, init = {}, { timeoutMs } = {}) {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs ?? this._opts.timeoutMs);
    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(t);
    }
  }

  async _requestJSON(method, path, body, { useAuth = true, timeoutMs, retries } = {}) {
    const url = `${this.workerUrl}${path}`;
    const maxRetries = retries ?? this._opts.retries;

    let lastErr;
    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        const res = await this._fetchWithTimeout(
          url,
          {
            method,
            headers: useAuth
              ? this._authHeaders(Boolean(body))
              : (body ? { "content-type": "application/json" } : undefined),
            body: body ? JSON.stringify(body) : undefined,
          },
          { timeoutMs }
        );

        if (!res.ok) {
          const status = res.status;
          let msg = `HTTP ${status}`;
          let data = null;
          try { data = await res.json(); } catch {}
          if (data?.error) msg = data.error;
          if (data?.message) msg = data.message;

          // retry 429/5xx with respect to Retry-After
          if ((status === 429 || (status >= 500 && status < 600)) && attempt <= maxRetries) {
            const ra = res.headers.get("Retry-After");
            const delay = ra ? Math.min(15000, (Number(ra) || 0) * 1000) : this._calcBackoff(attempt);
            await this._sleep(delay);
            continue;
          }

          const err = new Error(msg);
          err.status = status;
          err.data = data;
          throw err;
        }

        const text = await res.text();
        let parsed = null;
        try { parsed = text ? JSON.parse(text) : null; } catch { parsed = { raw: text }; }
        return parsed;
      } catch (e) {
        lastErr = e?.name === "AbortError" ? new Error("Network timeout — the server took too long to respond.") : e;

        const retriable =
          lastErr?.name === "AbortError" ||
          lastErr?.status === 429 ||
          (lastErr?.status >= 500 && lastErr?.status < 600) ||
          (!lastErr?.status && attempt <= maxRetries); // network
        if (attempt <= maxRetries && retriable) {
          await this._sleep(this._calcBackoff(attempt));
          continue;
        }
        throw lastErr;
      }
    }
    throw lastErr || new Error("Unknown network error");
  }

  async _getWithEtag(path, { timeoutMs } = {}) {
    const url = `${this.workerUrl}${path}`;
    const known = this._etags.get(url);

    const headers = new Headers();
    if (this._opts.forceAuthForReads) {
      const token = this._tokenGetter?.() || "";
      if (token) headers.set("Authorization", `Bearer ${token}`);
    }
    if (this._opts.enableEtagCache && known?.etag) {
      headers.set("If-None-Match", known.etag);
    }

    const res = await this._fetchWithTimeout(url, { headers }, { timeoutMs });

    if (res.status === 304 && known?.payload) {
      return known.payload;
    }
    if (!res.ok) {
      let msg = `HTTP ${res.status} for GET ${path}`;
      try {
        const j = await res.json();
        if (j?.error) msg = j.error;
        if (j?.message) msg = j.message;
      } catch {}
      throw new Error(msg);
    }

    const text = await res.text();
    let payload = null;
    try { payload = text ? JSON.parse(text) : null; } catch { payload = { raw: text }; }

    if (this._opts.enableEtagCache) {
      const etag = res.headers.get("ETag");
      if (etag) this._etags.set(url, { etag, payload });
    }
    return payload;
  }

  async _pollJobIfAny(result, { onProgress, timeoutMs = 15000 } = {}) {
    // Your Worker doesn't expose /jobs; keep passthrough.
    if (typeof onProgress === "function") {
      try { onProgress({ status: "queued-or-done" }); } catch {}
    }
    return result;
  }

  // ---------- public-ish reads ----------
  /**
   * Get view-like info for a single videoId by scanning /thumbnails
   * @returns {Promise<{videoId,title,views,status,lastUpdated}|null>}
   */
  async get(videoId) {
    try {
      const data = await this._getWithEtag("/thumbnails");
      const list = Array.isArray(data?.thumbnails) ? data.thumbnails : [];
      const row = list.find((t) => t.videoId === videoId);
      if (!row) return null;
      return {
        videoId: row.videoId,
        title: row.youtubeTitle ?? null,
        views: Number(row.youtubeViews || 0),
        status: row.viewStatus || "unknown",
        lastUpdated: row.lastViewUpdate || null,
      };
    } catch (e) {
      console.error("get(videoId) failed:", e);
      return null;
    }
  }

  /**
   * Refresh a single video’s views (admin).
   * Returns latest { videoId, views, title, status, lastUpdated }
   */
  async refresh(videoId, { onProgress } = {}) {
    const res = await this._requestJSON("POST", `/views/refresh/${encodeURIComponent(videoId)}`, undefined, {
      useAuth: true,
      timeoutMs: 70000,
    });
    await this._pollJobIfAny(res, { onProgress });
    // Bust ETag so subsequent GETs revalidate
    this._etags.delete(`${this.workerUrl}/thumbnails`);
    this._etags.delete(`${this.workerUrl}/stats`);
    return res;
  }

  /**
   * Refresh all eligible videos’ views (admin).
   * Mirrors your /views/refresh result shape.
   */
  async refreshAll({ onProgress } = {}) {
    const res = await this._requestJSON("POST", `/views/refresh`, undefined, {
      useAuth: true,
      timeoutMs: 180000,
    });
    await this._pollJobIfAny(res, { onProgress });
    this._etags.delete(`${this.workerUrl}/thumbnails`);
    this._etags.delete(`${this.workerUrl}/stats`);
    return res;
  }

  /**
   * Get all stored video data by reading /thumbnails and keying by videoId
   */
  async getAll() {
    try {
      const data = await this._getWithEtag("/thumbnails");
      const list = Array.isArray(data?.thumbnails) ? data.thumbnails : [];
      /** @type {Record<string, {videoId:string,title:string|null,views:number,status:string,lastUpdated:number|null}>} */
      const out = {};
      for (const t of list) {
        if (!t.videoId) continue;
        out[t.videoId] = {
          videoId: t.videoId,
          title: t.youtubeTitle ?? null,
          views: Number(t.youtubeViews || 0),
          status: t.viewStatus || "unknown",
          lastUpdated: t.lastViewUpdate || null,
        };
      }
      return out;
    } catch (e) {
      console.error("getAll() failed:", e);
      return {};
    }
  }

  /**
   * Storage statistics from /stats
   */
  async getStats() {
    try {
      return await this._getWithEtag("/stats");
    } catch (e) {
      console.error("getStats() failed:", e);
      return { total: 0, withYouTube: 0, byCategory: {}, byVariant: {} };
    }
  }

  /**
   * Export as JSON string (backed by /thumbnails)
   */
  async export() {
    try {
      const all = await this.getAll();
      return JSON.stringify(all, null, 2);
    } catch {
      return "{}";
    }
  }

  // ---------- helpers maintained for API parity ----------
  async set(_videoId, _views) {
    // Not supported; views are sourced from YouTube and cached server-side.
    return { success: false, error: "Direct set not supported by Worker API" };
  }

  async markDeleted(_videoId) {
    // Not supported; deletion state is inferred from YouTube fetch and preserved.
    return { success: false, error: "Direct delete mark not supported by Worker API" };
  }

  async import(_jsonString) {
    // Use /bulk-import for thumbnails; views are not imported via this helper.
    return false; // kept for backward compat with older call sites
  }

  async needsUpdate(videoId, maxAge = 24 * 60 * 60 * 1000) {
    try {
      const data = await this.get(videoId);
      if (!data) return true;
      const age = Date.now() - (data.lastUpdated || 0);
      return age > maxAge;
    } catch {
      return true;
    }
  }

  async batchGet(videoIds) {
    // More efficient: fetch once and filter
    const all = await this.getAll();
    const out = {};
    for (const id of videoIds || []) {
      if (all[id]) out[id] = all[id];
    }
    return out;
  }

  async batchRefresh(videoIds, { concurrency = 4, onEach } = {}) {
    // Minimal concurrency control with retries handled inside refresh()
    const ids = [...(videoIds || [])];
    let i = 0;
    const results = {};
    const run = async () => {
      while (i < ids.length) {
        const idx = i++;
        const id = ids[idx];
        try {
          const res = await this.refresh(id);
          results[id] = { success: true, data: res };
          onEach?.(id, { success: true, data: res });
        } catch (e) {
          results[id] = { success: false, error: e.message };
          onEach?.(id, { success: false, error: e.message });
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(concurrency, ids.length) }, run));
    return results;
  }

  async testConnection() {
    try {
      const headers = new Headers();
      if (this._opts.forceAuthForReads) {
        const token = this._tokenGetter?.() || "";
        if (token) headers.set("Authorization", `Bearer ${token}`);
      }
      const res = await this._fetchWithTimeout(`${this.workerUrl}/stats`, { headers }, { timeoutMs: 5000 });
      return res.ok;
    } catch {
      return false;
    }
  }

  async healthCheck() {
    try {
      const start = Date.now();
      const stats = await this.getStats();
      return {
        status: "healthy",
        responseTime: Date.now() - start,
        stats,
        timestamp: new Date().toISOString(),
      };
    } catch (e) {
      return {
        status: "unhealthy",
        error: e.message,
        timestamp: new Date().toISOString(),
      };
    }
  }
}

export function createCloudflareStorage(workerUrl, tokenOrGetter, opts) {
  return new CloudflareViewStorage(workerUrl, tokenOrGetter, opts);
}

export default CloudflareViewStorage;
