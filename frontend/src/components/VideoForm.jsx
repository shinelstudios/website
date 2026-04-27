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
    onFetchYouTube,
    busy,
    busyLabel,
    user
}) => {
    const { isAdmin, email: userEmail } = user || { isAdmin: false, email: "" };
    const [fetching, setFetching] = React.useState(false);

    const handleInputChange = (name, value) => {
        setForm((f) => ({
            ...f,
            [name]: value,
        }));
    };

    // Prefer creator URL (the source of truth for views) for the embed
    // preview. Fall back to mirror URL (our backup) and primary URL
    // (legacy field) so existing rows still preview while editing.
    const formVideoId = useMemo(() => {
        if (!form) return null;
        return (
            extractYouTubeId(form.creatorUrl) ||
            extractYouTubeId(form.mirrorUrl) ||
            extractYouTubeId(form.primaryUrl)
        );
    }, [form?.creatorUrl, form?.mirrorUrl, form?.primaryUrl]);

    if (!form) return <div className="p-8 text-center text-gray-500">Error: No Form State</div>;

    return (
        <div
            className="rounded-2xl border transition-all duration-300 h-fit overflow-hidden"
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
                <button type="button" onClick={onCancel} className="p-1 text-gray-500 hover:text-white transition-colors">
                    <X size={16} />
                </button>
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

                    {/* Two URL fields, two clear jobs:
                        1. Creator URL — source we fetch view counts from
                           (the creator's original public upload).
                        2. Our backup URL — what actually plays on the site
                           (re-upload on Shinel-owned channel; no ads, never
                           deleted, plays even if creator removes the original
                           — and we keep the cached view count regardless). */}
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">
                            Creator URL <span className="text-gray-600 normal-case tracking-normal">· source for view counts</span>
                        </label>
                        <div className="relative">
                            <Input
                                value={form.creatorUrl}
                                onChange={(v) => handleInputChange("creatorUrl", v)}
                                placeholder="https://youtube.com/watch?v=… (the creator's original)"
                                required
                            />
                            {form.creatorUrl && (form.creatorUrl.includes("youtube.com") || form.creatorUrl.includes("youtu.be")) && (
                                <button
                                    type="button"
                                    onClick={async () => {
                                        setFetching(true);
                                        await onFetchYouTube(form.creatorUrl);
                                        setFetching(false);
                                    }}
                                    disabled={busy || fetching}
                                    className="absolute right-2 top-2 p-2 rounded-lg bg-orange-500/10 text-orange-500 hover:bg-orange-500 hover:text-white transition-all z-10"
                                    title="Auto-fetch title + metadata"
                                >
                                    <RefreshCw size={14} className={fetching ? 'animate-spin' : ''} />
                                </button>
                            )}
                        </div>
                        <p className="text-[10px] text-gray-600 ml-1 mt-1">
                            We pull view counts from here. View count keeps showing on the site
                            even if the creator deletes the original.
                        </p>
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">
                            Our backup URL <span className="text-gray-600 normal-case tracking-normal">· what plays on the site</span>
                        </label>
                        <Input
                            value={form.mirrorUrl || ""}
                            onChange={(v) => handleInputChange("mirrorUrl", v)}
                            placeholder="https://youtube.com/watch?v=… (Shinel re-upload)"
                        />
                        <p className="text-[10px] text-gray-600 ml-1 mt-1">
                            Optional but recommended — the player on /work and creator pages
                            will always use this if set. No ads, persistent, ours.
                        </p>
                    </div>

                    {/* Preview Container — uses creator URL by default, mirror if set. */}
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

                {/* Specialty assignment — surfaces this video on one of the
                    three /work/<slug> microsites (AI Music, Tattoo Content,
                    AI Graphics). Leave on "None" for regular work. */}
                <div className="grid gap-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">
                        Specialty microsite
                        <span className="text-gray-600 normal-case tracking-normal"> · optional, where this surfaces on /work</span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {[
                            { value: null, label: "None" },
                            { value: "ai-music", label: "AI Music" },
                            { value: "ai-tattoo", label: "Tattoo Content" },
                            { value: "ai-gfx", label: "AI Graphics" },
                        ].map(opt => (
                            <button
                                key={opt.value || "none"}
                                type="button"
                                onClick={() => handleInputChange("specialty", opt.value)}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all ${(form.specialty || null) === opt.value
                                    ? 'bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-500/20'
                                    : 'bg-white/5 border-white/10 text-gray-500 hover:text-white hover:border-white/20'
                                    }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
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
