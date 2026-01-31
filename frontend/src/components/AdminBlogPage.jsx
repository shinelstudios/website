import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Plus, Edit2, Trash2, FileText, Eye, CheckCircle, XCircle } from "lucide-react";
import { AUTH_BASE } from "../config/constants"; // Ensure this exists, or use absolute URL
import { LoadingOverlay } from "./AdminUIComponents";

function toast(type, msg) {
    window.dispatchEvent(new CustomEvent("notify", { detail: { type, message: msg } }));
}

export default function AdminBlogPage() {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const token = localStorage.getItem("token") || "";

    const fetchPosts = async () => {
        setLoading(true);
        try {
            // Admin param to see drafts
            const res = await fetch(`${AUTH_BASE}/blog/posts?admin=1`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) {
                setPosts(data.posts || []);
            } else {
                throw new Error(data.error || "Failed to fetch posts");
            }
        } catch (err) {
            setError(err.message);
            toast("error", err.message);
        } finally {
            setLoading(false);
        }
    };

    const deletePost = async (slug) => {
        if (!confirm("Are you sure you want to delete this post?")) return;
        try {
            const res = await fetch(`${AUTH_BASE}/blog/posts/${slug}`, {
                method: "DELETE",
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.ok) {
                toast("success", "Post deleted");
                fetchPosts();
            } else {
                const data = await res.json();
                throw new Error(data.error || "Delete failed");
            }
        } catch (err) {
            toast("error", err.message);
        }
    };

    useEffect(() => {
        fetchPosts();
    }, []);

    if (loading && posts.length === 0) return (
        <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black uppercase tracking-tighter italic text-[var(--text)]">
                        Blog <span className="text-orange-500">Manager</span>
                    </h1>
                    <p className="text-[var(--text-muted)] text-xs font-bold uppercase tracking-widest mt-1">
                        Create & Edit Articles
                    </p>
                </div>
                <Link
                    to="/dashboard/blog/new"
                    className="px-4 py-2 rounded-xl bg-orange-500 text-white font-bold text-sm hover:bg-orange-600 transition-colors flex items-center gap-2"
                >
                    <Plus size={16} /> New Post
                </Link>
            </div>

            {error && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-bold">
                    {error}
                </div>
            )}

            {posts.length === 0 ? (
                <div className="text-center py-20 bg-[var(--surface-alt)] rounded-3xl border border-[var(--border)]">
                    <FileText size={48} className="mx-auto text-[var(--text-muted)] mb-4" />
                    <h3 className="text-lg font-bold text-[var(--text)]">No posts yet</h3>
                    <p className="text-[var(--text-muted)] text-sm mb-6">Start writing your first article.</p>
                    <Link
                        to="/dashboard/blog/new"
                        className="px-6 py-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] font-bold text-sm hover:bg-[var(--surface-active)] transition-colors"
                    >
                        Create Post
                    </Link>
                </div>
            ) : (
                <div className="grid gap-4">
                    {posts.map(post => (
                        <div
                            key={post.slug}
                            className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 group hover:border-orange-500/30 transition-all"
                        >
                            <div className="flex items-start gap-4">
                                {post.coverImage ? (
                                    <img src={post.coverImage} alt="" className="w-16 h-16 rounded-lg object-cover bg-[var(--surface-alt)]" />
                                ) : (
                                    <div className="w-16 h-16 rounded-lg bg-[var(--surface-alt)] flex items-center justify-center text-[var(--text-muted)]">
                                        <FileText size={24} />
                                    </div>
                                )}
                                <div>
                                    <h3 className="font-bold text-lg text-[var(--text)] line-clamp-1 group-hover:text-orange-500 transition-colors">
                                        {post.title}
                                    </h3>
                                    <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mt-1 font-mono">
                                        <span className={`px-1.5 py-0.5 rounded ${post.status === 'published' ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'} uppercase font-bold tracking-wider`}>
                                            {post.status}
                                        </span>
                                        <span>•</span>
                                        <span>{new Date(post.date).toLocaleDateString()}</span>
                                        <span>•</span>
                                        <span>{post.slug}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 w-full md:w-auto mt-2 md:mt-0">
                                <Link
                                    to={`/blog/${post.slug}`}
                                    target="_blank"
                                    className="p-2 rounded-lg text-[var(--text-muted)] hover:bg-[var(--surface-alt)] hover:text-[var(--text)] transition-colors"
                                    title="View Public"
                                >
                                    <Eye size={18} />
                                </Link>
                                <Link
                                    to={`/dashboard/blog/${post.slug}`}
                                    className="p-2 rounded-lg text-[var(--text)] bg-[var(--surface-alt)] hover:bg-[var(--surface-active)] transition-colors"
                                    title="Edit"
                                >
                                    <Edit2 size={18} />
                                </Link>
                                <button
                                    onClick={() => deletePost(post.slug)}
                                    className="p-2 rounded-lg text-red-500/70 hover:bg-red-500/10 hover:text-red-500 transition-colors"
                                    title="Delete"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
