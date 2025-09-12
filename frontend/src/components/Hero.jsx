// In Home.jsx or App.jsx (where your hero lives)
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

export default function Hero() {
  const chips = [
    "AI Thumbnails",
    "Auto Transcriptions",
    "Script Drafts",
    "Voice Generation (opt-in)",
    "Consent-First Face Swap",
    "Style-Matched Transitions"
  ];

  return (
    <section
      id="home"
      className="min-h-[90vh] md:min-h-screen flex flex-col items-center justify-center text-center bg-gradient-to-b from-black via-zinc-900 to-black text-white px-6"
      aria-label="Shinel Studios hero"
    >
      {/* Title */}
      <motion.h1
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-4xl md:text-6xl font-extrabold mb-4 leading-tight"
      >
        <span className="bg-gradient-to-r from-orange-400 to-amber-300 bg-clip-text text-transparent">
          AI-first
        </span>{" "}
        packaging that boosts CTR.{" "}
        <span className="text-orange-400">Smart edits</span> that keep people watching.
      </motion.h1>

      {/* Subhead */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35, duration: 0.6 }}
        className="text-base md:text-xl text-gray-300/90 max-w-2xl mb-6"
      >
        Thumbnails, transitions, face-safe swaps, transcripts, script writing, and voice
        pickups — all accelerated by AI and finished by editors.
      </motion.p>

      {/* AI capability chips */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0, y: 8 },
          visible: { opacity: 1, y: 0, transition: { staggerChildren: 0.06 } }
        }}
        className="mb-8 flex flex-wrap items-center justify-center gap-2"
        aria-label="AI capabilities"
      >
        {chips.map((t) => (
          <motion.span
            key={t}
            variants={{ hidden: { opacity: 0, y: 6 }, visible: { opacity: 1, y: 0 } }}
            className="text-xs md:text-sm px-3 py-1.5 rounded-full border border-white/15 bg-white/5 backdrop-blur-sm"
          >
            {t}
          </motion.span>
        ))}
      </motion.div>

      {/* CTAs */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Button
          className="relative bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-xl text-lg overflow-hidden"
          aria-label="Get a free AI content audit"
        >
          {/* subtle shimmer */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/3 translate-x-[-100%] animate-[shimmer_1.8s_linear_infinite]"
            style={{
              background:
                "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,.35) 50%, rgba(255,255,255,0) 100%)",
              filter: "blur(6px)"
            }}
          />
          Get Free AI Audit
        </Button>

        <Button
          variant="outline"
          className="border-gray-400/50 text-gray-200 px-6 py-3 rounded-xl text-lg"
          asChild
        >
          <a href="#work" aria-label="See our recent work">See Our Work</a>
        </Button>
      </div>

      {/* Small reassurance / policy note */}
      <p className="mt-4 text-xs text-gray-400/80 max-w-xl">
        Face-swap & voice generation are offered only with creator consent and platform-policy compliance.
      </p>

      {/* local shimmer keyframes */}
      <style>{`
        @keyframes shimmer { 
          0% { transform: translateX(-120%); } 
          100% { transform: translateX(220%); } 
        }
      `}</style>
    </section>
  );
}
