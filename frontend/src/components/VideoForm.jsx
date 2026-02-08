import React, { useMemo } from "react";
import { X, Check, Plus, RefreshCw, Info } from "lucide-react";
import { VIDEO_CATEGORIES, VIDEO_KINDS, extractYouTubeId } from "../utils/constants";
import { Input, TextArea, SelectWithPresets } from "./AdminUIComponents";

const VideoForm = ({
    editingId,
    form,
    setForm,
    onSave,
    onCancel,
    busy,
    busyLabel,
    user
}) => {
    const { isAdmin, email: userEmail } = user || { isAdmin: false, email: "" };

    const handleInputChange = (name, value) => {
        setForm((f) => ({
            ...f,
            [name]: value,
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
                    <Input
                        label="Video Title"
                        value={form.title}
                        onChange={(v) => handleInputChange("title", v)}
                        placeholder="e.g. Minecraft But Everything Is Huge"
                        required
                    />

                    <Input
                        label="Primary URL (On-site)"
                        value={form.primaryUrl}
                        onChange={(v) => handleInputChange("primaryUrl", v)}
                        placeholder="YouTube URL for site player"
                        required
                    />

                    {/* Preview Container */}
                    {formVideoId && (
                        <div className="rounded-xl overflow-hidden aspect-video border border-white/10 bg-black animate-in fade-in duration-500 mt-2">
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

                    <Input
                        label="Creator URL (Original)"
                        value={form.creatorUrl}
                        onChange={(v) => handleInputChange("creatorUrl", v)}
                        placeholder="The creator's public upload link"
                    />
                </div>

                {/* Categorization */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <SelectWithPresets
                        label="Category"
                        value={form.category}
                        onChange={(v) => handleInputChange("category", v)}
                        options={VIDEO_CATEGORIES.map(c => ({ label: c, value: c }))}
                    />
                    <Input
                        label="Subcategory"
                        value={form.subcategory}
                        onChange={(v) => handleInputChange("subcategory", v)}
                        placeholder="e.g. Anime"
                    />
                </div>

                <div className="grid gap-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Video Kind</label>
                    <div className="flex flex-wrap gap-2">
                        {VIDEO_KINDS.map(k => (
                            <button
                                key={k}
                                type="button"
                                onClick={() => handleInputChange("kind", k)}
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

                {/* Platform Selection */}
                <div className="grid gap-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Platform</label>
                    <div className="flex flex-wrap gap-2">
                        {['YOUTUBE', 'INSTAGRAM'].map(p => (
                            <button
                                key={p}
                                type="button"
                                onClick={() => handleInputChange("platform", p)}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all ${(form.platform || 'YOUTUBE') === p
                                    ? 'bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-500/20'
                                    : 'bg-white/5 border-white/10 text-gray-500 hover:text-white hover:border-white/20'
                                    }`}
                            >
                                {p}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Ownership & Tags */}
                <div className="pt-4 border-t border-white/5 space-y-4">
                    <Input
                        label="Tags (Comma Separated)"
                        value={form.tags}
                        onChange={(v) => handleInputChange("tags", v)}
                        placeholder="gaming, minecraft, survival"
                    />

                    <label className="flex items-center gap-3 cursor-pointer group">
                        <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${form.isShinel ? 'bg-orange-500 border-orange-500' : 'bg-white/5 border-white/10 group-hover:border-orange-500/30'
                            }`}>
                            {form.isShinel && <Check size={12} className="text-white" strokeWidth={4} />}
                        </div>
                        <input
                            type="checkbox"
                            checked={form.isShinel}
                            onChange={(e) => handleInputChange("isShinel", e.target.checked)}
                            className="hidden"
                        />
                        <div className="flex flex-col">
                            <span className="text-xs font-bold text-white">Shinel Studios Internal</span>
                            <span className="text-[10px] text-gray-500">Show on main work portal</span>
                        </div>
                    </label>

                    {/* Visibility Toggle for personal portfolio */}
                    <label className="flex items-center gap-3 cursor-pointer group px-1">
                        <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${form.isVisibleOnPersonal !== false ? 'bg-blue-600 border-blue-600' : 'bg-white/5 border-white/10 group-hover:border-blue-500/30'
                            }`}>
                            {form.isVisibleOnPersonal !== false && <Check size={12} className="text-white" strokeWidth={4} />}
                        </div>
                        <input
                            type="checkbox"
                            checked={form.isVisibleOnPersonal !== false}
                            onChange={(e) => handleInputChange("isVisibleOnPersonal", e.target.checked)}
                            className="hidden"
                        />
                        <div className="flex flex-col">
                            <span className="text-xs font-bold text-white">Visible on Personal Portfolio</span>
                            <span className="text-[10px] text-gray-500">Enable/Disable on your public page</span>
                        </div>
                    </label>

                    <Input
                        label="Editor Attribution (Email)"
                        value={editingId ? (form.attributedTo || "") : (isAdmin ? form.attributedTo : userEmail)}
                        onChange={(v) => handleInputChange("attributedTo", v)}
                        placeholder="editor@shinel.in"
                        disabled={!isAdmin}
                    />
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
