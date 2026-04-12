import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Save, Eye, ArrowLeft, Image as ImageIcon, Calendar, FileText, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";
import { AUTH_BASE } from "../config/constants"; // Ensure correct import path
import { Input, TextArea, LoadingOverlay } from "./AdminUIComponents";

function toast(type, msg) {
    window.dispatchEvent(new CustomEvent("notify", { detail: { type, message: msg } }));
}

export default function AdminBlogEditor() {
    const { slug } = useParams();
    const navigate = useNavigate();
    const isNew = slug === "new";

    const [loading, setLoading] = useState(!isNew);
    const [busy, setBusy] = useState(false);
    const [activeTab, setActiveTab] = useState("edit"); // edit | preview
    const [token] = useState(localStorage.getItem("token") || "");

    const [form, setForm] = useState({
        title: "",
        slug: "",
        excerpt: "",
        content: "",
        coverImage: "",
        author: "Shinel Studios",
        status: "draft",
        date: new Date().toISOString().split('T')[0],
        tags: "" // Comma separated
    });

    // Auto-generate slug from title if new and slug is untouched
    const slugTouched = useRef(false);

    useEffect(() => {
        if (!isNew && slug) {
            loadPost();
        }
    }, [slug]);

    const loadPost = async () => {
        try {
            // Ensure we hit the API, not the hybrid lib (we want raw data)
            const res = await fetch(`${AUTH_BASE}/blog/posts/${slug}`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok && data.post) {
                setForm({
                    ...data.post,
                    tags: Array.isArray(data.post.tags) ? data.post.tags.join(", ") : (data.post.tags || "")
                });
                slugTouched.current = true; // Don't auto-update slug for existing
            } else {
                toast("error", "Post not found or failed to load");
                navigate("/dashboard/blog");
            }
        } catch (err) {
            console.error(err);
            toast("error", "Network error loading post");
        } finally {
            setLoading(false);
        }
    };

    const handleTitleChange = (e) => {
        const title = e.target.value;
        setForm(prev => {
            const updates = { ...prev, title };
            if (isNew && !slugTouched.current) {
                updates.slug = title
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/^-|-$/g, '');
            }
            return updates;
        });
    };

    const handleSave = async () => {
        if (!form.title || !form.slug) {
            return toast("error", "Title and Slug are required");
        }

        setBusy(true);
        try {
            const payload = {
                ...form,
                tags: form.tags.split(",").map(t => t.trim()).filter(Boolean)
            };

            const res = await fetch(`${AUTH_BASE}/blog/posts`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (res.ok) {
                toast("success", "Post saved successfully");
                if (isNew) {
                    navigate(`/dashboard/blog/${form.slug}`, { replace: true });
                }
            } else {
                throw new Error(data.error || "Save failed");
            }
        } catch (err) {
            toast("error", err.message);
        } finally {
            setBusy(false);
        }
    };

    if (loading) return <div className="h-64 flex items-center justify-center"><RefreshCw className="animate-spin text-orange-500" /></div>;

    return (
        <div className="max-w-6xl mx-auto pb-20">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate("/dashboard/blog")}
                        className="p-2 rounded-lg bg-[var(--surface-alt)] hover:bg-[var(--surface-active)]"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-black uppercase tracking-tighter italic text-[var(--text)]">
                            {isNew ? "New Article" : "Edit Article"}
                        </h1>
                        <div className="flex items-center gap-2 text-xs font-mono text-[var(--text-muted)]">
                            {isNew ? "Drafting..." : `Slug: ${slug}`}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {!isNew && (
                        <a
                            href={`/blog/${form.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className="hidden md:flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold border border-[var(--border)] hover:bg-[var(--surface-alt)]"
                        >
                            <Eye size={16} /> Public View
                        </a>
                    )}
                    <button
                        onClick={handleSave}
                        disabled={busy}
                        className="flex items-center gap-2 px-6 py-2 rounded-xl bg-orange-500 text-white font-bold hover:bg-orange-600 transition-colors disabled:opacity-50"
                    >
                        {busy ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
                        {isNew ? "Create Post" : "Save Changes"}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Editor (Left 2/3) */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Title & Slug */}
                    <div className="p-6 rounded-[24px] bg-[var(--surface)] border border-[var(--border)] space-y-4">
                        <Input
                            label="Article Title"
                            value={form.title}
                            onChange={handleTitleChange}
                            placeholder="Enter a catchy title..."
                            className="text-lg font-bold"
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input
                                label="URL Slug"
                                value={form.slug}
                                onChange={(v) => {
                                    setForm({ ...form, slug: v });
                                    slugTouched.current = true;
                                }}
                                placeholder="my-article-url"
                                prefix="/blog/"
                            />
                            <Input
                                label="Publish Date"
                                type="date"
                                value={form.date}
                                onChange={(v) => setForm({ ...form, date: v })}
                            />
                        </div>
                    </div>

                    {/* Content Editor */}
                    <div className="rounded-[24px] bg-[var(--surface)] border border-[var(--border)] overflow-hidden flex flex-col min-h-[500px]">
                        {/* Toolbar */}
                        <div className="flex items-center gap-1 p-2 border-b border-[var(--border)] bg-[var(--surface-alt)]">
                            <button
                                onClick={() => setActiveTab("edit")}
                                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'edit' ? 'bg-[var(--surface)] text-orange-500 shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text)]'}`}
                            >
                                Write
                            </button>
                            <button
                                onClick={() => setActiveTab("preview")}
                                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'preview' ? 'bg-[var(--surface)] text-orange-500 shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text)]'}`}
                            >
                                Preview
                            </button>
                            <div className="ml-auto text-[10px] font-mono text-[var(--text-muted)] px-3">
                                Markdown Supported
                            </div>
                        </div>

                        {/* Editor Area */}
                        <div className="flex-grow relative">
                            {activeTab === 'edit' ? (
                                <textarea
                                    value={form.content}
                                    onChange={(e) => setForm({ ...form, content: e.target.value })}
                                    className="w-full h-full min-h-[500px] p-6 bg-transparent text-[var(--text)] font-mono resize-none outline-none text-sm md:text-base"
                                    placeholder="# Write something amazing..."
                                    spellCheck={false}
                                />
                            ) : (
                                <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none p-8 overflow-y-auto h-[600px]">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {form.content || "*Nothing to preview*"}
                                    </ReactMarkdown>
                                </div>
                            )}
                        </div>
                    </div>

                </div>

                {/* Sidebar (Right 1/3) */}
                <div className="space-y-6">

                    {/* Status & Meta */}
                    <div className="p-6 rounded-[24px] bg-[var(--surface)] border border-[var(--border)] space-y-4">
                        <h3 className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Publishing</h3>

                        <div>
                            <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1 block">Status</label>
                            <select
                                value={form.status}
                                onChange={(e) => setForm({ ...form, status: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl bg-[var(--surface-alt)] border border-[var(--border)] text-sm font-bold text-[var(--text)] outline-none focus:border-orange-500"
                            >
                                <option value="draft">Draft (Hidden)</option>
                                <option value="published">Published (Live)</option>
                                <option value="archived">Archived</option>
                            </select>
                        </div>

                        <Input
                            label="Author"
                            value={form.author}
                            onChange={(v) => setForm({ ...form, author: v })}
                        />
                    </div>

                    {/* Assets */}
                    <div className="p-6 rounded-[24px] bg-[var(--surface)] border border-[var(--border)] space-y-4">
                        <h3 className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Assets</h3>

                        <div>
                            <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1 block">Cover Image URL</label>
                            <div className="flex gap-2">
                                <input
                                    value={form.coverImage}
                                    onChange={(e) => setForm({ ...form, coverImage: e.target.value })}
                                    className="flex-grow px-3 py-2 rounded-xl bg-[var(--surface-alt)] border border-[var(--border)] text-sm outline-none focus:border-orange-500"
                                    placeholder="https://..."
                                />
                            </div>
                            {form.coverImage && (
                                <div className="mt-2 rounded-lg overflow-hidden border border-[var(--border)] aspect-video">
                                    <img src={form.coverImage} alt="Cover" className="w-full h-full object-cover" />
                                </div>
                            )}
                        </div>

                        <TextArea
                            label="Excerpt (SEO Description)"
                            value={form.excerpt}
                            onChange={(v) => setForm({ ...form, excerpt: v })}
                            rows={3}
                            placeholder="Brief summary for search engines..."
                        />

                        <Input
                            label="Tags (Comma separated)"
                            value={form.tags}
                            onChange={(v) => setForm({ ...form, tags: v })}
                            placeholder="Case Study, YouTube, Growth..."
                        />
                    </div>

                </div>
            </div>
        </div>
    );
}
