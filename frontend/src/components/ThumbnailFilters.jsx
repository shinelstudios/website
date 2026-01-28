import React from "react";
import { Search, Filter, RefreshCw, Trash2, CheckCircle2, ChevronDown } from "lucide-react";
import { THUMBNAIL_VARIANTS, VIDEO_CATEGORIES } from "../utils/constants";

const ThumbnailFilters = ({
    search,
    setSearch,
    filters,
    setFilters,
    sort,
    setSort,
    selectedCount,
    onBulkDelete,
    onRefreshAll,
    busy,
    totalCount
}) => {
    return (
        <div className="space-y-6 mb-8">
            {/* Search and Main Stats */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full md:max-w-md group">
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                        <Search size={18} className="text-gray-500 group-focus-within:text-orange-500 transition-colors" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search assets, categories, or YouTube links..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white/[0.03] border border-white/5 focus:border-orange-500/50 transition-all outline-none text-sm font-medium shadow-2xl shadow-black/20"
                    />
                </div>

                <div className="flex items-center gap-4 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
                    <div className="flex flex-col items-end px-4 border-r border-white/5">
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-600">Total Assets</span>
                        <span className="text-lg font-black text-white">{totalCount}</span>
                    </div>

                    <button
                        onClick={onRefreshAll}
                        disabled={busy}
                        className="shrink-0 flex items-center gap-2 px-6 py-4 rounded-2xl bg-white/[0.03] border border-white/10 text-xs font-black uppercase tracking-widest text-gray-400 hover:text-white hover:bg-white/[0.08] transition-all disabled:opacity-50"
                    >
                        <RefreshCw size={14} className={busy ? 'animate-spin' : ''} />
                        Refresh All
                    </button>
                </div>
            </div>

            {/* Advanced Filters and Bulk Actions */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/10 focus-within:border-orange-500/50 transition-all">
                        <Filter size={12} className="text-orange-500" />
                        <select
                            value={filters.category}
                            onChange={(e) => setFilters(f => ({ ...f, category: e.target.value }))}
                            className="bg-transparent outline-none text-[10px] font-black text-gray-400 uppercase tracking-widest cursor-pointer pr-2"
                        >
                            <option value="ALL" className="bg-[#1A1A1A]">ALL CATEGORIES</option>
                            {VIDEO_CATEGORIES.map(c => <option key={c} value={c} className="bg-[#1A1A1A]">{c}</option>)}
                        </select>
                    </div>

                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/10 focus-within:border-orange-500/50 transition-all">
                        <select
                            value={filters.variant}
                            onChange={(e) => setFilters(f => ({ ...f, variant: e.target.value }))}
                            className="bg-transparent outline-none text-[10px] font-black text-gray-400 uppercase tracking-widest cursor-pointer pr-2"
                        >
                            <option value="ALL" className="bg-[#1A1A1A]">ALL VARIANTS</option>
                            {THUMBNAIL_VARIANTS.map(v => <option key={v} value={v} className="bg-[#1A1A1A]">{v}</option>)}
                        </select>
                    </div>

                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/10 focus-within:border-orange-500/50 transition-all">
                        <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Sort:</span>
                        <select
                            value={`${sort.key}-${sort.dir}`}
                            onChange={(e) => {
                                const [key, dir] = e.target.value.split('-');
                                setSort({ key, dir });
                            }}
                            className="bg-transparent outline-none text-[10px] font-black text-orange-500 uppercase tracking-widest cursor-pointer pr-2"
                        >
                            <option value="updated-desc" className="bg-[#1A1A1A]">LATEST UPDATED</option>
                            <option value="updated-asc" className="bg-[#1A1A1A]">OLDEST UPDATED</option>
                            <option value="views-desc" className="bg-[#1A1A1A]">MOST VIEWED</option>
                            <option value="views-asc" className="bg-[#1A1A1A]">LEAST VIEWED</option>
                            <option value="filename-asc" className="bg-[#1A1A1A]">NAME (A-Z)</option>
                        </select>
                    </div>
                </div>

                {selectedCount > 0 && (
                    <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-orange-500/10 border border-orange-500/20 animate-in fade-in slide-in-from-right-4 duration-300">
                        <span className="text-[11px] font-black text-orange-500 uppercase tracking-widest">
                            {selectedCount} Selected
                        </span>
                        <div className="w-px h-4 bg-orange-500/20" />
                        <button
                            onClick={onBulkDelete}
                            className="flex items-center gap-2 text-[11px] font-black text-red-500 hover:text-red-400 transition-colors uppercase tracking-widest"
                        >
                            <Trash2 size={14} />
                            Delete Bulk
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default React.memo(ThumbnailFilters);
