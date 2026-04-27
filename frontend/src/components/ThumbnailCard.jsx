import React from "react";
import {
    Download,
    ExternalLink,
    Eye,
    RefreshCw,
    Edit2,
    Trash2,
    ExternalLink as LinkIcon,
    Copy,
    Check,
    CheckSquare,
    Square,
    Image as ImageIcon
} from "lucide-react";
import { formatBytes, timeAgo } from "../utils/helpers";
import { AUTH_BASE } from "../config/constants";
import { resolveThumbnailImage, resolveMediaUrl } from "../utils/formatters";

const proxyImage = (src) => {
    if (!src) return null;
    const s = String(src);
    if (s.includes("/api/proxy-image?url=")) return src;
    const low = s.toLowerCase();
    if (low.includes("ytimg.com") || low.includes("fbcdn.net") || low.includes("instagram.com") || low.includes("cdninstagram.com") || low.includes("ggpht.com") || low.includes("googleusercontent.com")) {
        return `${AUTH_BASE}/api/proxy-image?url=${encodeURIComponent(src)}`;
    }
    // Absolute-ify worker-backed paths so the <img> hits the worker origin,
    // not the Pages origin (which 404s). Matches the logic used by the
    // public /thumbnails gallery + the hero KineticPortfolioGrid.
    return resolveMediaUrl(src, AUTH_BASE);
};

const ThumbnailCard = ({
    t,
    isSelected,
    onToggleSelect,
    onEdit,
    onDuplicate,
    onDelete,
    onDownload,
    onRefresh,
    refreshingId,
    copyOkId,
    onCopyUrl,
    flashKey
}) => {
    // Safety check for undefined thumbnail data
    if (!t) return null;

    const isFlash = flashKey === String(t.id);

    // Build image URL with a smart fallback chain:
    //  1. resolveThumbnailImage prefers YouTube CDN (free, always up) when
    //     the row has a video_id.
    //  2. Otherwise it absolute-ifies /api/media/view/* worker paths.
    //  3. proxyImage wraps YT/IG/FB CDNs through our own proxy to beat
    //     hotlink protection; it's a no-op for already-absolute worker URLs.
    const rawImageUrl = resolveThumbnailImage(t, AUTH_BASE);
    let processedImageUrl = proxyImage(rawImageUrl);

    // Proactive replacement for known bad IDs
    const KNOWN_BAD_IDS = ["t-vPWTJUIO4", "R2jcaMDAvOU"];
    if (processedImageUrl && processedImageUrl.includes("youtube.com") && KNOWN_BAD_IDS.some(id => processedImageUrl.includes(id))) {
        processedImageUrl = processedImageUrl.replace("hqdefault.jpg", "mqdefault.jpg")
            .replace("maxresdefault.jpg", "mqdefault.jpg");
    }

    return (
        <div
            className={`group relative flex flex-col overflow-hidden rounded-2xl border transition-all duration-300 ${isSelected
                ? "border-orange-500/50 bg-orange-500/5 shadow-lg shadow-orange-500/10"
                : "border-white/5 bg-white/[0.02] hover:bg-white/[0.04] hover:shadow-xl hover:shadow-black/20"
                } ${isFlash ? "ring-2 ring-orange-500 ring-offset-2 ring-offset-black" : ""}`}
        >
            {/* Top selection checkbox */}
            <button
                onClick={() => onToggleSelect(t.id)}
                className="absolute top-3 left-3 z-10 h-6 w-6 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 flex items-center justify-center hover:border-orange-500/50 transition-all"
            >
                {isSelected ? (
                    <CheckSquare size={14} className="text-orange-500" />
                ) : (
                    <Square size={14} className="text-white/40 group-hover:text-white/60" />
                )}
            </button>

            {/* Preview Image with overlay actions */}
            <div className="relative aspect-video w-full overflow-hidden bg-black">
                {processedImageUrl ? (
                    <img
                        src={processedImageUrl}
                        alt={t.filename}
                        loading="lazy"
                        onError={(e) => {
                            if (t.videoId && !e.target.src.includes('mqdefault')) {
                                e.target.onerror = null;
                                e.target.src = proxyImage(`https://i.ytimg.com/vi/${t.videoId}/mqdefault.jpg`);
                            } else {
                                e.target.onerror = null;
                                e.target.src = "https://placehold.co/600x400/202020/white?text=No+Preview";
                            }
                        }}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-800">
                        <ImageIcon size={40} />
                    </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-between p-4">
                    <div className="flex gap-2">
                        <button
                            onClick={() => window.open(t.imageUrl, "_blank")}
                            className="p-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/10 text-white hover:bg-orange-500 hover:border-orange-500 transition-all"
                            title="View full size"
                        >
                            <Eye size={16} />
                        </button>
                        <button
                            onClick={() => onDownload(t.imageUrl, t.filename)}
                            className="p-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/10 text-white hover:bg-orange-500 hover:border-orange-500 transition-all"
                            title="Download image"
                        >
                            <Download size={16} />
                        </button>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => onEdit(t)}
                            className="p-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/10 text-white hover:bg-orange-500 hover:border-orange-500 transition-all"
                        >
                            <Edit2 size={16} />
                        </button>
                        <button
                            onClick={() => onDelete(t.id, t.filename)}
                            className="p-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/10 text-white hover:bg-red-500 hover:border-red-500 transition-all"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                </div>

                {/* Categories / Tags badges */}
                <div className="absolute top-3 right-3 flex flex-col items-end gap-1">
                    <span className="px-2 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-bold text-white uppercase tracking-wider">
                        {t.variant}
                    </span>
                    {t.isShinel && (
                        <span className="px-2 py-1 rounded-lg bg-orange-500/20 backdrop-blur-md border border-orange-500/30 text-[10px] font-black text-orange-500 uppercase tracking-widest">
                            SHINEL
                        </span>
                    )}
                </div>
            </div>

            {/* Thumbnail Content */}
            <div className="p-4 flex-1 flex flex-col">
                <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="font-bold text-sm text-white line-clamp-1 leading-tight group-hover:text-orange-500 transition-colors">
                        {t.filename || t.title || t.videoId || "(Untitled)"}
                    </h3>
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mb-4">
                    <div className="flex items-center gap-1.5 text-[11px] font-medium text-gray-400">
                        <span className="w-1 h-1 rounded-full bg-orange-500"></span>
                        {t.category}
                    </div>
                    {t.subcategory && (
                        <div className="flex items-center gap-1.5 text-[11px] font-medium text-gray-400 border-l border-white/10 pl-3">
                            {t.subcategory}
                        </div>
                    )}
                </div>

                <div className="mt-auto grid grid-cols-2 gap-2 pt-4 border-t border-white/5">
                    <div className="flex flex-col">
                        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">
                            Views
                            {Number(t.instagramViews || 0) > Number(t.youtubeViews || 0) && (
                                <span className="ml-1 text-pink-400 normal-case tracking-normal">· reel</span>
                            )}
                        </span>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-black text-white">
                                {(() => {
                                    const yt = Number(t.youtubeViews || 0);
                                    const ig = Number(t.instagramViews || 0);
                                    const max = Math.max(yt, ig);
                                    return max > 0 ? max.toLocaleString() : "—";
                                })()}
                            </span>
                            {t.youtubeUrl && (
                                <button
                                    disabled={refreshingId === t.id}
                                    // Prefer the YouTube 11-char id so the worker doesn't need to
                                    // reverse-lookup from the row id. If the row has neither
                                    // videoId nor a parseable URL, block the call with a toast
                                    // instead of sending a bogus id downstream.
                                    onClick={() => {
                                        const ytId = t.videoId || "";
                                        if (!ytId) {
                                            try {
                                                window.dispatchEvent(new CustomEvent("notify", {
                                                    detail: { type: "error", message: "This row has no YouTube video id yet." },
                                                }));
                                            } catch { /* best-effort */ }
                                            return;
                                        }
                                        onRefresh(ytId, t.id);
                                    }}
                                    className={`p-1 rounded-md hover:bg-white/5 transition-colors ${refreshingId === t.id ? 'animate-spin text-orange-500' : 'text-gray-600 hover:text-orange-500'}`}
                                >
                                    <RefreshCw size={12} />
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="flex flex-col text-right">
                        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">Updated</span>
                        <span className="text-[11px] font-medium text-gray-400">
                            {timeAgo(t.lastViewUpdate || t.updated || t.dateAdded)}
                        </span>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="mt-4 flex items-center justify-between gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex gap-1">
                        <button
                            onClick={() => onCopyUrl(t.imageUrl, t.id)}
                            className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                        >
                            {copyOkId === t.id ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                            {copyOkId === t.id ? "COPIED" : "COPY URL"}
                        </button>
                        <button
                            onClick={() => onDuplicate(t)}
                            className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                        >
                            DUPLICATE
                        </button>
                    </div>
                    {t.youtubeUrl && (
                        <a
                            href={t.youtubeUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1 text-gray-600 hover:text-orange-500 transition-colors"
                            title="View on YouTube"
                        >
                            <ExternalLink size={14} />
                        </a>
                    )}
                </div>
            </div>
        </div>
    );
};

export default React.memo(ThumbnailCard);
