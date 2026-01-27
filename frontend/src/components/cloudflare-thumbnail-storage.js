/**
 * Cloudflare Workers · Thumbnail Storage Helper (Worker-compatible)
 * -----------------------------------------------------------------
 * Endpoints used:
 *  - GET    /thumbnails
 *  - GET    /stats
 *  - POST   /thumbnails            (admin)
 *  - PUT    /thumbnails/:id        (admin)
 *  - DELETE /thumbnails/:id        (admin)
 *  - POST   /bulk-import           (admin)
 *  - POST   /views/refresh         (admin)
 *  - POST   /views/refresh/:id     (admin)
 *
 * For admin endpoints, pass a Bearer token via constructor or setToken().
 * Includes a tiny ETag cache for GETs and optional job polling passthrough.
 */

export class CloudflareThumbnailStorage {
  /**
   * @param {string} workerUrl
   * @param {string | (() => string)} [tokenOrGetter] - Bearer token or getter fn
   * @param {Object} [opts]
   * @param {number} [opts.timeoutMs]
   * @param {number} [opts.retries]
   * @param {number} [opts.baseRetryDelayMs]
   * @param {boolean} [opts.enableEtagCache]
   * @param {boolean} [opts.forceAuthForReads]  // include Authorization on GETs if true
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

    this._etags = new Map(); // url -> { etag, payload }
  }

  setToken(token) {
    this._tokenGetter = () => token || "";
  }

  clearCache() {
    this._etags.clear();
  }

  // ---------- utils ----------
  /** Estimate decoded bytes of a data: URL (base64) image */
  _estimateDataUrlSizeBytes(dataUrl = "") {
    if (!dataUrl.startsWith("data:")) return 0;
    const comma = dataUrl.indexOf(",");
    if (comma < 0) return 0;
    const meta = dataUrl.slice(0, comma);
    const isB64 = /;base64/i.test(meta);
    const payload = dataUrl.slice(comma + 1);
    if (!isB64) {
      // URI-encoded data; rough decode size
      try {
        return new TextEncoder().encode(decodeURIComponent(payload)).length;
      } catch {
        return payload.length;
      }
    }
    // base64 size ~= 3/4 of payload length (minus padding)
    const len = payload.length - (payload.endsWith("==") ? 2 : payload.endsWith("=") ? 1 : 0);
    return Math.floor(len * 0.75);
  }

  /** Sanitize & validate a thumbnail payload before sending to Worker */
  _validateThumbnailInput(th) {
    const errors = [];
    const safe = {
      filename: String(th.filename || "").trim(),
      youtubeUrl: th.youtubeUrl ? String(th.youtubeUrl).trim() : "",
      category: String(th.category || "").trim(),
      subcategory: th.subcategory ? String(th.subcategory).trim() : "",
      variant: String(th.variant || "").trim(),
      imageUrl: th.imageUrl ? String(th.imageUrl) : "",
    };

    // Required fields (to match Admin requirement)
    if (!safe.filename) errors.push("Filename is required.");
    if (!safe.category) errors.push("Category is required.");
    if (!safe.variant) errors.push("Variant is required.");
    if (!safe.imageUrl) errors.push("Thumbnail image is required.");

    // 25 MB ceiling (Cloudflare KV item value limit is ~25 MiB and your Worker stores list in a single KV entry)
    const bytes = this._estimateDataUrlSizeBytes(safe.imageUrl);
    const MAX = 25 * 1024 * 1024; // 25MB hard stop to avoid 413 from Worker
    if (bytes > MAX) {
      errors.push(`Image is too large (${(bytes / (1024 * 1024)).toFixed(1)} MB). Max 25 MB.`);
    }

    if (errors.length) {
      const err = new Error(errors.join(" "));
      err.code = "VALIDATION";
      throw err;
    }
    return safe;
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
          try { data = await res.json(); } catch { }
          if (data?.error) msg = data.error;
          if (data?.message) msg = data.message;

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

    // Build headers with optional auth + If-None-Match
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
      } catch { }
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
    // Worker uses async jobs for view refresh only; keep a passthrough here.
    if (typeof onProgress === "function") {
      try { onProgress({ status: "queued-or-done" }); } catch { }
    }
    return result;
  }

  // ---------- reads ----------
  async getAll() {
    const data = await this._getWithEtag("/thumbnails");
    return Array.isArray(data?.thumbnails) ? data.thumbnails : [];
  }

  async getStats() {
    return this._getWithEtag("/stats");
  }

  // ---------- writes (admin) ----------
  /**
   * Create a thumbnail (client-side validates required fields + 25MB guard)
   * @param {object} thumbnail
   * @param {{ onProgress?: (p:number)=>void }} [opts]  // 0..100
   */
  async add(thumbnail, opts = {}) {
    const onProgress = typeof opts.onProgress === "function" ? opts.onProgress : null;
    const safe = this._validateThumbnailInput(thumbnail);

    onProgress?.(5);   // validate
    const res = await this._requestJSON("POST", "/thumbnails", safe, { useAuth: true });
    onProgress?.(90);  // server responded
    await this._pollJobIfAny(res);
    this._etags.delete(`${this.workerUrl}/thumbnails`);
    this._etags.delete(`${this.workerUrl}/stats`);
    onProgress?.(100);
    return { success: true, data: res?.thumbnail ?? res };
  }

  /**
   * Update a thumbnail (validates when imageUrl present)
   * @param {string} id
   * @param {object} updates
   * @param {{ onProgress?: (p:number)=>void }} [opts]
   */
  async update(id, updates, opts = {}) {
    const onProgress = typeof opts.onProgress === "function" ? opts.onProgress : null;
    let body = { ...updates };
    if (body.imageUrl) {
      // If image changed, validate size & requireds minimally
      const bytes = this._estimateDataUrlSizeBytes(body.imageUrl);
      const MAX = 25 * 1024 * 1024;
      if (bytes > MAX) {
        const err = new Error(`Image is too large (${(bytes / (1024 * 1024)).toFixed(1)} MB). Max 25 MB.`);
        err.code = "VALIDATION";
        throw err;
      }
    }
    onProgress?.(10);
    const res = await this._requestJSON("PUT", `/thumbnails/${encodeURIComponent(id)}`, body, { useAuth: true });
    onProgress?.(90);
    await this._pollJobIfAny(res);
    this._etags.delete(`${this.workerUrl}/thumbnails`);
    this._etags.delete(`${this.workerUrl}/stats`);
    onProgress?.(100);
    return { success: true, data: res?.thumbnail ?? res };
  }

  /**
   * Delete a thumbnail
   * @param {string} id
   * @param {{ onProgress?: (p:number)=>void }} [opts]
   */
  async delete(id, opts = {}) {
    const onProgress = typeof opts.onProgress === "function" ? opts.onProgress : null;
    onProgress?.(15);
    const res = await this._requestJSON("DELETE", `/thumbnails/${encodeURIComponent(id)}`, undefined, { useAuth: true });
    onProgress?.(85);
    await this._pollJobIfAny(res);
    this._etags.delete(`${this.workerUrl}/thumbnails`);
    this._etags.delete(`${this.workerUrl}/stats`);
    onProgress?.(100);
    return { success: true, data: res ?? null };
  }

  async bulkDelete(ids, opts = {}) {
    const onProgress = typeof opts.onProgress === "function" ? opts.onProgress : null;
    onProgress?.(10);
    const res = await this._requestJSON("DELETE", "/thumbnails/bulk", { ids }, { useAuth: true });
    onProgress?.(90);
    await this._pollJobIfAny(res);
    this._etags.delete(`${this.workerUrl}/thumbnails`);
    this._etags.delete(`${this.workerUrl}/stats`);
    onProgress?.(100);
    return { success: true, data: res ?? null };
  }

  /**
   * Simple bulk import (server handles replace/add mechanics)
   * @param {Array<object>} thumbnails
   * @param {boolean} replace
   * @param {{ onProgress?: (p: {done:number, total:number}) => void }} [opts]
   */
  async bulkImport(thumbnails, replace = false, { onProgress } = {}) {
    const res = await this._requestJSON("POST", "/bulk-import", { thumbnails, replace }, { useAuth: true });
    await this._pollJobIfAny(res, { onProgress });
    this._etags.delete(`${this.workerUrl}/thumbnails`);
    this._etags.delete(`${this.workerUrl}/stats`);
    if (typeof onProgress === "function") {
      try { onProgress({ done: thumbnails.length, total: thumbnails.length }); } catch { }
    }
    return res;
  }

  /**
   * Client-side chunked import helper (optional)
   * Does NOT persist checkpoints; caller can do so if needed.
   * @param {Array<object>} thumbnails
   * @param {{
   *   replace?: boolean,
   *   chunkSize?: number,
   *   onProgress?: (p: {done:number,total:number,phase:"replace"|"append",percent:number}) => void
   * }} [opts]
   */
  async bulkImportChunked(thumbnails, opts = {}) {
    const { replace = false, chunkSize = 50, onProgress } = opts;
    const total = thumbnails.length;

    const emit = (done, phase) => {
      const percent = total ? Math.round((done / total) * 100) : 100;
      onProgress?.({ done, total, phase, percent });
    };

    if (replace) {
      await this._requestJSON("POST", "/bulk-import", { thumbnails: [], replace: true }, { useAuth: true });
      emit(0, "replace");
    }

    let done = 0;
    for (let i = 0; i < thumbnails.length; i += chunkSize) {
      const chunk = thumbnails.slice(i, i + chunkSize);
      await this._requestJSON("POST", "/bulk-import", { thumbnails: chunk, replace: false }, { useAuth: true });
      done = Math.min(i + chunk.length, total);
      emit(done, "append");
    }

    this._etags.delete(`${this.workerUrl}/thumbnails`);
    this._etags.delete(`${this.workerUrl}/stats`);
    return { success: true, imported: total, replace };
  }

  // ---------- view refresh helpers (admin) ----------
  async refreshAll({ onProgress } = {}) {
    const res = await this._requestJSON("POST", "/views/refresh", undefined, { useAuth: true, timeoutMs: 180000 });
    await this._pollJobIfAny(res, { onProgress });
    this._etags.delete(`${this.workerUrl}/thumbnails`);
    this._etags.delete(`${this.workerUrl}/stats`);
    return res;
  }

  async refreshOne(videoId) {
    const res = await this._requestJSON("POST", `/views/refresh/${encodeURIComponent(videoId)}`, undefined, { useAuth: true, timeoutMs: 70000 });
    await this._pollJobIfAny(res);
    this._etags.delete(`${this.workerUrl}/thumbnails`);
    this._etags.delete(`${this.workerUrl}/stats`);
    return res;
  }

  // ---------- convenience ----------
  async export() {
    const list = await this.getAll();
    return JSON.stringify(list, null, 2);
  }

  async testConnection() {
    try {
      const headers = new Headers();
      if (this._opts.forceAuthForReads) {
        const token = this._tokenGetter?.() || "";
        if (token) headers.set("Authorization", `Bearer ${token}`);
      }
      const r = await this._fetchWithTimeout(`${this.workerUrl}/stats`, { headers }, { timeoutMs: 5000 });
      return r.ok;
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

export function createThumbnailStorage(workerUrl, tokenOrGetter, opts) {
  return new CloudflareThumbnailStorage(workerUrl, tokenOrGetter, opts);
}

export default CloudflareThumbnailStorage;
