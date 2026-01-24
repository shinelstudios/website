import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Youtube,
  Sparkles,
  Copy,
  Eye,
  Download,
  Loader,
  CheckCircle,
  AlertCircle,
  FileText,
  Globe,
  RotateCcw,
} from "lucide-react";

export default function AutoSRTTool() {
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [lang, setLang] = useState("en"); // requested language preference

  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState({ stage: "", percent: 0, elapsed: 0 });

  const [results, setResults] = useState(null);
  const [error, setError] = useState("");
  const [copiedKey, setCopiedKey] = useState(null);
  const [previewKey, setPreviewKey] = useState(null);

  const progressIntervalRef = useRef(null);
  const startTimeRef = useRef(null);

  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, []);

  const formatElapsedTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const startProgressSimulation = () => {
    let percent = 0;
    startTimeRef.current = Date.now();
    setProgress({ stage: "Initializing YouTube caption fetch…", percent: 0, elapsed: 0 });

    progressIntervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      percent += 8;

      if (percent > 95) {
        setProgress({ stage: "Finalizing transcript…", percent: 95, elapsed });
        return;
      }

      let stage = "Fetching watch page…";
      if (percent > 30) stage = "Calling YouTube player API…";
      if (percent > 60) stage = "Resolving caption tracks (manual/auto)…";
      if (percent > 80) stage = "Downloading captions (json3/vtt)…";

      setProgress({ stage, percent, elapsed });
    }, 500);
  };

  const stopProgressSimulation = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  };

  const resetForm = () => {
    setYoutubeUrl("");
    setLang("en");
    setResults(null);
    setError("");
    setPreviewKey(null);
    setCopiedKey(null);
    setProgress({ stage: "", percent: 0, elapsed: 0 });
  };

  const downloadText = (filename, content) => {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = async (text, key) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1800);
    } catch {
      // ignore
    }
  };

  const hasAnyText = (data) => {
    const m = (data?.manual?.text || "").trim();
    const a = (data?.auto?.text || "").trim();
    return Boolean(m || a);
  };

  // ✅ This is where your fetch("/api/youtube-captions") lives:
  const fetchCaptions = async () => {
    if (!youtubeUrl.trim()) {
      setError("Please provide a YouTube URL.");
      return;
    }

    setProcessing(true);
    setError("");
    setResults(null);
    startProgressSimulation();

    try {
      const res = await fetch("/api/youtube-captions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: youtubeUrl.trim(),
          lang: (lang || "en").trim(),
          // You can remove hl/gl if your backend auto-handles it.
          // Keeping them here is fine if backend accepts.
          hl: "en",
          gl: "IN",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to fetch captions");

      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);

      // If track exists but download blocked/empty, don’t pretend success
      const okButEmpty =
        (data?.tracks?.manualCount || 0) + (data?.tracks?.autoCount || 0) > 0 && !hasAnyText(data);

      setProgress({
        stage: okButEmpty ? "Track found, but transcript download blocked/empty." : "Complete!",
        percent: 100,
        elapsed,
      });

      setTimeout(() => {
        setResults(data);
        stopProgressSimulation();
      }, 250);
    } catch (e) {
      setError(e?.message || "Error fetching captions.");
      stopProgressSimulation();
    } finally {
      setProcessing(false);
    }
  };

  const ResultCard = ({ title, obj, keyName, emptyHint }) => {
    const text = (obj?.text || "").trim();
    const has = !!text;
    const words = has ? text.split(/\s+/).filter(Boolean).length : 0;

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 rounded-2xl"
        style={{ background: "var(--surface)", border: "2px solid var(--border)" }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl" style={{ background: "rgba(232,80,2,0.1)" }}>
              <FileText size={22} style={{ color: "var(--orange)" }} />
            </div>
            <div>
              <div className="font-black text-lg" style={{ color: "var(--text)" }}>
                {title}
              </div>
              <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                {obj
                  ? `${obj.languageCode || ""} • ${obj.format || "unknown"} • ${words} words`
                  : "Not available"}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <motion.button
              onClick={() => setPreviewKey(previewKey === keyName ? null : keyName)}
              className="p-2 rounded-xl"
              style={{ background: "var(--surface-alt)", color: "var(--text)" }}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
              title="Preview"
              disabled={!has}
            >
              <Eye size={18} />
            </motion.button>

            <motion.button
              onClick={() => copyToClipboard(text, keyName)}
              className="p-2 rounded-xl"
              style={{ background: "var(--surface-alt)", color: "var(--text)" }}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
              title="Copy"
              disabled={!has}
            >
              {copiedKey === keyName ? (
                <CheckCircle size={18} style={{ color: "var(--orange)" }} />
              ) : (
                <Copy size={18} />
              )}
            </motion.button>

            <motion.button
              onClick={() => downloadText(`${keyName}_${obj?.languageCode || "xx"}.txt`, text)}
              className="px-4 py-2 rounded-xl font-bold flex items-center gap-2"
              style={{ background: "var(--orange)", color: "white" }}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              disabled={!has}
              title="Download TXT"
            >
              <Download size={18} />
              TXT
            </motion.button>
          </div>
        </div>

        {/* ✅ Clear warning when track exists but text is empty */}
        {obj && !has && (
          <div
            className="mt-4 p-4 rounded-xl text-sm"
            style={{
              background: "rgba(245, 158, 11, 0.12)",
              border: "1px solid rgba(245, 158, 11, 0.35)",
              color: "var(--text)",
            }}
          >
            <div className="font-bold" style={{ marginBottom: 6 }}>
              Track found, but transcript download is empty/blocked.
            </div>
            <div style={{ color: "var(--text-muted)" }}>
              {emptyHint ||
                "Try another video, or your backend should retry using a different client/region/cookies. (This is a YouTube-side behavior.)"}
            </div>
          </div>
        )}

        <AnimatePresence>
          {previewKey === keyName && has && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div
                className="mt-4 p-4 rounded-xl max-h-64 overflow-y-auto"
                style={{ background: "var(--surface-alt)" }}
              >
                <div
                  className="text-sm font-mono leading-relaxed whitespace-pre-wrap"
                  style={{ color: "var(--text)" }}
                >
                  {text}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  const emptyHint =
    results?.message ||
    (results?.meta?.captionDownloadDebug ? "Backend tried multiple caption endpoints but got empty body." : "");

  return (
    <div className="min-h-screen py-12" style={{ background: "var(--surface)" }}>
      {/* background blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
        <motion.div
          className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-20 blur-3xl"
          style={{ background: "var(--orange)" }}
          animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.25, 0.15] }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        <motion.div
          className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full opacity-20 blur-3xl"
          style={{ background: "#ff9357" }}
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.25, 0.15, 0.25] }}
          transition={{ duration: 10, repeat: Infinity }}
        />
      </div>

      <div className="container mx-auto px-4 max-w-6xl relative" style={{ zIndex: 1 }}>
        {/* header */}
        <motion.div
          className="text-center mb-10"
          initial={{ opacity: 0, y: -18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <motion.div
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-xs font-bold mb-5"
            style={{
              background: "linear-gradient(135deg, var(--orange), #ff9357)",
              color: "white",
              boxShadow: "0 8px 24px rgba(232,80,2,0.3)",
            }}
            whileHover={{ scale: 1.05 }}
          >
            <Sparkles size={16} />
            YouTube Manual + Auto Transcript Fetcher
          </motion.div>

          <h1 className="text-5xl md:text-6xl font-black mb-3 bg-gradient-to-r from-[var(--orange)] to-[#ff9357] bg-clip-text text-transparent">
            YouTube Captions
          </h1>

          <p className="text-lg max-w-3xl mx-auto leading-relaxed" style={{ color: "var(--text-muted)" }}>
            Fetches both <strong>manual</strong> subtitles and <strong>auto</strong> (ASR) captions when available.
          </p>
        </motion.div>

        {/* input card */}
        <div
          className="rounded-3xl p-8 mb-6"
          style={{
            background: "var(--surface-alt)",
            border: "2px solid var(--border)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.1)",
          }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-2xl" style={{ background: "rgba(255,0,0,0.1)" }}>
              <Youtube size={28} style={{ color: "#FF0000" }} />
            </div>
            <div>
              <h3 className="text-xl font-bold" style={{ color: "var(--text)" }}>
                YouTube Video URL
              </h3>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                Paste any YouTube link (watch/shorts/youtu.be)
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <input
              type="text"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="md:col-span-2 w-full px-5 py-4 rounded-2xl outline-none text-base"
              style={{
                background: "var(--surface)",
                border: "2px solid var(--border)",
                color: "var(--text)",
              }}
              onFocus={(e) => (e.target.style.borderColor = "var(--orange)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
            />

            <div className="flex flex-col gap-1">
              <div className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
                Preferred language (e.g. en, hi)
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="px-3 py-3 rounded-2xl flex items-center gap-2"
                  style={{ background: "var(--surface)", border: "2px solid var(--border)", flex: 1 }}
                >
                  <Globe size={18} style={{ color: "var(--orange)" }} />
                  <input
                    value={lang}
                    onChange={(e) => setLang(e.target.value)}
                    placeholder="en"
                    className="w-full outline-none bg-transparent"
                    style={{ color: "var(--text)" }}
                  />
                </div>

                <motion.button
                  onClick={resetForm}
                  className="p-3 rounded-2xl font-bold"
                  style={{ background: "var(--surface)", border: "2px solid var(--border)", color: "var(--text)" }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  title="Reset"
                >
                  <RotateCcw size={18} />
                </motion.button>
              </div>
            </div>
          </div>
        </div>

        {/* error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 p-5 rounded-2xl flex items-start gap-4"
              style={{ background: "rgba(239, 68, 68, 0.1)", border: "2px solid rgba(239, 68, 68, 0.3)" }}
            >
              <AlertCircle size={24} className="text-red-500 flex-shrink-0" />
              <div className="text-sm font-medium text-red-600">{error}</div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* progress */}
        <AnimatePresence>
          {processing && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="mb-8 p-8 rounded-3xl"
              style={{ background: "var(--surface-alt)", border: "2px solid var(--border)" }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Loader className="animate-spin" size={24} style={{ color: "var(--orange)" }} />
                  <span className="text-lg font-bold" style={{ color: "var(--text)" }}>
                    {progress.stage}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-mono font-bold" style={{ color: "var(--orange)" }}>
                    {progress.percent.toFixed(0)}%
                  </div>
                  <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {formatElapsedTime(progress.elapsed)} elapsed
                  </div>
                </div>
              </div>

              <div className="relative w-full h-4 rounded-full overflow-hidden" style={{ background: "var(--surface)" }}>
                <motion.div
                  className="h-full"
                  style={{
                    background: "linear-gradient(90deg, var(--orange), #ff9357)",
                    width: `${progress.percent}%`,
                  }}
                  initial={{ width: 0 }}
                  animate={{ width: `${progress.percent}%` }}
                  transition={{ duration: 0.4 }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* button */}
        <motion.button
          onClick={fetchCaptions}
          disabled={processing}
          className="w-full py-6 rounded-3xl font-bold text-xl text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-4 mb-8"
          style={{
            background: "linear-gradient(135deg, var(--orange), #ff9357)",
            boxShadow: "0 20px 40px rgba(232,80,2,0.3)",
          }}
          whileHover={!processing ? { scale: 1.02 } : {}}
          whileTap={!processing ? { scale: 0.98 } : {}}
        >
          {processing ? (
            <>
              <Loader className="animate-spin" size={28} />
              Fetching captions…
            </>
          ) : (
            <>
              <Youtube size={28} />
              Fetch Manual + Auto Captions
            </>
          )}
        </motion.button>

        {/* results */}
        <AnimatePresence>
          {results && (
            <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="rounded-3xl p-8" style={{ background: "var(--surface-alt)", border: "2px solid var(--border)" }}>
                <div className="flex items-center gap-4 mb-6">
                  <div className="p-3 rounded-2xl" style={{ background: "rgba(232,80,2,0.1)" }}>
                    <CheckCircle size={32} style={{ color: "var(--orange)" }} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black" style={{ color: "var(--text)" }}>
                      Captions result
                    </h3>
                    <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                      videoId: <strong>{results.videoId}</strong> • requestedLang:{" "}
                      <strong>{results.requestedLang}</strong> • manual tracks:{" "}
                      <strong>{results.tracks?.manualCount ?? 0}</strong> • auto tracks:{" "}
                      <strong>{results.tracks?.autoCount ?? 0}</strong>
                    </p>
                  </div>
                </div>

                {/* Global warning if track exists but no text returned */}
                {!hasAnyText(results) && ((results?.tracks?.manualCount || 0) + (results?.tracks?.autoCount || 0) > 0) && (
                  <div
                    className="mb-6 p-5 rounded-2xl"
                    style={{
                      background: "rgba(245, 158, 11, 0.12)",
                      border: "1px solid rgba(245, 158, 11, 0.35)",
                      color: "var(--text)",
                    }}
                  >
                    <div className="font-bold mb-1">Track exists, but transcript text is empty.</div>
                    <div style={{ color: "var(--text-muted)" }}>
                      {emptyHint || "This is usually a YouTube blocking/empty-body response. Backend should handle cookies/headers/alternate clients."}
                    </div>
                  </div>
                )}

                <div className="grid lg:grid-cols-2 gap-4">
                  <ResultCard title="Manual Captions" obj={results.manual} keyName="manual" emptyHint={emptyHint} />
                  <ResultCard title="Auto Captions (ASR)" obj={results.auto} keyName="auto" emptyHint={emptyHint} />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
