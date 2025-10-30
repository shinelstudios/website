// src/components/AdminThumbnailsPage.jsx
import React, { useEffect, useState } from "react";
import { Plus, Trash2, Edit2, Upload, Download, ExternalLink, Eye, RefreshCw, Image as ImageIcon } from "lucide-react";

// Use the same auth worker URL - thumbnail endpoints are now part of it
const AUTH_BASE = import.meta.env.VITE_AUTH_BASE || "https://shinel-auth.your-account.workers.dev";
const YOUTUBE_API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY || "";

export default function AdminThumbnailsPage() {
  const [thumbnails, setThumbnails] = useState([]);
  const [stats, setStats] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [imagePreview, setImagePreview] = useState("");

  const [form, setForm] = useState({
    filename: "",
    youtubeUrl: "",
    category: "GAMING",
    subcategory: "",
    variant: "VIDEO",
    imageUrl: "",
  });

  // Get auth token
  const getToken = () => localStorage.getItem("token") || "";

  // Get auth headers
  const getAuthHeaders = () => ({
    "Content-Type": "application/json",
    "authorization": `Bearer ${getToken()}`
  });

  // Extract video ID from YouTube URL
  const extractVideoId = (url) => {
    if (!url) return null;
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
      /youtube\.com\/embed\/([^&\n?#]+)/,
      /youtube\.com\/v\/([^&\n?#]+)/,
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) return match[1];
    }
    return null;
  };

  // Convert file to base64
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Handle image file selection
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setErr("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      setErr("Image size must be less than 5MB");
      return;
    }

    try {
      setBusy(true);
      const base64 = await fileToBase64(file);
      setForm({ ...form, imageUrl: base64 });
      setImagePreview(base64);
      setErr("");
    } catch (error) {
      setErr("Failed to process image");
      console.error(error);
    } finally {
      setBusy(false);
    }
  };

  // Fetch YouTube video details
  const fetchYouTubeDetails = async (url) => {
    if (!url) return;
    
    setBusy(true);
    setErr("");
    
    try {
      const res = await fetch(`${AUTH_BASE}/thumbnails/fetch-youtube`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ youtubeUrl: url, apiKey: YOUTUBE_API_KEY }),
      });

      const data = await res.json();
      
      if (!res.ok) {
        if (res.status === 401) throw new Error("Authentication required. Please login.");
        throw new Error(data?.error || "Failed to fetch video details");
      }
      
      if (data.details) {
        alert(`Video found!\nTitle: ${data.details.title}\nViews: ${data.details.views.toLocaleString()}`);
      } else {
        alert(`Video ID: ${data.videoId}\n(Set YouTube API key to fetch title & views)`);
      }
    } catch (e) {
      setErr(e.message || "Error fetching video");
    } finally {
      setBusy(false);
    }
  };

  // Load all thumbnails
  const loadThumbnails = async () => {
    setBusy(true);
    setErr("");
    try {
      const res = await fetch(`${AUTH_BASE}/thumbnails`, {
        headers: { authorization: `Bearer ${getToken()}` }
      });
      const data = await res.json();
      
      if (!res.ok) {
        if (res.status === 401) throw new Error("Authentication required. Please login.");
        throw new Error(data?.error || "Failed to load thumbnails");
      }
      
      setThumbnails(data.thumbnails || []);
    } catch (e) {
      setErr(e.message || "Error loading thumbnails");
    } finally {
      setBusy(false);
    }
  };

  // Load statistics
  const loadStats = async () => {
    try {
      const res = await fetch(`${AUTH_BASE}/stats`, {
        headers: { authorization: `Bearer ${getToken()}` }
      });
      const data = await res.json();
      if (res.ok) setStats(data);
    } catch (e) {
      console.error("Failed to load stats:", e);
    }
  };

  // Create or update thumbnail
  const saveThumbnail = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr("");

    try {
      const url = editingId 
        ? `${AUTH_BASE}/thumbnails/${editingId}`
        : `${AUTH_BASE}/thumbnails`;
      
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(form),
      });

      const data = await res.json();
      
      if (!res.ok) {
        if (res.status === 401) throw new Error("Authentication required. Please login.");
        throw new Error(data?.error || `Failed to ${editingId ? 'update' : 'create'} thumbnail`);
      }

      // Reset form
      setForm({
        filename: "",
        youtubeUrl: "",
        category: "GAMING",
        subcategory: "",
        variant: "VIDEO",
        imageUrl: "",
      });
      setEditingId(null);
      setImagePreview("");

      await loadThumbnails();
      await loadStats();
    } catch (e) {
      setErr(e.message || "Error saving thumbnail");
    } finally {
      setBusy(false);
    }
  };

  // Delete thumbnail
  const deleteThumbnail = async (id, filename) => {
    if (!confirm(`Delete thumbnail "${filename}"?`)) return;
    
    setBusy(true);
    setErr("");
    
    try {
      const res = await fetch(`${AUTH_BASE}/thumbnails/${id}`, {
        method: "DELETE",
        headers: { authorization: `Bearer ${getToken()}` }
      });

      const data = await res.json();
      
      if (!res.ok) {
        if (res.status === 401) throw new Error("Authentication required. Please login.");
        throw new Error(data?.error || "Failed to delete");
      }

      await loadThumbnails();
      await loadStats();
    } catch (e) {
      setErr(e.message || "Error deleting thumbnail");
    } finally {
      setBusy(false);
    }
  };

  // Edit thumbnail
  const editThumbnail = (thumbnail) => {
    setEditingId(thumbnail.id);
    setForm({
      filename: thumbnail.filename,
      youtubeUrl: thumbnail.youtubeUrl || "",
      category: thumbnail.category,
      subcategory: thumbnail.subcategory || "",
      variant: thumbnail.variant,
      imageUrl: thumbnail.imageUrl || "",
    });
    setImagePreview(thumbnail.imageUrl || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditingId(null);
    setForm({
      filename: "",
      youtubeUrl: "",
      category: "GAMING",
      subcategory: "",
      variant: "VIDEO",
      imageUrl: "",
    });
    setImagePreview("");
  };

  // Export thumbnails as JSON
  const exportData = () => {
    const dataStr = JSON.stringify(thumbnails, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `thumbnails-export-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Import thumbnails from JSON
  const importData = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const text = await file.text();
        const data = JSON.parse(text);
        
        if (!Array.isArray(data)) {
          throw new Error("Invalid JSON format. Expected an array of thumbnails.");
        }

        const replace = confirm(
          `Import ${data.length} thumbnails?\n\nClick OK to REPLACE all existing thumbnails.\nClick Cancel to ADD to existing thumbnails.`
        );

        setBusy(true);
        setErr("");

        const res = await fetch(`${AUTH_BASE}/bulk-import`, {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({ thumbnails: data, replace }),
        });

        const result = await res.json();
        
        if (!res.ok) {
          if (res.status === 401) throw new Error("Authentication required. Please login.");
          throw new Error(result?.error || "Failed to import");
        }

        alert(`Successfully imported ${result.imported} thumbnails!\nTotal: ${result.total}`);
        await loadThumbnails();
        await loadStats();
      } catch (e) {
        setErr(e.message || "Error importing data");
      } finally {
        setBusy(false);
      }
    };
    input.click();
  };

  useEffect(() => {
    // Check if user is logged in
    if (!getToken()) {
      setErr("Missing token - Please login to access this page");
      return;
    }
    
    loadThumbnails();
    loadStats();
  }, []);

  return (
    <section className="min-h-screen" style={{ background: "var(--surface)" }}>
      <div className="container mx-auto px-4 py-10 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl md:text-3xl font-bold" style={{ color: "var(--text)" }}>
            Admin · Thumbnails Manager
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={exportData}
              disabled={busy || !thumbnails.length}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium"
              style={{ borderColor: "var(--border)", color: "var(--text)" }}
              title="Export as JSON"
            >
              <Download size={16} /> Export
            </button>
            <button
              onClick={importData}
              disabled={busy}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium"
              style={{ borderColor: "var(--border)", color: "var(--text)" }}
              title="Import from JSON"
            >
              <Upload size={16} /> Import
            </button>
            <button
              onClick={() => { loadThumbnails(); loadStats(); }}
              disabled={busy}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium"
              style={{ borderColor: "var(--border)", color: "var(--text)" }}
              title="Refresh"
            >
              <RefreshCw size={16} /> Refresh
            </button>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <StatCard label="Total Thumbnails" value={stats.total || 0} />
            <StatCard label="With YouTube" value={stats.withYouTube || 0} />
            <StatCard label="Categories" value={Object.keys(stats.byCategory || {}).length} />
            <StatCard label="Live/Video" value={`${stats.byVariant?.LIVE || 0} / ${stats.byVariant?.VIDEO || 0}`} />
          </div>
        )}

        {/* Error message */}
        {err && (
          <div className="mb-4 rounded-lg p-3 text-sm" 
               style={{ background: "rgba(255,59,48,0.1)", color: "#ff3b30", border: "1px solid rgba(255,59,48,0.2)" }}>
            {err}
          </div>
        )}

        {/* Add/Edit Form */}
        <form onSubmit={saveThumbnail} className="rounded-2xl p-4 border mb-6"
              style={{ background: "var(--surface-alt)", borderColor: "var(--border)" }}>
          <div className="flex items-center justify-between mb-3">
            <div className="text-base font-semibold" style={{ color: "var(--text)" }}>
              {editingId ? "Edit Thumbnail" : "Add New Thumbnail"}
            </div>
            {editingId && (
              <button
                type="button"
                onClick={cancelEdit}
                className="text-sm px-3 py-1 rounded-lg"
                style={{ color: "var(--text-muted)", border: "1px solid var(--border)" }}
              >
                Cancel
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
            <Input 
              label="Filename *" 
              value={form.filename} 
              onChange={(v) => setForm({ ...form, filename: v })}
              placeholder="e.g., Creator-Game-1-Video"
            />
            
            <div className="relative">
              <Input 
                label="YouTube URL" 
                value={form.youtubeUrl} 
                onChange={(v) => setForm({ ...form, youtubeUrl: v })}
                placeholder="https://youtube.com/watch?v=..."
              />
              {form.youtubeUrl && (
                <button
                  type="button"
                  onClick={() => fetchYouTubeDetails(form.youtubeUrl)}
                  className="absolute right-2 top-8 p-1 text-xs"
                  style={{ color: "var(--orange)" }}
                  title="Fetch video details"
                >
                  <ExternalLink size={16} />
                </button>
              )}
            </div>

            <Select
              label="Category *"
              value={form.category}
              onChange={(v) => setForm({ ...form, category: v })}
              options={[
                { value: "GAMING", label: "Gaming" },
                { value: "VLOG", label: "Vlog" },
                { value: "MUSIC & BHAJANS", label: "Music & Bhajans" },
                { value: "OTHER", label: "Other" },
              ]}
            />

            <Input 
              label="Subcategory" 
              value={form.subcategory} 
              onChange={(v) => setForm({ ...form, subcategory: v })}
              placeholder="e.g., Valorant, BGMI"
            />

            <Select
              label="Variant *"
              value={form.variant}
              onChange={(v) => setForm({ ...form, variant: v })}
              options={[
                { value: "VIDEO", label: "Video" },
                { value: "LIVE", label: "Live" },
              ]}
            />

            {/* Image Upload */}
            <div className="block">
              <span className="block text-sm mb-1" style={{ color: "var(--text)" }}>
                Thumbnail Image
              </span>
              <label 
                className="flex items-center justify-center gap-2 w-full h-[42px] rounded-lg px-3 cursor-pointer hover:opacity-80 transition"
                style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
              >
                <ImageIcon size={16} />
                <span className="text-sm">Choose Image</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Image Preview */}
          {imagePreview && (
            <div className="mb-3 p-3 rounded-lg" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <div className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>Preview:</div>
              <div className="flex items-start gap-3">
                <img 
                  src={imagePreview} 
                  alt="Preview" 
                  className="max-w-xs max-h-40 rounded-lg object-contain"
                  style={{ border: "1px solid var(--border)" }}
                />
                <button
                  type="button"
                  onClick={() => {
                    setImagePreview("");
                    setForm({ ...form, imageUrl: "" });
                  }}
                  className="text-xs px-2 py-1 rounded"
                  style={{ color: "#ff3b30", border: "1px solid rgba(255,59,48,0.3)" }}
                >
                  Remove
                </button>
              </div>
            </div>
          )}

          {form.youtubeUrl && extractVideoId(form.youtubeUrl) && (
            <div className="mb-3 p-2 rounded text-xs" style={{ background: "var(--surface)", color: "var(--text-muted)" }}>
              Video ID: <strong>{extractVideoId(form.youtubeUrl)}</strong>
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={busy || !getToken()}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2 font-semibold text-white disabled:opacity-50"
              style={{ background: "linear-gradient(90deg, var(--orange), #ff9357)" }}
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
        <div className="rounded-2xl border overflow-x-auto"
             style={{ background: "var(--surface-alt)", borderColor: "var(--border)" }}>
          <table className="w-full text-sm">
            <thead style={{ color: "var(--text-muted)" }}>
              <tr>
                <th className="text-left p-3">Preview</th>
                <th className="text-left p-3">Filename</th>
                <th className="text-left p-3">Category</th>
                <th className="text-left p-3">YouTube</th>
                <th className="text-left p-3">Added</th>
                <th className="text-left p-3">Actions</th>
              </tr>
            </thead>
            <tbody style={{ color: "var(--text)" }}>
              {thumbnails.map((t) => (
                <tr key={t.id} className="border-t" style={{ borderColor: "var(--border)" }}>
                  <td className="p-3">
                    <div className="w-16 h-10 rounded overflow-hidden bg-black/5">
                      {t.imageUrl ? (
                        <img 
                          src={t.imageUrl} 
                          alt={t.filename}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">
                          No img
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="font-medium">{t.filename}</div>
                    <div className="text-xs opacity-60">{t.variant}</div>
                  </td>
                  <td className="p-3">
                    <div className="capitalize">{t.category}</div>
                    {t.subcategory && (
                      <div className="text-xs opacity-60">{t.subcategory}</div>
                    )}
                  </td>
                  <td className="p-3">
                    {t.youtubeUrl ? (
                      <a 
                        href={t.youtubeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs"
                        style={{ color: "var(--orange)" }}
                      >
                        <Eye size={12} /> {t.videoId}
                      </a>
                    ) : (
                      <span className="text-xs opacity-40">—</span>
                    )}
                  </td>
                  <td className="p-3 text-xs opacity-60">
                    {new Date(t.dateAdded).toLocaleDateString()}
                  </td>
                  <td className="p-3">
                    <div className="flex gap-2">
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
              ))}
              {!thumbnails.length && (
                <tr>
                  <td className="p-8 text-center text-sm" style={{ color: "var(--text-muted)" }} colSpan={6}>
                    No thumbnails yet. Add your first thumbnail above!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

// Helper components
function Input({ label, value, onChange, placeholder, type = "text" }) {
  return (
    <label className="block">
      <span className="block text-sm mb-1" style={{ color: "var(--text)" }}>{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-[42px] rounded-lg px-3"
        style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
        required={label.includes("*")}
      />
    </label>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <label className="block">
      <span className="block text-sm mb-1" style={{ color: "var(--text)" }}>{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-[42px] rounded-lg px-3"
        style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-lg p-3 border" style={{ background: "var(--surface-alt)", borderColor: "var(--border)" }}>
      <div className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>{label}</div>
      <div className="text-xl font-bold" style={{ color: "var(--text)" }}>{value}</div>
    </div>
  );
}