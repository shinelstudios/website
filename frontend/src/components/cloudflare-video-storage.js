// src/components/cloudflare-video-storage.js
// Admin Videos storage & views helper (KV-backed; ETag-aware; Worker-compatible)

export class CloudflareVideoStorage {
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

  // ---------------- internals ----------------
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
              : body
              ? { "content-type": "application/json" }
              : undefined,
            body: body ? JSON.stringify(body) : undefined,
          },
          { timeoutMs }
        );

        if (!res.ok) {
          const text = await res.text();
          let msg = `HTTP ${res.status} for ${method} ${path}`;
          try {
            const j = text ? JSON.parse(text) : null;
            if (j?.error) msg = j.error;
            if (j?.message) msg = j.message;
          } catch {}
          const err = new Error(msg);
          err.status = res.status;
          throw err;
        }

        const text = await res.text();
        return text ? JSON.parse(text) : null;
      } catch (e) {
        lastErr =
          e?.name === "AbortError"
            ? new Error("Network timeout — the server took too long to respond.")
            : e;

        const retriable =
          lastErr?.name === "AbortError" ||
          lastErr?.status === 429 ||
          (lastErr?.status >= 500 && lastErr?.status < 600) ||
          (!lastErr?.status && attempt <= maxRetries);

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

    if (res.status === 304 && known?.payload) return known.payload;
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
    const payload = text ? JSON.parse(text) : null;
    if (this._opts.enableEtagCache) {
      const etag = res.headers.get("ETag");
      if (etag) this._etags.set(url, { etag, payload });
    }
    return payload;
  }

  // ---------------- reads ----------------
  async getAll() {
    // Expect server to return { videos: [...] }
    const data = await this._getWithEtag("/videos");
    return Array.isArray(data?.videos) ? data.videos : Array.isArray(data) ? data : [];
  }
  async getStats() {
    return this._getWithEtag("/stats");
  }

  // ---------------- writes (admin) ----------------
  async add(video, { onProgress } = {}) {
    onProgress?.(5);
    const safe = {
      title: String(video.title || "").trim(),
      primaryUrl: String(video.primaryUrl || "").trim(), // plays on the site
      creatorUrl: String(video.creatorUrl || "").trim(), // same video by creator
      category: String(video.category || "").trim(),
      subcategory: String(video.subcategory || "").trim(),
      kind: String(video.kind || "LONG"), // LONG | SHORT | REEL | BRIEF etc
      tags: Array.isArray(video.tags) ? video.tags : [],
    };
    if (!safe.primaryUrl) throw new Error("Primary YouTube URL is required.");
    if (!safe.category) throw new Error("Category is required.");

    const res = await this._requestJSON("POST", "/videos", safe, { useAuth: true });
    onProgress?.(95);
    this._etags.delete(`${this.workerUrl}/videos`);
    this._etags.delete(`${this.workerUrl}/stats`);
    onProgress?.(100);
    return res;
  }

  async update(id, updates, { onProgress } = {}) {
    onProgress?.(10);
    const res = await this._requestJSON(
      "PUT",
      `/videos/${encodeURIComponent(id)}`,
      updates,
      { useAuth: true }
    );
    onProgress?.(90);
    this._etags.delete(`${this.workerUrl}/videos`);
    this._etags.delete(`${this.workerUrl}/stats`);
    onProgress?.(100);
    return res;
  }

  async delete(id, { onProgress } = {}) {
    onProgress?.(15);
    const res = await this._requestJSON(
      "DELETE",
      `/videos/${encodeURIComponent(id)}`,
      undefined,
      { useAuth: true }
    );
    onProgress?.(85);
    this._etags.delete(`${this.workerUrl}/videos`);
    this._etags.delete(`${this.workerUrl}/stats`);
    onProgress?.(100);
    return res;
  }

  // ---------------- views refresh (same pattern as thumbnails) ----------------
  async refresh(videoId, { onProgress } = {}) {
    const res = await this._requestJSON(
      "POST",
      `/views/refresh/${encodeURIComponent(videoId)}`,
      undefined,
      { useAuth: true, timeoutMs: 70000 }
    );
    this._etags.delete(`${this.workerUrl}/videos`);
    this._etags.delete(`${this.workerUrl}/stats`);
    return res;
  }

  async refreshAll({ onProgress } = {}) {
    const res = await this._requestJSON(
      "POST",
      `/views/refresh`,
      undefined,
      { useAuth: true, timeoutMs: 180000 }
    );
    this._etags.delete(`${this.workerUrl}/videos`);
    this._etags.delete(`${this.workerUrl}/stats`);
    return res;
  }
}

// Factory so AdminVideosPage can call createVideoStorage(...) just like thumbnails
export const createVideoStorage = (workerUrl, tokenOrGetter, opts) =>
  new CloudflareVideoStorage(workerUrl, tokenOrGetter, opts);
