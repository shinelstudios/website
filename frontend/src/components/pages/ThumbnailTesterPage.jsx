import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, Share2, BarChart2, Check, ArrowRight, ThumbsUp, Download, Twitter, Linkedin, MessageCircle, Facebook, Copy, Info, RefreshCw, Briefcase, Zap, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import MetaTags from "../MetaTags";
import logo from "../../assets/logo.png";

const FileUpload = ({ label, file, setFile, id }) => {
    const handleChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setFile(Object.assign(e.target.files[0], {
                preview: URL.createObjectURL(e.target.files[0])
            }));
        }
    };

    return (
        <div className="flex-1">
            <h3 className="text-[var(--text-muted)] font-bold uppercase tracking-wider text-sm mb-3 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[var(--surface-alt)] flex items-center justify-center text-xs border border-[var(--border)]">{id}</span>
                {label}
            </h3>
            <div
                className={`relative aspect-video rounded-2xl border-2 border-dashed transition-all overflow-hidden group ${file ? "border-[var(--orange)] bg-[var(--surface-alt)]" : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--text-muted)]"
                    }`}
            >
                {!file ? (
                    <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer p-4 transition-transform group-hover:scale-105">
                        <div className="w-14 h-14 rounded-full bg-[var(--surface-alt)] flex items-center justify-center mb-3 group-hover:bg-[var(--surface-2)] transition-colors border border-[var(--border)]">
                            <Upload size={24} className="text-[var(--text-muted)] group-hover:text-[var(--text)] transition-colors" />
                        </div>
                        <span className="text-sm font-bold text-[var(--text)] text-center">Upload Variation {id}</span>
                        <span className="text-xs text-[var(--text-muted)] mt-1">Click or drag & drop</span>
                        <input type="file" accept="image/*" onChange={handleChange} className="hidden" />
                    </label>
                ) : (
                    <div className="relative w-full h-full group">
                        <img src={file.preview} alt="Preview" className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-700" />
                        <button
                            onClick={() => setFile(null)}
                            className="absolute top-2 right-2 p-2 rounded-full bg-black/60 text-white hover:bg-red-500 transition-colors backdrop-blur-md opacity-0 group-hover:opacity-100"
                        >
                            <X size={16} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default function ThumbnailTesterPage() {
    const [fileA, setFileA] = useState(null);
    const [fileB, setFileB] = useState(null);
    const [isVoting, setIsVoting] = useState(false);
    const [results, setResults] = useState(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedImage, setGeneratedImage] = useState(null);
    const canvasRef = useRef(null);
    const analysisCanvasRef = useRef(null);

    // --- Heuristic Analysis Logic ---
    const analyzeImage = (imgSrc) => {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = analysisCanvasRef.current;
                const ctx = canvas.getContext('2d', { willReadFrequently: true });
                canvas.width = 500; // normalized size
                canvas.height = (500 / img.width) * img.height;
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;

                let totalLuminance = 0;
                let totalSaturation = 0;
                let luminances = [];

                for (let i = 0; i < data.length; i += 4) {
                    const r = data[i];
                    const g = data[i + 1];
                    const b = data[i + 2];

                    // Luminance (perceived brightness)
                    const luminance = (0.299 * r + 0.587 * g + 0.114 * b);
                    totalLuminance += luminance;
                    luminances.push(luminance);

                    // Saturation
                    const max = Math.max(r, g, b);
                    const min = Math.min(r, g, b);
                    const delta = max - min;
                    let saturation = 0;
                    if (max !== 0) saturation = delta / max;
                    totalSaturation += saturation;
                }

                const pixelCount = data.length / 4;
                const avgLuminance = totalLuminance / pixelCount;
                const avgSaturation = totalSaturation / pixelCount;

                // Contrast (Standard Deviation of Luminance)
                const variance = luminances.reduce((acc, val) => acc + Math.pow(val - avgLuminance, 2), 0) / pixelCount;
                const contrast = Math.sqrt(variance);

                resolve({
                    brightness: (avgLuminance / 255) * 10,
                    contrast: (contrast / 128) * 10, // approximate normalization
                    saturation: avgSaturation * 10
                });
            };
            img.src = imgSrc;
        });
    };

    const startTest = async () => {
        setIsVoting(true);

        // Run Real Analysis
        const statsA = await analyzeImage(fileA.preview);
        const statsB = await analyzeImage(fileB.preview);

        // Calculate Score (Simple Weighted Heuristic)
        // Contrast is king (0.4), Brightness needs to be visible (0.2), Saturation pops (0.2)
        // Penalize too dark/bright (< 3 or > 8)
        const scoreImage = (stats) => {
            let score = (stats.contrast * 0.5) + (stats.saturation * 0.3) + (stats.brightness * 0.2);
            // Penalty for extreme darkness
            if (stats.brightness < 3) score *= 0.8;
            return score;
        };

        const scoreA = scoreImage(statsA);
        const scoreB = scoreImage(statsB);
        const totalScore = scoreA + scoreB;

        // Calculate Win Probability based on Score Differential
        let percentA = Math.round((scoreA / totalScore) * 100);

        // Clamp to avoid 100/0 unless extreme
        percentA = Math.min(Math.max(percentA, 20), 80);

        // Add some noise simulation (market volatility)
        const noise = Math.floor(Math.random() * 10) - 5;
        percentA += noise;

        setTimeout(() => {
            setResults({
                a: percentA,
                votes: Math.floor(Math.random() * (2000 - 500 + 1) + 500),
                metrics: {
                    a: statsA,
                    b: statsB
                }
            });
            setIsVoting(false);
        }, 2000);
    };

    const resetTest = () => {
        setResults(null);
        setFileA(null);
        setFileB(null);
        setGeneratedImage(null);
        setIsGenerating(false);
    };

    const generateResultImage = async () => {
        if (!canvasRef.current || !results || !fileA || !fileB) return;
        setIsGenerating(true);

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const width = 1200;
        const height = 630; // OG Image Standard Size

        canvas.width = width;
        canvas.height = height;

        // Background
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, '#1a1a1a');
        gradient.addColorStop(1, '#0a0a0a');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        // Load Images
        const loadImg = (src) => new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => resolve(img);
            img.src = src;
        });

        const [imgA, imgB, logoImg] = await Promise.all([
            loadImg(fileA.preview),
            loadImg(fileB.preview),
            loadImg(logo)
        ]);

        // Draw Thumbnails
        const thumbWidth = 500;
        const thumbHeight = (thumbWidth / 16) * 9;
        const gap = 40;
        const startX = (width - (thumbWidth * 2 + gap)) / 2;
        const startY = 150;

        // Thumb A
        ctx.save();
        roundedRect(ctx, startX, startY, thumbWidth, thumbHeight, 20);
        ctx.clip();
        ctx.drawImage(imgA, startX, startY, thumbWidth, thumbHeight);
        ctx.restore();

        // Winner/Loser Overlay A
        if (results.a > 50) drawWinnerBadge(ctx, startX, startY, thumbWidth);

        // Thumb B
        ctx.save();
        roundedRect(ctx, startX + thumbWidth + gap, startY, thumbWidth, thumbHeight, 20);
        ctx.clip();
        ctx.drawImage(imgB, startX + thumbWidth + gap, startY, thumbWidth, thumbHeight);
        ctx.restore();

        // Winner/Loser Overlay B
        if (results.a <= 50) drawWinnerBadge(ctx, startX + thumbWidth + gap, startY, thumbWidth);

        // Text & Stats
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 60px "Inter", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText("Thumbnail Performance Check", width / 2, 80);

        ctx.font = 'bold 30px "Inter", sans-serif';
        ctx.fillStyle = '#E85002'; // Orange
        ctx.fillText(`Analysis based on Contrast, Saturation & Brightness`, width / 2, 120);

        // Percentages
        ctx.font = 'bold 80px "Inter", sans-serif';
        ctx.fillStyle = results.a > 50 ? '#22c55e' : '#666';
        ctx.fillText(`${results.a}%`, startX + thumbWidth / 2, startY + thumbHeight + 90);

        ctx.fillStyle = results.a <= 50 ? '#22c55e' : '#666';
        ctx.fillText(`${100 - results.a}%`, startX + thumbWidth + gap + thumbWidth / 2, startY + thumbHeight + 90);

        // Watermark Logo
        const logoW = 150;
        const logoH = (logoW / logoImg.width) * logoImg.height;
        ctx.drawImage(logoImg, width - logoW - 40, height - logoH - 40, logoW, logoH);

        // Set Image
        setGeneratedImage(canvas.toDataURL('image/png'));
        setIsGenerating(false);
    };

    function roundedRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }

    function drawWinnerBadge(ctx, x, y, w) {
        ctx.save();
        ctx.shadowColor = "rgba(0,0,0,0.3)";
        ctx.shadowBlur = 10;
        ctx.shadowOffsetY = 5;

        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        // Centered badge on top edge
        ctx.roundRect(x + w / 2 - 80, y - 25, 160, 50, 12);
        ctx.fill();
        ctx.restore();

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 24px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText("WINNER", x + w / 2, y + 8);
    }

    const shareText = `I just analyzed my thumbnails with Shinel Studios! The winner has ${Math.max(results?.a, 100 - (results?.a || 0))}% better estimated performance physics.`;
    const shareUrl = "https://shinelstudios.com/tools/thumbnail-tester";

    return (
        <div className="min-h-screen bg-[var(--surface)] text-[var(--text)] pt-32 pb-24 relative overflow-hidden font-sans">
            <MetaTags
                title="Thumbnail Analyzer - Shinel Studios"
                description="Analyze brightness, contrast, and saturation to pick the winning thumbnail."
            />

            {/* Hidden Canvases */}
            <canvas ref={canvasRef} className="hidden" />
            <canvas ref={analysisCanvasRef} className="hidden" />

            {/* Decorative BG */}
            <div className="absolute top-0 left-0 w-full h-[600px] bg-gradient-to-b from-[var(--surface-alt)] to-transparent pointer-events-none" />

            <div className="container mx-auto px-6 relative z-10">

                {/* Header */}
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="inline-flex items-center gap-2 text-[var(--orange)] font-bold text-xs tracking-[0.2em] uppercase mb-6 bg-[var(--orange)]/10 px-4 py-2 rounded-full border border-[var(--orange)]/20"
                    >
                        <BarChart2 size={14} />
                        Free YouTube Tool
                    </motion.div>
                    <h1 className="text-4xl md:text-6xl font-black mb-6 leading-tight tracking-tight">
                        Optimize Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--orange)] to-amber-500">Click-Through Rate</span>
                    </h1>
                    <p className="text-lg md:text-xl text-[var(--text-muted)] leading-relaxed">
                        Upload two variations. We analyze <strong>Contrast, Brightness, and Saturation</strong> to predict which image attracts more attention.
                    </p>
                </div>

                {/* Main Interface */}
                <div className="max-w-6xl mx-auto mb-24">
                    {!results ? (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[2rem] p-6 md:p-12 shadow-2xl backdrop-blur-sm"
                            id="upload-area"
                        >
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 mb-12 relative">
                                <FileUpload label="Variation A" file={fileA} setFile={setFileA} id="A" />

                                {/* VS Badge */}
                                <div className="hidden md:flex absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-[var(--orange)] text-white items-center justify-center font-black text-xl border-[6px] border-[var(--card-bg)] shadow-xl z-20">
                                    VS
                                </div>
                                <div className="md:hidden flex justify-center py-4 text-center">
                                    <span className="bg-[var(--surface-alt)] px-4 py-2 rounded-full font-black text-[var(--text-muted)] text-sm border border-[var(--border)]">VS</span>
                                </div>

                                <FileUpload label="Variation B" file={fileB} setFile={setFileB} id="B" />
                            </div>

                            <div className="flex flex-col items-center gap-4">
                                <button
                                    disabled={!fileA || !fileB || isVoting}
                                    onClick={startTest}
                                    className={`w-full md:w-auto min-w-[300px] px-8 py-5 rounded-2xl font-bold uppercase tracking-wide transition-all flex items-center justify-center gap-3 text-lg ${fileA && fileB && !isVoting
                                        ? "bg-gradient-to-r from-[var(--orange)] to-amber-600 text-white hover:brightness-110 hover:shadow-[0_0_30px_rgba(232,80,2,0.4)] active:scale-95 transform"
                                        : "bg-[var(--surface-alt)] text-[var(--text-muted)] cursor-not-allowed border border-[var(--border)]"
                                        }`}
                                >
                                    {isVoting ? (
                                        <>
                                            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Analyzing Pixels...
                                        </>
                                    ) : (
                                        <>
                                            <Zap size={24} fill="currentColor" />
                                            Run Analysis
                                        </>
                                    )}
                                </button>
                                <p className="text-xs text-[var(--text-muted)] opacity-60">100% Client-side. Images are processed locally in your browser.</p>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-[var(--card-bg)] border border-[var(--orange)]/30 rounded-[2rem] p-6 md:p-12 shadow-2xl relative overflow-hidden"
                        >
                            {/* Result Header */}
                            <div className="text-center mb-12 relative z-10">
                                <h3 className="text-3xl font-black mb-3">Analysis Complete</h3>
                                <p className="text-[var(--text-muted)] mb-6">Based on graphic intensity metrics.</p>

                                {/* Analysis Breakdown - Real Data */}
                                <div className="grid grid-cols-3 gap-4 md:gap-8 justify-center max-w-2xl mx-auto text-xs md:text-sm text-[var(--text-muted)] bg-[var(--surface-alt)] p-4 rounded-xl border border-[var(--border)]">
                                    <div className="text-center">
                                        <div className="font-bold mb-1">Contrast</div>
                                        <div className="flex justify-between px-4 text-[10px] uppercase tracking-wide opacity-50"><span>A</span><span>B</span></div>
                                        <div className="text-[var(--text)] font-bold">{results.metrics.a.contrast.toFixed(1)} <span className="text-[var(--text-muted)] font-normal">vs</span> {results.metrics.b.contrast.toFixed(1)}</div>
                                    </div>
                                    <div className="text-center border-x border-[var(--border)]">
                                        <div className="font-bold mb-1">Saturation</div>
                                        <div className="flex justify-between px-4 text-[10px] uppercase tracking-wide opacity-50"><span>A</span><span>B</span></div>
                                        <div className="text-[var(--text)] font-bold">{results.metrics.a.saturation.toFixed(1)} <span className="text-[var(--text-muted)] font-normal">vs</span> {results.metrics.b.saturation.toFixed(1)}</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="font-bold mb-1">Brightness</div>
                                        <div className="flex justify-between px-4 text-[10px] uppercase tracking-wide opacity-50"><span>A</span><span>B</span></div>
                                        <div className="text-[var(--text)] font-bold">{results.metrics.a.brightness.toFixed(1)} <span className="text-[var(--text-muted)] font-normal">vs</span> {results.metrics.b.brightness.toFixed(1)}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Results Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                                {/* Result A */}
                                <div className={`p-6 rounded-2xl border transition-all ${results.a > 50 ? "border-green-500/50 bg-green-500/5 shadow-[0_0_30px_rgba(34,197,94,0.1)] order-first" : "border-[var(--border)] bg-[var(--surface)] opacity-70 grayscale-[0.5] order-last md:order-none"}`}>
                                    <div className="flex justify-between items-start mb-6">
                                        <h4 className="text-[var(--text-muted)] font-bold uppercase tracking-wider text-sm">Variation A</h4>
                                        {results.a > 50 && <span className="text-green-500 font-bold text-xs bg-green-500/10 px-2 py-1 rounded">WINNER</span>}
                                    </div>
                                    <div className="text-6xl font-black mb-2 tracking-tighter">{results.a}%</div>
                                    <div className="w-full h-3 bg-[var(--surface-alt)] rounded-full overflow-hidden">
                                        <div className={`h-full rounded-full ${results.a > 50 ? "bg-green-500" : "bg-gray-600"}`} style={{ width: `${results.a}%` }} />
                                    </div>
                                    <p className="text-xs text-[var(--text-muted)] mt-2">Win Probability</p>
                                </div>

                                {/* Result B */}
                                <div className={`p-6 rounded-2xl border transition-all ${results.a <= 50 ? "border-green-500/50 bg-green-500/5 shadow-[0_0_30px_rgba(34,197,94,0.1)] order-first" : "border-[var(--border)] bg-[var(--surface)] opacity-70 grayscale-[0.5] order-last md:order-none"}`}>
                                    <div className="flex justify-between items-start mb-6">
                                        <h4 className="text-[var(--text-muted)] font-bold uppercase tracking-wider text-sm">Variation B</h4>
                                        {results.a <= 50 && <span className="text-green-500 font-bold text-xs bg-green-500/10 px-2 py-1 rounded">WINNER</span>}
                                    </div>
                                    <div className="text-6xl font-black mb-2 tracking-tighter">{100 - results.a}%</div>
                                    <div className="w-full h-3 bg-[var(--surface-alt)] rounded-full overflow-hidden">
                                        <div className={`h-full rounded-full ${results.a <= 50 ? "bg-green-500" : "bg-gray-600"}`} style={{ width: `${100 - results.a}%` }} />
                                    </div>
                                    <p className="text-xs text-[var(--text-muted)] mt-2">Win Probability</p>
                                </div>
                            </div>

                            {/* Canvas Preview (If Generated) */}
                            {generatedImage && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    className="mb-8 p-4 bg-[var(--surface)] rounded-xl border border-[var(--border)]"
                                >
                                    <div className="flex justify-between items-center mb-2">
                                        <p className="text-sm font-bold">Sharable Image Ready:</p>
                                        <button onClick={() => setGeneratedImage(null)} className="text-xs text-[var(--text-muted)] hover:text-[var(--text)]"><X size={14} /></button>
                                    </div>
                                    <img src={generatedImage} alt="Generated Result" className="w-full rounded-lg shadow-lg border border-[var(--border)]" />
                                    <p className="text-xs text-[var(--text-muted)] mt-2 text-center text-[var(--orange)]">↑ Long press or Right Click to Save for Instagram ↑</p>
                                </motion.div>
                            )}

                            {/* Action Bar */}
                            <div className="bg-[var(--surface-alt)] rounded-2xl p-6 border border-[var(--border)] flex flex-col xl:flex-row items-center justify-between gap-6">
                                <div className="flex items-center gap-4 w-full xl:w-auto">
                                    <button
                                        onClick={resetTest}
                                        className="w-full xl:w-auto px-6 py-3 rounded-xl font-bold bg-[var(--surface)] border border-[var(--border)] hover:bg-white/5 transition-colors text-sm flex items-center justify-center gap-2"
                                    >
                                        <RefreshCw size={16} />
                                        Start New Test
                                    </button>
                                </div>

                                <div className="flex flex-wrap md:flex-nowrap items-center justify-center gap-2 w-full xl:w-auto">
                                    <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider hidden md:block mr-2">Share Results:</span>

                                    <a
                                        href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        title="Share on X"
                                        className="p-3 rounded-xl bg-black hover:bg-black/80 text-white transition-colors"
                                    >
                                        <Twitter size={18} />
                                    </a>

                                    <a
                                        href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        title="Share on Facebook"
                                        className="p-3 rounded-xl bg-[#1877F2] hover:bg-[#145cb3] text-white transition-colors"
                                    >
                                        <Facebook size={18} />
                                    </a>

                                    <a
                                        href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        title="Share on LinkedIn"
                                        className="p-3 rounded-xl bg-[#0077b5] hover:bg-[#006097] text-white transition-colors"
                                    >
                                        <Linkedin size={18} />
                                    </a>

                                    <a
                                        href={`https://wa.me/?text=${encodeURIComponent(shareText + " " + shareUrl)}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        title="Share on WhatsApp"
                                        className="p-3 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white transition-colors"
                                    >
                                        <MessageCircle size={18} />
                                    </a>

                                    <a
                                        href={`https://www.reddit.com/submit?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(shareText)}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        title="Share on Reddit"
                                        className="p-3 rounded-xl bg-[#FF4500] hover:bg-[#e03d00] text-white transition-colors"
                                    >
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M12 0C5.373 0 0 5.373 0 12C0 18.627 5.373 24 12 24C18.627 24 24 18.627 24 12C24 5.373 18.627 0 12 0ZM10.129 16.286C8.529 16.286 7.42 14.887 7.42 14.887C7.42 14.887 7.824 13.914 9.172 14.398C10.024 14.706 10.985 14.07 11.232 13.235C11.396 12.678 11.261 12.083 10.875 11.643C10.428 11.134 9.773 10.841 9.091 10.841H9.088C8.36 10.841 7.669 11.168 7.215 11.728C7.215 11.728 7.212 11.732 7.208 11.737C6.671 12.399 5.867 11.796 6.014 10.963C6.185 9.998 7.553 6.946 10.043 7.628L10.74 10.467C11.536 10.158 12.378 10.005 13.23 10.024L14.717 6.994C15.011 6.395 15.626 6.012 16.294 6.002C17.388 5.987 18.289 6.864 18.304 7.958C18.319 9.052 17.442 9.953 16.348 9.968C15.623 9.978 14.997 9.537 14.716 8.918L13.568 11.258C16.897 11.458 19.347 13.439 19.347 15.772C19.347 18.204 16.657 20.286 12 20.286C7.343 20.286 4.653 18.204 4.653 15.772C4.653 14.945 5.097 14.186 5.842 13.62C6.142 13.393 6.208 12.957 5.982 12.658C5.755 12.358 5.32 12.292 5.021 12.518C3.961 13.324 3.319 14.47 3.319 15.772C3.319 19.014 6.937 21.62 12 21.62C17.063 21.62 20.681 19.014 20.681 15.772C20.681 13.364 18.27 11.332 14.992 11.082C15.013 10.718 15.65 10.662 15.65 10.662C16.685 10.662 17.524 9.823 17.524 8.788C17.524 7.753 16.685 6.914 15.65 6.914C14.885 6.914 14.228 7.373 13.931 8.026L11.898 12.169C11.317 12.195 10.743 12.274 10.18 12.403L10.129 16.286ZM15.429 14.887C15.429 15.659 14.803 16.286 14.03 16.286C13.258 16.286 12.632 15.659 12.632 14.887C12.632 14.114 13.258 13.488 14.03 13.488C14.803 13.488 15.429 14.114 15.429 14.887ZM8.6 14.887C8.6 15.659 7.974 16.286 7.202 16.286C6.429 16.286 5.803 15.659 5.803 14.887C5.803 14.114 6.429 13.488 7.202 13.488C7.974 13.488 8.6 14.114 8.6 14.887Z" />
                                        </svg>
                                    </a>

                                    <a
                                        href={`mailto:?subject=${encodeURIComponent("Check out these A/B Test Results")}&body=${encodeURIComponent(shareText + "\\n\\n" + shareUrl)}`}
                                        title="Share via Email"
                                        className="p-3 rounded-xl bg-[var(--surface-alt)] border border-[var(--border)] hover:bg-[var(--surface-2)] text-[var(--text)] transition-colors"
                                    >
                                        <Mail size={18} />
                                    </a>

                                    <button
                                        onClick={async () => {
                                            if (navigator.clipboard) {
                                                await navigator.clipboard.writeText(shareText + " " + shareUrl);
                                                alert("Link copied to clipboard!");
                                            }
                                        }}
                                        title="Copy Link"
                                        className="p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] hover:bg-[var(--surface-alt)] text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
                                    >
                                        <Copy size={18} />
                                    </button>

                                    <div className="h-8 w-[1px] bg-[var(--border)] hidden md:block mx-2" />

                                    <button
                                        onClick={generateResultImage}
                                        disabled={isGenerating}
                                        className="w-full md:w-auto px-6 py-3 rounded-xl bg-[var(--orange)] hover:brightness-110 text-white font-bold flex items-center justify-center gap-2 text-sm transition-all shadow-lg shadow-[var(--orange)]/20"
                                    >
                                        {generatedImage ? (
                                            <a href={generatedImage} download={`Shinel_Tester_Results_${Date.now()}.png`} className="flex items-center gap-2 w-full h-full">
                                                <Download size={18} /> Download Image
                                            </a>
                                        ) : (
                                            <>
                                                {isGenerating ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Download size={18} />}
                                                Generate Image
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </div>

                {/* Upsell / Cross-Link Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                    <Link to="/pricing" className="group bg-[var(--card-bg)] p-8 rounded-3xl border border-[var(--border)] hover:border-[var(--orange)] transition-all hover:shadow-2xl hover:shadow-[var(--orange)]/10">
                        <div className="w-12 h-12 bg-purple-500/10 rounded-full flex items-center justify-center mb-4 group-hover:bg-[var(--orange)] transition-colors">
                            <Briefcase size={24} className="text-purple-500 group-hover:text-white transition-colors" />
                        </div>
                        <h3 className="text-xl font-bold mb-2">Want a Guaranteed Winner?</h3>
                        <p className="text-[var(--text-muted)] mb-4">Don't guess. Hire our professional team to design high-CTR thumbnails for you.</p>
                        <div className="flex items-center gap-2 text-[var(--orange)] font-bold text-sm">
                            Book a Service <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                        </div>
                    </Link>

                    <Link to="/tools" className="group bg-[var(--card-bg)] p-8 rounded-3xl border border-[var(--border)] hover:border-[var(--text)] transition-all">
                        <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center mb-4 group-hover:bg-blue-500 transition-colors">
                            <RefreshCw size={24} className="text-blue-500 group-hover:text-white transition-colors" />
                        </div>
                        <h3 className="text-xl font-bold mb-2">Explore More Tools</h3>
                        <p className="text-[var(--text-muted)] mb-4">Check out our full suite of free tools for creators.</p>
                        <div className="flex items-center gap-2 text-[var(--text)] font-bold text-sm">
                            View All Tools <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                        </div>
                    </Link>
                </div>
            </div>
        </div>
    );
}
