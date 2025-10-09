// src/components/tools/AutoSRTTool.jsx
import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload, Download, Loader, CheckCircle, AlertCircle, FileText, 
  Globe, Shield, Zap, Youtube, HardDrive, Sparkles, Copy, Eye,
  Languages, PlayCircle, Clock, FileCheck, RotateCcw, Cpu, Settings
} from "lucide-react";

const WHISPER_API = "http://localhost:5000";

// Removed SOURCE_LANGUAGES - now always auto-detect
const TARGETS = [
  { code: 'hi',          name: 'Hindi (native script)',    flag: '🇮🇳', desc: 'Original transcript in Devanagari' },
  { code: 'en',          name: 'English (translation)',    flag: '🇬🇧', desc: 'Translated to English' },
  { code: 'hinglish',    name: 'Hinglish (Latin script)',  flag: '🔤',   desc: 'Hindi → Roman transliteration' },
  { code: 'pa',          name: 'Punjabi',                  flag: '🇮🇳', desc: 'Punjabi language support' },
  { code: 'ta',          name: 'Tamil',                    flag: '🇮🇳', desc: 'Tamil language support' },
  { code: 'te',          name: 'Telugu',                   flag: '🇮🇳', desc: 'Telugu language support' },
];

// NEW: Better SRT Format Options
const SRT_FORMATS = [
  { 
    value: 'movie', 
    name: 'YouTube Subtitles', 
    flag: '📺', 
    desc: 'Standard subtitle format (1-6s duration, 1-2 lines)',
    recommended: 'Perfect for YouTube videos and streaming platforms'
  },
  { 
    value: 'karaoke', 
    name: 'Word-by-Word', 
    flag: '🎤', 
    desc: 'Precise word timing (0.2-2s per word)',
    recommended: 'Ideal for karaoke apps and pronunciation learning'
  },
  { 
    value: 'accessibility', 
    name: 'Video Editing', 
    flag: '🎬', 
    desc: 'Longer segments for editing workflow (2-8s)',
    recommended: 'Optimized for video editors and post-production'
  }
];

export default function AutoSRTTool() {
  const [userRole, setUserRole] = useState(() => {
    const role = localStorage.getItem("userRole") || localStorage.getItem("role") || "client";
    return role.toLowerCase();
  });

  const [activeTab, setActiveTab] = useState("youtube");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [driveUrl, setDriveUrl] = useState("");
  const [file, setFile] = useState(null);

  // Removed sourceLanguage - always auto-detect
  const [targetLanguages, setTargetLanguages] = useState([]);
  const [hotwords, setHotwords] = useState("");
  const [srtFormat, setSrtFormat] = useState("movie"); // NEW: SRT format selection

  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState({ stage: '', percent: 0, elapsed: 0 });
  const [results, setResults] = useState(null);
  const [error, setError] = useState("");
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [previewText, setPreviewText] = useState(null);
  
  // Enhanced server capabilities with proper defaults
  const [serverCapabilities, setServerCapabilities] = useState({
    auto_detection: false,
    srt_formats: [],
    features: {}
  });
  const [devices, setDevices] = useState({ asr: 'loading...', nllb: 'loading...' });

  const fileInputRef = useRef(null);
  const progressIntervalRef = useRef(null);
  const startTimeRef = useRef(null);

  useEffect(() => {
    checkServerHealth();
    
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  const checkServerHealth = async () => {
    try {
      const [healthResponse, formatsResponse] = await Promise.all([
        fetch(`${WHISPER_API}/health`),
        fetch(`${WHISPER_API}/formats`)
      ]);
      
      const healthData = await healthResponse.json();
      const formatsData = await formatsResponse.json();
      
      setServerCapabilities({
        auto_detection: healthData.features?.auto_language_detection || false,
        srt_formats: formatsData.srt_formats || {},
        features: healthData.features || {}
      });
      
      if (healthData.devices) {
        setDevices({
          asr: healthData.devices.asr || 'cpu',
          nllb: healthData.devices.translation || 'cpu'  
         });
      } else {
        // Set defaults if no device info available
        setDevices({ asr: 'cpu', nllb: 'cpu' });
      }
    } catch (err) {
      console.log('Server health check failed:', err);
      // Set fallback values when server is unreachable
      setDevices({ asr: 'offline', nllb: 'offline' });
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const validTypes = ['audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/ogg', 'audio/m4a', 'audio/aac', 'audio/flac'];
      const validExtensions = /\.(wav|mp3|m4a|ogg|aac|flac)$/i;
      
      if (!validTypes.includes(selectedFile.type) && !validExtensions.test(selectedFile.name)) {
        setError("Please upload audio files only (WAV, MP3, M4A, OGG, AAC, FLAC)");
        return;
      }
      
      if (selectedFile.size > 500 * 1024 * 1024) {
        setError("File too large. Maximum 500MB");
        return;
      }
      
      setFile(selectedFile);
      setError("");
    }
  };

  const handleTargetLanguageToggle = (code) => {
    setTargetLanguages(prev => {
      if (prev.includes(code)) {
        return prev.filter(c => c !== code);
      } else {
        if (prev.length >= 3) {
          setError("You can select up to 3 target languages");
          setTimeout(() => setError(""), 3000);
          return prev;
        }
        return [...prev, code];
      }
    });
  };

  const formatElapsedTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startProgressSimulation = () => {
    let percent = 0;
    startTimeRef.current = Date.now();
    setProgress({ stage: 'Initializing production AI models...', percent: 0, elapsed: 0 });
    
    progressIntervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      percent += 0.6; // Slightly faster due to optimizations
      
      if (percent > 98) {
        setProgress({ stage: 'Finalizing professional transcripts...', percent: 98, elapsed });
        return;
      }
      
      let stage = '';
      if (percent <= 5) {
        stage = 'Downloading audio...';
      } else if (percent <= 15) {
        stage = 'Professional audio preprocessing (16kHz, mono, normalized)...';
      } else if (percent <= 25) {
        stage = 'Auto-detecting language with enhanced confidence scoring...';
      } else if (percent <= 70) {
        stage = 'Production transcription with hotwords integration...';
      } else if (percent <= 90) {
        stage = 'High-quality translation with NLLB...';
      } else {
        stage = `Creating ${SRT_FORMATS.find(f => f.value === srtFormat)?.name || 'Movie'} style SRT files...`;
      }
      
      setProgress({ stage, percent: Math.min(percent, 98), elapsed });
    }, 1200); // Slightly slower updates for better UX
  };

  const stopProgressSimulation = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  };

  const resetForm = () => {
    setYoutubeUrl("");
    setDriveUrl("");
    setFile(null);
    setTargetLanguages([]);
    setHotwords("");
    setSrtFormat("movie");
    setResults(null);
    setError("");
    setProgress({ stage: '', percent: 0, elapsed: 0 });
    setPreviewText(null);
    setCopiedIndex(null);
  };

  const processTranscription = async () => {
    let hasInput = false;
    if (activeTab === "youtube" && youtubeUrl.trim()) hasInput = true;
    if (activeTab === "drive" && driveUrl.trim()) hasInput = true;
    if (activeTab === "upload" && file) hasInput = true;

    if (!hasInput) {
      setError(`Please provide a ${activeTab === 'youtube' ? 'YouTube URL' : activeTab === 'drive' ? 'Drive link' : 'audio file'}`);
      return;
    }

    if (targetLanguages.length === 0) {
      setError("Please select at least one target language");
      return;
    }

    setProcessing(true);
    setError("");
    setResults(null);
    startProgressSimulation();

    const formData = new FormData();
    if (activeTab === "upload" && file) {
      formData.append("file", file);
    } else if (activeTab === "drive" && driveUrl.trim()) {
      formData.append("url", driveUrl.trim());
    } else if (activeTab === "youtube" && youtubeUrl.trim()) {
      formData.append("url", youtubeUrl.trim());
    }

    // No source language - always auto-detect
    
    // Convert 'hinglish' to backend format
    targetLanguages.forEach(code => {
      const backendCode = code === 'hinglish' ? 'hi_translit' : code;
      formData.append("target_languages[]", backendCode);
    });
    
    // NEW: Add SRT format and hotwords
    formData.append("srt_format", srtFormat);
    if (hotwords.trim()) formData.append("hotwords", hotwords.trim());

    try {
      const response = await fetch(`${WHISPER_API}/transcribe`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Transcription failed");
      }

      const data = await response.json();
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setProgress({ stage: 'Complete!', percent: 100, elapsed });
      
      // Update devices info if available
      if (data.devices) {
        setDevices(data.devices);
      }
      
      setTimeout(() => {
        setResults(data);
        stopProgressSimulation();
      }, 500);
    } catch (err) {
      console.error("Error:", err);
      setError(err.message || "Failed to process. Make sure enhanced Whisper server is running on port 5000.");
      stopProgressSimulation();
    } finally {
      setProcessing(false);
    }
  };

  const downloadSRT = (languageCode, content) => {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transcript_${languageCode}_${srtFormat}.srt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadAll = () => {
    Object.entries(results.transcriptions).forEach(([code, data], index) => {
      setTimeout(() => downloadSRT(code, data.srt), index * 200);
    });
  };

  const copyToClipboard = async (text, index) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const getFlagForCode = (code) => {
    const t = TARGETS.find(l => l.code === code);
    return t?.flag || '🌐';
  };

  return (
    <div className="min-h-screen py-12" style={{ background: "var(--surface)" }}>
      {/* Animated background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
        <motion.div
          className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-20 blur-3xl"
          style={{ background: "var(--orange)" }}
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.15, 0.25, 0.15]
          }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        <motion.div
          className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full opacity-20 blur-3xl"
          style={{ background: "#ff9357" }}
          animate={{ 
            scale: [1.2, 1, 1.2],
            opacity: [0.25, 0.15, 0.25]
          }}
          transition={{ duration: 10, repeat: Infinity }}
        />
      </div>

      <div className="container mx-auto px-4 max-w-6xl relative" style={{ zIndex: 1 }}>
        {/* Enhanced Header */}
        <motion.div 
          className="text-center mb-12"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-xs font-bold mb-5"
            style={{ 
              background: "linear-gradient(135deg, var(--orange), #ff9357)",
              color: "white",
              boxShadow: "0 8px 24px rgba(232,80,2,0.3)"
            }}
            whileHover={{ scale: 1.05, boxShadow: "0 12px 32px rgba(232,80,2,0.4)" }}
          >
            <Sparkles size={16} />
            Production AI • Auto-Detection • Professional SRT
          </motion.div>
          
          <h1 className="text-5xl md:text-6xl font-black mb-5 bg-gradient-to-r from-[var(--orange)] to-[#ff9357] bg-clip-text text-transparent">
            Professional SRT Generator
          </h1>
          
          <p className="text-xl max-w-3xl mx-auto leading-relaxed" style={{ color: "var(--text-muted)" }}>
            Auto-detect • Professional preprocessing • Multiple formats • Hindi • English • Punjabi • Hinglish
          </p>

          <div className="mt-6 flex items-center justify-center gap-4 flex-wrap">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full" 
                 style={{ background: "var(--surface-alt)", border: "1px solid var(--border)" }}>
              <Shield size={16} style={{ color: "var(--orange)" }} />
              <span className="text-sm" style={{ color: "var(--text)" }}>
                Role: <strong className="capitalize">{userRole}</strong>
              </span>
            </div>
            
            {serverCapabilities.auto_detection && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-full" 
                   style={{ background: "rgba(232,80,2,0.1)", border: "1px solid rgba(232,80,2,0.3)" }}>
                <Globe size={16} style={{ color: "var(--orange)" }} />
                <span className="text-sm font-semibold" style={{ color: "var(--orange)" }}>
                  Auto-Detection Enabled
                </span>
              </div>
            )}
            
            {devices.asr !== 'loading...' && devices.asr !== 'offline' && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-full" 
                   style={{ background: "var(--surface-alt)", border: "1px solid var(--border)" }}>
                <Cpu size={16} style={{ color: "var(--orange)" }} />
                <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                  {devices.asr.toUpperCase()}{devices.nllb && devices.nllb !== devices.asr && devices.nllb !== 'n/a' ? ` + ${devices.nllb.toUpperCase()}` : ''}
                </span>
              </div>
            )}
            
            {devices.asr === 'offline' && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-full" 
                   style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)" }}>
                <AlertCircle size={16} style={{ color: "#ef4444" }} />
                <span className="text-sm font-semibold" style={{ color: "#ef4444" }}>
                  Server Offline
                </span>
              </div>
            )}
          </div>
        </motion.div>

        {/* Input Method Tabs */}
        {(userRole === "admin" || userRole === "editor") && (
          <div className="flex gap-2 mb-8 p-1 rounded-2xl w-fit mx-auto" 
               style={{ background: "var(--surface-alt)", border: "1px solid var(--border)" }}>
            {[
              { id: 'youtube', label: 'YouTube', icon: Youtube },
              { id: 'drive', label: 'Drive', icon: HardDrive },
              { id: 'upload', label: 'Upload', icon: Upload }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all"
                style={{
                  background: activeTab === tab.id ? "var(--orange)" : "transparent",
                  color: activeTab === tab.id ? "white" : "var(--text)",
                }}
              >
                <tab.icon size={18} />
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Main Configuration Grid */}
        <div className="grid lg:grid-cols-2 gap-8 mb-8">
          {/* Left: Input */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-6"
          >
            {/* Input Method Cards */}
            <AnimatePresence mode="wait">
              {/* YouTube */}
              {activeTab === "youtube" && (
                <motion.div
                  key="youtube"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="rounded-3xl p-8"
                  style={{ 
                    background: "var(--surface-alt)", 
                    border: "2px solid var(--border)",
                    boxShadow: "0 20px 60px rgba(0,0,0,0.1)"
                  }}
                >
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 rounded-2xl" style={{ background: "rgba(255,0,0,0.1)" }}>
                      <Youtube size={28} style={{ color: "#FF0000" }} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold" style={{ color: "var(--text)" }}>
                        YouTube Video
                      </h3>
                      <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                        Paste any YouTube video URL
                      </p>
                    </div>
                  </div>
                  
                  <input
                    type="text"
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=... or youtu.be/..."
                    className="w-full px-5 py-4 rounded-2xl outline-none text-base"
                    style={{ 
                      background: "var(--surface)", 
                      border: "2px solid var(--border)", 
                      color: "var(--text)",
                      transition: "border-color 0.2s"
                    }}
                    onFocus={(e) => e.target.style.borderColor = "var(--orange)"}
                    onBlur={(e) => e.target.style.borderColor = "var(--border)"}
                  />
                </motion.div>
              )}

              {/* Drive */}
              {activeTab === "drive" && (userRole === "admin" || userRole === "editor") && (
                <motion.div
                  key="drive"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="rounded-3xl p-8"
                  style={{ 
                    background: "var(--surface-alt)", 
                    border: "2px solid var(--border)",
                    boxShadow: "0 20px 60px rgba(0,0,0,0.1)"
                  }}
                >
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 rounded-2xl" style={{ background: "rgba(232,80,2,0.1)" }}>
                      <HardDrive size={28} style={{ color: "var(--orange)" }} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold" style={{ color: "var(--text)" }}>
                        Google Drive
                      </h3>
                      <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                        Video link from Drive
                      </p>
                    </div>
                  </div>
                  
                  <input
                    type="text"
                    value={driveUrl}
                    onChange={(e) => setDriveUrl(e.target.value)}
                    placeholder="https://drive.google.com/file/d/..."
                    className="w-full px-5 py-4 rounded-2xl outline-none text-base"
                    style={{ 
                      background: "var(--surface)", 
                      border: "2px solid var(--border)", 
                      color: "var(--text)",
                      transition: "border-color 0.2s"
                    }}
                    onFocus={(e) => e.target.style.borderColor = "var(--orange)"}
                    onBlur={(e) => e.target.style.borderColor = "var(--border)"}
                  />
                </motion.div>
              )}

              {/* Upload */}
              {activeTab === "upload" && (userRole === "admin" || userRole === "editor") && (
                <motion.div
                  key="upload"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="rounded-3xl p-8"
                  style={{ 
                    background: "var(--surface-alt)", 
                    border: "2px solid var(--border)",
                    boxShadow: "0 20px 60px rgba(0,0,0,0.1)"
                  }}
                >
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 rounded-2xl" style={{ background: "rgba(232,80,2,0.1)" }}>
                      <Upload size={28} style={{ color: "var(--orange)" }} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold" style={{ color: "var(--text)" }}>
                        Audio Upload
                      </h3>
                      <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                        WAV, MP3, M4A, AAC, FLAC
                      </p>
                    </div>
                  </div>

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="audio/*,.mp3,.wav,.m4a,.ogg,.aac,.flac"
                    className="hidden"
                  />
                  
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-3 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all"
                    style={{ 
                      borderColor: file ? "var(--orange)" : "var(--border)",
                      background: file ? "rgba(232,80,2,0.05)" : "var(--surface)"
                    }}
                  >
                    {file ? (
                      <div className="flex items-center justify-center gap-4">
                        <CheckCircle size={40} style={{ color: "var(--orange)" }} />
                        <div className="text-left">
                          <div className="font-bold text-lg" style={{ color: "var(--text)" }}>
                            {file.name}
                          </div>
                          <div className="text-sm" style={{ color: "var(--text-muted)" }}>
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <Upload size={48} className="mx-auto mb-4" style={{ color: "var(--text-muted)" }} />
                        <div className="font-bold text-lg mb-2" style={{ color: "var(--text)" }}>
                          Click to upload audio
                        </div>
                        <div className="text-sm" style={{ color: "var(--text-muted)" }}>
                          Max 500MB • Audio only
                        </div>
                      </>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* NEW: SRT Format Selection */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="rounded-3xl p-6"
              style={{ background: "var(--surface-alt)", border: "2px solid var(--border)" }}
            >
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: "var(--text)" }}>
                <Settings size={20} />
                SRT Format Style
              </h3>
              
              <div className="space-y-3">
                {SRT_FORMATS.map(format => (
                  <motion.label
                    key={format.value}
                    className="flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all"
                    style={{
                      background: srtFormat === format.value ? "rgba(232,80,2,0.1)" : "var(--surface)",
                      border: `2px solid ${srtFormat === format.value ? "var(--orange)" : "var(--border)"}`,
                    }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <input
                      type="radio"
                      name="srtFormat"
                      checked={srtFormat === format.value}
                      onChange={() => setSrtFormat(format.value)}
                      className="sr-only"
                    />
                    <span className="text-2xl">{format.flag}</span>
                    <div className="flex-1">
                      <div className="font-bold text-sm" style={{ color: "var(--text)" }}>
                        {format.name}
                      </div>
                      <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {format.desc}
                      </div>
                      <div className="text-xs mt-1 font-medium" style={{ color: "var(--orange)" }}>
                        {format.recommended}
                      </div>
                    </div>
                    {srtFormat === format.value && (
                      <CheckCircle size={20} style={{ color: "var(--orange)" }} />
                    )}
                  </motion.label>
                ))}
              </div>
            </motion.div>

            {/* Hotwords */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.35 }}
              className="rounded-3xl p-6"
              style={{ background: "var(--surface-alt)", border: "2px solid var(--border)" }}
            >
              <h3 className="text-lg font-bold mb-2" style={{ color: "var(--text)" }}>
                Domain-Specific Terms (Hotwords)
              </h3>
              <input
                type="text"
                value={hotwords}
                onChange={(e) => setHotwords(e.target.value)}
                placeholder="e.g., Tesla, SpaceX, Neuralink, cryptocurrency, blockchain"
                className="w-full px-5 py-4 rounded-2xl outline-none text-base"
                style={{ 
                  background: "var(--surface)", 
                  border: "2px solid var(--border)", 
                  color: "var(--text)"
                }}
                onFocus={(e) => e.target.style.borderColor = "var(--orange)"}
                onBlur={(e) => e.target.style.borderColor = "var(--border)"}
              />
              <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
                Help AI recognize brand names, technical terms, and domain-specific vocabulary.
              </p>
            </motion.div>
          </motion.div>

          {/* Right: Target Languages */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="rounded-3xl p-8"
            style={{ 
              background: "var(--surface-alt)", 
              border: "2px solid var(--border)",
              boxShadow: "0 20px 60px rgba(0,0,0,0.1)"
            }}
          >
            <h3 className="text-xl font-bold mb-2 flex items-center gap-2" style={{ color: "var(--text)" }}>
              <FileText size={24} />
              Target Languages & Outputs
            </h3>
            <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
              Select up to 3 outputs (source language always auto-detected)
            </p>
            
            <div className="space-y-3">
              {TARGETS.map(lang => {
                const isSelected = targetLanguages.includes(lang.code);
                return (
                  <motion.label
                    key={lang.code}
                    className="flex items-center gap-4 p-5 rounded-2xl cursor-pointer transition-all"
                    style={{
                      background: isSelected ? "rgba(232,80,2,0.1)" : "var(--surface)",
                      border: `2px solid ${isSelected ? "var(--orange)" : "var(--border)"}`
                    }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleTargetLanguageToggle(lang.code)}
                      className="w-5 h-5 accent-[var(--orange)]"
                    />
                    <span className="text-3xl">{lang.flag}</span>
                    <div className="flex-1">
                      <div className="font-bold" style={{ color: "var(--text)" }}>
                        {lang.name}
                      </div>
                      <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {lang.desc}
                      </div>
                    </div>
                    {isSelected && (
                      <CheckCircle size={20} style={{ color: "var(--orange)" }} />
                    )}
                  </motion.label>
                );
              })}
            </div>

            <div className="mt-6 p-4 rounded-2xl flex items-start gap-3"
                 style={{ background: "rgba(232,80,2,0.1)", border: "1px solid rgba(232,80,2,0.2)" }}>
              <Globe size={18} style={{ color: "var(--orange)" }} />
              <div className="text-sm" style={{ color: "var(--text)" }}>
                <strong>Auto-Detection:</strong> {serverCapabilities.auto_detection 
                  ? 'Source language automatically detected with enhanced confidence scoring for optimal accuracy!' 
                  : 'Enhanced language detection enabled with professional preprocessing.'}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Error Display */}
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

        {/* Enhanced Progress Bar */}
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
              
              <div className="relative w-full h-4 rounded-full overflow-hidden" 
                   style={{ background: "var(--surface)" }}>
                <motion.div 
                  className="h-full"
                  style={{ 
                    background: "linear-gradient(90deg, var(--orange), #ff9357)",
                    width: `${progress.percent}%`
                  }}
                  initial={{ width: 0 }}
                  animate={{ width: `${progress.percent}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm flex items-center gap-2" style={{ color: "var(--text-muted)" }}>
                  <Clock size={16} />
                  Production mode: ~1-2x audio duration • Professional quality • Keep page open
                </p>
                <div className="flex items-center gap-2 text-xs px-3 py-1 rounded-full"
                     style={{ background: "rgba(232,80,2,0.1)", color: "var(--orange)" }}>
                  <Settings size={14} />
                  <span className="font-semibold">{SRT_FORMATS.find(f => f.value === srtFormat)?.name}</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Enhanced Process Button */}
        <motion.button
          onClick={processTranscription}
          disabled={processing}
          className="w-full py-6 rounded-3xl font-bold text-xl text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-4 mb-8"
          style={{ 
            background: "linear-gradient(135deg, var(--orange), #ff9357)",
            boxShadow: "0 20px 40px rgba(232,80,2,0.3)"
          }}
          whileHover={!processing ? { scale: 1.02, boxShadow: "0 25px 50px rgba(232,80,2,0.4)" } : {}}
          whileTap={!processing ? { scale: 0.98 } : {}}
        >
          {processing ? (
            <>
              <Loader className="animate-spin" size={28} />
              Processing with Production AI Pipeline...
            </>
          ) : (
            <>
              <Zap size={28} />
              Generate Professional Transcripts
            </>
          )}
        </motion.button>

        {/* Enhanced Results */}
        <AnimatePresence>
          {results && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="rounded-3xl p-8" 
                   style={{ background: "var(--surface-alt)", border: "2px solid var(--border)" }}>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl" style={{ background: "rgba(232,80,2,0.1)" }}>
                      <CheckCircle size={32} style={{ color: "var(--orange)" }} />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black" style={{ color: "var(--text)" }}>
                        Production Transcription Complete!
                      </h3>
                      <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
                        Auto-detected: <strong>{results.transcriptions[results.detected_language]?.language_name || 'Unknown'}</strong>
                        {results.detection_confidence && ` (${(results.detection_confidence * 100).toFixed(0)}% confidence)`}
                        {results.processing_time && ` • ${Math.round(results.processing_time)}s total`}
                        {results.srt_format && ` • ${SRT_FORMATS.find(f => f.value === results.srt_format)?.name} format`}
                        {results.hotwords_used && ' • Hotwords applied'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <motion.button
                      onClick={resetForm}
                      className="px-4 py-3 rounded-2xl font-bold flex items-center gap-2"
                      style={{ background: "var(--surface)", border: "2px solid var(--border)", color: "var(--text)" }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      title="Process another file"
                    >
                      <RotateCcw size={20} />
                      New
                    </motion.button>

                    <motion.button
                      onClick={downloadAll}
                      className="px-6 py-3 rounded-2xl font-bold flex items-center gap-3"
                      style={{ background: "var(--orange)", color: "white" }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Download size={20} />
                      Download All SRT
                    </motion.button>
                  </div>
                </div>

                <div className="space-y-4">
                  {Object.entries(results.transcriptions).map(([code, data], index) => (
                    <motion.div
                      key={code}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="p-6 rounded-2xl"
                      style={{ background: "var(--surface)", border: "2px solid var(--border)" }}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <span className="text-4xl">{getFlagForCode(code)}</span>
                          <div>
                            <div className="font-bold text-lg" style={{ color: "var(--text)" }}>
                              {data.language_name}
                              {data.format && (
                                <span className="ml-2 text-xs px-2 py-1 rounded-full"
                                      style={{ background: "rgba(232,80,2,0.1)", color: "var(--orange)" }}>
                                  {data.format}
                                </span>
                              )}
                            </div>
                            <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                              {data.text.split(/\s+/).filter(Boolean).length} words • {data.srt.split('\n').filter(l => l.includes('-->')).length} segments
                              {data.segment_count && ` • ${data.segment_count} processed`}
                              {data.translation_time && ` • ${data.translation_time.toFixed(1)}s translation`}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <motion.button
                            onClick={() => setPreviewText(previewText === code ? null : code)}
                            className="p-2 rounded-xl"
                            style={{ background: "var(--surface-alt)", color: "var(--text)" }}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            title="Preview full text"
                          >
                            <Eye size={18} />
                          </motion.button>

                          <motion.button
                            onClick={() => copyToClipboard(data.text, code)}
                            className="p-2 rounded-xl"
                            style={{ background: "var(--surface-alt)", color: "var(--text)" }}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            title="Copy text"
                          >
                            {copiedIndex === code ? (
                              <CheckCircle size={18} style={{ color: "var(--orange)" }} />
                            ) : (
                              <Copy size={18} />
                            )}
                          </motion.button>

                          <motion.button
                            onClick={() => downloadSRT(code, data.srt)}
                            className="px-4 py-2 rounded-xl font-bold flex items-center gap-2"
                            style={{ background: "var(--orange)", color: "white" }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <Download size={18} />
                            Download SRT
                          </motion.button>
                        </div>
                      </div>

                      <AnimatePresence>
                        {previewText === code && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="mt-4 p-4 rounded-xl max-h-64 overflow-y-auto"
                                 style={{ background: "var(--surface-alt)" }}>
                              <div className="text-sm font-mono leading-relaxed whitespace-pre-wrap"
                                   style={{ color: "var(--text)" }}>
                                {data.text}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Enhanced YouTube Upload Instructions */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-3xl p-8"
                style={{ 
                  background: "linear-gradient(135deg, rgba(232,80,2,0.1), rgba(255,147,87,0.1))",
                  border: "2px solid rgba(232,80,2,0.2)"
                }}
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-2xl" style={{ background: "white" }}>
                    <Youtube size={32} style={{ color: "#FF0000" }} />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-xl font-black mb-3" style={{ color: "var(--text)" }}>
                      Upload to YouTube Studio ({results.srt_format && SRT_FORMATS.find(f => f.value === results.srt_format)?.name} Format)
                    </h4>
                    <ol className="space-y-3">
                      {[
                        "Open YouTube Studio → Content → Select your video",
                        "Click 'Subtitles' from left sidebar", 
                        "Click 'Upload file' → Select 'With timing (.srt)'",
                        "Upload each language's .srt file separately",
                        "Set language and accessibility options",
                        "Click 'Publish' to make captions live"
                      ].map((step, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center font-bold text-sm"
                               style={{ background: "var(--orange)", color: "white" }}>
                            {i + 1}
                          </div>
                          <span className="text-sm leading-relaxed" style={{ color: "var(--text)" }}>
                            {step}
                          </span>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              </motion.div>

              {/* Enhanced Stats Grid */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-4 gap-4"
              >
                <div className="p-6 rounded-2xl text-center"
                     style={{ background: "var(--surface-alt)", border: "2px solid var(--border)" }}>
                  <FileCheck size={32} className="mx-auto mb-2" style={{ color: "var(--orange)" }} />
                  <div className="text-2xl font-black" style={{ color: "var(--text)" }}>
                    {Object.keys(results.transcriptions).length}
                  </div>
                  <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                    Languages
                  </div>
                </div>

                <div className="p-6 rounded-2xl text-center"
                     style={{ background: "var(--surface-alt)", border: "2px solid var(--border)" }}>
                  <PlayCircle size={32} className="mx-auto mb-2" style={{ color: "var(--orange)" }} />
                  <div className="text-2xl font-black" style={{ color: "var(--text)" }}>
                    {results.transcriptions[results.detected_language]?.srt.split('\n').filter(l => l.includes('-->')).length || 0}
                  </div>
                  <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                    Segments
                  </div>
                </div>

                <div className="p-6 rounded-2xl text-center"
                     style={{ background: "var(--surface-alt)", border: "2px solid var(--border)" }}>
                  <Globe size={32} className="mx-auto mb-2" style={{ color: "var(--orange)" }} />
                  <div className="text-2xl font-black" style={{ color: "var(--text)" }}>
                    {results.detection_confidence ? `${(results.detection_confidence * 100).toFixed(0)}%` : 'Auto'}
                  </div>
                  <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                    Detection
                  </div>
                </div>

                <div className="p-6 rounded-2xl text-center"
                     style={{ background: "var(--surface-alt)", border: "2px solid var(--border)" }}>
                  <Settings size={32} className="mx-auto mb-2" style={{ color: "var(--orange)" }} />
                  <div className="text-lg font-black" style={{ color: "var(--text)" }}>
                    {SRT_FORMATS.find(f => f.value === results.srt_format)?.flag || '🎬'}
                  </div>
                  <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {SRT_FORMATS.find(f => f.value === results.srt_format)?.name || 'Format'}
                  </div>
                </div>
              </motion.div>

              {/* Production Features Summary */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-3xl p-6"
                style={{ 
                  background: "linear-gradient(135deg, rgba(34,197,94,0.1), rgba(16,185,129,0.1))",
                  border: "2px solid rgba(34,197,94,0.2)"
                }}
              >
                <h4 className="text-lg font-black mb-4 flex items-center gap-2" style={{ color: "var(--text)" }}>
                  <Sparkles size={20} style={{ color: "#22c55e" }} />
                  Production Features Applied
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle size={16} style={{ color: "#22c55e" }} />
                    <span style={{ color: "var(--text)" }}>Auto-Detection</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle size={16} style={{ color: "#22c55e" }} />
                    <span style={{ color: "var(--text)" }}>16kHz Preprocessing</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle size={16} style={{ color: "#22c55e" }} />
                    <span style={{ color: "var(--text)" }}>≤17 CPS Reading Speed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle size={16} style={{ color: "#22c55e" }} />
                    <span style={{ color: "var(--text)" }}>Professional Format</span>
                  </div>
                  {results.hotwords_used && (
                    <div className="flex items-center gap-2">
                      <CheckCircle size={16} style={{ color: "#22c55e" }} />
                      <span style={{ color: "var(--text)" }}>Hotwords Applied</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <CheckCircle size={16} style={{ color: "#22c55e" }} />
                    <span style={{ color: "var(--text)" }}>Conservative Filtering</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle size={16} style={{ color: "#22c55e" }} />
                    <span style={{ color: "var(--text)" }}>Smart Timestamps</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle size={16} style={{ color: "#22c55e" }} />
                    <span style={{ color: "var(--text)" }}>Enhanced Hinglish</span>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}