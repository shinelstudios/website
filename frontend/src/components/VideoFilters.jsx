import React from "react";
import { Search, Filter, RefreshCw, Trash2, LayoutGrid, List } from "lucide-react";
import { VIDEO_CATEGORIES, VIDEO_KINDS } from "../utils/constants";

const VideoFilters = ({
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
    totalCount,
    viewMode,
    setViewMode
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
                        placeholder="Search titles, editors, categories..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white/[0.03] border border-white/5 focus:border-orange-500/50 transition-all outline-none text-sm font-medium shadow-2xl shadow-black/20"
                    />
                </div>

                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="flex flex-col items-end px-4 border-r border-white/5">
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-600">Inventory</span>
                        <span className="text-lg font-black text-white">{totalCount}</span>
                    </div>

                    <button
                        onClick={onRefreshAll}
                        disabled={busy}
                        className="shrink-0 flex items-center gap-2 px-6 py-4 rounded-2xl bg-white/[0.03] border border-white/10 text-xs font-black uppercase tracking-widest text-gray-400 hover:text-white hover:bg-white/[0.08] transition-all disabled:opacity-50"
                    >
                        <RefreshCw size={14} className={busy ? 'animate-spin' : ''} />
                        Fetch Views
                    </button>
                </div>
            </div>

            {/* Advanced Filters */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-black/40 border border-white/10">
                        <Filter size={14} className="text-orange-500" />
                        <select
                            value={filters.category}
                            onChange={(e) => setFilters(f => ({ ...f, category: e.target.value }))}
                            className="bg-transparent outline-none text-[11px] font-bold text-gray-300 uppercase tracking-widest cursor-pointer"
                        >
                            <option value="ALL">ALL CATEGORIES</option>
                            {VIDEO_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>

                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-black/40 border border-white/10">
                        <select
                            value={filters.kind}
                            onChange={(e) => setFilters(f => ({ ...f, kind: e.target.value }))}
                            className="bg-transparent outline-none text-[11px] font-bold text-gray-300 uppercase tracking-widest cursor-pointer"
                        >
                            <option value="ALL">ALL TYPES</option>
                            {VIDEO_KINDS.map(k => <option key={k} value={k}>{k}</option>)}
                        </select>
                    </div>

                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-black/40 border border-white/10">
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Sort:</span>
                        <select
                            value={`${sort.key}-${sort.dir}`}
                            onChange={(e) => {
                                const [key, dir] = e.target.value.split('-');
                                setSort({ key, dir });
                            }}
                            className="bg-transparent outline-none text-[11px] font-bold text-orange-500 uppercase tracking-widest cursor-pointer"
                        >
                            <option value="updated-desc">LATEST UPDATED</option>
                            <option value="views-desc">MOST VIEWED</option>
                            <option value="title-asc">TITLE (A-Z)</option>
                        </select>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {selectedCount > 0 && (
                        <button
                            onClick={onBulkDelete}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-[11px] font-black text-red-500 hover:bg-red-500 hover:text-white transition-all uppercase tracking-widest animate-in fade-in zoom-in-95 duration-200"
                        >
                            <Trash2 size={14} />
                            Delete ({selectedCount})
                        </button>
                    )}

                    <div className="flex p-1 rounded-xl bg-white/5 border border-white/10">
                        <button
                            onClick={() => setViewMode("grid")}
                            className={`p-2 rounded-lg transition-all ${viewMode === "grid" ? 'bg-orange-500 text-white' : 'text-gray-500 hover:text-white'}`}
                        >
                            <LayoutGrid size={16} />
                        </button>
                        <button
                            onClick={() => setViewMode("list")}
                            className={`p-2 rounded-lg transition-all ${viewMode === "list" ? 'bg-orange-500 text-white' : 'text-gray-500 hover:text-white'}`}
                        >
                            <List size={16} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default React.memo(VideoFilters);
