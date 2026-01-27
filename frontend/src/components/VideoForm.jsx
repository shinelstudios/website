import React, { useMemo } from "react";
import { X, Check, Plus, RefreshCw, Info } from "lucide-react";
import { VIDEO_CATEGORIES, VIDEO_KINDS, extractYouTubeId } from "../utils/constants";

const VideoForm = ({
    editingId,
    form,
    setForm,
    onSave,
    onCancel,
    busy,
    busyLabel,
}) => {
    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setForm((f) => ({
            ...f,
            [name]: type === "checkbox" ? checked : value,
        }));
    };

    const formVideoId = useMemo(() =>
        extractYouTubeId(form.primaryUrl) || extractYouTubeId(form.creatorUrl),
        [form.primaryUrl, form.creatorUrl]
    );

    return (
        <div
            className="rounded-2xl border transition-all duration-300 h-fit sticky top-24 overflow-hidden"
            style={{
                borderColor: "var(--border)",
                background: "var(--surface)",
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
            }}
        >
            <div className="p-4 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${editingId ? 'bg-orange-500 animate-pulse' : 'bg-green-500'}`} />
                    <h2 className="font-black text-xs uppercase tracking-[0.2em] text-gray-400">
                        {editingId ? "Edit Video" : "Add Video"}
                    </h2>
                </div>
                {editingId && (
                    <button onClick={onCancel} className="p-1 text-gray-500 hover:text-white transition-colors">
                        <X size={16} />
                    </button>
                )}
            </div>

            <form onSubmit={(e) => { e.preventDefault(); onSave(); }} className="p-5 space-y-6">

                <div className="space-y-4">
                    {/* Title */}
                    <div className="grid gap-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Video Title</label>
                        <input
                            name="title"
                            value={form.title}
                            onChange={handleInputChange}
                            placeholder="e.g. Minecraft But Everything Is Huge"
                            className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/5 focus:border-orange-500/50 transition-all outline-none text-sm font-medium"
                            required
                        />
                    </div>

                    {/* URLs */}
                    <div className="grid gap-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Primary URL (On-site)</label>
                        <input
                            name="primaryUrl"
                            value={form.primaryUrl}
                            onChange={handleInputChange}
                            placeholder="YouTube URL for site player"
                            className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/5 focus:border-orange-500/50 transition-all outline-none text-sm font-medium"
                            required
                        />
                    </div>

                    {/* Preview Container */}
                    {formVideoId && (
                        <div className="rounded-xl overflow-hidden aspect-video border border-white/10 bg-black animate-in fade-in duration-500">
                            <iframe
                                className="w-full h-full"
                                src={`https://www.youtube.com/embed/${formVideoId}`}
                                title="Preview"
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            />
                        </div>
                    )}

                    <div className="grid gap-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Creator URL (Original)</label>
                        <input
                            name="creatorUrl"
                            value={form.creatorUrl}
                            onChange={handleInputChange}
                            placeholder="The creator's public upload link"
                            className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/5 focus:border-orange-500/50 transition-all outline-none text-sm font-medium"
                        />
                    </div>
                </div>

                {/* Categorization */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Category</label>
                        <select
                            name="category"
                            value={form.category}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 rounded-xl bg-[#0F0F0F] border border-white/5 focus:border-orange-500/50 transition-all outline-none text-sm font-medium appearance-none cursor-pointer"
                        >
                            {VIDEO_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <div className="grid gap-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Subcategory</label>
                        <input
                            name="subcategory"
                            value={form.subcategory}
                            onChange={handleInputChange}
                            placeholder="e.g. Anime"
                            className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/5 focus:border-orange-500/50 transition-all outline-none text-sm font-medium"
                        />
                    </div>
                </div>

                <div className="grid gap-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Video Kind</label>
                    <div className="flex flex-wrap gap-2">
                        {VIDEO_KINDS.map(k => (
                            <button
                                key={k}
                                type="button"
                                onClick={() => setForm(f => ({ ...f, kind: k }))}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all ${form.kind === k
                                        ? 'bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-500/20'
                                        : 'bg-white/5 border-white/10 text-gray-500 hover:text-white hover:border-white/20'
                                    }`}
                            >
                                {k}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Ownership & Tags */}
                <div className="pt-4 border-t border-white/5 space-y-4">
                    <div className="grid gap-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Tags (Comma Separated)</label>
                        <input
                            name="tags"
                            value={form.tags}
                            onChange={handleInputChange}
                            placeholder="gaming, minecraft, survival"
                            className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/5 focus:border-orange-500/50 transition-all outline-none text-sm font-medium"
                        />
                    </div>

                    <label className="flex items-center gap-3 cursor-pointer group">
                        <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${form.isShinel ? 'bg-orange-500 border-orange-500' : 'bg-white/5 border-white/10 group-hover:border-orange-500/30'
                            }`}>
                            {form.isShinel && <Check size={12} className="text-white" strokeWidth={4} />}
                        </div>
                        <input
                            type="checkbox"
                            name="isShinel"
                            checked={form.isShinel}
                            onChange={handleInputChange}
                            className="hidden"
                        />
                        <div className="flex flex-col">
                            <span className="text-xs font-bold text-white">Shinel Labs Internal</span>
                            <span className="text-[10px] text-gray-500">Show on main work portal</span>
                        </div>
                    </label>

                    <div className="grid gap-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Editor Attribution</label>
                        <input
                            name="attributedTo"
                            value={form.attributedTo}
                            onChange={handleInputChange}
                            placeholder="editor@shinel.in"
                            className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/5 focus:border-orange-500/50 transition-all outline-none text-sm font-medium"
                        />
                    </div>
                </div>

                {/* Submit */}
                <button
                    type="submit"
                    disabled={busy}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-orange-600 to-orange-500 text-white font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-orange-900/20 hover:shadow-orange-900/40 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                >
                    {busy ? (
                        <>
                            <RefreshCw size={16} className="animate-spin" />
                            <span>{busyLabel || "PROCESSING"}</span>
                        </>
                    ) : (
                        <>
                            {editingId ? <Check size={16} strokeWidth={3} /> : <Plus size={16} strokeWidth={3} />}
                            <span>{editingId ? "Update Record" : "Save Record"}</span>
                        </>
                    )}
                </button>
            </form>
        </div>
    );
};

export default React.memo(VideoForm);
