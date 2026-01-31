import React from "react";
import {
    ExternalLink,
    Eye,
    RefreshCw,
    Edit2,
    Trash2,
    Check,
    CheckSquare,
    Square,
    Video
} from "lucide-react";
import { timeAgo } from "../utils/helpers";

const VideoCard = ({
    v,
    isSelected,
    onToggleSelect,
    onEdit,
    onDelete,
    onRefresh,
    busy,
    flashKey,
    viewMode = "grid"
}) => {
    const isFlash = flashKey === String(v.id);
    const videoId = v.videoId;
    const KNOWN_BAD_IDS = ["t-vPWTJUIO4", "R2jcaMDAvOU"];
    const thumbQuality = KNOWN_BAD_IDS.includes(videoId) ? "mqdefault" : "hqdefault";

    if (viewMode === "list") {
        return (
            <div
                className={`p-4 rounded-2xl border flex items-center gap-4 transition-all group ${isSelected ? 'bg-orange-500/5 border-orange-500/30' : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04]'
                    } ${isFlash ? 'ring-1 ring-orange-500' : ''}`}
            >
                <button onClick={() => onToggleSelect(v.id)} className="shrink-0">
                    {isSelected ? <CheckSquare size={18} className="text-orange-500" /> : <Square size={18} className="text-gray-600" />}
                </button>

                <div className="w-24 aspect-video rounded-lg overflow-hidden bg-black shrink-0 border border-white/5">
                    {videoId ? (
                        <img
                            src={`https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`}
                            className="w-full h-full object-cover"
                            alt=""
                            onError={(e) => {
                                if (e.target.src.includes('mqdefault')) {
                                    e.target.onerror = null;
                                    e.target.src = "https://placehold.co/600x400/202020/white?text=No+Preview";
                                } else if (thumbQuality !== 'mqdefault') {
                                    e.target.src = `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;
                                }
                            }}
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-800"><Video size={20} /></div>
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="font-bold text-sm truncate text-white">{v.title}</h3>
                        {v.isShinel && (
                            <span className="px-1.5 py-0.5 rounded bg-orange-500/10 border border-orange-500/20 text-[8px] font-black text-orange-500 uppercase tracking-widest">SHINEL</span>
                        )}
                    </div>
                    <div className="flex items-center gap-3 text-[10px] font-bold text-gray-500 uppercase tracking-tighter">
                        <span>{v.category}</span>
                        <span className="w-1 h-1 rounded-full bg-gray-800" />
                        <span>{v.kind}</span>
                        <span className="w-1 h-1 rounded-full bg-gray-800" />
                        <span className="text-orange-500/80">{Number(v.views || 0).toLocaleString()} Views</span>
                    </div>
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => onEdit(v)} className="p-2 text-gray-500 hover:text-orange-500 transition-colors"><Edit2 size={16} /></button>
                    <button onClick={() => onDelete(v.id)} className="p-2 text-gray-500 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                </div>
            </div>
        );
    }

    return (
        <div
            className={`group relative flex flex-col overflow-hidden rounded-2xl border transition-all duration-300 ${isSelected
                ? "border-orange-500/50 bg-orange-500/5 shadow-lg shadow-orange-500/10"
                : "border-white/5 bg-white/[0.02] hover:bg-white/[0.04]"
                } ${isFlash ? "ring-2 ring-orange-500 ring-offset-2 ring-offset-black" : ""}`}
        >
            {/* Top selection checkbox */}
            <button
                onClick={() => onToggleSelect(v.id)}
                className="absolute top-3 left-3 z-10 h-6 w-6 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 flex items-center justify-center hover:border-orange-500/50 transition-all"
            >
                {isSelected ? (
                    <CheckSquare size={14} className="text-orange-500" />
                ) : (
                    <Square size={14} className="text-white/40 group-hover:text-white/60" />
                )}
            </button>

            {/* Preview with overlay actions */}
            <div className="relative aspect-video w-full overflow-hidden bg-black">
                {videoId ? (
                    <img
                        src={`https://i.ytimg.com/vi/${videoId}/${thumbQuality}.jpg`}
                        alt={v.title}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        onError={(e) => {
                            if (thumbQuality !== 'mqdefault') {
                                e.target.onerror = null;
                                e.target.src = `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;
                            }
                        }}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-800"><Video size={40} /></div>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3">
                    <button
                        onClick={() => onEdit(v)}
                        className="p-3 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-white hover:bg-orange-500 hover:border-orange-500 hover:scale-110 transition-all"
                    >
                        <Edit2 size={18} />
                    </button>
                    <button
                        onClick={() => onDelete(v.id)}
                        className="p-3 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-white hover:bg-red-500 hover:border-red-500 hover:scale-110 transition-all"
                    >
                        <Trash2 size={18} />
                    </button>
                </div>

                {/* Categories / Tags badges */}
                <div className="absolute top-3 right-3 flex flex-col items-end gap-1">
                    <span className="px-2 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-bold text-white uppercase tracking-wider">
                        {v.kind}
                    </span>
                    {v.isShinel && (
                        <span className="px-2 py-1 rounded-lg bg-orange-500/20 backdrop-blur-md border border-orange-500/30 text-[10px] font-black text-orange-500 uppercase tracking-widest">
                            SHINEL
                        </span>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="p-4 flex-1 flex flex-col">
                <h3 className="font-bold text-sm text-white line-clamp-1 mb-2 group-hover:text-orange-500 transition-colors">
                    {v.title || "(Untitled)"}
                </h3>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mb-4">
                    <div className="flex items-center gap-1.5 text-[10px] font-black text-gray-500 uppercase tracking-widest leading-none">
                        {v.category}
                    </div>
                    {v.subcategory && (
                        <div className="flex items-center gap-1.5 text-[10px] font-black text-gray-600 border-l border-white/5 pl-3 uppercase tracking-widest leading-none">
                            {v.subcategory}
                        </div>
                    )}
                </div>

                <div className="mt-auto grid grid-cols-2 gap-2 pt-4 border-t border-white/5">
                    <div className="flex flex-col">
                        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">Views</span>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-black text-white">
                                {Number(v.youtubeViews || 0).toLocaleString()}
                            </span>
                            <button
                                disabled={busy}
                                onClick={() => onRefresh(v.videoId || v.id)}
                                className={`p-1 rounded-md hover:bg-white/5 transition-colors ${busy ? 'animate-spin text-orange-500' : 'text-gray-600 hover:text-orange-500'}`}
                            >
                                <RefreshCw size={12} />
                            </button>
                        </div>
                    </div>
                    <div className="flex flex-col text-right">
                        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">Updated</span>
                        <span className="text-[11px] font-medium text-gray-400">
                            {timeAgo(v.lastViewUpdate || v.updated || v.dateAdded)}
                        </span>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="mt-4 flex items-center justify-between gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex gap-2">
                        <button
                            onClick={() => window.open(v.primaryUrl, "_blank")}
                            className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-black text-gray-400 hover:text-white hover:bg-white/10 transition-all uppercase tracking-widest"
                        >
                            <ExternalLink size={12} /> SITE LINK
                        </button>
                        {v.creatorUrl && (
                            <button
                                onClick={() => window.open(v.creatorUrl, "_blank")}
                                className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-black text-gray-400 hover:text-white hover:bg-white/10 transition-all uppercase tracking-widest"
                            >
                                <ExternalLink size={12} /> CREATOR
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default React.memo(VideoCard);
