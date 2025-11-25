// src/components/AdminThumbnailsPage.jsx
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  memo,
  useCallback,
} from "react";
import {
  Plus,
  Trash2,
  Edit2,
  Upload,
  Download,
  ExternalLink,
  Eye,
  RefreshCw,
  Image as ImageIcon,
  AlertCircle,
  Filter,
  Search,
  Copy,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Layers,
  Info,
  ChevronRight,
} from "lucide-react";
import { createThumbnailStorage } from "./cloudflare-thumbnail-storage";

/**
 * Admin · Thumbnails Manager (KV-only, no R2)
 * - Image uploads go straight to the Worker (KV) via /thumbnails/upload
 * - No manual "Thumbnail URL" field — the URL is returned by the Worker
 * - Strong validation + deterministic progress bars + resumable import
 */

const AUTH_BASE =
  import.meta.env.VITE_AUTH_BASE ||
  "https://shinel-auth.your-account.workers.dev";
const YOUTUBE_API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY || "";

const LS_TOKEN_KEY = "token";
const LS_FORM_DRAFT_KEY = "admin-thumbs-form-draft";
const LS_PRESETS_KEY = "thumbs-presets";
const LS_IMPORT_CHECKPOINT = "thumbs-import-checkpoint";

const TIMEOUTS = {
  read: 70000,
  fetchYT: 70000,
  save: 70000,
  singleRefresh: 70000,
  bulkRefresh: 180000,
  upload: 180000,
  jobPoll: 15000,
};

// Helper store (gets token from localStorage)
const store = createThumbnailStorage(AUTH_BASE, () =>
  localStorage.getItem(LS_TOKEN_KEY)
);

// how many items per import request
const IMPORT_CHUNK_SIZE = 50;

const DEFAULT_FORM = {
  filename: "",
  youtubeUrl: "",
  category: "GAMING",
  subcategory: "",
  variant: "VIDEO",
  imageUrl: "", // set automatically after upload
  _file: null, // local file for preview only
  _imageMeta: null, // preview info
};

// ---------- Utilities ----------
const getToken = () => localStorage.getItem(LS_TOKEN_KEY) || "";
const getAuthHeaders = (isJSON = true) =>
  isJSON
    ? {
        "Content-Type": "application/json",
        authorization: `Bearer ${getToken()}`,
      }
    : { authorization: `Bearer ${getToken()}` };

// Only used by non-helper endpoints (e.g., fetch-youtube)
async function fetchJSON(
  url,
  options = {},
  { retries = 1, timeoutMs = 0, idempotent = true, retryOnAbort = true } = {}
) {
  const controller = timeoutMs ? new AbortController() : null;
  const timer = timeoutMs ? setTimeout(() => controller.abort(), timeoutMs) : null;

  try {
    const res = await fetch(url, { signal: controller?.signal, ...options });
    const text = await res.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { raw: text };
    }

    if (!res.ok) {
      const msg =
        data?.error || data?.message || `Request failed (${res.status})`;
      const err = new Error(msg);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  } catch (err) {
    const isAbort = err?.name === "AbortError";
    if (isAbort) {
      const prettified = new Error(
        "Network timeout — the server took too long to respond."
      );
      prettified.code = "TIMEOUT";
      if (retries > 0 && retryOnAbort && idempotent) {
        await new Promise((r) => setTimeout(r, 600));
        return fetchJSON(url, options, {
          retries: retries - 1,
          timeoutMs,
          idempotent,
          retryOnAbort,
        });
      }
      throw prettified;
    }
    const retriable =
      err?.status === 429 || (err?.status >= 500 && err?.status < 600);
    if (retries > 0 && (retriable || (idempotent && !err?.status))) {
      await new Promise((r) => setTimeout(r, 700));
      return fetchJSON(url, options, {
        retries: retries - 1,
        timeoutMs,
        idempotent,
        retryOnAbort,
      });
    }
    throw err;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

const bytes = (n) => {
  if (n == null) return "-";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
};

const timeAgo = (ts) => {
  if (!ts) return "Never";
  const seconds = Math.floor((Date.now() - ts) / 1000);
  const map = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60,
  };
  for (const [unit, len] of Object.entries(map)) {
    const n = Math.floor(seconds / len);
    if (n >= 1) return `${n} ${unit}${n > 1 ? "s" : ""} ago`;
  }
  return "Just now";
};

function useToasts() {
  const [toasts, setToasts] = useState([]);
  const add = (type, message, ttl = 3500) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, type, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), ttl);
  };
  return { toasts, add };
}

async function runWithConcurrency(items, worker, concurrency = 5, onTick) {
  const results = [];
  let i = 0;
  const runners = Array.from(
    { length: Math.min(concurrency, items.length) },
    async () => {
      while (i < items.length) {
        const idx = i++;
        try {
          const out = await worker(items[idx], idx);
          results[idx] = out;
        } catch (e) {
          results[idx] = e;
        } finally {
          onTick?.(idx);
        }
      }
    }
  );
  await Promise.all(runners);
  return results;
}

// ---------- Component ----------
export default function AdminThumbnailsPage() {
  const [thumbnails, setThumbnails] = useState([]);
  const [stats, setStats] = useState(null);

  // Operation progress (show as a bar)
  // { kind: 'upload'|'create'|'update'|'delete'|'bulk-delete', pct: 0-100, note?: string }
  const [op, setOp] = useState(null);

  const [busy, setBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState("");
  const [err, setErr] = useState("");
  const [errDetails, setErrDetails] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [refreshingId, setRefreshingId] = useState(null);
  const [refreshingAll, setRefreshingAll] = useState(false);
  const [isPending, startTransition] = useTransition();

  // just-created/updated row highlight
  const [flashKey, setFlashKey] = useState("");

  // validation errors (per-field)
  const [vErrs, setVErrs] = useState({});

  // form & presets
  const [form, setForm] = useState(() => {
    const draft = localStorage.getItem(LS_FORM_DRAFT_KEY);
    try {
      return draft ? { ...DEFAULT_FORM, ...JSON.parse(draft) } : { ...DEFAULT_FORM };
    } catch {
      return { ...DEFAULT_FORM };
    }
  });

  const [presets, setPresets] = useState(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem(LS_PRESETS_KEY)) || {};
      return {
        category: parsed.category || [],
        subcategory: parsed.subcategory || [],
        variants: parsed.variants || ["VIDEO", "LIVE"],
        filenameTemplates: parsed.filenameTemplates || [],
      };
    } catch {
      return {
        category: [],
        subcategory: [],
        variants: ["VIDEO", "LIVE"],
        filenameTemplates: [],
      };
    }
  });

  const { toasts, add: toast } = useToasts();

  // list controls
  const [searchInput, setSearchInput] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [filters, setFilters] = useState({
    category: "ALL",
    variant: "ALL",
    onlyYT: "ALL",
  });

  // SIMPLIFIED SORT
  const [sort, setSort] = useState({ key: "updated", dir: "desc" });

  const [selectedIds, setSelectedIds] = useState(new Set());
  const [copyOkId, setCopyOkId] = useState(null);

  const fileInputRef = useRef(null);
  const dropRef = useRef(null);
  const lastRetryRef = useRef({ fn: null, args: [] });

  // error helpers
  const surfaceError = (message, details = "", retryFn = null, retryArgs = []) => {
    setErr(message);
    setErrDetails(
      typeof details === "string" ? details : JSON.stringify(details, null, 2)
    );
    lastRetryRef.current = { fn: retryFn, args: retryArgs };
    setOp(null);
  };
  const clearError = () => {
    setErr("");
    setErrDetails("");
    lastRetryRef.current = { fn: null, args: [] };
  };

  // ----------- Data loaders (helper) -----------
  const loadThumbnails = useCallback(async () => {
    setBusy(true);
    setBusyLabel("Loading thumbnails...");
    clearError();
    try {
      const rows = await store.getAll();
      startTransition(() => setThumbnails(rows || []));
    } catch (e) {
      surfaceError(e.message || "Error loading thumbnails", e, loadThumbnails);
    } finally {
      setBusy(false);
      setBusyLabel("");
    }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const data = await store.getStats();
      setStats(data || null);
    } catch (e) {
      console.error("Failed to load stats:", e);
    }
  }, []);

  // ----------- Jobs (placeholder) -----------
  const pollJob = async (_jobId, _onProgress) => {
    return { status: "done" };
  };

  // ----------- YouTube ops (non-helper endpoint) -----------
  const fetchYouTubeDetails = async (url) => {
    if (!url) return;
    setBusy(true);
    setBusyLabel("Fetching YouTube details...");
    clearError();
    try {
      const data = await fetchJSON(
        `${AUTH_BASE}/thumbnails/fetch-youtube`,
        {
          method: "POST",
          headers: getAuthHeaders(true),
          body: JSON.stringify({ youtubeUrl: url, apiKey: YOUTUBE_API_KEY }),
        },
        { timeoutMs: TIMEOUTS.fetchYT, retries: 1, idempotent: true }
      );
      if (data?.details) {
        const viewsText = data.details.views
          ? `\nViews: ${Number(data.details.views).toLocaleString()}`
          : "";
        const lastUpdated = data.details.lastUpdated
          ? `\n\nLast updated: ${new Date(
              data.details.lastUpdated
            ).toLocaleString()}`
          : "";
        toast(
          "success",
          `Video found!\n\nTitle: ${data.details.title}${viewsText}${lastUpdated}\n\nView counts are cached and refreshed weekly.`
        );
      } else if (data?.videoId) {
        toast(
          "warning",
          `Video ID: ${data.videoId}\n\nSet YOUTUBE_API_KEY in your worker to fetch title & views automatically.`
        );
      } else {
        toast("warning", "Requested. If queued, results appear after refresh.");
      }
    } catch (e) {
      surfaceError(e.message || "Error fetching video", e.data, fetchYouTubeDetails, [url]);
      toast("error", e.message || "Error fetching video");
    } finally {
      setBusy(false);
      setBusyLabel("");
    }
  };

  // ----------- Refresh (helper) -----------
  const refreshSingleView = async (videoId, thumbnailId) => {
    setRefreshingId(thumbnailId);
    try {
      const data = await store.refreshOne(videoId);
      await pollJob(data?.jobId);
      await loadThumbnails();
      const status = data?.status === "deleted" ? " (Video Deleted)" : "";
      const views =
        data?.views != null ? `\n\nViews: ${Number(data.views).toLocaleString()}` : "";
      toast("success", `Refreshed!${views}${status}`);
    } catch (e) {
      surfaceError(e.message || "Failed to refresh", e, refreshSingleView, [
        videoId,
        thumbnailId,
      ]);
      toast("error", e.message || "Failed to refresh");
    } finally {
      setRefreshingId(null);
    }
  };

  const refreshAllViews = async () => {
    if (!confirm("Refresh view counts for all videos older than 7 days?")) return;
    setRefreshingAll(true);
    setBusyLabel("Refreshing all views...");
    try {
      const data = await store.refreshAll();
      await pollJob(data?.jobId);
      await loadThumbnails();
      toast("success", data?.message || "Refreshed!");
    } catch (e) {
      surfaceError(e.message || "Failed to refresh", e, refreshAllViews);
      toast("error", e.message || "Failed to refresh");
    } finally {
      setRefreshingAll(false);
      setBusyLabel("");
    }
  };

  // ----------- Upload to Worker (KV) -----------
  async function uploadThumbnailToWorker(file, setPct) {
    const formData = new FormData();
    formData.append("file", file);

    setPct?.(10, "Uploading…");

    const res = await fetch(`${AUTH_BASE}/thumbnails/upload`, {
      method: "POST",
      headers: { authorization: `Bearer ${getToken()}` },
      body: formData,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.imageUrl) {
      throw new Error(data?.error || `Upload failed (${res.status})`);
    }

    setPct?.(95, "Finalizing…");
    return data.imageUrl; // public URL served by the Worker
  }

  // ----------- Image handling (Preview + auto-upload) -----------
  const validateImageFile = (file) => {
    if (!file) return "No file selected";
    const okTypes = ["image/png", "image/jpeg"];
    if (!okTypes.includes(file.type)) return "Please choose a PNG or JPG image";
    const max = 25 * 1024 * 1024;
    if (file.size > max) return "Image size must be less than 25MB";
    return null;
  };

  const readImageMeta = (file) =>
    new Promise((resolve) => {
      const img = new Image();
      img.onload = () =>
        resolve({
          width: img.naturalWidth,
          height: img.naturalHeight,
          size: file.size,
          type: file.type,
        });
      img.onerror = () => resolve(null);
      img.src = URL.createObjectURL(file);
    });

  async function makePreviewDataURL(file, maxSide = 480) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const { naturalWidth: w, naturalHeight: h } = img;
        const scale = Math.min(1, maxSide / Math.max(w, h));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(w * scale);
        canvas.height = Math.round(h * scale);
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const isPng = (file.type || "").includes("png");
        resolve(
          canvas.toDataURL(isPng ? "image/png" : "image/jpeg", isPng ? undefined : 0.85)
        );
      };
      img.onerror = () => resolve(null);
      img.src = URL.createObjectURL(file);
    });
  }

  const handleImageSelected = async (file) => {
    const msg = validateImageFile(file);
    if (msg) {
      surfaceError(msg);
      toast("error", msg);
      return;
    }

    setBusy(true);
    setBusyLabel("Preparing image...");
    const setPct = (pct, note) => setOp({ kind: "upload", pct, note });

    try {
      // Local preview
      const smallPreview = await makePreviewDataURL(file, 480);
      const meta = await readImageMeta(file);
      setForm((f) => ({
        ...f,
        _file: file,
        _imageMeta: meta,
      }));
      setImagePreview(smallPreview || "");
      clearError();

      // Upload to Worker (returns public URL)
      setPct(20, "Validating…");
      setBusyLabel("Uploading thumbnail…");
      const imageUrl = await uploadThumbnailToWorker(file, setPct);

      setForm((f) => ({ ...f, imageUrl }));
      setPct(100, "Done");
      toast("success", "Thumbnail uploaded ✓");
    } catch (e) {
      surfaceError("Failed to upload image", e?.message || e);
      toast("error", e.message || "Failed to upload image");
    } finally {
      setBusy(false);
      setBusyLabel("");
      setTimeout(() => setOp(null), 600);
    }
  };

  const handleImageInputChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await handleImageSelected(file);
  };

  useEffect(() => {
    const el = dropRef.current;
    if (!el) return;
    const prevent = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };
    const onDrop = (e) => {
      prevent(e);
      const file = e.dataTransfer?.files?.[0];
      if (file) handleImageSelected(file);
    };
    ["dragenter", "dragover", "dragleave", "drop"].forEach((evt) =>
      el.addEventListener(evt, prevent)
    );
    el.addEventListener("drop", onDrop);
    return () => {
      ["dragenter", "dragover", "dragleave", "drop"].forEach((evt) =>
        el.removeEventListener(evt, prevent)
      );
      el.removeEventListener("drop", onDrop);
    };
  }, []);

  const downloadImage = async (url, suggestedName = "thumbnail") => {
    try {
      if (!url) throw new Error("No image to download");
      const res = await fetch(url, { headers: getAuthHeaders(false) });
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      const ext = blob.type.split("/")[1] || "png";
      a.download = `${suggestedName}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(a.href);
      toast("success", "Download started");
    } catch (e) {
      surfaceError(e.message || "Failed to download image", e);
      toast("error", e.message || "Failed to download image");
    }
  };

  // ----------- Validation helpers -----------
  const validateSubmit = (payload) => {
    const errs = {};
    if (!payload.filename?.trim()) errs.filename = "Filename is required";
    if (!payload.category?.trim()) errs.category = "Category is required";
    if (!payload.variant?.trim()) errs.variant = "Variant is required";

    // Image must be uploaded (imageUrl provided by Worker)
    if (!payload.imageUrl?.trim()) {
      errs.imageUrl = "Please upload a thumbnail image.";
    } else {
      try {
        const u = new URL(payload.imageUrl);
        if (!/^https?:$/.test(u.protocol)) {
          errs.imageUrl = "Image URL must be http(s).";
        }
      } catch {
        errs.imageUrl = "Invalid image URL.";
      }
    }

    setVErrs(errs);
    return Object.keys(errs).length === 0;
  };

  // ----------- CRUD (helper) -----------
  const saveThumbnail = async (e) => {
    e?.preventDefault?.();
    clearError();

    const payload = { ...form };
    delete payload._file;
    delete payload._imageMeta;

    if (!validateSubmit(payload)) {
      toast("error", "Please fix validation errors.");
      return;
    }

    // Deterministic staged progress: Validate (20) → Save (100)
    const setPct = (pct, note) =>
      setOp({ kind: editingId ? "update" : "create", pct, note });

    try {
      setPct(20, "Validated");

      setBusy(true);
      setBusyLabel(editingId ? "Updating thumbnail..." : "Creating thumbnail...");

      let saved = null;
      if (editingId) {
        setPct(55, "Sending update...");
        const out = await store.update(editingId, payload);
        saved = out?.data || null;
      } else {
        setPct(55, "Sending create...");
        const out = await store.add(payload);
        saved = out?.data || null;
      }

      setPct(85, "Refreshing…");
      await Promise.all([loadThumbnails(), loadStats()]);
      setPct(100, "Done");

      const flash =
        saved?.id || saved?._id
          ? String(saved.id || saved._id)
          : `${payload.filename}|${payload.youtubeUrl || ""}|${payload.category}|${payload.variant}`;
      setFlashKey(flash);
      setTimeout(() => setFlashKey(""), 2500);
      toast("success", editingId ? "Updated ✓" : "Uploaded ✓");

      // remember recent values
      const nextPresets = { ...presets };
      const pushUnique = (arr, v) => {
        if (!v) return;
        const idx = arr.indexOf(v);
        if (idx >= 0) arr.splice(idx, 1);
        arr.unshift(v);
        if (arr.length > 12) arr.length = 12;
      };
      pushUnique(nextPresets.category, payload.category);
      pushUnique(nextPresets.subcategory, payload.subcategory);
      pushUnique(nextPresets.variants, payload.variant);
      pushUnique(nextPresets.filenameTemplates, payload.filename);
      setPresets(nextPresets);
      localStorage.setItem(LS_PRESETS_KEY, JSON.stringify(nextPresets));

      setForm({ ...DEFAULT_FORM });
      localStorage.removeItem(LS_FORM_DRAFT_KEY);
      setEditingId(null);
      setImagePreview("");
    } catch (e) {
      surfaceError(e.message || "Error saving thumbnail", e, saveThumbnail, []);
      toast("error", e.message || "Error saving thumbnail");
    } finally {
      setBusy(false);
      setBusyLabel("");
      setTimeout(() => setOp(null), 600);
    }
  };

  const deleteThumbnail = async (id, filename) => {
    if (
      !confirm(
        `Delete thumbnail "${filename}"?\n\nNote: View count data will be preserved in storage.`
      )
    )
      return;

    clearError();
    // staged progress
    setOp({ kind: "delete", pct: 10, note: "Queued…" });

    setBusy(true);
    setBusyLabel("Deleting...");
    const prev = thumbnails;
    // optimistic UI (still reload after to avoid drift)
    setThumbnails((ts) => ts.filter((x) => x.id !== id));

    try {
      setOp({ kind: "delete", pct: 40, note: "Sending delete…" });
      await store.delete(id);

      setOp({ kind: "delete", pct: 75, note: "Refreshing…" });
      await Promise.all([loadThumbnails(), loadStats()]);

      setOp({ kind: "delete", pct: 100, note: "Done" });
      toast("success", "Deleted");
    } catch (e) {
      setThumbnails(prev);
      surfaceError(e.message || "Error deleting thumbnail", e, deleteThumbnail, [
        id,
        filename,
      ]);
      toast("error", e.message || "Error deleting thumbnail");
    } finally {
      setBusy(false);
      setBusyLabel("");
      setTimeout(() => setOp(null), 700);
    }
  };

  const editThumbnail = (t) => {
    setEditingId(t.id);
    setForm({
      ...DEFAULT_FORM,
      filename: t.filename,
      youtubeUrl: t.youtubeUrl || "",
      category: t.category,
      subcategory: t.subcategory || "",
      variant: t.variant,
      imageUrl: t.imageUrl || "", // URL we already host
    });
    setImagePreview(t.imageUrl || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const duplicateThumbnail = (t) => {
    setEditingId(null);
    setForm({
      ...DEFAULT_FORM,
      filename: `${t.filename}-copy`,
      youtubeUrl: t.youtubeUrl || "",
      category: t.category,
      subcategory: t.subcategory || "",
      variant: t.variant,
      imageUrl: t.imageUrl || "",
    });
    setImagePreview(t.imageUrl || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
    toast("success", "Duplicated into the form");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm({ ...DEFAULT_FORM });
    setImagePreview("");
    setVErrs({});
  };

  const exportData = () => {
    const dataStr = JSON.stringify(thumbnails, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `thumbnails-export-${new Date().toISOString().split("T")[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast("success", "Exported JSON");
  };

  // ---------- Resumable Import (chunked) via helper ----------
  const _writeCheckpoint = (cp) =>
    localStorage.setItem(LS_IMPORT_CHECKPOINT, JSON.stringify(cp));
  const _readCheckpoint = () => {
    try {
      return JSON.parse(localStorage.getItem(LS_IMPORT_CHECKPOINT) || "null");
    } catch {
      return null;
    }
  };
  const _clearCheckpoint = () => localStorage.removeItem(LS_IMPORT_CHECKPOINT);

  const _resumeImportIfAny = async () => {
    const cp = _readCheckpoint();
    if (!cp) return false;
    if (
      !confirm(
        `Resume importing "${cp.fileName}" from item ${cp.index + 1} of ${cp.total}?`
      )
    ) {
      _clearCheckpoint();
      return false;
    }
    await _runImport(
      cp.payloadAll,
      cp.replace,
      cp.index,
      cp.chunkSize,
      cp.fileName,
      true
    );
    return true;
  };

  const _runImport = async (
    payloadAll,
    replace,
    startIndex = 0,
    chunkSize = IMPORT_CHUNK_SIZE,
    fileName = "import.json",
    isResume = false
  ) => {
    setBusy(true);
    setBusyLabel(isResume ? "Resuming import..." : "Importing...");
    clearError();

    const total = payloadAll.length;
    const updatePct = (done) =>
      setOp({
        kind: "create",
        pct: Math.min(100, Math.round((done / total) * 100)),
        note: `Imported ${done}/${total}`,
      });

    try {
      if (!isResume && replace) {
        await store.bulkImport([], true);
      }

      let done = 0;
      for (let i = startIndex; i < payloadAll.length; i += chunkSize) {
        const chunk = payloadAll.slice(i, i + chunkSize);
        setBusyLabel(
          `Importing ${Math.min(i + chunk.length, payloadAll.length)} / ${payloadAll.length}...`
        );
        _writeCheckpoint({
          fileName,
          index: i,
          chunkSize,
          replace: false,
          total: payloadAll.length,
          payloadAll,
        });

        await store.bulkImport(chunk, false);
        done = Math.min(i + chunk.length, payloadAll.length);
        updatePct(done);
      }

      _clearCheckpoint();
      await Promise.all([loadThumbnails(), loadStats()]);
      setOp({ kind: "create", pct: 100, note: "Done" });
      toast("success", `Imported ${payloadAll.length} ✓`);
    } catch (e) {
      surfaceError(e.message || "Error importing data", e);
      toast("error", e.message || "Error importing data");
    } finally {
      setBusy(false);
      setBusyLabel("");
      setTimeout(() => setOp(null), 700);
    }
  };

  const importData = async () => {
    const resumed = await _resumeImportIfAny();
    if (resumed) return;

    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (!Array.isArray(data))
          throw new Error("Invalid JSON format. Expected an array of thumbnails.");
        const replace = confirm(
          `Import ${data.length} thumbnails?\n\nClick OK to REPLACE all existing thumbnails.\nClick Cancel to ADD to existing thumbnails.`
        );
        await _runImport(data, replace, 0, IMPORT_CHUNK_SIZE, file.name, false);
      } catch (e) {
        surfaceError(e.message || "Error importing data", e);
        toast("error", e.message || "Error importing data");
      }
    };
    input.click();
  };

  // ----------- Effects -----------
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw-thumbnails.js")
        .catch(() => {
          /* ignore */
        });
    }
  }, []);

  useEffect(() => {
    (async () => {
      const token = getToken();
      if (!token) {
        surfaceError("Missing token - Please login to access this page", {
          hint: `Set "${LS_TOKEN_KEY}" in localStorage or ensure your login flow stores it.`,
        });
        return;
      }
      try {
        setBusy(true);
        setBusyLabel("Checking connection...");
        const ok = await store.testConnection();
        if (!ok) {
          surfaceError(`Cannot reach Worker at ${AUTH_BASE}`, {
            hint:
              "Verify VITE_AUTH_BASE, the Worker route, CORS (OPTIONS allowed), and that /stats endpoint returns 200.",
          });
          return;
        }
      } catch (e) {
        surfaceError(`Connection check failed`, e?.message || e);
        return;
      } finally {
        setBusy(false);
        setBusyLabel("");
      }
      await Promise.all([loadThumbnails(), loadStats()]);
    })();
  }, [loadThumbnails, loadStats]);

  useEffect(() => {
    const toSave = { ...form };
    delete toSave._file;
    delete toSave._imageMeta;
    localStorage.setItem(LS_FORM_DRAFT_KEY, JSON.stringify(toSave));
  }, [form]);

  useEffect(() => {
    const beforeUnload = (e) => {
      if (
        editingId ||
        form.filename ||
        form.youtubeUrl ||
        form.imageUrl ||
        (form._file && form._file.size > 0)
      ) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [editingId, form]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchInput.trim()), 220);
    return () => clearTimeout(t);
  }, [searchInput]);

  // ----------- Derived view -----------
  const filtered = useMemo(() => {
    let rows = [...thumbnails];
    if (debouncedQuery) {
      const q = debouncedQuery.toLowerCase();
      rows = rows.filter((t) =>
        [t.filename, t.category, t.subcategory, t.variant, t.videoId, t.youtubeUrl]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q))
      );
    }
    if (filters.category !== "ALL")
      rows = rows.filter((t) => t.category === filters.category);
    if (filters.variant !== "ALL")
      rows = rows.filter((t) => t.variant === filters.variant);
    if (filters.onlyYT === "YES") rows = rows.filter((t) => !!t.youtubeUrl);
    if (filters.onlyYT === "NO") rows = rows.filter((t) => !t.youtubeUrl);

    rows.sort((a, b) => {
      const dir = sort.dir === "asc" ? 1 : -1;
      switch (sort.key) {
        case "filename":
          return dir * a.filename.localeCompare(b.filename);
        case "updated":
          return dir * ((a.lastViewUpdate || 0) - (b.lastViewUpdate || 0));
        default:
          return 0;
      }
    });
    return rows;
  }, [thumbnails, debouncedQuery, filters, sort]);

  const allSelected =
    selectedIds.size > 0 && filtered.every((t) => selectedIds.has(t.id));
  const toggleSelectAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(filtered.map((t) => t.id)));
  };

    const thumbnailStats = useMemo(() => {
    if (!thumbnails || thumbnails.length === 0) return null;

    const total = thumbnails.length;
    let withYouTube = 0;
    const categorySet = new Set();
    const byVariant = {};

    for (const t of thumbnails) {
      if (t.youtubeUrl) withYouTube += 1;
      if (t.category) categorySet.add(t.category);
      if (t.variant) {
        byVariant[t.variant] = (byVariant[t.variant] || 0) + 1;
      }
    }

    return {
      total,
      withYouTube,
      categories: categorySet.size,
      byVariant,
    };
  }, [thumbnails]);


  const bulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} selected thumbnail(s)?`)) return;

    clearError();
    const ids = Array.from(selectedIds);
    let done = 0;
    const updatePct = () =>
      setOp({
        kind: "bulk-delete",
        pct: Math.min(100, Math.round((done / ids.length) * 100)),
        note: `Deleting ${done}/${ids.length}`,
      });

    setBusy(true);
    setBusyLabel("Deleting selected…");
    setOp({ kind: "bulk-delete", pct: 0, note: "Starting…" });

    try {
      await runWithConcurrency(
        ids,
        async (id) => store.delete(id),
        5,
        () => {
          done++;
          updatePct();
        }
      );

      setSelectedIds(new Set());
      await Promise.all([loadThumbnails(), loadStats()]);

      setOp({ kind: "bulk-delete", pct: 100, note: "Done" });
      toast("success", "Bulk delete completed");
    } catch (e) {
      surfaceError(e.message || "Bulk delete failed", e);
      toast("error", e.message || "Bulk delete failed");
    } finally {
      setBusy(false);
      setBusyLabel("");
      setTimeout(() => setOp(null), 800);
    }
  };

  const copyText = async (text, id) => {
    try {
      await navigator.clipboard.writeText(String(text || ""));
      setCopyOkId(id || text);
      setTimeout(() => setCopyOkId(null), 1200);
    } catch {}
  };

  // Variant filter dynamic list
  const variantFilterOptions = useMemo(() => {
    const base = presets.variants.length ? presets.variants : ["VIDEO", "LIVE"];
    return ["ALL", ...base];
  }, [presets.variants]);

  // ---------- Render ----------
  return (
    <section className="min-h-screen" style={{ background: "var(--surface)" }}>
      <LoadingOverlay
        show={busy || isPending}
        label={busyLabel || (isPending ? "Working..." : "")}
      />

      {/* Deterministic Progress Bar (top sticky) */}
      {op && (
        <div className="sticky top-0 z-40">
          <div
            className="w-full"
            style={{
              height: 4,
              background: "rgba(0,0,0,0.1)",
            }}
          >
            <div
              style={{
                width: `${op.pct}%`,
                height: 4,
                background:
                  op.kind === "delete" || op.kind === "bulk-delete"
                    ? "#ef4444"
                    : "var(--orange)",
                transition: "width 150ms linear",
              }}
            />
          </div>
          <div
            className="px-3 py-1 text-xs"
            style={{ color: "var(--text-muted)", background: "var(--surface)" }}
          >
            {op.kind === "create"
              ? "Saving"
              : op.kind === "update"
              ? "Updating"
              : op.kind === "delete"
              ? "Deleting"
              : op.kind === "bulk-delete"
              ? "Bulk Deleting"
              : "Working"}{" "}
            — {op.pct}% {op.note ? `· ${op.note}` : ""}
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-10 max-w-7xl">
        {/* Header */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-6">
          <h1
            className="text-2xl md:text-3xl font-bold"
            style={{ color: "var(--text)" }}
          >
            Admin · Thumbnails Manager
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={refreshAllViews}
              disabled={refreshingAll || busy}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
              style={{
                background: "linear-gradient(90deg, var(--orange), #ff9357)",
                opacity: refreshingAll ? 0.6 : 1,
              }}
              title="Refresh view counts (7+ days old)"
            >
              <RefreshCw
                size={16}
                className={refreshingAll ? "animate-spin" : ""}
              />
              {refreshingAll ? "Refreshing..." : "Refresh Views"}
            </button>
            <button
              onClick={exportData}
              disabled={busy || !thumbnails.length}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium disabled:opacity-50"
              style={{ borderColor: "var(--border)", color: "var(--text)" }}
              title="Export as JSON"
            >
              <Download size={16} /> Export
            </button>
            <button
              onClick={importData}
              disabled={busy}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium disabled:opacity-50"
              style={{ borderColor: "var(--border)", color: "var(--text)" }}
              title="Import from JSON (resumable)"
            >
              <Upload size={16} /> Import
            </button>
            <button
              onClick={() => {
                loadThumbnails();
                loadStats();
              }}
              disabled={busy}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium disabled:opacity-50"
              style={{ borderColor: "var(--border)", color: "var(--text)" }}
              title="Refresh"
            >
              <RefreshCw size={16} /> Reload
            </button>
          </div>
        </div>

        {/* Error Banner */}
        {err && (
          <div
            className="mb-4 rounded-lg p-3 text-sm flex items-start gap-3"
            style={{
              background: "rgba(255,59,48,0.08)",
              border: "1px solid rgba(255,59,48,0.3)",
            }}
          >
            <AlertCircle
              size={18}
              className="mt-0.5"
              style={{ color: "#ff3b30" }}
            />
            <div className="flex-1">
              <div className="font-medium" style={{ color: "#b91c1c" }}>
                {err}
              </div>
              {errDetails && (
                <details className="mt-1">
                  <summary
                    className="cursor-pointer"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Details
                  </summary>
                  <pre
                    className="mt-1 p-2 rounded text-xs overflow-auto"
                    style={{
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      color: "var(--text)",
                    }}
                  >
                    {errDetails}
                  </pre>
                </details>
              )}
              <div className="flex gap-2 mt-2">
                {lastRetryRef.current.fn && (
                  <button
                    onClick={() =>
                      lastRetryRef.current.fn?.(
                        ...(lastRetryRef.current.args || [])
                      )
                    }
                    className="px-2 py-1 text-xs rounded border"
                    style={{
                      borderColor: "var(--border)",
                      color: "var(--text)",
                    }}
                  >
                    Retry
                  </button>
                )}
                <button
                  onClick={clearError}
                  className="px-2 py-1 text-xs rounded border"
                  style={{
                    borderColor: "var(--border)",
                    color: "var(--text)",
                  }}
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Info Banner */}
        <div
          className="mb-4 rounded-lg p-3 text-sm flex items-start gap-2"
          style={{
            background: "rgba(232,80,2,0.1)",
            color: "var(--text)",
            border: "1px solid rgba(232,80,2,0.2)",
          }}
        >
          <Info
            size={16}
            style={{
              color: "var(--orange)",
              marginTop: "2px",
              flexShrink: 0,
            }}
          />
          <div>
            <strong>View Count System:</strong> View counts are cached and
            refreshed automatically once per week to save API quota. Use
            "Refresh Views" to manually update counts older than 7 days.
            Deleted videos show their last known view count.
          </div>
        </div>

        {/* Toolbar — aligned, compact */}
        <div className="mb-2">
          <div className="flex flex-wrap items-end gap-2">
            {/* Search */}
            <div className="relative flex-1 min-w-[220px]">
              <input
                className="w-full h-[42px] rounded-lg pl-9 pr-3"
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  color: "var(--text)",
                }}
                placeholder="Search filename, category, video id..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 opacity-70"
              />
            </div>

            {/* Filters group */}
            <div className="flex items-end gap-2">
              <span
                className="text-xs mb-[6px] px-2 py-1 rounded border"
                style={{
                  color: "var(--text-muted)",
                  borderColor: "var(--border)",
                }}
              >
                <Filter size={12} className="inline mr-1" /> Filters
              </span>

              <LabeledCompactSelect
                label="Category"
                value={filters.category}
                onChange={(v) => setFilters((f) => ({ ...f, category: v }))}
                options={["ALL", "GAMING", "VLOG", "MUSIC & BHAJANS", "OTHER"]}
              />

              <LabeledCompactSelect
                label="Variant"
                value={filters.variant}
                onChange={(v) => setFilters((f) => ({ ...f, variant: v }))}
                options={variantFilterOptions}
              />

              <LabeledCompactSelect
                label="YouTube"
                value={filters.onlyYT}
                onChange={(v) => setFilters((f) => ({ ...f, onlyYT: v }))}
                options={["ALL", "YES", "NO"]}
              />
            </div>

            {/* Sort group */}
            <div className="flex items-end gap-2 ml-auto">
              <span className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>
                Sort
              </span>
              <SortBtn
                active={sort.key === "filename"}
                dir={sort.dir}
                onClick={() => setSort((s) => ({ key: "filename", dir: s.dir }))}
              >
                Filename
              </SortBtn>
              <SortBtn
                active={sort.key === "updated"}
                dir={sort.dir}
                onClick={() => setSort((s) => ({ key: "updated", dir: s.dir }))}
              >
                Last Updated
              </SortBtn>
              <button
                className="inline-flex items-center gap-1 px-2 h-[36px] rounded border text-xs"
                style={{
                  borderColor: "var(--border)",
                  color: "var(--text)",
                }}
                onClick={() =>
                  setSort((s) => ({
                    ...s,
                    dir: s.dir === "asc" ? "desc" : "asc",
                  }))
                }
                title="Toggle sort direction"
              >
                {sort.dir === "asc" ? (
                  <ChevronUp size={14} />
                ) : (
                  <ChevronDown size={14} />
                )}{" "}
                Dir
              </button>
            </div>

            {/* Bulk delete */}
            <div className="flex items-end">
              <button
                onClick={bulkDelete}
                disabled={busy || selectedIds.size === 0}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium disabled:opacity-50"
                style={{ borderColor: "#fcc", color: "#c00" }}
                title="Bulk delete selected"
              >
                <Trash2 size={16} /> Delete Selected ({selectedIds.size})
              </button>
            </div>
          </div>
        </div>

        {/* Showing count */}
        <div className="mb-4 text-xs" style={{ color: "var(--text-muted)" }}>
          Showing <strong>{filtered.length}</strong> of{" "}
          <strong>{thumbnails.length}</strong>
        </div>

        {/* Add/Edit Form */}
        <form
          onSubmit={saveThumbnail}
          className="rounded-2xl p-4 border mb-6"
          style={{
            background: "var(--surface-alt)",
            borderColor: "var(--border)",
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="text-base font-semibold" style={{ color: "var(--text)" }}>
              {editingId ? "Edit Thumbnail" : "Add New Thumbnail"}
            </div>
            <div className="flex items-center gap-2">
              {editingId && (
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="text-sm px-3 py-1 rounded-lg"
                  style={{
                    color: "var(--text-muted)",
                    border: "1px solid var(--border)",
                  }}
                >
                  Cancel
                </button>
              )}
              {form.imageUrl && !form.imageUrl.startsWith("data:") && (
                <button
                  type="button"
                  onClick={() =>
                    downloadImage(form.imageUrl, form.filename || "thumbnail")
                  }
                  className="text-sm px-3 py-1 rounded-lg inline-flex items-center gap-2"
                  style={{
                    color: "var(--text)",
                    border: "1px solid var(--border)",
                  }}
                  title="Download full-quality image"
                >
                  <Download size={14} /> Download Original
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
            <InputWithPresets
              label="Filename *"
              value={form.filename}
              onChange={(v) => {
                setForm({ ...form, filename: v });
                setVErrs((e) => ({ ...e, filename: "" }));
              }}
              placeholder="e.g., Creator-Game-1-Video"
              recent={presets.filenameTemplates}
              error={vErrs.filename}
            />

            <div className="relative">
              <Input
  label="YouTube URL (Creator · preferred)"
  value={form.youtubeUrl}
  onChange={(v) => setForm({ ...form, youtubeUrl: v })}
  placeholder="Creator video URL, e.g. https://youtube.com/watch?v=..."
/>

              {form.youtubeUrl && (
                <div className="absolute right-2 top-8 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => fetchYouTubeDetails(form.youtubeUrl)}
                    className="p-1 text-xs"
                    style={{ color: "var(--orange)" }}
                    title="Fetch video details"
                  >
                    <ExternalLink size={16} />
                  </button>
                </div>
              )}
            </div>

            {/* Category (fixed options) */}
            <SelectWithPresets
              label="Category *"
              value={form.category}
              onChange={(v) => {
                setForm({ ...form, category: v });
                setVErrs((e) => ({ ...e, category: "" }));
              }}
              options={[
                { value: "GAMING", label: "Gaming" },
                { value: "VLOG", label: "Vlog" },
                { value: "MUSIC & BHAJANS", label: "Music & Bhajans" },
                { value: "OTHER", label: "Other" },
              ]}
              recent={presets.category}
              error={vErrs.category}
            />

            {/* Subcategory */}
            <ComboboxInput
              label="Subcategory"
              value={form.subcategory}
              onChange={(v) => setForm({ ...form, subcategory: v })}
              suggestions={presets.subcategory}
              placeholder="e.g., Valorant, BGMI"
            />

            {/* Variant */}
            <ComboboxInput
              label="Variant *"
              value={form.variant}
              onChange={(v) => {
                setForm({ ...form, variant: v });
                setVErrs((e) => ({ ...e, variant: "" }));
              }}
              suggestions={
                presets.variants.length ? presets.variants : ["VIDEO", "LIVE"]
              }
              placeholder="e.g., VIDEO, LIVE, SHORTS..."
              required
              error={vErrs.variant}
            />

            {/* Drag & Drop (Preview + Auto-upload) */}
            <div className="block col-span-full md:col-span-2 lg:col-span-3">
              <span
                className="block text-sm mb-1"
                style={{ color: "var(--text)" }}
              >
                Thumbnail Image (auto-upload to storage)
              </span>
              <div
                ref={dropRef}
                className="flex items-center justify-between gap-2 w-full min-h-[42px] rounded-lg px-3 cursor-pointer hover:opacity-90 transition border"
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  color: "var(--text)",
                }}
                onClick={() => fileInputRef.current?.click()}
                title="Click to choose or drag & drop"
              >
                <div className="flex items-center gap-2 py-2">
                  <ImageIcon size={16} />
                  <span className="text-sm">
                    Choose Image / Drop here (PNG/JPG)
                  </span>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg"
                  onChange={handleImageInputChange}
                  className="hidden"
                />
                <span className="text-xs opacity-70">Max 25MB</span>
              </div>
              {form._imageMeta && (
                <div
                  className="text-xs mt-1"
                  style={{ color: "var(--text-muted)" }}
                >
                  {form._imageMeta.width}×{form._imageMeta.height} ·{" "}
                  {bytes(form._imageMeta.size)} · {form._imageMeta.type}
                </div>
              )}
              {form.imageUrl && (
                <div
                  className="text-xs mt-1"
                  style={{ color: "var(--text-muted)" }}
                >
                  Uploaded:{" "}
                  <a
                    href={form.imageUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: "var(--orange)" }}
                  >
                    {new URL(form.imageUrl).pathname.split("/").pop()}
                  </a>
                </div>
              )}
              {vErrs.imageUrl ? (
                <div className="text-xs mt-1" style={{ color: "#dc2626" }}>
                  {vErrs.imageUrl}
                </div>
              ) : null}
            </div>
          </div>

          {/* Image Preview */}
          {imagePreview && (
            <div
              className="mb-3 p-3 rounded-lg"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
              }}
            >
              <div
                className="text-xs mb-2"
                style={{ color: "var(--text-muted)" }}
              >
                Preview (for reference only):
              </div>
              <div className="flex items-start gap-3">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="max-w-xs max-h-40 rounded-lg object-contain"
                  style={{ border: "1px solid var(--border)" }}
                  loading="lazy"
                />
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      form.imageUrl &&
                      !form.imageUrl.startsWith("data:") &&
                      downloadImage(form.imageUrl, form.filename || "thumbnail")
                    }
                    className="text-xs px-2 py-1 rounded inline-flex items-center gap-1"
                    style={{
                      color: "var(--text)",
                      border: "1px solid var(--border)",
                    }}
                    disabled={!form.imageUrl || form.imageUrl.startsWith("data:")}
                    title={
                      form.imageUrl?.startsWith("data:")
                        ? "Upload will set a URL first"
                        : "Download current URL"
                    }
                  >
                    <Download size={12} /> Download Full Quality
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setImagePreview("");
                      setForm({
                        ...form,
                        _file: null,
                        _imageMeta: null,
                      });
                    }}
                    className="text-xs px-2 py-1 rounded inline-flex items-center gap-1"
                    style={{
                      color: "#ff3b30",
                      border: "1px solid rgba(255,59,48,0.3)",
                    }}
                  >
                    <X size={12} /> Remove Preview
                  </button>
                </div>
              </div>
            </div>
          )}

          {form.youtubeUrl && (
  <div
    className="mb-3 p-2 rounded text-xs"
    style={{ background: "var(--surface)", color: "var(--text-muted)" }}
  >
    Creator YouTube URL set. The Worker prefers this URL when deriving the <code>videoId</code>.
  </div>
)}


          <div className="flex gap-2">
            <button
              type="submit"
              disabled={busy || !getToken()}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2 font-semibold text-white disabled:opacity-50"
              style={{
                background: "linear-gradient(90deg, var(--orange), #ff9357)",
              }}
            >
              {editingId ? (
                <>
                  <Edit2 size={16} /> Update Thumbnail
                </>
              ) : (
                <>
                  <Plus size={16} /> Add Thumbnail
                </>
              )}
            </button>
          </div>
        </form>

        {/* Thumbnails List */}
        <div
          className="rounded-2xl border overflow-x-auto"
          style={{
            background: "var(--surface-alt)",
            borderColor: "var(--border)",
          }}
        >
          <table className="w-full text-sm">
            <thead style={{ color: "var(--text-muted)" }}>
              <tr>
                <th className="p-3 w-10">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th className="text-left p-3">Preview</th>
                <th className="text-left p-3">Filename</th>
                <th className="text-left p-3">Category</th>
                <th className="text-left p-3">YouTube (Creator)</th>
                <th className="text-left p-3">Views</th>
                <th className="text-left p-3">Last Updated</th>
                <th className="text-left p-3">Actions</th>
              </tr>
            </thead>
            <tbody style={{ color: "var(--text)" }}>
              {busy && thumbnails.length === 0 ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr
                    key={`sk-${i}`}
                    className="border-t"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <td className="p-3">
                      <div className="w-4 h-4 rounded bg-black/5 animate-pulse" />
                    </td>
                    <td className="p-3">
                      <div className="w-16 h-10 rounded bg-black/5 animate-pulse" />
                    </td>
                    <td className="p-3">
                      <div className="h-4 w-40 rounded bg-black/5 animate-pulse" />
                    </td>
                    <td className="p-3">
                      <div className="h-4 w-24 rounded bg-black/5 animate-pulse" />
                    </td>
                    <td className="p-3">
                      <div className="h-4 w-32 rounded bg-black/5 animate-pulse" />
                    </td>
                    <td className="p-3">
                      <div className="h-4 w-16 rounded bg-black/5 animate-pulse" />
                    </td>
                    <td className="p-3">
                      <div className="h-4 w-24 rounded bg-black/5 animate-pulse" />
                    </td>
                    <td className="p-3">
                      <div className="h-6 w-40 rounded bg-black/5 animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : filtered.length ? (
                filtered.map((t, i) => {
                  const stableKey = String(
                    t.id ||
                      `${t.filename}|${t.youtubeUrl || ""}|${t.category}|${t.variant}|${i}`
                  );
                  const isFlash =
                    flashKey &&
                    (flashKey === String(t.id) ||
                      flashKey ===
                        `${t.filename}|${t.youtubeUrl || ""}|${t.category}|${t.variant}`);

                  return (
                    <Row
                      key={stableKey}
                      t={t}
                      selectedIds={selectedIds}
                      setSelectedIds={setSelectedIds}
                      duplicateThumbnail={duplicateThumbnail}
                      timeAgo={timeAgo}
                      refreshingId={refreshingId}
                      refreshSingleView={refreshSingleView}
                      downloadImage={downloadImage}
                      editThumbnail={editThumbnail}
                      deleteThumbnail={deleteThumbnail}
                      copyOkId={copyOkId}
                      copyText={copyText}
                      flash={isFlash}
                    />
                  );
                })
              ) : (
                <tr>
                  <td
                    className="p-8 text-center text-sm"
                    style={{ color: "var(--text-muted)" }}
                    colSpan={8}
                  >
                    No thumbnails found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

                {/* Stats */}
        {thumbnailStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
            {/* Prefer local stats, fall back to /stats.counts if needed */}
            <StatCard
              label="Total Thumbnails"
              value={
                thumbnailStats.total ??
                stats?.counts?.thumbnails ??
                0
              }
            />
            <StatCard
              label="With YouTube"
              value={thumbnailStats.withYouTube || 0}
            />
            <StatCard
              label="Categories"
              value={thumbnailStats.categories || 0}
            />
            <StatCard
              label="Live / Video"
              value={`${thumbnailStats.byVariant?.LIVE || 0} / ${
                thumbnailStats.byVariant?.VIDEO || 0
              }`}
            />
          </div>
        )}

        {/* Toaster */}
        <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-50">
          {toasts.map((t) => (
            <div
              key={t.id}
              className="rounded-lg px-3 py-2 text-sm shadow"
              style={{
                background:
                  t.type === "error"
                    ? "#fee2e2"
                    : t.type === "success"
                    ? "#dcfce7"
                    : t.type === "warning"
                    ? "#fef9c3"
                    : "var(--surface)",
                color: "var(--text)",
                border: "1px solid var(--border)",
              }}
            >
              {t.message}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------- Helpers ----------
function Input({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
  error,
}) {
  return (
    <label className="block">
      <span className="block text-sm mb-1" style={{ color: "var(--text)" }}>
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-[42px] rounded-lg px-3"
        style={{
          background: "var(--surface)",
          border: `1px solid ${error ? "#fecaca" : "var(--border)"}`,
          color: "var(--text)",
        }}
        required={required || label.includes("*")}
      />
      {error ? (
        <div className="text-xs mt-1" style={{ color: "#dc2626" }}>
          {error}
        </div>
      ) : null}
    </label>
  );
}

/**
 * ComboboxInput
 * - Always a text input
 * - Shows a dropdown of suggestions (from memory)
 * - Typing filters suggestions; click to fill
 */
function ComboboxInput({
  label,
  value,
  onChange,
  suggestions = [],
  placeholder,
  required = false,
  error,
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState(value || "");

  useEffect(() => setQ(value || ""), [value]);

  const filtered = useMemo(() => {
    const s = (q || "").toLowerCase();
    if (!s) return suggestions.slice(0, 10);
    return suggestions.filter((v) => v.toLowerCase().includes(s)).slice(0, 10);
  }, [q, suggestions]);

  return (
    <div className="relative">
      <Input
        label={label}
        value={q}
        onChange={(v) => {
          setQ(v);
          onChange(v);
          setOpen(true);
        }}
        placeholder={placeholder}
        required={required}
        error={error}
      />
      {suggestions.length > 0 && (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="absolute right-2 top-8 px-2 py-1 text-xs rounded border"
          style={{ borderColor: "var(--border)", color: "var(--text)" }}
          title="Show recent"
        >
          Recent <ChevronRight size={12} />
        </button>
      )}
      {open && filtered.length > 0 && (
        <div
          className="absolute z-10 right-0 left-0 mt-1 rounded border bg-[var(--surface-alt)]"
          style={{ borderColor: "var(--border)" }}
        >
          {filtered.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => {
                onChange(r);
                setQ(r);
                setOpen(false);
              }}
              className="w-full text-left px-3 py-2 hover:bg-black/5"
              style={{ color: "var(--text)" }}
            >
              {r}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function InputWithPresets({ label, value, onChange, placeholder, recent = [], error }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <Input
        label={label}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        error={error}
      />
      {recent?.length > 0 && (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="absolute right-2 top-8 px-2 py-1 text-xs rounded border"
          style={{ borderColor: "var(--border)", color: "var(--text)" }}
        >
          Recent <ChevronRight size={12} />
        </button>
      )}
      {open && recent?.length > 0 && (
        <div
          className="absolute z-10 right-0 mt-1 w-64 rounded border bg-[var(--surface-alt)]"
          style={{ borderColor: "var(--border)" }}
        >
          {recent.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => {
                onChange(r);
                setOpen(false);
              }}
              className="w-full text-left px-3 py-2 hover:bg-black/5"
              style={{ color: "var(--text)" }}
            >
              {r}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * SelectWithPresets
 * - If `options` provided and non-empty → renders a <select>
 * - Else → text input
 */
function SelectWithPresets({
  label,
  value,
  onChange,
  options = [],
  recent = [],
  placeholder,
  error,
}) {
  const [open, setOpen] = useState(false);
  const hasOptions = options?.length > 0;
  return (
    <div className="relative">
      <label className="block">
        <span className="block text-sm mb-1" style={{ color: "var(--text)" }}>
          {label}
        </span>
        {hasOptions ? (
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full h-[42px] rounded-lg px-3"
            style={{
              background: "var(--surface)",
              border: `1px solid ${error ? "#fecaca" : "var(--border)"}`,
              color: "var(--text)",
            }}
          >
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        ) : (
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full h-[42px] rounded-lg px-3"
            style={{
              background: "var(--surface)",
              border: `1px solid ${error ? "#fecaca" : "var(--border)"}`,
              color: "var(--text)",
            }}
          />
        )}
      </label>
      {error ? (
        <div className="text-xs mt-1" style={{ color: "#dc2626" }}>
          {error}
        </div>
      ) : null}
      {recent?.length > 0 && (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="absolute right-2 top-8 px-2 py-1 text-xs rounded border"
          style={{ borderColor: "var(--border)", color: "var(--text)" }}
        >
          Recent <ChevronRight size={12} />
        </button>
      )}
      {open && recent?.length > 0 && (
        <div
          className="absolute z-10 right-0 mt-1 w-64 rounded border bg-[var(--surface-alt)]"
          style={{ borderColor: "var(--border)" }}
        >
          {recent.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => {
                onChange(r);
                setOpen(false);
              }}
              className="w-full text-left px-3 py-2 hover:bg-black/5"
              style={{ color: "var(--text)" }}
            >
              {r}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function LabeledCompactSelect({ label, value, onChange, options }) {
  return (
    <div className="min-w-[130px]">
      <div className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>
        {label}
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-[36px] rounded px-2 w-full"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          color: "var(--text)",
        }}
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div
      className="rounded-lg p-3 border"
      style={{ background: "var(--surface-alt)", borderColor: "var(--border)" }}
    >
      <div className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>
        {label}
      </div>
      <div className="text-xl font-bold" style={{ color: "var(--text)" }}>
        {value}
      </div>
    </div>
  );
}

function SortBtn({ active, dir, onClick, children }) {
  return (
    <button
      className={`inline-flex items-center gap-1 px-2 h-[36px] rounded border text-xs ${
        active ? "font-semibold" : ""
      }`}
      style={{ borderColor: "var(--border)", color: "var(--text)" }}
      onClick={onClick}
    >
      {children}{" "}
      {active ? (dir === "asc" ? <ChevronUp size={14} /> : <ChevronDown size={14} />) : null}
    </button>
  );
}

const Row = memo(function Row({
  t,
  selectedIds,
  setSelectedIds,
  duplicateThumbnail,
  timeAgo,
  refreshingId,
  refreshSingleView,
  downloadImage,
  editThumbnail,
  deleteThumbnail,
  copyOkId,
  copyText,
  flash,
}) {
  const selected = selectedIds.has(t.id);
  return (
    <tr
      className="border-t"
      style={{
        borderColor: "var(--border)",
        transition: "background 300ms",
        background: flash ? "rgba(34,197,94,0.08)" : "transparent",
      }}
    >
      <td className="p-3 align-top">
        <input
          type="checkbox"
          checked={selected}
          onChange={(e) =>
            setSelectedIds((s) => {
              const n = new Set(s);
              if (e.target.checked) n.add(t.id);
              else n.delete(t.id);
              return n;
            })
          }
        />
      </td>
      <td className="p-3">
        <div className="w-16 h-10 rounded overflow-hidden bg-black/5">
          {t.imageUrl ? (
            <img
              src={t.imageUrl}
              alt={t.filename}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs opacity-50">
              No img
            </div>
          )}
        </div>
      </td>
      <td className="p-3 align-top">
        <div className="font-medium flex items-center gap-2">
          {t.filename}
          <span
            className="text-[10px] px-1.5 py-0.5 rounded border"
            style={{
              display: flash ? "inline-flex" : "none",
              borderColor: "#86efac",
              color: "#16a34a",
            }}
          >
            Uploaded ✓
          </span>
          <button
            className="inline-flex items-center gap-1 px-1 py-0.5 rounded border text-[10px]"
            style={{ borderColor: "var(--border)", color: "var(--text)" }}
            title="Duplicate into form"
            onClick={() => duplicateThumbnail(t)}
          >
            <Layers size={10} /> Duplicate
          </button>
        </div>
        <div className="text-xs opacity-60">{t.variant}</div>
      </td>
      <td className="p-3 align-top">
        <div className="capitalize">{t.category}</div>
        {t.subcategory && (
          <div className="text-xs opacity-60">{t.subcategory}</div>
        )}
      </td>
      <td className="p-3 align-top">
        {t.youtubeUrl ? (
          <div className="flex items-center gap-2">
            <a
  href={t.youtubeUrl}
  target="_blank"
  rel="noopener noreferrer"
  className="inline-flex items-center gap-1 text-xs"
  style={{ color: "var(--orange)" }}
  title="Open creator video"
>
  <Eye size={12} /> Open
</a>

            {t.videoId && (
              <button
                className="p-1 text-xs rounded border"
                style={{ borderColor: "var(--border)" }}
                title="Copy video id"
                onClick={() => copyText(t.videoId, t.id)}
              >
                {copyOkId === t.id ? <Check size={12} /> : <Copy size={12} />}
              </button>
            )}
          </div>
        ) : (
          <span className="text-xs opacity-40">—</span>
        )}
      </td>
      <td className="p-3 align-top">
        {t.youtubeViews ? (
          <div>
            <div className="text-sm font-medium">
              {Number(t.youtubeViews).toLocaleString()}
            </div>
            {t.viewStatus === "deleted" && (
              <div className="text-xs" style={{ color: "#ff9500" }}>
                ⚠️ Deleted
              </div>
            )}
          </div>
        ) : t.youtubeUrl ? (
          <span className="text-xs opacity-40">Pending</span>
        ) : (
          <span className="text-xs opacity-40">—</span>
        )}
      </td>
      <td className="p-3 text-xs opacity-60 align-top">
        {t.lastViewUpdate ? timeAgo(t.lastViewUpdate) : "—"}
      </td>
      <td className="p-3 align-top">
        <div className="flex flex-wrap gap-2">
          {t.videoId && (
            <button
              onClick={() => refreshSingleView(t.videoId, t.id)}
              disabled={refreshingId === t.id}
              className="inline-flex items-center gap-1 px-2 py-1 rounded border text-xs disabled:opacity-50"
              style={{
                borderColor: "var(--border)",
                color: "var(--orange)",
              }}
              title="Refresh view count"
            >
              <RefreshCw
                size={12}
                className={refreshingId === t.id ? "animate-spin" : ""}
              />
            </button>
          )}
          {t.imageUrl && (
            <button
              onClick={() => downloadImage(t.imageUrl, t.filename)}
              className="inline-flex items-center gap-1 px-2 py-1 rounded border text-xs"
              style={{ borderColor: "var(--border)", color: "var(--text)" }}
              title="Download image"
            >
              <Download size={12} />
            </button>
          )}
          <button
            onClick={() => editThumbnail(t)}
            className="inline-flex items-center gap-1 px-2 py-1 rounded border text-xs"
            style={{ borderColor: "var(--border)", color: "var(--text)" }}
            title="Edit"
          >
            <Edit2 size={12} /> Edit
          </button>
          <button
            onClick={() => deleteThumbnail(t.id, t.filename)}
            className="inline-flex items-center gap-1 px-2 py-1 rounded border text-xs"
            style={{ borderColor: "#fcc", color: "#c00" }}
            title="Delete"
          >
            <Trash2 size={12} /> Delete
          </button>
        </div>
      </td>
    </tr>
  );
});

function LoadingOverlay({ show, label }) {
  if (!show) return null;
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center"
      style={{ background: "rgba(0,0,0,0.25)" }}
    >
      <div
        className="rounded-2xl p-4 border shadow-xl flex items-center gap-3"
        style={{
          background: "var(--surface-alt)",
          borderColor: "var(--border)",
        }}
      >
        <RefreshCw className="animate-spin" size={18} style={{ color: "var(--orange)" }} />
        <div className="text-sm" style={{ color: "var(--text)" }}>
          {label || "Working..."}
        </div>
      </div>
    </div>
  );
}
